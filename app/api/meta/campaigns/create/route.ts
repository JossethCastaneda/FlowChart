import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch, META_API_VERSION } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";

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

// Outcome-driven objectives (ODAX) — the only valid set in current API versions.
const VALID_OBJECTIVES = [
  "OUTCOME_AWARENESS", "OUTCOME_TRAFFIC", "OUTCOME_ENGAGEMENT",
  "OUTCOME_LEADS", "OUTCOME_SALES", "OUTCOME_APP_PROMOTION",
];
const VALID_SPECIAL = [
  "HOUSING", "EMPLOYMENT", "CREDIT", "ISSUES_ELECTIONS_POLITICS",
  "FINANCIAL_PRODUCTS_SERVICES", "ONLINE_GAMBLING_AND_GAMING",
];
const VALID_BID = [
  "LOWEST_COST_WITHOUT_CAP", "LOWEST_COST_WITH_BID_CAP", "COST_CAP",
];

export async function POST(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req, "ads");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    let { adAccountId } = body;
    const { name, objective, special_ad_categories, buying_type, daily_budget, lifetime_budget, bid_strategy, confirmed_by_user } = body;

    if (confirmed_by_user !== true) {
      return NextResponse.json({ status: "blocked", blocked_reason: "Requiere confirmación explícita del usuario." }, { status: 400 });
    }
    if (!adAccountId) return NextResponse.json({ status: "error", error: "Falta la cuenta publicitaria." }, { status: 400 });
    if (!name || !String(name).trim()) return NextResponse.json({ status: "error", error: "Falta el nombre de la campaña." }, { status: 400 });
    if (!VALID_OBJECTIVES.includes(objective)) return NextResponse.json({ status: "error", error: "Objetivo inválido." }, { status: 400 });

    if (!String(adAccountId).startsWith("act_")) adAccountId = `act_${adAccountId}`;
    const cats = Array.isArray(special_ad_categories) ? special_ad_categories.filter((c: string) => VALID_SPECIAL.includes(c)) : [];

    const payload: Record<string, any> = {
      name: String(name).trim(),
      objective,
      status: "PAUSED", // SAFETY — always paused on creation
      buying_type: buying_type === "RESERVED" ? "RESERVED" : "AUCTION",
      special_ad_categories: cats,
    };

    // Optional Campaign Budget Optimization (CBO). Requires a bid strategy.
    const bid = VALID_BID.includes(bid_strategy) ? bid_strategy : "LOWEST_COST_WITHOUT_CAP";
    if (daily_budget && Number(daily_budget) > 0) {
      payload.daily_budget = Math.round(Number(daily_budget) * 100);
      payload.bid_strategy = bid;
    } else if (lifetime_budget && Number(lifetime_budget) > 0) {
      payload.lifetime_budget = Math.round(Number(lifetime_budget) * 100);
      payload.bid_strategy = bid;
    }

    const url = `https://graph.facebook.com/${META_API_VERSION}/${adAccountId}/campaigns`;
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
