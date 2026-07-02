import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/inbox/conversations
 *
 * Omnichannel unified inbox — fetches conversations from ALL connected channels:
 *   1. Facebook Messenger (DMs per page)
 *   2. Facebook Post Comments (grouped by post)
 *   3. Instagram DMs (only if token has instagram_messaging scope)
 *   4. Instagram Media Comments (only if token has ig_scope)
 *   5. WhatsApp (from Neon/Prisma DB)
 *
 * Each channel is fetched independently via Promise.allSettled so a failure
 * in one channel never blocks the others.
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });
  const token = await getMetaAccessToken(request, "inbox");
  if (!token) return NextResponse.json({ error: "No Meta token" }, { status: 401 });

  // ── Fetch connected pages ──────────────────────────────────────────────────
  let pages: any[] = [];
  try {
    const pagesRes = await metaFetch(
      metaUrl("me/accounts", {
        fields: "id,name,access_token,instagram_business_account{id,username,profile_picture_url}",
        limit: "50",
      }),
      token
    );
    const pagesData = await pagesRes.json();
    pages = pagesData.data || [];
    logger.info("[INBOX] Pages loaded", { count: pages.length });
  } catch (err) {
    logger.warn("[INBOX] Could not load pages — returning empty inbox", { err });
    return NextResponse.json({ conversations: [] });
  }

  if (pages.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  // ── Build per-channel fetchers ─────────────────────────────────────────────
  // Each entry is a named { channel, promise } so we can log failures per source.
  const channelFetchers: Array<{ channel: string; promise: Promise<any[]> }> = [];

  for (const page of pages) {
    const pageToken = page.access_token;
    if (!pageToken) continue;

    // ── 1. Facebook Messenger ──────────────────────────────────────────────
    channelFetchers.push({
      channel: `messenger:${page.id}`,
      promise: metaFetch(
        metaUrl(`${page.id}/conversations`, {
          fields: "id,participants,updated_time,unread_count,messages.limit(1){message,from,created_time}",
          limit: "25",
        }),
        pageToken
      )
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
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
        }),
    });

    // ── 2. Facebook Post Comments ──────────────────────────────────────────
    channelFetchers.push({
      channel: `fb_comments:${page.id}`,
      promise: metaFetch(
        metaUrl(`${page.id}/feed`, {
          fields: "id,message,created_time,permalink_url,full_picture,shares,likes.summary(true),comments.summary(true).limit(10){id,message,from{id,name},created_time,like_count}",
          limit: "15",
        }),
        pageToken
      )
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
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
        }),
    });

    // ── 3. Instagram DMs (only if page has linked IG account) ─────────────
    // NOTE: This will only succeed if the connected token has `instagram_messaging` scope.
    // With the new app separation, the inbox token (pages_messaging) does NOT have IG scopes.
    // We keep this fetcher so it works if the token is ever upgraded or replaced.
    const igId = page.instagram_business_account?.id;
    const igUsername = page.instagram_business_account?.username;

    if (igId) {
      channelFetchers.push({
        channel: `ig_dm:${igId}`,
        promise: metaFetch(
          metaUrl(`${igId}/conversations`, {
            fields: "id,participants,updated_time,messages.limit(1){message,from,created_time}",
            platform: "instagram",
            limit: "25",
          }),
          pageToken
        )
          .then(r => {
            // A 403 or 400 here simply means the token lacks IG DM scopes — not fatal
            if (!r.ok) return Promise.reject(new Error(`IG DM scope not available: HTTP ${r.status}`));
            return r.json();
          })
          .then(data => {
            if (!data?.data) return [];
            return data.data.map((conv: any) => {
              const other = conv.participants?.data?.find((p: any) => p.id !== igId);
              const lastMsg = conv.messages?.data?.[0];
              return {
                id: conv.id,
                platform: "instagram_dm",
                pageId: page.id,
                pageName: igUsername || page.name,
                contactName: other?.name || other?.username || "Usuario IG",
                contactId: other?.id || null,
                contactAvatar: other?.id ? `/api/inbox/avatar?userId=${other.id}&pageId=${page.id}` : null,
                lastMessage: lastMsg?.message || "",
                lastMessageAt: conv.updated_time || lastMsg?.created_time,
                unread: false,
              };
            });
          }),
      });

      // ── 4. Instagram Media Comments ──────────────────────────────────────
      channelFetchers.push({
        channel: `ig_comments:${igId}`,
        promise: metaFetch(
          metaUrl(`${igId}/media`, {
            fields: "id,caption,timestamp,permalink,like_count,comments_count,media_url,thumbnail_url,media_type,comments.limit(10){id,text,from{id,username},timestamp,like_count}",
            limit: "15",
          }),
          pageToken
        )
          .then(r => {
            if (!r.ok) return Promise.reject(new Error(`IG Comments scope not available: HTTP ${r.status}`));
            return r.json();
          })
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
                  contactName: latestComment?.from?.username || "Comentarios IG",
                  contactId: null,
                  contactAvatar: media.media_url || media.thumbnail_url || null,
                  lastMessage: latestComment?.text || media.caption || "",
                  lastMessageAt: latestComment?.timestamp || media.timestamp,
                  unread: true,
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
          }),
      });
    }
  }

  // ── Run all channel fetchers in parallel, isolated ─────────────────────────
  // Promise.allSettled ensures one channel failure never blocks others
  const results = await Promise.allSettled(channelFetchers.map(f => f.promise));

  const remoteConversations: any[] = [];
  results.forEach((result, i) => {
    const { channel } = channelFetchers[i];
    if (result.status === "fulfilled") {
      remoteConversations.push(...result.value);
      logger.info(`[INBOX] ✅ Channel OK`, { channel, count: result.value.length });
    } else {
      // Log the failure but continue — this channel simply won't contribute conversations
      logger.warn(`[INBOX] ⚠️ Channel skipped (likely missing scope or token)`, {
        channel,
        reason: result.reason?.message || String(result.reason),
      });
    }
  });

  // ── 5. WhatsApp — Local Conversations from Neon/Prisma DB ─────────────────
  let mappedLocal: any[] = [];
  try {
    const { default: prisma } = await import("@/lib/prisma");
    const localConversations = await prisma.inboxConversation.findMany({
      where: { workspaceId, platform: "whatsapp" },
      orderBy: { lastMessageAt: "desc" },
    });

    mappedLocal = localConversations.map((c) => ({
      id: c.id,
      platform: "whatsapp",
      pageId: c.pageId || "",
      pageName: "WhatsApp",
      contactName: c.contactName || "Usuario WhatsApp",
      contactId: c.externalId.replace("wa_", ""),
      contactAvatar: c.contactAvatar || null,
      lastMessage: c.lastMessage || "",
      lastMessageAt: c.lastMessageAt || c.updatedAt,
      unread: c.unread,
    }));
    logger.info("[INBOX] ✅ WhatsApp OK", { count: mappedLocal.length });
  } catch (err) {
    logger.warn("[INBOX] ⚠️ WhatsApp DB fetch failed", { err });
  }

  // ── Merge + sort by most recent ───────────────────────────────────────────
  const conversations = [...remoteConversations, ...mappedLocal];
  conversations.sort((a, b) =>
    new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
  );

  logger.info("[INBOX] Conversations ready", { total: conversations.length });
  return NextResponse.json({ conversations });
}
