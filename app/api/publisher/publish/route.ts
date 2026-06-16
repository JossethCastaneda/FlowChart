import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMetaAccessToken } from "@/lib/server-auth";
import { z } from "zod";
import { validateBody } from "@/lib/validate";
import { cancelPublishJob } from "@/lib/qstash";
import { publishPostToMeta, type PublishMode } from "@/lib/publisher/publish-to-meta";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";

export const maxDuration = 60;

/**
 * POST /api/publisher/publish
 *
 * Publicación INMEDIATA/manual a Facebook Page e/o Instagram. Comparte la lógica
 * de publicación con el worker de QStash vía lib/publisher/publish-to-meta.
 *
 * - Post normal → modo "now" (publica ya en FB e IG).
 * - Post "Scheduled" → modo "fb_scheduled": usa la programación nativa de Meta
 *   en Facebook y deja el post como Scheduled (IG no soporta programación).
 */
export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const _validate = await validateBody(req, z.object({ postId: z.string() }));
  if (!_validate.ok) return _validate.response;
  const { postId } = _validate.data;

  const post = await prisma.scheduledPost.findFirst({
    where: { id: postId, workspaceId: ctx.workspaceId },
  });

  if (!post) {
    return apiError("Post no encontrado", "NOT_FOUND", 404);
  }

  if (post.status === "Published") {
    return apiError("Este post ya fue publicado", "VALIDATION_ERROR", 400);
  }

  // Token: publisher_facebook → publisher → social → genérico meta
  let accessToken = await getMetaAccessToken(req, "publisher_facebook");
  if (!accessToken) accessToken = await getMetaAccessToken(req, "publisher");
  if (!accessToken) accessToken = await getMetaAccessToken(req, "social");
  if (!accessToken) accessToken = await getMetaAccessToken(req);

  if (!accessToken) {
    return apiError(
      "No hay cuenta de Facebook conectada. Ve al Publisher y conecta tu cuenta de Facebook.",
      "UNAUTHORIZED",
      401
    );
  }

  const mode: PublishMode = post.status === "Scheduled" ? "fb_scheduled" : "now";

  const { externalIds, errors, targetPage } = await publishPostToMeta({
    post,
    accessToken,
    mode,
  });

  console.log(
    "[PUBLISHER] postId:",
    postId,
    "mode:",
    mode,
    "page:",
    targetPage?.id || "none",
    "published:",
    Object.keys(externalIds).join(",") || "none",
    "errors:",
    errors.length
  );

  // ── Persistencia ──
  const hasAnySuccess = Object.keys(externalIds).length > 0;
  const newStatus =
    post.status === "Scheduled" ? "Scheduled" : hasAnySuccess ? "Published" : "Failed";

  // Si se publica YA con éxito, cancelamos su versión programada en QStash.
  if (newStatus === "Published" && post.qStashMessageId) {
    await cancelPublishJob(post.qStashMessageId);
  }

  const updateData: any = {
    externalIds,
    publishedAt: hasAnySuccess && post.status !== "Scheduled" ? new Date() : null,
    status: newStatus,
    error: errors.length > 0 ? errors.join(" | ") : null,
    pageName: targetPage?.name ?? post.pageName,
    pageId: targetPage?.id ?? post.pageId,
    qStashMessageId: newStatus === "Published" ? null : undefined,
  };

  const updated = await prisma.scheduledPost.update({
    where: { id: postId },
    data: updateData,
  });

  if (!hasAnySuccess) {
    // NextResponse directo: apiError no admite payload adicional por defecto.
    return NextResponse.json(
      {
        success: false,
        error: errors.join(" | "),
        code: "PUBLISH_FAILED",
        post: updated,
      },
      { status: 422 }
    );
  }

  return apiSuccess({
    success: true,
    post: updated,
    published: externalIds,
    warnings: errors.length > 0 ? errors : undefined,
  });
});
