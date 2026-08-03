/**
 * app/api/whatsapp/test-call/route.ts
 *
 * POST — Realiza una llamada de prueba obligatoria a la API de WhatsApp de Meta
 *        para el proceso de revisión (whatsapp_business_messaging).
 *
 * Body (JSON):
 *   phoneNumberId : string  — El ID del número de WhatsApp emisor
 *   recipient     : string  — Número destinatario (código de país + número, sin "+")
 *   useTemplate   : boolean — true para enviar la plantilla default "hello_world" (recomendado)
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import { getWaCredentials, sendWaText, sendWaTemplate } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

const GRAPH_BASE = `https://graph.facebook.com/${env.META_API_VERSION}`;

const testCallSchema = z.object({
  phoneNumberId: z.string().min(5),
  recipient: z.string().min(7).max(20).regex(/^\d+$/, "El destinatario debe contener solo dígitos sin el signo +"),
  useTemplate: z.boolean().default(true),
});

export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const validation = await validateBody(req, testCallSchema);
  if (!validation.ok) return validation.response;

  const { workspaceId } = ctx;
  const { phoneNumberId, recipient, useTemplate } = validation.data;

  const creds = await getWaCredentials(workspaceId);
  if (!creds) {
    return apiError("WhatsApp Business no está conectado.", "WA_NOT_CONNECTED", 400);
  }

  try {
    // Seguridad: verificar que el phoneNumberId pertenece a la WABA del workspace
    const metaCheckRes = await fetch(
      `${GRAPH_BASE}/${creds.wabaId}/phone_numbers?fields=id&limit=100`,
      {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
        signal: AbortSignal.timeout(8000),
      }
    );
    const metaCheckData = await metaCheckRes.json();
    if (!metaCheckRes.ok) {
      logger.error("Error de verificación en test-call", { workspaceId, error: metaCheckData });
      return apiError("No se pudo verificar la pertenencia del número emisor.", "META_CHECK_FAILED", 502);
    }

    const belongs = (metaCheckData.data || []).some((n: { id: string }) => n.id === phoneNumberId);
    if (!belongs) {
      return apiError(
        "El número de teléfono emisor no pertenece a la cuenta de WhatsApp conectada.",
        "FORBIDDEN_PHONE",
        403
      );
    }

    // Configurar credenciales específicas para la línea elegida
    const lineCreds = {
      accessToken: creds.accessToken,
      wabaId: creds.wabaId,
      phoneNumberId, // Usar la línea específica seleccionada
    };

    let result;
    if (useTemplate) {
      // Intentar enviar la plantilla oficial de prueba "hello_world"
      result = await sendWaTemplate(lineCreds, {
        to: recipient,
        templateName: "hello_world",
        languageCode: "en_US",
        components: [],
      });
    } else {
      // Intentar enviar un mensaje de texto plano
      result = await sendWaText(lineCreds, {
        to: recipient,
        text: "Llamada de prueba de Zefirus para la revisión del permiso whatsapp_business_messaging.",
      });
    }

    logger.info("WhatsApp test call completado con éxito", {
      workspaceId,
      senderPhoneId: phoneNumberId,
      recipient,
      messageId: result.messageId,
      useTemplate,
    });

    return apiSuccess({
      success: true,
      messageId: result.messageId,
      to: result.to,
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  } catch (err: any) {
    logger.error("Error realizando test call de WhatsApp", {
      workspaceId,
      senderPhoneId: phoneNumberId,
      recipient,
      error: err,
    });
    return apiError(
      err?.message ?? "Error enviando el mensaje de prueba. Asegúrate de que el número receptor esté registrado como número de pruebas si estás en modo sandbox.",
      "TEST_CALL_FAILED",
      502
    );
  }
});
