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
  const version = process.env.NEXT_PUBLIC_FB_API_VERSION || "v21.0";

  let timeRange = "&date_preset=maximum";
  if (dateStart && dateEnd) {
    timeRange = `&time_range=${encodeURIComponent(JSON.stringify({ since: dateStart, until: dateEnd }))}`;
  } else if (preset) {
    timeRange = `&date_preset=${preset}`;
  }

  try {
    // 1. Fetch campaigns details
    const fields = "id,name,status,effective_status,objective,daily_budget,lifetime_budget,budget_remaining,bid_strategy,special_ad_categories,buying_type,smart_promotion_type,start_time,stop_time,created_time,updated_time";
    const campaignsUrl = `https://graph.facebook.com/${version}/${adAccountId}/campaigns?access_token=${token}&fields=${fields}&limit=150`;
    
    const campaignsRes = await fetch(campaignsUrl);
    if (!campaignsRes.ok) {
      const err = await campaignsRes.json().catch(() => ({}));
      return NextResponse.json({ error: err?.error?.message || "Failed to fetch campaigns" }, { status: campaignsRes.status });
    }
    const campaignsJson = await campaignsRes.json();
    const campaigns = campaignsJson.data || [];

    // 2. Fetch insights
    const insightsFields = "campaign_id,spend,impressions,reach,clicks,cpc,cpm,ctr,frequency,actions,cost_per_action_type,action_values,purchase_roas,website_purchase_roas,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions";
    const insightsUrl = `https://graph.facebook.com/${version}/${adAccountId}/insights?access_token=${token}${timeRange}&level=campaign&fields=${insightsFields}&limit=150`;
    
    const insightsRes = await fetch(insightsUrl);
    let insights: any[] = [];
    if (insightsRes.ok) {
      const insightsJson = await insightsRes.json();
      insights = insightsJson.data || [];
    }

    // Merge insights into campaigns
    const insightsMap = new Map(insights.map((item: any) => [item.campaign_id, item]));
    const mergedCampaigns = campaigns.map((campaign: any) => {
      const insight = insightsMap.get(campaign.id) || {};
      return {
        ...campaign,
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
          website_purchase_roas: insight.website_purchase_roas || [],
          video_p25_watched_actions: insight.video_p25_watched_actions || [],
          video_p50_watched_actions: insight.video_p50_watched_actions || [],
          video_p75_watched_actions: insight.video_p75_watched_actions || [],
          video_p100_watched_actions: insight.video_p100_watched_actions || [],
        }
      };
    });

    return NextResponse.json({ data: mergedCampaigns });
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
    const { campaignId, status, name, daily_budget, lifetime_budget, bid_strategy, special_ad_categories } = body;
    if (!campaignId) {
      return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
    }

    const token = accessToken;
    const version = process.env.NEXT_PUBLIC_FB_API_VERSION || "v21.0";
    const updateUrl = `https://graph.facebook.com/${version}/${campaignId}?access_token=${token}`;

    const updateFields: any = {};
    if (status !== undefined) updateFields.status = status;
    if (name !== undefined) updateFields.name = name;
    if (daily_budget !== undefined) updateFields.daily_budget = Math.round(daily_budget * 100);
    if (lifetime_budget !== undefined) updateFields.lifetime_budget = Math.round(lifetime_budget * 100);
    if (bid_strategy !== undefined) updateFields.bid_strategy = bid_strategy;
    if (special_ad_categories !== undefined) updateFields.special_ad_categories = special_ad_categories;

    const res = await fetch(updateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateFields),
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: json?.error?.message || "Failed to update campaign" }, { status: res.status });
    }

    return NextResponse.json({ success: true, data: json });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
