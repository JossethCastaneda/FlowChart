import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";

/**
 * GET /api/inbox/conversations
 * Fetches conversations from Facebook Messenger and Instagram DMs
 * OPTIMIZED: All pages + IG fetched in parallel for speed
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });
  const token = await getMetaAccessToken(request, "inbox");
  if (!token) return NextResponse.json({ error: "No Meta token" }, { status: 401 });

  try {
    // Get pages — single API call
    const pagesRes = await metaFetch(
      metaUrl("me/accounts", { fields: "id,name,access_token,instagram_business_account{id}", limit: "50" }),
      token
    );
    const pagesData = await pagesRes.json();
    const pages = pagesData.data || [];

    if (pages.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Fire ALL conversation fetches in parallel (Messenger + IG for each page)
    const fetchers: Promise<any[]>[] = [];

    for (const page of pages) {
      const pageToken = page.access_token;
      if (!pageToken) continue;

      // Messenger conversations
      fetchers.push(
        metaFetch(
          metaUrl(`${page.id}/conversations`, {
            fields: "id,participants,updated_time,unread_count,messages.limit(1){message,from,created_time}",
            limit: "25",
          }),
          pageToken
        )
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (!data?.data) return [];
            return data.data.map((conv: any) => {
              const other = conv.participants?.data?.find((p: any) => p.id !== page.id);
              const lastMsg = conv.messages?.data?.[0];
              return {
                id: conv.id,
                platform: "facebook_messenger",
                pageId: page.id,
                pageName: page.name,
                contactName: other?.name || "Usuario",
                contactId: other?.id || null,
                lastMessage: lastMsg?.message || "",
                lastMessageAt: conv.updated_time || lastMsg?.created_time,
                unread: (conv.unread_count || 0) > 0,
              };
            });
          })
          .catch(() => [])
      );

      // Instagram DMs
      const igId = page.instagram_business_account?.id;
      if (igId) {
        fetchers.push(
          metaFetch(
            metaUrl(`${igId}/conversations`, {
              fields: "id,participants,updated_time,messages.limit(1){message,from,created_time}",
              platform: "instagram",
              limit: "25",
            }),
            pageToken
          )
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (!data?.data) return [];
              return data.data.map((conv: any) => {
                const other = conv.participants?.data?.find((p: any) => p.id !== igId);
                const lastMsg = conv.messages?.data?.[0];
                return {
                  id: conv.id,
                  platform: "instagram_dm",
                  pageId: page.id,
                  pageName: page.name,
                  contactName: other?.name || other?.username || "Usuario IG",
                  contactId: other?.id || null,
                  lastMessage: lastMsg?.message || "",
                  lastMessageAt: conv.updated_time || lastMsg?.created_time,
                  unread: false,
                };
              });
            })
            .catch(() => [])
        );
      }
    }

    // Wait for ALL in parallel
    const results = await Promise.all(fetchers);
    const conversations = results.flat();

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
