import { withAuth } from "@/lib/api-handler";
import { apiSuccess, apiNotFound, apiForbidden } from "@/lib/api-response";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// DELETE /api/workspace/[workspaceId]/invite/[inviteId] — revoke an invite (OWNER/ADMIN)
export const DELETE = withAuth(async (_req, ctx) => {
  const { workspaceId, inviteId } = await ctx.params;

  const hasAccess = await verifyWorkspaceAccess(workspaceId, ctx.userId, ["OWNER", "ADMIN"]);
  if (!hasAccess) return apiForbidden();

  const result = await prisma.workspaceInvite.deleteMany({
    where: { id: inviteId, workspaceId },
  });

  if (result.count === 0) return apiNotFound("Invitación no encontrada");

  logger.info("Workspace invite revoked", { workspaceId, inviteId, byUserId: ctx.userId });

  return apiSuccess({ revoked: true });
});
