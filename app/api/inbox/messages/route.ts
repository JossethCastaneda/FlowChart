import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";

/**
 * GET /api/inbox/messages?conversationId=xxx&pageId=yyy
 * Fetches messages for a specific conversation
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });
  const token = await getMetaAccessToken(request);
  if (!token) return NextResponse.json({ error: "No Meta token" }, { status: 401 });

  const conversationId = request.nextUrl.searchParams.get("conversationId");
  const pageId = request.nextUrl.searchParams.get("pageId");
  if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });

  try {
    // Get page token for this page
    let pageToken = token;
    if (pageId) {
      const pagesRes = await metaFetch(
        metaUrl("me/accounts", { fields: "id,access_token" }),
        token
      );
      const pagesData = await pagesRes.json();
      const page = (pagesData.data || []).find((p: any) => p.id === pageId);
      if (page?.access_token) pageToken = page.access_token;
    }

    // Fetch messages for this conversation
    const msgRes = await metaFetch(
      metaUrl(`${conversationId}`, {
        fields: "messages{id,message,from,created_time,attachments}",
      }),
      pageToken
    );

    if (!msgRes.ok) {
      const errData = await msgRes.json().catch(() => ({}));
      return NextResponse.json({ error: errData?.error?.message || "Failed to fetch messages" }, { status: 500 });
    }

    const msgData = await msgRes.json();
    const rawMessages = msgData.messages?.data || [];

    // Normalize messages
    const messages = rawMessages.map((msg: any) => ({
      id: msg.id,
      text: msg.message || "",
      incoming: msg.from?.id !== pageId, // If sender is not the page, it's incoming
      timestamp: msg.created_time,
      senderName: msg.from?.name || "Usuario",
      senderId: msg.from?.id,
      attachments: msg.attachments?.data || null,
    }));

    // Messages come newest-first from Meta, reverse for chat view
    messages.reverse();

    return NextResponse.json({ messages });
  } catch (err: any) {
    console.error("[INBOX] Messages error:", err);
    return NextResponse.json({ error: err.message || "Error" }, { status: 500 });
  }
}

/**
 * POST /api/inbox/messages
 * Send a reply to a conversation
 * Body: { pageId, recipientId, message }
 */
export async function POST(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });
  const token = await getMetaAccessToken(request);
  if (!token) return NextResponse.json({ error: "No Meta token" }, { status: 401 });

  const body = await request.json();
  const { pageId, recipientId, message } = body;

  if (!pageId || !recipientId || !message) {
    return NextResponse.json({ error: "pageId, recipientId, message required" }, { status: 400 });
  }

  try {
    // Get page token
    const pagesRes = await metaFetch(
      metaUrl("me/accounts", { fields: "id,access_token" }),
      token
    );
    const pagesData = await pagesRes.json();
    const page = (pagesData.data || []).find((p: any) => p.id === pageId);
    if (!page?.access_token) {
      return NextResponse.json({ error: "Page not found or no token" }, { status: 400 });
    }

    // Send message via Messenger
    const sendRes = await metaFetch(
      metaUrl(`${pageId}/messages`),
      page.access_token,
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
    console.error("[INBOX] Send error:", err);
    return NextResponse.json({ error: err.message || "Error" }, { status: 500 });
  }
}
