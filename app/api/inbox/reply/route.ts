import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { metaFetch } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";
import { decryptToken } from "@/lib/encryption";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { validateBody } from "@/lib/validate";
import { logger } from "@/lib/logger";

const META_V = process.env.META_API_VERSION || "v25.0";

const ReplySchema = z.object({
  conversationId: z.string().min(1, "conversationId requerido"),
  recipientId: z.string().min(1, "recipientId requerido"),
  text: z.string().min(1, "text requerido").max(2000),
  pageId: z.string().min(1, "pageId requerido"),
});

/**
 * POST /api/inbox/reply
 *
 * Sends a reply to a Messenger / Instagram DM conversation.
 *
 * Security:
 * - Requires authenticated session
 * - Requires active workspace membership
 * - conversationId is verified against the workspace (prevents IDOR)
 * - pageId is verified against the resolved conversation (prevents using arbitrary pages)
 * - pageToken is always resolved server-side from the workspace Integration — never trusted from client
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth checks ──
    const jwt = await getToken({ req });
    if (!jwt?.sub) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(jwt.sub);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    // ── Validate input ──
    const result = await validateBody(req, ReplySchema);
    if (!result.ok) return result.response;
    const { conversationId, recipientId, text, pageId } = result.data;

    // ── SECURITY: Verify conversationId belongs to this workspace ──
    // This prevents IDOR — a member cannot reply to conversations from other workspaces
    // by crafting a request with an arbitrary conversationId.
    const conversation = await prisma.inboxConversation.findUnique({
      where: {
        workspaceId_externalId: { workspaceId, externalId: conversationId },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversación no encontrada en este workspace" },
        { status: 404 }
      );
    }

    // ── SECURITY: Verify pageId matches the conversation's pageId ──
    // Prevents using a valid conversationId but swapping in a different pageId
    // to send messages through a page that doesn't belong to this conversation.
    if (conversation.pageId && conversation.pageId !== pageId) {
      return NextResponse.json(
        { error: "pageId no coincide con la conversación" },
        { status: 403 }
      );
    }

    // ── Resolve pageToken server-side from workspace Integration ──
    // NEVER trust the pageToken from the client. Always fetch from DB.
    // This eliminates the IDOR vector described in Audit #6.
    let pageToken: string | null = null;

    // Look for a page token stored in the community integration for this workspace
    const integration = await prisma.integration.findFirst({
      where: {
        workspaceId,
        provider: { startsWith: "meta" },
        connected: true,
      },
    });

    if (integration?.credentials) {
      const creds = integration.credentials as Record<string, unknown>;
      const rawToken =
        (creds.pageTokens as Record<string, string> | undefined)?.[pageId] ||
        (creds.accessToken as string | undefined);

      if (rawToken) {
        try {
          pageToken = decryptToken(rawToken);
        } catch {
          pageToken = null;
        }
      }
    }

    if (!pageToken) {
      return NextResponse.json(
        { error: "No se encontró token para esta página. Ve a Integraciones y reconecta tu cuenta." },
        { status: 401 }
      );
    }

    // ── Send the reply via Meta Send API ──
    // Replies go through POST /{pageId}/messages (Send API), NOT /{conversationId}/messages
    const replyRes = await metaFetch(
      `https://graph.facebook.com/${META_V}/${pageId}/messages`,
      pageToken,
      {
        method: "POST",
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
          messaging_type: "RESPONSE",
        }),
      }
    );
    const replyData = await replyRes.json();

    if (!replyRes.ok || replyData.error) {
      const mapped = mapMetaError(replyData?.error);
      logger.error("[INBOX-REPLY] Meta API error:", replyData?.error?.message);
      return NextResponse.json(
        { error: mapped.user_message },
        { status: 422 }
      );
    }

    // ── Update InboxConversation in DB ──
    const now = new Date();
    await prisma.inboxConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: text,
        lastMessageAt: now,
        unread: false,
      },
    });

    // ── Create InboxMessage record ──
    await prisma.inboxMessage.create({
      data: {
        conversationId: conversation.id,
        externalId: replyData.id || null,
        content: text,
        sender: "page",
        senderName: pageId || null,
        createdAt: now,
      },
    });

    logger.info(`[INBOX-REPLY] ✅ Reply sent to conversation ${conversationId}`);
    return NextResponse.json({
      success: true,
      messageId: replyData.id || null,
      conversationId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    logger.error("[INBOX-REPLY] Error:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
