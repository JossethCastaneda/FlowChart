// ============================================================================
// Agregaciones por dimensión (spec §18-§25). Funciones PURAS y testeables que
// transforman conversaciones normalizadas en las series/tablas que consumen los
// dashboards. No tocan red ni BD: la ruta API hace el findMany scoped por
// workspace y pasa las filas aquí.
// ============================================================================

export interface AggConversation {
  provider?: string | null;
  channel?: string | null;
  botId?: string | null;
  botName?: string | null;
  status: string;
  outcome?: string | null;
  resolvedBy?: string | null;
  wasBotOnly?: boolean;
  wasHandoff?: boolean;
  agentId?: string | null;
  agentName?: string | null;
  queueName?: string | null;
  campaignId?: string | null;
  serviceId?: string | null;
  tags?: string[];
  csatScore?: number | null;
  firstResponseTimeSeconds?: number | null;
  handleTimeSeconds?: number | null;
  waitingTimeSeconds?: number | null;
  durationSeconds?: number | null;
  totalUserMessages?: number | null;
  totalFallbacks?: number | null;
  conversationStartedAt: Date | string;
}

function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function dayKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().split("T")[0];
}

export interface CountItem { name: string; count: number }

export function countBy<T>(rows: T[], keyFn: (r: T) => string | null | undefined): CountItem[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = keyFn(r);
    if (!k) continue;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export interface TrendPoint { date: string; total: number; botResolved: number; handoffs: number }

export function buildTrends(rows: AggConversation[]): TrendPoint[] {
  const map = new Map<string, TrendPoint>();
  for (const c of rows) {
    const day = dayKey(c.conversationStartedAt);
    const p = map.get(day) || { date: day, total: 0, botResolved: 0, handoffs: 0 };
    p.total += 1;
    if (c.outcome === "resolved" && c.resolvedBy === "bot") p.botResolved += 1;
    if (c.wasHandoff) p.handoffs += 1;
    map.set(day, p);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export interface AgentRow {
  agentId: string;
  agentName: string;
  handled: number;
  closed: number;
  transfers: number;
  avgFrt: number;
  avgAht: number;
  avgCsat: number | null;
}

export function aggregateAgents(rows: AggConversation[]): AgentRow[] {
  const byAgent = new Map<string, AggConversation[]>();
  for (const c of rows) {
    if (!c.agentId) continue;
    const arr = byAgent.get(c.agentId) || [];
    arr.push(c);
    byAgent.set(c.agentId, arr);
  }
  return [...byAgent.entries()].map(([agentId, convs]) => {
    const csats = convs.map((c) => c.csatScore).filter((v): v is number => typeof v === "number");
    return {
      agentId,
      agentName: convs.find((c) => c.agentName)?.agentName || agentId,
      handled: convs.length,
      closed: convs.filter((c) => c.status === "closed").length,
      transfers: convs.filter((c) => c.wasHandoff).length,
      avgFrt: avg(convs.map((c) => c.firstResponseTimeSeconds || 0).filter((v) => v > 0)),
      avgAht: avg(convs.map((c) => c.handleTimeSeconds || 0).filter((v) => v > 0)),
      avgCsat: csats.length ? avg(csats) : null,
    };
  }).sort((a, b) => b.handled - a.handled);
}

export interface CampaignRow {
  campaignId: string;
  conversationsStarted: number;
  replied: number;
  conversions: number;
  responseRate: number;
}

export function aggregateCampaigns(rows: AggConversation[]): CampaignRow[] {
  const byCampaign = new Map<string, AggConversation[]>();
  for (const c of rows) {
    if (!c.campaignId) continue;
    const arr = byCampaign.get(c.campaignId) || [];
    arr.push(c);
    byCampaign.set(c.campaignId, arr);
  }
  return [...byCampaign.entries()].map(([campaignId, convs]) => {
    const started = convs.length;
    const replied = convs.filter((c) => (c.totalUserMessages || 0) > 0).length;
    const conversions = convs.filter((c) => c.outcome === "resolved").length;
    return {
      campaignId,
      conversationsStarted: started,
      replied,
      conversions,
      responseRate: started > 0 ? (replied / started) * 100 : 0,
    };
  }).sort((a, b) => b.conversationsStarted - a.conversationsStarted);
}

export interface ServiceRow {
  serviceId: string;
  started: number;
  completed: number;
  failed: number;
  conversionRate: number;
  avgCompletionSeconds: number;
}

export function aggregateServices(rows: AggConversation[]): ServiceRow[] {
  const byService = new Map<string, AggConversation[]>();
  for (const c of rows) {
    if (!c.serviceId) continue;
    const arr = byService.get(c.serviceId) || [];
    arr.push(c);
    byService.set(c.serviceId, arr);
  }
  return [...byService.entries()].map(([serviceId, convs]) => {
    const started = convs.length;
    const completed = convs.filter((c) => c.outcome === "resolved").length;
    const failed = convs.filter((c) => c.outcome === "error" || c.outcome === "not_resolved").length;
    return {
      serviceId,
      started,
      completed,
      failed,
      conversionRate: started > 0 ? (completed / started) * 100 : 0,
      avgCompletionSeconds: avg(convs.map((c) => c.durationSeconds || 0).filter((v) => v > 0)),
    };
  }).sort((a, b) => b.started - a.started);
}

export interface FunnelStep { name: string; count: number; conversionFromPrev: number }

/** Funnel canónico bot→resolución a partir de conversaciones (spec §24, fallback). */
export function aggregateFunnel(rows: AggConversation[]): FunnelStep[] {
  const total = rows.length;
  const engaged = rows.filter((c) => (c.totalUserMessages || 0) > 0).length;
  const noFallback = rows.filter((c) => (c.totalFallbacks || 0) === 0).length;
  const resolved = rows.filter((c) => c.outcome === "resolved").length;
  const steps = [
    { name: "Iniciaron", count: total },
    { name: "Interactuaron", count: engaged },
    { name: "Entendidos", count: noFallback },
    { name: "Resueltos", count: resolved },
  ];
  return steps.map((s, i) => ({
    ...s,
    conversionFromPrev: i === 0 ? 100 : steps[i - 1].count > 0 ? (s.count / steps[i - 1].count) * 100 : 0,
  }));
}

export interface OperationSummary {
  active: number;
  closed: number;
  abandoned: number;
  transferred: number;
  topQueuesByWait: { name: string; avgWaitSeconds: number; count: number }[];
  slaMet: number;
  slaBreached: number;
}

/** Resumen operativo (spec §19). SLA por defecto: FRT <= 120s. */
export function aggregateOperations(rows: AggConversation[], slaFrtSeconds = 120): OperationSummary {
  const byQueue = new Map<string, AggConversation[]>();
  for (const c of rows) {
    if (!c.queueName) continue;
    const arr = byQueue.get(c.queueName) || [];
    arr.push(c);
    byQueue.set(c.queueName, arr);
  }
  const withFrt = rows.filter((c) => typeof c.firstResponseTimeSeconds === "number");
  return {
    active: rows.filter((c) => c.status === "active").length,
    closed: rows.filter((c) => c.status === "closed").length,
    abandoned: rows.filter((c) => c.status === "abandoned").length,
    transferred: rows.filter((c) => c.status === "transferred").length,
    topQueuesByWait: [...byQueue.entries()]
      .map(([name, convs]) => ({
        name,
        count: convs.length,
        avgWaitSeconds: avg(convs.map((c) => c.waitingTimeSeconds || 0)),
      }))
      .sort((a, b) => b.avgWaitSeconds - a.avgWaitSeconds)
      .slice(0, 10),
    slaMet: withFrt.filter((c) => (c.firstResponseTimeSeconds as number) <= slaFrtSeconds).length,
    slaBreached: withFrt.filter((c) => (c.firstResponseTimeSeconds as number) > slaFrtSeconds).length,
  };
}

/** Comparación de conversaciones por proveedor — spec §18. */
export function compareProviders(rows: AggConversation[]): Record<string, { total: number; resolvedByBot: number; containment: number }> {

  const out: Record<string, { total: number; resolvedByBot: number; containment: number }> = {};
  for (const c of rows) {
    const p = c.provider || "unknown";
    out[p] = out[p] || { total: 0, resolvedByBot: 0, containment: 0 };
    out[p].total += 1;
    if (c.outcome === "resolved" && c.resolvedBy === "bot") out[p].resolvedByBot += 1;
  }
  for (const p of Object.keys(out)) {
    out[p].containment = out[p].total > 0 ? (out[p].resolvedByBot / out[p].total) * 100 : 0;
  }
  return out;
}
