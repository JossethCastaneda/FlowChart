import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken } from "@/lib/server-auth";

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
  if (!adAccountId.startsWith("act_")) {
    adAccountId = `act_${adAccountId}`;
  }

  const token = accessToken;
  const version = process.env.META_API_VERSION || "v22.0";

  let timeRange = "&date_preset=maximum";
  if (dateStart && dateEnd) {
    timeRange = `&time_range=${encodeURIComponent(JSON.stringify({ since: dateStart, until: dateEnd }))}`;
  } else if (preset) {
    timeRange = `&date_preset=${preset}`;
  }

  try {
    // 1. Fetch ads with full creative details
    const creativeFields = "id,name,thumbnail_url,image_url,title,body,object_story_spec,call_to_action_type,effective_object_story_id,image_hash";
    const fields = `id,name,status,effective_status,adset_id,campaign_id,creative{${creativeFields}}`;
    const adsUrl = `https://graph.facebook.com/${version}/${adAccountId}/ads?access_token=${token}&fields=${fields}&limit=150`;
    
    const adsRes = await fetch(adsUrl);
    if (!adsRes.ok) {
      const err = await adsRes.json().catch(() => ({}));
      return NextResponse.json({ error: err?.error?.message || "Failed to fetch ads" }, { status: adsRes.status });
    }
    const adsJson = await adsRes.json();
    const ads = adsJson.data || [];

    // 2. Fetch insights
    const insightsFields = "ad_id,spend,impressions,reach,clicks,cpc,cpm,ctr,frequency,actions,cost_per_action_type,quality_ranking,engagement_rate_ranking,conversion_rate_ranking,action_values,purchase_roas,video_p25_watched_actions,video_p100_watched_actions";
    const insightsUrl = `https://graph.facebook.com/${version}/${adAccountId}/insights?access_token=${token}${timeRange}&level=ad&fields=${insightsFields}&limit=150`;
    
    const insightsRes = await fetch(insightsUrl);
    let insights: any[] = [];
    if (insightsRes.ok) {
      const insightsJson = await insightsRes.json();
      insights = insightsJson.data || [];
    }

    // Merge insights
    const insightsMap = new Map(insights.map((item: any) => [item.ad_id, item]));
    const mergedAds = ads.map((ad: any) => {
      const insight = insightsMap.get(ad.id) || {};
      return {
        ...ad,
        insights: {
          spend: parseFloat(insight.spend || "0"),
          impressions: parseInt(insight.impressions || "0", 10),
          reach: parseInt(insight.reach || "0", 10),
          clicks: parseInt(insight.clicks || "0", 10),
          cpc: parseFloat(insight.cpc || "0"),
          cpm: parseFloat(insight.cpm || "0"),
          ctr: parseFloat(insight.ctr || "0"),
          frequency: parseFloat(insight.frequency || "0"),
          actions: insight.actions || [],
          cost_per_action_type: insight.cost_per_action_type || [],
          action_values: insight.action_values || [],
          purchase_roas: insight.purchase_roas || [],
          video_p25_watched_actions: insight.video_p25_watched_actions || [],
          video_p100_watched_actions: insight.video_p100_watched_actions || [],
          quality_ranking: insight.quality_ranking || "",
          engagement_rate_ranking: insight.engagement_rate_ranking || "",
          conversion_rate_ranking: insight.conversion_rate_ranking || "",
        }
      };
    });

    return NextResponse.json({ data: mergedAds });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { adId, adAccountId, status, name, creative } = body;
    if (!adId) {
      return NextResponse.json({ error: "Missing adId" }, { status: 400 });
    }

    const token = accessToken;
    const version = process.env.META_API_VERSION || "v22.0";

    // If creative update needed: create new creative first, then assign
    let creativeId: string | undefined;
    if (creative && adAccountId) {
      const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
      const creativeUrl = `https://graph.facebook.com/${version}/${actId}/adcreatives?access_token=${token}`;
      const creativeRes = await fetch(creativeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creative),
      });
      const creativeJson = await creativeRes.json();
      if (!creativeRes.ok) {
        return NextResponse.json({ error: creativeJson?.error?.message || "Failed to create creative" }, { status: creativeRes.status });
      }
      creativeId = creativeJson.id;
    }

    // Update the ad
    const updateUrl = `https://graph.facebook.com/${version}/${adId}?access_token=${token}`;
    const updateFields: any = {};
    if (status !== undefined) updateFields.status = status;
    if (name !== undefined) updateFields.name = name;
    if (creativeId) updateFields.creative = { creative_id: creativeId };

    const res = await fetch(updateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateFields),
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: json?.error?.message || "Failed to update ad" }, { status: res.status });
    }

    return NextResponse.json({ success: true, data: json });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
