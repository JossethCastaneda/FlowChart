import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch, META_API_VERSION } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";
import { validateBody } from "@/lib/validate";
import { CampaignCreateSchema } from "@/lib/ads-schemas";
import { logger } from "@/lib/logger";

/**
 * POST /api/meta/campaigns/create — create a NEW campaign.
 *
 * SAFETY: the campaign is always created in PAUSED state. A campaign with no
 * ad sets/ads spends $0, and we never auto-activate, so this write cannot move
 * money on its own. Still gated behind `confirmed_by_user`.
 *
 * Body: { adAccountId, name, objective, special_ad_categories?, buying_type?,
 *         daily_budget?, lifetime_budget?, bid_strategy?, confirmed_by_user }
 */

// Objetivos/categorías/bids válidos viven en CampaignCreateSchema (lib/ads-schemas).

export async function POST(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req, "ads");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const _validate = await validateBody(req, CampaignCreateSchema);
    if (!_validate.ok) return _validate.response;
    let { adAccountId } = _validate.data;
    const { name, objective, special_ad_categories, buying_type, daily_budget, lifetime_budget, bid_strategy, smart_promotion_type } = _validate.data;

    if (!String(adAccountId).startsWith("act_")) adAccountId = `act_${adAccountId}`;

    const payload: Record<string, any> = {
      name: String(name).trim(),
      objective,
      status: "PAUSED", // SAFETY — always paused on creation
      buying_type: buying_type === "RESERVED" ? "RESERVED" : "AUCTION",
      special_ad_categories: special_ad_categories ?? [],
    };
    
    // C. Advantage+ Shopping (ASC)
    if (smart_promotion_type) {
      payload.smart_promotion_type = smart_promotion_type;
    }

    // Optional Campaign Budget Optimization (CBO). Requires a bid strategy.
    const bid = bid_strategy ?? "LOWEST_COST_WITHOUT_CAP";
    if (daily_budget && Number(daily_budget) > 0) {
      payload.daily_budget = Math.round(Number(daily_budget) * 100);
      payload.bid_strategy = bid;
    } else if (lifetime_budget && Number(lifetime_budget) > 0) {
      payload.lifetime_budget = Math.round(Number(lifetime_budget) * 100);
      payload.bid_strategy = bid;
    }

    const url = `https://graph.facebook.com/${META_API_VERSION}/${adAccountId}/campaigns`;
    logger.info("[ADS] Campaign create payload", { adAccountId, objective, payload });

    const res = await metaFetch(url, accessToken, { method: "POST", body: JSON.stringify(payload) });
    const json = await res.json();

    if (!res.ok) {
      // Log the full Meta error for diagnosis
      logger.error("[ADS] Campaign create failed", {
        adAccountId,
        objective,
        status: res.status,
        error: json?.error,
        blame_fields: json?.error?.error_data?.blame_field_specs,
      });

      const parsed = mapMetaError(json);

      // Surface blame field if available for better UX
      const blameFields = json?.error?.error_data?.blame_field_specs;
      const blameDetail = Array.isArray(blameFields) && blameFields.length > 0
        ? ` Campo: ${blameFields.map((b: any) => b?.field || b).join(", ")}.`
        : "";

      return NextResponse.json({
        status: "error",
        error_code: parsed.original_code,
        error_action: parsed.action,
        user_message: parsed.user_message + blameDetail,
        error_details: parsed,
        blame_fields: blameFields || null,
      }, { status: res.status });
    }

    logger.info("[ADS] Campaign created", { adAccountId, objective, id: json.id });
    return NextResponse.json({ status: "success", object_id: json.id, created_paused: true, data: json });
  } catch (error: any) {
    logger.error("[ADS] Campaign create unhandled", { error: error.message });
    return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
  }
}

export const maxDuration = 30;
