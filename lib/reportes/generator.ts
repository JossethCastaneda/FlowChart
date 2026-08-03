/* ════════════════════════════════════════════════════════════
   FLOWCHART · REPORT GENERATOR
   Genera snapshots inmutables de métricas de un proyecto
   para su visualización como reporte white-label.
   ════════════════════════════════════════════════════════════ */

import prisma from "@/lib/prisma";
import { nanoid } from "nanoid";

export interface ReportKPI {
  label: string;
  value: string;
  delta?: string;      // "+12.3%" or "-5.4%"
  deltaType?: "up" | "down" | "neutral";
}

export interface ReportTimeSeries {
  date: string;
  spend: number;
  results: number;
  cpr: number;
  impressions: number;
  clicks: number;
}

export interface ReportCreative {
  id: string;
  name: string;
  thumbnailUrl?: string;
  spend: number;
  results: number;
  cpr: number;
  ctr: number;
  impressions: number;
}

export interface ReportPacing {
  budgetTotal: number;
  budgetToDate: number;
  spendToDate: number;
  spendPct: number;
  goalTotal: number;
  goalToDate: number;
  resultsToDate: number;
  resultsPct: number;
}

export interface ReportSnapshot {
  projectName: string;
  projectAlias?: string;
  client?: string;
  vertical?: string;
  dateFrom: string;
  dateTo: string;
  kpis: ReportKPI[];
  timeSeries: ReportTimeSeries[];
  topCreatives: ReportCreative[];
  pacing: ReportPacing;
  insights?: string;       // Texto generado por Aria IA
  generatedAt: string;
}

export interface ReportSettings {
  logoUrl?: string;
  footerText?: string;
  accentColor?: string;
  hideWatermark?: boolean;
}

/**
 * Genera un slug único para el reporte público.
 * Formato: 21 chars alfanuméricos (nanoid) ≈ 126 bits de entropía.
 */
export function generateReportSlug(): string {
  return nanoid(21);
}

/**
 * Construye el snapshot de datos de un proyecto a partir de
 * las métricas ya guardadas en el insights cache.
 * 
 * NOTA: En producción, esto debería consultar la API de Meta directamente
 * para garantizar datos frescos. Por ahora, usamos los datos que ya tenemos
 * en el flujo existente (que el frontend cachea).
 */
export async function buildReportData(
  projectId: string,
  dateFrom: string,
  dateTo: string,
  insightsData?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    timeSeries?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    creatives?: any[];
  },
): Promise<ReportSnapshot> {
  // Fetch project info
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: {
      name: true,
      alias: true,
      client: true,
      vertical: true,
      channels: {
        select: { config: true },
      },
    },
  });

  // Parse channel config for budget/goal info
  const channelCfg = project.channels?.[0]?.config;
  const cfg = typeof channelCfg === "string"
    ? JSON.parse(channelCfg)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    : (channelCfg as Record<string, any>) ?? {};

  const parseBudget = (s: string) => parseFloat((s || "0").replace(/[^0-9.]/g, "")) || 0;
  const budgetNum = parseBudget(cfg.budget || "0");
  const cprTarget = parseBudget(cfg.cpr || "0");
  const goal = cfg.goal || "Resultados";

  // Process time series
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const timeSeries: ReportTimeSeries[] = (insightsData?.timeSeries || []).map((d: any) => {
    const spend = parseFloat(d.spend || "0");
    const results = parseInt(d.results || d.actions?.[0]?.value || "0", 10);
    const impressions = parseInt(d.impressions || "0", 10);
    const clicks = parseInt(d.clicks || "0", 10);
    return {
      date: d.date_start || d.date || "",
      spend,
      results,
      cpr: results > 0 ? spend / results : 0,
      impressions,
      clicks,
    };
  });

  // Totals
  let totalSpend = 0, totalResults = 0, totalImpressions = 0, totalClicks = 0;
  timeSeries.forEach((d) => {
    totalSpend += d.spend;
    totalResults += d.results;
    totalImpressions += d.impressions;
    totalClicks += d.clicks;
  });

  const cpr = totalResults > 0 ? totalSpend / totalResults : 0;
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  // Pacing
  const now = new Date();
  const daysElapsed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daily = budgetNum / daysInMonth;
  const budgetToDate = daily * daysElapsed;
  const goalToDate = cprTarget > 0 ? budgetToDate / cprTarget : 0;

  const pacing: ReportPacing = {
    budgetTotal: budgetNum,
    budgetToDate,
    spendToDate: totalSpend,
    spendPct: budgetToDate > 0 ? (totalSpend / budgetToDate) * 100 : 0,
    goalTotal: cprTarget > 0 ? budgetNum / cprTarget : 0,
    goalToDate,
    resultsToDate: totalResults,
    resultsPct: goalToDate > 0 ? (totalResults / goalToDate) * 100 : 0,
  };

  // Top creatives
  const topCreatives: ReportCreative[] = (insightsData?.creatives || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    .map((c: any) => ({
      id: c.ad_id || c.id || "",
      name: c.ad_name || c.name || "Sin nombre",
      thumbnailUrl: c.thumbnail_url || c.image_url || undefined,
      spend: parseFloat(c.spend || "0"),
      results: parseInt(c.results || c.actions?.[0]?.value || "0", 10),
      cpr: parseFloat(c.spend || "0") > 0 && parseInt(c.results || "0", 10) > 0
        ? parseFloat(c.spend || "0") / parseInt(c.results || "0", 10)
        : 0,
      ctr: parseInt(c.impressions || "0", 10) > 0
        ? (parseInt(c.clicks || "0", 10) / parseInt(c.impressions || "0", 10)) * 100
        : 0,
      impressions: parseInt(c.impressions || "0", 10),
    }))
    .sort((a: ReportCreative, b: ReportCreative) => b.results - a.results)
    .slice(0, 5);

  // KPIs
  const fmtMXN = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const kpis: ReportKPI[] = [
    { label: "Inversión Total", value: fmtMXN(totalSpend) },
    { label: "Resultados", value: totalResults.toLocaleString("es-MX") },
    { label: `Costo / ${goal.split("(")[0]?.trim() || "Resultado"}`, value: cpr > 0 ? fmtMXN(cpr) : "—" },
    { label: "CPM", value: cpm > 0 ? fmtMXN(cpm) : "—" },
    { label: "CTR", value: ctr > 0 ? `${ctr.toFixed(2)}%` : "—" },
    { label: "Impresiones", value: totalImpressions.toLocaleString("es-MX") },
  ];

  return {
    projectName: project.name,
    projectAlias: project.alias || undefined,
    client: project.client || undefined,
    vertical: project.vertical || undefined,
    dateFrom,
    dateTo,
    kpis,
    timeSeries,
    topCreatives,
    pacing,
    generatedAt: new Date().toISOString(),
  };
}
