import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { mapMetaError } from "@/lib/meta-errors";

export const dynamic = "force-dynamic";

/**
 * Fetches page tokens for the given user token.
 * Request-scoped: no in-memory cache (Vercel serverless kills the process between requests
 * anyway, so module-level caches provide false savings while breaking multi-instance envs).
 */
async function getPageTokens(userToken: string): Promise<Record<string, string>> {
  const pagesRes = await metaFetch(
    metaUrl("me/accounts", { fields: "id,access_token", limit: "100" }),
    userToken,
    { cache: "no-store" },
  );
  const pagesData = await pagesRes.json();
  const tokens: Record<string, string> = {};
  for (const p of pagesData.data || []) if (p.access_token) tokens[p.id] = p.access_token;
  return tokens;
}

/**
 * Trae el historial completo de un hilo DM (Messenger/IG) desde Graph la primera vez
 * que se abre y lo persiste en InboxMessage (histórico bajo demanda). Idempotente por
 * externalId (id del mensaje). Devuelve cuántos mensajes se guardaron.
 */
async function backfillThread(
  request: NextRequest,
  conv: { id: string; platform: string; pageId: string | null; externalId: string },
): Promise<number> {
  const isIg = conv.platform === "instagram_dm";
  const token = await getMetaAccessToken(request, isIg ? "ig_inbox" : "inbox");
  if (!token || !conv.pageId) return 0;
  const tokens = await getPageTokens(token);
  const pageToken = tokens[conv.pageId] || token;

  const url = metaUrl(`${conv.pageId}/conversations`, {
    user_id: conv.externalId,
    fields: "messages.limit(50){id,message,from,created_time,attachments,shares}",
    ...(isIg ? { platform: "instagram" } : {}),
  });
  const res = await metaFetch(url, pageToken, { cache: "no-store" });
  if (!res.ok) return 0;
  const data = await res.json();
  const thread = data?.data?.[0];
  const msgs: Array<{ id: string; message?: string; from?: { id: string }; created_time?: string; attachments?: any; shares?: any }> =
    thread?.messages?.data ?? [];
  if (msgs.length === 0) return 0;

  // Persistir en orden cronológico, dedup por externalId (id del mensaje).
  const ordered = [...msgs].reverse();
  let saved = 0;
  for (const m of ordered) {
    if (!m.id) continue;
    const dup = await prisma.inboxMessage.findFirst({
      where: { conversationId: conv.id, externalId: m.id },
      select: { id: true },
    });
    if (dup) continue;
    await prisma.inboxMessage.create({
      data: {
        conversationId: conv.id,
        externalId: m.id,
        content: m.message || (m.attachments?.data?.length || m.shares?.data?.length ? "📎 Adjunto" : ""),
        sender: m.from?.id === conv.pageId ? "page" : "user",
        senderName: m.from?.id === conv.pageId ? "page" : null,
        attachments: m.attachments?.data || m.shares?.data || undefined,
        createdAt: new Date(m.created_time || Date.now()),
      },
    });
    saved++;
  }
  return saved;
}

/**
 * GET /api/inbox/messages?conversationId=xxx
 * Lee los mensajes de un hilo desde la DB. Si es un DM FB/IG sin historial aún
 * persistido, hace backfill una vez desde Graph y luego responde.
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const conversationId = request.nextUrl.searchParams.get("conversationId");
  if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });

  const conv = await prisma.inboxConversation.findFirst({
    where: { id: conversationId, workspaceId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  // Histórico bajo demanda: primer open de un DM FB/IG sin mensajes → traer de Graph.
  let messages = conv.messages;
  if (messages.length === 0 && (conv.platform === "facebook_messenger" || conv.platform === "instagram_dm")) {
    try {
      const saved = await backfillThread(request, conv);
      if (saved > 0) {
        messages = await prisma.inboxMessage.findMany({
          where: { conversationId: conv.id },
          orderBy: { createdAt: "asc" },
        });
      }
    } catch (err) {
      logger.warn("[INBOX] thread backfill failed", { conversationId, err });
    }
  }

  // Marcar como leído al abrir.
  if (conv.unread) {
    await prisma.inboxConversation.update({ where: { id: conv.id }, data: { unread: false } }).catch(() => {});
    if (conv.platform === "facebook_messenger" || conv.platform === "instagram_dm") {
      try {
        const isIg = conv.platform === "instagram_dm";
        const token = await getMetaAccessToken(request, isIg ? "ig_inbox" : "inbox");
        if (token && conv.pageId) {
          const tokens = await getPageTokens(token);
          const pageToken = tokens[conv.pageId] || token;
          await metaFetch(
            metaUrl(`${conv.pageId}/messages`),
            pageToken,
            { method: "POST", body: JSON.stringify({ recipient: { id: conv.externalId }, sender_action: "mark_seen" }) }
          );
        }
      } catch (err) {
        logger.warn("[INBOX] Failed to send mark_seen", { err });
      }
    }
  }

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      text: m.content,
      incoming: m.sender === "user",
      timestamp: m.createdAt,
      senderName: m.senderName || (m.sender === "user" ? conv.contactName || "Usuario" : "page"),
      senderId: m.senderName,
      attachments: m.attachments ? (m.attachments as any[]) : undefined,
      reaction: m.reaction || undefined,
      deliveredAt: m.deliveredAt || undefined,
      readAt: m.readAt || undefined,
    })),
  });
}

/**
 * POST /api/inbox/messages — enviar una respuesta.
 * WhatsApp vía Cloud API; Messenger/IG vía Send API. En todos los casos se persiste
 * el mensaje saliente en la DB para que aparezca de inmediato (y en el histórico).
 */
