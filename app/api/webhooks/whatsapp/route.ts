/**
 * app/api/webhooks/whatsapp/route.ts
 *
 * Webhook dedicado para WhatsApp Business Cloud API (Meta Graph API).
 *
 * GET  — Verificación de webhook (hub.mode + hub.verify_token + hub.challenge).
 * POST — Recepción de eventos: mensajes entrantes, actualizaciones de estado,
 *        y cambios de estado de templates.
 *
 * Seguridad:
 *   - Verifica firma HMAC-SHA256 (X-Hub-Signature-256) en cada POST (fail-closed).
 *   - Resuelve workspace vía WaPhoneSource (O(1), no scan global).
 *   - Auto-reply vía DmAutomationRule si hay coincidencia de keyword.
 *
 * Variables de entorno requeridas:
 *   WHATSAPP_APP_SECRET           — App Secret de la Meta app (para HMAC)
 *   WHATSAPP_WEBHOOK_VERIFY_TOKEN — Token de verificación del webhook
 *
 * El token de acceso de cada workspace se lee desde Integration(provider: "whatsapp_business")
 * vía lib/whatsapp.ts — nunca desde variables de entorno globales.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { resolveOrCreateContact } from "@/lib/crm/contacts";
import {
  verifyWaWebhookSignature,
  resolveWorkspaceFromPhone,
  getWaCredentials,
  sendWaText,
} from "@/lib/whatsapp";

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
const rawSecret    = process.env.WHATSAPP_APP_SECRET;
const APP_SECRET   = (rawSecret && rawSecret !== "PENDIENTE_OBTENER_DE_META_APP_SETTINGS")
  ? rawSecret
  : process.env.META_APP_SECRET;

// ─── GET — Verificación de webhook ───────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!VERIFY_TOKEN) {
    logger.error("WHATSAPP_WEBHOOK_VERIFY_TOKEN no configurado");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    logger.info("WhatsApp webhook verificado correctamente");
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  logger.warn("WhatsApp webhook: verificación fallida — token no coincide");
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ─── POST — Recepción de eventos ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── 1. Verificación HMAC (fail-closed) ──────────────────────────────────
    const rawBody  = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    if (!APP_SECRET) {
      logger.error("[WA Webhook] WHATSAPP_APP_SECRET o META_APP_SECRET no configurado");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (!verifyWaWebhookSignature(rawBody, signature, APP_SECRET)) {
      logger.warn("[WA Webhook] HMAC inválido — posible request spoofed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const body = JSON.parse(rawBody) as WaWebhookPayload;

    // Solo procesar eventos de WhatsApp Business
    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ received: true });
    }

    logger.info("[WA Webhook] Evento recibido", { entries: body.entry?.length ?? 0 });

    // ── 2. Procesar cada entrada ──────────────────────────────────────────────
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;

        const value = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        // ── 3. Resolver workspace desde phoneNumberId ─────────────────────────
        const resolved = await resolveWorkspaceFromPhone(phoneNumberId);
        if (!resolved) {
          // Número no registrado en ningún workspace — ignorar silenciosamente
          logger.warn("[WA Webhook] phoneNumberId no registrado", { phoneNumberId });
          continue;
        }

        const { workspaceId, projectId } = resolved;

        // ── 4. Procesar mensajes entrantes ────────────────────────────────────
        for (const waMsg of value?.messages ?? []) {
          await handleIncomingMessage({
            workspaceId,
            projectId,
            phoneNumberId,
            waMsg,
            contacts: value?.contacts ?? [],
          });
        }

        // ── 5. Procesar actualizaciones de estado ─────────────────────────────
        for (const status of value?.statuses ?? []) {
          await handleStatusUpdate({ workspaceId, phoneNumberId, status });
        }
      }
    }

    // Meta requiere 200 en menos de 20 segundos
    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    logger.error("[WA Webhook] Error de procesamiento", { error: err });
    // Siempre 200 para evitar reintentos de Meta en errores de nuestra lógica
    return NextResponse.json({ received: true });
  }
}

// ─── Manejadores internos ─────────────────────────────────────────────────────

interface HandleMsgOpts {
  workspaceId: string;
  projectId: string | null;
  phoneNumberId: string;
  waMsg: WaMessage;
  contacts: WaContact[];
}

async function handleIncomingMessage({
  workspaceId,
  projectId,
  phoneNumberId,
  waMsg,
  contacts,
}: HandleMsgOpts) {
  const senderPhone = waMsg.from;
  const msgId       = waMsg.id;
  const timestamp   = new Date(parseInt(waMsg.timestamp, 10) * 1000);

  // Extraer nombre del contacto si viene en el evento
  const contact     = contacts.find((c) => c.wa_id === senderPhone);
  const contactName = contact?.profile?.name ?? senderPhone;

  // Extraer contenido del mensaje
  const { textBody, attachments } = extractMessageContent(waMsg);

  try {
    // CRM: resolver/crear el Contact unificado (identidad de canal = teléfono).
    const resolvedContactId = await resolveOrCreateContact({
      workspaceId,
      platform: "whatsapp",
      externalId: senderPhone,
      name: contactName,
      phone: senderPhone,
    });

    // ── Upsert de la conversación (identificada por workspaceId + externalId) ──
    const conversation = await prisma.inboxConversation.upsert({
      where: {
        workspaceId_externalId: {
          workspaceId,
          externalId: `wa_${senderPhone}`,
        },
      },
      update: {
        lastMessage: textBody.slice(0, 255),
        lastMessageAt: timestamp,
        unread: true,
        contactName,
        ...(resolvedContactId ? { contactId: resolvedContactId } : {}),
        updatedAt: new Date(),
      },
      create: {
        workspaceId,
        platform: "whatsapp",
        externalId: `wa_${senderPhone}`,
        pageId: phoneNumberId,
        contactName,
        contactId: resolvedContactId,
        lastMessage: textBody.slice(0, 255),
        lastMessageAt: timestamp,
        unread: true,
        status: "open",
        tags: [],
      },
    });

    // ── Dedup: Meta reentrega webhooks. Sin esto cada reentrega crea un mensaje
    //    duplicado (InboxMessage.externalId no tiene @@unique). Verificamos por
    //    (conversación, msgId) antes de crear — mismo patrón que persistInboundMessage.
    if (msgId) {
      const dup = await prisma.inboxMessage.findFirst({
        where: { conversationId: conversation.id, externalId: msgId },
        select: { id: true },
      });
      if (dup) {
        logger.info("[WA Webhook] Mensaje duplicado ignorado", { conversationId: conversation.id, msgId });
        return;
      }
    }

    // ── Crear el mensaje ──────────────────────────────────────────────────────
    await prisma.inboxMessage.create({
      data: {
        conversationId: conversation.id,
        externalId: msgId,
        content: textBody,
        sender: "user",
        senderName: contactName,
        attachments: attachments.length > 0 ? attachments : undefined,
        createdAt: timestamp,
      },
    });

    logger.info("[WA Webhook] Mensaje guardado en Inbox", {
      workspaceId,
      conversationId: conversation.id,
      from: senderPhone,
    });


  } catch (err) {
    logger.error("[WA Webhook] Error guardando mensaje", {
      workspaceId,
      senderPhone,
      msgId,
      error: err,
    });
  }
}

interface HandleStatusOpts {
  workspaceId: string;
  phoneNumberId: string;
  status: WaStatusUpdate;
}

async function handleStatusUpdate({ workspaceId, phoneNumberId, status }: HandleStatusOpts) {
  // Por ahora solo loguear — se puede extender para marcar mensajes como entregados/leídos
  if (status.status === "failed") {
    logger.warn("[WA Webhook] Mensaje fallido", {
      workspaceId,
      phoneNumberId,
      recipient: status.recipient_id,
      errors: status.errors,
    });
  } else {
    logger.info("[WA Webhook] Status update", {
      workspaceId,
      status: status.status,
      recipient: status.recipient_id,
    });
  }
}



// ─── Extracción de contenido del mensaje ──────────────────────────────────────

function extractMessageContent(waMsg: WaMessage): {
  textBody: string;
  attachments: Array<{ type: string; url?: string; caption?: string; mimeType?: string }>;
} {
  const attachments: Array<{ type: string; url?: string; caption?: string; mimeType?: string }> = [];
  let textBody = "";

  switch (waMsg.type) {
    case "text":
      textBody = waMsg.text?.body ?? "";
      break;
    case "image":
      textBody = waMsg.image?.caption ?? "[ Imagen]";
      attachments.push({ type: "image", caption: waMsg.image?.caption, mimeType: waMsg.image?.mime_type });
      break;
    case "video":
      textBody = waMsg.video?.caption ?? "[ Video]";
      attachments.push({ type: "video", caption: waMsg.video?.caption, mimeType: waMsg.video?.mime_type });
      break;
    case "audio":
      textBody = "[ Audio]";
      attachments.push({ type: "audio", mimeType: waMsg.audio?.mime_type });
      break;
    case "document":
      textBody = waMsg.document?.filename ?? "[ Documento]";
      attachments.push({ type: "document", caption: waMsg.document?.caption, mimeType: waMsg.document?.mime_type });
      break;
    case "location":
      textBody = `[ Ubicación: ${waMsg.location?.name ?? `${waMsg.location?.latitude},${waMsg.location?.longitude}`}]`;
      break;
    case "sticker":
      textBody = "[ Sticker]";
      break;
    case "interactive":
      // Respuestas a botones o listas
      textBody =
        waMsg.interactive?.button_reply?.title ??
        waMsg.interactive?.list_reply?.title ??
        "[Interacción]";
      break;
    default:
      textBody = `[${waMsg.type}]`;
  }

  return { textBody, attachments };
}

// ─── Tipos del payload de WhatsApp Cloud API ──────────────────────────────────

interface WaWebhookPayload {
  object: string;
  entry?: Array<{
    id: string;
    changes?: Array<{
      field: string;
      value?: WaChangeValue;
    }>;
  }>;
}

interface WaChangeValue {
  messaging_product?: string;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: WaContact[];
  messages?: WaMessage[];
  statuses?: WaStatusUpdate[];
}

interface WaContact {
  profile?: { name?: string };
  wa_id: string;
}

interface WaMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { caption?: string; mime_type?: string; id?: string };
  video?: { caption?: string; mime_type?: string; id?: string };
  audio?: { mime_type?: string; id?: string };
  document?: { caption?: string; filename?: string; mime_type?: string; id?: string };
  sticker?: { mime_type?: string; id?: string };
  location?: { latitude?: number; longitude?: number; name?: string; address?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
  context?: { from?: string; id?: string };
}

interface WaStatusUpdate {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code?: number; title?: string; message?: string }>;
}
