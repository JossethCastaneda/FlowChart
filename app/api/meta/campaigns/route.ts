import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch, META_API_VERSION } from "@/lib/server-auth";
import { calculateDataQuality, mapMetaError } from "@/lib/meta-errors";

export async function GET(req: NextRequest) {
  // Token with multi-module fallback
  let accessToken = await getMetaAccessToken(req, "ads");
  if (!accessToken) accessToken = await getMetaAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: "No hay token Meta. Conecta tu cuenta en Integraciones." }, { status: 401 });
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
  // MP-0 FIX: Use centralized version (v23.0+), NOT the expired v21.0
  const version = META_API_VERSION;

  let timeRange = "&date_preset=maximum";
  if (dateStart && dateEnd) {
    timeRange = `&time_range=${encodeURIComponent(JSON.stringify({ since: dateStart, until: dateEnd }))}`;
  } else if (preset) {
    timeRange = `&date_preset=${preset}`;
  }

  try {
    // 1. Fetch campaigns details
    const fields = "id,name,status,effective_status,objective,daily_budget,lifetime_budget,budget_remaining,bid_strategy,special_ad_categories,buying_type,start_time,stop_time,created_time,updated_time";
    const campaignsUrl = `https://graph.facebook.com/${version}/${adAccountId}/campaigns?fields=${fields}&limit=150`;
    
    const campaignsRes = await metaFetch(campaignsUrl, token);
    if (!campaignsRes.ok) {
      const err = await campaignsRes.json().catch(() => ({}));
      return NextResponse.json({ error: err?.error?.message || "Failed to fetch campaigns" }, { status: campaignsRes.status });
    }
    const campaignsJson = await campaignsRes.json();
    const campaigns = campaignsJson.data || [];

    // 2. Fetch insights — MP-0 FIX: surface errors instead of silent zeros
    const insightsFields = "campaign_id,spend,impressions,reach,clicks,cpc,cpm,ctr,frequency,actions,cost_per_action_type,action_values,purchase_roas,website_purchase_roas,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions";
    const insightsUrl = `https://graph.facebook.com/${version}/${adAccountId}/insights?${timeRange.replace(/^&/, '')}&level=campaign&fields=${insightsFields}&limit=150`;
    
    const insightsRes = await metaFetch(insightsUrl, token);
    let insights: any[] = [];
    let insightsError: string | null = null;

    if (insightsRes.ok) {
      const insightsJson = await insightsRes.json();
      insights = insightsJson.data || [];
    } else {
      // MP-0 FIX: Don't swallow the error — surface it
      const errJson = await insightsRes.json().catch(() => ({}));
      const mapped = mapMetaError(errJson);
      insightsError = mapped.user_message || errJson?.error?.message || "Error al obtener métricas";
      console.error("[ADS] insights error:", insightsError, "status:", insightsRes.status, "api_version:", version);

      // Fallback: try with explicit time_range if preset failed
      if (!dateStart && !dateEnd) {
        const fallbackSince = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const fallbackUntil = new Date().toISOString().slice(0, 10);
        const fallbackUrl = `https://graph.facebook.com/${version}/${adAccountId}/insights?time_range=${encodeURIComponent(JSON.stringify({ since: fallbackSince, until: fallbackUntil }))}&level=campaign&fields=${insightsFields}&limit=150`;
        const fallbackRes = await metaFetch(fallbackUrl, token);
        if (fallbackRes.ok) {
          const fallbackJson = await fallbackRes.json();
          insights = fallbackJson.data || [];
          if (insights.length > 0) insightsError = null; // cleared — fallback worked
        }
      }
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

    const dateUntil = dateEnd || new Date().toISOString().slice(0,10);
    const quality = calculateDataQuality(dateStart || undefined, dateUntil);
    const warnings = [
      ...(quality.incomplete_learning ? ["La fase de aprendizaje podría estar incompleta (datos < 3 días)"] : []),
      ...(insightsError ? [`Métricas limitadas: ${insightsError}`] : []),
    ];

    return NextResponse.json({
      status: "success",
      level: "campaign",
      date_range: { since: dateStart || "N/A", until: dateUntil },
      attribution_window: "default",
      data: mergedCampaigns,
      warnings,
      insights_error: insightsError,
      meta: {
        total_rows: mergedCampaigns.length,
        ...quality,
        api_version: version
      }
    });
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
    const body = await req.json();
    const { campaignId, status, name, daily_budget, lifetime_budget, bid_strategy, special_ad_categories, confirmed_by_user } = body;
    
    if (confirmed_by_user !== true) {
      return NextResponse.json({
        status: "blocked",
        blocked_reason: "Requiere confirmación explícita del usuario para ejecutar esta acción de escritura."
      }, { status: 400 });
    }

    if (!campaignId) {
      return NextResponse.json({ status: "error", error: "Missing campaignId" }, { status: 400 });
    }

    const token = accessToken;
    const version = META_API_VERSION;
    const updateUrl = `https://graph.facebook.com/${version}/${campaignId}`;

    const updateFields: any = {};
    if (status !== undefined) updateFields.status = status;
    if (name !== undefined) updateFields.name = name;
    if (daily_budget !== undefined) updateFields.daily_budget = Math.round(daily_budget * 100);
    if (lifetime_budget !== undefined) updateFields.lifetime_budget = Math.round(lifetime_budget * 100);
    if (bid_strategy !== undefined) updateFields.bid_strategy = bid_strategy;
    if (special_ad_categories !== undefined) updateFields.special_ad_categories = special_ad_categories;

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
      object_id: campaignId,
      operation: status !== undefined ? (status === "PAUSED" ? "pause" : "activate") : "update",
      preflight_checks: { token_scopes_ok: true },
      data: json
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
  }
}

export const maxDuration = 30;
