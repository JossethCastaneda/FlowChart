import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";

/**
 * BotMaker API v2.0 — https://api.botmaker.com/v2.0/
 * Auth: `access-token` header. Source: BotMaker API research (account Swagger
 * is the source of truth for the full surface).
 */
const BASE = "https://api.botmaker.com/v2.0";

/**
 * Resolve the BotMaker access-token for a workspace.
 *
 * Priority:
 *   1. Encrypted Integration (provider "botmaker") for the workspace.
 *   2. env BOTMAKER_ACCESS_TOKEN — **development only**.
 *
 * In production the global env token is NOT used because it is shared
 * across all tenants, which would allow any authenticated user to read
 * conversations from other workspaces (cross-tenant data leak).
 */
export async function getBotmakerToken(workspaceId: string): Promise<string | null> {
  try {
    const integ = await prisma.integration.findUnique({
      where: { workspaceId_provider: { workspaceId, provider: "botmaker" } },
    });
    const creds = integ?.credentials as Record<string, unknown> | null;
    if (integ?.connected && creds?.accessToken) {
      return decryptToken(creds.accessToken as string);
    }
  } catch { /* ignore — fall through */ }

  // Only fall back to the global env token in development.
  // In production, each workspace must have its own Integration record.
  if (process.env.NODE_ENV !== "production") {
    return process.env.BOTMAKER_ACCESS_TOKEN || null;
  }

  return null;
}


/** Fetch a BotMaker path with the access-token header + basic 429 backoff. */
export async function botmakerFetch(
  path: string,
  token: string,
  init: RequestInit = {},
  retries = 2
): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "access-token": token,
      ...(init.headers || {}),
    },
  });
  if (res.status === 429 && retries > 0) {
    await new Promise((r) => setTimeout(r, (3 - retries) * 1200)); // exponential-ish backoff
    return botmakerFetch(path, token, init, retries - 1);
  }
  return res;
}

// ── Session metrics ─────────────────────────────────────────────────────────
// Shapes match the account Swagger (GET /sessions → SessionsPage.items →
// SessionResponse, with include-messages + include-events).

export interface BmMessage {
  from?: "bot" | "user" | "agent"; // who sent the message
  creationTime?: string | number;
  content?: { type?: string; text?: string };
}
export interface BmSession {
  id?: string;
  creationTime?: string | number;
  chat?: { chat?: { contactId?: string; channelId?: string }; lastUserMessageDatetime?: string };
  messages?: BmMessage[];
  events?: { name?: string; creationTime?: string | number; info?: { typification?: string } }[];
}

/**
 * GET /sessions, paginated (follows `nextPage`). Includes messages + events so
 * we can compute response times and typifications. Capped to avoid BI-cost/
 * timeout blowups (each page = up to 500 sessions; 5 req/s).
 */
export async function listSessions(
  token: string,
  fromISO: string,
  toISO: string,
  maxPages = 6
): Promise<BmSession[]> {
  const all: BmSession[] = [];
  let next: string | null =
    `/sessions?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}&include-messages=true&include-events=true`;
  let pages = 0;
  while (next && pages < maxPages) {
    // Always route through botmakerFetch for consistent retry/headers.
    // If BotMaker returns a full URL as nextPage, extract the path.
    const path = next.startsWith("http") ? new URL(next).pathname + new URL(next).search : next;
    const res = await botmakerFetch(path, token);
    if (!res.ok) break;
    const data = await res.json();
    if (Array.isArray(data.items)) all.push(...data.items);
    next = data.nextPage || null;
    pages++;
  }
  return all;
}

export interface ResultsMetrics {
  sessionsStarted: number;
  uniqueSessions: number;
  messagesByUser: number;
  messagesByBot: number;
  messagesByAgent: number;
  avgResponseTimeSec: number;       // bot/agent avg reply time
  avgUserResponseTimeSec: number;   // user avg reply time
  avgBotResponseTimeSec: number;
  avgSessionDurationSec: number;    // session start → close
  topTypifications: { label: string; count: number }[];
  hourlyUniqueSessions: number[];   // 24 buckets
  topUserQuestions: { text: string; count: number }[];
}

const toMs = (v: any): number | null => {
  if (v == null) return null;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  const t = Date.parse(v);
  return isNaN(t) ? null : t;
};

// BotMaker timestamps come in UTC; the user (CDMX) needs hour buckets in their
// timezone. Override with APP_TIMEZONE if needed.
const APP_TZ = process.env.APP_TIMEZONE || "America/Mexico_City";
const hourFmt = new Intl.DateTimeFormat("en-US", { timeZone: APP_TZ, hour: "numeric", hour12: false, hourCycle: "h23" });
/** Hour-of-day (0–23) of a UTC timestamp, in the app timezone (CDMX). */
function hourInTz(ms: number): number {
  const h = parseInt(hourFmt.format(new Date(ms)), 10);
  return Number.isNaN(h) ? 0 : h % 24;
}

