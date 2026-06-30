/**
 * Chunked + cached fetch of Botmaker /sessions for a workspace over a time range.
 * Extracted so the new Bot Analytics dashboard route and any future consumer share
 * ONE robust fetch path (24h day-chunks, concurrency-limited, past chunks cached in
 * MetaAnalyticsCache). Returns the raw BmSession[] for pure computation downstream.
 */
import prisma from "@/lib/prisma";
import { createConnection, listSessions } from "@/lib/botmaker-api";
import type { BmConnection, BmSession, ListSessionsMeta } from "@/lib/botmaker-api";

const DAY_MS = 24 * 60 * 60 * 1000;
const CONCURRENCY = 3; // Reduced to prevent rate limits
const CACHE_ENDPOINT = "botmaker_sessions_raw_v5";

export interface FetchSessionsResult {
  sessions: BmSession[];
  chunks: number;
  cachedChunks: number;
  /** Chunks (días) que lanzaron por completo → 0 sesiones para ese día. */
  failedChunks: number;
  /** Chunks descargados de forma parcial (truncado por error o tope de páginas). */
  incompleteChunks: number;
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
  forceRefresh: boolean = false,
  signal?: AbortSignal
): Promise<FetchSessionsResult> {
  const bmConn: BmConnection = createConnection(conn.accessToken, conn.baseUrl);

  const fromMs = new Date(fromISO).getTime();
  const toMs = Math.min(new Date(toISO).getTime(), Date.now() - 5000);

  const safeCacheThreshold = Date.now() - DAY_MS;
  // Días "asentados" (>48h): sus sesiones ya cerraron/tipificaron, así que es
  // seguro servirlos de caché. Los días pasados pero RECIENTES (24–48h) se
  // revalidan (re-fetch) porque pueden tener sesiones que cerraron después de
  // haberse cacheado (A4-TTL de la auditoría).
  const settledThreshold = Date.now() - 2 * DAY_MS;
  const chunks: { from: string; to: string; isPast: boolean; settled: boolean; cacheKey: string }[] = [];
  let cursor = fromMs;
  while (cursor < toMs) {
    const chunkEnd = Math.min(cursor + DAY_MS, toMs);
    if (cursor < chunkEnd) {
      chunks.push({
        from: new Date(cursor).toISOString(),
        to: new Date(chunkEnd).toISOString(),
        isPast: chunkEnd <= safeCacheThreshold,
        settled: chunkEnd <= settledThreshold,
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
  let failedChunks = 0;
  let incompleteChunks = 0;

  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    if (signal?.aborted) break;
    const batch = chunks.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (chunk) => {
        try {
          if (chunk.settled && cachedKeys.has(chunk.cacheKey) && !forceRefresh) {
            const rec = await prisma.metaAnalyticsCache.findFirst({
              where: { workspaceId, endpoint: CACHE_ENDPOINT, paramsKey: chunk.cacheKey },
              select: { data: true },
            });
            if (rec?.data) return { chunk, sessions: rec.data as unknown as BmSession[], cached: true, complete: true, failed: false };
          }
          const meta: ListSessionsMeta = { complete: true, pages: 0, reachedCap: false, truncated: false };
          const sessions = await listSessions(bmConn, {
            from: chunk.from,
            to: chunk.to,
            includeMessages: true,
            includeEvents: true,
            maxPages: 100, // 100 pages * 200ms delay = 20s, well within 60s Vercel limit
          }, meta);
          return { chunk, sessions, cached: false, complete: meta.complete, failed: false };
        } catch {
          // El día ENTERO falló → no lo mezclamos como "0 sesiones reales".
          return { chunk, sessions: [] as BmSession[], cached: false, complete: false, failed: true };
        }
      })
    );

    for (const r of results) {
      if (r.sessions.length) all.push(...r.sessions);
      if (r.cached) cachedChunks++;
      else if (r.failed) failedChunks++;
      else if (!r.complete) incompleteChunks++;
      // Persist SOLO chunks pasados COMPLETOS (no congelar parciales/truncados).
      if (r.chunk.isPast && !r.cached && r.complete && r.sessions.length) {
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

  // Dedup por id conservando la copia MÁS COMPLETA (más mensajes+eventos), no la
  // primera: una sesión que abarca dos chunks aparece en ambos, y la copia del
  // chunk viejo/cacheado tiene menos eventos y sin el outcome final (A6 auditoría).
  const richness = (s: BmSession) => (s.messages?.length || 0) + (s.events?.length || 0);
  const byId = new Map<string, BmSession>();
  const noId: BmSession[] = [];
  for (const s of all) {
    const id = s.id || "";
    if (!id) { noId.push(s); continue; }
    const cur = byId.get(id);
    if (!cur || richness(s) > richness(cur)) byId.set(id, s);
  }
  const deduped: BmSession[] = [...byId.values(), ...noId];

  return { sessions: deduped, chunks: chunks.length, cachedChunks, failedChunks, incompleteChunks };
}
