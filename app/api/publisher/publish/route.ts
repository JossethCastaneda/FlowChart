import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getMetaAccessToken } from "@/lib/server-auth";
import { z } from "zod";
import { validateBody } from "@/lib/validate";
import { publishPostToMeta, type PublishMode } from "@/lib/publisher/publish-to-meta";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { cancelLegacyQstashSchedule } from "@/lib/publisher/schedule";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

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

  if (newStatus === "Published" && post.qStashMessageId) {
    await cancelLegacyQstashSchedule(post.qStashMessageId);
  }

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
