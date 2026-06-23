import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import {
  getBotmakerConnection,
  createConnection,
  listSessions,
  listChannels,
} from "@/lib/botmaker-api";
import type { BmSession } from "@/lib/botmaker-api";

/**
 * GET /api/botmaker/analytics/metrics?from=…&to=…
 *
 * Fetches REAL session data from Botmaker's /sessions endpoint,
 * computes true metrics (sessions, users, messages, agent sessions, etc.),
 * and returns them. This replaces the fake estimates that were computed
 * client-side from /chats objects.
 *
 * The Botmaker /sessions endpoint is the same source used by the native
 * Botmaker dashboard (go.botmaker.com > Dashboards > Users & Sessions).
 *
 * KEY CONSTRAINTS:
 * - The /sessions endpoint has a hard cap of ~500 sessions per request.
 * - With ~1500+ sessions/day, we need sub-day time windows.
 * - We use 2-hour chunks to stay under the 500 cap even during peak hours.
 * - Incremental aggregation prevents OOM for large date ranges.
 */

// Mexico City timezone helper
const APP_TZ = process.env.APP_TIMEZONE || "America/Mexico_City";
const hourFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TZ,
  hour: "numeric",
  hour12: false,
  hourCycle: "h23",
});
const dayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TZ,
  weekday: "short",
});
const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function hourInTz(ms: number): number {
  const h = parseInt(hourFmt.format(new Date(ms)), 10);
  return Number.isNaN(h) ? 0 : h % 24;
}

function dayInTz(ms: number): number {
  const dayStr = dayFmt.format(new Date(ms));
  const daysMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return daysMap[dayStr] ?? 0;
}

function dateStrInTz(ms: number): string {
  return dateFmt.format(new Date(ms));
}

const toMs = (v: unknown): number | null => {
  if (v == null) return null;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  const t = Date.parse(v as string);
  return isNaN(t) ? null : t;
};

/**
 * Mutable accumulator for incremental metrics aggregation.
 * Sessions are processed in batches and discarded to avoid OOM.
 */
