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

    const period = new Date().toISOString().slice(0, 7); // e.g., "2026-08"

    // Upsert equivalent via raw query for atomic locking (because Prisma upsert doesn't lock for update)
    await tx.$executeRaw`
      INSERT INTO "WorkspaceAiBudgetBalance" ("id", "workspaceId", "period", "spentUsd", "reservedUsd", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${workspaceId}, ${period}, 0, 0, NOW(), NOW())
      ON CONFLICT ("workspaceId", "period") DO NOTHING;
    `;

    // Now select FOR UPDATE to lock the row for this transaction
    const balances = await tx.$queryRaw<any[]>`
      SELECT "spentUsd", "reservedUsd" FROM "WorkspaceAiBudgetBalance"
      WHERE "workspaceId" = ${workspaceId} AND "period" = ${period}
      FOR UPDATE;
    `;

    if (!balances || balances.length === 0) {
      throw new Error("Failed to lock AiBudgetBalance");
    }

    const currentSpent = Number(balances[0].spentUsd);
    const currentReserved = Number(balances[0].reservedUsd);
    const totalSpentAndReserved = currentSpent + currentReserved;

    const entitlementData = await tx.workspaceEntitlement.findUnique({ where: { workspaceId } });
    if (entitlementData?.monthlyAiBudget && (totalSpentAndReserved + estimatedCost) > Number(entitlementData.monthlyAiBudget)) {
      throw new AiError(
        ErrorCode.AI_BUDGET_EXCEEDED,
        "Monthly AI budget exceeded including pending reservations",
        "finops",
        true
      );
    }

    // Atomic increment
    await tx.$executeRaw`
      UPDATE "WorkspaceAiBudgetBalance"
      SET "reservedUsd" = "reservedUsd" + ${estimatedCost},
          "updatedAt" = NOW()
      WHERE "workspaceId" = ${workspaceId} AND "period" = ${period};
    `;

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

    // Release the reservation lock and update the balance
    const reservation = await tx.aiReservationLedger.findUnique({
      where: { idempotencyKey: context.requestId }
    });

    if (reservation && reservation.status === "RESERVED") {
      await tx.aiReservationLedger.update({
        where: { idempotencyKey: context.requestId },
        data: {
          status: "SETTLED",
          settledAt: new Date()
        }
      });
      
      const period = reservation.createdAt.toISOString().slice(0, 7);
      const totalCustomerCharge = runs.reduce((sum, run) => sum + (run.customerCharge || 0), 0);

      await tx.$executeRaw`
        UPDATE "WorkspaceAiBudgetBalance"
        SET "reservedUsd" = GREATEST("reservedUsd" - ${Number(reservation.reservedCostUsd)}, 0),
            "spentUsd" = "spentUsd" + ${totalCustomerCharge},
            "updatedAt" = NOW()
        WHERE "workspaceId" = ${context.workspaceId} AND "period" = ${period};
      `;
    }
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

    const reservation = await tx.aiReservationLedger.findUnique({
      where: { idempotencyKey: context.requestId }
    });

    if (reservation && reservation.status === "RESERVED") {
      await tx.aiReservationLedger.update({
        where: { idempotencyKey: context.requestId },
        data: {
          status: "RELEASED",
          settledAt: new Date()
        }
      });
      
      const period = reservation.createdAt.toISOString().slice(0, 7);

      await tx.$executeRaw`
        UPDATE "WorkspaceAiBudgetBalance"
        SET "reservedUsd" = GREATEST("reservedUsd" - ${Number(reservation.reservedCostUsd)}, 0),
            "updatedAt" = NOW()
        WHERE "workspaceId" = ${context.workspaceId} AND "period" = ${period};
      `;
    }
  });
}
