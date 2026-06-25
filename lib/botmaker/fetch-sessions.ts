/**
 * Chunked + cached fetch of Botmaker /sessions for a workspace over a time range.
 * Extracted so the new Bot Analytics dashboard route and any future consumer share
 * ONE robust fetch path (24h day-chunks, concurrency-limited, past chunks cached in
 * MetaAnalyticsCache). Returns the raw BmSession[] for pure computation downstream.
 */
import prisma from "@/lib/prisma";
import { createConnection, listSessions } from "@/lib/botmaker-api";
import type { BmConnection, BmSession } from "@/lib/botmaker-api";

const DAY_MS = 24 * 60 * 60 * 1000;
const CONCURRENCY = 5;
const CACHE_ENDPOINT = "botmaker_sessions_raw";

export interface FetchSessionsResult {
  sessions: BmSession[];
  chunks: number;
  cachedChunks: number;
}

/**
 * Fetch every session whose window overlaps [from, to], in 24h chunks. Chunks
 * older than 24h are read from / written to MetaAnalyticsCache so repeat loads of
 * historical ranges are cheap. Future `to` is clamped (Botmaker 400s on future dates).
 */
export async function fetchWorkspaceSessions(
  workspaceId: string,
  conn: { accessToken: string; baseUrl: string },
  fromISO: string,
  toISO: string,
  signal?: AbortSignal
): Promise<FetchSessionsResult> {
  const bmConn: BmConnection = createConnection(conn.accessToken, conn.baseUrl);

  const fromMs = new Date(fromISO).getTime();
  const toMs = Math.min(new Date(toISO).getTime(), Date.now() - 5000);

  const safeCacheThreshold = Date.now() - DAY_MS;
  const chunks: { from: string; to: string; isPast: boolean; cacheKey: string }[] = [];
  let cursor = fromMs;
  while (cursor < toMs) {
    const chunkEnd = Math.min(cursor + DAY_MS, toMs);
    if (cursor < chunkEnd) {
      chunks.push({
        from: new Date(cursor).toISOString(),
        to: new Date(chunkEnd).toISOString(),
        isPast: chunkEnd <= safeCacheThreshold,
        cacheKey: `${new Date(cursor).toISOString()}_${new Date(chunkEnd).toISOString()}`,
      });
    }
    cursor += DAY_MS;
  }

  // Pre-resolve which past chunks are already cached (keys only, cheap).
  const pastKeys = chunks.filter((c) => c.isPast).map((c) => c.cacheKey);
  let cachedKeys = new Set<string>();
  if (pastKeys.length) {
    const rows = await prisma.metaAnalyticsCache.findMany({
      where: { workspaceId, endpoint: CACHE_ENDPOINT, paramsKey: { in: pastKeys } },
      select: { paramsKey: true },
    });
    cachedKeys = new Set(rows.map((r) => r.paramsKey));
  }

  const all: BmSession[] = [];
  let cachedChunks = 0;

  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    if (signal?.aborted) break;
    const batch = chunks.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (chunk) => {
        try {
          if (chunk.isPast && cachedKeys.has(chunk.cacheKey)) {
            const rec = await prisma.metaAnalyticsCache.findFirst({
              where: { workspaceId, endpoint: CACHE_ENDPOINT, paramsKey: chunk.cacheKey },
              select: { data: true },
            });
            if (rec?.data) return { chunk, sessions: rec.data as unknown as BmSession[], cached: true };
          }
          const sessions = await listSessions(bmConn, {
            from: chunk.from,
            to: chunk.to,
            includeMessages: true,
            includeEvents: true,
            maxPages: 10,
          });
          return { chunk, sessions, cached: false };
        } catch {
          return { chunk, sessions: [] as BmSession[], cached: false };
        }
      })
    );

    for (const r of results) {
      if (r.sessions.length) all.push(...r.sessions);
      if (r.cached) cachedChunks++;
      // Persist freshly-fetched past chunks for next time.
      if (r.chunk.isPast && !r.cached && r.sessions.length) {
        try {
          await prisma.metaAnalyticsCache.upsert({
            where: {
              workspaceId_endpoint_paramsKey: {
                workspaceId,
                endpoint: CACHE_ENDPOINT,
                paramsKey: r.chunk.cacheKey,
              },
            },
            update: { data: r.sessions as unknown as object },
            create: {
              workspaceId,
              endpoint: CACHE_ENDPOINT,
              paramsKey: r.chunk.cacheKey,
              data: r.sessions as unknown as object,
            },
          });
        } catch {
          /* cache write best-effort */
        }
      }
    }

    const madeApiCalls = results.some((r) => !r.cached);
    if (madeApiCalls && i + CONCURRENCY < chunks.length) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  // Deduplicate by session id (chunks overlap on late-updated sessions).
  const seen = new Set<string>();
  const deduped: BmSession[] = [];
  for (const s of all) {
    const id = s.id || "";
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    deduped.push(s);
  }

  return { sessions: deduped, chunks: chunks.length, cachedChunks };
}
