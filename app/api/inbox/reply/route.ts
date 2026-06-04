import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";
import { decryptToken } from "@/lib/encryption";
import prisma from "@/lib/prisma";

const META_V = process.env.META_API_VERSION || "v22.0";

/**
 * POST /api/inbox/reply
 *
 * Sends a reply to a Messenger / Instagram DM conversation.
 * Uses the PAGE token (not user token) — required for conversation APIs.
 *
 * Body:
 *   conversationId: string  — Meta conversation ID
 *   recipientId:    string  — The recipient's user/scoped ID
 *   text:           string  — Message content
 *   pageId:         string  — Facebook Page ID
 *   pageToken:      string  — Encrypted page access token
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

    // Community module token (used for inbox/DM operations)
    let token = await getMetaAccessToken(req, "community");
    if (!token) token = await getMetaAccessToken(req);
    if (!token) {
      return NextResponse.json(
        { error: "No hay token Meta. Ve a Integraciones y conecta tu cuenta." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      conversationId,
      recipientId,
      text,
      pageId,
      pageToken: encryptedPageToken,
    } = body;

    if (!conversationId || !recipientId || !text) {
      return NextResponse.json(
        { error: "conversationId, recipientId y text son requeridos" },
        { status: 400 }
      );
    }

    // Decrypt the page token — page token is required for conversation replies
    const pageToken = decryptToken(encryptedPageToken) || token;

    // ── Send the reply via Meta Graph API ──
    const replyRes = await metaFetch(
      `https://graph.facebook.com/${META_V}/${conversationId}/messages`,
      pageToken,
      {
        method: "POST",
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
        }),
      }
    );
    const replyData = await replyRes.json();

    if (!replyRes.ok || replyData.error) {
      const mapped = mapMetaError(replyData?.error);
      console.error("[INBOX-REPLY] Meta API error:", replyData?.error?.message);
      return NextResponse.json(
        { error: mapped.user_message },
        { status: 422 }
      );
    }

    // ── Update InboxConversation in DB ──
    const now = new Date();
    const conversation = await prisma.inboxConversation.findUnique({
      where: {
        workspaceId_externalId: { workspaceId, externalId: conversationId },
      },
    });

    if (conversation) {
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
    }

    console.log(`[INBOX-REPLY] ✅ Reply sent to conversation ${conversationId}`);
    return NextResponse.json({
      success: true,
      messageId: replyData.id || null,
      conversationId,
    });
  } catch (err: any) {
    console.error("[INBOX-REPLY] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Error interno" },
      { status: 500 }
    );
  }
}
