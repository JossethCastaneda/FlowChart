import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: "Meta Ads cron sync is not implemented. Use /api/cron/analytics-sync for the active analytics pipeline.",
      code: "NOT_IMPLEMENTED",
    },
    { status: 501 }
  );
}
