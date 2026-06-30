import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getBotmakerConnection } from "@/lib/botmaker";
import { createConnection, listChannels, bmFetch } from "@/lib/botmaker-api";
import { fetchWorkspaceSessions } from "@/lib/botmaker/fetch-sessions";
import { computeDashboard, diffKpis } from "@/lib/botmaker/insights";
import { resolveProjectChannelIds } from "@/lib/botmaker/project-channels";
import { cdmxRange } from "@/lib/crm/timezone";
import type { ChannelLite, VarDef } from "@/lib/botmaker/insights";

/**
 * GET /api/botmaker/analytics/dashboard?from&to&channelId?
 *
 * Single comprehensive payload for the rebuilt Bot Analytics dashboard. Computed
 * live from Botmaker /sessions (events + messages) plus /channels, /variables and
 * /intents (bot names). Slow-changing /variables + intent bot-map are TTL-cached.
 */

const META_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const META_ENDPOINT = "botmaker_meta";

interface MetaCache { variables: VarDef[]; botNames: Record<string, string> }

async function loadMeta(
  workspaceId: string,
  conn: { accessToken: string; baseUrl: string }
): Promise<MetaCache> {
  const cached = await prisma.metaAnalyticsCache.findUnique({
    where: { workspaceId_endpoint_paramsKey: { workspaceId, endpoint: META_ENDPOINT, paramsKey: "v1" } },
    select: { data: true, updatedAt: true },
  });
  if (cached?.data && Date.now() - new Date(cached.updatedAt).getTime() < META_TTL_MS) {
    return cached.data as unknown as MetaCache;
  }

  const bm = createConnection(conn.accessToken, conn.baseUrl);

  // /variables → custom-variable dictionary
  let variables: VarDef[] = [];
  try {
    const res = await bmFetch(bm, "/variables", {}, 1);
    if (res.ok) {
      const body = (await res.json().catch(() => ({}))) as { variables?: unknown };
      const arr = Array.isArray(body.variables) ? body.variables : [];
      variables = arr
        .map((v) => v as Record<string, unknown>)
        .filter((v) => typeof v.name === "string" && (v.name as string).trim())
        .map((v) => ({ name: String(v.name), type: String(v.type || "string"), category: v.category ? String(v.category) : undefined }));
    }
  } catch { /* best-effort */ }

  // /intents → botId → bot name map (bounded pages)
  const botNames: Record<string, string> = {};
  try {
    let next: string | null = "/intents";
    let pages = 0;
    while (next && pages < 8) {
      const res = await bmFetch(bm, next, {}, 1);
      if (!res.ok) break;
      const body = (await res.json().catch(() => ({}))) as { items?: unknown; nextPage?: string | null };
      const items = Array.isArray(body.items) ? body.items : [];
      for (const it of items) {
        const bot = (it as { bot?: { id?: unknown; name?: unknown } }).bot;
        if (bot?.id && bot?.name) botNames[String(bot.id)] = String(bot.name);
      }
      next = body.nextPage || null;
      pages++;
    }
  } catch { /* best-effort */ }

  const meta: MetaCache = { variables, botNames };
  try {
    await prisma.metaAnalyticsCache.upsert({
      where: { workspaceId_endpoint_paramsKey: { workspaceId, endpoint: META_ENDPOINT, paramsKey: "v1" } },
      update: { data: meta as unknown as object },
      create: { workspaceId, endpoint: META_ENDPOINT, paramsKey: "v1", data: meta as unknown as object },
    });
  } catch { /* best-effort */ }

  return meta;
}

