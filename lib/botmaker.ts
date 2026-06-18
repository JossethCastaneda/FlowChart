import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";

/**
 * BotMaker API v2.0 — https://api.botmaker.com/v2.0/
 * Auth: `access-token` header. Source: BotMaker API research (account Swagger
 * is the source of truth for the full surface).
 */
const BASE = "https://api.botmaker.com/v2.0";

/** Normalize a user-entered BotMaker base URL (adds scheme, strips trailing slash). */
export function normalizeBotmakerBase(raw?: string | null): string {
  let b = (raw || "").trim();
  if (!b) return BASE;
  if (!/^https?:\/\//i.test(b)) b = "https://" + b;
  return b.replace(/\/+$/, "");
}

export interface BotmakerConnection {
  baseUrl: string;
  accessToken: string;
}

/**
 * Resolve the per-workspace BotMaker connection (base URL + access token).
 * The user connects their OWN url + access/refresh token in Integraciones; the
 * tokens are stored AES-256 encrypted in the Integration record.
 *
 * Priority:
 *   1. Encrypted Integration (provider "botmaker") for the workspace.
 *   2. env BOTMAKER_ACCESS_TOKEN — **development only** (shared, not for tenants).
 */
export async function getBotmakerConnection(workspaceId: string): Promise<BotmakerConnection | null> {
  try {
    const integ = await prisma.integration.findUnique({
      where: { workspaceId_provider_userId: { workspaceId, provider: "botmaker", userId: "workspace" } },
    });
    const creds = integ?.credentials as Record<string, unknown> | null;
    if (integ?.connected && creds?.accessToken) {
      const accessToken = decryptToken(creds.accessToken as string);
      if (accessToken) {
        return { baseUrl: normalizeBotmakerBase(creds.baseUrl as string | undefined), accessToken };
      }
    }
  } catch { /* ignore — fall through */ }

  // Dev-only global fallback. In production each workspace connects its own token.
  if (process.env.NODE_ENV !== "production" && process.env.BOTMAKER_ACCESS_TOKEN) {
    return {
      baseUrl: normalizeBotmakerBase(process.env.BOTMAKER_BASE_URL),
      accessToken: process.env.BOTMAKER_ACCESS_TOKEN,
    };
  }
  return null;
}

/** Back-compat helper: just the access token. */
export async function getBotmakerToken(workspaceId: string): Promise<string | null> {
  return (await getBotmakerConnection(workspaceId))?.accessToken ?? null;
}


/** Fetch a BotMaker path with the access-token header + basic 429 backoff. */
export async function botmakerFetch(
  path: string,
  token: string,
  init: RequestInit = {},
  retries = 2,
  baseUrl: string = BASE
): Promise<Response> {
  const res = await fetch(`${baseUrl}${path}`, {
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
    return botmakerFetch(path, token, init, retries - 1, baseUrl);
  }
  return res;
}

// ── Session metrics ─────────────────────────────────────────────────────────
// Shapes match the account Swagger (GET /sessions → SessionsPage.items →
// SessionResponse, with include-messages + include-events).

export interface BmMessage {
  from?: "bot" | "user" | "agent"; // who sent the message
  creationTime?: string | number;
  content?: {
    type?: string;
    text?: string;
    /** Botones MOSTRADOS por el bot (array de strings u objetos {label/value}). */
    buttons?: unknown;
    /** Botón ELEGIDO por el usuario (string u objeto {label/value}). */
    selectedButton?: unknown;
    /** Adjunto multimedia (imagen/audio/video/archivo). */
    media?: { type?: string; url?: string; caption?: string } | null;
    /** Ítems de carrusel mostrados. */
    carouselItems?: unknown;
  } & Record<string, unknown>;
}
export interface BmEventInfo {
  typification?: string;
  /** notification-error: tipo/razón del error del bot. */
  error?: string;
  errorType?: string;
  reason?: string;
  messageId?: string;
  /** set-variable: variable capturada por el bot (señal de "pidió este dato"). */
  variableName?: string;
  variableValue?: string;
  /** find-intent: intención disparada / fallback. */
  intentId?: string;
  intentName?: string;
  isFallback?: boolean;
}
export interface BmEvent {
  name?: string;
  creationTime?: string | number;
  info?: BmEventInfo & Record<string, unknown>;
}
export interface BmSession {
  id?: string;
  creationTime?: string | number;
  chat?: { chat?: { contactId?: string; channelId?: string }; lastUserMessageDatetime?: string };
  messages?: BmMessage[];
  events?: BmEvent[];
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
  maxPages = 6,
  baseUrl: string = BASE
): Promise<BmSession[]> {
  const all: BmSession[] = [];
  let next: string | null =
    `/sessions?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}&include-messages=true&include-events=true`;
  let pages = 0;
  while (next && pages < maxPages) {
    // Always route through botmakerFetch for consistent retry/headers.
    // If BotMaker returns a full URL as nextPage, extract the path.
    const path = next.startsWith("http") ? new URL(next).pathname + new URL(next).search : next;
    const res = await botmakerFetch(path, token, {}, 2, baseUrl);
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

// ── Comportamiento del Bot (análisis profundo, solo Botmaker) ────────────────
// Métricas a nivel mensaje/evento que la API de Botmaker expone y que el panel
// "Análisis de Resultados" necesita: tipos de mensaje, botones mostrados vs
// elegidos, errores del bot, tiempo a cierre de venta y el funnel del ORDEN en
// que el bot pide datos. Todas son funciones puras O(mensajes) — testeable sin red.

const onlyChannel = (sessions: BmSession[], channelId?: string): BmSession[] =>
  (Array.isArray(sessions) ? sessions : []).filter((s) => !channelId || s.chat?.chat?.channelId === channelId);

/** Normaliza el `content.type` de Botmaker a un bucket canónico legible. */
export function canonicalMessageType(raw?: string | null): string {
  const t = (raw || "").toLowerCase().trim();
  if (!t) return "otro";
  if (t.includes("button-click") || t.includes("button_click")) return "boton-elegido";
  if (t.includes("button")) return "botones";
  if (t.includes("carousel")) return "carrusel";
  if (t.includes("text")) return "texto";
  if (t.includes("image") || t === "img" || t.includes("photo") || t.includes("sticker")) return "imagen";
  if (t.includes("audio") || t.includes("voice")) return "audio";
  if (t.includes("video")) return "video";
  if (t.includes("file") || t.includes("document") || t.includes("pdf")) return "archivo";
  if (t.includes("location")) return "ubicacion";
  return "otro";
}

/** Extrae las etiquetas de los botones MOSTRADOS de un `content` (defensivo). */
function buttonLabels(content: unknown): string[] {
  const b = (content as { buttons?: unknown })?.buttons;
  const arr = Array.isArray(b) ? b : [];
  return arr
    .map((x) => (typeof x === "string" ? x : (x as Record<string, unknown>)?.label ?? (x as Record<string, unknown>)?.text ?? (x as Record<string, unknown>)?.title ?? (x as Record<string, unknown>)?.value))
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim());
}

/** Etiqueta del botón ELEGIDO de un `content` (string u objeto), o null. */
function selectedButtonLabel(content: unknown): string | null {
  const s = (content as { selectedButton?: unknown })?.selectedButton;
  if (!s) return null;
  if (typeof s === "string") return s.trim() || null;
  const o = s as Record<string, unknown>;
  const v = o.label ?? o.text ?? o.title ?? o.value;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export interface MessageTypeBreakdown {
  total: number;
  byType: { type: string; count: number; pct: number }[];
  /** Desglose por remitente para "mensajes recibidos" (user) vs enviados (bot). */
  userTotal: number;
  botTotal: number;
}

/** Distribución de tipos de mensaje (texto/imagen/botones/…) en las sesiones. */
export function computeMessageTypeBreakdown(sessions: BmSession[], channelId?: string): MessageTypeBreakdown {
  const list = onlyChannel(sessions, channelId);
  const byType: Record<string, number> = {};
  let total = 0, userTotal = 0, botTotal = 0;
  for (const s of list) {
    for (const msg of s.messages || []) {
      const type = canonicalMessageType(msg.content?.type);
      byType[type] = (byType[type] || 0) + 1;
      total++;
      if (msg.from === "user") userTotal++; else botTotal++;
    }
  }
  const entries = Object.entries(byType)
    .map(([type, count]) => ({ type, count, pct: total ? Math.round((count / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.count - a.count);
  return { total, byType: entries, userTotal, botTotal };
}

export interface ButtonStats {
  /** # de mensajes del bot que mostraron botones. */
  shownMessages: number;
  /** # total de opciones de botón mostradas (suma de etiquetas). */
  shownOptions: number;
  /** # de selecciones de botón por el usuario. */
  selected: number;
  /** selected / shownMessages (0–1). */
  selectRate: number;
  /** Top botones por aparición, con su CTR (elegido/mostrado). */
  topButtons: { label: string; shown: number; selected: number; ctr: number }[];
}

/** Estadística de botones mostrados vs elegidos. */
export function computeButtonStats(sessions: BmSession[], channelId?: string): ButtonStats {
  const list = onlyChannel(sessions, channelId);
  let shownMessages = 0, shownOptions = 0, selected = 0;
  const shownByLabel: Record<string, number> = {};
  const selByLabel: Record<string, number> = {};
  for (const s of list) {
    for (const msg of s.messages || []) {
      const labels = buttonLabels(msg.content);
      if (labels.length) {
        shownMessages++;
        shownOptions += labels.length;
        for (const l of labels) shownByLabel[l] = (shownByLabel[l] || 0) + 1;
      }
      const sel = selectedButtonLabel(msg.content) || (canonicalMessageType(msg.content?.type) === "boton-elegido" ? (msg.content?.text || "").trim() : null);
      if (sel) {
        selected++;
        selByLabel[sel] = (selByLabel[sel] || 0) + 1;
      }
    }
  }
  const topButtons = Object.entries(shownByLabel)
    .map(([label, shown]) => ({ label, shown, selected: selByLabel[label] || 0, ctr: shown ? Math.round(((selByLabel[label] || 0) / shown) * 1000) / 10 : 0 }))
    .sort((a, b) => b.shown - a.shown)
    .slice(0, 12);
  return {
    shownMessages,
    shownOptions,
    selected,
    selectRate: shownMessages ? Math.round((selected / shownMessages) * 1000) / 1000 : 0,
    topButtons,
  };
}

export interface BotErrorStats {
  total: number;
  sessionsWithError: number;
  perSessionAvg: number;
  byType: { type: string; count: number }[];
}

/** Errores del bot a partir de eventos `notification-error` (defensivo). */
export function computeBotErrors(sessions: BmSession[], channelId?: string): BotErrorStats {
  const list = onlyChannel(sessions, channelId);
  let total = 0, sessionsWithError = 0;
  const byType: Record<string, number> = {};
  for (const s of list) {
    let inSession = 0;
    for (const e of s.events || []) {
      const name = (e.name || "").toLowerCase();
      if (name === "notification-error" || name.includes("error")) {
        inSession++;
        const t = (e.info?.errorType || e.info?.error || e.info?.reason || "desconocido").toString().slice(0, 80);
        byType[t] = (byType[t] || 0) + 1;
      }
    }
    if (inSession > 0) { sessionsWithError++; total += inSession; }
  }
  return {
    total,
    sessionsWithError,
    perSessionAvg: list.length ? Math.round((total / list.length) * 100) / 100 : 0,
    byType: Object.entries(byType).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count).slice(0, 12),
  };
}

/**
 * Señal de VENTA del dashboard (metodología BAIT): una sesión es venta si el bot
 * envió un mensaje que contiene "felicidades" (confirmación de cierre). NO se usa
 * la tipificación de cierre para esto.
 */
const SALE_PHRASE = /felicidad/i;

/** Timestamp (ms) del primer mensaje de bot con "felicidades" en la sesión, o null. */
function saleConfirmationAt(s: BmSession): number | null {
  const msgs = (s.messages || []).slice().sort((a, b) => (toMs(a.creationTime) || 0) - (toMs(b.creationTime) || 0));
  for (const m of msgs) {
    if (m.from !== "user" && SALE_PHRASE.test((m.content?.text || "").toString())) return toMs(m.creationTime);
  }
  return null;
}

/** ¿La sesión es una venta? (el bot dijo "felicidades"). */
export function isSaleSession(s: BmSession): boolean {
  return saleConfirmationAt(s) != null;
}

/** Normaliza un teléfono a sus últimos 10 dígitos (para cruce con sábana de ventas). */
export function normalizePhone(raw: unknown): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Teléfonos (últimos 10 dígitos) de las sesiones de VENTA (felicidades). El
 * teléfono del cliente se toma del contactId del chat (BSUID de WhatsApp).
 */
export function saleSessionPhones(sessions: BmSession[], channelId?: string): string[] {
  const list = onlyChannel(sessions, channelId);
  const out: string[] = [];
  for (const s of list) {
    if (saleConfirmationAt(s) == null) continue;
    const phone = normalizePhone(s.chat?.chat?.contactId);
    if (phone.length === 10) out.push(phone);
  }
  return out;
}

export interface TimeToSaleStats {
  count: number;          // # ventas (sesiones con "felicidades")
  conversionRate: number; // ventas / sesiones (0–1)
  avgSec: number;
  medianSec: number;
  /** Histograma por rangos de tiempo (min) para el reporte. */
  distribution: { bucket: string; count: number }[];
}

/** Ventas (regla "felicidades") y tiempo desde el inicio de la sesión hasta el cierre. */
export function computeTimeToSale(sessions: BmSession[], channelId?: string): TimeToSaleStats {
  const list = onlyChannel(sessions, channelId);
  const durations: number[] = []; // segundos
  let count = 0;
  for (const s of list) {
    const saleAt = saleConfirmationAt(s);
    if (saleAt == null) continue;
    count++;
    const start = toMs(s.creationTime);
    if (start != null && saleAt >= start) durations.push(Math.round((saleAt - start) / 1000));
  }
  durations.sort((a, b) => a - b);
  const n = durations.length;
  const avgSec = n ? Math.round(durations.reduce((s, v) => s + v, 0) / n) : 0;
  const medianSec = n ? durations[Math.floor((n - 1) / 2)] : 0;
  const buckets: { bucket: string; min: number; max: number }[] = [
    { bucket: "<5 min", min: 0, max: 300 },
    { bucket: "5–15 min", min: 300, max: 900 },
    { bucket: "15–30 min", min: 900, max: 1800 },
    { bucket: "30–60 min", min: 1800, max: 3600 },
    { bucket: ">60 min", min: 3600, max: Infinity },
  ];
  const distribution = buckets.map((b) => ({ bucket: b.bucket, count: durations.filter((d) => d >= b.min && d < b.max).length }));
  return { count, conversionRate: list.length ? Math.round((count / list.length) * 1000) / 1000 : 0, avgSec, medianSec, distribution };
}

/**
 * Patrones del flujo de portabilidad BAIT para inferir qué dato pide el bot.
 * El orden canónico (Funnel 2 global) emerge de los datos: número → NIP → nombre
 * → … → venta. El orden por tipo de bot (Prepago/Pospago) requiere el mapeo de
 * bots, que se documenta aparte.
 */
const FIELD_PATTERNS: { key: string; label: string; re: RegExp }[] = [
  { key: "numero", label: "Número a cambiar/portar", re: /n[uú]mero (a|que).*(cambiar|portar)|n[uú]mero a (portar|cambiar)|tu n[uú]mero|10 d[ií]gitos/i },
  { key: "nip", label: "NIP", re: /\bnip\b/i },
  { key: "nombre", label: "Nombre completo", re: /nombre completo|\bnombre\b|¿c[oó]mo te llamas/i },
  { key: "correo", label: "Correo", re: /correo|email|e-?mail/i },
  { key: "fecha_nac", label: "Fecha de nacimiento", re: /fecha de nacimiento|nacimiento|naciste/i },
  { key: "estado_nac", label: "Estado de nacimiento", re: /estado de nacimiento|entidad de nacimiento|estado donde naciste/i },
  { key: "vigencia", label: "Vigencia", re: /vigencia/i },
];

export interface DataRequestFunnel {
  method: "set-variable" | "heuristic" | "configured" | "none";
  totalSessions: number;
  steps: { key: string; label: string; reached: number; dropOff: number; dropOffPct: number }[];
}

/** Etiquetas legibles de cada campo del flujo (desde FIELD_PATTERNS). */
const FIELD_LABELS: Record<string, string> = Object.fromEntries(FIELD_PATTERNS.map((f) => [f.key, f.label]));

/**
 * Orden REAL del Funnel 2 por tipo de bot (metodología BAIT). "google_bait" se
 * deja en auto (mezcla alineado/simplificado según fechas).
 */
export const FLOW_ORDERS: Record<string, string[]> = {
  prepago: ["numero", "nip", "nombre"],
  pospago_alineado: ["numero", "nombre", "nip", "vigencia", "estado_nac", "fecha_nac", "correo"],
  pospago_simplificado: ["numero", "nombre", "nip", "estado_nac", "fecha_nac", "correo"],
};

/** Conjunto de campos que el bot pidió por sesión (heurística de texto, FIELD_PATTERNS). */
function capturedFieldsPerSession(sessions: BmSession[]): Set<string>[] {
  return sessions.map((s) => {
    const set = new Set<string>();
    for (const m of s.messages || []) {
      if (m.from === "user") continue;
      const text = (m.content?.text || "").toString();
      if (!text) continue;
      for (const fp of FIELD_PATTERNS) if (fp.re.test(text)) set.add(fp.key);
    }
    return set;
  });
}

/** Funnel 2 con ORDEN FIJO por tipo de bot (funnel de prefijo). */
export function computeFlowFunnel(sessions: BmSession[], order: string[], channelId?: string): DataRequestFunnel {
  const list = onlyChannel(sessions, channelId);
  const captured = capturedFieldsPerSession(list);
  const total = list.length;
  const base = order.map((key, k) => {
    const prefix = order.slice(0, k + 1);
    const reached = captured.filter((set) => prefix.every((p) => set.has(p))).length;
    return { key, label: FIELD_LABELS[key] || key, reached };
  });
  const steps = base.map((s, i) => {
    const prev = i === 0 ? total : base[i - 1].reached;
    const dropOff = Math.max(0, prev - s.reached);
    return { key: s.key, label: s.label, reached: s.reached, dropOff, dropOffPct: prev ? Math.round((dropOff / prev) * 1000) / 10 : 0 };
  });
  return { method: "configured", totalSessions: total, steps };
}

/**
 * Funnel del ORDEN en que el bot pide datos. Señal primaria: eventos
 * `set-variable` (orden de primera aparición por sesión = orden de captura).
 * Fallback: el texto de los mensajes del bot contra `FIELD_PATTERNS`.
 *
 * El orden canónico se determina por la posición media de cada paso entre las
 * sesiones; el funnel cuenta sesiones que alcanzaron el prefijo [0..k].
 */
export function computeDataRequestOrderFunnel(sessions: BmSession[], channelId?: string): DataRequestFunnel {
  const list = onlyChannel(sessions, channelId);

  // Secuencia por sesión de claves capturadas (en orden), con su etiqueta.
  const labels: Record<string, string> = {};
  const sequences: string[][] = [];

  // 1) set-variable
  let usedVariables = false;
  for (const s of list) {
    const evs = (s.events || [])
      .filter((e) => (e.name || "").toLowerCase() === "set-variable" && e.info?.variableName)
      .slice()
      .sort((a, b) => (toMs(a.creationTime) || 0) - (toMs(b.creationTime) || 0));
    if (!evs.length) continue;
    usedVariables = true;
    const seen = new Set<string>();
    const seq: string[] = [];
    for (const e of evs) {
      const key = String(e.info!.variableName).trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      seq.push(key);
      labels[key] = labels[key] || key;
    }
    if (seq.length) sequences.push(seq);
  }

  // 2) Fallback heurístico por texto de mensajes del bot.
  let method: DataRequestFunnel["method"] = usedVariables ? "set-variable" : "none";
  if (!usedVariables) {
    for (const s of list) {
      const msgs = (s.messages || []).slice().sort((a, b) => (toMs(a.creationTime) || 0) - (toMs(b.creationTime) || 0));
      const seen = new Set<string>();
      const seq: string[] = [];
      for (const msg of msgs) {
        if (msg.from === "user") continue;
        const text = (msg.content?.text || "").toString();
        if (!text) continue;
        for (const fp of FIELD_PATTERNS) {
          if (!seen.has(fp.key) && fp.re.test(text)) {
            seen.add(fp.key);
            seq.push(fp.key);
            labels[fp.key] = fp.label;
          }
        }
      }
      if (seq.length) sequences.push(seq);
    }
    if (sequences.length) method = "heuristic";
  }

  if (!sequences.length) return { method: "none", totalSessions: list.length, steps: [] };

  // Orden canónico por posición media de cada clave.
  const posSum: Record<string, number> = {};
  const posN: Record<string, number> = {};
  for (const seq of sequences) {
    seq.forEach((key, i) => {
      posSum[key] = (posSum[key] || 0) + i;
      posN[key] = (posN[key] || 0) + 1;
    });
  }
  const canonical = Object.keys(posN).sort((a, b) => (posSum[a] / posN[a]) - (posSum[b] / posN[b]));

  // Funnel de prefijo: una sesión "alcanza" el paso k si capturó canonical[0..k].
  const captured = sequences.map((seq) => new Set(seq));
  const steps = canonical.map((key, k) => {
    const prefix = canonical.slice(0, k + 1);
    const reached = captured.filter((set) => prefix.every((p) => set.has(p))).length;
    return { key, label: labels[key] || key, reached };
  });

  const out = steps.map((s, i) => {
    const prev = i === 0 ? sequences.length : steps[i - 1].reached;
    const dropOff = Math.max(0, prev - s.reached);
    return { key: s.key, label: s.label, reached: s.reached, dropOff, dropOffPct: prev ? Math.round((dropOff / prev) * 1000) / 10 : 0 };
  });
  return { method, totalSessions: sequences.length, steps: out };
}

export interface NipTiming {
  prompted: number;          // sesiones donde el bot pidió NIP
  delivered: number;         // sesiones con primera entrega válida (numérica) de NIP
  firstResponseRate: number; // delivered / prompted (0–1)
  avgSec: number;            // tiempo prompt → entrega válida
  medianSec: number;
}

/**
 * Análisis de NIP (metodología BAIT): separa el prompt del bot de la primera
 * ENTREGA VÁLIDA (numérica) del usuario. Tiempo de obtención = primer prompt
 * claro de NIP → primera entrega válida posterior.
 */
export function computeNipTiming(sessions: BmSession[], channelId?: string): NipTiming {
  const list = onlyChannel(sessions, channelId);
  const NIP_PROMPT = /\bnip\b/i;
  const VALID_NIP = /^\D*\d{4,8}\D*$/; // 4–8 dígitos (admite separadores)
  const durations: number[] = [];
  let prompted = 0, delivered = 0;
  for (const s of list) {
    const msgs = (s.messages || []).slice().sort((a, b) => (toMs(a.creationTime) || 0) - (toMs(b.creationTime) || 0));
    const prompt = msgs.find((m) => m.from !== "user" && NIP_PROMPT.test((m.content?.text || "").toString()));
    if (!prompt) continue;
    prompted++;
    const promptAt = toMs(prompt.creationTime) || 0;
    const delivery = msgs.find((m) => m.from === "user" && (toMs(m.creationTime) || 0) > promptAt && VALID_NIP.test((m.content?.text || "").toString().trim()));
    if (delivery) {
      delivered++;
      const at = toMs(delivery.creationTime);
      if (at != null && at >= promptAt) durations.push(Math.round((at - promptAt) / 1000));
    }
  }
  durations.sort((a, b) => a - b);
  const n = durations.length;
  return {
    prompted,
    delivered,
    firstResponseRate: prompted ? Math.round((delivered / prompted) * 1000) / 1000 : 0,
    avgSec: n ? Math.round(durations.reduce((s, v) => s + v, 0) / n) : 0,
    medianSec: n ? durations[Math.floor((n - 1) / 2)] : 0,
  };
}

export interface FirstMenuReaction {
  total: number;
  byType: { type: string; label: string; count: number; pct: number }[];
}

/**
 * Funnel 1 (metodología BAIT): reacción del usuario al PRIMER menú del bot.
 * Clasifica la primera respuesta tras el primer mensaje del bot en: click en
 * botón, texto libre, imagen/media, o sin respuesta.
 */
export function computeFirstMenuReaction(sessions: BmSession[], channelId?: string): FirstMenuReaction {
  const list = onlyChannel(sessions, channelId);
  const counts: Record<string, number> = { boton: 0, texto: 0, media: 0, sin_respuesta: 0 };
  for (const s of list) {
    const msgs = (s.messages || []).slice().sort((a, b) => (toMs(a.creationTime) || 0) - (toMs(b.creationTime) || 0));
    const firstBot = msgs.find((m) => m.from !== "user");
    if (!firstBot) continue; // sin menú inicial rastreable
    const firstBotAt = toMs(firstBot.creationTime) || 0;
    const reply = msgs.find((m) => m.from === "user" && (toMs(m.creationTime) || 0) >= firstBotAt);
    if (!reply) { counts.sin_respuesta++; continue; }
    const t = canonicalMessageType(reply.content?.type);
    if (t === "boton-elegido" || selectedButtonLabel(reply.content)) counts.boton++;
    else if (["imagen", "audio", "video", "archivo"].includes(t)) counts.media++;
    else counts.texto++;
  }
  const total = list.length;
  const labels: Record<string, string> = { boton: "Click en botón", texto: "Texto libre", media: "Imagen/Media", sin_respuesta: "Sin respuesta" };
  const byType = Object.entries(counts).map(([type, count]) => ({ type, label: labels[type], count, pct: total ? Math.round((count / total) * 1000) / 10 : 0 }));
  return { total, byType };
}

// ── Motivos de rechazo de portabilidad (metodología BAIT, sección 10) ────────
// Los 2 mensajes de rechazo son mensajes del BOT, así que se detectan en la
// conversación. NO se reparten artificialmente: se cuenta cuál apareció.
const REJECTION_REASONS: { key: string; label: string; re: RegExp }[] = [
  { key: "registro_en_proceso", label: "Registro en proceso (3023)", re: /registro en proceso.*(n[uú]mero|telef[oó]nic)|\(3023\)|\b3023\b/i },
  { key: "ya_registrado_activo", label: "Ya registrado con estatus activo", re: /ya est[aá] registrad.*(activo|estatus)|estatus activo reciente/i },
];

export interface RejectionStats {
  total: number; // sesiones con algún mensaje de rechazo
  byReason: { key: string; label: string; count: number }[];
}

/** Detecta los 2 mensajes de primer rechazo Botmaker en los mensajes del bot. */
export function computeRejectionReasons(sessions: BmSession[], channelId?: string): RejectionStats {
  const list = onlyChannel(sessions, channelId);
  const counts: Record<string, number> = {};
  let total = 0;
  for (const s of list) {
    const reasons = new Set<string>();
    for (const m of s.messages || []) {
      if (m.from === "user") continue;
      const text = (m.content?.text || "").toString();
      if (!text) continue;
      for (const r of REJECTION_REASONS) if (r.re.test(text)) reasons.add(r.key);
    }
    if (reasons.size) { total++; for (const k of reasons) counts[k] = (counts[k] || 0) + 1; }
  }
  return { total, byReason: REJECTION_REASONS.map((r) => ({ key: r.key, label: r.label, count: counts[r.key] || 0 })) };
}

// ── SIM vs eSIM (sección 7, relevante en Lira) ───────────────────────────────
export interface SimEsimStats { sim: number; esim: number; sinDato: number }

/** Clasifica cada sesión como SIM física vs eSIM por menciones en los mensajes. */
export function computeSimEsim(sessions: BmSession[], channelId?: string): SimEsimStats {
  const list = onlyChannel(sessions, channelId);
  let sim = 0, esim = 0;
  for (const s of list) {
    let isE = false, isS = false;
    for (const m of s.messages || []) {
      const t = (m.content?.text || "").toString().toLowerCase();
      if (!t) continue;
      if (/\besim\b|e-sim/.test(t)) isE = true;
      else if (/\bsim\b|chip f[ií]sic|sim f[ií]sic/.test(t)) isS = true;
    }
    if (isE) esim++;
    else if (isS) sim++;
  }
  return { sim, esim, sinDato: list.length - sim - esim };
}

// ── Reactivaciones (sección 8) ───────────────────────────────────────────────
export interface ReactivationStats {
  withGap: number;      // sesiones donde el bot reenganchó tras un silencio largo
  reactivated: number;  // de esas, en cuántas el usuario volvió a responder
  rate: number;         // reactivated / withGap (0–1)
}

/** Mide reenganche: mensaje del bot tras silencio ≥ gapMinutes y si el usuario respondió. */
export function computeReactivations(sessions: BmSession[], channelId?: string, gapMinutes = 30): ReactivationStats {
  const list = onlyChannel(sessions, channelId);
  const gapMs = gapMinutes * 60 * 1000;
  let withGap = 0, reactivated = 0;
  for (const s of list) {
    const msgs = (s.messages || []).slice().sort((a, b) => (toMs(a.creationTime) || 0) - (toMs(b.creationTime) || 0));
    for (let i = 1; i < msgs.length; i++) {
      const prev = toMs(msgs[i - 1].creationTime);
      const cur = toMs(msgs[i].creationTime);
      if (msgs[i].from !== "user" && prev != null && cur != null && cur - prev >= gapMs) {
        withGap++;
        if (msgs.slice(i + 1).some((m) => m.from === "user")) reactivated++;
        break;
      }
    }
  }
  return { withGap, reactivated, rate: withGap ? Math.round((reactivated / withGap) * 1000) / 1000 : 0 };
}

export interface BotBehavior {
  sampleSize: number;
  responseTimes: { avgBotSec: number; avgUserSec: number; avgFirstResponseSec: number };
  objections: { label: string; count: number }[];
  messageTypes: MessageTypeBreakdown;
  buttons: ButtonStats;
  errors: BotErrorStats;
  firstMenu: FirstMenuReaction;
  timeToSale: TimeToSaleStats;
  nip: NipTiming;
  dataRequestFunnel: DataRequestFunnel;
  rejections: RejectionStats;
  simEsim: SimEsimStats;
  reactivations: ReactivationStats;
}

/**
 * Agrega TODO el análisis de comportamiento del bot. Si `flowType` está definido
 * y tiene un orden conocido (FLOW_ORDERS), el Funnel 2 usa el orden REAL de ese
 * tipo de bot; si no, se infiere de los datos.
 */
export function computeBotBehavior(sessions: BmSession[], channelId?: string, flowType?: string | null): BotBehavior {
  const list = onlyChannel(sessions, channelId);
  const base = computeResultsMetrics(list);

  let resolvedFlowType = flowType;
  if (flowType === "google_bait" && list.length > 0) {
    // Regla de Fecha de Google Bait: 1 de Junio 2026
    const CUTOFF_MS = new Date("2026-06-01T00:00:00-06:00").getTime();
    // Usar la sesión más reciente del conjunto para decidir el embudo
    const lastSessionAt = list.reduce((latest, s) => {
      const t = toMs(s.creationTime) || 0;
      return t > latest ? t : latest;
    }, 0);
    resolvedFlowType = lastSessionAt >= CUTOFF_MS ? "pospago_simplificado" : "pospago_alineado";
  }

  const order = resolvedFlowType ? FLOW_ORDERS[resolvedFlowType] : undefined;

  // Tiempo de primera respuesta: primer mensaje de usuario → primera respuesta bot/agente.
  let frtSum = 0, frtN = 0;
  for (const s of list) {
    const msgs = (s.messages || []).slice().sort((a, b) => (toMs(a.creationTime) || 0) - (toMs(b.creationTime) || 0));
    const firstUser = msgs.find((m) => m.from === "user");
    if (!firstUser) continue;
    const firstUserAt = toMs(firstUser.creationTime);
    const firstReply = msgs.find((m) => m.from !== "user" && (toMs(m.creationTime) || 0) >= (firstUserAt || 0));
    const replyAt = toMs(firstReply?.creationTime);
    if (firstUserAt != null && replyAt != null && replyAt >= firstUserAt) { frtSum += replyAt - firstUserAt; frtN++; }
  }

  return {
    sampleSize: list.length,
    responseTimes: {
      avgBotSec: base.avgBotResponseTimeSec,
      avgUserSec: base.avgUserResponseTimeSec,
      avgFirstResponseSec: frtN ? Math.round(frtSum / frtN / 1000) : 0,
    },
    objections: base.topTypifications,
    messageTypes: computeMessageTypeBreakdown(list),
    buttons: computeButtonStats(list),
    errors: computeBotErrors(list),
    firstMenu: computeFirstMenuReaction(list),
    timeToSale: computeTimeToSale(list),
    nip: computeNipTiming(list),
    dataRequestFunnel: order ? computeFlowFunnel(list, order) : computeDataRequestOrderFunnel(list),
    rejections: computeRejectionReasons(list),
    simEsim: computeSimEsim(list),
    reactivations: computeReactivations(list),
  };
}

/** Comportamiento vacío (sin token / desconectado). */
export const EMPTY_BOT_BEHAVIOR: BotBehavior = computeBotBehavior([]);

// ── Listado de canales (para autollenar el formulario de proyecto) ───────────
export type ChannelCanonical = "whatsapp" | "webchat" | "instagram" | "facebook" | "messenger";

export interface BmChannelInfo {
  id: string;
  platform: string;
  canonical: ChannelCanonical | null;
  name: string;
  /** Número de línea (solo WhatsApp). */
  number?: string;
  active: boolean;
}

/** Mapea el `platform` de un canal Botmaker a su forma canónica (incluye webchat). */
function channelCanonical(platform?: string | null): ChannelCanonical | null {
  const p = (platform || "").toLowerCase();
  if (!p) return null;
  if (p.includes("whats")) return "whatsapp";
  if (p.includes("insta")) return "instagram";
  if (p.includes("messenger")) return "messenger";
  if (p.includes("facebook") || p === "fb") return "facebook";
  if (p.includes("web")) return "webchat"; // webchat / web / webwidget
  return null;
}

/**
 * GET /channels → canales del bot del workspace (números de WhatsApp, webchats,
 * Instagram y Facebook). Se usa para AUTOLLENAR el formulario "Nuevo Proyecto"
 * en vez de teclear los números a mano.
 */
export async function listBotmakerChannels(conn: BotmakerConnection): Promise<BmChannelInfo[]> {
  const res = await botmakerFetch("/channels", conn.accessToken, {}, 2, conn.baseUrl);
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  const items = (data?.items ?? data ?? []) as Record<string, unknown>[];
  if (!Array.isArray(items)) return [];
  return items
    .map((c) => ({
      id: String(c.id ?? ""),
      platform: String(c.platform ?? ""),
      canonical: channelCanonical(c.platform as string),
      name: String(c.name ?? ""),
      number: typeof c.number === "string" ? c.number : undefined,
      active: c.active !== false,
    }))
    .filter((c) => c.id);
}

/**
 * Persiste los canales del bot en `IntegrationAssetCache` (assetType "bot") al
 * CONECTAR la integración, para que el formulario "Nuevo Proyecto" los tenga
 * disponibles de inmediato (y como respaldo si la API en vivo falla/tarda).
 */
export async function cacheBotmakerChannels(
  integrationId: string,
  workspaceId: string,
  channels: BmChannelInfo[]
): Promise<void> {
  for (const c of channels) {
    if (!c.id) continue;
    const metadata = { platform: c.platform, number: c.number ?? null, active: c.active };
    await prisma.integrationAssetCache.upsert({
      where: { integrationId_assetType_externalId: { integrationId, assetType: "bot", externalId: c.id } },
      update: { name: c.name || c.id, metadata, syncedAt: new Date() },
      create: { integrationId, workspaceId, provider: "botmaker", assetType: "bot", externalId: c.id, name: c.name || c.id, metadata },
    });
  }
}

/**
 * Lee los canales del bot cacheados (poblados al conectar / por el sync workflow)
 * y los reconstruye al mismo contrato que `listBotmakerChannels`. Respaldo para
 * cuando la API en vivo de Botmaker no responde. Tolera el `metadata` histórico
 * del sync workflow (`{ platform, phoneNumber }`) además del nuevo (`{ number }`).
 */
export async function getCachedBotmakerChannels(workspaceId: string): Promise<BmChannelInfo[]> {
  try {
    const rows = await prisma.integrationAssetCache.findMany({
      where: { workspaceId, provider: "botmaker", assetType: "bot" },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => {
      const meta = (r.metadata as Record<string, unknown>) || {};
      const platform = String(meta.platform ?? "");
      const number =
        typeof meta.number === "string" ? meta.number :
        typeof meta.phoneNumber === "string" ? meta.phoneNumber : undefined;
      return {
        id: r.externalId,
        platform,
        canonical: channelCanonical(platform),
        name: r.name || r.externalId,
        number,
        active: meta.active !== false,
      };
    });
  } catch {
    return [];
  }
}

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


