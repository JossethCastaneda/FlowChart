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

  const baseFields = "spend,impressions,reach,clicks,actions,action_values,cpc,cpm,ctr";
  
  const fetchInsights = async (level: string, params: string = "") => {
    let fields = baseFields;
    if (level === "campaign") fields += ",campaign_name,campaign_id,objective";
    if (level === "adset") fields += ",adset_name,adset_id,campaign_name,campaign_id";
    if (level === "ad") fields += ",ad_name,ad_id,adset_name,adset_id,campaign_name,campaign_id";

    const url = `${baseUrl}?${timeRange.replace(/^&/, '')}&level=${level}&fields=${fields}&${params}`;
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