export async function POST(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const body = await request.json();
  const { pageId, recipientId, message, conversationId, platform } = body as {
    pageId?: string; recipientId?: string; message?: string; conversationId?: string; platform?: string;
  };
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

  const conv = conversationId
    ? await prisma.inboxConversation.findFirst({ where: { id: conversationId, workspaceId } })
    : null;

  // ── WhatsApp ──
  if (platform === "whatsapp" || conv?.platform === "whatsapp") {
    try {
      const { getWaCredentials, sendWaText } = await import("@/lib/whatsapp");
      if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      const creds = await getWaCredentials(workspaceId);
      if (!creds) return NextResponse.json({ error: "WhatsApp not connected" }, { status: 400 });
      const to = conv.externalId.replace(/^wa_/, "");
      const waRes = await sendWaText(creds, { to, text: message });
      await prisma.inboxMessage.create({
        data: { conversationId: conv.id, content: message, sender: "page", senderName: "WhatsApp", externalId: waRes.messageId, createdAt: new Date() },
      });
      await prisma.inboxConversation.update({ where: { id: conv.id }, data: { lastMessage: message.slice(0, 255), lastMessageAt: new Date(), unread: false } });
      return NextResponse.json({ success: true, messageId: waRes.messageId });
    } catch (err) {
      logger.error("[INBOX] WhatsApp send error:", err);
      return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to send" }, { status: 502 });
    }
  }

  // ── Messenger / Instagram (Send API) ──
  // SEGURIDAD: derivar SIEMPRE pageId y recipient de la conversación verificada del
  // workspace, nunca del cliente. Antes `pageId || conv?.pageId` y `recipientId ||
  // conv?.externalId` dejaban que el cliente enviara DMs a un destinatario/página
  // arbitrarios (incluso sin conversationId) usando el token del workspace.
  if (!conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  const isIg = conv.platform === "instagram_dm";
  const resolvedPageId = conv.pageId || "";
  const resolvedRecipient = conv.externalId || "";
  if (!resolvedPageId || !resolvedRecipient) {
    return NextResponse.json({ error: "La conversación no tiene página/destinatario asociados" }, { status: 400 });
  }

  const token = await getMetaAccessToken(request, isIg ? "ig_inbox" : "inbox");
  if (!token) return NextResponse.json({ error: "No Meta token" }, { status: 401 });

  try {
    const tokens = await getPageTokens(token);
    const pageToken = tokens[resolvedPageId];
    if (!pageToken) return NextResponse.json({ error: "Page not found or no token" }, { status: 400 });

    const sendRes = await metaFetch(metaUrl(`${resolvedPageId}/messages`), pageToken, {
      method: "POST",
      body: JSON.stringify({ recipient: { id: resolvedRecipient }, message: { text: message }, messaging_type: "RESPONSE" }),
    });
    if (!sendRes.ok) {
      const errData = await sendRes.json().catch(() => ({}));
      const parsedError = mapMetaError(errData?.error || errData);
      return NextResponse.json({ error: parsedError.user_message || errData?.error?.message || "Failed to send" }, { status: 500 });
    }
    const sendData = await sendRes.json();

    // Persistir el saliente para que aparezca de inmediato.
    if (conv) {
      await prisma.inboxMessage.create({
        data: { conversationId: conv.id, externalId: sendData.message_id || null, content: message, sender: "page", senderName: "page", createdAt: new Date() },
      }).catch(() => {});
      await prisma.inboxConversation.update({ where: { id: conv.id }, data: { lastMessage: message.slice(0, 255), lastMessageAt: new Date(), unread: false } }).catch(() => {});
    }

    return NextResponse.json({ success: true, messageId: sendData.message_id });
  } catch (err) {
    logger.error("[INBOX] Send error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
