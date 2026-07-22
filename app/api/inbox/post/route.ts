import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/inbox/post?postId=<post_id>&pageId=<page_id>
 *
 * Carga un post de Facebook con sus comentarios on-demand.
 * Usado cuando un hilo de comentario llega por webhook (sin _postData)
 * y el usuario lo abre en el inbox.
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("postId");
  const pageId = searchParams.get("pageId");

  if (!postId || !pageId) {
    return NextResponse.json({ error: "postId y pageId son requeridos" }, { status: 400 });
  }

  const fbToken = await getMetaAccessToken(request, "inbox").catch(() => null);
  if (!fbToken) {
    return NextResponse.json({ error: "No hay token de Meta conectado" }, { status: 401 });
  }

  try {
    // Intentar obtener page access token especifico (necesario para paginas en portfolio)
    let pageToken: string | null = null;
    try {
      const accountsRes = await metaFetch(
        metaUrl("me/accounts", { fields: "id,access_token", limit: "200" }),
        fbToken,
        { cache: "no-store" }
      );
      if (accountsRes.ok) {
        const accounts = await accountsRes.json();
        const match = (accounts.data ?? []).find((p: { id: string; access_token?: string }) => p.id === pageId);
        if (match?.access_token) pageToken = match.access_token;
      }
    } catch { /* silencioso */ }

    // Si no encontramos en me/accounts, buscar via Business Manager portfolio
    if (!pageToken) {
      try {
        const bizRes = await metaFetch(
          metaUrl("me/businesses", { fields: "id", limit: "50" }),
          fbToken,
          { cache: "no-store" }
        );
        if (bizRes.ok) {
          const bizData = await bizRes.json();
          for (const biz of (bizData.data ?? [])) {
            const pagesRes = await metaFetch(
              metaUrl(`${biz.id}/owned_pages`, { fields: "id,access_token", limit: "200" }),
              fbToken,
              { cache: "no-store" }
            );
            if (pagesRes.ok) {
              const pagesData = await pagesRes.json();
              const match = (pagesData.data ?? []).find((p: { id: string; access_token?: string }) => p.id === pageId);
              if (match?.access_token) { pageToken = match.access_token; break; }
            }
          }
        }
      } catch { /* silencioso */ }
    }

    const tokenToUse = pageToken || fbToken;

    const res = await metaFetch(
      metaUrl(postId, {
        fields:
          "id,message,created_time,permalink_url,full_picture,shares,likes.summary(true)," +
          "comments.summary(true).limit(25){id,message,from{id,name},created_time,like_count}",
      }),
      tokenToUse,
      { cache: "no-store" }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      logger.warn("[INBOX-POST] Graph API error", { postId, status: res.status, err: errData });
      return NextResponse.json({ error: "No se pudo cargar el post" }, { status: 502 });
    }

    const post = await res.json();
    const allComments = (post.comments?.data ?? []);
    const userComments = allComments.filter((c: { from?: { id: string } }) => c.from?.id !== pageId);

    const postData = {
      caption: post.message || "",
      mediaUrl: post.full_picture || null,
      mediaType: "IMAGE",
      permalink: post.permalink_url || null,
      likeCount: post.likes?.summary?.total_count || 0,
      shareCount: post.shares?.count || 0,
      commentsCount: post.comments?.summary?.total_count || userComments.length,
      comments: userComments.slice(0, 25).map((c: {
        id: string; message?: string;
        from?: { id?: string; name?: string };
        created_time: string; like_count?: number
      }) => ({
        id: c.id,
        text: c.message || "",
        username: c.from?.name || "Usuario",
        userId: c.from?.id || null,
        avatar: c.from?.id ? `/api/inbox/avatar?userId=${c.from.id}&pageId=${pageId}` : null,
        timestamp: c.created_time,
        likes: c.like_count || 0,
      })),
    };

    return NextResponse.json({ postData });
  } catch (err) {
    logger.error("[INBOX-POST] Error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