export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) return apiError("Botmaker no está configurado.", "NOT_CONFIGURED", 503);

  const sp = req.nextUrl.searchParams;
  // Default anclado a días CDMX (no `now - 7d` crudo): evita que el primer/último
  // día de la serie queden cortados a media jornada (D4 de la auditoría).
  const def = cdmxRange(7);
  // D4 + D3 (auditoría): default anclado a CDMX y VALIDACIÓN de params — un
  // from/to malformado (NaN) anularía el filtro temporal y vaciaría el tablero en
  // silencio; ante un valor no parseable, caemos al default en vez de romper.
  const toParam = sp.get("to");
  const fromParam = sp.get("from");
  const to = toParam && Number.isFinite(Date.parse(toParam)) ? toParam : def.toISO;
  const from = fromParam && Number.isFinite(Date.parse(fromParam)) ? fromParam : def.fromISO;
  const channelId = sp.get("channelId") || null;
  const projectId = sp.get("projectId") || null;
  const timezone = sp.get("timezone") || process.env.APP_TIMEZONE || "America/Mexico_City";
  const forceRefresh = sp.get("forceRefresh") === "true";
  const includeTest = sp.get("includeTest") === "true";

  // Ventana previa de IGUAL longitud (para deltas ▲▼). Inmediatamente anterior.
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  const span = Number.isFinite(fromMs) && Number.isFinite(toMs) ? toMs - fromMs : 0;
  const prevFrom = span > 0 ? new Date(fromMs - span).toISOString() : from;
  const prevTo = from;

  try {
    // Cuando el dashboard se embebe dentro de un proyecto, resolvemos los canales
    // de Botmaker que le pertenecen (auto-mapeo) y acotamos TODO a ese set.
    const project = projectId
      ? await prisma.project.findFirst({
          where: { id: projectId, workspaceId: ctx.workspaceId },
          select: { whatsapp: true, instagram: true, fanpage: true, webchat: true },
        })
      : null;

    // Fetch ventana actual + previa (para deltas) + metadatos, en paralelo. La
    // previa cae enteramente en el pasado → chunks cacheados (coste marginal bajo).
    const [fetched, prevFetch, channelsRaw, meta] = await Promise.all([
      fetchWorkspaceSessions(ctx.workspaceId, conn, from, to, forceRefresh, req.signal),
      span > 0
        ? fetchWorkspaceSessions(ctx.workspaceId, conn, prevFrom, prevTo, false, req.signal).catch(() => null)
        : Promise.resolve(null),
      listChannels(createConnection(conn.accessToken, conn.baseUrl)),
      loadMeta(ctx.workspaceId, conn),
    ]);
    const sessions = fetched.sessions;

    // Set de canales del proyecto (vacío ⇒ sin auto-scope: fallback a todo el workspace).
    const projectChannelIds = project ? resolveProjectChannelIds(project, channelsRaw) : [];
    const autoScoped = projectChannelIds.length > 0;
    const allowSet = autoScoped ? new Set(projectChannelIds) : null;

    const channels: ChannelLite[] = channelsRaw.map((c) => ({
      id: c.id, name: c.name, platform: c.platform, canonical: c.canonical,
    }));
    // Las opciones del selector quedan acotadas a los canales del proyecto.
    const scopedChannels = allowSet ? channels.filter((c) => allowSet.has(c.id)) : channels;

    const baseOpts = {
      timezone, channels,
      botNames: meta.botNames,
      variables: meta.variables,
      channelId,
      channelIds: autoScoped ? projectChannelIds : null,
      excludeTestBots: !includeTest,
    };

    const data = computeDashboard(sessions, { from, to, ...baseOpts });

    // Deltas vs ventana previa (best-effort: si falla, el tablero va sin ▲▼).
    if (prevFetch && prevFetch.sessions.length) {
      try {
        const prev = computeDashboard(prevFetch.sessions, { from: prevFrom, to: prevTo, ...baseOpts });
        data.kpisPrev = prev.kpis;
        data.kpiDeltas = diffKpis(data.kpis, prev.kpis);
        const prevByBot = new Map(prev.botPerf.map((b) => [b.botId, b]));
        for (const b of data.botPerf) {
          const pb = prevByBot.get(b.botId);
          if (pb) b.delta = {
            sessions: b.sessions - pb.sessions,
            conversionRate: Math.round((b.conversionRate - pb.conversionRate) * 10) / 10,
          };
        }
      } catch (e) {
        console.warn("[BOT ANALYTICS] deltas omitidos:", e instanceof Error ? e.message : e);
      }
    }

    // Cobertura de descarga: para que la UI distinga un total real de uno parcial
    // (días caídos / paginación truncada), en vez de presentar el parcial como exacto.
    const download = {
      chunks: fetched.chunks,
      cached: fetched.cachedChunks,
      failedChunks: fetched.failedChunks,
      incompleteChunks: fetched.incompleteChunks,
      complete: fetched.failedChunks === 0 && fetched.incompleteChunks === 0,
    };

    return apiSuccess({
      ...data,
      channelOptions: scopedChannels.map((c) => ({ id: c.id, name: c.name, platform: c.platform })),
      channelScope: { projectId, autoScoped, resolved: projectChannelIds.length },
      download,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[BOT ANALYTICS DASHBOARD]", message);
    return apiError(`Error al calcular analíticas: ${message}`, "UPSTREAM_ERROR", 502);
  }
});

export const maxDuration = 300;
