import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch , META_API_VERSION } from "@/lib/server-auth";
import { calculateDataQuality, mapMetaError } from "@/lib/meta-errors";
import { validateBody } from "@/lib/validate";
import { AdUpdateSchema } from "@/lib/ads-schemas";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req, "ads");
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
  const version = META_API_VERSION;

  let timeRange = "&date_preset=maximum";
  let cacheKey = "maximum";
  if (dateStart && dateEnd) {
    timeRange = `&time_range=${encodeURIComponent(JSON.stringify({ since: dateStart, until: dateEnd }))}`;
    cacheKey = `${dateStart}_${dateEnd}`;
  } else if (preset) {
    timeRange = `&date_preset=${preset}`;
    cacheKey = preset;
  }

  try {
    // 0. Check fast DB Cache first
    const cache = await prisma.metaAdsCache.findUnique({
      where: {
        adAccountId_level_dateRange: {
          adAccountId,
          level: "ads",
          dateRange: cacheKey,
        }
      }
    });

    if (cache && (Date.now() - new Date(cache.updatedAt).getTime() < 60 * 60 * 1000)) {
      return NextResponse.json(cache.data);
    }

    // 1. Fetch ads with full creative details
    const creativeFields = "id,name,thumbnail_url,image_url,title,body,object_story_spec,call_to_action_type,effective_object_story_id,image_hash";
    const fields = `id,name,status,effective_status,adset_id,campaign_id,creative{${creativeFields}}`;
    const adsUrl = `https://graph.facebook.com/${version}/${adAccountId}/ads?filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]&fields=${fields}&limit=100`;
    
    const adsRes = await metaFetch(adsUrl, token);
    if (!adsRes.ok) {
      const err = await adsRes.json().catch(() => ({}));
      return NextResponse.json({ error: err?.error?.message || "Failed to fetch ads" }, { status: adsRes.status });
    }
    const adsJson = await adsRes.json();
    const ads = adsJson.data || [];

    // 2. Fetch insights
    const insightsFields = "ad_id,spend,impressions,reach,clicks,cpc,cpm,ctr,frequency,actions,cost_per_action_type,quality_ranking,engagement_rate_ranking,conversion_rate_ranking,action_values,purchase_roas,video_p25_watched_actions,video_p100_watched_actions,video_3_sec_watched_actions,video_thruplay_watched_actions,outbound_clicks";
    const insightsUrl = `https://graph.facebook.com/${version}/${adAccountId}/insights?${timeRange.replace(/^&/, '')}&level=ad&fields=${insightsFields}&limit=100`;
    
    const insightsRes = await metaFetch(insightsUrl, token);
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
          video_3_sec_watched_actions: insight.video_3_sec_watched_actions || [],
          video_thruplay_watched_actions: insight.video_thruplay_watched_actions || [],
          outbound_clicks: insight.outbound_clicks || [],
          quality_ranking: insight.quality_ranking || "",
          engagement_rate_ranking: insight.engagement_rate_ranking || "",
          conversion_rate_ranking: insight.conversion_rate_ranking || "",
        }
      };
    });

    const dateUntil = dateEnd || new Date().toISOString().slice(0,10);
    const quality = calculateDataQuality(dateStart || undefined, dateUntil);
    const warnings = quality.incomplete_learning ? ["La fase de aprendizaje podría estar incompleta (datos < 3 días)"] : [];

    const responsePayload = {
      status: "success",
      level: "ad",
      date_range: { since: dateStart || "N/A", until: dateUntil },
      attribution_window: "default",
      data: mergedAds,
      warnings: warnings,
      meta: {
        total_rows: mergedAds.length,
        ...quality,
        api_version: version,
        cached_at: new Date().toISOString()
      }
    };

    await prisma.metaAdsCache.upsert({
      where: {
        adAccountId_level_dateRange: {
          adAccountId,
          level: "ads",
          dateRange: cacheKey,
        }
      },
      update: { data: responsePayload as any },
      create: {
        adAccountId,
        level: "ads",
        dateRange: cacheKey,
        data: responsePayload as any
      }
    }).catch((e: any) => console.error("Cache save error:", e));

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req, "ads");
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const _validate = await validateBody(req, AdUpdateSchema);
    if (!_validate.ok) return _validate.response;
    const { adId, adAccountId, status, name, creative } = _validate.data;

    const token = accessToken;
    const version = META_API_VERSION;

    // If creative update needed: create new creative first, then assign
    let creativeId: string | undefined;
    if (creative && adAccountId) {
      const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
      const creativeUrl = `https://graph.facebook.com/${version}/${actId}/adcreatives`;
      const creativeRes = await metaFetch(creativeUrl, token, {
        method: "POST",
        body: JSON.stringify(creative),
      });
      const creativeJson = await creativeRes.json();
      if (!creativeRes.ok) {
        const parsedError = mapMetaError(creativeJson);
        return NextResponse.json({
          status: "error",
          error_code: parsedError.original_code,
          error_action: parsedError.action,
          user_message: parsedError.user_message,
          error_details: parsedError
        }, { status: creativeRes.status });
      }
      creativeId = creativeJson.id;
    }

    // Update the ad
    const updateUrl = `https://graph.facebook.com/${version}/${adId}`;
    const updateFields: any = {};
    if (status !== undefined) updateFields.status = status;
    if (name !== undefined) updateFields.name = name;
    if (creativeId) updateFields.creative = { creative_id: creativeId };

    const res = await metaFetch(updateUrl, token, {
      method: "POST",
      body: JSON.stringify(updateFields),
    });

    const json = await res.json();
    if (!res.ok) {
      const parsedError = mapMetaError(json);
      return NextResponse.json({
        status: "error",
        error_code: parsedError.original_code,
        error_action: parsedError.action,
        user_message: parsedError.user_message,
        error_details: parsedError
      }, { status: res.status });
    }

    return NextResponse.json({
      status: "success",
      success: true,
      object_id: adId,
      operation: status !== undefined ? (status === "PAUSED" ? "pause" : "activate") : "update",
      preflight_checks: { token_scopes_ok: true },
      data: json
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
  }
}
