import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch, META_API_VERSION, getRequestWorkspaceId } from "@/lib/server-auth";
import { calculateDataQuality, mapMetaError } from "@/lib/meta-errors";
import { validateBody } from "@/lib/validate";
import { CampaignUpdateSchema } from "@/lib/ads-schemas";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // Estricto: solo la cuenta vinculada en el botón de Meta Ads.
  const accessToken = await getMetaAccessToken(req, "ads");
  if (!accessToken) {
    return NextResponse.json({ error: "No hay token Meta. Conecta tu cuenta en Integraciones." }, { status: 401 });
  }

  // Aislamiento multi-tenant de la caché de anuncios (evita servir datos de gasto
  // de una cuenta cacheada por otro workspace).
  const workspaceId = await getRequestWorkspaceId(req);
  if (!workspaceId) {
    return NextResponse.json({ error: "No hay workspace activo." }, { status: 401 });
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
    // 0. Check DB cache — return immediately if fresh (< 60 min)
    const cache = await prisma.metaAdsCache.findUnique({
      where: {
        workspaceId_adAccountId_level_dateRange: {
          workspaceId,
          adAccountId,
          level: "campaigns",
          dateRange: cacheKey,
        },
      },
    });
    if (cache && Date.now() - new Date(cache.updatedAt).getTime() < 60 * 60 * 1000) {
      return NextResponse.json(cache.data);
    }

    // 1. Fetch campaigns details
    const fields = "id,name,status,effective_status,objective,daily_budget,lifetime_budget,budget_remaining,bid_strategy,special_ad_categories,buying_type,smart_promotion_type,start_time,stop_time,created_time,updated_time";
    const campaignsUrl = `https://graph.facebook.com/${version}/${adAccountId}/campaigns?filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]&fields=${fields}&limit=100`;

    const campaignsRes = await metaFetch(campaignsUrl, token);
    if (!campaignsRes.ok) {
      const err = await campaignsRes.json().catch(() => ({}));
      return NextResponse.json({ error: err?.error?.message || "Failed to fetch campaigns" }, { status: campaignsRes.status });
    }
    const campaignsJson = await campaignsRes.json();
    const campaigns = campaignsJson.data || [];

    // 2. Fetch insights — surface errors instead of silent zeros
    const insightsFields = "campaign_id,spend,impressions,reach,clicks,cpc,cpm,ctr,frequency,actions,cost_per_action_type,action_values,purchase_roas,website_purchase_roas,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_thruplay_watched_actions,outbound_clicks";
    const insightsUrl = `https://graph.facebook.com/${version}/${adAccountId}/insights?${timeRange.replace(/^&/, "")}&level=campaign&fields=${insightsFields}&limit=100`;

    const insightsRes = await metaFetch(insightsUrl, token);
    let insights: any[] = [];
    let insightsError: string | null = null;

    if (insightsRes.ok) {
      const insightsJson = await insightsRes.json();
      insights = insightsJson.data || [];
    } else {
      const errJson = await insightsRes.json().catch(() => ({}));
      const mapped = mapMetaError(errJson);
      insightsError = mapped.user_message || errJson?.error?.message || "Error al obtener métricas";
      logger.error("[ADS] Campaigns insights error", { insightsError, status: insightsRes.status, api_version: version });

      // Fallback: try with explicit 90-day time_range if preset failed
      if (!dateStart && !dateEnd) {
        const fallbackSince = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const fallbackUntil = new Date().toISOString().slice(0, 10);
        const fallbackUrl = `https://graph.facebook.com/${version}/${adAccountId}/insights?time_range=${encodeURIComponent(JSON.stringify({ since: fallbackSince, until: fallbackUntil }))}&level=campaign&fields=${insightsFields}&limit=100`;
        const fallbackRes = await metaFetch(fallbackUrl, token);
        if (fallbackRes.ok) {
          const fallbackJson = await fallbackRes.json();
          insights = fallbackJson.data || [];
          if (insights.length > 0) insightsError = null; // cleared — fallback worked
        }
      }
    }

    // 3. Merge insights into campaigns
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
          video_3_sec_watched_actions: (insight.actions || []).filter((a: any) => a.action_type === "video_view"),
          video_thruplay_watched_actions: insight.video_thruplay_watched_actions || [],
          outbound_clicks: insight.outbound_clicks || [],
        },
      };
    });

    const dateUntil = dateEnd || new Date().toISOString().slice(0, 10);
    const quality = calculateDataQuality(dateStart || undefined, dateUntil);
    const warnings = [
      ...(quality.incomplete_learning ? ["La fase de aprendizaje podría estar incompleta (datos < 3 días)"] : []),
      ...(insightsError ? [`Métricas limitadas: ${insightsError}`] : []),
    ];
    const responsePayload = {
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
        api_version: version,
        cached_at: new Date().toISOString(),
      },
    };

    // Save to cache (fire-and-forget — don't block response)
    prisma.metaAdsCache.upsert({
      where: {
        workspaceId_adAccountId_level_dateRange: { workspaceId, adAccountId, level: "campaigns", dateRange: cacheKey },
      },
      update: { data: responsePayload as any },
      create: { workspaceId, adAccountId, level: "campaigns", dateRange: cacheKey, data: responsePayload as any },
    }).catch((e: unknown) => logger.warn("Campaigns cache save failed", { error: e }));

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    logger.error("[ADS] Campaigns GET unhandled error", { error });
    return NextResponse.json({ status: "error", error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req, "ads");
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const _validate = await validateBody(req, CampaignUpdateSchema);
    if (!_validate.ok) return _validate.response;
    const { campaignId, status, name, daily_budget, lifetime_budget, bid_strategy, special_ad_categories } = _validate.data;

    const token = accessToken;
    const version = META_API_VERSION;
    const updateUrl = `https://graph.facebook.com/${version}/${campaignId}`;

    const updateFields: Record<string, unknown> = {};
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
      return NextResponse.json(
        {
          status: "error",
          error_code: parsedError.original_code,
          error_action: parsedError.action,
          user_message: parsedError.user_message,
          error_details: parsedError,
        },
        { status: res.status }
      );
    }

    return NextResponse.json({
      status: "success",
      success: true,
      object_id: campaignId,
      operation: status !== undefined ? (status === "PAUSED" ? "pause" : "activate") : "update",
      preflight_checks: { token_scopes_ok: true },
      data: json,
    });
  } catch (error: unknown) {
    logger.error("[ADS] Campaign POST unhandled error", { error });
    return NextResponse.json({ status: "error", error: "Error interno" }, { status: 500 });
  }
}

export const maxDuration = 30;
