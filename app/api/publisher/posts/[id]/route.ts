import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import prisma from "@/lib/prisma";
import { z } from "zod";

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

  await prisma.scheduledPost.delete({ where: { id } });

  return apiSuccess({ success: true });
});
