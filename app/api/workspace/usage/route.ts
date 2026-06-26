/**
 * GET /api/workspace/usage
 * =====================================================================
 * Returns the current workspace's plan and resource usage counts.
 * Used by the usePlanLimit hook and the Settings > Plan UI.
 */
import { withAuth } from "@/lib/api-handler";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { apiSuccess, apiError } from "@/lib/api-response";
import { PLAN_LIMITS, resolvePlan, UNLIMITED } from "@/lib/plan-limits";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, ctx) => {
  const workspaceId = await getActiveWorkspaceId(ctx.userId);
  if (!workspaceId) {
    return apiError("No tienes un workspace activo", "NO_WORKSPACE", 400);
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      plan: true,
      _count: {
        select: {
          projects: true,
          members: true,
          integrations: true,
          posts: true,
        },
      },
    },
  });

  if (!workspace) {
    return apiError("Workspace no encontrado", "NOT_FOUND", 404);
  }

  const plan = resolvePlan(workspace.plan);
  const limits = PLAN_LIMITS[plan];

  return apiSuccess({
    plan,
    planLabel: plan === "free" ? "Gratis" : plan === "pro" ? "Pro" : "Agencia",
    projects: workspace._count.projects,
    members: workspace._count.members,
    integrations: workspace._count.integrations,
    scheduledPosts: workspace._count.posts,
    limits: {
      projects: limits.projects,
      members: limits.members,
      integrations: limits.integrations,
      scheduledPosts: limits.scheduledPosts,
      analyticsRetentionDays: limits.analyticsRetentionDays,
    },
    isUnlimited: {
      projects: limits.projects >= UNLIMITED,
      members: limits.members >= UNLIMITED,
      integrations: limits.integrations >= UNLIMITED,
      scheduledPosts: limits.scheduledPosts >= UNLIMITED,
    },
  });
});
