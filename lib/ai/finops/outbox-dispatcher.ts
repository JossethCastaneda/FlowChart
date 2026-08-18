import prisma from "@/lib/prisma";
import { StripeBillingProvider } from "./stripe-billing-provider";

export class BillingOutboxDispatcher {
  private provider: StripeBillingProvider;

  constructor() {
    this.provider = new StripeBillingProvider();
  }

  /**
   * Dispatches all PENDING and retriable FAILED billing usage events.
   * Utilizes an atomic lease via SQL to prevent Vercel concurrency duplication.
   */
  async flushOutbox(batchSize: number = 50) {
    // 1. True Atomic Lease via PostgreSQL row locks
    // We update up to batchSize eligible rows to PROCESSING and return them.
    // FOR UPDATE SKIP LOCKED ensures concurrent dispatchers never wait on the same rows.
    const claimedEvents = await prisma.$queryRaw<any[]>`
      UPDATE "BillingUsageEvent"
      SET 
        status = 'PROCESSING', 
        "lastAttemptAt" = NOW()
      WHERE id IN (
        SELECT id FROM "BillingUsageEvent"
        WHERE attempts < 5
        AND (
          status = 'PENDING'
          OR (status = 'FAILED' AND "nextAttemptAt" <= NOW())
          OR (status = 'PROCESSING' AND "lastAttemptAt" <= NOW() - INTERVAL '5 minutes')
        )
        ORDER BY "reportedAt" ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `;

    if (!claimedEvents || claimedEvents.length === 0) return;

    for (const event of claimedEvents) {
      try {
        const stripeCustomerId = await this.resolveCustomer(event.workspaceId);

        await this.provider.sendMeterEvent(
          stripeCustomerId,
          event.stripeMeterEventIdentifier,
          event.meterName,
          event.quantity
        );

        // Mark as sent
        await prisma.billingUsageEvent.update({
          where: { id: event.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            lastError: null,
            attempts: { increment: 1 },
          },
        });
      } catch (error: any) {
        console.error(`[OutboxDispatcher] Failed to dispatch event ${event.id}:`, error);
        
        // Exponential backoff: base 2 minutes * 2^attempts
        const attempts = event.attempts + 1;
        const delayMs = 2 * 60 * 1000 * Math.pow(2, attempts);
        const nextAttemptAt = new Date(Date.now() + delayMs);

        // Update failure state
        await prisma.billingUsageEvent.update({
          where: { id: event.id },
          data: {
            status: "FAILED",
            lastError: error.message || "Unknown error",
            attempts,
            nextAttemptAt,
          },
        });
      }
    }
  }

  private async resolveCustomer(workspaceId: string): Promise<string> {
    const customer = await prisma.billingCustomer.findUnique({
      where: { workspaceId }
    });
    if (!customer) {
      throw new Error(`No BillingCustomer found for workspace ${workspaceId}`);
    }
    return customer.stripeCustomerId;
  }
}
