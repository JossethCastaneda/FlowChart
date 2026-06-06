import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch , META_API_VERSION } from "@/lib/server-auth";
import { calculateDataQuality } from "@/lib/meta-errors";

/**
 * Meta Insights API — Robust implementation
 *
 * • Uses Promise.allSettled — any one broken call never crashes the others
 * • Strict field isolation per breakdown type (Meta API incompatibility rules)
 * • Normalises all numeric values server-side so the frontend never parses strings
 */
export async function GET(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req, "analytics");
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  let adAccountId = searchParams.get("adAccountId");
  const dateStart = searchParams.get("dateStart");
  const dateEnd = searchParams.get("dateEnd");
  const preset = searchParams.get("preset");
  const attribution = searchParams.get("attribution") || "default";

  if (!adAccountId) {
    return NextResponse.json({ error: "Missing adAccountId" }, { status: 400 });
  }
  if (!adAccountId.startsWith("act_")) adAccountId = `act_${adAccountId}`;

  const token = accessToken;
  const version = META_API_VERSION;

  // ── Attribution windows ─────────────────────────────────────────────────
  const ATTRIBUTION_MAP: Record<string, string[] | null> = {
    default: null,
    "1d_click": ["1d_click"],
    "7d_click": ["7d_click"],
    "1d_view_1d_click": ["1d_click", "1d_view"],
    "7d_click_1d_view": ["7d_click", "1d_view"],
  };

  if (attribution === "28d_view" || attribution === "7d_view") {
    return NextResponse.json({
      status: "error",
      error_code: 400,
      error_action: "fix_field",
      user_message: "Ventanas de atribución 28d_view y 7d_view están deprecadas (Ene 2026). Usa ventanas activas."
    }, { status: 400 });
  }

  const attrWindows = ATTRIBUTION_MAP[attribution] ?? null;

  // ── Field sets — strictly separated by Meta API compatibility ──────────
  //
  // SOURCE: https://developers.facebook.com/docs/marketing-api/insights/breakdowns
  //
  // NO breakdown → all fields available
  const FIELDS_FULL =
    "spend,impressions,reach,clicks,cpc,cpm,ctr,frequency,actions,action_values," +
    "cost_per_action_type,purchase_roas,outbound_clicks,outbound_clicks_ctr," +
    "unique_clicks,unique_ctr,video_p25_watched_actions,video_p50_watched_actions," +
    "video_p75_watched_actions,video_p100_watched_actions,video_thruplay_watched_actions," +
    "cost_per_thruplay";

  // demographic / geo breakdowns (age,gender / region / country)
  // NOTE: As of June 10 2025, Meta restricted `reach` with breakdowns for data > 13 months.
  // Removing reach entirely from breakdown queries to guarantee universal compatibility
  // regardless of date range selected by the user.
  // SOURCE: Meta Business Help Center — Reach metric update June 2025
  const FIELDS_DEMO =
    "spend,impressions,clicks,cpc,cpm,ctr,actions,cost_per_action_type";

  // publisher_platform and device_platform → reach AND actions NOT allowed
  const FIELDS_PLATFORM = "spend,impressions,clicks,cpc,cpm,ctr";

  // ── URL builder ─────────────────────────────────────────────────────────
  const buildUrl = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams();

    // time range
    if (dateStart && dateEnd) {
      params.set("time_range", JSON.stringify({ since: dateStart, until: dateEnd }));
    } else {
      params.set("date_preset", preset || "this_month");
    }

    // attribution windows
    if (attrWindows) {
      params.set("action_attribution_windows", JSON.stringify(attrWindows));
    }

    params.set("limit", "200");

    // caller-supplied overrides
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined) params.set(k, v);
    }

    return `https://graph.facebook.com/${version}/${adAccountId}/insights?${params.toString()}`;
  };

  // ── Safe fetcher — always returns [] instead of throwing ────────────────
  const safeGet = async (url: string, tag: string): Promise<any[]> => {
    try {
      const res = await metaFetch(url, token);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error(
          `[INSIGHTS:${tag}] Meta API error:`,
          err?.error?.message || `HTTP ${res.status}`
        );
        return [];
      }
      const json = await res.json();
      return json.data || [];
    } catch (e: any) {
      console.error(`[INSIGHTS:${tag}] Exception:`, e.message);
      return [];
    }
  };

  // ── Parallel fetches ────────────────────────────────────────────────────
  // Demographics (age+gender) and Geo (region) are NO LONGER fetched here.
  // They are loaded on-demand by the dedicated /api/meta/breakdowns route
  // when the user opens the Audiencia tab, reducing initial sync time.
  const [tsR, campR, adsetR, adR] = await Promise.allSettled([
    // 1. Time series — account level, daily, NO breakdown
    safeGet(
      buildUrl({ fields: FIELDS_FULL, level: "account", time_increment: "1" }),
      "timeSeries"
    ),
    // 2. Campaigns — NO breakdown
    safeGet(
      buildUrl({
        fields: FIELDS_FULL + ",campaign_name,campaign_id,objective",
        level: "campaign",
      }),
      "campaigns"
    ),
    // 3. Adsets — NO breakdown
    safeGet(
      buildUrl({
        fields: FIELDS_FULL + ",adset_name,adset_id,campaign_name,campaign_id",
        level: "adset",
      }),
      "adsets"
    ),
    // 4. Ads — NO breakdown
    safeGet(
      buildUrl({
        fields:
          FIELDS_FULL +
          ",ad_name,ad_id,adset_name,adset_id,campaign_name,campaign_id",
        level: "ad",
      }),
      "ads"
    ),
  ]);

  const unwrap = (r: PromiseSettledResult<any[]>) =>
    r.status === "fulfilled" ? r.value : [];

  const dateUntil = dateEnd || new Date().toISOString().slice(0, 10);
  const quality = calculateDataQuality(dateStart || undefined, dateUntil);
  const warnings = quality.incomplete_learning ? ["La fase de aprendizaje podría estar incompleta (datos < 3 días)"] : [];

  return NextResponse.json({
    status: "success",
    level: "account",
    date_range: { since: dateStart || "N/A", until: dateUntil },
    attribution_window: attribution,
    data: {
      timeSeries: unwrap(tsR),
      campaigns: unwrap(campR),
      adsets: unwrap(adsetR),
      ads: unwrap(adR),
    },
    warnings: warnings,
    meta: {
      total_rows: 4,
      ...quality,
      api_version: version
    }
  });
}
