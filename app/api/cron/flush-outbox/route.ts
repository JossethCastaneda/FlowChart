import { NextResponse } from "next/server";
import { BillingOutboxDispatcher } from "@/lib/ai/finops/outbox-dispatcher";

export async function GET(req: Request) {
  try {
    // Vercel Cron Auth Header Check (Secure the endpoint)
    // https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dispatcher = new BillingOutboxDispatcher();
    await dispatcher.flushOutbox();

    return NextResponse.json({ success: true, message: "Outbox flushed successfully" });
  } catch (error: any) {
    console.error("[Cron FlushOutbox] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
