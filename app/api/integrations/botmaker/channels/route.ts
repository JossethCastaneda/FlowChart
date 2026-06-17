import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { getBotmakerConnection, listBotmakerChannels } from "@/lib/botmaker";

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
    const all = (await listBotmakerChannels(conn)).filter((c) => c.active);
    const uniq = (arr: { label: string; value: string }[]) => {
      const seen = new Set<string>();
      return arr.filter((o) => o.value && !seen.has(o.value) && (seen.add(o.value), true));
    };
    const channels = {
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
    return apiSuccess({ connected: true, channels });
  } catch (error) {
    logger.error("botmaker channels: failed", { workspaceId: ctx.workspaceId, error });
    return apiSuccess({ connected: true, channels: EMPTY, error: "No se pudieron cargar los canales de Botmaker" });
  }
});

export const maxDuration = 60;