/** Pure metric computation from /sessions items (optionally filtered by channel). */
export function computeResultsMetrics(sessions: BmSession[], channelId?: string): ResultsMetrics {
  const m: ResultsMetrics = {
    sessionsStarted: 0, uniqueSessions: 0,
    messagesByUser: 0, messagesByBot: 0, messagesByAgent: 0,
    avgResponseTimeSec: 0, avgUserResponseTimeSec: 0, avgBotResponseTimeSec: 0,
    avgSessionDurationSec: 0,
    topTypifications: [], hourlyUniqueSessions: new Array(24).fill(0),
    topUserQuestions: [],
  };
  const list = (Array.isArray(sessions) ? sessions : []).filter(
    (s) => !channelId || s.chat?.chat?.channelId === channelId
  );
  if (list.length === 0) return m;

  const contacts = new Set<string>();
  const typ: Record<string, number> = {};
  const questions: Record<string, number> = {};
  let durationSum = 0, durationCount = 0;
  let botReplySum = 0, botReplyCount = 0;
  let userReplySum = 0, userReplyCount = 0;

  for (const s of list) {
    m.sessionsStarted++;
    const contact = s.chat?.chat?.contactId;
    if (contact) contacts.add(contact);

    const start = toMs(s.creationTime);
    // Session close + typification come from the conversation-close event.
    const closeEv = (s.events || []).find((e) => e.name === "conversation-close");
    const lastMsg = s.messages?.[s.messages.length - 1];
    const close = toMs(closeEv?.creationTime) ?? toMs(lastMsg?.creationTime);
    if (start != null && close != null && close >= start) { durationSum += close - start; durationCount++; }
    if (start != null) m.hourlyUniqueSessions[hourInTz(start)]++;

    const typif = closeEv?.info?.typification;
    if (typif) typ[typif] = (typ[typif] || 0) + 1;

    const msgs = (s.messages || []).slice().sort((a, b) => (toMs(a.creationTime) || 0) - (toMs(b.creationTime) || 0));
    let lastUserAt: number | null = null, lastReplyAt: number | null = null;
    let firstUserText: string | null = null;
    for (const msg of msgs) {
      const at = toMs(msg.creationTime);
      if (msg.from === "user") {
        m.messagesByUser++;
        if (!firstUserText && msg.content?.text) firstUserText = msg.content.text.trim();
        if (lastReplyAt != null && at != null && at >= lastReplyAt) { userReplySum += at - lastReplyAt; userReplyCount++; }
        lastUserAt = at;
      } else {
        if (msg.from === "agent") m.messagesByAgent++; else m.messagesByBot++;
        if (lastUserAt != null && at != null && at >= lastUserAt) { botReplySum += at - lastUserAt; botReplyCount++; }
        lastReplyAt = at;
      }
    }
    if (firstUserText) {
      const key = firstUserText.toLowerCase().slice(0, 80);
      questions[key] = (questions[key] || 0) + 1;
    }
  }

  m.uniqueSessions = contacts.size || m.sessionsStarted;
  m.avgSessionDurationSec = durationCount ? Math.round(durationSum / durationCount / 1000) : 0;
  m.avgBotResponseTimeSec = botReplyCount ? Math.round(botReplySum / botReplyCount / 1000) : 0;
  m.avgResponseTimeSec = m.avgBotResponseTimeSec;
  m.avgUserResponseTimeSec = userReplyCount ? Math.round(userReplySum / userReplyCount / 1000) : 0;
  m.topTypifications = Object.entries(typ).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  m.topUserQuestions = Object.entries(questions).map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  return m;
}

export const EMPTY_RESULTS_METRICS: ResultsMetrics = computeResultsMetrics([]);

// ── Per-channel breakdown ────────────────────────────────────────────────────
// The product surfaces 4 conversational channels. BotMaker exposes a free-form
// `platform` per channel; we normalize it to one of these canonical buckets.
export const CANONICAL_CHANNELS = ["whatsapp", "messenger", "instagram", "facebook"] as const;
export type CanonicalChannel = (typeof CANONICAL_CHANNELS)[number];

/** Normalize a BotMaker channel `platform` string into one of the 4 product channels. */
export function canonicalPlatform(raw?: string | null): CanonicalChannel | null {
  const p = (raw || "").toLowerCase();
  if (!p) return null;
  if (p.includes("whats") || p === "wa") return "whatsapp";
  if (p.includes("insta") || p === "ig") return "instagram";
  if (p.includes("messenger") || p.includes("messen")) return "messenger";
  if (p.includes("facebook") || p === "fb") return "facebook";
  return null;
}

export interface ChannelBreakdown {
  all: ResultsMetrics;
  byChannel: Record<CanonicalChannel, ResultsMetrics>;
  counts: Record<CanonicalChannel | "all", number>;
}

/**
 * Group sessions into the 4 product channels using a channelId→platform map,
 * then compute metrics for each group plus the aggregate ("all"). Single pass
 * of grouping; metrics are O(sessions) per bucket (≤ a few thousand sessions).
 */
export function computeMetricsByChannel(
  sessions: BmSession[],
  channelPlatform: Map<string, string>
): ChannelBreakdown {
  const list = Array.isArray(sessions) ? sessions : [];
  const groups: Record<CanonicalChannel, BmSession[]> = {
    whatsapp: [], messenger: [], instagram: [], facebook: [],
  };
  for (const s of list) {
    const channelId = s.chat?.chat?.channelId;
    const canon = canonicalPlatform(channelId ? channelPlatform.get(channelId) : null);
    if (canon) groups[canon].push(s);
  }
  return {
    all: computeResultsMetrics(list),
    byChannel: {
      whatsapp: computeResultsMetrics(groups.whatsapp),
      messenger: computeResultsMetrics(groups.messenger),
      instagram: computeResultsMetrics(groups.instagram),
      facebook: computeResultsMetrics(groups.facebook),
    },
    counts: {
      all: list.length,
      whatsapp: groups.whatsapp.length,
      messenger: groups.messenger.length,
      instagram: groups.instagram.length,
      facebook: groups.facebook.length,
    },
  };
}

/** Empty breakdown for the no-token / disconnected case. */
export const EMPTY_CHANNEL_BREAKDOWN: ChannelBreakdown = computeMetricsByChannel([], new Map());

