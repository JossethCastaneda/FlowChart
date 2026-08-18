import { withWorkspaceRole } from "@/lib/api-handler";
import { apiSuccess } from "@/lib/api-response";
import { resolvePlan } from "@/lib/plan-limits";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing/status
 *
 * Read-only billing snapshot for the active workspace. Never instantiates
 * StripeBillingProvider — `configured` only reflects whether
 * STRIPE_SECRET_KEY is present, so a missing key renders an honest
 * "not configured" state instead of a 500.
 */
export const GET = withWorkspaceRole(["OWNER", "ADMIN"])(async (_req, ctx) => {
  const [workspace, subscription, billingCustomer] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: ctx.workspaceId },
      select: { plan: true },
    }),
    prisma.subscription.findUnique({
      where: { workspaceId: ctx.workspaceId },
    }),
    prisma.billingCustomer.findUnique({
      where: { workspaceId: ctx.workspaceId },
    }),
  ]);

  return apiSuccess({
    plan: resolvePlan(workspace?.plan),
    configured: Boolean(process.env.STRIPE_SECRET_KEY),
    hasBillingAccount: Boolean(billingCustomer),
    status: subscription?.status ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
  });
});
