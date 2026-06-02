import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";

/**
 * Meta Breakdowns API — Robust implementation
 *
 * Handles demographic, geo, platform and dynamic-creative breakdowns.
 * Each breakdown type uses ONLY the fields Meta allows for it — no 400 errors.
 * Returns { data: [], breakdownKey, breakdownType } always (never crashes).
 */

// ── Field compatibility matrix ───────────────────────────────────
// SOURCE: https://developers.facebook.com/docs/marketing-api/insights/breakdowns
//
// Meta API enforces strict rules on which (field, breakdown) pairs are valid.
// Violations return: "(#100) Current combination of data breakdown columns is invalid"
//
// June 2025 update: `reach` cannot be used with any breakdown for data > 13 months.
// To guarantee compatibility regardless of user date selection, reach is excluded
// from ALL breakdown queries. Reach is still available on the no-breakdown (full) endpoint.

/** Safe for ALL breakdown types */
const BASE_FIELDS = "spend,impressions,clicks,cpc,cpm,ctr";

/** Also safe for demographic/geo breakdowns (age,gender / region / country)
 *  NOTE: reach intentionally excluded per June 2025 Meta API restrictions
 */
const DEMO_EXTRA = ",actions,cost_per_action_type";

/** Breakdowns that ONLY support BASE_FIELDS (no actions, no reach) */
const PLATFORM_ONLY_BREAKDOWNS = new Set([
  "platform",    // publisher_platform
  "placement",   // publisher_platform + platform_position
  "device",      // device_platform
  "conversion_device", // impression_device
  "time_of_day", // hourly_stats — incompatible with actions/reach
  "hourly_daily", // hourly_stats + daily — same restrictions
]);

// ── Breakdown → Meta API parameter mapping ───────────────────────────────
const BREAKDOWN_MAP: Record<string, { breakdowns?: string; time_increment?: string }> = {
  none:               {},
  day:                { time_increment: "1" },
  week:               { time_increment: "7" },
  month:              { time_increment: "monthly" },
  age:                { breakdowns: "age" },
  gender:             { breakdowns: "gender" },
  age_gender:         { breakdowns: "age,gender" },
  country:            { breakdowns: "country" },
  region:             { breakdowns: "region" },
  dma:                { breakdowns: "dma" },
  platform:           { breakdowns: "publisher_platform" },
  placement:          { breakdowns: "publisher_platform,platform_position" },
  device:             { breakdowns: "device_platform" },
  time_of_day:        { breakdowns: "hourly_stats_aggregated_by_audience_time_zone" },
  hourly_daily:       { breakdowns: "hourly_stats_aggregated_by_audience_time_zone", time_increment: "1" },
  conversion_device:  { breakdowns: "impression_device" },
  destination:        { breakdowns: "place_page_id" },
  // Dynamic creative (ad-level only)
  dynamic_image:       { breakdowns: "image_asset" },
  dynamic_text:        { breakdowns: "body_asset" },
  dynamic_headline:    { breakdowns: "title_asset" },
  dynamic_description: { breakdowns: "description_asset" },
  dynamic_cta:         { breakdowns: "call_to_action_asset" },
};

export async function GET(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id            = searchParams.get("id");
  const breakdownKey  = searchParams.get("breakdown") || "age_gender";
  const preset        = searchParams.get("preset") || "this_month";
  const dateStart     = searchParams.get("dateStart");
  const dateEnd       = searchParams.get("dateEnd");
  const level         = searchParams.get("level"); // "ad" required for dynamic_*

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const mapping = BREAKDOWN_MAP[breakdownKey];
  if (!mapping) {
    return NextResponse.json(
      { error: `Breakdown '${breakdownKey}' not supported`, data: [] },
      { status: 400 }
    );
  }

  // Dynamic creative breakdowns are only valid at ad level
  if (breakdownKey.startsWith("dynamic_") && level && level !== "ad") {
    return NextResponse.json({
      error: "Dynamic breakdowns require level=ad",
      data: [],
    });
  }

  const token   = accessToken;
  const version = process.env.META_API_VERSION || "v22.0";

  // Select field set
  const fields = PLATFORM_ONLY_BREAKDOWNS.has(breakdownKey)
    ? BASE_FIELDS
    : BASE_FIELDS + DEMO_EXTRA;

  // Build query params
  const params = new URLSearchParams({ fields, limit: "500" });

  if (dateStart && dateEnd) {
    params.set("time_range", JSON.stringify({ since: dateStart, until: dateEnd }));
  } else {
    params.set("date_preset", preset);
  }
  if (mapping.breakdowns)    params.set("breakdowns", mapping.breakdowns);
  if (mapping.time_increment) params.set("time_increment", mapping.time_increment);

  const url = `https://graph.facebook.com/${version}/${id}/insights?${params.toString()}`;

  try {
    const res = await metaFetch(url, token);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(
        `[BREAKDOWNS:${breakdownKey}] Error:`,
        err?.error?.message || `HTTP ${res.status}`,
        `| fields: ${fields}`
      );
      return NextResponse.json(
        { error: err?.error?.message || "Meta API error", data: [] },
        { status: res.status }
      );
    }

    const json = await res.json();

    // Normalise numerics server-side — frontend gets clean numbers
    const data = (json.data || []).map((d: any) => ({
      ...d,
      spend:       parseFloat(d.spend || "0"),
      impressions: parseInt(d.impressions || "0", 10),
      reach:       parseInt(d.reach || "0", 10),
      clicks:      parseInt(d.clicks || "0", 10),
      cpc:         parseFloat(d.cpc || "0"),
      cpm:         parseFloat(d.cpm || "0"),
      ctr:         parseFloat(d.ctr || "0"),
    }));

    return NextResponse.json({
      data,
      breakdownKey,
      breakdownType: mapping.time_increment ? "time" : "dimension",
    });
  } catch (error: any) {
    console.error(`[BREAKDOWNS:${breakdownKey}] Exception:`, error.message);
    return NextResponse.json(
      { error: error.message, data: [] },
      { status: 500 }
    );
  }
}