// ── Lead Quality Scoring ─────────────────────────────────────────────────────
// Measures how valuable / engaged the incoming leads are based purely on
// conversational signal extracted from BotMaker sessions.

export type QualityLevel = "excellent" | "good" | "fair" | "poor";

export interface LeadQualitySubMetric {
  key: string;
  label: string;
  score: number;   // earned points
  max: number;     // max possible
  raw: number;     // raw value (%, count, seconds)
  unit: string;    // "%", "msgs", "s"
  tip: string;     // actionable insight
}

export interface LeadQualityMetrics {
  score: number;            // 0-100
  level: QualityLevel;
  subMetrics: LeadQualitySubMetric[];
  summary: string;          // executive summary
  recommendation: string;   // actionable next step
}

function qualityLevel(score: number): QualityLevel {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

/** Compute Lead Quality from raw sessions. Single pass. */
export function computeLeadQuality(sessions: BmSession[]): LeadQualityMetrics {
  const list = Array.isArray(sessions) ? sessions : [];
  if (list.length === 0) return emptyLeadQuality();

  let totalUserMsgs = 0;
  let totalUserResponseTime = 0;
  let userResponseCount = 0;
  let closedWithTyp = 0;
  let multiTurnSessions = 0;
  let clearIntentSessions = 0;

  for (const s of list) {
    const msgs = (s.messages || []).slice().sort(
      (a, b) => (toMs(a.creationTime) || 0) - (toMs(b.creationTime) || 0)
    );

    // Count user messages
    let userMsgsInSession = 0;
    let turns = 0;
    let lastFrom: string | null = null;
    let lastReplyAt: number | null = null;
    let firstUserText: string | null = null;

    for (const msg of msgs) {
      const at = toMs(msg.creationTime);
      if (msg.from === "user") {
        userMsgsInSession++;
        if (!firstUserText && msg.content?.text) firstUserText = msg.content.text.trim();
        // User response time (time between bot/agent reply and user's next msg)
        if (lastReplyAt != null && at != null && at >= lastReplyAt) {
          totalUserResponseTime += at - lastReplyAt;
          userResponseCount++;
        }
      } else {
        lastReplyAt = toMs(msg.creationTime);
      }
      // Count turns (alternations)
      if (msg.from && msg.from !== lastFrom) {
        turns++;
        lastFrom = msg.from;
      }
    }

    totalUserMsgs += userMsgsInSession;

    // Conversation completeness: has conversation-close with typification
    const closeEv = (s.events || []).find((e) => e.name === "conversation-close");
    if (closeEv?.info?.typification) closedWithTyp++;

    // Multi-turn depth: ≥4 turns means real dialogue (user→bot→user→bot)
    if (turns >= 4) multiTurnSessions++;

    // Intent clarity: first user message has ≥3 words (not just "hola")
    if (firstUserText) {
      const wordCount = firstUserText.split(/\s+/).filter(Boolean).length;
      if (wordCount >= 3) clearIntentSessions++;
    }
  }

  const n = list.length;
  const avgUserMsgs = totalUserMsgs / n;
  const avgUserRespSec = userResponseCount > 0
    ? Math.round(totalUserResponseTime / userResponseCount / 1000)
    : 999;
  const completionRate = (closedWithTyp / n) * 100;
  const multiTurnRate = (multiTurnSessions / n) * 100;
  const intentRate = (clearIntentSessions / n) * 100;

  // --- Score each sub-metric ---
  const sub: LeadQualitySubMetric[] = [];

  // 1. Engagement Depth (0-25)
  const engScore = avgUserMsgs >= 5 ? 25 : avgUserMsgs >= 3 ? 18 : avgUserMsgs >= 2 ? 10 : avgUserMsgs >= 1 ? 5 : 0;
  sub.push({
    key: "engagement", label: "Profundidad de Engagement",
    score: engScore, max: 25, raw: Math.round(avgUserMsgs * 10) / 10, unit: "msgs/sesión",
    tip: avgUserMsgs < 2 ? "Los leads abandonan rápido. Revisa el mensaje de bienvenida." : "Buen nivel de interacción.",
  });

  // 2. Response Velocity (0-20)
  const velScore = avgUserRespSec < 30 ? 20 : avgUserRespSec < 60 ? 15 : avgUserRespSec < 120 ? 10 : avgUserRespSec < 300 ? 5 : 0;
  sub.push({
    key: "velocity", label: "Velocidad de Respuesta",
    score: velScore, max: 20, raw: avgUserRespSec, unit: "s",
    tip: avgUserRespSec > 120 ? "Leads tardan en responder — posible baja intención o mensajes confusos del bot." : "Respuesta rápida = alta intención.",
  });

  // 3. Conversation Completeness (0-25)
  const compScore = completionRate >= 80 ? 25 : completionRate >= 60 ? 18 : completionRate >= 40 ? 10 : completionRate >= 20 ? 5 : 0;
  sub.push({
    key: "completeness", label: "Tasa de Cierre",
    score: compScore, max: 25, raw: Math.round(completionRate), unit: "%",
    tip: completionRate < 40 ? "Muchas conversaciones quedan abiertas sin resolución." : "Buen ratio de cierre.",
  });

  // 4. Multi-turn Depth (0-15)
  const mtScore = multiTurnRate >= 70 ? 15 : multiTurnRate >= 50 ? 10 : multiTurnRate >= 30 ? 5 : 0;
  sub.push({
    key: "multiTurn", label: "Diálogo Multi-turno",
    score: mtScore, max: 15, raw: Math.round(multiTurnRate), unit: "%",
    tip: multiTurnRate < 30 ? "Mayoría son interacciones de 1-2 mensajes ('hola' → abandono)." : "Conversaciones con profundidad real.",
  });

  // 5. Intent Clarity (0-15)
  const intScore = intentRate >= 60 ? 15 : intentRate >= 40 ? 10 : intentRate >= 20 ? 5 : 0;
  sub.push({
    key: "intent", label: "Claridad de Intención",
    score: intScore, max: 15, raw: Math.round(intentRate), unit: "%",
    tip: intentRate < 20 ? "Los leads llegan sin intención clara. El copy del anuncio puede no estar filtrando." : "Los leads llegan con preguntas específicas.",
  });

  const totalScore = sub.reduce((s, m) => s + m.score, 0);
  const level = qualityLevel(totalScore);

  const summaries: Record<QualityLevel, string> = {
    excellent: "Leads de alta calidad: interactúan profundamente, responden rápido y cierran conversación.",
    good: "Leads con buena intención. Hay oportunidad de mejorar la profundidad de conversación.",
    fair: "Leads tibios: interacción superficial y baja tasa de cierre. Revisar segmentación.",
    poor: "Leads de baja calidad: abandono temprano y poca interacción. Revisar copy y segmentación de campaña.",
  };
  const recs: Record<QualityLevel, string> = {
    excellent: "Mantén la segmentación actual. Enfócate en escalar el presupuesto.",
    good: "Optimiza el flujo del bot para profundizar conversaciones. Agrega preguntas de calificación.",
    fair: "Revisa la segmentación de Meta Ads y el mensaje de bienvenida del bot. Filtra mejor la audiencia.",
    poor: "Acción urgente: cambia la audiencia del anuncio y simplifica el flujo inicial del bot.",
  };

  return { score: totalScore, level, subMetrics: sub, summary: summaries[level], recommendation: recs[level] };
}

function emptyLeadQuality(): LeadQualityMetrics {
  return {
    score: 0, level: "poor",
    subMetrics: [
      { key: "engagement", label: "Profundidad de Engagement", score: 0, max: 25, raw: 0, unit: "msgs/sesión", tip: "Sin datos" },
      { key: "velocity", label: "Velocidad de Respuesta", score: 0, max: 20, raw: 0, unit: "s", tip: "Sin datos" },
      { key: "completeness", label: "Tasa de Cierre", score: 0, max: 25, raw: 0, unit: "%", tip: "Sin datos" },
      { key: "multiTurn", label: "Diálogo Multi-turno", score: 0, max: 15, raw: 0, unit: "%", tip: "Sin datos" },
      { key: "intent", label: "Claridad de Intención", score: 0, max: 15, raw: 0, unit: "%", tip: "Sin datos" },
    ],
    summary: "Sin datos suficientes para evaluar.",
    recommendation: "Conecta BotMaker para comenzar a medir.",
  };
}

export const EMPTY_LEAD_QUALITY: LeadQualityMetrics = emptyLeadQuality();

// ── Bot Quality Scoring ──────────────────────────────────────────────────────
// Measures how well the bot handles conversations: resolution, speed,
// efficiency, and user satisfaction proxies.

export interface BotQualitySubMetric {
  key: string;
  label: string;
  score: number;
  max: number;
  raw: number;
  unit: string;
  tip: string;
}

export interface BotQualityMetrics {
  score: number;
  level: QualityLevel;
  subMetrics: BotQualitySubMetric[];
  summary: string;
  recommendation: string;
}

/** Compute Bot Quality from raw sessions. Single pass. */
export function computeBotQuality(sessions: BmSession[]): BotQualityMetrics {
  const list = Array.isArray(sessions) ? sessions : [];
  if (list.length === 0) return emptyBotQuality();

  let closedResolved = 0;
  let firstResponseSum = 0;
  let firstResponseCount = 0;
  let sessionsWithAgent = 0;
  let totalBotMsgs = 0;
  let totalUserMsgs = 0;
  let dropOffSessions = 0;   // last msg is from bot (user never replied)
  let reEngageSessions = 0;  // user sent msg after conversation-close

  for (const s of list) {
    const msgs = (s.messages || []).slice().sort(
      (a, b) => (toMs(a.creationTime) || 0) - (toMs(b.creationTime) || 0)
    );
    const events = s.events || [];
    const closeEv = events.find((e) => e.name === "conversation-close");

    // Resolution rate: closed with typification (not "abandon"/"no_response")
    if (closeEv?.info?.typification) {
      const typ = closeEv.info.typification.toLowerCase();
      if (!typ.includes("abandon") && !typ.includes("no_resp")) {
        closedResolved++;
      }
    }

    // First response time: time between first user msg and first bot/agent reply
    let firstUserAt: number | null = null;
    let firstBotAt: number | null = null;
    let hasAgent = false;
    let botMsgs = 0;
    let userMsgs = 0;

    for (const msg of msgs) {
      const at = toMs(msg.creationTime);
      if (msg.from === "user") {
        userMsgs++;
        if (firstUserAt == null && at != null) firstUserAt = at;
      } else {
        if (msg.from === "agent") hasAgent = true;
        botMsgs++;
        if (firstBotAt == null && at != null && firstUserAt != null) firstBotAt = at;
      }
    }

    if (firstUserAt != null && firstBotAt != null && firstBotAt >= firstUserAt) {
      firstResponseSum += firstBotAt - firstUserAt;
      firstResponseCount++;
    }

    if (hasAgent) sessionsWithAgent++;
    totalBotMsgs += botMsgs;
    totalUserMsgs += userMsgs;

    // Drop-off: last message is from bot (user ghosted)
    if (msgs.length > 0 && msgs[msgs.length - 1].from !== "user") {
      dropOffSessions++;
    }

    // Re-engagement: user sent message after close event
    if (closeEv) {
      const closeAt = toMs(closeEv.creationTime);
      if (closeAt != null) {
        const postCloseUserMsg = msgs.find(
          (msg) => msg.from === "user" && (toMs(msg.creationTime) || 0) > closeAt
        );
        if (postCloseUserMsg) reEngageSessions++;
      }
    }
  }

  const n = list.length;
  const resolutionRate = (closedResolved / n) * 100;
  const avgFirstRespSec = firstResponseCount > 0
    ? Math.round(firstResponseSum / firstResponseCount / 1000)
    : 999;
  const escalationRate = (sessionsWithAgent / n) * 100;
  const msgEfficiency = totalUserMsgs > 0 ? totalBotMsgs / totalUserMsgs : 999;
  const dropOffRate = (dropOffSessions / n) * 100;
  const reEngageRate = (reEngageSessions / n) * 100;

  const sub: BotQualitySubMetric[] = [];

  // 1. Resolution Rate (0-25)
  const resScore = resolutionRate >= 85 ? 25 : resolutionRate >= 70 ? 18 : resolutionRate >= 50 ? 10 : resolutionRate >= 30 ? 5 : 0;
  sub.push({
    key: "resolution", label: "Tasa de Resolución",
    score: resScore, max: 25, raw: Math.round(resolutionRate), unit: "%",
    tip: resolutionRate < 50 ? "El bot no resuelve la mayoría de conversaciones. Revisa flujos de FAQ y tipificaciones." : "Buen ratio de resolución autónoma.",
  });

  // 2. First Response Time (0-20)
  const frtScore = avgFirstRespSec <= 3 ? 20 : avgFirstRespSec <= 5 ? 15 : avgFirstRespSec <= 10 ? 10 : avgFirstRespSec <= 30 ? 5 : 0;
  sub.push({
    key: "firstResponse", label: "Primera Respuesta",
    score: frtScore, max: 20, raw: avgFirstRespSec, unit: "s",
    tip: avgFirstRespSec > 5 ? "Fuera del SLA de 3s de Meta. Revisa la latencia del webhook/NLU." : "Dentro del SLA de Meta — excelente.",
  });

  // 3. Escalation Rate (0-15) — lower is better
  const escScore = escalationRate < 10 ? 15 : escalationRate < 20 ? 10 : escalationRate < 40 ? 5 : 0;
  sub.push({
    key: "escalation", label: "Tasa de Escalación",
    score: escScore, max: 15, raw: Math.round(escalationRate), unit: "%",
    tip: escalationRate > 40 ? "Alta dependencia de agentes humanos. Automatiza las FAQ más frecuentes." : "El bot maneja bien sin intervención humana.",
  });

  // 4. Message Efficiency (0-15) — lower ratio is better
  const effRatio = Math.round(msgEfficiency * 10) / 10;
  const effScore = msgEfficiency <= 1.5 ? 15 : msgEfficiency <= 2.0 ? 10 : msgEfficiency <= 3.0 ? 5 : 0;
  sub.push({
    key: "efficiency", label: "Eficiencia de Mensajes",
    score: effScore, max: 15, raw: effRatio, unit: "ratio",
    tip: msgEfficiency > 2.0 ? "El bot envía demasiados mensajes por respuesta del usuario. Simplifica flujos." : "Comunicación concisa y eficiente.",
  });

  // 5. Drop-off Rate (0-15) — lower is better
  const dropScore = dropOffRate < 15 ? 15 : dropOffRate < 30 ? 10 : dropOffRate < 50 ? 5 : 0;
  sub.push({
    key: "dropOff", label: "Tasa de Abandono",
    score: dropScore, max: 15, raw: Math.round(dropOffRate), unit: "%",
    tip: dropOffRate > 30 ? "Muchos usuarios dejan de responder después del bot. El contenido puede no ser relevante." : "Bajo abandono — las respuestas del bot son relevantes.",
  });

  // 6. User Satisfaction Proxy (0-10)
  const satScore = reEngageRate >= 20 ? 10 : reEngageRate >= 10 ? 7 : reEngageRate >= 5 ? 3 : 0;
  sub.push({
    key: "satisfaction", label: "Re-engagement (Satisfacción)",
    score: satScore, max: 10, raw: Math.round(reEngageRate), unit: "%",
    tip: reEngageRate < 5 ? "Pocos usuarios vuelven a escribir. Considera mensajes de seguimiento." : "Los usuarios regresan — buena señal de satisfacción.",
  });

  const totalScore = sub.reduce((s, m) => s + m.score, 0);
  const level = qualityLevel(totalScore);

  const summaries: Record<QualityLevel, string> = {
    excellent: "Bot de alto rendimiento: resuelve rápido, escala poco y mantiene engagement.",
    good: "Buen bot con áreas de mejora. La mayoría de conversaciones se resuelven.",
    fair: "Bot funcional pero con gaps: alta escalación o abandono. Requiere optimización de flujos.",
    poor: "Bot deficiente: alta escalación, lento y alto abandono. Requiere rediseño de flujos.",
  };
  const recs: Record<QualityLevel, string> = {
    excellent: "Mantén los flujos actuales. Enfócate en expandir cobertura de intents.",
    good: "Identifica los 3 flujos con más abandono y optimízalos. Agrega respuestas para preguntas frecuentes no cubiertas.",
    fair: "Rediseña los flujos principales: simplifica, reduce pasos, y mejora las respuestas a FAQ.",
    poor: "Acción urgente: audita el NLU, simplifica el flujo de bienvenida y automatiza las top 5 preguntas.",
  };

  return { score: totalScore, level, subMetrics: sub, summary: summaries[level], recommendation: recs[level] };
}

function emptyBotQuality(): BotQualityMetrics {
  return {
    score: 0, level: "poor",
    subMetrics: [
      { key: "resolution", label: "Tasa de Resolución", score: 0, max: 25, raw: 0, unit: "%", tip: "Sin datos" },
      { key: "firstResponse", label: "Primera Respuesta", score: 0, max: 20, raw: 0, unit: "s", tip: "Sin datos" },
      { key: "escalation", label: "Tasa de Escalación", score: 0, max: 15, raw: 0, unit: "%", tip: "Sin datos" },
      { key: "efficiency", label: "Eficiencia de Mensajes", score: 0, max: 15, raw: 0, unit: "ratio", tip: "Sin datos" },
      { key: "dropOff", label: "Tasa de Abandono", score: 0, max: 15, raw: 0, unit: "%", tip: "Sin datos" },
      { key: "satisfaction", label: "Re-engagement (Satisfacción)", score: 0, max: 10, raw: 0, unit: "%", tip: "Sin datos" },
    ],
    summary: "Sin datos suficientes para evaluar.",
    recommendation: "Conecta BotMaker para comenzar a medir.",
  };
}

export const EMPTY_BOT_QUALITY: BotQualityMetrics = emptyBotQuality();

// ── Executive Diagnostic (CDO "So What?" Layer) ──────────────────────────────
// Cross-metric intelligence: combines Lead + Bot quality scores with raw
// session data to produce funnel analysis, quadrant diagnosis, and prioritized
// prescriptive actions. This is the "narrative layer" for C-level consumption.

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  rate: number;     // % conversion from previous stage
  dropOff: number;  // absolute drop from previous stage
}

