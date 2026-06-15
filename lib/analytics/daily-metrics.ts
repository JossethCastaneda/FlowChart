// ============================================================================
// Agregados diarios (spec §33 / goal §13). Núcleo PURO y testeable.
//
// Idea: tanto el camino EN VIVO como el AGREGADO derivan los KPIs desde el mismo
// conjunto de "acumuladores" (sumas/contadores aditivos). Así, leer agregados
// históricos + sumar el día en vivo produce EXACTAMENTE el mismo resultado que
// recomputar todo en vivo — garantizando que el fallback no cambie números.
//
// Los acumuladores se persisten en AnalyticsDailyMetric (una fila por
// metricKey `acc_*` por grupo workspace/project/provider/bot/channel/fecha) y se
// vuelven a sumar al leer. Nada aquí toca red/BD.
// ============================================================================

/** Conversación mínima que necesitan los acumuladores. */
export interface DailyConv {
  status: string;
  outcome?: string | null;
  resolvedBy?: string | null;
  wasBotOnly?: boolean | null;
  wasHandoff?: boolean | null;
  totalUserMessages?: number | null;
  totalBotMessages?: number | null;
  totalFallbacks?: number | null;
  csatScore?: number | null;
  firstResponseTimeSeconds?: number | null;
  handleTimeSeconds?: number | null;
  waitingTimeSeconds?: number | null;
  channel?: string | null;
  conversationStartedAt: Date | string;
}

/** Acumuladores aditivos (todo es suma/conteo → combinables entre días). */
export interface Accumulators {
  total: number;
  active: number;
  closed: number;
  abandoned: number;
  transferred: number;
  closedSet: number; // closed+abandoned+transferred (denominador de contención)
  botResolved: number;
  handoffs: number;
  botOnly: number;
  earlyAbandon: number;
  userMsgs: number;
  fallbacks: number;
  botMsgs: number;
  csatSum: number;
  csatN: number;
  frtSum: number;
  frtN: number;
  ahtSum: number;
  ahtN: number;
  waitSum: number;
  waitN: number;
  slaMet: number;
  slaBreached: number;
}

export const SLA_FRT_SECONDS = 120;
export const ROI_AGENT_COST_PER_HOUR = 10;

/** Claves de métrica persistidas (prefijo acc_) — una por campo de Accumulators. */
export const ACCUMULATOR_KEYS: (keyof Accumulators)[] = [
  "total", "active", "closed", "abandoned", "transferred", "closedSet",
  "botResolved", "handoffs", "botOnly", "earlyAbandon",
  "userMsgs", "fallbacks", "botMsgs",
  "csatSum", "csatN", "frtSum", "frtN", "ahtSum", "ahtN", "waitSum", "waitN",
  "slaMet", "slaBreached",
];

export function emptyAccumulators(): Accumulators {
  return {
    total: 0, active: 0, closed: 0, abandoned: 0, transferred: 0, closedSet: 0,
    botResolved: 0, handoffs: 0, botOnly: 0, earlyAbandon: 0,
    userMsgs: 0, fallbacks: 0, botMsgs: 0,
    csatSum: 0, csatN: 0, frtSum: 0, frtN: 0, ahtSum: 0, ahtN: 0, waitSum: 0, waitN: 0,
    slaMet: 0, slaBreached: 0,
  };
}

export function addAccumulators(a: Accumulators, b: Accumulators): Accumulators {
  const out = emptyAccumulators();
  for (const k of ACCUMULATOR_KEYS) out[k] = a[k] + b[k];
  return out;
}

export function sumAccumulators(list: Accumulators[]): Accumulators {
  return list.reduce(addAccumulators, emptyAccumulators());
}

/** Computa acumuladores a partir de conversaciones (camino EN VIVO). */
export function accumulatorsFromConversations(convs: DailyConv[]): Accumulators {
  const acc = emptyAccumulators();
  for (const c of convs) {
    acc.total += 1;
    if (c.status === "active") acc.active += 1;
    if (c.status === "closed") acc.closed += 1;
    if (c.status === "abandoned") acc.abandoned += 1;
    if (c.status === "transferred") acc.transferred += 1;
    if (["closed", "abandoned", "transferred"].includes(c.status)) acc.closedSet += 1;
    if (c.outcome === "resolved" && c.resolvedBy === "bot") acc.botResolved += 1;
    if (c.wasHandoff) acc.handoffs += 1;
    if (c.wasBotOnly) acc.botOnly += 1;
    if (c.outcome === "abandoned" && (c.totalUserMessages || 0) <= 2) acc.earlyAbandon += 1;
    acc.userMsgs += c.totalUserMessages || 0;
    acc.fallbacks += c.totalFallbacks || 0;
    acc.botMsgs += c.totalBotMessages || 0;
    if (typeof c.csatScore === "number") { acc.csatSum += c.csatScore; acc.csatN += 1; }
    if (typeof c.firstResponseTimeSeconds === "number") {
      acc.frtSum += c.firstResponseTimeSeconds; acc.frtN += 1;
      if (c.firstResponseTimeSeconds <= SLA_FRT_SECONDS) acc.slaMet += 1; else acc.slaBreached += 1;
    }
    if (typeof c.handleTimeSeconds === "number") { acc.ahtSum += c.handleTimeSeconds; acc.ahtN += 1; }
    if (typeof c.waitingTimeSeconds === "number") { acc.waitSum += c.waitingTimeSeconds; acc.waitN += 1; }
  }
  return acc;
}

