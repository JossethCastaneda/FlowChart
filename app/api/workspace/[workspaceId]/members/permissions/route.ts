import { withAuth } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiNotFound, apiForbidden } from "@/lib/api-response";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PermissionsBodySchema = z.object({
  userId: z.string().min(1, "userId requerido"),
  permissions: z
    .object({
      ops: z.object({ view: z.boolean(), edit: z.boolean() }),
      publisher: z.object({ view: z.boolean(), edit: z.boolean() }),
      inbox: z.object({ view: z.boolean(), edit: z.boolean() }),
      ads: z.object({ view: z.boolean(), edit: z.boolean() }),
      analytics: z.object({ view: z.boolean(), edit: z.boolean() }),
      briefing: z.object({ view: z.boolean(), edit: z.boolean() }),
    })
    .nullable(),
});

// PATCH /api/workspace/[workspaceId]/members/permissions
// Update granular module-level permissions for a member (OWNER/ADMIN)
export const PATCH = withAuth(async (req, ctx) => {
  const { workspaceId } = await ctx.params;

  const hasAccess = await verifyWorkspaceAccess(workspaceId, ctx.userId, ["OWNER", "ADMIN"]);
  if (!hasAccess) return apiForbidden("Solo OWNER o ADMIN pueden editar permisos");

  const result = await validateBody(req, PermissionsBodySchema);
  if (!result.ok) return result.response;
  const { userId, permissions } = result.data;

  const target = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { id: true },
  });
  if (!target) return apiNotFound("Miembro no encontrado");

  await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId } },
    data: { permissions: permissions ?? Prisma.JsonNull },
  });

  logger.info("Member permissions updated", {
    workspaceId,
    targetUserId: userId,
    byUserId: ctx.userId,
    clearedPermissions: permissions === null,
  });

  return apiSuccess({ updated: true });
});
