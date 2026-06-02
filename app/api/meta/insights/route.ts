import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req);
  
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  let adAccountId = searchParams.get("adAccountId");
  const dateStart = searchParams.get("dateStart");
  const dateEnd = searchParams.get("dateEnd");
  const preset = searchParams.get("preset");
  const attribution = searchParams.get("attribution") || "default";

  // Map attribution param to Meta action_attribution_windows
  const ATTRIBUTION_MAP: Record<string, string[] | null> = {
    default: null,
    "1d_click": ["1d_click"],
    "7d_click": ["7d_click"],
    "1d_view_1d_click": ["1d_click", "1d_view"],
    "7d_click_1d_view": ["7d_click", "1d_view"],
    "28d_click_1d_view": ["28d_click", "1d_view"],
  };
  const attributionWindows = ATTRIBUTION_MAP[attribution] ?? null;

  if (!adAccountId) {
    return NextResponse.json({ error: "Missing adAccountId" }, { status: 400 });
  }

  if (!adAccountId.startsWith('act_')) {
    adAccountId = `act_${adAccountId}`;
  }

  const token = accessToken;
  const version = process.env.META_API_VERSION || "v22.0";
  const baseUrl = `https://graph.facebook.com/${version}/${adAccountId}/insights`;

  let timeRange = "&date_preset=this_month";
  if (dateStart && dateEnd) {
    try {
      const tr = JSON.stringify({ since: dateStart, until: dateEnd });
      timeRange = `&time_range=${encodeURIComponent(tr)}`;
    } catch(e) {}
  } else if (preset) {
    timeRange = `&date_preset=${preset}`;
  }

  // Core fields — safe with ALL breakdown combinations
  const coreFields = "spend,impressions,reach,clicks,actions,action_values,cpc,cpm,ctr,frequency,cost_per_action_type,purchase_roas";
  // Extended fields — only safe WITHOUT demographic/geo breakdowns
  const extendedFields = ",outbound_clicks,outbound_clicks_ctr,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_thruplay_watched_actions,cost_per_thruplay,unique_clicks,unique_ctr";
  
  const fetchInsights = async (level: string, params: string = "") => {
    // Only include extended fields when there are NO breakdowns (breakdowns cause Meta API errors with these fields)
    const hasBreakdowns = params.includes("breakdowns=");
    let fields = coreFields + (hasBreakdowns ? "" : extendedFields);
    if (level === "campaign") fields += ",campaign_name,campaign_id,objective";
    if (level === "adset") fields += ",adset_name,adset_id,campaign_name,campaign_id";
    if (level === "ad") fields += ",ad_name,ad_id,adset_name,adset_id,campaign_name,campaign_id";

    let url = `${baseUrl}?${timeRange.replace(/^&/, '')}&level=${level}&fields=${fields}&${params}`;
    if (attributionWindows) {
      url += `&action_attribution_windows=${encodeURIComponent(JSON.stringify(attributionWindows))}`;
    }
    const res = await metaFetch(url, token);

    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      console.error(`Meta API Error for level=${level} params=${params}:`, err);
      throw new Error(err?.error?.message || `Error ${res.status} from Meta API`);
    }
    const json = await res.json();
    return json.data || [];
  };

  try {
    const [
      timeSeries,
      demographics,
      geo,
      campaigns,
      adsets,
      ads
    ] = await Promise.all([
      fetchInsights("account", "time_increment=1"),
      fetchInsights("account", "breakdowns=age,gender"),
      fetchInsights("account", "breakdowns=region"),
      fetchInsights("campaign"),
      fetchInsights("adset"),
      fetchInsights("ad"),
    ]);

    return NextResponse.json({
      timeSeries,
      demographics,
      geo,
      campaigns,
      adsets,
      ads
    });
  } catch (error: any) {
    console.error("Error fetching insights:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
