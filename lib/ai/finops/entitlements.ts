import prisma from "@/lib/prisma";
import { AiError, ErrorCode } from "../errors";

export interface EntitlementCheckResult {
  allowed: boolean;
  reason?: string;
  maxCostPerRun?: number;
}

/**
 * Checks if a workspace has the capability and budget to execute a specific AI feature.
 */
export async function checkEntitlement(
  workspaceId: string,
  feature: string,
  db: any = prisma
): Promise<EntitlementCheckResult> {
  const entitlement = await db.workspaceEntitlement.findUnique({
    where: { workspaceId },
  });

  // If no explicit entitlement, fail closed unless it's a dev environment bypassing this
  if (!entitlement) {
    return {
      allowed: false,
      reason: "No active entitlement found for this workspace.",
    };
  }

  // Feature gate check
  if (!entitlement.allowedFeatures.includes(feature)) {
    return {
      allowed: false,
      reason: `Feature '${feature}' is not enabled for this workspace.`,
    };
  }

  // Monthly budget check
  if (entitlement.monthlyAiBudget !== null) {
    // Determine current month range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Sum usages for the current month
    const currentUsage = await db.aiUsage.aggregate({
      where: {
        workspaceId,
        createdAt: { gte: startOfMonth },
      },
      _sum: {
        customerChargeUsd: true,
      },
    });

    const totalUsed = currentUsage._sum.customerChargeUsd || 0;
    
    if (totalUsed >= entitlement.monthlyAiBudget) {
      throw new AiError(
        ErrorCode.AI_BUDGET_EXCEEDED,
        "Monthly AI budget exceeded",
        "finops",
        true
      );
    }
  }

  return {
    allowed: true,
    maxCostPerRun: entitlement.maxAiCostPerRun ?? undefined,
  };
}
