import prisma from "@/lib/prisma";
import { StripeBillingProvider } from "./stripe-billing-provider";

export class BillingOutboxDispatcher {
  private provider: StripeBillingProvider;

  constructor() {
    this.provider = new StripeBillingProvider();
  }

  /**
   * Dispatches all PENDING and retriable FAILED billing usage events.
   * Typically run via Cron or a Vercel background job.
   */
  async flushOutbox(batchSize: number = 50) {
    const events = await prisma.billingUsageEvent.findMany({
      where: {
        status: { in: ["PENDING", "FAILED"] },
        attempts: { lt: 5 }, // arbitrary max retries
      },
      take: batchSize,
      orderBy: { reportedAt: "asc" },
    });

    for (const event of events) {
      try {
        await this.provider.sendMeterEvent(
          event.workspaceId,
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
        
        // Update failure state
        await prisma.billingUsageEvent.update({
          where: { id: event.id },
          data: {
            status: "FAILED",
            lastError: error.message || "Unknown error",
            attempts: { increment: 1 },
          },
        });
      }
    }
  }
}
