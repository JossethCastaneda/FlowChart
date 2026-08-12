import { PrismaClient } from "@prisma/client";
import { StripeBillingProvider } from "../lib/ai/finops/stripe-billing-provider";

const prisma = new PrismaClient();
const provider = new StripeBillingProvider();

async function reconcile() {
  console.log("[Reconciliation] Starting Billing Reconciliation...");

  // 1. Detect PENDING too long
  const stalePending = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
  const pendingTooLong = await prisma.billingUsageEvent.findMany({
    where: {
      status: "PENDING",
      reportedAt: { lt: stalePending }
    }
  });

  if (pendingTooLong.length > 0) {
    console.error(`[Reconciliation] WARNING: Found ${pendingTooLong.length} events stuck in PENDING for > 24 hours.`);
    // Safe admin path: reset attempts or alert
  }

  // 2. Detect PROCESSING lease expired
  const staleProcessing = new Date(Date.now() - 30 * 60 * 1000); // 30 mins
  const leaseExpired = await prisma.billingUsageEvent.findMany({
    where: {
      status: "PROCESSING",
      lastAttemptAt: { lt: staleProcessing }
    }
  });

  if (leaseExpired.length > 0) {
    console.warn(`[Reconciliation] Found ${leaseExpired.length} events with expired PROCESSING leases. Reverting to PENDING.`);
    await prisma.billingUsageEvent.updateMany({
      where: {
        id: { in: leaseExpired.map(e => e.id) }
      },
      data: {
        status: "PENDING"
      }
    });
  }

  // 3. FAILED retryable (Attempts exceeded but we want to retry or manually inspect)
  const failedDeadLetter = await prisma.billingUsageEvent.findMany({
    where: {
      status: "FAILED",
      attempts: { gte: 5 }
    }
  });

  if (failedDeadLetter.length > 0) {
    console.error(`[Reconciliation] Found ${failedDeadLetter.length} dead-letter FAILED events (>= 5 attempts). Manual inspection required.`);
  }

  console.log("[Reconciliation] Completed.");
}

reconcile()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
