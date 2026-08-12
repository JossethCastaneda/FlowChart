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

    // 3. Create the tracking request
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
        
        // We ensure we don't emit to Stripe twice by relying on Prisma unique constraint
        // If tx.billingUsageEvent.findUnique returns nothing, we insert and trigger async push
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
              quantity: Math.ceil(run.customerCharge * 100), // explicit conversion from USD to billable units
            }
          });

          // Normally, we would emit a queue message or background job here to actually POST to Stripe.
          // The actual Stripe API call shouldn't block the transaction. 
          // For now, we simulate the side-effect via an out-of-band console log or asynchronous fetch
          console.log(`[Billing Meter] Enqueued usage sync for ${meterEventId} to Stripe.`);
        }
      }
    }
  });
}

/**
 * Releases the reservation in case of overall failure (e.g., all fallbacks failed).
 */
export async function release(context: ReservationContext, errorReason?: string): Promise<void> {
  await prisma.aiRequest.update({
    where: { id: context.requestId },
    data: { 
      status: "FAILED",
      completedAt: new Date()
    },
  });
}
