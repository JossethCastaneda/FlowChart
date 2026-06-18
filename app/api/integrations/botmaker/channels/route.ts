import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { getBotmakerConnection, listBotmakerChannels, getCachedBotmakerChannels, type BmChannelInfo } from "@/lib/botmaker";

/** Agrupa los canales (en vivo o de cache) en la forma que consume el formulario. */
function groupChannels(all: BmChannelInfo[]) {
  const active = all.filter((c) => c.active);
  const uniq = (arr: { label: string; value: string }[]) => {
    const seen = new Set<string>();
    return arr.filter((o) => o.value && !seen.has(o.value) && (seen.add(o.value), true));
  };
  return {
    whatsapp: uniq(
      active.filter((c) => c.canonical === "whatsapp").map((c) => ({
        label: c.number ? (c.name ? `${c.number} · ${c.name}` : c.number) : c.name,
        value: c.number || c.name,
      }))
    ),
    webchat: uniq(active.filter((c) => c.canonical === "webchat").map((c) => ({ label: c.name || c.id, value: c.id }))),
    instagram: uniq(active.filter((c) => c.canonical === "instagram").map((c) => ({ label: c.name, value: c.name }))),
    facebook: uniq(
      active.filter((c) => c.canonical === "facebook" || c.canonical === "messenger").map((c) => ({ label: c.name, value: c.name }))
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

export const GET = withWorkspace(async (_req: NextRequest, ctx) => {
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) return apiSuccess({ connected: false, channels: EMPTY });

  try {
    // En vivo primero; si Botmaker no devuelve nada, caemos al cache poblado al
    // conectar (extracción en /api/workspace/integrations) o por el sync workflow.
    let all = await listBotmakerChannels(conn);
    let source = "live";
    if (all.length === 0) {
      all = await getCachedBotmakerChannels(ctx.workspaceId);
      source = "cache";
    }
    return apiSuccess({ connected: true, channels: groupChannels(all), source });
  } catch (error) {
    // La API en vivo falló → último intento con los canales cacheados al conectar.
    const cached = await getCachedBotmakerChannels(ctx.workspaceId);
    if (cached.length > 0) {
      return apiSuccess({ connected: true, channels: groupChannels(cached), source: "cache" });
    }
    logger.error("botmaker channels: failed", { workspaceId: ctx.workspaceId, error });
    return apiSuccess({ connected: true, channels: EMPTY, error: "No se pudieron cargar los canales de Botmaker" });
  }
});

export const maxDuration = 60;