export type Quadrant =
  | "high-lead-high-bot"
  | "high-lead-low-bot"
  | "low-lead-high-bot"
  | "low-lead-low-bot";

export interface PrescriptiveAction {
  priority: number;
  action: string;
  impact: string;
  area: "lead" | "bot" | "ops";
}

export interface ExecutiveDiagnostic {
  funnel: FunnelStage[];
  overallConversion: number;       // resolved / sessions (%)
  quadrant: Quadrant;
  quadrantLabel: string;
  quadrantDiagnosis: string;
  headline: string;                // declarative headline ("El bot pierde 40% de leads...")
  actions: PrescriptiveAction[];
  bottleneck: { stage: string; dropOff: number; insight: string };
}

/** Compute the executive diagnostic from sessions + quality scores. */
export function computeExecutiveDiagnostic(
  sessions: BmSession[],
  leadQ: LeadQualityMetrics,
  botQ: BotQualityMetrics,
): ExecutiveDiagnostic {
  const list = Array.isArray(sessions) ? sessions : [];
  if (list.length === 0) return emptyDiagnostic();

  // ── Single pass: compute funnel counters ──
  let engaged = 0;      // ≥2 user messages
  let multiTurn = 0;    // ≥4 alternating turns
  let resolved = 0;     // closed + typification (not abandon)

  for (const s of list) {
    const msgs = s.messages || [];
    let userMsgs = 0;
    let turns = 0;
    let lastFrom: string | null = null;

    for (const msg of msgs) {
      if (msg.from === "user") userMsgs++;
      if (msg.from && msg.from !== lastFrom) { turns++; lastFrom = msg.from; }
    }

    if (userMsgs >= 2) engaged++;
    if (turns >= 4) multiTurn++;

    const closeEv = (s.events || []).find((e) => e.name === "conversation-close");
    if (closeEv?.info?.typification) {
      const typ = closeEv.info.typification.toLowerCase();
      if (!typ.includes("abandon") && !typ.includes("no_resp")) resolved++;
    }
  }

  const total = list.length;

  // ── Funnel stages ──
  const stages: FunnelStage[] = [
    { key: "sessions", label: "Sesiones", count: total, rate: 100, dropOff: 0 },
    {
      key: "engaged", label: "Engaged (≥2 msgs)",
      count: engaged,
      rate: total > 0 ? Math.round((engaged / total) * 100) : 0,
      dropOff: total - engaged,
    },
    {
      key: "multiTurn", label: "Multi-turno (≥4 turnos)",
      count: multiTurn,
      rate: engaged > 0 ? Math.round((multiTurn / engaged) * 100) : 0,
      dropOff: engaged - multiTurn,
    },
    {
      key: "resolved", label: "Resueltas",
      count: resolved,
      rate: multiTurn > 0 ? Math.round((resolved / multiTurn) * 100) : 0,
      dropOff: multiTurn - resolved,
    },
  ];

  const overallConversion = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // ── Quadrant diagnosis ──
  const lScore = leadQ.score;
  const bScore = botQ.score;
  const threshold = 55; // ≥55 = "high"

  const quadrant: Quadrant =
    lScore >= threshold && bScore >= threshold ? "high-lead-high-bot" :
    lScore >= threshold && bScore < threshold ? "high-lead-low-bot" :
    lScore < threshold && bScore >= threshold ? "low-lead-high-bot" :
    "low-lead-low-bot";

  const quadrantMeta: Record<Quadrant, { label: string; diagnosis: string }> = {
    "high-lead-high-bot": {
      label: "Tráfico ✅ Bot ✅",
      diagnosis: "Ecosistema saludable. Los leads son calificados y el bot los resuelve eficientemente. Enfócate en escalar volumen.",
    },
    "high-lead-low-bot": {
      label: "Tráfico ✅ Bot ❌",
      diagnosis: "El bot está matando leads buenos. Los usuarios llegan con intención clara pero el bot no resuelve. Prioridad: rediseñar flujos del bot.",
    },
    "low-lead-high-bot": {
      label: "Tráfico ❌ Bot ✅",
      diagnosis: "El bot funciona bien pero recibe tráfico de baja calidad. Prioridad: revisar segmentación de Meta Ads y el copy del anuncio.",
    },
    "low-lead-low-bot": {
      label: "Tráfico ❌ Bot ❌",
      diagnosis: "Crisis doble: el tráfico es malo y el bot no ayuda. Ataca ambos frentes: segmentación + rediseño de flujos conversacionales.",
    },
  };

  // ── Bottleneck: biggest absolute drop-off ──
  let bottleneck = { stage: "sessions", dropOff: 0, insight: "Sin datos suficientes." };
  let maxDrop = 0;
  for (let i = 1; i < stages.length; i++) {
    if (stages[i].dropOff > maxDrop) {
      maxDrop = stages[i].dropOff;
      const pct = stages[i - 1].count > 0
        ? Math.round((stages[i].dropOff / stages[i - 1].count) * 100)
        : 0;
      bottleneck = {
        stage: stages[i].label,
        dropOff: pct,
        insight: buildBottleneckInsight(stages[i].key, pct),
      };
    }
  }

  // ── Headline ──
  const headline = buildHeadline(quadrant, overallConversion, bottleneck, total);

  // ── Prescriptive actions ──
  const actions = buildActions(quadrant, leadQ, botQ, stages, bottleneck);

  return {
    funnel: stages,
    overallConversion,
    quadrant,
    quadrantLabel: quadrantMeta[quadrant].label,
    quadrantDiagnosis: quadrantMeta[quadrant].diagnosis,
    headline,
    actions,
    bottleneck,
  };
}

