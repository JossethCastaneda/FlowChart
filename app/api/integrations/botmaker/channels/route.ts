import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { getBotmakerConnection, fetchBotmakerChannels, getCachedBotmakerChannels, type BmChannelInfo } from "@/lib/botmaker";

/**
 * Agrupa los canales (en vivo o de cache) en la forma que consume el formulario.
 * NO filtra por `active` (antes descartaba inactivos en silencio): el canónico ya
 * viene inferido en el parser, así que ningún canal devuelto por Botmaker se pierde.
 */
function groupChannels(all: BmChannelInfo[]) {
  const uniq = (arr: { label: string; value: string }[]) => {
    const seen = new Set<string>();
    return arr.filter((o) => o.value && !seen.has(o.value) && (seen.add(o.value), true));
  };
  return {
    whatsapp: uniq(
      all.filter((c) => c.canonical === "whatsapp").map((c) => ({
        label: c.number ? (c.name ? `${c.number} · ${c.name}` : c.number) : c.name,
        value: c.number || c.name,
      }))
    ),
    webchat: uniq(all.filter((c) => c.canonical === "webchat").map((c) => ({ label: c.name || c.id, value: c.id }))),
    instagram: uniq(all.filter((c) => c.canonical === "instagram").map((c) => ({ label: c.name, value: c.name }))),
    facebook: uniq(
      all.filter((c) => c.canonical === "facebook" || c.canonical === "messenger").map((c) => ({ label: c.name, value: c.name }))
    ),
  };
}

// GET /api/integrations/botmaker/channels
// Lista los canales del bot (números WhatsApp, webchats, Instagram, Facebook) de
// la cuenta Botmaker del workspace, ya agrupados por tipo, para AUTOLLENAR el
// formulario "Nuevo Proyecto" en lugar de teclearlos a mano.
//
// Cada opción: { label (legible), value (lo que se guarda en el proyecto) }.
//   - whatsapp → value = número de línea
//   - webchat  → value = id del canal (ID del widget)
//   - instagram/facebook → value = nombre del canal
const EMPTY = { whatsapp: [], webchat: [], instagram: [], facebook: [] };

export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  // `?debug=1` agrega un bloque _debug (no sensible) con rawCount / platforms /
  // httpStatus para diagnosticar por qué no aparecen canales sin entrar a los logs.
  const debug = req.nextUrl.searchParams.get("debug") === "1";

  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) {
    return apiSuccess({ connected: false, channels: EMPTY, ...(debug ? { _debug: { reason: "no_botmaker_connection" } } : {}) });
  }

  try {
    // En vivo primero; si Botmaker no devuelve nada, caemos al cache poblado al
    // conectar (extracción en /api/workspace/integrations) o por el sync workflow.
    const result = await fetchBotmakerChannels(conn);
    let channels = result.channels;
    let source = "live";
    if (channels.length === 0) {
      const cached = await getCachedBotmakerChannels(ctx.workspaceId);
      if (cached.length > 0) { channels = cached; source = "cache"; }
    }
    return apiSuccess({
      connected: true,
      channels: groupChannels(channels),
      source,
      ...(debug ? { _debug: {
        httpStatus: result.httpStatus,   // status de api.botmaker.com/v2.0/channels
        rawCount: result.rawCount,        // items que devolvió Botmaker (rama A si 0)
        parsed: result.channels.length,
        activeCount: result.channels.filter((c) => c.active).length,
        platforms: result.platforms,      // valores distintos de platform (rama C)
        source,
      } } : {}),
    });
  } catch (error) {
    // La API en vivo falló → último intento con los canales cacheados al conectar.
    const cached = await getCachedBotmakerChannels(ctx.workspaceId);
    if (cached.length > 0) {
      return apiSuccess({ connected: true, channels: groupChannels(cached), source: "cache" });
    }
    logger.error("botmaker channels: failed", { workspaceId: ctx.workspaceId, error });
    return apiSuccess({
      connected: true,
      channels: EMPTY,
      error: "No se pudieron cargar los canales de Botmaker",
      ...(debug ? { _debug: { error: error instanceof Error ? error.message : String(error) } } : {}),
    });
  }
});

export const maxDuration = 60;
