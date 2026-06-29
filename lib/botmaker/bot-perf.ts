/**
 * Libro mayor de desempeño POR BOT (telco / portabilidad).
 * ============================================================================
 * El insight central del rediseño: NO promediar una población de bots
 * radicalmente heterogénea en un solo número de workspace. Un bot con 84% de
 * fallback (roto) y otro con 0% (limpio) deben verse por separado.
 *
 * Este módulo ENCIENDE `computeBotFlows` (flow-map.ts) — el algoritmo de grafo de
 * flujo por bot ya construido pero sin cablear — y lo combina con KPIs por bot
 * (ventas, fallback, agente, captura) + cobertura de atribución + exclusión de
 * bots de prueba. Puro: función de los arrays de entrada → testeable.
 */
import type { BmSession } from "@/lib/botmaker-api";
import { computeBotFlows, type BotFlow, type FlowDiff } from "@/lib/botmaker/flow-map";
import { saleByPhrase, capturedFieldsPerSession } from "@/lib/botmaker/fields";
import { classifyTypification } from "@/lib/botmaker/outcomes";

export const UNATTRIBUTED = "__none__";

export type BotHealth = "ok" | "warn" | "broken";

export interface BotPerf {
  botId: string;
  botName: string;
  isUnnamed: boolean;       // botId sin nombre en /intents (se muestra ID corto)
  isUnattributed: boolean;  // bucket "__none__" (sesiones sin bot-change)
  isTest: boolean;          // bot de prueba / QA
  sessions: number;
  sales: number;
  conversionRate: number;   // ventas / sesiones (%)
  fallbackRate: number;     // % sesiones que tocaron "Mensaje por defecto"
  agentRate: number;        // % sesiones que pasaron por un agente
  captureCompleteRate: number; // % sesiones donde el bot pidió hasta "nombre"
  health: BotHealth;
  sufficient: boolean;      // muestra suficiente para confiar (n >= 20)
  ends: BotFlow["ends"];    // distribución de estados terminales (flow-map)
  reach: BotFlow["reach"];  // embudo de alcance (hasta qué paso llegan)
  mainPath: string[];       // ruta dominante inicio → fin
  delta?: { sessions: number; conversionRate: number };
}

export interface CoverageInfo {
  total: number;
  attributed: number;
  coveragePct: number;
  unattributed: number;        // sesiones en "__none__"
  unnamedBots: number;         // botIds de alto volumen sin nombre (excl. "__none__")
  testBotsExcluded: number;    // # de bots de prueba detectados
  testSessionsExcluded: number;// sesiones de bots de prueba (excluidas del agregado)
  paidTrafficAvailable: boolean; // brecha conocida: 0 señal ctwa_clid/referral
}

export interface BotPerfOptions {
  botNames: Record<string, string>;
  /** Punto medio para detectar cambios de diseño del bot (split antes/después). */
  splitAtMs?: number | null;
  /** Umbral de sesiones para marcar `sufficient`. Default 20. */
  sufficientThreshold?: number;
}

export interface BotPerfResult {
  bots: BotPerf[];
  coverage: CoverageInfo;
  flowChanges: FlowDiff[];
  /** botIds clasificados como prueba (para que el agregado los excluya). */
  testBotIds: string[];
}

const toMs = (v: unknown): number => {
  if (v == null) return 0;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  const t = Date.parse(v as string);
  return Number.isNaN(t) ? 0 : t;
};

const FALLBACK_NAMES = new Set(["mensaje por defecto", "mensaje por default", "default message"]);

/**
 * botId que atiende la sesión = último `bot-change.currentBotId` (tras el dispatch
 * del MASTER). Sin bot-change ⇒ "__none__" (sesión no atribuible). Espeja la
 * resolución de flow-map.ts para que KPIs y grafo cuadren por bot.
 */
export function resolveBotId(s: BmSession): string {
  let botId = UNATTRIBUTED;
  for (const e of s.events || []) {
    if ((e.name || "").toLowerCase() === "bot-change") {
      const cur = (e.info as { currentBotId?: unknown })?.currentBotId;
      if (cur) botId = String(cur);
    }
  }
  return botId;
}

/** Nombre de cierre/tipificación de la sesión (último conversation-close). */
function sessionTypification(s: BmSession): string | null {
  let typ: string | null = null;
  for (const e of s.events || []) {
    if ((e.name || "").toLowerCase() === "conversation-close") {
      const t = (e.info as { typification?: unknown })?.typification;
      if (typeof t === "string" && t) typ = t;
    }
  }
  return typ;
}

function sessionEverAgent(s: BmSession): boolean {
  if ((s.messages || []).some((m) => m.from === "agent")) return true;
  return (s.events || []).some((e) => {
    const nm = (e.name || "").toLowerCase();
    return nm.includes("assign") && nm.includes("agent");
  });
}

function sessionEverFallback(s: BmSession): boolean {
  return (s.events || []).some((e) => {
    const info = (e.info || {}) as Record<string, unknown>;
    const node = typeof info.name === "string" ? info.name.toLowerCase() : "";
    const exec = typeof info.executingIntents === "string" ? info.executingIntents.toLowerCase() : "";
    return FALLBACK_NAMES.has(node) || FALLBACK_NAMES.has(exec);
  });
}

