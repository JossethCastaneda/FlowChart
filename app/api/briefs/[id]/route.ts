import { withAuth } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiNotFound, apiForbidden } from "@/lib/api-response";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { Prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { z } from "zod";

const PatchBriefSchema = z.object({
  title: z.string().min(1).max(500).transform((s) => s.trim()).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["Draft", "Review", "Approved"]).optional(),
  projectId: z.string().nullable().optional(),
});

// GET /api/briefs/[id] — get a single brief
export const GET = withAuth(async (_req, ctx) => {
  const { id } = await ctx.params;

  const brief = await prisma.brief.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true, alias: true } },
    },
  });
  if (!brief) return apiNotFound("Brief no encontrado");

  const hasAccess = await verifyWorkspaceAccess(brief.workspaceId, ctx.userId);
  if (!hasAccess) return apiForbidden();

  return apiSuccess(brief);
});

// PATCH /api/briefs/[id] — update a brief
export const PATCH = withAuth(async (req, ctx) => {
  const { id } = await ctx.params;

  const brief = await prisma.brief.findUnique({ where: { id } });
  if (!brief) return apiNotFound("Brief no encontrado");

  const hasAccess = await verifyWorkspaceAccess(brief.workspaceId, ctx.userId);
  if (!hasAccess) return apiForbidden();

  const result = await validateBody(req, PatchBriefSchema);
  if (!result.ok) return result.response;

  const updated = await prisma.brief.update({
    where: { id },
    data: {
      ...(result.data.title !== undefined && { title: result.data.title }),
      ...(result.data.content !== undefined && { content: result.data.content as Prisma.InputJsonValue }),
      ...(result.data.status !== undefined && { status: result.data.status }),
      ...(result.data.projectId !== undefined && {
        projectId: result.data.projectId === null ? null : result.data.projectId,
      }),
    },
  });

  return apiSuccess(updated);
});

// DELETE /api/briefs/[id] — delete a brief (OWNER/ADMIN only)
export const DELETE = withAuth(async (_req, ctx) => {
  const { id } = await ctx.params;

  const brief = await prisma.brief.findUnique({ where: { id } });
  if (!brief) return apiNotFound("Brief no encontrado");

  const hasAccess = await verifyWorkspaceAccess(brief.workspaceId, ctx.userId, ["OWNER", "ADMIN"]);
  if (!hasAccess) return apiForbidden("Solo OWNER/ADMIN pueden eliminar briefs");

  await prisma.brief.delete({ where: { id } });

  logger.info("Brief deleted", { briefId: id, workspaceId: brief.workspaceId, byUserId: ctx.userId });

  return apiSuccess({ deleted: true });
});
