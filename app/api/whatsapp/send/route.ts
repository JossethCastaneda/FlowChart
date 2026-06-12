/**
 * app/api/whatsapp/send/route.ts
 *
 * POST — Envía un mensaje de WhatsApp desde el Inbox o desde cualquier
 * componente de Sodare hacia un número externo.
 *
 * Body (JSON):
 *   type: "text" | "template"
 *   to: string              — número destino con código de país, sin "+"
 *   text?: string           — requerido si type === "text"
 *   templateName?: string   — requerido si type === "template"
 *   languageCode?: string   — default "es_MX"
 *   components?: WaTemplateComponent[]
 *
 * Requiere sesión + workspace activo (withWorkspace).
 * Las credenciales de WhatsApp se leen desde Integration por workspace.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import { getWaCredentials, sendWaText, sendWaTemplate } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";

const sendSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    to: z.string().min(7).max(20),
    text: z.string().min(1).max(4096),
    previewUrl: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("template"),
    to: z.string().min(7).max(20),
    templateName: z.string().min(1),
    languageCode: z.string().optional(),
    components: z.array(z.unknown()).optional(),
  }),
]);

export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const validation = await validateBody(req, sendSchema);
  if (!validation.ok) return validation.response;

  const { workspaceId } = ctx;
  const data = validation.data;

  // Resolver credenciales de WhatsApp para este workspace
  const creds = await getWaCredentials(workspaceId);
  if (!creds) {
    return apiError(
      "WhatsApp Business no está conectado a este workspace. Conecta tu número en Integraciones.",
      "WA_NOT_CONNECTED",
      400,
    );
  }

  try {
    let result;

    if (data.type === "text") {
      result = await sendWaText(creds, {
        to: data.to,
        text: data.text,
        previewUrl: data.previewUrl,
      });
    } else {
      result = await sendWaTemplate(creds, {
        to: data.to,
        templateName: data.templateName,
        languageCode: data.languageCode,
        components: data.components as Parameters<typeof sendWaTemplate>[1]["components"],
      });
    }

    logger.info("WA mensaje enviado", { workspaceId, type: data.type, to: data.to });

    return apiSuccess({
      messageId: result.messageId,
      to: result.to,
      type: data.type,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error enviando mensaje";
    logger.error("WA send error", { workspaceId, error: err });
    return apiError(msg, "WA_SEND_ERROR", 502);
  }
});
