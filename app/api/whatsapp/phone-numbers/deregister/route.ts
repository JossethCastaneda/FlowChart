import { NextRequest } from "next/server";
import { z } from "zod";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import { getWaCredentials, phoneBelongsToWaba } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

const GRAPH_BASE = `https://graph.facebook.com/${env.META_API_VERSION}`;

const deregisterSchema = z.object({
  phoneNumberId: z.string().min(5),
});

export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const validation = await validateBody(req, deregisterSchema);
  if (!validation.ok) return validation.response;

  const { workspaceId } = ctx;
  const { phoneNumberId } = validation.data;

  const creds = await getWaCredentials(workspaceId);
  if (!creds) {
    return apiError("WhatsApp Business no está conectado.", "WA_NOT_CONNECTED", 400);
  }

  // SEGURIDAD: deregister es destructivo (corta la mensajería de una línea). Verificar
  // que el número pertenece a la WABA del workspace antes de operar sobre él.
  if (!(await phoneBelongsToWaba(creds, phoneNumberId))) {
    return apiError(
      "El número indicado no pertenece a la cuenta de WhatsApp conectada.",
      "FORBIDDEN_PHONE",
      403,
    );
  }

  try {
    // Deregister the phone number using the Meta Graph API
    const url = `${GRAPH_BASE}/${phoneNumberId}/deregister`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    if (!res.ok) {
      logger.error("Error al eliminar registro del número en Meta", { workspaceId, phoneNumberId, error: data });
      return apiError(
        data?.error?.message ?? "Error al eliminar el registro del número de WhatsApp.",
        "META_DEREGISTER_ERROR",
        res.status
      );
    }

    logger.info("Número de WhatsApp eliminado del registro exitosamente", { workspaceId, phoneNumberId });

    return apiSuccess({ success: true, data });
  } catch (err) {
    logger.error("Excepción al eliminar registro de línea de WhatsApp", { workspaceId, phoneNumberId, error: err });
    return apiError("Error interno al eliminar el registro de la línea de WhatsApp.", "INTERNAL_ERROR", 500);
  }
});
