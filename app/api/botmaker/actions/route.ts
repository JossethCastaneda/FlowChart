import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getBotmakerConnection, createConnection } from "@/lib/botmaker-api";
import {
  sendMessage,
  sendImage,
  sendDocument,
  sendButtons,
  triggerIntent,
  sendWhatsAppTemplate,
} from "@/lib/botmaker-api";
import { z } from "zod";

/**
 * POST /api/botmaker/actions
 *
 * Envía mensajes, templates o dispara intents a través de la API de Botmaker.
 * Requiere workspace con integración Botmaker conectada.
 *
 * Body (JSON):
 *   action: "send-message" | "send-image" | "send-document" | "send-buttons"
 *           | "trigger-intent" | "send-template"
 *   ... campos según la acción.
 */

const BasePlatformSchema = z.object({
  chatPlatform: z.string().min(1),
  chatChannelId: z.string().optional(),
  chatChannelNumber: z.string().optional(),
  platformContactId: z.string().min(1),
});

const SendMessageSchema = BasePlatformSchema.extend({
  action: z.literal("send-message"),
  messageText: z.string().min(1),
  webhookPayload: z.string().optional(),
});

const SendImageSchema = BasePlatformSchema.extend({
  action: z.literal("send-image"),
  imageUrl: z.string().url(),
  caption: z.string().optional(),
});

const SendDocumentSchema = BasePlatformSchema.extend({
  action: z.literal("send-document"),
  documentUrl: z.string().url(),
  fileName: z.string().optional(),
  caption: z.string().optional(),
});

const SendButtonsSchema = BasePlatformSchema.extend({
  action: z.literal("send-buttons"),
  messageText: z.string().min(1),
  buttons: z.array(z.object({ id: z.string(), title: z.string() })).min(1),
});

const TriggerIntentSchema = BasePlatformSchema.extend({
  action: z.literal("trigger-intent"),
  ruleNameOrId: z.string().min(1),
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  webhookPayload: z.string().optional(),
});

const SendTemplateSchema = z.object({
  action: z.literal("send-template"),
  channelNumber: z.string().min(1),
  contactPhone: z.string().min(1),
  templateName: z.string().min(1),
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

const ActionSchema = z.discriminatedUnion("action", [
  SendMessageSchema,
  SendImageSchema,
  SendDocumentSchema,
  SendButtonsSchema,
  TriggerIntentSchema,
  SendTemplateSchema,
]);

export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) return apiError("Botmaker no está conectado en este workspace", "NOT_CONNECTED", 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Cuerpo de solicitud inválido (JSON requerido)", "PARSE_ERROR", 400);
  }

  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      `Datos inválidos: ${parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")}`,
      "VALIDATION_ERROR",
      400
    );
  }

  const data = parsed.data;
  const bmConn = createConnection(conn.accessToken, conn.baseUrl);

  switch (data.action) {
    case "send-message": {
      if (!data.chatChannelId) return apiError("chatChannelId es requerido para send-message", "MISSING_FIELD", 400);
      const result = await sendMessage(bmConn, {
        chatPlatform: data.chatPlatform,
        chatChannelId: data.chatChannelId,
        platformContactId: data.platformContactId,
        messageText: data.messageText,
        webhookPayload: data.webhookPayload,
      });
      if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
      return apiSuccess({ action: "send-message", messageId: result.messageId });
    }

    case "send-image": {
      if (!data.chatChannelId) return apiError("chatChannelId es requerido para send-image", "MISSING_FIELD", 400);
      const result = await sendImage(bmConn, {
        chatPlatform: data.chatPlatform,
        chatChannelId: data.chatChannelId,
        platformContactId: data.platformContactId,
        imageUrl: data.imageUrl,
        caption: data.caption,
      });
      if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
      return apiSuccess({ action: "send-image", messageId: result.messageId });
    }

    case "send-document": {
      if (!data.chatChannelId) return apiError("chatChannelId es requerido para send-document", "MISSING_FIELD", 400);
      const result = await sendDocument(bmConn, {
        chatPlatform: data.chatPlatform,
        chatChannelId: data.chatChannelId,
        platformContactId: data.platformContactId,
        documentUrl: data.documentUrl,
        fileName: data.fileName,
        caption: data.caption,
      });
      if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
      return apiSuccess({ action: "send-document", messageId: result.messageId });
    }

    case "send-buttons": {
      if (!data.chatChannelId) return apiError("chatChannelId es requerido para send-buttons", "MISSING_FIELD", 400);
      const result = await sendButtons(bmConn, {
        chatPlatform: data.chatPlatform,
        chatChannelId: data.chatChannelId,
        platformContactId: data.platformContactId,
        messageText: data.messageText,
        buttons: data.buttons,
      });
      if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
      return apiSuccess({ action: "send-buttons", messageId: result.messageId });
    }

    case "trigger-intent": {
      if (!data.chatChannelNumber) return apiError("chatChannelNumber es requerido para trigger-intent", "MISSING_FIELD", 400);
      const result = await triggerIntent(bmConn, {
        chatPlatform: data.chatPlatform,
        chatChannelNumber: data.chatChannelNumber,
        platformContactId: data.platformContactId,
        ruleNameOrId: data.ruleNameOrId,
        variables: data.variables as Record<string, string | number | boolean | null> | undefined,
        webhookPayload: data.webhookPayload,
      });
      if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
      return apiSuccess({ action: "trigger-intent", intentId: result.intentId, conversationId: result.conversationId });
    }

    case "send-template": {
      const result = await sendWhatsAppTemplate(bmConn, {
        channelNumber: data.channelNumber,
        contactPhone: data.contactPhone,
        templateName: data.templateName,
        variables: data.variables as Record<string, string | number | boolean | null> | undefined,
      });
      if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
      return apiSuccess({ action: "send-template", intentId: result.intentId, conversationId: result.conversationId });
    }
  }
});

export const maxDuration = 60;
