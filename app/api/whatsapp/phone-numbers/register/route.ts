import { NextRequest } from "next/server";
import { z } from "zod";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import { getWaCredentials } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";

const GRAPH_BASE = "https://graph.facebook.com/v20.0";

const registerSchema = z.object({
  phoneNumberId: z.string().min(5),
  pin: z.string().length(6, "El PIN debe ser de 6 dígitos"),
});

export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const validation = await validateBody(req, registerSchema);
  if (!validation.ok) return validation.response;

  const { workspaceId } = ctx;
  const { phoneNumberId, pin } = validation.data;

  const creds = await getWaCredentials(workspaceId);
  if (!creds) {
    return apiError("WhatsApp Business no está conectado.", "WA_NOT_CONNECTED", 400);
  }

  try {
    // Register the phone number using the Meta Graph API
    const url = `${GRAPH_BASE}/${phoneNumberId}/register`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        pin: pin,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      logger.error("Error al registrar el número en Meta", { workspaceId, phoneNumberId, error: data });
      return apiError(
        data?.error?.message ?? "Error al registrar el número de WhatsApp.",
        "META_REGISTER_ERROR",
        res.status
      );
    }

    logger.info("Número de WhatsApp registrado exitosamente", { workspaceId, phoneNumberId });

    return apiSuccess({ success: true, data });
  } catch (err) {
    logger.error("Excepción al registrar línea de WhatsApp", { workspaceId, phoneNumberId, error: err });
    return apiError("Error interno al registrar la línea de WhatsApp.", "INTERNAL_ERROR", 500);
  }
});