function buildBottleneckInsight(stageKey: string, dropPct: number): string {
  switch (stageKey) {
    case "engaged":
      return `${dropPct}% de las sesiones mueren en el primer mensaje. El bot no engancha o el usuario no tenía intención real.`;
    case "multiTurn":
      return `${dropPct}% de los leads engaged no profundizan. El flujo del bot puede ser confuso o demasiado largo.`;
    case "resolved":
      return `${dropPct}% de las conversaciones profundas no cierran. El bot no tipifica correctamente o falta handoff a agente.`;
    default:
      return "Sin datos suficientes.";
  }
}

function buildHeadline(
  quadrant: Quadrant,
  overallConversion: number,
  bottleneck: { stage: string; dropOff: number },
  totalSessions: number,
): string {
  if (totalSessions === 0) return "Sin sesiones suficientes para diagnosticar.";

  switch (quadrant) {
    case "high-lead-high-bot":
      return `Conversión del ${overallConversion}% — ecosistema saludable con ${totalSessions.toLocaleString("es-MX")} sesiones.`;
    case "high-lead-low-bot":
      return `El bot pierde ${bottleneck.dropOff}% de leads calificados en "${bottleneck.stage}". Corrección urgente.`;
    case "low-lead-high-bot":
      return `Solo ${overallConversion}% de conversión: el tráfico llega sin intención. El bot no es el problema.`;
    case "low-lead-low-bot":
      return `Crisis: ${overallConversion}% de conversión sobre ${totalSessions.toLocaleString("es-MX")} sesiones. Tráfico malo + bot ineficiente.`;
  }
}

