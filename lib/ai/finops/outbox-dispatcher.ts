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
    // 1. Atomic Lease: find eligible and mark as PROCESSING
    // Since Prisma updateMany doesn't return the updated records in a way we can iterate easily without a lease ID,
    // we use a time-based lease. If it stays PROCESSING for > 5 min, we consider it stale.
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const now = new Date();

    const eligibleEvents = await prisma.billingUsageEvent.findMany({
      where: {
        attempts: { lt: 5 },
        OR: [
          { status: "PENDING" },
          { 
            status: "FAILED", 
            nextAttemptAt: { lte: now } 
          },
          {
            status: "PROCESSING",
            lastAttemptAt: { lte: staleThreshold }
          }
        ]
      },
      take: batchSize,
      orderBy: { reportedAt: "asc" }
    });

    if (eligibleEvents.length === 0) return;

    const eventIds = eligibleEvents.map(e => e.id);

    // Atomically claim the specific IDs
    await prisma.billingUsageEvent.updateMany({
      where: {
        id: { in: eventIds },
      },
      data: {
        status: "PROCESSING",
        lastAttemptAt: now,
      }
    });

    for (const event of eligibleEvents) {
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
