import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getMetaAccessToken } from "@/lib/server-auth";
import { z } from "zod";
import { validateBody } from "@/lib/validate";
import { publishPostToMeta, type PublishMode } from "@/lib/publisher/publish-to-meta";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";

import { logger } from "@/lib/logger";

// El flujo peor caso (video IG: subida + polling ~50s) supera 60s → la función moría
// tras publicar pero antes de guardar externalIds, dejando el post "Failed" pese a estar
// publicado y habilitando duplicados al reintentar. 300s es el máximo de la plataforma.
export const maxDuration = 300;

const STALE_LOCK_MS = 5 * 60 * 1000;

/**
 * POST /api/publisher/publish
 *
 * Publishes a saved post immediately to Facebook Page and/or Instagram.
 */
export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const parsed = await validateBody(req, z.object({ postId: z.string() }));
  if (!parsed.ok) return parsed.response;
  const { postId } = parsed.data;

  const post = await prisma.scheduledPost.findFirst({
    where: { id: postId, workspaceId: ctx.workspaceId },
  });

  if (!post) {
    return apiError("Post no encontrado", "NOT_FOUND", 404);
  }

  if (post.status === "Published") {
    return apiError("Este post ya fue publicado", "VALIDATION_ERROR", 400);
  }

  // CLAIM ATÓMICO: evita la doble publicación (dos requests manuales concurrentes, o un
  // manual + el workflow programado). Solo un actor gana el updateMany condicional; el
  // resto recibe 409. Un lock "Publishing" viejo (>5min, función muerta) se puede reclamar.
  const staleBefore = new Date(Date.now() - STALE_LOCK_MS);
  const claim = await prisma.scheduledPost.updateMany({
    where: {
      id: postId,
      workspaceId: ctx.workspaceId,
      OR: [
        { status: { in: ["Draft", "Scheduled", "Failed"] } },
        { status: "Publishing", updatedAt: { lt: staleBefore } },
      ],
    },
    data: { status: "Publishing" },
  });
  if (claim.count === 0) {
    return apiError("Este post ya se está publicando o ya fue publicado", "ALREADY_PUBLISHING", 409);
  }

  // Resuelve el token estrictamente según el canal del post (sin fallback cruzado para respetar accesos)
  let accessToken = null;
  if (post.channels.includes("facebook")) {
    accessToken = await getMetaAccessToken(req, "publisher_facebook");
  } else if (post.channels.includes("instagram")) {
    accessToken = await getMetaAccessToken(req, "publisher_instagram");
  }

  if (!accessToken) {
    // Liberar el claim (si no, el post queda "Publishing" hasta expirar el lock).
    await prisma.scheduledPost.update({
      where: { id: postId },
      data: { status: "Failed", error: "No hay cuenta de Meta conectada para el canal del post" },
    }).catch(() => {});
    return apiError(
      "No hay cuenta de Facebook conectada. Ve al Publisher y conecta tu cuenta de Facebook.",
      "UNAUTHORIZED",
      401
    );
  }

  const mode: PublishMode = "now";
  const { externalIds, errors, targetPage } = await publishPostToMeta({
    post,
    accessToken,
    mode,
  });

  logger.info("Publisher post publish attempted", {
    route: "api/publisher/publish",
    postId,
    workspaceId: ctx.workspaceId,
    mode,
    pageId: targetPage?.id,
    publishedChannels: Object.keys(externalIds),
    errorCount: errors.length,
  });

  const hasAnySuccess = Object.keys(externalIds).length > 0;
  const newStatus = hasAnySuccess ? "Published" : "Failed";



  const updateData: Prisma.ScheduledPostUpdateInput = {
    externalIds,
    publishedAt: hasAnySuccess ? new Date() : null,
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
    post: updated,
    published: externalIds,
    warnings: errors.length > 0 ? errors : undefined,
  });
});
