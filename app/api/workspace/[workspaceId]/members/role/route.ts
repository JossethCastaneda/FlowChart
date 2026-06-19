import { withAuth } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiError, apiNotFound, apiForbidden } from "@/lib/api-response";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ChangeRoleSchema = z.object({
  userId: z.string().min(1, "userId requerido"),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});

// PATCH /api/workspace/[workspaceId]/members/role — change a member's role (OWNER only)
export const PATCH = withAuth(async (req, ctx) => {
  const { workspaceId } = await ctx.params;

  // Auth check before reading body
  const hasAccess = await verifyWorkspaceAccess(workspaceId, ctx.userId, ["OWNER"]);
  if (!hasAccess) return apiForbidden("Solo el OWNER puede cambiar roles");

  const result = await validateBody(req, ChangeRoleSchema);
  if (!result.ok) return result.response;
  const { userId, role } = result.data;

  // Cannot change your own role
  if (userId === ctx.userId) {
    return apiError("No puedes cambiar tu propio rol", "SELF_ROLE_CHANGE", 400);
  }

  const target = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  if (!target) return apiNotFound("Miembro no encontrado");

  // Protect: cannot demote the last OWNER
  if (target.role === "OWNER" && role !== "OWNER") {
    const ownerCount = await prisma.workspaceMember.count({
      where: { workspaceId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return apiError(
        "No puedes quitar el rol de OWNER al único propietario",
        "LAST_OWNER",
        400
      );
    }
  }

  const updated = await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId } },
    data: { role },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  logger.info("Member role changed", {
    workspaceId,
    targetUserId: userId,
    newRole: role,
    byUserId: ctx.userId,
  });

  return apiSuccess(updated);
});
