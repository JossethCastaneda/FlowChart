import { withWorkspace } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import {
  parseWorkflow,
  findUserArea,
  getPermissions,
  type AreaPermissions,
  DEFAULT_MEMBER_PERMS,
} from "@/lib/workflow-config";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateStatusSchema = z.object({
  status: z.enum(["disponible", "ocupado", "ausente", "offline"]),
});

/**
 * PUT /api/workspace/members/status
 * Update the current user's activity status within their active workspace.
 */
export const PUT = withWorkspace(async (req, ctx) => {
  const result = await validateBody(req, UpdateStatusSchema);
  if (!result.ok) return result.response;
  const { status } = result.data;

  const updated = await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId: ctx.userId } },
    data: { activityStatus: status, lastActiveAt: new Date() },
    select: { activityStatus: true, lastActiveAt: true },
  });

  return apiSuccess(updated);
});

/**
 * GET /api/workspace/members/status
 * Returns the current user's activity status and resolved permissions.
 */
export const GET = withWorkspace(async (_req, ctx) => {
  const [member, settingsRow] = await Promise.all([
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId: ctx.userId } },
      select: { activityStatus: true, lastActiveAt: true, role: true, permissions: true },
    }),
    prisma.workspaceSettings.findUnique({
      where: { workspaceId: ctx.workspaceId },
      select: { areas: true, requireLeadReview: true },
    }),
  ]);

  let userPerms: AreaPermissions = { ...DEFAULT_MEMBER_PERMS };
  if (member) {
    const config = parseWorkflow(settingsRow);
    const userArea = findUserArea(config, ctx.userId);
    userPerms = getPermissions(userArea, ctx.userId, member.role, member.permissions as Parameters<typeof getPermissions>[3]);
  }

  return apiSuccess({
    activityStatus: member?.activityStatus || "disponible",
    lastActiveAt: member?.lastActiveAt || null,
    role: member?.role || "MEMBER",
    permissions: userPerms,
  });
});