/** ¿Es un bot de prueba/QA? Se evalúa sobre el NOMBRE (no el id hex). */
export function isTestBot(name: string): boolean {
  return /\bprueba\b|\btest\b|\bqa\b|\bdemo\b|biometric|menu de prueba|^prueba/i.test((name || "").trim());
}

/** Resuelve identidad legible: nombre de /intents → ID corto si no hay nombre. */
export function resolveBotIdentity(
  botId: string,
  botNames: Record<string, string>
): { name: string; isUnnamed: boolean; isUnattributed: boolean } {
  if (botId === UNATTRIBUTED) {
    return { name: "(sin bot identificado)", isUnnamed: false, isUnattributed: true };
  }
  const named = botNames[botId];
  if (named && named.trim()) return { name: named.trim(), isUnnamed: false, isUnattributed: false };
  // Sin nombre en /intents: muestra un id corto reconocible.
  return { name: botId.slice(0, 8), isUnnamed: true, isUnattributed: false };
}

function health(fallbackRate: number, agentRate: number): BotHealth {
  if (fallbackRate >= 50 || agentRate >= 50) return "broken";
  if (fallbackRate >= 25 || agentRate >= 25) return "warn";
  return "ok";
}

interface Acc {
  sessions: BmSession[];
  sales: number;
  agent: number;
  fallback: number;
  captureComplete: number;
}

/**
 * Computa el desempeño por bot + cobertura de atribución + cambios de diseño.
 * `computeBotFlows` (minSessions:1) aporta ends/reach/mainPath/diffs por bot; aquí
 * añadimos los KPIs de calidad y la capa de identidad/prueba/cobertura.
 */
export function computeBotPerformance(sessions: BmSession[], opts: BotPerfOptions): BotPerfResult {
  const sufficientN = opts.sufficientThreshold ?? 20;
  const total = sessions.length;

  // Grafo de flujo por bot (enciende flow-map.ts) — misma resolución de botId.
  const { flows, diffs } = computeBotFlows(sessions, {
    botNames: opts.botNames,
    minSessions: 1,
    splitAtMs: opts.splitAtMs ?? null,
  });
  const flowById = new Map<string, BotFlow>();
  for (const f of flows) flowById.set(f.botId, f);

  // KPIs por bot en una pasada.
  const accById = new Map<string, Acc>();
  for (const s of sessions) {
    const botId = resolveBotId(s);
    let a = accById.get(botId);
    if (!a) { a = { sessions: [], sales: 0, agent: 0, fallback: 0, captureComplete: 0 }; accById.set(botId, a); }
    a.sessions.push(s);
    const typ = sessionTypification(s);
    if (saleByPhrase(s) || classifyTypification(typ) === "venta") a.sales++;
    if (sessionEverAgent(s)) a.agent++;
    if (sessionEverFallback(s)) a.fallback++;
  }
  // Captura completa (llegó a "nombre") por grupo.
  for (const [, a] of accById) {
    const caps = capturedFieldsPerSession(a.sessions);
    a.captureComplete = caps.filter((set) => set.has("nombre")).length;
  }

  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);

  const bots: BotPerf[] = [];
  let attributed = 0;
  let unnamedBots = 0;
  let testBotsExcluded = 0;
  let testSessionsExcluded = 0;
  const testBotIds: string[] = [];

  for (const [botId, a] of accById) {
    const id = resolveBotIdentity(botId, opts.botNames);
    const isTest = !id.isUnattributed && isTestBot(id.name);
    const n = a.sessions.length;
    const fallbackRate = pct(a.fallback, n);
    const agentRate = pct(a.agent, n);
    const flow = flowById.get(botId);

    if (!id.isUnattributed) attributed += n;
    if (id.isUnnamed) unnamedBots++;
    if (isTest) { testBotsExcluded++; testSessionsExcluded += n; testBotIds.push(botId); }

    bots.push({
      botId,
      botName: id.name,
      isUnnamed: id.isUnnamed,
      isUnattributed: id.isUnattributed,
      isTest,
      sessions: n,
      sales: a.sales,
      conversionRate: pct(a.sales, n),
      fallbackRate,
      agentRate,
      captureCompleteRate: pct(a.captureComplete, n),
      health: health(fallbackRate, agentRate),
      sufficient: n >= sufficientN,
      ends: flow?.ends ?? [],
      reach: flow?.reach ?? [],
      mainPath: flow?.mainPath ?? [],
    });
  }

  bots.sort((x, y) => y.sessions - x.sessions);

  const coverage: CoverageInfo = {
    total,
    attributed,
    coveragePct: pct(attributed, total),
    unattributed: total - attributed,
    unnamedBots,
    testBotsExcluded,
    testSessionsExcluded,
    paidTrafficAvailable: false,
  };

  return { bots, coverage, flowChanges: diffs, testBotIds };
}
