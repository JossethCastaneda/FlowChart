import { withAuth } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiCreated, apiError, apiNotFound, apiForbidden } from "@/lib/api-response";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { logger } from "@/lib/logger";
import { getBaseUrl } from "@/lib/get-base-url";
import { checkPlanLimit } from "@/lib/plan-limits";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateInviteSchema = z.object({
  email: z.string().email("Email inválido").transform((e) => e.toLowerCase().trim()),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

// GET /api/workspace/[workspaceId]/invite — list pending invites (OWNER/ADMIN)
export const GET = withAuth(async (_req, ctx) => {
  const { workspaceId } = await ctx.params;

  const hasAccess = await verifyWorkspaceAccess(workspaceId, ctx.userId, ["OWNER", "ADMIN"]);
  if (!hasAccess) return apiForbidden();

  const invites = await prisma.workspaceInvite.findMany({
    where: {
      workspaceId,
      acceptedAt: null,
      expires: { gt: new Date() },
    },
    orderBy: { expires: "asc" },
  });

  return apiSuccess(invites);
});

// POST /api/workspace/[workspaceId]/invite — send invite (OWNER/ADMIN)
export const POST = withAuth(async (req, ctx) => {
  const { workspaceId } = await ctx.params;

  // Auth before body parsing
  const hasAccess = await verifyWorkspaceAccess(workspaceId, ctx.userId, ["OWNER", "ADMIN"]);
  if (!hasAccess) return apiForbidden();

  const result = await validateBody(req, CreateInviteSchema);
  if (!result.ok) return result.response;
  const { email, role } = result.data;

  // Verify the user isn't already a member
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    const alreadyMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
      select: { id: true },
    });
    if (alreadyMember) {
      return apiError("Este usuario ya es miembro del workspace", "ALREADY_MEMBER", 409);
    }
  }

  // ── Plan limit enforcement (member seats) ────────────────────────────────
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: true, _count: { select: { members: true } } },
  });
  if (!workspace) return apiForbidden();

  const planCheck = checkPlanLimit(workspace.plan, "members", workspace._count.members);
  if (planCheck.exceeded) {
    return apiError(planCheck.message, "PLAN_LIMIT", 402);
  }
  // ───────────────────────────────────────────────────────────────────────────

  // Revoke any previous pending invites for this email+workspace
  await prisma.workspaceInvite.deleteMany({
    where: { workspaceId, email, acceptedAt: null, expires: { gt: new Date() } },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.workspaceInvite.create({
    data: { workspaceId, email, token, role, expires, invitedById: ctx.userId },
    include: { workspace: { select: { name: true } } },
  });

  const inviteUrl = `${getBaseUrl()}/invite/${token}`;

  // Send invite email via Resend
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
      workspaceName: invite.workspace.name,
      role,
      inviteUrl,
    });
    emailSent = !!ok;
  } catch (err) {
    logger.warn("Failed to send invite email", { workspaceId, email, error: err });
  }

  logger.info("Workspace invite created", {
    workspaceId,
    invitedEmail: email,
    role,
    emailSent,
    byUserId: ctx.userId,
  });

  return apiCreated({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    expires: invite.expires,
    // Only expose the URL if email failed (so admin can share it manually)
    inviteUrl: emailSent ? null : inviteUrl,
    emailSent,
    workspaceName: invite.workspace.name,
  });
});
