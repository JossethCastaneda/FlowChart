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
 * Priority: encrypted Integration (provider "botmaker") → env BOTMAKER_ACCESS_TOKEN.
 * Never hard-code the token.
 */
export async function getBotmakerToken(workspaceId: string): Promise<string | null> {
  try {
    const integ = await prisma.integration.findUnique({
      where: { workspaceId_provider: { workspaceId, provider: "botmaker" } },
    });
    const creds = integ?.credentials as any;
    if (integ?.connected && creds?.accessToken) return decryptToken(creds.accessToken);
  } catch { /* ignore — fall back to env */ }
  return process.env.BOTMAKER_ACCESS_TOKEN || null;
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
// Computed from the BotMaker SESSION → MESSAGE[] model. The exact "List Sessions"
// v2 endpoint lives in the account's Swagger export, so we normalize a generic
// session shape and compute the metrics from it — once the endpoint is wired,
// only the fetch changes, not the math.

export interface BmMessage {
  fromCustomer?: boolean;     // user vs bot/agent
  fromAgent?: boolean;        // human agent (when distinguishable)
  type?: string;
  message?: string;
  creationTime?: string | number;
  timestamp?: string | number;
}
export interface BmSession {
  sessionId?: string;
  contactId?: string;
  chatChannelId?: string;
  creationTime?: string | number;
  closeTime?: string | number;
  endTime?: string | number;
  typification?: string;       // tipificación / categorización
  messages?: BmMessage[];
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

/** Pure metric computation from a normalized list of sessions. */
export function computeResultsMetrics(sessions: BmSession[]): ResultsMetrics {
  const m: ResultsMetrics = {
    sessionsStarted: 0, uniqueSessions: 0,
    messagesByUser: 0, messagesByBot: 0, messagesByAgent: 0,
    avgResponseTimeSec: 0, avgUserResponseTimeSec: 0, avgBotResponseTimeSec: 0,
    avgSessionDurationSec: 0,
    topTypifications: [], hourlyUniqueSessions: new Array(24).fill(0),
    topUserQuestions: [],
  };
  if (!Array.isArray(sessions) || sessions.length === 0) return m;

  const contacts = new Set<string>();
  const typ: Record<string, number> = {};
  const questions: Record<string, number> = {};
  let durationSum = 0, durationCount = 0;
  let botReplySum = 0, botReplyCount = 0;
  let userReplySum = 0, userReplyCount = 0;

  for (const s of sessions) {
    m.sessionsStarted++;
    if (s.contactId) contacts.add(s.contactId);

    const start = toMs(s.creationTime);
    const end = toMs(s.closeTime ?? s.endTime);
    if (start != null && end != null && end >= start) { durationSum += end - start; durationCount++; }
    if (start != null) m.hourlyUniqueSessions[new Date(start).getHours()]++;

    if (s.typification) typ[s.typification] = (typ[s.typification] || 0) + 1;

    const msgs = (s.messages || []).slice().sort((a, b) => (toMs(a.creationTime ?? a.timestamp) || 0) - (toMs(b.creationTime ?? b.timestamp) || 0));
    let lastUserAt: number | null = null, lastBotAt: number | null = null;
    let firstUserText: string | null = null;
    for (const msg of msgs) {
      const at = toMs(msg.creationTime ?? msg.timestamp);
      if (msg.fromCustomer) {
        m.messagesByUser++;
        if (!firstUserText && msg.message) firstUserText = msg.message.trim();
        if (lastBotAt != null && at != null && at >= lastBotAt) { userReplySum += at - lastBotAt; userReplyCount++; }
        lastUserAt = at;
      } else {
        if (msg.fromAgent) m.messagesByAgent++; else m.messagesByBot++;
        if (lastUserAt != null && at != null && at >= lastUserAt) { botReplySum += at - lastUserAt; botReplyCount++; }
        lastBotAt = at;
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
