import { determineConversationOutcome, type OutcomeRuleLike, type ConversationLike } from "./rules";

// ============================================================================
// Motor de KPIs (spec §13, §14). Calcula KPIs escalares a partir de un set de
// conversaciones normalizadas (ya filtradas por workspace/periodo en la ruta).
// REGLA CRÍTICA: bot-only y resuelto-por-bot son métricas SEPARADAS.
//   - botOnlyRate  : conversaciones sin agente / totales (volumen)
//   - botResolutionRate / realContainmentRate : exigen outcome exitoso (éxito)
// ============================================================================

/** Campos que consume el motor. Compatible con NormalizedConversation y mocks. */
export interface KpiConversation {
  customerId?: string | null;
  customerIdentifierHash?: string | null;
  provider?: string;
  status: string;
  outcome?: string | null;
  resolvedBy?: string | null;
  wasBotOnly?: boolean;
  wasHandoff?: boolean;
  totalUserMessages?: number;
  totalFallbacks?: number;
  csatScore?: number | null;
  npsScore?: number | null;
  firstResponseTimeSeconds?: number | null;
  handleTimeSeconds?: number | null;
  waitingTimeSeconds?: number | null;
}

export interface AnalyticsKpiData {
  totalConversations: number;
  uniqueUsers: number;

  realContainmentRate: number;
  botOnlyRate: number;
  botResolutionRate: number;
  escalationRate: number;
  fallbackRate: number;
  taskCompletionRate: number;
  abandonmentRate: number;
  earlyAbandonmentRate: number;

  avgCsat: number | null;
  avgNps: number | null;

  avgFrt: number | null;
  avgAqt: number | null;
  avgAsa: number | null;
  avgAht: number | null;

  campaignsSent: number;
  campaignsDelivered: number;
  campaignsRead: number;
  campaignsReplied: number;
  servicesStarted: number;
  servicesCompleted: number;

  estimatedRoiSaved: number;
}

export interface ComputeKpisParams {
  conversations: KpiConversation[];
  rules?: OutcomeRuleLike[];
  agentCostPerHour?: number;
  humanAhtBaselineSeconds?: number;
  /** Métricas de campañas/servicios provenientes de otras fuentes (opcional). */
  campaigns?: { sent: number; delivered: number; read: number; replied: number };
  services?: { started: number; completed: number };
}

const EMPTY: AnalyticsKpiData = {
  totalConversations: 0, uniqueUsers: 0,
  realContainmentRate: 0, botOnlyRate: 0, botResolutionRate: 0, escalationRate: 0,
  fallbackRate: 0, taskCompletionRate: 0, abandonmentRate: 0, earlyAbandonmentRate: 0,
  avgCsat: null, avgNps: null, avgFrt: null, avgAqt: null, avgAsa: null, avgAht: null,
  campaignsSent: 0, campaignsDelivered: 0, campaignsRead: 0, campaignsReplied: 0,
  servicesStarted: 0, servicesCompleted: 0, estimatedRoiSaved: 0,
};

