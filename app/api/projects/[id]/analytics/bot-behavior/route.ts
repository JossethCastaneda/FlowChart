import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { cdmxRange } from "@/lib/crm/timezone";
import { resolveProjectScope } from "@/lib/analytics/project-scope.server";
import { getCariCredentials, computeCariResults, EMPTY_CARI_RESULTS } from "@/lib/crm/cari";
import {
  getBotmakerConnection,
  listSessions,
  listBotmakerChannels,
  canonicalPlatform,
  computeBotBehavior,
  computeBehaviorByBot,
  EMPTY_BOT_BEHAVIOR,
  type BmSession,
  type BmChannelInfo,
} from "@/lib/botmaker";

/**
 * GET /api/projects/[id]/analytics/bot-behavior?days=30&channel=whatsapp
 *
 * Análisis PROFUNDO de comportamiento del bot, acotado al proyecto y a su única
 * plataforma analítica (Botmaker o Cari, nunca ambas — regla de producto).
 *
 *   - Botmaker: datos a nivel mensaje/evento → tipos de mensaje, botones
 *     mostrados/elegidos, errores, tiempo a cierre de venta y funnel del orden
 *     en que el bot pide datos (`computeBotBehavior`, en vivo sobre /sessions).
 *   - Cari: solo reportes agregados → se devuelve `cari` (contención, abandono,
 *     frases sin respuesta, errores) y `behavior: null`. La UI degrada con elegancia.
 *
 * Ventana en hora CDMX (lib/crm/timezone.ts): "últimos N días".
 */
export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const days = Math.max(1, Math.min(180, parseInt(req.nextUrl.searchParams.get("days") || "30", 10) || 30));
  const channel = (req.nextUrl.searchParams.get("channel") || "").toLowerCase();

  const scope = await resolveProjectScope(ctx.workspaceId, id);
  if (!scope) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);

  const provider = scope.providers[0] || null;
  const proj = await prisma.project.findFirst({ where: { id, workspaceId: ctx.workspaceId }, select: { botFlowType: true } });
  const flowType = proj?.botFlowType || null;

  if (provider === "botmaker") {
    const conn = await getBotmakerConnection(ctx.workspaceId);
    if (!conn) {
      return apiSuccess({ provider, connected: false, channel: channel || "all", behavior: EMPTY_BOT_BEHAVIOR, byBot: [], cari: null });
    }
    const range = cdmxRange(days);
    try {
      // Canales del bot: alimentan el mapa channelId→platform (filtro por canal)
      // y el desglose POR BOT (cada canal = un bot).
      let channels: BmChannelInfo[] = [];
      try { channels = await listBotmakerChannels(conn); } catch { /* canales best-effort */ }
      const channelPlatform = new Map<string, string>();
      for (const c of channels) if (c.id) channelPlatform.set(c.id, c.platform);

      const allSessions = await listSessions(conn.accessToken, range.fromISO, range.toISO, 6, conn.baseUrl);

      // Desglose por bot sobre el universo COMPLETO (sin filtrar por canal), para
      // que la vista "Por bot" sea total. El Funnel 2 por bot usa el tipo de flujo
      // del proyecto como default (mapeo explícito por canal = follow-up).
      const byBot = computeBehaviorByBot(allSessions, channels, { defaultFlowType: flowType });

      // Filtro por canal canónico (whatsapp/instagram/facebook/messenger) cuando aplica.
      let sessions = allSessions;
      const canonReq = ["whatsapp", "instagram", "facebook", "messenger"].includes(channel) ? channel : null;
      if (canonReq) {
        sessions = sessions.filter((s: BmSession) => {
          const cid = s.chat?.chat?.channelId;
          return cid ? canonicalPlatform(channelPlatform.get(cid)) === canonReq : false;
        });
      }

      const behavior = computeBotBehavior(sessions, undefined, flowType);
      return apiSuccess({
        provider,
        connected: true,
        channel: channel || "all",
        flowType,
        range: { from: range.fromISO, to: range.toISO, timezone: "America/Mexico_City" },
        behavior,
        byBot,
        cari: null,
      });
    } catch (error) {
      logger.error("bot-behavior: botmaker failed", { workspaceId: ctx.workspaceId, error });
      return apiError("Error al consultar Botmaker", "BOTMAKER_ERROR", 502);
    }
  }

  if (provider === "cari_ai") {
    try {
      const creds = await getCariCredentials(ctx.workspaceId);
      const cari = creds ? await computeCariResults(creds, days) : EMPTY_CARI_RESULTS;
      return apiSuccess({ provider, connected: !!creds, channel: channel || "all", behavior: null, byBot: [], cari });
    } catch (error) {
      logger.error("bot-behavior: cari failed", { workspaceId: ctx.workspaceId, error });
      return apiError("Error al consultar Cari AI", "CARI_ERROR", 502);
    }
  }

  // Sin plataforma analítica asociada.
  return apiSuccess({ provider: null, connected: false, channel: channel || "all", behavior: EMPTY_BOT_BEHAVIOR, byBot: [], cari: null });
});

// La vista EN VIVO descarga sesiones de Botmaker (paginadas) o reportes de Cari
// (hasta 10k filas × varios reportes). Con 60s se agota → 504 "Vercel Runtime
// Timeout" → HTML de error → la UI se queda cargando. Fluid Compute permite 300s.
export const maxDuration = 300;
