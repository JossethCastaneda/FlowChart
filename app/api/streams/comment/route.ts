import { NextRequest, NextResponse } from "next/server";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getMetaAccessToken, metaFetch, metaUrl, resolvePageToken } from "@/lib/server-auth";
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

  // Resolver el PAGE token de la página dueña del post. Para IG, el postId (media id)
  // no empieza con el page.id de FB, así que el match previo por prefijo caía al
  // pages[0] equivocado en workspaces con varias páginas. Aquí matcheamos la página FB
  // (postId "{pageId}_{postId}") y, si no, dejamos que resolvePageToken elija la página
  // con IG vinculada (best-effort para comentarios de IG).
  const pagesRes = await metaFetch(
    metaUrl("me/accounts", { fields: "id,name,access_token,instagram_business_account" }),
    token,
    { cache: "no-store" }
  );
  const pagesData = await pagesRes.json();
  const pages: Array<{ id: string; access_token: string }> = pagesData.data || [];

  if (pages.length === 0) {
    return apiError("No hay páginas de Facebook conectadas", "NO_PAGES", 400);
  }

  const fbPageId = postId.includes("_") ? postId.split("_")[0] : undefined;
  let pageToken: string;
  if (platform === "facebook" && fbPageId) {
    const owner = pages.find((p) => p.id === fbPageId);
    pageToken = owner?.access_token || token;
  } else {
    const resolved = await resolvePageToken(token, {});
    pageToken = resolved?.pageToken || pages[0].access_token || token;
  }

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
