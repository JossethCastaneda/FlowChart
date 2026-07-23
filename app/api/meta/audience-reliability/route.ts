import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch, META_API_VERSION, getRequestWorkspaceId } from "@/lib/server-auth";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

/* ═══════════════════════════════════════════════════════════════════════════
   CONFIABILIDAD DEL USUARIO — API de Análisis de Embudo Adaptativo
   
   Mide la "confianza" del usuario desde que hace clic en el anuncio hasta
   que completa la acción deseada (conversación, lead, compra, registro, etc.)
   
   El algoritmo se adapta dinámicamente al objetivo configurado en el proyecto.
   ═══════════════════════════════════════════════════════════════════════════ */

// ── GOAL → Meta action_type mapping (idéntico al del proyecto) ──────────
const GOAL_ACTION_MAP: Record<string, string[]> = {
  // Explícitas
  "Conversaciones (WhatsApp / Messenger)": ["onsite_conversion.messaging_conversation_started_7d"],
  "Leads (Formulario Meta)": ["lead", "leadgen_grouped"],
  "Leads (Sitio Web / Pixel)": ["offsite_conversion.fb_pixel_lead"],
  "Leads (Todas las fuentes)": ["lead", "leadgen_grouped", "omni_lead", "offsite_conversion.fb_pixel_lead"],
  "Ventas (Sitio Web)": ["offsite_conversion.fb_pixel_purchase"],
  "Ventas (Todas las fuentes)": ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"],

  // Legacy
  "Conversaciones": [
    "onsite_conversion.messaging_conversation_started_7d",
    "messaging_conversation_started_7d",
    "onsite_conversion.messaging_first_reply",
  ],
  "Leads": ["lead", "leadgen_grouped", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead", "omni_lead"],
  "Ventas (Purchase)": [
    "purchase",
    "omni_purchase",
    "offsite_conversion.fb_pixel_purchase",
  ],
  "Registros": [
    "complete_registration",
    "omni_complete_registration",
    "offsite_conversion.fb_pixel_complete_registration",
  ],
  "Clics al sitio": ["link_click", "landing_page_view"],
  "Descargas app": ["app_install", "omni_app_install"],
  "Video views": ["video_view"],
  "Alcance (Reach)": ["reach"],
  "Seguidores": ["page_engagement", "like"],
  "Tráfico a tienda": ["store_visit"],
};

// Fallback ordered list for auto-detection when no goal is specified
const RESULT_TYPES_FALLBACK = [
  "onsite_conversion.messaging_conversation_started_7d",
  "messaging_conversation_started_7d",
  "lead",
  "purchase",
  "complete_registration",
  "omni_purchase",
  "app_install",
  "landing_page_view",
  "link_click",
];

// Human-readable labels for each goal
const GOAL_LABELS: Record<string, string> = {
  // Explícitas
  "Conversaciones (WhatsApp / Messenger)": "Conversación Iniciada",
  "Leads (Formulario Meta)": "Lead (Formulario)",
  "Leads (Sitio Web / Pixel)": "Lead (Sitio Web)",
  "Leads (Todas las fuentes)": "Lead Generado",
  "Ventas (Sitio Web)": "Compra en Sitio Web",
  "Ventas (Todas las fuentes)": "Compra Realizada",

  // Legacy
  "Conversaciones": "Conversación Iniciada",
  "Leads": "Lead Generado",
  "Ventas (Purchase)": "Compra Realizada",
  "Registros": "Registro Completado",
  "Clics al sitio": "Visita al Sitio",
  "Descargas app": "App Instalada",
  "Video views": "Video Reproducido",
  "Alcance (Reach)": "Persona Alcanzada",
  "Seguidores": "Nuevo Seguidor",
  "Tráfico a tienda": "Visita a Tienda",
};

const INSIGHTS_FIELDS = "spend,impressions,reach,clicks,cpm,ctr,actions";

// ── Reliability Label based on score ─────────────────────────────────────
function getReliabilityLabel(score: number): { label: string; color: string } {
  if (score >= 75) return { label: "Alta Confianza", color: "emerald" };
  if (score >= 50) return { label: "Confianza Media", color: "amber" };
  if (score >= 25) return { label: "Baja Confianza", color: "orange" };
  return { label: "Tráfico No Confiable", color: "red" };
}

// ── ICU: Índice de Confiabilidad del Usuario (4-Factor Adaptive Score) ───
function calculateICU(
  spend: number,
  totalClicks: number,
  linkClicks: number,
  goalResults: number,
  cprTarget: number
): {
  score: number;
  cvr: number;
  intentionRate: number;
  cpa: number;
  label: string;
  labelColor: string;
} {
  if (totalClicks === 0 && linkClicks === 0) {
    return { score: 0, cvr: 0, intentionRate: 0, cpa: 0, label: "Sin Datos", labelColor: "gray" };
  }

  // Factor 1: Funnel CVR (40%) — % de link clicks que completan el goal
  const effectiveClicks = linkClicks > 0 ? linkClicks : totalClicks;
  const cvr = effectiveClicks > 0 ? (goalResults / effectiveClicks) * 100 : 0;
  // Benchmark: 25% CVR = score 100 (muy variable por industria, 25% es agresivo)
  const cvrScore = Math.min(100, (cvr / 25) * 100);

  // Factor 2: Intention Quality (25%) — % de clics que son link clicks (no accidentales)
  const intentionRate = totalClicks > 0 ? (linkClicks / totalClicks) * 100 : 0;
  // Benchmark: 80% intention rate = score 100
  const intentionScore = Math.min(100, (intentionRate / 80) * 100);

  // Factor 3: Volume Confidence (15%) — confianza estadística del segmento
  // Un mínimo de 15 resultados da confianza estadística razonable
  const volumeScore = Math.min(100, (goalResults / 15) * 100);

  // Factor 4: Cost Efficiency (20%) — CPA real vs CPA meta del proyecto
  const cpa = goalResults > 0 ? spend / goalResults : 0;
  let costScore = 0;
  if (cprTarget > 0 && cpa > 0) {
    // Si el CPA real es menor o igual a la meta → score alto
    costScore = Math.min(100, (cprTarget / cpa) * 100);
  } else if (goalResults > 0) {
    // Si no hay meta de CPR, damos 50 puntos base si hay resultados
    costScore = 50;
  }

  // Weighted sum
  const score = (cvrScore * 0.40) + (intentionScore * 0.25) + (volumeScore * 0.15) + (costScore * 0.20);
  const roundedScore = Math.round(score * 10) / 10;

  const { label, color } = getReliabilityLabel(roundedScore);

  return {
    score: roundedScore,
    cvr: Math.round(cvr * 100) / 100,
    intentionRate: Math.round(intentionRate * 100) / 100,
    cpa: Math.round(cpa * 100) / 100,
    label,
    labelColor: color,
  };
}

// ── Find goal results from actions array ─────────────────────────────────
function findGoalResults(actions: any[] | undefined, goal: string): number {
  if (!actions?.length) return 0;

  const targetTypes = GOAL_ACTION_MAP[goal];
  if (targetTypes) {
    for (const t of targetTypes) {
      const found = actions.find((a: any) => a.action_type === t);
      if (found) return parseInt(found.value || "0", 10);
    }
  }

  // Fallback: try common action types
  for (const t of RESULT_TYPES_FALLBACK) {
    const found = actions.find((a: any) => a.action_type === t);
    if (found) return parseInt(found.value || "0", 10);
  }

  return 0;
}

// ── Find link clicks from actions array ──────────────────────────────────
function findLinkClicks(actions: any[] | undefined, rawClicks: number): number {
  if (!actions?.length) return rawClicks;

  // Priority: link_click > outbound_clicks > raw clicks
  const lc = actions.find((a: any) => a.action_type === "link_click");
  if (lc) return parseInt(lc.value || "0", 10);

  const ob = actions.find((a: any) => a.action_type === "outbound_click");
  if (ob) return parseInt(ob.value || "0", 10);

  return rawClicks;
}

// ═══════════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req, "ads");
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Aislamiento multi-tenant de la caché de anuncios.
  const workspaceId = await getRequestWorkspaceId(req);
  if (!workspaceId) {
    return NextResponse.json({ error: "No hay workspace activo." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  let adAccountId = searchParams.get("adAccountId");
  const dateStart = searchParams.get("dateStart");
  const dateEnd = searchParams.get("dateEnd");
  const preset = searchParams.get("preset");
  const goal = searchParams.get("goal") || "Conversaciones"; // Dynamic goal
  const cprTargetRaw = searchParams.get("cprTarget");
  const cprTarget = cprTargetRaw ? parseFloat(cprTargetRaw) : 0;

  if (!adAccountId) {
    return NextResponse.json({ error: "Missing adAccountId" }, { status: 400 });
  }
  if (!adAccountId.startsWith("act_")) {
    adAccountId = `act_${adAccountId}`;
  }

  const token = accessToken;
  const version = META_API_VERSION;

  let timeRange = "&date_preset=this_month";
  let cacheKey = `this_month_v3_${goal}`;
  if (dateStart && dateEnd) {
    timeRange = `&time_range=${encodeURIComponent(JSON.stringify({ since: dateStart, until: dateEnd }))}`;
    cacheKey = `${dateStart}_${dateEnd}_v3_${goal}`;
  } else if (preset) {
    timeRange = `&date_preset=${preset}`;
    cacheKey = `${preset}_v3_${goal}`;
  }

  try {
    // ── Check DB Cache ───────────────────────────────────────────────
    const cache = await prisma.metaAdsCache.findUnique({
      where: {
        workspaceId_adAccountId_level_dateRange: {
          workspaceId,
          adAccountId,
          level: "audience_reliability",
          dateRange: cacheKey,
        },
      },
    });

    if (cache && Date.now() - new Date(cache.updatedAt).getTime() < 12 * 60 * 60 * 1000) {
      return NextResponse.json(cache.data);
    }

    // ── Build URLs ───────────────────────────────────────────────────
    // timeRange ya empieza con "&" y el query string ya está abierto ("?level=ad...").
    // NO reemplazar el "&" por "?" (metería un segundo "?" DENTRO del valor de fields,
    // rompiendo TODAS las llamadas con error #100 y cacheando el fallo 12h).
    const buildUrl = (breakdowns: string) =>
      `https://graph.facebook.com/${version}/${adAccountId}/insights?level=ad&breakdowns=${breakdowns}&fields=${INSIGHTS_FIELDS}${timeRange}&limit=500`;

    // Demographics (age, gender) — SUPPORTS actions
    const demoUrl = buildUrl("age,gender");

    // Region — SUPPORTS actions
    const regionUrl = buildUrl("region");

    // Country — SUPPORTS actions
    const countryUrl = buildUrl("country");

    // Device (impression_device) — SUPPORTS actions with demographic breakdowns
    const deviceUrl = buildUrl("impression_device");

    // Platform & Placement — Meta does NOT support actions with publisher_platform
    // So we use BASE fields only for this one
    const placementFields = "spend,impressions,clicks,cpm,ctr";
    const placementUrl = `https://graph.facebook.com/${version}/${adAccountId}/insights?level=ad&breakdowns=publisher_platform,platform_position&fields=${placementFields}${timeRange.replace(/^&/, "?")}&limit=500`;

    // ── Fetch all in parallel ────────────────────────────────────────
    const [demoRes, regionRes, countryRes, deviceRes, placementRes] = await Promise.all([
      metaFetch(demoUrl, token),
      metaFetch(regionUrl, token),
      metaFetch(countryUrl, token),
      metaFetch(deviceUrl, token),
      metaFetch(placementUrl, token),
    ]);

    const parseInsights = async (res: Response) => {
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    };

    const rawDemo = await parseInsights(demoRes);
    const rawRegion = await parseInsights(regionRes);
    const rawCountry = await parseInsights(countryRes);
    const rawDevice = await parseInsights(deviceRes);
    const rawPlacement = await parseInsights(placementRes);

    // ── Process data with ICU scoring ────────────────────────────────
    const processWithActions = (data: any[], keyFields: string[]) => {
      // Aggregate by key fields (Meta returns per-ad rows, we want per-segment)
      const grouped: Record<string, any> = {};

      data.forEach((item) => {
        const keyParts = keyFields.map((f) => item[f] || "Unknown");
        const key = keyParts.join("||");

        if (!grouped[key]) {
          grouped[key] = {
            keys: keyFields.reduce((acc: any, field) => {
              acc[field] = item[field] || "Unknown";
              return acc;
            }, {}),
            spend: 0,
            impressions: 0,
            totalClicks: 0,
            linkClicks: 0,
            goalResults: 0,
          };
        }

        grouped[key].spend += parseFloat(item.spend || "0");
        grouped[key].impressions += parseInt(item.impressions || "0", 10);
        grouped[key].totalClicks += parseInt(item.clicks || "0", 10);
        grouped[key].linkClicks += findLinkClicks(item.actions, 0);
        grouped[key].goalResults += findGoalResults(item.actions, goal);
      });

      return Object.values(grouped)
        .map((g: any) => {
          // If no link_clicks found in actions, fallback to total clicks
          const effectiveLinkClicks = g.linkClicks > 0 ? g.linkClicks : g.totalClicks;

          const icu = calculateICU(
            g.spend,
            g.totalClicks,
            effectiveLinkClicks,
            g.goalResults,
            cprTarget
          );

          return {
            ...g.keys,
            metrics: {
              spend: Math.round(g.spend * 100) / 100,
              impressions: g.impressions,
              totalClicks: g.totalClicks,
              linkClicks: effectiveLinkClicks,
              goalResults: g.goalResults,
              cvr: icu.cvr,
              intentionRate: icu.intentionRate,
              cpa: icu.cpa,
              reliabilityScore: icu.score,
              reliabilityLabel: icu.label,
              reliabilityColor: icu.labelColor,
            },
          };
        })
        .filter((item) => item.metrics.totalClicks > 0 || item.metrics.impressions > 100)
        .sort((a, b) => b.metrics.reliabilityScore - a.metrics.reliabilityScore);
    };

    // Process placements WITHOUT actions (Meta limitation)
    const processPlacementsNoActions = (data: any[]) => {
      const grouped: Record<string, any> = {};

      data.forEach((item) => {
        const platform = item.publisher_platform || "Unknown";
        const position = item.platform_position || "Unknown";
        const key = `${platform}||${position}`;

        if (!grouped[key]) {
          grouped[key] = {
            publisher_platform: platform,
            platform_position: position,
            spend: 0,
            impressions: 0,
            totalClicks: 0,
          };
        }

        grouped[key].spend += parseFloat(item.spend || "0");
        grouped[key].impressions += parseInt(item.impressions || "0", 10);
        grouped[key].totalClicks += parseInt(item.clicks || "0", 10);
      });

      return Object.values(grouped)
        .map((g: any) => {
          const ctr = g.impressions > 0 ? (g.totalClicks / g.impressions) * 100 : 0;
          const cpm = g.impressions > 0 ? (g.spend / g.impressions) * 1000 : 0;

          return {
            publisher_platform: g.publisher_platform,
            platform_position: g.platform_position,
            metrics: {
              spend: Math.round(g.spend * 100) / 100,
              impressions: g.impressions,
              totalClicks: g.totalClicks,
              ctr: Math.round(ctr * 100) / 100,
              cpm: Math.round(cpm * 100) / 100,
              // No goal results available for platform breakdown
              goalResults: null,
              cvr: null,
              reliabilityScore: null,
              reliabilityLabel: "Sin datos de conversión",
              reliabilityColor: "gray",
            },
          };
        })
        .filter((item) => item.metrics.impressions > 100)
        .sort((a, b) => b.metrics.spend - a.metrics.spend);
    };

    const demographics = processWithActions(rawDemo, ["age", "gender"]);
    const regions = processWithActions(rawRegion, ["region"]);
    const countries = processWithActions(rawCountry, ["country"]);
    const devices = processWithActions(rawDevice, ["impression_device"]);
    const placements = processPlacementsNoActions(rawPlacement);

    // ── Compute global funnel summary ────────────────────────────────
    const globalTotals = {
      totalClicks: 0,
      linkClicks: 0,
      goalResults: 0,
      spend: 0,
      impressions: 0,
    };
    demographics.forEach((d: any) => {
      globalTotals.totalClicks += d.metrics.totalClicks;
      globalTotals.linkClicks += d.metrics.linkClicks;
      globalTotals.goalResults += d.metrics.goalResults;
      globalTotals.spend += d.metrics.spend;
      globalTotals.impressions += d.metrics.impressions;
    });

    const globalICU = calculateICU(
      globalTotals.spend,
      globalTotals.totalClicks,
      globalTotals.linkClicks,
      globalTotals.goalResults,
      cprTarget
    );

    // ── Identify "Leak Zones" — segments with highest drop-off ───────
    const allSegments = [
      ...demographics.map((d: any) => ({
        segment: `${d.gender === "female" ? "Mujeres" : d.gender === "male" ? "Hombres" : d.gender} ${d.age}`,
        type: "Demografía",
        ...d.metrics,
      })),
      ...regions.slice(0, 15).map((r: any) => ({
        segment: r.region,
        type: "Región",
        ...r.metrics,
      })),
      ...devices.map((d: any) => ({
        segment: d.impression_device,
        type: "Dispositivo",
        ...d.metrics,
      })),
    ];

    // Leak zones: high clicks but low CVR (high drop-off)
    const leakZones = allSegments
      .filter((s) => s.linkClicks >= 10 && s.cvr < 5)
      .sort((a, b) => b.linkClicks - a.linkClicks)
      .slice(0, 8);

    // ── Build response ───────────────────────────────────────────────
    const goalLabel = GOAL_LABELS[goal] || goal;
    const detectedGoalTypes = GOAL_ACTION_MAP[goal] || RESULT_TYPES_FALLBACK;

    const responsePayload = {
      status: "success",
      level: "audience_reliability",
      date_range: { since: dateStart || "N/A", until: dateEnd || "N/A" },
      config: {
        goal,
        goalLabel,
        goalActionTypes: detectedGoalTypes,
        cprTarget,
        algorithm: "ICU_v3",
        weights: {
          funnelCVR: 0.40,
          intentionQuality: 0.25,
          volumeConfidence: 0.15,
          costEfficiency: 0.20,
        },
      },
      summary: {
        impressions: globalTotals.impressions,
        totalClicks: globalTotals.totalClicks,
        linkClicks: globalTotals.linkClicks,
        goalResults: globalTotals.goalResults,
        spend: Math.round(globalTotals.spend * 100) / 100,
        globalCVR: globalICU.cvr,
        globalIntentionRate: globalICU.intentionRate,
        globalCPA: globalICU.cpa,
        globalScore: globalICU.score,
        globalLabel: globalICU.label,
        globalColor: globalICU.labelColor,
        wastedClicks: globalTotals.linkClicks - globalTotals.goalResults,
        wastedClicksPct:
          globalTotals.linkClicks > 0
            ? Math.round(
                ((globalTotals.linkClicks - globalTotals.goalResults) /
                  globalTotals.linkClicks) *
                  10000
              ) / 100
            : 0,
      },
      data: {
        demographics,
        regions,
        countries,
        devices,
        placements,
      },
      leakZones,
      meta: {
        cached_at: new Date().toISOString(),
        metrics_used: [
          "impressions",
          "clicks",
          "link_clicks",
          "spend",
          "cpm",
          "ctr",
          ...detectedGoalTypes,
        ],
      },
    };

    // ── Save to cache ────────────────────────────────────────────────
    await prisma.metaAdsCache
      .upsert({
        where: {
          workspaceId_adAccountId_level_dateRange: {
            workspaceId,
            adAccountId,
            level: "audience_reliability",
            dateRange: cacheKey,
          },
        },
        update: { data: responsePayload as any },
        create: {
          workspaceId,
          adAccountId,
          level: "audience_reliability",
          dateRange: cacheKey,
          data: responsePayload as any,
        },
      })
      .catch((e: any) =>
        logger.error("Cache save error in audience_reliability:", e)
      );

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    logger.error("[RELIABILITY] Exception:", error);
    return NextResponse.json(
      { status: "error", error: error.message },
      { status: 500 }
    );
  }
}
