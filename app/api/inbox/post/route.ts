import { NextRequest, NextResponse } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { decryptToken } from "@/lib/encryption";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { metaFetch } from "@/lib/server-auth";

const META_V = process.env.META_API_VERSION || "v25.0";

/**
 * GET /api/inbox/post?postId=<post_id>&pageId=<page_id>
 *
 * Carga un post de Facebook con sus comentarios on-demand.
 * Usado cuando un hilo de comentario llega por webhook (sin _postData).
 * Resuelve el page token desde la DB (mismo patron que /api/inbox/reply).
 */
export const GET = withWorkspace(async (request, ctx) => {
  const workspaceId = ctx.workspaceId;

  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("postId");
  const pageId = searchParams.get("pageId");

  if (!postId || !pageId) {
    return NextResponse.json({ error: "postId y pageId son requeridos" }, { status: 400 });
  }

  // ── Resolver pageToken desde la DB (igual que reply/route.ts) ──
  // Nunca confiamos en tokens del cliente ni hacemos chain de Graph API.
  let pageToken: string | null = null;

  const PROVIDERS_PRIORITY = ["meta_community", "meta"] as const;
  for (const prov of PROVIDERS_PRIORITY) {
    if (pageToken) break;
    const integration = await prisma.integration.findFirst({
      where: { workspaceId, provider: prov, connected: true },
    });
    if (!integration?.credentials) continue;
    const creds = integration.credentials as Record<string, unknown>;

    // 1. Page-specific token desde pages[] (formato del connect callback)
    const pages = creds.pages as Array<{ id: string; accessToken?: string }> | undefined;
    const matchedPage = pages?.find((p) => p.id === pageId);
    if (matchedPage?.accessToken) {
      try { pageToken = decryptToken(matchedPage.accessToken); } catch { pageToken = null; }
      if (pageToken) break;
    }

    // 2. Fallback: user access token
    const userToken = creds.accessToken as string | undefined;
    if (userToken) {
      try { pageToken = decryptToken(userToken); } catch { pageToken = null; }
    }
  }

  if (!pageToken) {
    logger.warn("[INBOX-POST] No page token found", { workspaceId, pageId });
    return NextResponse.json(
      { error: "No se encontro token para esta pagina. Reconecta tu cuenta en Integraciones." },
      { status: 401 }
    );
  }

  try {
    const res = await metaFetch(
      `https://graph.facebook.com/${META_V}/${encodeURIComponent(postId)}?fields=id,message,created_time,permalink_url,full_picture,shares,likes.summary(true),comments.summary(true).limit(25){id,message,from{id,name},created_time,like_count}`,
      pageToken,
      { cache: "no-store" }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      logger.warn("[INBOX-POST] Graph API error", { postId, pageId, status: res.status, err: errData });
      return NextResponse.json({ error: "No se pudo cargar el post" }, { status: 502 });
    }

    const post = await res.json();
    const allComments = (post.comments?.data ?? []) as Array<{
      id: string; message?: string;
      from?: { id?: string; name?: string };
      created_time: string; like_count?: number;
    }>;
    const userComments = allComments.filter((c) => c.from?.id !== pageId);

    const postData = {
      caption: post.message || "",
      mediaUrl: post.full_picture || null,
      mediaType: "IMAGE",
      permalink: post.permalink_url || null,
      likeCount: post.likes?.summary?.total_count || 0,
      shareCount: post.shares?.count || 0,
      commentsCount: post.comments?.summary?.total_count || userComments.length,
      comments: userComments.slice(0, 25).map((c) => ({
        id: c.id,
        text: c.message || "",
        username: c.from?.name || "Usuario",
        userId: c.from?.id || null,
        // Avatar via proxy server-side — NUNCA embeber el pageToken en la URL
        // devuelta al cliente (mismo patrón que /api/inbox/comments).
        avatar: c.from?.id
          ? `/api/inbox/avatar?userId=${encodeURIComponent(c.from.id)}&pageId=${encodeURIComponent(pageId)}`
          : null,
        timestamp: c.created_time,
        likes: c.like_count || 0,
      })),
    };

    return NextResponse.json({ postData });
  } catch (err) {
    logger.error("[INBOX-POST] Error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
});
