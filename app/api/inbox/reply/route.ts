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
 * Sends a reply to a Messenger / Instagram DM conversation, or to a
 * Facebook / Instagram comment via /{comment-id}/replies.
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
    // We match by internal DB id + workspaceId (not externalId, which is a platform identifier).
    const conversation = await prisma.inboxConversation.findFirst({
      where: { id: conversationId, workspaceId },
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
    // Priority: meta_community (has pages_messaging scope required by Send API),
    // then meta (generic fallback). Other modules (ads, analytics) lack the
    // pages_messaging permission and would fail at the Graph API level.
    let pageToken: string | null = null;

    const PROVIDERS_PRIORITY = ["meta_community", "meta"] as const;
    for (const prov of PROVIDERS_PRIORITY) {
      if (pageToken) break;
      const integration = await prisma.integration.findFirst({
        where: { workspaceId, provider: prov, connected: true },
      });
      if (!integration?.credentials) continue;
      const creds = integration.credentials as Record<string, unknown>;

      // 1. Page-specific token from pages[] array (connect callback format:
      //    credentials.pages = [{ id, name, accessToken (encrypted), ... }])
      const pages = creds.pages as Array<{ id: string; accessToken?: string }> | undefined;
      const matchedPage = pages?.find((p) => p.id === pageId);
      if (matchedPage?.accessToken) {
        try {
          pageToken = decryptToken(matchedPage.accessToken);
        } catch {
          pageToken = null;
        }
        if (pageToken) break;
      }

      // 2. Fallback: user access token (works for Send API with long-lived tokens
      //    that have pages_messaging + the page is managed by the user)
      const userToken = creds.accessToken as string | undefined;
      if (userToken) {
        try {
          pageToken = decryptToken(userToken);
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

    const isComment =
      conversation.platform === "facebook_comment" ||
      conversation.platform === "instagram_comment";
    const now = new Date();
    let replyMessageId: string | null = null;

    if (isComment) {
      // ── Reply to Comment via /{comment-id}/replies ──
      // For comments, externalId IS the comment-id (not the PSID of the user).
      // Strip internal prefixes (fbc_ / igc_) to get the raw Graph comment ID.
      const commentId = conversation.externalId.replace(/^fbc_|^igc_/, "");
      if (!commentId) {
        return NextResponse.json({ error: "No se pudo determinar el comment-id" }, { status: 400 });
      }
      const commentRes = await metaFetch(
        `https://graph.facebook.com/${META_V}/${commentId}/replies`,
        pageToken,
        {
          method: "POST",
          body: JSON.stringify({ message: text }),
        }
      );
      const commentData = await commentRes.json();
      if (!commentRes.ok || commentData.error) {
        const mapped = mapMetaError(commentData?.error);
        logger.error("[INBOX-REPLY] Comment reply Meta API error:", commentData?.error?.message);
        return NextResponse.json({ error: mapped.user_message }, { status: 422 });
      }
      replyMessageId = commentData.id || null;
    } else {
      // ── Send the reply via Meta Send API (DMs: Messenger / IG DM) ──
      // Replies go through POST /{pageId}/messages (Send API), NOT /{conversationId}/messages.
      // SEGURIDAD: el destinatario es el externalId (PSID del contacto) de la conversación
      // YA verificada como del workspace — NO el recipientId del cliente, que permitiría
      // enviar DMs a un PSID arbitrario a través de la página con un conversationId válido.
      const recipientPsid = conversation.externalId;
      const replyRes = await metaFetch(
        `https://graph.facebook.com/${META_V}/${pageId}/messages`,
        pageToken,
        {
          method: "POST",
          body: JSON.stringify({
            recipient: { id: recipientPsid },
            message: { text },
            messaging_type: "RESPONSE",
          }),
        }
      );
      const replyData = await replyRes.json();
      if (!replyRes.ok || replyData.error) {
        const mapped = mapMetaError(replyData?.error);
        logger.error("[INBOX-REPLY] Meta API error:", replyData?.error?.message);
        return NextResponse.json({ error: mapped.user_message }, { status: 422 });
      }
      replyMessageId = replyData.id || null;
    }

    // ── Update InboxConversation in DB ──
    await prisma.inboxConversation.update({
      where: { id: conversation.id },
      data: { lastMessage: text, lastMessageAt: now, unread: false },
    });

    // ── Create InboxMessage record ──
    await prisma.inboxMessage.create({
      data: {
        conversationId: conversation.id,
        externalId: replyMessageId,
        content: text,
        sender: "page",
        senderName: pageId || null,
        createdAt: now,
      },
    });

    logger.info(`[INBOX-REPLY] ✅ Reply sent to conversation ${conversationId} (${conversation.platform})`);
    return NextResponse.json({ success: true, messageId: replyMessageId, conversationId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    logger.error("[INBOX-REPLY] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
