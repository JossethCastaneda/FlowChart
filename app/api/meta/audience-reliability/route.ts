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
  "Conversaciones (WhatsApp / Messenger)": [
    "onsite_conversion.messaging_conversation_started_7d",
    "messaging_conversation_started_7d",
    "onsite_conversion.messaging_first_reply",
  ],
  "Leads (Formulario Meta)": ["leadgen_grouped", "leadgen", "onsite_conversion.flow_complete", "onsite_conversion.lead_grouped", "onsite_conversion.lead", "lead", "omni_lead"],
  "Leads (Sitio Web / Pixel)": ["offsite_conversion.fb_pixel_lead", "lead", "omni_lead"],
  "Leads (Todas las fuentes)": ["onsite_conversion.flow_complete", "lead", "leadgen", "leadgen_grouped", "omni_lead", "offsite_conversion.fb_pixel_lead", "onsite_conversion.lead_grouped", "onsite_conversion.lead"],
  "Ventas (Sitio Web)": ["offsite_conversion.fb_pixel_purchase"],
  "Ventas (Todas las fuentes)": ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"],

  // Legacy
  "Conversaciones": [
    "onsite_conversion.messaging_conversation_started_7d",
    "messaging_conversation_started_7d",
    "onsite_conversion.messaging_first_reply",
  ],
  "Leads": ["onsite_conversion.flow_complete", "lead", "leadgen", "leadgen_grouped", "onsite_conversion.lead_grouped", "onsite_conversion.lead", "offsite_conversion.fb_pixel_lead", "omni_lead"],
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
  "onsite_conversion.messaging_first_reply",
  "leadgen_grouped",
  "leadgen",
  "onsite_conversion.lead_grouped",
  "onsite_conversion.lead",
  "onsite_conversion.flow_complete",
  "offsite_conversion.fb_pixel_lead",
  "omni_lead",
  "lead",
  "offsite_conversion.fb_pixel_purchase",
  "omni_purchase",
  "purchase",
  "omni_complete_registration",
  "offsite_conversion.fb_pixel_complete_registration",
  "complete_registration",
  "add_to_cart",
  "app_install",
  "omni_app_install",
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
function findGoalResults(actions: any[] | undefined, goal: string): number {
  if (!actions?.length) return 0;

  const targetTypes = GOAL_ACTION_MAP[goal];
  if (targetTypes) {
    for (const t of targetTypes) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      const found = actions.find((a: any) => a.action_type === t);
      if (found) {
        return parseInt(found.value || "0", 10);
      }
    }
    return 0;
  }

  // Fallback: try common action types
  for (const t of RESULT_TYPES_FALLBACK) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const found = actions.find((a: any) => a.action_type === t);
    if (found) return parseInt(found.value || "0", 10);
  }

  return 0;
}

