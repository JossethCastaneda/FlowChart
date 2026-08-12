import prisma, { Prisma } from "@/lib/prisma";
import { checkEntitlement } from "./entitlements";
import { AiError, ErrorCode } from "../errors";

export interface ReservationContext {
  workspaceId: string;
  requestId: string;
  feature: string;
  estimatedCost: number;
}

/**
 * Ensures a workspace can afford a request and "reserves" capacity.
 * Utilizes a Prisma $transaction for atomic validation + creation.
 * Uses idempotencyKey to prevent concurrent run-away spending.
 */
export async function reserve(
  workspaceId: string,
  feature: string,
  estimatedCost: number,
  idempotencyKey: string
): Promise<ReservationContext> {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Check idempotency
    const existing = await tx.aiRequest.findUnique({
      where: { idempotencyKey }
    });

    if (existing) {
      return {
        workspaceId,
        requestId: existing.id,
        feature,
        estimatedCost
      };
    }

    // 2. Check entitlement atomically
    const check = await checkEntitlement(workspaceId, feature, tx);
    
    if (!check.allowed) {
      throw new AiError(
        ErrorCode.ENTITLEMENT_DENIED,
        check.reason || "Not entitled to this feature",
        "finops",
        false
      );
    }

    // 3. Durably Reserve estimated financial capacity
    if (check.maxCostPerRun !== undefined && estimatedCost > check.maxCostPerRun) {
      throw new AiError(
        ErrorCode.AI_BUDGET_EXCEEDED,
        `Estimated cost (${estimatedCost}) exceeds max cost per run (${check.maxCostPerRun})`,
        "finops",
        false
      );
    }

    // Insert atomic reservation ledger entry
    await tx.aiReservationLedger.create({
      data: {
        workspaceId,
        idempotencyKey,
        feature,
        reservedCostUsd: estimatedCost,
        status: "RESERVED"
      }
    });

    // Summing budget and validating (transaction-safe)
    const currentUsage = await tx.aiUsage.aggregate({
      where: { workspaceId, createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      _sum: { customerChargeUsd: true }
    });
    const currentReserved = await tx.aiReservationLedger.aggregate({
      where: { workspaceId, status: "RESERVED" },
      _sum: { reservedCostUsd: true }
    });

    const totalSpentAndReserved = (Number(currentUsage._sum.customerChargeUsd) || 0) + (Number(currentReserved._sum.reservedCostUsd) || 0);

    const entitlementData = await tx.workspaceEntitlement.findUnique({ where: { workspaceId } });
    if (entitlementData?.monthlyAiBudget && totalSpentAndReserved > Number(entitlementData.monthlyAiBudget)) {
      throw new AiError(
        ErrorCode.AI_BUDGET_EXCEEDED,
        "Monthly AI budget exceeded including pending reservations",
        "finops",
        true
      );
    }

    // 4. Create the tracking request
    const request = await tx.aiRequest.create({
      data: {
        workspaceId,
        feature,
        idempotencyKey,
        status: "RUNNING",
      },
    });

    return {
      workspaceId,
      requestId: request.id,
      feature,
      estimatedCost,
    };
  });
}

/**
 * Settles the reservation after completion, charging the actual usage
 * to the financial ledger (AiUsage). Uses upsert to be fully idempotent.
 */
export async function settle(
  context: ReservationContext,
  runs: {
    runId: string;
    route: string;
    model: string;
    provider: string;
    tokensIn: number;
    tokensOut: number;
    providerCost: number | null;
    customerCharge: number | null;
  }[]
): Promise<void> {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Mark request as completed
    await tx.aiRequest.update({
      where: { id: context.requestId },
      data: { 
        status: "SUCCEEDED",
        completedAt: new Date()
      },
    });

    // Record individual usages idempotently
    for (const run of runs) {
      const runIdempotencyKey = `${context.requestId}-${run.runId}`;
      
      const usage = await tx.aiUsage.upsert({
        where: { idempotencyKey: runIdempotencyKey },
        update: {}, // if it exists, do nothing
        create: {
          workspaceId: context.workspaceId,
          requestId: context.requestId,
          idempotencyKey: runIdempotencyKey,
          route: run.route,
          model: run.model,
          provider: run.provider,
          tokensIn: run.tokensIn,
          tokensOut: run.tokensOut,
          providerCostUsd: run.providerCost,
          customerChargeUsd: run.customerCharge,
          feature: context.feature,
        },
      });

      // STRIPE 13 & 14 & 15: Create an idempotent billing meter event for usage 
      if (run.customerCharge && run.customerCharge > 0) {
        const meterEventId = `meter_${runIdempotencyKey}`;
        
        const existingMeter = await tx.billingUsageEvent.findUnique({
          where: { stripeMeterEventIdentifier: meterEventId }
        });

        if (!existingMeter) {
          await tx.billingUsageEvent.create({
            data: {
              workspaceId: context.workspaceId,
              aiUsageId: usage.id,
              stripeMeterEventIdentifier: meterEventId,
              meterName: "ai_billable_units", // the commercial unit (e.g. cents)
              quantity: Math.round(run.customerCharge * 100), // explicit conversion from USD to billable units (cents)
            }
          });
          console.log(`[Billing Meter] Enqueued usage sync for ${meterEventId} to Stripe.`);
        }
      }
    }

    // Release the reservation lock
    await tx.aiReservationLedger.update({
      where: { idempotencyKey: context.requestId }, // request ID is the idempotency key for the reservation
      data: {
        status: "SETTLED",
        settledAt: new Date()
      }
    });
  });
}

/**
 * Releases the reservation in case of overall failure (e.g., all fallbacks failed).
 */
export async function release(context: ReservationContext, errorReason?: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.aiRequest.update({
      where: { id: context.requestId },
      data: { 
        status: "FAILED",
        completedAt: new Date()
      },
    });

    await tx.aiReservationLedger.update({
      where: { idempotencyKey: context.requestId },
      data: {
        status: "RELEASED",
        settledAt: new Date()
      }
    });
  });
}