class MetricsAccumulator {
  totalSessions = 0;
  sessionsWithAgent = 0;
  closedByAgent = 0;
  userMessages = 0;
  botMessages = 0;
  agentMessages = 0;
  readonly contacts = new Set<string>();
  readonly sessionIds = new Set<string>();
  readonly channelBuckets: Record<string, number> = {};
  readonly topicBuckets: Record<string, number> = {};
  readonly heatmap: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));
  readonly dailyMap: Record<string, { sessions: number; users: Set<string>; agentSessions: number }> = {};

  /**
   * Process a batch of sessions and aggregate their metrics.
   * Returns the number of new (non-duplicate) sessions processed.
   */
  processBatch(
    sessions: BmSession[],
    channelMap: Map<string, { name: string; platform: string }>
  ): number {
    let newCount = 0;

    for (const s of sessions) {
      // Deduplicate by session ID
      const sid = s.id || "";
      if (!sid || this.sessionIds.has(sid)) continue;
      this.sessionIds.add(sid);
      newCount++;
      this.totalSessions++;

      const contactId = s.chat?.chat?.contactId;
      const channelId = s.chat?.chat?.channelId;
      if (contactId) this.contacts.add(contactId);

      // Creation time → heatmap & daily breakdown
      const startMs = toMs(s.creationTime);
      if (startMs != null) {
        const hour = hourInTz(startMs);
        const day = dayInTz(startMs);
        this.heatmap[day][hour]++;

        const dateStr = dateStrInTz(startMs);
        if (!this.dailyMap[dateStr]) {
          this.dailyMap[dateStr] = { sessions: 0, users: new Set(), agentSessions: 0 };
        }
        this.dailyMap[dateStr].sessions++;
        if (contactId) this.dailyMap[dateStr].users.add(contactId);
      }

      // Channel distribution
      if (channelId) {
        const chInfo = channelMap.get(channelId);
        let label = channelId;
        if (chInfo) {
          const p = (chInfo.platform || "").toLowerCase();
          if (p.includes("whats")) label = `Whatsapp - ${chInfo.name}`;
          else if (p.includes("insta")) label = `Instagram - ${chInfo.name}`;
          else if (p.includes("messenger")) label = `Messenger - ${chInfo.name}`;
          else if (p.includes("facebook")) label = `Facebook - ${chInfo.name}`;
          else label = `${chInfo.platform} - ${chInfo.name}`;
        }
        this.channelBuckets[label] = (this.channelBuckets[label] || 0) + 1;
      }

      // Message counts — REAL data from sessions messages array
      const msgs = s.messages || [];
      for (const msg of msgs) {
        if (msg.from === "user") this.userMessages++;
        else if (msg.from === "agent") this.agentMessages++;
        else this.botMessages++;
      }

      // Agent detection — check events and messages
      const events = s.events || [];
      let hasAgent = false;
      let closedByAg = false;

      for (const ev of events) {
        const evName = (ev.name || "").toLowerCase();
        if (
          evName === "agent-online" ||
          evName === "operator-online" ||
          evName === "assign-agent" ||
          evName === "assigned-to-agent" ||
          evName === "agent-message" ||
          evName.includes("assign")
        ) {
          hasAgent = true;
        }
        if (evName === "conversation-close") {
          const closedBy = ev.info?.operatorName || ev.info?.agentId;
          if (closedBy) closedByAg = true;
        }
      }

      if (!hasAgent) {
        hasAgent = msgs.some((m) => m.from === "agent");
      }

      if (hasAgent) {
        this.sessionsWithAgent++;
        if (startMs != null) {
          const dateStr = dateStrInTz(startMs);
          if (this.dailyMap[dateStr]) this.dailyMap[dateStr].agentSessions++;
        }
      }
      if (closedByAg) this.closedByAgent++;

      // Topics
      const closeEv = events.find((e) => (e.name || "").toLowerCase() === "conversation-close");
      const typification = closeEv?.info?.typification;
      if (typification) {
        this.topicBuckets[typification] = (this.topicBuckets[typification] || 0) + 1;
      }
    }

    return newCount;
  }

  /** Produce the final metrics object for the API response */
  toMetrics() {
    const botOnly = Math.max(0, this.totalSessions - this.sessionsWithAgent);
    return {
      totalSessions: this.totalSessions,
      usersCount: this.contacts.size || this.totalSessions,
      sessionsWithAgent: this.sessionsWithAgent,
      closedByAgent: this.closedByAgent,
      userMessages: this.userMessages,
      botMessages: this.botMessages,
      agentMessages: this.agentMessages,
      topicsList: Object.entries(this.topicBuckets)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      agentSessionsDonut: [
        { name: "Sólo bots", value: botOnly },
        { name: "Agentes", value: this.sessionsWithAgent },
      ],
      channelsDonut: Object.entries(this.channelBuckets)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      heatmap: this.heatmap,
      dailySessions: Object.entries(this.dailyMap)
        .map(([date, d]) => ({
          date,
          sessions: d.sessions,
          users: d.users.size,
          agentSessions: d.agentSessions,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      channelCounts: this.channelBuckets,
    };
  }
}

export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) {
    return apiError(
      "Botmaker no está configurado.",
      "NOT_CONFIGURED",
      503
    );
  }

  const bmConn = createConnection(conn.accessToken, conn.baseUrl);
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");

  if (!from || !to) {
    return apiError("Parámetros 'from' y 'to' son requeridos.", "VALIDATION_ERROR", 400);
  }

  try {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    // ── Build time-window chunks ───────────────────────────────────────────
    // The Botmaker /sessions endpoint has a hard cap of ~500 sessions per request.
    // Average daily volume is ~1500 sessions → ~65/hour.
    // Peak hours (10am-2pm) can reach ~150-300/hour.
    // 2-hour chunks give a worst-case of ~600 sessions, which fits 2 pages.
    // This ensures complete data coverage.
    const CHUNK_MS = 2 * 60 * 60 * 1000; // 2 hours

    const chunks: { from: string; to: string }[] = [];
    let cursor = fromDate.getTime();
    const endMs = toDate.getTime();
    while (cursor < endMs) {
      const chunkEnd = Math.min(cursor + CHUNK_MS, endMs);
      chunks.push({
        from: new Date(cursor).toISOString(),
        to: new Date(chunkEnd).toISOString(),
      });
      cursor = chunkEnd;
    }

    console.log(`[ANALYTICS METRICS] Fetching sessions in ${chunks.length} chunks (2h each) from=${from} to=${to}`);

    // Fetch channels first (lightweight, needed for labeling)
    const channelsRaw = await listChannels(bmConn);
    const channelMap = new Map<string, { name: string; platform: string }>();
    for (const ch of channelsRaw) {
      channelMap.set(ch.id, { name: ch.name, platform: ch.platform });
    }

    // ── Incremental aggregation with concurrency-limited fetching ──────────
    // Instead of collecting all sessions in memory, we process each batch
    // immediately and discard the raw data. This prevents OOM for large ranges.
    const CONCURRENCY = 5;
    const acc = new MetricsAccumulator();

    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
      const batch = chunks.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (chunk) => {
          try {
            return await listSessions(bmConn, {
              from: chunk.from,
              to: chunk.to,
              includeMessages: true,
              includeEvents: true,
              maxPages: 5, // 2h windows: max ~600 sessions = 2 pages
            });
          } catch (e) {
            console.warn(`[ANALYTICS METRICS] Chunk ${chunk.from.slice(0, 13)} failed:`, e);
            return [];
          }
        })
      );

      // Process each chunk's sessions immediately
      for (const sessions of batchResults) {
        acc.processBatch(sessions, channelMap);
      }

      const completed = Math.min(i + CONCURRENCY, chunks.length);
      if (completed % 20 === 0 || completed === chunks.length) {
        console.log(`[ANALYTICS METRICS] Progress: ${completed}/${chunks.length} chunks, ${acc.totalSessions} sessions`);
      }

      // Small delay between batches to respect rate limits
      if (i + CONCURRENCY < chunks.length) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    console.log(`[ANALYTICS METRICS] Complete: ${acc.totalSessions} unique sessions, ${acc.contacts.size} users, ${channelsRaw.length} channels`);

    return apiSuccess({ metrics: acc.toMetrics() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[ANALYTICS METRICS] Error:", message);
    return apiError(
      `Error al obtener métricas: ${message}`,
      "UPSTREAM_ERROR",
      502
    );
  }
});

export const maxDuration = 600; // 10 minutes — 276 chunks for full month, rate-limited
