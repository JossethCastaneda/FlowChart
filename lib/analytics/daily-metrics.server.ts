// ============================================================================
// Lector de agregados diarios (goal §13). Decide entre AGREGADO + día en vivo y
// FALLBACK EN VIVO, y devuelve un dataset uniforme (mismos acumuladores) para
// overview / operations / roi (globales y por proyecto vía forwarding).
//
// Reglas:
//   - Solo usa agregados si el filtro se limita a dimensiones que el agregado
//     lleva (provider/channel/botId + rango). Cualquier filtro de alta
//     cardinalidad (agente/campaña/servicio/cola/skill/outcome/estado/tag/búsqueda)
//     fuerza camino EN VIVO (correctitud > optimización).
//   - Lee filas `AnalyticsDailyMetric` (acc_*) para días < hoy y suma el día
//     actual EN VIVO. Si no hay filas agregadas en la ventana → fallback live.
//   - El WHERE respeta SIEMPRE workspaceId (sesión) + projectId/providers/canales
//     del scope (mismo aislamiento que buildConversationWhere).
// ============================================================================

import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { buildConversationWhere, type AnalyticsFilters } from "./query";
import type { ProjectScope } from "./project-scope";
import {
  accumulatorsFromConversations,
  accumulatorsFromMetricRows,
  addAccumulators,
  emptyAccumulators,
  type Accumulators,
  type DailyConv,
} from "./daily-metrics";

export interface TrendPoint { date: string; total: number; botResolved: number; handoffs: number }
export interface ChannelCount { name: string; count: number }

export interface AnalyticsDataset {
  source: "aggregate" | "live";
  acc: Accumulators;
  perDate: TrendPoint[];
  perChannel: ChannelCount[];
}

const LIVE_SELECT = {
  status: true, outcome: true, resolvedBy: true, wasBotOnly: true, wasHandoff: true,
  totalUserMessages: true, totalBotMessages: true, totalFallbacks: true,
  csatScore: true, firstResponseTimeSeconds: true, handleTimeSeconds: true,
  waitingTimeSeconds: true, channel: true, conversationStartedAt: true,
} as const;

