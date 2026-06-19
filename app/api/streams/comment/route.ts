import { NextRequest, NextResponse } from "next/server";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { logger } from "@/lib/logger";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

const CommentSchema = z.object({
  postId: z.string().min(1),
  platform: z.enum(["facebook", "instagram"]),
  content: z.string().min(1, "El comentario no puede estar vacío").max(2000).transform((s) => s.trim()),
});

/**
 * POST /api/streams/comment
 * Publishes a comment to a Facebook or Instagram post.
 * Uses the workspace's stored Meta page access token, not the user's JWT token.
 */
export async function POST(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return apiError("No autorizado", "UNAUTHORIZED", 401);

  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return apiError("Sin workspace activo", "NO_WORKSPACE", 400);

  const token = await getMetaAccessToken(request, "streams");
  if (!token) return apiError("Integración de Meta no conectada", "NO_META_TOKEN", 401);

  const result = await validateBody(request, CommentSchema);
  if (!result.ok) return result.response;
  const { postId, platform, content } = result.data;

  // Resolve the page token for the target post
  const pagesRes = await metaFetch(
    metaUrl("me/accounts", { fields: "id,name,access_token,instagram_business_account" }),
    token
  );
  const pagesData = await pagesRes.json();
  const pages: Array<{ id: string; access_token: string }> = pagesData.data || [];

  if (pages.length === 0) {
    return apiError("No hay páginas de Facebook conectadas", "NO_PAGES", 400);
  }

  // Find the page that owns this post (postId starts with page.id)
  let targetPage = pages[0];
  for (const p of pages) {
    if (postId.startsWith(p.id)) {
      targetPage = p;
      break;
    }
  }
  const pageToken = targetPage.access_token || token;

  const res = await metaFetch(
    metaUrl(`${postId}/comments`, { message: content }),
    pageToken,
    { method: "POST" }
  );

  const data = await res.json();
  if (!res.ok) {
    logger.warn("Meta comment API error", {
      workspaceId,
      platform,
      status: res.status,
      error: data.error?.message,
    });
    return apiError(
      data.error?.message || "Error al publicar el comentario",
      "META_API_ERROR",
      res.status
    );
  }

  return apiSuccess({ comment: data });
}
