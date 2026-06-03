import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";
import { calculateDataQuality, mapMetaError } from "@/lib/meta-errors";

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
  const version = process.env.NEXT_PUBLIC_FB_API_VERSION || "v22.0";

  let timeRange = "&date_preset=maximum";
  if (dateStart && dateEnd) {
    timeRange = `&time_range=${encodeURIComponent(JSON.stringify({ since: dateStart, until: dateEnd }))}`;
  } else if (preset) {
    timeRange = `&date_preset=${preset}`;
  }

  try {
    // 1. Fetch adsets details (full targeting included)
    const fields = "id,name,status,effective_status,daily_budget,lifetime_budget,bid_amount,bid_strategy,targeting,start_time,end_time,optimization_goal,billing_event,campaign_id,promoted_object,learning_phase_info,attribution_spec";
    const adsetsUrl = `https://graph.facebook.com/${version}/${adAccountId}/adsets?fields=${fields}&limit=150`;
    
    const adsetsRes = await metaFetch(adsetsUrl, token);
    if (!adsetsRes.ok) {
      const err = await adsetsRes.json().catch(() => ({}));
      return NextResponse.json({ error: err?.error?.message || "Failed to fetch adsets" }, { status: adsetsRes.status });
    }
    const adsetsJson = await adsetsRes.json();
    const adsets = adsetsJson.data || [];

    // 2. Fetch insights
    const insightsFields = "adset_id,spend,impressions,reach,clicks,cpc,cpm,ctr,frequency,actions,cost_per_action_type,action_values,purchase_roas";
    const insightsUrl = `https://graph.facebook.com/${version}/${adAccountId}/insights?${timeRange.replace(/^&/, '')}&level=adset&fields=${insightsFields}&limit=150`;
    
    const insightsRes = await metaFetch(insightsUrl, token);
    let insights: any[] = [];
    if (insightsRes.ok) {
      const insightsJson = await insightsRes.json();
      insights = insightsJson.data || [];
    }

    // Merge insights
    const insightsMap = new Map(insights.map((item: any) => [item.adset_id, item]));
    const mergedAdsets = adsets.map((adset: any) => {
      const insight = insightsMap.get(adset.id) || {};
      return {
        ...adset,
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
        }
      };
    });

    const dateUntil = dateEnd || new Date().toISOString().slice(0,10);
    const quality = calculateDataQuality(dateStart || undefined, dateUntil);
    const warnings = quality.incomplete_learning ? ["La fase de aprendizaje podría estar incompleta (datos < 3 días)"] : [];

    return NextResponse.json({
      status: "success",
      level: "adset",
      date_range: { since: dateStart || "N/A", until: dateUntil },
      attribution_window: "default",
      data: mergedAdsets,
      warnings: warnings,
      meta: {
        total_rows: mergedAdsets.length,
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
    const {
      adsetId, status, name,
      daily_budget, lifetime_budget, bid_amount, bid_strategy,
      optimization_goal, start_time, end_time, targeting, confirmed_by_user
    } = body;

    if (confirmed_by_user !== true) {
      return NextResponse.json({
        status: "blocked",
        blocked_reason: "Requiere confirmación explícita del usuario para ejecutar esta acción de escritura."
      }, { status: 400 });
    }

    if (!adsetId) {
      return NextResponse.json({ status: "error", error: "Missing adsetId" }, { status: 400 });
    }

    const token = accessToken;
    const version = process.env.NEXT_PUBLIC_FB_API_VERSION || "v22.0";
    const updateUrl = `https://graph.facebook.com/${version}/${adsetId}`;

    const updateFields: any = {};
    if (status !== undefined) updateFields.status = status;
    if (name !== undefined) updateFields.name = name;
    if (daily_budget !== undefined) updateFields.daily_budget = Math.round(daily_budget * 100);
    if (lifetime_budget !== undefined) updateFields.lifetime_budget = Math.round(lifetime_budget * 100);
    if (bid_amount !== undefined) updateFields.bid_amount = Math.round(bid_amount * 100);
    if (bid_strategy !== undefined) updateFields.bid_strategy = bid_strategy;
    if (optimization_goal !== undefined) updateFields.optimization_goal = optimization_goal;
    if (start_time !== undefined) updateFields.start_time = start_time;
    if (end_time !== undefined) updateFields.end_time = end_time;
    if (targeting !== undefined) updateFields.targeting = targeting; // Must be full object

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
      object_id: adsetId,
      operation: status !== undefined ? (status === "PAUSED" ? "pause" : "activate") : "update",
      preflight_checks: { token_scopes_ok: true },
      data: json
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
  }
}
