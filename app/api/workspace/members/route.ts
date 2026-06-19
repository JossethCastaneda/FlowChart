import { withWorkspace } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiCreated, apiError, apiNotFound } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { getBaseUrl } from "@/lib/get-base-url";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { z } from "zod";

export const dynamic = "force-dynamic";

const InviteSchema = z.object({
  email: z
    .string()
    .email("Email inválido")
    .max(255)
    .transform((e) => e.toLowerCase().trim()),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

const PatchRoleSchema = z.object({
  userId: z.string().min(1, "userId requerido"),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});

// GET /api/workspace/members — list members + pending invites
export const GET = withWorkspace(async (_req, ctx) => {
  const [members, invites] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: ctx.workspaceId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { role: "asc" },
    }),
    prisma.workspaceInvite.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        acceptedAt: null,
        expires: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return apiSuccess({
    members: members.map((m) => ({
      id: m.user.id,
      name: m.user.name || m.user.email?.split("@")[0] || "Sin nombre",
      email: m.user.email,
      image: m.user.image,
      role: m.role,
      activityStatus: m.activityStatus || "disponible",
    })),
    invites: invites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      expires: i.expires,
    })),
  });
});

// POST /api/workspace/members — send invite (OWNER/ADMIN only)
export const POST = withWorkspace(async (req, ctx) => {
  if (!["OWNER", "ADMIN"].includes(ctx.role)) {
    const { apiForbidden } = await import("@/lib/api-response");
    return apiForbidden("Solo OWNER/ADMIN pueden invitar miembros");
  }

  const result = await validateBody(req, InviteSchema);
  if (!result.ok) return result.response;
  const { email, role } = result.data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    const alreadyMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId: existingUser.id } },
      select: { id: true },
    });
    if (alreadyMember) {
      return apiError("Ya es miembro del workspace", "ALREADY_MEMBER", 409);
    }
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: ctx.workspaceId },
    select: { name: true },
  });

  // Revoke any previous pending invites for this email
  await prisma.workspaceInvite.deleteMany({
    where: { workspaceId: ctx.workspaceId, email, acceptedAt: null },
  });

  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.workspaceInvite.create({
    data: {
      workspaceId: ctx.workspaceId,
      email,
      role,
      token,
      expires,
      invitedById: ctx.userId,
    },
  });

  const inviteUrl = `${getBaseUrl()}/invite/${token}`;

  let emailSent = false;
  try {
    const { sendInviteEmail } = await import("@/lib/email");
    const inviter = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { name: true },
    });
    const ok = await sendInviteEmail({
      to: email,
      inviterName: inviter?.name || "Un administrador",
      workspaceName: workspace?.name || "Sodare",
      role,
      inviteUrl,
    });
    emailSent = !!ok;
  } catch (err) {
    logger.warn("Failed to send invite email", {
      workspaceId: ctx.workspaceId,
      email,
      error: err,
    });
  }

  logger.info("Member invite created", {
    workspaceId: ctx.workspaceId,
    email,
    role,
    emailSent,
    byUserId: ctx.userId,
  });

  return apiCreated({ email, role, emailSent, inviteUrl: emailSent ? null : inviteUrl });
});

// PATCH /api/workspace/members — change role (OWNER/ADMIN)
export const PATCH = withWorkspace(async (req, ctx) => {
  if (!["OWNER", "ADMIN"].includes(ctx.role)) {
    const { apiForbidden } = await import("@/lib/api-response");
    return apiForbidden("Solo OWNER/ADMIN pueden cambiar roles");
  }

  const result = await validateBody(req, PatchRoleSchema);
  if (!result.ok) return result.response;
  const { userId, role } = result.data;

  if (userId === ctx.userId) {
    return apiError("No puedes cambiar tu propio rol", "SELF_ROLE_CHANGE", 400);
  }

  const target = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId } },
    select: { role: true },
  });
  if (!target) return apiNotFound("Miembro no encontrado");

  await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId } },
    data: { role },
  });

  logger.info("Member role changed", {
    workspaceId: ctx.workspaceId,
    targetUserId: userId,
    newRole: role,
    byUserId: ctx.userId,
  });

  return apiSuccess({ updated: true });
});

// DELETE /api/workspace/members — remove member or revoke invite (OWNER/ADMIN)
export const DELETE = withWorkspace(async (req, ctx) => {
  if (!["OWNER", "ADMIN"].includes(ctx.role)) {
    const { apiForbidden } = await import("@/lib/api-response");
    return apiForbidden("Solo OWNER/ADMIN pueden eliminar miembros");
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const inviteToken = searchParams.get("inviteToken");

  if (inviteToken) {
    await prisma.workspaceInvite.deleteMany({
      where: { workspaceId: ctx.workspaceId, token: inviteToken, acceptedAt: null },
    });
    return apiSuccess({ revoked: true });
  }

  if (userId) {
    if (userId === ctx.userId) {
      return apiError("No puedes eliminarte a ti mismo", "SELF_REMOVAL", 400);
    }
    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId } },
    });
    logger.info("Member removed", {
      workspaceId: ctx.workspaceId,
      removedUserId: userId,
      byUserId: ctx.userId,
    });
    return apiSuccess({ removed: true });
  }

  return apiError("userId o inviteToken requerido", "MISSING_PARAM", 400);
});