// ── Find link clicks from actions array ──────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
function findLinkClicks(actions: any[] | undefined, rawClicks: number): number {
  if (!actions?.length) return rawClicks;

  // Priority: link_click > outbound_clicks > raw clicks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const lc = actions.find((a: any) => a.action_type === "link_click");
  if (lc) return parseInt(lc.value || "0", 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
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
  const adAccountIdsParam = searchParams.get("adAccountId");
  const dateStart = searchParams.get("dateStart");
  const dateEnd = searchParams.get("dateEnd");
  const preset = searchParams.get("preset");
  const goal = searchParams.get("goal") || "Conversaciones"; // Dynamic goal
  const cprTargetRaw = searchParams.get("cprTarget");
  const cprTarget = cprTargetRaw ? parseFloat(cprTargetRaw) : 0;

  if (!adAccountIdsParam) {
    return NextResponse.json({ error: "Missing adAccountId" }, { status: 400 });
  }
  const adAccountIds = adAccountIdsParam.split(",").map(id => id.startsWith("act_") ? id : `act_${id}`);

  const token = accessToken;
  const version = META_API_VERSION;

  let timeRange = "&date_preset=this_month";
  let cacheKey = `this_month_v4_${goal}_${adAccountIds.join(",")}`;
  if (dateStart && dateEnd) {
    timeRange = `&time_range=${encodeURIComponent(JSON.stringify({ since: dateStart, until: dateEnd }))}`;
    cacheKey = `${dateStart}_${dateEnd}_v4_${goal}_${adAccountIds.join(",")}`;
  } else if (preset) {
    timeRange = `&date_preset=${preset}`;
    cacheKey = `${preset}_v4_${goal}_${adAccountIds.join(",")}`;
  }

  try {
    // ── Check DB Cache ───────────────────────────────────────────────
    const cache = await prisma.metaAdsCache.findUnique({
      where: {
        workspaceId_adAccountId_level_dateRange: {
          workspaceId,
          adAccountId: adAccountIdsParam, // use the raw param for cache grouping
          level: "audience_reliability",
          dateRange: cacheKey,
        },
      },
    });

    if (cache && Date.now() - new Date(cache.updatedAt).getTime() < 2 * 60 * 60 * 1000) {
      return NextResponse.json(cache.data);
    }

    // ── Build URLs & Fetch for all accounts in parallel ───────────────
    const fetchPromises = adAccountIds.map(async (accId) => {
      const buildUrl = (breakdowns: string) =>
        `https://graph.facebook.com/${version}/${accId}/insights?level=ad&breakdowns=${breakdowns}&fields=${INSIGHTS_FIELDS}${timeRange}&limit=500`;

      const globalUrl = `https://graph.facebook.com/${version}/${accId}/insights?level=account&fields=${INSIGHTS_FIELDS}${timeRange}`;
      const placementFields = "spend,impressions,clicks,cpm,ctr";
      const placementUrl = `https://graph.facebook.com/${version}/${accId}/insights?level=ad&breakdowns=publisher_platform,platform_position&fields=${placementFields}${timeRange}&limit=500`;

      const [demoRes, regionRes, countryRes, deviceRes, placementRes, globalRes] = await Promise.all([
        metaFetch(buildUrl("age,gender"), token),
        metaFetch(buildUrl("region"), token),
        metaFetch(buildUrl("country"), token),
        metaFetch(buildUrl("impression_device"), token),
        metaFetch(placementUrl, token),
        metaFetch(globalUrl, token),
      ]);

      const parseInsights = async (res: Response) => {
        if (!res.ok) return [];
        const json = await res.json();
        return json.data || [];
      };

      return {
        demo: await parseInsights(demoRes),
        region: await parseInsights(regionRes),
        country: await parseInsights(countryRes),
        device: await parseInsights(deviceRes),
        placement: await parseInsights(placementRes),
        global: await parseInsights(globalRes),
      };
    });

    const accountResults = await Promise.all(fetchPromises);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const rawDemo: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const rawRegion: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const rawCountry: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const rawDevice: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const rawPlacement: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const rawGlobal: any[] = [];

    for (const res of accountResults) {
      rawDemo.push(...res.demo);
      rawRegion.push(...res.region);
      rawCountry.push(...res.country);
      rawDevice.push(...res.device);
      rawPlacement.push(...res.placement);
      rawGlobal.push(...res.global);
    }

    // Extract total true results from the account-level query across all accounts
    let globalResults = 0;
    if (rawGlobal.length > 0) {
      for (const item of rawGlobal) {
        globalResults += findGoalResults(item.actions, goal);
      }
    }

    // ── Process data with ICU scoring ────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const processWithActions = (data: any[], keyFields: string[]) => {
      // Aggregate by key fields (Meta returns per-ad rows, we want per-segment)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      const grouped: Record<string, any> = {};

      data.forEach((item) => {
        const keyParts = keyFields.map((f) => item[f] || "Unknown");
        const key = keyParts.join("||");

        if (!grouped[key]) {
          grouped[key] = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
            keys: keyFields.reduce((acc: any, field) => {
              acc[field] = item[field] || "Unknown";
              return acc;
            }, {}),
            spend: 0,
            impressions: 0,
            reach: 0,
            totalClicks: 0,
            rawLinkClicks: 0,
            goalResults: 0,
          };
        }

        grouped[key].spend += parseFloat(item.spend || "0");
        grouped[key].impressions += parseInt(item.impressions || "0", 10);
        grouped[key].reach += parseInt(item.reach || "0", 10);
        grouped[key].totalClicks += parseInt(item.clicks || "0", 10);
        grouped[key].rawLinkClicks += findLinkClicks(item.actions, 0);
        grouped[key].goalResults += findGoalResults(item.actions, goal);
      });

      // Zefirus Heuristic Estimation Algorithm:
      // If Meta hides conversions for demographic/regional breakdowns (due to privacy), 
      // the sum of regional results will be significantly lower than the global total.
      // We distribute the missing results proportional to the Spend of each region.
      let totalSegmentResults = 0;
      let totalSegmentSpend = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      Object.values(grouped).forEach((g: any) => {
        totalSegmentResults += g.goalResults;
        totalSegmentSpend += g.spend;
      });

      const isEstimated = globalResults > 0 && totalSegmentResults < (globalResults * 0.9);

      if (isEstimated && totalSegmentSpend > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
        Object.values(grouped).forEach((g: any) => {
          const spendShare = g.spend / totalSegmentSpend;
          g.goalResults = Math.round(globalResults * spendShare);
        });
      }

      return Object.values(grouped)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
        .map((g: any) => {
          // effectiveLinkClicks is used ONLY for ICU scoring —
          // when there are no link_click actions we fall back to totalClicks
          // so the algorithm can still produce a score.
          const effectiveLinkClicks = g.rawLinkClicks > 0 ? g.rawLinkClicks : g.totalClicks;

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
              reach: g.reach,
              totalClicks: g.totalClicks,
              // linkClicks = real link clicks from actions (0 if Meta didn't report them)
              linkClicks: g.rawLinkClicks,
              goalResults: g.goalResults,
              cvr: icu.cvr,
              intentionRate: icu.intentionRate,
              cpa: icu.cpa,
              reliabilityScore: icu.score,
              reliabilityLabel: icu.label,
              reliabilityColor: icu.labelColor,
              isEstimated,
            },
          };
        })
        .filter((item) => item.metrics.totalClicks > 0 || item.metrics.impressions > 100)
        .sort((a, b) => b.metrics.reliabilityScore - a.metrics.reliabilityScore);
    };

    // Process placements WITHOUT actions (Meta limitation)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const processPlacementsNoActions = (data: any[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
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
      reach: 0,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    demographics.forEach((d: any) => {
      globalTotals.totalClicks += d.metrics.totalClicks;
      globalTotals.linkClicks += d.metrics.linkClicks;
      globalTotals.goalResults += d.metrics.goalResults;
      globalTotals.spend += d.metrics.spend;
      globalTotals.impressions += d.metrics.impressions;
      globalTotals.reach += d.metrics.reach || 0;
    });

    // For global ICU: if real link clicks exist, use them; otherwise fall back to totalClicks
    const globalEffectiveLinks = globalTotals.linkClicks > 0 ? globalTotals.linkClicks : globalTotals.totalClicks;
    const globalICU = calculateICU(
      globalTotals.spend,
      globalTotals.totalClicks,
      globalEffectiveLinks,
      globalTotals.goalResults,
      cprTarget
    );

    // ── Identify "Leak Zones" — segments with highest drop-off ───────
    const allSegments = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      ...demographics.map((d: any) => ({
        segment: `${d.gender === "female" ? "Mujeres" : d.gender === "male" ? "Hombres" : d.gender} ${d.age}`,
        type: "Demografía",
        ...d.metrics,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      ...regions.slice(0, 15).map((r: any) => ({
        segment: r.region,
        type: "Región",
        ...r.metrics,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
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
        reach: globalTotals.reach,
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
        // wastedClicks: link clicks that did NOT convert
        // Use real linkClicks when available, otherwise totalClicks
        wastedClicks: globalEffectiveLinks - globalTotals.goalResults,
        wastedClicksPct:
          globalEffectiveLinks > 0
            ? Math.round(
                ((globalEffectiveLinks - globalTotals.goalResults) /
                  globalEffectiveLinks) *
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
            adAccountId: adAccountIdsParam,
            level: "audience_reliability",
            dateRange: cacheKey,
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
        update: { data: responsePayload as any },
        create: {
          workspaceId,
          adAccountId: adAccountIdsParam,
          level: "audience_reliability",
          dateRange: cacheKey,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
          data: responsePayload as any,
        },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      .catch((e: any) =>
        logger.error("Cache save error in audience_reliability:", e)
      );

    return NextResponse.json(responsePayload);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  } catch (error: any) {
    logger.error("[RELIABILITY] Exception:", error);
    return NextResponse.json(
      { status: "error", error: error.message },
      { status: 500 }
    );
  }
}
