import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/inbox/comments
 *
 * Comentarios de posts de Facebook e Instagram (carga EN VIVO, perezosa).
 *
 * Los DMs viven en /api/inbox/conversations (DB, instantáneo). Los comentarios se
 * separaron aquí para NO frenar la carga del inbox: el cliente los pide aparte y
 * solo cuando hacen falta (pestañas de comentarios), no en el poll de 12s de DMs.
 * Cada canal se resuelve con Promise.allSettled; un fallo se reporta en `skipped`
 * en vez de tirar todo o desaparecer en silencio.
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const [fbToken, igToken] = await Promise.all([
    getMetaAccessToken(request, "inbox").catch(() => null),
    getMetaAccessToken(request, "ig_inbox").catch(() => null),
  ]);
  if (!fbToken && !igToken) return NextResponse.json({ conversations: [], skipped: [] });

  const fetchers: Array<{ channel: string; promise: Promise<unknown[]> }> = [];

  // ── Facebook page feed → comments ──
  if (fbToken) {
    let fbPages: Array<{ id: string; name: string; access_token?: string }> = [];
    try {
      const r = await metaFetch(metaUrl("me/accounts", { fields: "id,name,access_token", limit: "200" }), fbToken, { cache: "no-store" });
      fbPages = (await r.json())?.data ?? [];
    } catch (err) { logger.warn("[INBOX-COMMENTS] FB pages (me/accounts) failed", { err }); }

    // Páginas gestionadas vía Business Manager Portfolio (no aparecen en me/accounts)
    try {
      const bizRes = await metaFetch(metaUrl("me/businesses", { fields: "id,name", limit: "50" }), fbToken, { cache: "no-store" });
      if (bizRes.ok) {
        const bizData = await bizRes.json();
        const pageIds = new Set(fbPages.map((p) => p.id));
        for (const biz of (bizData.data ?? [])) {
          const pagesRes = await metaFetch(
            metaUrl(`${biz.id}/owned_pages`, { fields: "id,name,access_token", limit: "200" }),
            fbToken,
            { cache: "no-store" }
          );
          if (pagesRes.ok) {
            const pagesData = await pagesRes.json();
            for (const p of (pagesData.data ?? [])) {
              if (!pageIds.has(p.id)) { fbPages.push(p); pageIds.add(p.id); }
            }
          }
        }
      }
    } catch (err) { logger.warn("[INBOX-COMMENTS] Business portfolio pages failed", { err }); }

    for (const page of fbPages) {
      const pageToken = page.access_token;
      if (!pageToken) continue;
      fetchers.push({
        channel: `fb_comments:${page.id}`,
        promise: metaFetch(
          metaUrl(`${page.id}/feed`, {
            fields: "id,message,created_time,permalink_url,full_picture,shares,likes.summary(true),comments.summary(true).limit(10){id,message,from{id,name},created_time,like_count}",
            limit: "15",
          }),
          pageToken,
          { cache: "no-store" },
        )
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
          .then((data) => {
            if (!data?.data) return [];
            return data.data
              .filter((post: any) => (post.comments?.summary?.total_count || post.comments?.data?.length || 0) > 0)
              .map((post: any) => {
                const comments = (post.comments?.data || []).filter((c: any) => c.from?.id !== page.id);
                const latestComment = comments[0];
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
                    likeCount: post.likes?.summary?.total_count || 0,
                    shareCount: post.shares?.count || 0,
                    commentsCount: post.comments?.summary?.total_count || comments.length,
                    comments: comments.slice(0, 10).map((c: any) => ({
                      id: c.id, text: c.message || "", username: c.from?.name || "Usuario",
                      userId: c.from?.id || null,
                      avatar: c.from?.id ? `/api/inbox/avatar?userId=${c.from.id}&pageId=${page.id}` : null,
                      timestamp: c.created_time, likes: c.like_count || 0,
                    })),
                  },
                };
              });
          }),
      });
    }
  }

  // ── Instagram media → comments ──
  if (igToken) {
    let igPages: Array<{ access_token?: string; name: string; instagram_business_account?: { id: string; username?: string } }> = [];
    try {
      const r = await metaFetch(metaUrl("me/accounts", { fields: "id,name,access_token,instagram_business_account{id,username}", limit: "100" }), igToken, { cache: "no-store" });
      igPages = (await r.json())?.data ?? [];
    } catch (err) { logger.warn("[INBOX-COMMENTS] IG pages failed", { err }); }

    for (const page of igPages) {
      const pageToken = page.access_token;
      const igId = page.instagram_business_account?.id;
      const igUsername = page.instagram_business_account?.username;
      if (!pageToken || !igId) continue;
      fetchers.push({
        channel: `ig_comments:${igId}`,
        promise: metaFetch(
          metaUrl(`${igId}/media`, {
            fields: "id,caption,timestamp,permalink,like_count,comments_count,media_url,thumbnail_url,media_type,comments.limit(10){id,text,from{id,username},timestamp,like_count}",
            limit: "15",
          }),
          pageToken,
          { cache: "no-store" },
        )
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
          .then((data) => {
            if (!data?.data) return [];
            return data.data
              .filter((media: any) => (media.comments_count || media.comments?.data?.length) > 0)
              .map((media: any) => {
                const comments = (media.comments?.data || []).filter((c: any) => c.from?.id !== igId);
                const latestComment = comments[0];
                return {
                  id: `igc_${media.id}`,
                  platform: "instagram_comment",
                  pageId: igId,
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
                      id: c.id, text: c.text, username: c.from?.username || "usuario",
                      timestamp: c.timestamp, likes: c.like_count || 0,
                    })),
                  },
                };
              });
          }),
      });
    }
  }

  const results = await Promise.allSettled(fetchers.map((f) => f.promise));
  const conversations: unknown[] = [];
  const skipped: { channel: string; reason: string }[] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") conversations.push(...result.value);
    else skipped.push({ channel: fetchers[i].channel, reason: (result.reason as Error)?.message || String(result.reason) });
  });

  conversations.sort((a: any, b: any) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
  return NextResponse.json({ conversations, skipped });
}
