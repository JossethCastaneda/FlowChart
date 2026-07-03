import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";
import { logger } from "@/lib/logger";

// In-memory page token cache (per-process, resets on cold start)
// Avoids refetching me/accounts on every message load
let _pageTokenCache: { tokens: Record<string, string>; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getPageTokens(userToken: string): Promise<Record<string, string>> {
  if (_pageTokenCache && Date.now() - _pageTokenCache.ts < CACHE_TTL) {
    return _pageTokenCache.tokens;
  }
  const pagesRes = await metaFetch(
    metaUrl("me/accounts", { fields: "id,access_token", limit: "50" }),
    userToken,
    { cache: "no-store" }
  );
  const pagesData = await pagesRes.json();
  const tokens: Record<string, string> = {};
  for (const p of pagesData.data || []) {
    if (p.access_token) tokens[p.id] = p.access_token;
  }
  _pageTokenCache = { tokens, ts: Date.now() };
  return tokens;
}

/**
 * GET /api/inbox/messages?conversationId=xxx&pageId=yyy
 * Fetches messages for a specific conversation — FAST (cached page tokens)
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });
  const token = await getMetaAccessToken(request, "inbox");
  if (!token) return NextResponse.json({ error: "No Meta token" }, { status: 401 });

  const conversationId = request.nextUrl.searchParams.get("conversationId");
  const pageId = request.nextUrl.searchParams.get("pageId");
  if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });

  // ── 1. Check if conversation exists locally (e.g. WhatsApp) ──
  const { default: prisma } = await import("@/lib/prisma");
  const localConv = await prisma.inboxConversation.findFirst({
    where: {
      id: conversationId,
      workspaceId,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (localConv) {
    const messages = localConv.messages.map((m) => ({
      id: m.id,
      text: m.content,
      incoming: m.sender === "user",
      timestamp: m.createdAt,
      senderName: m.senderName || "Usuario",
      senderId: m.senderName,
    }));
    return NextResponse.json({ messages });
  }

  try {
    // Get page token (from cache or single API call)
    const tokens = await getPageTokens(token);
    const pageToken = (pageId && tokens[pageId]) ? tokens[pageId] : token;

    // Fetch messages — single API call
    const msgRes = await metaFetch(
      metaUrl(`${conversationId}`, {
        fields: "messages{id,message,from,created_time}",
      }),
      pageToken,
      { cache: "no-store" }
    );

    if (!msgRes.ok) {
      const errData = await msgRes.json().catch(() => ({}));
      return NextResponse.json({ error: errData?.error?.message || "Failed to fetch messages" }, { status: 500 });
    }

    const msgData = await msgRes.json();
    const rawMessages = msgData.messages?.data || [];

    // Normalize — single pass
    const messages = rawMessages.map((msg: any) => ({
      id: msg.id,
      text: msg.message || "",
      incoming: msg.from?.id !== pageId,
      timestamp: msg.created_time,
      senderName: msg.from?.name || "Usuario",
      senderId: msg.from?.id,
    }));

    // Reverse for chat order (Meta returns newest first)
    messages.reverse();

    return NextResponse.json({ messages });
  } catch (err: any) {
    logger.error("[INBOX] Messages error:", err);
    return NextResponse.json({ error: err.message || "Error" }, { status: 500 });
  }
}

/**
 * POST /api/inbox/messages
 * Send a reply to a conversation
 */
export async function POST(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const body = await request.json();
  const { pageId, recipientId, message, conversationId, platform } = body;

  if (!message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  // ── 1. Check if WhatsApp / Local Conversation ──
  if (platform === "whatsapp" || (conversationId && conversationId.length > 15)) {
    try {
      const { default: prisma } = await import("@/lib/prisma");
      const { getWaCredentials, sendWaText } = await import("@/lib/whatsapp");
      const { logger } = await import("@/lib/logger");

      // Buscar conversación local
      const localConv = await prisma.inboxConversation.findFirst({
        where: {
          id: conversationId,
          workspaceId,
        },
      });

      if (!localConv) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }

      // Obtener credenciales de WhatsApp
      const creds = await getWaCredentials(workspaceId);
      if (!creds) {
        return NextResponse.json({ error: "WhatsApp not connected" }, { status: 400 });
      }

      // Extraer teléfono del destinatario desde externalId (ej. wa_5215541702793 -> 5215541702793)
      const to = localConv.externalId.replace("wa_", "");

      // Enviar vía WhatsApp Cloud API
      const waRes = await sendWaText(creds, {
        to,
        text: message,
      });

      // Guardar mensaje en Prisma
      await prisma.inboxMessage.create({
        data: {
          conversationId: localConv.id,
          content: message,
          sender: "page",
          senderName: "WhatsApp",
          externalId: waRes.messageId,
          createdAt: new Date(),
        },
      });

      // Actualizar conversación
      await prisma.inboxConversation.update({
        where: { id: localConv.id },
        data: {
          lastMessage: message.slice(0, 255),
          lastMessageAt: new Date(),
          unread: false,
        },
      });

      logger.info("[INBOX] WhatsApp message sent and saved", { workspaceId, conversationId });
      return NextResponse.json({ success: true, messageId: waRes.messageId });
    } catch (err: any) {
      logger.error("[INBOX] WhatsApp send error:", err);
      return NextResponse.json({ error: err.message || "Failed to send WhatsApp message" }, { status: 502 });
    }
  }

  const token = await getMetaAccessToken(request, "inbox");
  if (!token) return NextResponse.json({ error: "No Meta token" }, { status: 401 });

  if (!pageId || !recipientId) {
    return NextResponse.json({ error: "pageId and recipientId required for Facebook/Instagram" }, { status: 400 });
  }

  try {
    const tokens = await getPageTokens(token);
    const pageToken = tokens[pageId];
    if (!pageToken) {
      return NextResponse.json({ error: "Page not found or no token" }, { status: 400 });
    }

    const sendRes = await metaFetch(
      metaUrl(`${pageId}/messages`),
      pageToken,
      {
        method: "POST",
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: message },
          messaging_type: "RESPONSE",
        }),
      }
    );

    if (!sendRes.ok) {
      const errData = await sendRes.json().catch(() => ({}));
      return NextResponse.json({ error: errData?.error?.message || "Failed to send" }, { status: 500 });
    }

    const sendData = await sendRes.json();
    return NextResponse.json({ success: true, messageId: sendData.message_id });
  } catch (err: any) {
    logger.error("[INBOX] Send error:", err);
    return NextResponse.json({ error: err.message || "Error" }, { status: 500 });
  }
}
