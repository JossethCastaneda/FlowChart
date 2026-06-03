import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";

/**
 * GET /api/inbox/conversations
 * Fetches conversations from:
 *  - Facebook Messenger
 *  - Instagram DMs
 *  - Facebook Post Comments (grouped by post)
 *  - Instagram Media Comments (grouped by media)
 * All in parallel. Profile pictures via proxy.
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });
  const token = await getMetaAccessToken(request, "inbox");
  if (!token) return NextResponse.json({ error: "No Meta token" }, { status: 401 });

  try {
    const pagesRes = await metaFetch(
      metaUrl("me/accounts", { fields: "id,name,access_token,instagram_business_account{id,username,profile_picture_url}", limit: "50" }),
      token
    );
    const pagesData = await pagesRes.json();
    const pages = pagesData.data || [];

    if (pages.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const fetchers: Promise<any[]>[] = [];

    for (const page of pages) {
      const pageToken = page.access_token;
      if (!pageToken) continue;

      // ── 1. Facebook Messenger ──
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
                contactAvatar: other?.id ? `/api/inbox/avatar?userId=${other.id}&pageId=${page.id}` : null,
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
      const igUsername = page.instagram_business_account?.username;
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
                  contactAvatar: other?.id ? `/api/inbox/avatar?userId=${other.id}&pageId=${page.id}` : null,
                  lastMessage: lastMsg?.message || "",
                  lastMessageAt: conv.updated_time || lastMsg?.created_time,
                  unread: false,
                };
              });
            })
            .catch(() => [])
        );

        // ── 3. Instagram Comments (grouped by media) ──
        fetchers.push(
          metaFetch(
            metaUrl(`${igId}/media`, {
              fields: "id,caption,timestamp,permalink,like_count,comments_count,media_url,thumbnail_url,media_type,comments.limit(10){id,text,from{id,username},timestamp,like_count}",
              limit: "15",
            }),
            pageToken
          )
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (!data?.data) return [];
              return data.data
                .filter((media: any) => (media.comments_count || media.comments?.data?.length) > 0)
                .map((media: any) => {
                  const comments = (media.comments?.data || []).filter((c: any) => c.from?.id !== igId);
                  const latestComment = comments[0];
                  return {
                    id: `igc_${media.id}`,
                    platform: "instagram_comment",
                    pageId: page.id,
                    pageName: igUsername || page.name,
                    contactName: latestComment?.from?.username || "Comentarios",
                    contactId: null,
                    contactAvatar: media.media_url || media.thumbnail_url || null,
                    lastMessage: latestComment?.text || media.caption || "",
                    lastMessageAt: latestComment?.timestamp || media.timestamp,
                    unread: true,
                    // Extra data for post view
                    _postData: {
                      caption: media.caption || "",
                      mediaUrl: media.media_url || media.thumbnail_url || null,
                      mediaType: media.media_type || "IMAGE",
                      permalink: media.permalink || null,
                      likeCount: media.like_count || 0,
                      commentsCount: media.comments_count || comments.length,
                      comments: comments.slice(0, 10).map((c: any) => ({
                        id: c.id,
                        text: c.text,
                        username: c.from?.username || "usuario",
                        timestamp: c.timestamp,
                        likes: c.like_count || 0,
                      })),
                    },
                  };
                });
            })
            .catch(() => [])
        );
      }

      // ── 4. Facebook Post Comments (grouped by post) ──
      fetchers.push(
        metaFetch(
          metaUrl(`${page.id}/feed`, {
            fields: "id,message,created_time,permalink_url,full_picture,shares,likes.summary(true),comments.summary(true).limit(10){id,message,from{id,name},created_time,like_count}",
            limit: "15",
          }),
          pageToken
        )
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (!data?.data) return [];
            return data.data
              .filter((post: any) => {
                const commentCount = post.comments?.summary?.total_count || post.comments?.data?.length || 0;
                return commentCount > 0;
              })
              .map((post: any) => {
                const comments = (post.comments?.data || []).filter((c: any) => c.from?.id !== page.id);
                const latestComment = comments[0];
                const likeCount = post.likes?.summary?.total_count || 0;
                const shareCount = post.shares?.count || 0;
                const commentCount = post.comments?.summary?.total_count || comments.length;
                return {
                  id: `fbc_${post.id}`,
                  platform: "facebook_comment",
                  pageId: page.id,
                  pageName: page.name,
                  contactName: latestComment?.from?.name || "Comentarios",
                  contactId: latestComment?.from?.id || null,
                  contactAvatar: post.full_picture || null,
                  lastMessage: latestComment?.message || post.message || "",
                  lastMessageAt: latestComment?.created_time || post.created_time,
                  unread: true,
                  // Extra data for post view
                  _postData: {
                    caption: post.message || "",
                    mediaUrl: post.full_picture || null,
                    mediaType: "IMAGE",
                    permalink: post.permalink_url || null,
                    likeCount,
                    shareCount,
                    commentsCount: commentCount,
                    comments: comments.slice(0, 10).map((c: any) => ({
                      id: c.id,
                      text: c.message || "",
                      username: c.from?.name || "Usuario",
                      userId: c.from?.id || null,
                      avatar: c.from?.id ? `/api/inbox/avatar?userId=${c.from.id}&pageId=${page.id}` : null,
                      timestamp: c.created_time,
                      likes: c.like_count || 0,
                    })),
                  },
                };
              });
          })
          .catch(() => [])
      );
    }

    const results = await Promise.all(fetchers);
    const conversations = results.flat();

    conversations.sort((a, b) =>
      new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
    );

    return NextResponse.json({ conversations });
  } catch (err: any) {
    console.error("[INBOX] Conversations error:", err);
    return NextResponse.json({ error: err.message || "Error" }, { status: 500 });
  }
}