/** Convierte acumuladores en filas {metricKey, metricValue} para persistir. */
export function accumulatorsToMetricRows(acc: Accumulators): { metricKey: string; metricValue: number }[] {
  return ACCUMULATOR_KEYS.map((k) => ({ metricKey: `acc_${k}`, metricValue: acc[k] }));
}

/** Reconstruye acumuladores desde filas persistidas (suma metricValue por clave). */
export function accumulatorsFromMetricRows(rows: { metricKey: string; metricValue: number }[]): Accumulators {
  const acc = emptyAccumulators();
  for (const r of rows) {
    if (!r.metricKey.startsWith("acc_")) continue;
    const key = r.metricKey.slice(4) as keyof Accumulators;
    if (key in acc) acc[key] += r.metricValue;
  }
  return acc;
}

function safeAvg(sum: number, n: number): number | null {
  return n > 0 ? sum / n : null;
}

// --- Derivaciones (idénticas a la matemática de las rutas en vivo) -----------

export interface OverviewKpis {
  totalConversations: number;
  containmentRate: number;
  handoffRate: number;
  avgCsat: number | null;
  avgFrtSeconds: number;
  avgAhtSeconds: number;
  estimatedRoiSaved: number;
}

/** Mirror de `summarize()` en app/api/analytics/overview/route.ts. */
export function overviewKpisFromAccumulators(acc: Accumulators): OverviewKpis {
  const closedCount = acc.closedSet || 1;
  const containmentRate = (acc.botResolved / closedCount) * 100;
  const handoffRate = (acc.handoffs / (acc.total || 1)) * 100;
  const avgCsat = safeAvg(acc.csatSum, acc.csatN);
  const avgFrt = acc.frtN ? acc.frtSum / acc.frtN : 0;
  const avgAht = acc.ahtN ? acc.ahtSum / acc.ahtN : 0;
  const estimatedRoiSaved = acc.botResolved * ((avgAht || 600) / 3600) * ROI_AGENT_COST_PER_HOUR;
  return {
    totalConversations: acc.total,
    containmentRate,
    handoffRate,
    avgCsat,
    avgFrtSeconds: avgFrt,
    avgAhtSeconds: avgAht,
    estimatedRoiSaved,
  };
}

export interface OperationsSummary {
  active: number;
  closed: number;
  abandoned: number;
  transferred: number;
  slaMet: number;
  slaBreached: number;
  avgFrtSeconds: number | null;
  avgAhtSeconds: number | null;
  avgAsaSeconds: number | null;
}

/** Mirror del summary de operations (aggregateOperations + computeKpis avgs). */
export function operationsSummaryFromAccumulators(acc: Accumulators): OperationsSummary {
  return {
    active: acc.active,
    closed: acc.closed,
    abandoned: acc.abandoned,
    transferred: acc.transferred,
    slaMet: acc.slaMet,
    slaBreached: acc.slaBreached,
    avgFrtSeconds: safeAvg(acc.frtSum, acc.frtN),
    avgAhtSeconds: safeAvg(acc.ahtSum, acc.ahtN),
    avgAsaSeconds: safeAvg(acc.waitSum, acc.waitN),
  };
}

export interface RoiParamsInput {
  agentCostPerHour: number;
  humanAhtSeconds: number;
  monthlyBotCost: number;
  incrementalRevenue: number;
  costPerMessage: number;
}

export interface RoiResult {
  botResolved: number;
  hoursSaved: number;
  costAvoided: number;
  totalBotCost: number;
  incrementalRevenue: number;
  roiPercent: number | null;
  costPerConversation: number;
  costPerAutomatedResolution: number;
}

/** Mirror de la matemática de app/api/analytics/roi/route.ts. */
export function roiFromAccumulators(acc: Accumulators, p: RoiParamsInput): RoiResult {
  const botResolved = acc.botResolved;
  const hoursSaved = (botResolved * p.humanAhtSeconds) / 3600;
  const costAvoided = hoursSaved * p.agentCostPerHour;
  const totalBotCost = p.monthlyBotCost + p.costPerMessage * acc.botMsgs;
  const roi = totalBotCost > 0 ? ((costAvoided + p.incrementalRevenue - totalBotCost) / totalBotCost) * 100 : null;
  return {
    botResolved,
    hoursSaved,
    costAvoided,
    totalBotCost,
    incrementalRevenue: p.incrementalRevenue,
    roiPercent: roi,
    costPerConversation: acc.total > 0 ? totalBotCost / acc.total : 0,
    costPerAutomatedResolution: botResolved > 0 ? totalBotCost / botResolved : 0,
  };
}
