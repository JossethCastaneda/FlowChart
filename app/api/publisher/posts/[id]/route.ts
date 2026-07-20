import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import prisma from "@/lib/prisma";
import { z } from "zod";
import {
  cancelLegacyQstashSchedule,
  startPublishWorkflowSchedule,
  validatePublisherScheduledAt,
} from "@/lib/publisher/schedule";
import { logger } from "@/lib/logger";

const updatePostSchema = z.object({
  content: z.string().optional(),
  channels: z.array(z.string()).min(1).optional(),
  mediaUrls: z.array(z.string()).optional(),
  scheduledAt: z.string().nullable().optional(),
  status: z.enum(["Draft", "Scheduled"]).optional(),
  type: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  projectId: z.string().nullable().optional(),
  pageName: z.string().nullable().optional(),
  pageId: z.string().nullable().optional(),
  // Persistir texto por-plataforma y primer comentario también al editar.
  contentByPlatform: z.record(z.string(), z.string()).nullable().optional(),
  firstComment: z.string().nullable().optional(),
});

// GET /api/publisher/posts/[id]
export const GET = withWorkspace(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;

  const post = await prisma.scheduledPost.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
  });

  if (!post) {
    return apiError("Post no encontrado", "NOT_FOUND", 404);
  }

  return apiSuccess({ post });
});

// PUT /api/publisher/posts/[id]
export const PUT = withWorkspace(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;

  const existing = await prisma.scheduledPost.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
  });

  if (!existing) {
    return apiError("Post no encontrado", "NOT_FOUND", 404);
  }

  if (!["Draft", "Scheduled"].includes(existing.status)) {
    return apiError("Solo puedes editar posts en borrador o programados", "VALIDATION_ERROR", 400);
  }

  const parsed = await validateBody(req, updatePostSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const updateData: Prisma.ScheduledPostUpdateInput = {};

  if (body.content !== undefined) {
    const content = body.content.trim();
    if (!content) return apiError("El contenido es obligatorio", "VALIDATION_ERROR", 400);
    updateData.content = content;
  }
  if (body.channels !== undefined) updateData.channels = body.channels;
  if (body.mediaUrls !== undefined) updateData.mediaUrls = body.mediaUrls;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.type !== undefined) updateData.type = body.type;
  if (body.hashtags !== undefined) updateData.hashtags = body.hashtags;
  if (body.projectId !== undefined) updateData.projectId = body.projectId || null;
  if (body.pageName !== undefined) updateData.pageName = body.pageName || null;
  if (body.pageId !== undefined) updateData.pageId = body.pageId || null;
  if (body.contentByPlatform !== undefined) updateData.contentByPlatform = body.contentByPlatform ?? undefined;
  if (body.firstComment !== undefined) updateData.firstComment = body.firstComment;

  let requestedTime: Date | null | undefined;
  if (body.scheduledAt !== undefined) {
    requestedTime = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (requestedTime && Number.isNaN(requestedTime.getTime())) {
      return apiError("Fecha de publicacion invalida", "VALIDATION_ERROR", 400);
    }
    updateData.scheduledAt = requestedTime;
  }

  const finalStatus = body.status || existing.status;
  const finalTime = requestedTime !== undefined ? requestedTime : existing.scheduledAt;

  if (finalStatus === "Scheduled") {
    if (!finalTime) {
      return apiError("Fecha requerida para programar", "VALIDATION_ERROR", 400);
    }
  }

  let scheduleId = existing.qStashMessageId;
  const statusChanged = body.status !== undefined && body.status !== existing.status;
  const existingTime = existing.scheduledAt?.getTime() ?? null;
  const nextTime = finalTime?.getTime() ?? null;
  const timeChanged = body.scheduledAt !== undefined && nextTime !== existingTime;
  const scheduleChanged = statusChanged || timeChanged;

  if (finalStatus === "Scheduled" && (scheduleChanged || !scheduleId) && finalTime) {
    const scheduleError = validatePublisherScheduledAt(finalTime);
    if (scheduleError) return apiError(scheduleError, "VALIDATION_ERROR", 400);
  }

  if (scheduleChanged) {
    await cancelLegacyQstashSchedule(existing.qStashMessageId);
    scheduleId = null;
  }

  if (finalStatus !== "Scheduled") {
    scheduleId = null;
  } else if (finalTime && (!scheduleId || scheduleChanged)) {
    try {
      scheduleId = await startPublishWorkflowSchedule(id, finalTime);
      updateData.error = null;
    } catch (error) {
      logger.error("Failed to reschedule publisher workflow", {
        route: "api/publisher/posts/[id]",
        postId: id,
        workspaceId: ctx.workspaceId,
        error,
      });
      scheduleId = null;
      updateData.error =
        "No se pudo reprogramar en Workflow; el post no se publicara automaticamente.";
    }
  }

  updateData.qStashMessageId = scheduleId;

  const post = await prisma.scheduledPost.update({
    where: { id },
    data: updateData,
  });

  return apiSuccess({ post });
});

// DELETE /api/publisher/posts/[id]
export const DELETE = withWorkspace(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;

  const existing = await prisma.scheduledPost.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
  });

  if (!existing) {
    return apiError("Post no encontrado", "NOT_FOUND", 404);
  }

  await cancelLegacyQstashSchedule(existing.qStashMessageId);
  await prisma.scheduledPost.delete({ where: { id } });

  return apiSuccess({ success: true });
});
