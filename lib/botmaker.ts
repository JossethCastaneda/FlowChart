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
