import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/inbox/conversations
 *
 * Omnichannel unified inbox — fetches conversations from ALL connected channels:
 *   1. Facebook Messenger (DMs per page) — uses meta_community token
 *   2. Facebook Post Comments (grouped by post) — uses meta_community token
 *   3. Instagram DMs — uses meta_publisher_instagram token (instagram_manage_messages)
 *   4. Instagram Media Comments — uses meta_publisher_instagram token (instagram_manage_comments)
 *   5. WhatsApp (from Neon/Prisma DB)
 *
 * Each channel is fetched independently via Promise.allSettled so a failure
 * in one channel never blocks the others. Both Facebook and Instagram tokens
 * are fetched upfront; each is optional — inbox still works with just one.
 *
 * App separation (July 2026):
 *   - Inbox/Community app (meta_community): FB Pages + Messenger scopes
 *   - Instagram app (meta_publisher_instagram): IG DMs + Comments scopes
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  // ── Fetch both tokens in parallel (each is optional) ──────────────────────
  const [fbToken, igToken] = await Promise.all([
    getMetaAccessToken(request, "inbox").catch(() => null),        // Facebook/Community app
    getMetaAccessToken(request, "ig_inbox").catch(() => null),     // Instagram Publisher app
  ]);

  if (!fbToken && !igToken) {
    return NextResponse.json({ error: "No Meta token" }, { status: 401 });
  }

  logger.info("[INBOX] Tokens available", {
    facebook: fbToken ? "✅" : "❌ not connected",
    instagram: igToken ? "✅" : "❌ not connected",
  });

  // ── Fetch connected Facebook pages ─────────────────────────────────────────
  let fbPages: any[] = [];
  if (fbToken) {
    try {
      const pagesRes = await metaFetch(
        metaUrl("me/accounts", {
          fields: "id,name,access_token,instagram_business_account{id,username,profile_picture_url}",
          limit: "50",
        }),
        fbToken,
        { cache: "no-store" }
      );
      const pagesData = await pagesRes.json();
      fbPages = pagesData.data || [];
      logger.info("[INBOX] FB pages loaded", { count: fbPages.length });
    } catch (err) {
      logger.warn("[INBOX] Could not load FB pages", { err });
    }
  }

  // ── Fetch connected IG accounts (via Instagram Publisher token) ────────────
  // The IG Publisher token also has access to linked page accounts
  let igPages: any[] = [];
  if (igToken) {
    try {
      const igPagesRes = await metaFetch(
        metaUrl("me/accounts", {
          fields: "id,name,access_token,instagram_business_account{id,username,profile_picture_url}",
          limit: "50",
        }),
        igToken,
        { cache: "no-store" }
      );
      const igPagesData = await igPagesRes.json();
      igPages = igPagesData.data || [];
      logger.info("[INBOX] IG-linked pages loaded", { count: igPages.length });
    } catch (err) {
      logger.warn("[INBOX] Could not load IG-linked pages", { err });
    }
  }

  // ── Build per-channel fetchers ─────────────────────────────────────────────
  const channelFetchers: Array<{ channel: string; promise: Promise<any[]> }> = [];

  // ── 1. Facebook Messenger (one fetcher per page) ───────────────────────────
  for (const page of fbPages) {
    const pageToken = page.access_token;
    if (!pageToken) continue;

    channelFetchers.push({
      channel: `messenger:${page.id}`,
      promise: metaFetch(
        metaUrl(`${page.id}/conversations`, {
          fields: "id,participants,updated_time,unread_count,messages.limit(1){message,from,created_time}",
          limit: "25",
        }),
        pageToken,
        { cache: "no-store" }
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
              channelSource: "facebook_app",
            };
          });
        }),
    });

    // ── 2. Facebook Post Comments ────────────────────────────────────────────
    channelFetchers.push({
      channel: `fb_comments:${page.id}`,
      promise: metaFetch(
        metaUrl(`${page.id}/feed`, {
          fields: "id,message,created_time,permalink_url,full_picture,shares,likes.summary(true),comments.summary(true).limit(10){id,message,from{id,name},created_time,like_count}",
          limit: "15",
        }),
        pageToken,
        { cache: "no-store" }
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
                channelSource: "facebook_app",
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
  }

  // ── 3. Instagram DMs — uses Instagram Publisher token ─────────────────────
  // Now that instagram_manage_messages is granted, this will return real DMs
  for (const page of igPages) {
    const pageToken = page.access_token;
    const igId = page.instagram_business_account?.id;
    const igUsername = page.instagram_business_account?.username;
    if (!pageToken || !igId) continue;

    channelFetchers.push({
      channel: `ig_dm:${igId}`,
      promise: metaFetch(
        metaUrl(`${igId}/conversations`, {
          fields: "id,participants,updated_time,messages.limit(1){message,from,created_time}",
          platform: "instagram",
          limit: "25",
        }),
        pageToken,
        { cache: "no-store" }
      )
        .then(r => {
          if (!r.ok) return Promise.reject(new Error(`IG DM: HTTP ${r.status}`));
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
              channelSource: "instagram_app",
            };
          });
        }),
    });

    // ── 4. Instagram Media Comments — uses Instagram Publisher token ─────────
    channelFetchers.push({
      channel: `ig_comments:${igId}`,
      promise: metaFetch(
        metaUrl(`${igId}/media`, {
          fields: "id,caption,timestamp,permalink,like_count,comments_count,media_url,thumbnail_url,media_type,comments.limit(10){id,text,from{id,username},timestamp,like_count}",
          limit: "15",
        }),
        pageToken,
        { cache: "no-store" }
      )
        .then(r => {
          if (!r.ok) return Promise.reject(new Error(`IG Comments: HTTP ${r.status}`));
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
                channelSource: "instagram_app",
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

  // ── Run all channel fetchers in parallel, isolated ─────────────────────────
  const results = await Promise.allSettled(channelFetchers.map(f => f.promise));

  const remoteConversations: any[] = [];
  // Canales que fallaron: se exponen en la respuesta para que el usuario sepa POR QUÉ
  // falta un canal (p.ej. Messenger sin pages_messaging / sin App Review) en vez de
  // ver un inbox vacío sin explicación (antes se tragaba el error con un solo warn).
  const skipped: { channel: string; reason: string }[] = [];
  results.forEach((result, i) => {
    const { channel } = channelFetchers[i];
    if (result.status === "fulfilled") {
      remoteConversations.push(...result.value);
      logger.info(`[INBOX] ✅ ${channel}`, { count: result.value.length });
    } else {
      const reason = result.reason?.message || String(result.reason);
      skipped.push({ channel, reason });
      logger.warn(`[INBOX] ⚠️ ${channel} skipped`, { reason });
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
      channelSource: "whatsapp",
    }));
    logger.info("[INBOX] ✅ WhatsApp", { count: mappedLocal.length });
  } catch (err) {
    logger.warn("[INBOX] ⚠️ WhatsApp DB fetch failed", { err });
  }

  // ── Merge + sort by most recent ───────────────────────────────────────────
  const conversations = [...remoteConversations, ...mappedLocal];
  conversations.sort((a, b) =>
    new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
  );

  logger.info("[INBOX] Conversations ready", {
    total: conversations.length,
    byChannel: {
      messenger: remoteConversations.filter(c => c.platform === "facebook_messenger").length,
      fb_comments: remoteConversations.filter(c => c.platform === "facebook_comment").length,
      ig_dm: remoteConversations.filter(c => c.platform === "instagram_dm").length,
      ig_comments: remoteConversations.filter(c => c.platform === "instagram_comment").length,
      whatsapp: mappedLocal.length,
    },
  });

  return NextResponse.json({ conversations, skipped });
}
