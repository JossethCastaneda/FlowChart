import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";

/**
 * GET /api/inbox/conversations
 * Fetches conversations from Facebook Messenger and Instagram DMs
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });
  const token = await getMetaAccessToken(request, "inbox");
  if (!token) return NextResponse.json({ error: "No Meta token" }, { status: 401 });

  try {
    // Get pages with their page-level tokens
    const pagesRes = await metaFetch(
      metaUrl("me/accounts", { fields: "id,name,access_token,instagram_business_account,picture" }),
      token
    );
    const pagesData = await pagesRes.json();
    const pages = pagesData.data || [];

    const conversations: any[] = [];

    for (const page of pages) {
      const pageToken = page.access_token;
      if (!pageToken) continue;

      // 1. Facebook Messenger conversations (uses PAGE token)
      try {
        const convRes = await metaFetch(
          metaUrl(`${page.id}/conversations`, {
            fields: "id,participants,updated_time,message_count,unread_count,messages.limit(1){message,from,created_time}",
            limit: "25",
          }),
          pageToken
        );
        if (convRes.ok) {
          const convData = await convRes.json();
          for (const conv of (convData.data || [])) {
            // Find the participant who is NOT the page
            const otherParticipant = conv.participants?.data?.find(
              (p: any) => p.id !== page.id
            );
            const lastMsg = conv.messages?.data?.[0];

            conversations.push({
              id: conv.id,
              platform: "facebook_messenger",
              pageId: page.id,
              pageName: page.name,
              contactName: otherParticipant?.name || "Usuario",
              contactId: otherParticipant?.id || null,
              lastMessage: lastMsg?.message || "",
              lastMessageAt: conv.updated_time || lastMsg?.created_time,
              unread: (conv.unread_count || 0) > 0,
              messageCount: conv.message_count || 0,
            });
          }
        }
      } catch (e) {
        console.error("[INBOX] Messenger error:", e);
      }

      // 2. Instagram DMs (needs instagram_business_manage_messages)
      const igId = page.instagram_business_account?.id;
      if (igId) {
        try {
          const igConvRes = await metaFetch(
            metaUrl(`${igId}/conversations`, {
              fields: "id,participants,updated_time,messages.limit(1){message,from,created_time}",
              platform: "instagram",
              limit: "25",
            }),
            pageToken
          );
          if (igConvRes.ok) {
            const igConvData = await igConvRes.json();
            for (const conv of (igConvData.data || [])) {
              const otherParticipant = conv.participants?.data?.find(
                (p: any) => p.id !== igId
              );
              const lastMsg = conv.messages?.data?.[0];

              conversations.push({
                id: conv.id,
                platform: "instagram_dm",
                pageId: page.id,
                pageName: page.name,
                contactName: otherParticipant?.name || otherParticipant?.username || "Usuario IG",
                contactId: otherParticipant?.id || null,
                lastMessage: lastMsg?.message || "",
                lastMessageAt: conv.updated_time || lastMsg?.created_time,
                unread: false,
                messageCount: 0,
              });
            }
          }
        } catch (e) {
          console.error("[INBOX] IG DMs error:", e);
        }
      }
    }

    // Sort by most recent
    conversations.sort((a, b) =>
      new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
    );

    return NextResponse.json({ conversations });
  } catch (err: any) {
    console.error("[INBOX] Conversations error:", err);
    return NextResponse.json({ error: err.message || "Error" }, { status: 500 });
  }
}