function buildActions(
  quadrant: Quadrant,
  leadQ: LeadQualityMetrics,
  botQ: BotQualityMetrics,
  stages: FunnelStage[],
  bottleneck: { stage: string; dropOff: number },
): PrescriptiveAction[] {
  const actions: PrescriptiveAction[] = [];

  // Find weakest sub-metrics
  const weakestLead = [...leadQ.subMetrics].sort((a, b) => (a.score / a.max) - (b.score / b.max))[0];
  const weakestBot = [...botQ.subMetrics].sort((a, b) => (a.score / a.max) - (b.score / b.max))[0];

  switch (quadrant) {
    case "high-lead-low-bot":
      actions.push({
        priority: 1, area: "bot",
        action: `Corregir "${weakestBot?.label}" del bot (${weakestBot?.raw}${weakestBot?.unit !== "ratio" ? weakestBot?.unit : "x"}) — es el sub-métrica más débil.`,
        impact: `Mejorar podría recuperar hasta ${bottleneck.dropOff}% de leads perdidos.`,
      });
      actions.push({
        priority: 2, area: "bot",
        action: "Auditar los 3 flujos con más abandono en BotMaker. Simplificar pasos y agregar fallbacks.",
        impact: "Reducción directa del drop-off en la etapa de resolución.",
      });
      actions.push({
        priority: 3, area: "ops",
        action: "Implementar alerta automática cuando la tasa de resolución baje del 50%.",
        impact: "Detección temprana de degradación del bot.",
      });
      break;

    case "low-lead-high-bot":
      actions.push({
        priority: 1, area: "lead",
        action: `Mejorar "${weakestLead?.label}" (${weakestLead?.raw}${weakestLead?.unit !== "ratio" ? weakestLead?.unit : "x"}) — el eslabón más débil del tráfico.`,
        impact: "Leads más calificados = mayor ROI en el mismo presupuesto.",
      });
      actions.push({
        priority: 2, area: "lead",
        action: "Revisar el copy y CTA del anuncio de Meta Ads. Filtrar mejor la audiencia con exclusiones.",
        impact: "Reducir el % de sesiones de 1 solo mensaje (bajo engagement).",
      });
      actions.push({
        priority: 3, area: "lead",
        action: "Implementar pregunta de calificación en el primer turno del bot (ej: '¿En qué te puedo ayudar?').",
        impact: "Separar curiosos de leads reales desde el primer contacto.",
      });
      break;

    case "low-lead-low-bot":
      actions.push({
        priority: 1, area: "lead",
        action: "URGENTE: Pausar la campaña actual y redefinir la audiencia de Meta Ads.",
        impact: "Dejar de gastar presupuesto en tráfico que no convierte.",
      });
      actions.push({
        priority: 2, area: "bot",
        action: `Rediseñar el flujo de bienvenida del bot. "${weakestBot?.label}" es crítico (${weakestBot?.raw}${weakestBot?.unit !== "ratio" ? weakestBot?.unit : "x"}).`,
        impact: "Recuperar conversiones perdidas en el engagement inicial.",
      });
      actions.push({
        priority: 3, area: "ops",
        action: "Activar handoff automático a agente humano en sesiones con >3 minutos sin resolución.",
        impact: "Rescatar leads que el bot no puede resolver.",
      });
      break;

    case "high-lead-high-bot":
    default:
      actions.push({
        priority: 1, area: "ops",
        action: `Escalar presupuesto de Meta Ads. Conversión actual (${stages[stages.length - 1]?.rate || 0}%) justifica más volumen.`,
        impact: "Más sesiones al mismo ratio = crecimiento lineal.",
      });
      actions.push({
        priority: 2, area: "bot",
        action: `Optimizar "${weakestBot?.label}" para pasar de 'bueno' a 'excelente' (${weakestBot?.score}/${weakestBot?.max}).`,
        impact: "Mejora marginal pero compuesta con más volumen.",
      });
      actions.push({
        priority: 3, area: "lead",
        action: "Documentar esta segmentación como 'audiencia dorada' y crear lookalikes en Meta.",
        impact: "Replicar el perfil de lead que mejor convierte.",
      });
      break;
  }

  return actions;
}