/** Filtros que el agregado NO puede satisfacer (no son dimensiones del rollup). */
export function aggregatesUsable(f: AnalyticsFilters): boolean {
  return !(
    f.agentId || f.campaignId || f.serviceId || f.queueName || f.skillName ||
    f.outcome || f.resolvedBy || f.status || f.tag || f.search
  );
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function dayKey(d: Date | string): string {
  return (typeof d === "string" ? new Date(d) : d).toISOString().split("T")[0];
}

function perDateFromConvs(convs: DailyConv[]): TrendPoint[] {
  const map = new Map<string, TrendPoint>();
  for (const c of convs) {
    const day = dayKey(c.conversationStartedAt);
    const p = map.get(day) || { date: day, total: 0, botResolved: 0, handoffs: 0 };
    p.total += 1;
    if (c.outcome === "resolved" && c.resolvedBy === "bot") p.botResolved += 1;
    if (c.wasHandoff) p.handoffs += 1;
    map.set(day, p);
  }
  return [...map.values()];
}

function perChannelFromConvs(convs: DailyConv[]): ChannelCount[] {
  const map = new Map<string, number>();
  for (const c of convs) {
    const ch = c.channel || "unknown";
    map.set(ch, (map.get(ch) || 0) + 1);
  }
  return [...map.entries()].map(([name, count]) => ({ name, count }));
}

function mergeTrends(a: TrendPoint[], b: TrendPoint[]): TrendPoint[] {
  const map = new Map<string, TrendPoint>();
  for (const p of [...a, ...b]) {
    const cur = map.get(p.date) || { date: p.date, total: 0, botResolved: 0, handoffs: 0 };
    cur.total += p.total; cur.botResolved += p.botResolved; cur.handoffs += p.handoffs;
    map.set(p.date, cur);
  }
  return [...map.values()].sort((x, y) => x.date.localeCompare(y.date));
}

function mergeChannels(a: ChannelCount[], b: ChannelCount[]): ChannelCount[] {
  const map = new Map<string, number>();
  for (const c of [...a, ...b]) map.set(c.name, (map.get(c.name) || 0) + c.count);
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((x, y) => y.count - x.count);
}

async function liveDataset(
  workspaceId: string,
  filters: AnalyticsFilters,
  scope?: ProjectScope | null
): Promise<AnalyticsDataset> {
  const where = buildConversationWhere(workspaceId, filters, scope);
  
  // 1. Offloaded Aggregations to Neon Postgres
  const statusGroups = await prisma.normalizedConversation.groupBy({
    by: ['status', 'outcome', 'resolvedBy', 'wasHandoff', 'wasBotOnly'],
    where,
    _count: { 
      _all: true,
      csatScore: true,
      firstResponseTimeSeconds: true,
      handleTimeSeconds: true,
      waitingTimeSeconds: true,
    },
    _sum: {
      totalUserMessages: true,
      totalBotMessages: true,
      totalFallbacks: true,
      csatScore: true,
      firstResponseTimeSeconds: true,
      handleTimeSeconds: true,
      waitingTimeSeconds: true,
    }
  });

  const acc = emptyAccumulators();
  for (const g of statusGroups) {
    const n = g._count._all;
    acc.total += n;
    if (g.status === "active") acc.active += n;
    if (g.status === "closed") acc.closed += n;
    if (g.status === "abandoned") acc.abandoned += n;
    if (g.status === "transferred") acc.transferred += n;
    if (["closed", "abandoned", "transferred"].includes(g.status)) acc.closedSet += n;
    if (g.outcome === "resolved" && g.resolvedBy === "bot") acc.botResolved += n;
    if (g.wasHandoff) acc.handoffs += n;
    if (g.wasBotOnly) acc.botOnly += n;
    
    acc.userMsgs += g._sum.totalUserMessages || 0;
    acc.botMsgs += g._sum.totalBotMessages || 0;
    acc.fallbacks += g._sum.totalFallbacks || 0;
    
    if (g._sum.csatScore !== null) { acc.csatSum += g._sum.csatScore; acc.csatN += g._count.csatScore; }
    if (g._sum.firstResponseTimeSeconds !== null) { acc.frtSum += g._sum.firstResponseTimeSeconds; acc.frtN += g._count.firstResponseTimeSeconds; }
    if (g._sum.handleTimeSeconds !== null) { acc.ahtSum += g._sum.handleTimeSeconds; acc.ahtN += g._count.handleTimeSeconds; }
    if (g._sum.waitingTimeSeconds !== null) { acc.waitSum += g._sum.waitingTimeSeconds; acc.waitN += g._count.waitingTimeSeconds; }
  }

  // 2. Conditional counts not supported by Prisma groupBy (offloaded via count)
  const [earlyAbandon, slaMet, slaBreached] = await Promise.all([
    prisma.normalizedConversation.count({ where: { ...where, status: "abandoned", wasHandoff: false, totalUserMessages: { lte: 2 } } }),
    prisma.normalizedConversation.count({ where: { ...where, firstResponseTimeSeconds: { lte: 120 } } }),
    prisma.normalizedConversation.count({ where: { ...where, firstResponseTimeSeconds: { gt: 120 } } })
  ]);
  acc.earlyAbandon = earlyAbandon;
  acc.slaMet = slaMet;
  acc.slaBreached = slaBreached;

  // 3. Lightweight fetch only for date and channel distributions
  const trendRows = (await prisma.normalizedConversation.findMany({
    where,
    select: { conversationStartedAt: true, outcome: true, resolvedBy: true, wasHandoff: true, channel: true }
  })) as DailyConv[];

  return {
    source: "live",
    acc,
    perDate: perDateFromConvs(trendRows).sort((a, b) => a.date.localeCompare(b.date)),
    perChannel: perChannelFromConvs(trendRows).sort((a, b) => b.count - a.count),
  };
}

/** Construye el WHERE de AnalyticsDailyMetric respetando el mismo scoping. */
function dailyMetricWhere(
  workspaceId: string,
  filters: AnalyticsFilters,
  histGte: Date,
  histLt: Date,
  scope?: ProjectScope | null
): Prisma.AnalyticsDailyMetricWhereInput {
  const where: Prisma.AnalyticsDailyMetricWhereInput = {
    workspaceId,
    date: { gte: histGte, lt: histLt, lte: filters.endDate },
    metricKey: { startsWith: "acc_" },
  };
  if (scope) {
    where.projectId = scope.projectId;
    where.provider = { in: scope.providers };
    where.channel = { in: scope.channels };
  }
  if (filters.provider && (!scope || scope.providers.includes(filters.provider))) where.provider = filters.provider;
  if (filters.channel && (!scope || (scope.channels as readonly string[]).includes(filters.channel))) where.channel = filters.channel;
  if (filters.botId) where.botId = filters.botId;
  return where;
}

/**
 * Devuelve el dataset uniforme para las rutas de KPIs. Usa agregados históricos +
 * día en vivo cuando es posible; si no hay agregados o el filtro no es agregable,
 * cae a consulta EN VIVO completa (mismo resultado numérico).
 */
export async function getAnalyticsDataset(
  workspaceId: string,
  filters: AnalyticsFilters,
  scope?: ProjectScope | null
): Promise<AnalyticsDataset> {
  if (!aggregatesUsable(filters)) return liveDataset(workspaceId, filters, scope);

  const now = new Date();
  const today0 = startOfUtcDay(now);
  const start0 = startOfUtcDay(filters.startDate);

  // Todo el rango es hoy/futuro → no hay histórico que agregar; live directo.
  if (start0 >= today0) return liveDataset(workspaceId, filters, scope);

  const dmRows = (await prisma.analyticsDailyMetric.findMany({
    where: dailyMetricWhere(workspaceId, filters, start0, today0, scope),
    select: { date: true, channel: true, metricKey: true, metricValue: true },
  })) as { date: Date; channel: string | null; metricKey: string; metricValue: number }[];

  // Sin agregados en la ventana → fallback seguro a live completo.
  if (dmRows.length === 0) return liveDataset(workspaceId, filters, scope);

  // Acumuladores + breakdowns desde filas agregadas.
  let acc = accumulatorsFromMetricRows(dmRows);
  const perDateMap = new Map<string, TrendPoint>();
  const perChannelMap = new Map<string, number>();
  for (const r of dmRows) {
    const key = r.metricKey.slice(4);
    const day = dayKey(r.date);
    const tp = perDateMap.get(day) || { date: day, total: 0, botResolved: 0, handoffs: 0 };
    if (key === "total") tp.total += r.metricValue;
    if (key === "botResolved") tp.botResolved += r.metricValue;
    if (key === "handoffs") tp.handoffs += r.metricValue;
    perDateMap.set(day, tp);
    if (key === "total") perChannelMap.set(r.channel || "unknown", (perChannelMap.get(r.channel || "unknown") || 0) + r.metricValue);
  }
  let perDate = [...perDateMap.values()];
  let perChannel = [...perChannelMap.entries()].map(([name, count]) => ({ name, count }));

  // Día actual EN VIVO (si el rango llega a hoy).
  if (filters.endDate >= today0) {
    const todayStart = filters.startDate > today0 ? filters.startDate : today0;
    const todayWhere = buildConversationWhere(workspaceId, { ...filters, startDate: todayStart }, scope);
    const todayConvs = (await prisma.normalizedConversation.findMany({ where: todayWhere, select: LIVE_SELECT })) as DailyConv[];
    acc = addAccumulators(acc, accumulatorsFromConversations(todayConvs));
    perDate = mergeTrends(perDate, perDateFromConvs(todayConvs));
    perChannel = mergeChannels(perChannel, perChannelFromConvs(todayConvs));
  } else {
    perDate = perDate.sort((a, b) => a.date.localeCompare(b.date));
    perChannel = perChannel.sort((a, b) => b.count - a.count);
  }

  return { source: "aggregate", acc: acc ?? emptyAccumulators(), perDate, perChannel };
}
