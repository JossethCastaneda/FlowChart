import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";

// Maps BreakdownSelector keys → Meta API parameters
const BREAKDOWN_MAP: Record<string, { breakdowns?: string; time_increment?: string }> = {
  none: {},
  day: { time_increment: "1" },
  week: { time_increment: "7" },
  month: { time_increment: "monthly" },
  age: { breakdowns: "age" },
  gender: { breakdowns: "gender" },
  age_gender: { breakdowns: "age,gender" },
  country: { breakdowns: "country" },
  region: { breakdowns: "region" },
  dma: { breakdowns: "dma" },
  platform: { breakdowns: "publisher_platform" },
  placement: { breakdowns: "publisher_platform,platform_position" },
  device: { breakdowns: "device_platform" },
  time_of_day: { breakdowns: "hourly_stats_aggregated_by_audience_time_zone" },
  conversion_device: { breakdowns: "impression_device" },
  destination: { breakdowns: "place_page_id" },
  // Dynamic creative breakdowns (ad-level only)
  dynamic_image: { breakdowns: "image_asset" },
  dynamic_text: { breakdowns: "body_asset" },
  dynamic_headline: { breakdowns: "title_asset" },
  dynamic_description: { breakdowns: "description_asset" },
  dynamic_cta: { breakdowns: "call_to_action_asset" },
};

export async function GET(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const breakdownKey = searchParams.get("breakdown") || "age_gender";
  const preset = searchParams.get("preset") || "this_month";
  const dateStart = searchParams.get("dateStart");
  const dateEnd = searchParams.get("dateEnd");
  const level = searchParams.get("level");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // Validate dynamic creative breakdowns (only for ad-level)
  if (breakdownKey.startsWith("dynamic_") && level && level !== "ad") {
    return NextResponse.json({
      error: "Los desgloses de Contenido Dinámico solo están disponibles a nivel de Anuncio",
      data: [],
    });
  }

  const token = accessToken;
  const version = process.env.META_API_VERSION || "v22.0";

  // Fields compatible with ALL breakdown types (safe minimum)
  const baseFields = "spend,impressions,clicks,cpc,cpm,ctr";
  const actionFields = ",actions,cost_per_action_type";
  const extraDemoFields = ",reach";

  // publisher_platform and device_platform breakdowns are incompatible with reach, actions, cost_per_action_type
  const platformBreakdowns = ["platform", "placement", "device", "conversion_device"];
  const useSafeOnly = platformBreakdowns.includes(breakdownKey);
  const insightsFields = useSafeOnly ? baseFields : baseFields + actionFields + extraDemoFields;

  const mapping = BREAKDOWN_MAP[breakdownKey];
  if (!mapping) {
    return NextResponse.json({ error: `Breakdown key '${breakdownKey}' not supported` }, { status: 400 });
  }

  // Build time range
  let timeParam: string;
  if (dateStart && dateEnd) {
    const tr = JSON.stringify({ since: dateStart, until: dateEnd });
    timeParam = `time_range=${encodeURIComponent(tr)}`;
  } else {
    timeParam = `date_preset=${preset}`;
  }

  try {
    let url = `https://graph.facebook.com/${version}/${id}/insights?fields=${insightsFields}&${timeParam}&limit=200`;

    if (mapping.breakdowns) {
      url += `&breakdowns=${mapping.breakdowns}`;
    }
    if (mapping.time_increment) {
      url += `&time_increment=${mapping.time_increment}`;
    }

    console.log(`[BREAKDOWNS] Fetching ${breakdownKey} with fields: ${insightsFields}`);
    const res = await metaFetch(url, token);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`[BREAKDOWNS] Meta API error for ${breakdownKey}:`, JSON.stringify(err?.error || err), `URL: ${url.replace(token, 'TOKEN')}`);
      return NextResponse.json(
        { error: err?.error?.message || "Failed to fetch breakdowns" },
        { status: res.status }
      );
    }

    const json = await res.json();
    const data = (json.data || []).map((d: any) => ({
      ...d,
      spend: parseFloat(d.spend || "0"),
      impressions: parseInt(d.impressions || "0", 10),
      reach: parseInt(d.reach || "0", 10),
      clicks: parseInt(d.clicks || "0", 10),
      cpc: parseFloat(d.cpc || "0"),
      cpm: parseFloat(d.cpm || "0"),
      ctr: parseFloat(d.ctr || "0"),
    }));

    return NextResponse.json({
      data,
      breakdownKey,
      breakdownType: mapping.time_increment ? "time" : "dimension",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