function emptyDiagnostic(): ExecutiveDiagnostic {
  return {
    funnel: [
      { key: "sessions", label: "Sesiones", count: 0, rate: 100, dropOff: 0 },
      { key: "engaged", label: "Engaged (≥2 msgs)", count: 0, rate: 0, dropOff: 0 },
      { key: "multiTurn", label: "Multi-turno (≥4 turnos)", count: 0, rate: 0, dropOff: 0 },
      { key: "resolved", label: "Resueltas", count: 0, rate: 0, dropOff: 0 },
    ],
    overallConversion: 0,
    quadrant: "low-lead-low-bot",
    quadrantLabel: "Sin datos",
    quadrantDiagnosis: "Conecta BotMaker para obtener el diagnóstico.",
    headline: "Sin sesiones suficientes para diagnosticar.",
    actions: [],
    bottleneck: { stage: "", dropOff: 0, insight: "Sin datos." },
  };
}

export const EMPTY_DIAGNOSTIC: ExecutiveDiagnostic = emptyDiagnostic();

// ── Quality by channel ───────────────────────────────────────────────────────
// Lead + Bot quality and the executive diagnostic, broken down by the 4 product
// channels so each tab in the UI reflects ITS OWN lead/bot quality — not a
// blended account-wide number that hides per-channel differences.

