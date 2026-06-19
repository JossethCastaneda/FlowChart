import { withAuth, safeGetSession } from "@/lib/api-handler";
import { apiSuccess, apiNotFound, apiForbidden, apiError, apiServerError } from "@/lib/api-response";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/active-workspace";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/invite/[token] — get invite info (public, no auth required)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: {
      workspace: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!invite) return apiNotFound("Invitación no encontrada");

  if (invite.acceptedAt) {
    return apiError("Esta invitación ya fue aceptada", "INVITE_USED", 410);
  }
  if (invite.expires < new Date()) {
    return apiError("Esta invitación ha expirado", "INVITE_EXPIRED", 410);
  }

  return apiSuccess({
    email: invite.email,
    role: invite.role,
    workspace: invite.workspace,
    expires: invite.expires,
  });
}

// POST /api/invite/[token] — accept an invite (requires authentication)
export const POST = withAuth(async (_req, ctx) => {
  const { token } = await ctx.params;

  // Get full session for user profile data (name, email, image)
  const session = await safeGetSession();

  const invite = await prisma.workspaceInvite.findUnique({ where: { token } });

  if (!invite || invite.acceptedAt || invite.expires < new Date()) {
    return apiError("Invitación inválida o expirada", "INVITE_INVALID", 410);
  }

  // Email verification: if both invite and user have email, they must match.
  // OAuth-only users (no email) are accepted regardless.
  if (invite.email && session?.user?.email) {
    if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return apiForbidden("Esta invitación fue enviada a otro email");
    }
  }

  const alreadyMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId: invite.workspaceId, userId: ctx.userId },
    },
  });
  if (alreadyMember) {
    return apiError("Ya eres miembro de este workspace", "ALREADY_MEMBER", 409);
  }

  // Ensure user exists in the User table before creating WorkspaceMember (FK constraint)
  await prisma.user.upsert({
    where: { id: ctx.userId },
    update: {
      ...(session?.user?.name ? { name: session.user.name } : {}),
      ...(session?.user?.image ? { image: session.user.image } : {}),
    },
    create: {
      id: ctx.userId,
      name: session?.user?.name ?? null,
      email: session?.user?.email ?? null,
      image: session?.user?.image ?? null,
    },
  });

  await prisma.$transaction([
    prisma.workspaceMember.create({
      data: {
        workspaceId: invite.workspaceId,
        userId: ctx.userId,
        role: invite.role,
      },
    }),
    prisma.workspaceInvite.update({
      where: { token },
      data: { acceptedAt: new Date() },
    }),
  ]);

  logger.info("Workspace invite accepted", {
    workspaceId: invite.workspaceId,
    userId: ctx.userId,
    role: invite.role,
  });

  // Set cookie so the newly joined workspace is immediately active
  const response = NextResponse.json(apiSuccess({
    workspaceId: invite.workspaceId,
    redirectTo: "/dashboard/resumen",
  }));
  response.cookies.set(ACTIVE_WORKSPACE_COOKIE, invite.workspaceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return response;
});
