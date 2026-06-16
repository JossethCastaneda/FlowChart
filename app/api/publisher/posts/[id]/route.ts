import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { cancelPublishJob } from "@/lib/qstash";
import { start } from "workflow/api";
import { publishPostWorkflow } from "@/workflows/publish-post";

// GET /api/publisher/posts/[id]
export const GET = withWorkspace(async (req: NextRequest, ctx) => {
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
  
  // Verify post belongs to workspace
  const existing = await prisma.scheduledPost.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
  });
  
  if (!existing) {
    return apiError("Post no encontrado", "NOT_FOUND", 404);
  }

  // Only allow editing Draft or Scheduled posts
  if (!["Draft", "Scheduled"].includes(existing.status)) {
    return apiError("Solo puedes editar posts en borrador o programados", "VALIDATION_ERROR", 400);
  }

  const _validate = await validateBody(req, z.any());
  if (!_validate.ok) return _validate.response;
  const body = _validate.data;

  const updateData: any = {};

  if (body.content !== undefined) updateData.content = body.content;
  if (body.channels !== undefined) updateData.channels = body.channels;
  if (body.mediaUrls !== undefined) updateData.mediaUrls = body.mediaUrls;
  if (body.scheduledAt !== undefined) updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.type !== undefined) updateData.type = body.type;
  if (body.hashtags !== undefined) updateData.hashtags = body.hashtags;
  if (body.projectId !== undefined) updateData.projectId = body.projectId;
  if (body.pageName !== undefined) updateData.pageName = body.pageName;
  if (body.pageId !== undefined) updateData.pageId = body.pageId;

  if (updateData.status === "Scheduled" && !updateData.scheduledAt && !existing.scheduledAt) {
    return apiError("Fecha requerida para programar", "VALIDATION_ERROR", 400);
  }

  let newQstashMessageId = existing.qStashMessageId;
  const statusChanged = updateData.status !== undefined && updateData.status !== existing.status;
  const timeChanged = updateData.scheduledAt !== undefined && 
    (updateData.scheduledAt === null || updateData.scheduledAt.getTime() !== existing.scheduledAt?.getTime());

  // Cancel old schedule if status or time changed
  if (existing.qStashMessageId && (statusChanged || timeChanged)) {
    await cancelPublishJob(existing.qStashMessageId);
    newQstashMessageId = null;
  }

  const finalStatus = updateData.status || existing.status;
  const finalTime = updateData.scheduledAt !== undefined ? updateData.scheduledAt : existing.scheduledAt;

  // Create new schedule if it should be scheduled
  if (finalStatus === "Scheduled" && finalTime && !newQstashMessageId) {
    try {
      const delaySeconds = Math.max(0, Math.floor((finalTime.getTime() - Date.now()) / 1000));
      const { runId } = await start(publishPostWorkflow, [id, delaySeconds]);
      newQstashMessageId = runId;
      updateData.error = null;
    } catch (e) {
      console.error("[WORKFLOW_ERROR] Failed to schedule new workflow:", e);
      // Hacemos visible el fallo en lugar de dejar un post programado que nunca correrá.
      updateData.error =
        "No se pudo reprogramar en Workflow; el post no se publicará automáticamente.";
    }
  }

  updateData.qStashMessageId = newQstashMessageId;

  const post = await prisma.scheduledPost.update({
    where: { id },
    data: updateData,
  });

  return apiSuccess({ post });
});

// DELETE /api/publisher/posts/[id]
export const DELETE = withWorkspace(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  
  const existing = await prisma.scheduledPost.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
  });
  
  if (!existing) {
    return apiError("Post no encontrado", "NOT_FOUND", 404);
  }

  await cancelPublishJob(existing.qStashMessageId);

  await prisma.scheduledPost.delete({ where: { id } });

  return apiSuccess({ success: true });
});