export interface ChannelQuality {
  leadQuality: LeadQualityMetrics;
  botQuality: BotQualityMetrics;
  diagnostic: ExecutiveDiagnostic;
}

export interface QualityByChannel {
  all: ChannelQuality;
  byChannel: Record<CanonicalChannel, ChannelQuality>;
}

/** Score one group of sessions across all three quality lenses. */
function qualityFor(sessions: BmSession[]): ChannelQuality {
  const leadQuality = computeLeadQuality(sessions);
  const botQuality = computeBotQuality(sessions);
  const diagnostic = computeExecutiveDiagnostic(sessions, leadQuality, botQuality);
  return { leadQuality, botQuality, diagnostic };
}

/**
 * Group sessions by channel (same bucketing as computeMetricsByChannel) and
 * score lead/bot quality + diagnostic for each channel plus the aggregate.
 * O(sessions) grouping; scoring is linear per bucket.
 */
export function computeQualityByChannel(
  sessions: BmSession[],
  channelPlatform: Map<string, string>
): QualityByChannel {
  const list = Array.isArray(sessions) ? sessions : [];
  const groups: Record<CanonicalChannel, BmSession[]> = {
    whatsapp: [], messenger: [], instagram: [], facebook: [],
  };
  for (const s of list) {
    const channelId = s.chat?.chat?.channelId;
    const canon = canonicalPlatform(channelId ? channelPlatform.get(channelId) : null);
    if (canon) groups[canon].push(s);
  }
  return {
    all: qualityFor(list),
    byChannel: {
      whatsapp: qualityFor(groups.whatsapp),
      messenger: qualityFor(groups.messenger),
      instagram: qualityFor(groups.instagram),
      facebook: qualityFor(groups.facebook),
    },
  };
}

const EMPTY_CHANNEL_QUALITY: ChannelQuality = {
  leadQuality: EMPTY_LEAD_QUALITY,
  botQuality: EMPTY_BOT_QUALITY,
  diagnostic: EMPTY_DIAGNOSTIC,
};

export const EMPTY_QUALITY_BY_CHANNEL: QualityByChannel = {
  all: EMPTY_CHANNEL_QUALITY,
  byChannel: {
    whatsapp: EMPTY_CHANNEL_QUALITY,
    messenger: EMPTY_CHANNEL_QUALITY,
    instagram: EMPTY_CHANNEL_QUALITY,
    facebook: EMPTY_CHANNEL_QUALITY,
  },
};


