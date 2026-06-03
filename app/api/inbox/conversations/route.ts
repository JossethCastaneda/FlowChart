import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";

/**
 * GET /api/inbox/conversations
 * Fetches conversations from Facebook Messenger, Instagram DMs,
 * Facebook Comments, and Instagram Comments.
 * All fetches run in parallel for speed.
 * Includes contact profile picture URLs.
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
      metaUrl("me/accounts", { fields: "id,name,access_token,instagram_business_account{id,username}", limit: "50" }),
      token
    );
    const pagesData = await pagesRes.json();
    const pages = pagesData.data || [];

    if (pages.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Fire ALL conversation fetches in parallel
    const fetchers: Promise<any[]>[] = [];

    for (const page of pages) {
      const pageToken = page.access_token;
      if (!pageToken) continue;

      // ── 1. Facebook Messenger conversations ──
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
                contactAvatar: other?.id
                  ? `https://graph.facebook.com/${other.id}/picture?type=small&access_token=${pageToken}`
                  : null,
                lastMessage: lastMsg?.message || "",
                lastMessageAt: conv.updated_time || lastMsg?.created_time,
                unread: (conv.unread_count || 0) > 0,
              };
            });
          })
          .catch(() => [])
      );

      // ── 2. Instagram DMs ──
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
                  contactAvatar: other?.id
                    ? `https://graph.facebook.com/${other.id}/picture?type=small&access_token=${pageToken}`
                    : null,
                  lastMessage: lastMsg?.message || "",
                  lastMessageAt: conv.updated_time || lastMsg?.created_time,
                  unread: false,
                };
              });
            })
            .catch(() => [])
        );

        // ── 3. Instagram Comments ──
        fetchers.push(
          metaFetch(
            metaUrl(`${igId}/media`, {
              fields: "id,caption,timestamp,comments.limit(5){id,text,from{id,username},timestamp}",
              limit: "10",
            }),
            pageToken
          )
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (!data?.data) return [];
              const comments: any[] = [];
              for (const media of data.data) {
                for (const comment of (media.comments?.data || [])) {
                  if (comment.from?.id === igId) continue; // skip own comments
                  comments.push({
                    id: `igc_${comment.id}`,
                    platform: "instagram_comment",
                    pageId: page.id,
                    pageName: page.name,
                    contactName: comment.from?.username || "Usuario IG",
                    contactId: comment.from?.id || null,
                    contactAvatar: null, // IG comments don't provide easy profile pic
                    lastMessage: comment.text || "",
                    lastMessageAt: comment.timestamp || media.timestamp,
                    unread: true,
                  });
                }
              }
              return comments;
            })
            .catch(() => [])
        );
      }

      // ── 4. Facebook Page Comments ──
      fetchers.push(
        metaFetch(
          metaUrl(`${page.id}/feed`, {
            fields: "id,message,created_time,comments.limit(5){id,message,from{id,name,picture},created_time}",
            limit: "10",
          }),
          pageToken
        )
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (!data?.data) return [];
            const comments: any[] = [];
            for (const post of data.data) {
              for (const comment of (post.comments?.data || [])) {
                if (comment.from?.id === page.id) continue; // skip own comments
                comments.push({
                  id: `fbc_${comment.id}`,
                  platform: "facebook_comment",
                  pageId: page.id,
                  pageName: page.name,
                  contactName: comment.from?.name || "Usuario",
                  contactId: comment.from?.id || null,
                  contactAvatar: comment.from?.picture?.data?.url || (
                    comment.from?.id
                      ? `https://graph.facebook.com/${comment.from.id}/picture?type=small&access_token=${pageToken}`
                      : null
                  ),
                  lastMessage: comment.message || "",
                  lastMessageAt: comment.created_time,
                  unread: true,
                });
              }
            }
            return comments;
          })
          .catch(() => [])
      );
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
