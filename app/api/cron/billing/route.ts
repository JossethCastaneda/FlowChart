import { NextResponse } from "next/server";
import { BillingOutboxDispatcher } from "@/lib/ai/finops/outbox-dispatcher";
import { BillingNotifier } from "@/lib/commercial/billing-notifier";

export async function GET(req: Request) {
  // CRON SECURITY: FAIL CLOSED
  const authHeader = req.headers.get("authorization");
  
  if (
    !process.env.CRON_SECRET || 
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    console.error("[CRON] Unauthorized access attempt or missing CRON_SECRET");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Dispatch un-synced Stripe Meter Events
    const outbox = new BillingOutboxDispatcher();
    await outbox.flushOutbox(50);

    // 2. Dispatch pending billing emails / notifications (dunning, invoices)
    const notifier = new BillingNotifier();
    await notifier.dispatchPending(20);

    return NextResponse.json({ 
      success: true 
    });
  } catch (error: any) {
    console.error("[CRON] Billing cron failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
