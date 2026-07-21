import { NextRequest } from "next/server";
import { z } from "zod";
import { withWorkspaceRole } from "@/lib/api-handler";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import { startPublishWorkflowSchedule, validatePublisherScheduledAt } from "@/lib/publisher/schedule";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/publisher/posts/[id]/approve — OWNER/ADMIN aprueba o rechaza un post
 * pendiente de revisión. Al APROBAR un post programado, se dispara el workflow de
 * publicación (que no se inició al crearse por estar pendiente).
 *
 * Body: { decision: "approve" | "reject", note?: string }
 */
const ApproveSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  note: z.string().max(2000).optional(),
});

export const POST = withWorkspaceRole(["OWNER", "ADMIN"])(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;

  const post = await prisma.scheduledPost.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
  });
  if (!post) return apiNotFound("Post no encontrado");

  if (post.approvalStatus !== "pending") {
    return apiError("Este post no está pendiente de aprobación.", "NOT_PENDING", 400);
  }

  const parsed = await validateBody(req, ApproveSchema);
  if (!parsed.ok) return parsed.response;
  const { decision, note } = parsed.data;

  if (decision === "reject") {
    const updated = await prisma.scheduledPost.update({
      where: { id: post.id },
      data: { approvalStatus: "rejected", approvedById: ctx.userId, approvedAt: new Date(), reviewNote: note ?? null },
    });
    logger.info("[PUBLISHER] Post rechazado", { postId: post.id, workspaceId: ctx.workspaceId, by: ctx.userId });
    return apiSuccess({ post: updated });
  }

  // Aprobar: marcar aprobado y, si estaba programado a futuro, disparar el workflow.
  let updated = await prisma.scheduledPost.update({
    where: { id: post.id },
    data: { approvalStatus: "approved", approvedById: ctx.userId, approvedAt: new Date(), reviewNote: note ?? null },
  });

  if (updated.status === "Scheduled" && updated.scheduledAt) {
    // Si la fecha ya pasó por la demora de revisión, informar en vez de programar al pasado.
    const scheduleError = validatePublisherScheduledAt(new Date(updated.scheduledAt));
    if (scheduleError) {
      return apiSuccess({
        post: updated,
        warning: `Aprobado, pero la fecha programada ya no es válida (${scheduleError}). Reprograma el post.`,
      });
    }
    try {
      const scheduleToken = await startPublishWorkflowSchedule(updated.id, updated.scheduledAt);
      updated = await prisma.scheduledPost.update({
        where: { id: updated.id },
        data: { qStashMessageId: scheduleToken, error: null },
      });
    } catch (error) {
      logger.error("[PUBLISHER] Failed to schedule after approval", { postId: post.id, error });
      return apiSuccess({
        post: updated,
        warning: "Aprobado, pero no se pudo programar el workflow. Reprograma o publica manualmente.",
      });
    }
  }

  logger.info("[PUBLISHER] Post aprobado", { postId: post.id, workspaceId: ctx.workspaceId, by: ctx.userId });
  return apiSuccess({ post: updated });
});
