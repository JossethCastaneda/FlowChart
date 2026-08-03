import { withAuth } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiError, apiNotFound, apiForbidden } from "@/lib/api-response";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { logger } from "@/lib/logger";
import { recordAudit } from "@/lib/audit";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const RemoveMemberSchema = z.object({
  userId: z.string().min(1, "userId requerido"),
});

// GET /api/workspace/[workspaceId]/members — list all members (any member)
export const GET = withAuth(async (_req, ctx) => {
  const { workspaceId } = await ctx.params;

  const hasAccess = await verifyWorkspaceAccess(workspaceId, ctx.userId);
  if (!hasAccess) return apiForbidden();

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { role: "asc" },
  });

  return apiSuccess(members);
});

// DELETE /api/workspace/[workspaceId]/members — remove a member (OWNER/ADMIN)
export const DELETE = withAuth(async (req, ctx) => {
  const { workspaceId } = await ctx.params;

  // Auth check before body parsing
  const requester = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: ctx.userId } },
    select: { role: true },
  });
  if (!requester || !["OWNER", "ADMIN"].includes(requester.role)) {
    return apiForbidden("Solo OWNER o ADMIN pueden eliminar miembros");
  }

  const result = await validateBody(req, RemoveMemberSchema);
  if (!result.ok) return result.response;
  const { userId } = result.data;

  const target = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  if (!target) return apiNotFound("Miembro no encontrado");

  // ADMIN can only remove MEMBERs. Only OWNER can remove ADMINs/OWNERs.
  if (requester.role === "ADMIN" && target.role !== "MEMBER") {
    return apiForbidden("Solo el OWNER puede eliminar ADMINs u OWNERs");
  }

  // Protect the last OWNER
  if (target.role === "OWNER") {
    const ownerCount = await prisma.workspaceMember.count({
      where: { workspaceId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return apiError("No puedes eliminar al único OWNER del workspace", "LAST_OWNER", 400);
    }
  }

  await prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

  logger.info("Workspace member removed", { workspaceId, removedUserId: userId, byUserId: ctx.userId });
  await recordAudit({
    workspaceId,
    userId: ctx.userId,
    action: "member.removed",
    resourceType: "WorkspaceMember",
    resourceId: userId,
  });

  return apiSuccess({ removed: true });
});
