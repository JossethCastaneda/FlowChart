import { withAuth } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiError, apiNotFound, apiForbidden } from "@/lib/api-response";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateWorkspaceSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(80),
});

// GET /api/workspace/[workspaceId] — get workspace details
export const GET = withAuth(async (_req, ctx) => {
  const { workspaceId } = await ctx.params;

  const hasAccess = await verifyWorkspaceAccess(workspaceId, ctx.userId);
  if (!hasAccess) return apiForbidden();

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { role: "asc" },
      },
      _count: { select: { projects: true, invites: true } },
    },
  });

  if (!workspace) return apiNotFound("Workspace no encontrado");

  return apiSuccess(workspace);
});

// PATCH /api/workspace/[workspaceId] — update workspace name (OWNER or ADMIN)
export const PATCH = withAuth(async (req, ctx) => {
  const { workspaceId } = await ctx.params;

  const hasAccess = await verifyWorkspaceAccess(workspaceId, ctx.userId, ["OWNER", "ADMIN"]);
  if (!hasAccess) return apiForbidden("Solo OWNER o ADMIN pueden editar el workspace");

  const result = await validateBody(req, UpdateWorkspaceSchema);
  if (!result.ok) return result.response;
  const { name } = result.data;

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { name: name.trim() },
    select: { id: true, name: true, slug: true, plan: true, updatedAt: true },
  });

  logger.info("Workspace updated", { workspaceId, userId: ctx.userId });

  return apiSuccess(updated);
});

// DELETE /api/workspace/[workspaceId] — delete workspace (OWNER only)
export const DELETE = withAuth(async (_req, ctx) => {
  const { workspaceId } = await ctx.params;

  const hasAccess = await verifyWorkspaceAccess(workspaceId, ctx.userId, ["OWNER"]);
  if (!hasAccess) return apiForbidden("Solo el OWNER puede eliminar el workspace");

  await prisma.workspace.delete({ where: { id: workspaceId } });

  logger.info("Workspace deleted", { workspaceId, userId: ctx.userId });

  return apiSuccess({ deleted: true });
});
