import prisma, { Prisma } from "@/lib/prisma";
import { checkEntitlement } from "./entitlements";
import { AiError, ErrorCode } from "../errors";

function getCurrentMonthBoundaries() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}
import { checkEntitlement } from "./entitlements";
import { AiError, ErrorCode } from "../errors";

export interface ReservationContext {
  workspaceId: string;
  reservationId: string;
  requestId: string;
  idempotencyKey: string;
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
      const existingReservation = await tx.aiReservationLedger.findUnique({
        where: { idempotencyKey }
      });
      return {
        workspaceId,
        requestId: existing.id,
        reservationId: existingReservation?.id || "",
        idempotencyKey,
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

    const { start: periodStart, end: periodEnd } = getCurrentMonthBoundaries();

    // Upsert equivalent via raw query for atomic locking (because Prisma upsert doesn't lock for update)
    await tx.$executeRaw`
      INSERT INTO "WorkspaceAiBudgetBalance" (
        "id", "workspaceId", "periodStart", "periodEnd", 
        "customerAiAllowance", "customerBilledUsd", "customerReservedUsd", 
        "internalProviderSpendLimit", "internalProviderCostUsd", 
        "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(), ${workspaceId}, ${periodStart}, ${periodEnd}, 
        0, 0, 0, 
        0, 0, 
        NOW(), NOW()
      )
      ON CONFLICT ("workspaceId", "periodStart", "periodEnd") DO NOTHING;
    `;

    // Now select FOR UPDATE to lock the row for this transaction
    const balances = await tx.$queryRaw<any[]>`
      SELECT "customerBilledUsd", "customerReservedUsd", "customerAiAllowance" FROM "WorkspaceAiBudgetBalance"
      WHERE "workspaceId" = ${workspaceId} AND "periodStart" = ${periodStart} AND "periodEnd" = ${periodEnd}
      FOR UPDATE;
    `;

    if (!balances || balances.length === 0) {
      throw new Error("Failed to lock AiBudgetBalance");
    }

    const currentSpent = new Prisma.Decimal(balances[0].customerBilledUsd);
    const currentReserved = new Prisma.Decimal(balances[0].customerReservedUsd);
    const allowance = new Prisma.Decimal(balances[0].customerAiAllowance);
    const estimatedCostDec = new Prisma.Decimal(estimatedCost);

    // If there is an allowance > 0, we check the limit. Otherwise we assume unrestricted/pay-as-you-go based on recovery policy
    if (allowance.greaterThan(0) && currentSpent.plus(currentReserved).plus(estimatedCostDec).greaterThan(allowance)) {
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
      SET "customerReservedUsd" = "customerReservedUsd" + ${estimatedCost},
          "updatedAt" = NOW()
      WHERE "workspaceId" = ${workspaceId} AND "periodStart" = ${periodStart} AND "periodEnd" = ${periodEnd};
    `;

    // Insert atomic reservation ledger entry
    const reservationRecord = await tx.aiReservationLedger.create({
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
      reservationId: reservationRecord.id,
      idempotencyKey,
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
      const runIdempotencyKey = `${context.reservationId}-${run.runId}`;
      
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
              quantity: new Prisma.Decimal(run.customerCharge).mul(100).trunc().toNumber(), // exact decimal math to avoid float precision issues
            }
          });
          console.log(`[Billing Meter] Enqueued usage sync for ${meterEventId} to Stripe.`);
        }
      }
    }

    // Release the reservation lock and update the balance
    const reservation = await tx.aiReservationLedger.findUnique({
      where: { idempotencyKey: context.idempotencyKey }
    });

    if (reservation && reservation.status === "RESERVED") {
      await tx.aiReservationLedger.update({
        where: { idempotencyKey: context.idempotencyKey },
        data: {
          status: "SETTLED",
          settledAt: new Date()
        }
      });
      
      const { start: periodStart, end: periodEnd } = getCurrentMonthBoundaries();
      const totalCustomerCharge = runs.reduce((sum, run) => sum + (run.customerCharge || 0), 0);

      await tx.$executeRaw`
        UPDATE "WorkspaceAiBudgetBalance"
        SET "customerReservedUsd" = GREATEST("customerReservedUsd" - ${Number(reservation.reservedCostUsd)}, 0),
            "customerBilledUsd" = "customerBilledUsd" + ${totalCustomerCharge},
            "updatedAt" = NOW()
        WHERE "workspaceId" = ${context.workspaceId} AND "periodStart" = ${periodStart} AND "periodEnd" = ${periodEnd};
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
      where: { idempotencyKey: context.idempotencyKey }
    });

    if (reservation && reservation.status === "RESERVED") {
      await tx.aiReservationLedger.update({
        where: { idempotencyKey: context.idempotencyKey },
        data: {
          status: "RELEASED",
          settledAt: new Date()
        }
      });
      
      const { start: periodStart, end: periodEnd } = getCurrentMonthBoundaries();

      await tx.$executeRaw`
        UPDATE "WorkspaceAiBudgetBalance"
        SET "customerReservedUsd" = GREATEST("customerReservedUsd" - ${Number(reservation.reservedCostUsd)}, 0),
            "updatedAt" = NOW()
        WHERE "workspaceId" = ${context.workspaceId} AND "periodStart" = ${periodStart} AND "periodEnd" = ${periodEnd};
      `;
    }
  });
}
