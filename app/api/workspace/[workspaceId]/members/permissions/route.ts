import { withAuth } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiNotFound, apiForbidden } from "@/lib/api-response";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { logger } from "@/lib/logger";
import { recordAudit } from "@/lib/audit";
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

  const [requester, target] = await Promise.all([
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: ctx.userId } },
      select: { role: true },
    }),
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { id: true, role: true },
    }),
  ]);
  if (!target) return apiNotFound("Miembro no encontrado");

  // SEGURIDAD: un ADMIN NO puede editar los permisos de un OWNER/ADMIN (ni los suyos
  // propios) — eso le permitiría deshacer las restricciones impuestas por el OWNER.
  // Solo el OWNER puede tocar permisos de roles administrativos.
  if (requester?.role !== "OWNER" && (target.role === "OWNER" || target.role === "ADMIN")) {
    return apiForbidden("Solo el OWNER puede modificar permisos de administradores");
  }

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
  await recordAudit({
    workspaceId,
    userId: ctx.userId,
    action: "member.permissions_changed",
    resourceType: "WorkspaceMember",
    resourceId: userId,
    details: { cleared: permissions === null },
  });

  return apiSuccess({ updated: true });
});