function avg(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export function computeKpis(params: ComputeKpisParams): AnalyticsKpiData {
  const {
    conversations,
    rules = [],
    agentCostPerHour = 10,
    humanAhtBaselineSeconds = 600,
    campaigns,
    services,
  } = params;

  const total = conversations.length;
  if (total === 0) {
    return {
      ...EMPTY,
      campaignsSent: campaigns?.sent ?? 0,
      campaignsDelivered: campaigns?.delivered ?? 0,
      campaignsRead: campaigns?.read ?? 0,
      campaignsReplied: campaigns?.replied ?? 0,
      servicesStarted: services?.started ?? 0,
      servicesCompleted: services?.completed ?? 0,
      taskCompletionRate: services && services.started > 0 ? (services.completed / services.started) * 100 : 0,
    };
  }

  // Recalcular outcomes al vuelo si hay reglas dinámicas; si no, confiar en BD.
  const rows = conversations.map((c) => {
    if (rules.length > 0) {
      const computed = determineConversationOutcome(c as unknown as ConversationLike, rules);
      if (computed) return { ...c, outcome: computed.outcome, resolvedBy: computed.resolvedBy };
    }
    return c;
  });

  const uniqueUsers = new Set(
    rows.map((c) => c.customerId || c.customerIdentifierHash).filter(Boolean)
  ).size;

  const closedCount = rows.filter((c) => ["closed", "abandoned", "transferred"].includes(c.status)).length || 1;

  let botResolvedCount = 0;
  let botOnlyCount = 0;
  let escalationCount = 0;
  let abandonmentCount = 0;
  let earlyAbandonCount = 0;
  let totalUserMsgs = 0;
  let totalFallbacks = 0;

  const csatScores: number[] = [];
  const npsScores: number[] = [];
  const frts: number[] = [];
  const ahts: number[] = [];
  const waits: number[] = [];

  for (const c of rows) {
    if (c.outcome === "resolved" && c.resolvedBy === "bot") botResolvedCount++;
    if (c.wasBotOnly) botOnlyCount++;
    if (c.wasHandoff || c.outcome === "transferred") escalationCount++;
    if (c.outcome === "abandoned") {
      abandonmentCount++;
      if ((c.totalUserMessages || 0) <= 2) earlyAbandonCount++;
    }

    totalUserMsgs += c.totalUserMessages || 0;
    totalFallbacks += c.totalFallbacks || 0;

    if (typeof c.csatScore === "number") csatScores.push(c.csatScore);
    if (typeof c.npsScore === "number") npsScores.push(c.npsScore);
    if (typeof c.firstResponseTimeSeconds === "number") frts.push(c.firstResponseTimeSeconds);
    if (typeof c.handleTimeSeconds === "number") ahts.push(c.handleTimeSeconds);
    if (typeof c.waitingTimeSeconds === "number") waits.push(c.waitingTimeSeconds);
  }

  // NPS = %promotores (9-10) - %detractores (0-6), sobre escala 0-10.
  let avgNps: number | null = null;
  if (npsScores.length) {
    const promoters = npsScores.filter((n) => n >= 9).length;
    const detractors = npsScores.filter((n) => n <= 6).length;
    avgNps = ((promoters - detractors) / npsScores.length) * 100;
  }

  const servicesStarted = services?.started ?? 0;
  const servicesCompleted = services?.completed ?? 0;

  const humanAhtHours = humanAhtBaselineSeconds / 3600;
  const estimatedRoiSaved = botResolvedCount * humanAhtHours * agentCostPerHour;

  const avgAqt = avg(waits);

  return {
    totalConversations: total,
    uniqueUsers,
    realContainmentRate: (botResolvedCount / closedCount) * 100,
    botOnlyRate: (botOnlyCount / total) * 100,
    botResolutionRate: (botResolvedCount / total) * 100,
    escalationRate: (escalationCount / total) * 100,
    fallbackRate: totalUserMsgs > 0 ? (totalFallbacks / totalUserMsgs) * 100 : 0,
    taskCompletionRate: servicesStarted > 0 ? (servicesCompleted / servicesStarted) * 100 : 0,
    abandonmentRate: (abandonmentCount / total) * 100,
    earlyAbandonmentRate: (earlyAbandonCount / total) * 100,
    avgCsat: avg(csatScores),
    avgNps,
    avgFrt: avg(frts),
    avgAqt,
    avgAsa: avgAqt, // proxy: speed of answer ≈ tiempo en cola
    avgAht: avg(ahts),
    campaignsSent: campaigns?.sent ?? 0,
    campaignsDelivered: campaigns?.delivered ?? 0,
    campaignsRead: campaigns?.read ?? 0,
    campaignsReplied: campaigns?.replied ?? 0,
    servicesStarted,
    servicesCompleted,
    estimatedRoiSaved,
  };
}
