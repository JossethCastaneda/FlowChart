import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch , META_API_VERSION } from "@/lib/server-auth";
import { logger } from "@/lib/logger";

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
  // "time_of_day", // Testing if Meta allows actions now
  // "hourly_daily", // Testing if Meta allows actions now
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
  const accessToken = await getMetaAccessToken(req, "ads");
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
  const version = META_API_VERSION;

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
      logger.error(`[BREAKDOWNS:${breakdownKey}] API error`, {
        breakdownKey,
        fields,
        status: res.status,
        error: err?.error?.message || `HTTP ${res.status}`,
      });
      return NextResponse.json(
        { error: err?.error?.message || "Meta API error", data: [] },
        { status: res.status }
      );
    }

    const json = await res.json();

    // Normalise numerics server-side — frontend gets clean numbers
    const data = (json.data || []).map((d: any) => {
      // Meta returns the hour field with the breakdown name as the key.
      // Normalize to a clean integer 'hour' field regardless of which TZ field was used.
      const hourRaw =
        d.hourly_stats_aggregated_by_audience_time_zone ??
        d.hourly_stats_aggregated_by_advertiser_time_zone ??
        null;
      return {
        ...d,
        // Expose a clean 'hour' integer (null if not an hourly breakdown)
        hour: hourRaw !== null ? parseInt(String(hourRaw), 10) : null,
        spend:       parseFloat(d.spend || "0"),
        impressions: parseInt(d.impressions || "0", 10),
        reach:       parseInt(d.reach || "0", 10),
        clicks:      parseInt(d.clicks || "0", 10),
        cpc:         parseFloat(d.cpc || "0"),
        cpm:         parseFloat(d.cpm || "0"),
        ctr:         parseFloat(d.ctr || "0"),
      };
    });

    // Debug: log keys from first row so we can see what field names Meta sends
    if ((breakdownKey === "hourly_daily" || breakdownKey === "time_of_day") && data.length > 0) {
      logger.info(`[BREAKDOWNS:${breakdownKey}] First row keys: ${JSON.stringify(Object.keys(data[0]))}`);
      logger.info(`[BREAKDOWNS:${breakdownKey}] First row sample: date=${data[0].date_start}, hour=${data[0].hour}, spend=${data[0].spend}`);
      logger.info(`[BREAKDOWNS:${breakdownKey}] Total rows returned: ${data.length}`);
      // Show unique dates and their hour ranges
      const dateHourMap: Record<string, number[]> = {};
      data.forEach((r: any) => {
        if (!dateHourMap[r.date_start]) dateHourMap[r.date_start] = [];
        if (r.hour !== null) dateHourMap[r.date_start].push(r.hour);
      });
      Object.entries(dateHourMap).forEach(([date, hours]) => {
        logger.info(`[BREAKDOWNS:hourly_daily] ${date}: hours ${Math.min(...hours)}-${Math.max(...hours)} (${hours.length} rows)`);
      });
    }

    return NextResponse.json({
      data,
      breakdownKey,
      breakdownType: mapping.time_increment ? "time" : "dimension",
    });
  } catch (error: any) {
    logger.error(`[BREAKDOWNS:${breakdownKey}] Exception`, { error });
    return NextResponse.json(
      { error: error.message, data: [] },
      { status: 500 }
    );
  }
}
