import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch, META_API_VERSION } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";
import { z } from "zod";
import { validateBody } from "@/lib/validate";

/**
 * POST /api/meta/adsets/create — create a NEW ad set under a campaign.
 *
 * SAFETY: created PAUSED. An ad set with no ads cannot deliver, so it spends $0
 * even with a budget. Gated behind confirmed_by_user.
 *
 * Scope: only objectives that need NO promoted_object (pixel/form/app), so the
 * payload is always valid. Leads/Sales/App require extra setup → create those
 * in Meta for now.
 */
const OBJ_MAP: Record<string, { optimization_goal: string; billing_event: string }> = {
  OUTCOME_TRAFFIC: { optimization_goal: "LINK_CLICKS", billing_event: "IMPRESSIONS" },
  OUTCOME_AWARENESS: { optimization_goal: "REACH", billing_event: "IMPRESSIONS" },
  OUTCOME_ENGAGEMENT: { optimization_goal: "POST_ENGAGEMENT", billing_event: "IMPRESSIONS" },
};

export async function POST(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req, "ads");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const _validate = await validateBody(req, z.object({ adAccountId: z.any().optional(), campaignId: z.any().optional(), objective: z.any().optional(), name: z.any().optional(), dailyBudget: z.any().optional(), countries: z.any().optional(), ageMin: z.any().optional(), ageMax: z.any().optional(), genders: z.any().optional(), advantageAudience: z.any().optional(), advantagePlacements: z.any().optional(), confirmed_by_user: z.any().optional() }));
          if (!_validate.ok) return _validate.response;
          const body = _validate.data;
    let { adAccountId } = body;
    const { campaignId, objective, name, dailyBudget, countries, ageMin, ageMax, genders, advantageAudience, advantagePlacements, confirmed_by_user } = body;

    if (confirmed_by_user !== true) return NextResponse.json({ status: "blocked", blocked_reason: "Requiere confirmación explícita del usuario." }, { status: 400 });
    if (!adAccountId) return NextResponse.json({ status: "error", error: "Falta la cuenta publicitaria." }, { status: 400 });
    if (!campaignId) return NextResponse.json({ status: "error", error: "Falta la campaña." }, { status: 400 });
    if (!name || !String(name).trim()) return NextResponse.json({ status: "error", error: "Falta el nombre del conjunto." }, { status: 400 });
    const map = OBJ_MAP[objective];
    if (!map) {
      return NextResponse.json({ status: "error", error: "Este objetivo requiere configurar píxel, formulario o app. Créalo en Meta, o usa Tráfico, Reconocimiento o Interacción." }, { status: 400 });
    }
    // dailyBudget might be omitted if campaign uses CBO.
    // If provided, we set it, if not we ignore it and rely on campaign CBO.

    if (!String(adAccountId).startsWith("act_")) adAccountId = `act_${adAccountId}`;

    const ctry = Array.isArray(countries) && countries.length
      ? countries.map((c: string) => String(c).toUpperCase().trim()).filter(Boolean)
      : ["MX"];
    const targeting: any = {
      geo_locations: { countries: ctry },
      age_min: Math.max(13, Math.min(65, Number(ageMin) || 18)),
      age_max: Math.max(13, Math.min(65, Number(ageMax) || 65)),
    };
    // genders: [1]=male, [2]=female. Omit for "all".
    if (Array.isArray(genders) && genders.length === 1) targeting.genders = genders;

    if (advantageAudience) {
      targeting.advantage_audience = { audience_type: "FLEXIBLE" };
    }

    const payload: Record<string, any> = {
      campaign_id: campaignId,
      name: String(name).trim(),
      optimization_goal: map.optimization_goal,
      billing_event: map.billing_event,
      targeting,
      status: "PAUSED", // SAFETY — always paused
    };

    if (dailyBudget && Number(dailyBudget) > 0) {
      payload.daily_budget = Math.round(Number(dailyBudget) * 100);
    }

    if (!advantagePlacements) {
      // Manual placements fallback
      targeting.publisher_platforms = ["facebook", "instagram"];
    }

    const url = `https://graph.facebook.com/${META_API_VERSION}/${adAccountId}/adsets`;
    const res = await metaFetch(url, accessToken, { method: "POST", body: JSON.stringify(payload) });
    const json = await res.json();

    if (!res.ok) {
      const parsed = mapMetaError(json);
      return NextResponse.json({
        status: "error",
        error_code: parsed.original_code,
        error_action: parsed.action,
        user_message: parsed.user_message,
        error_details: parsed,
      }, { status: res.status });
    }

    return NextResponse.json({ status: "success", object_id: json.id, created_paused: true, data: json });
  } catch (error: any) {
    return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
  }
}

export const maxDuration = 30;
