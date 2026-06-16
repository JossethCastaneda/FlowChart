import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: "Google cron sync is not implemented. Use the configured analytics cron endpoints instead.",
      code: "NOT_IMPLEMENTED",
    },
    { status: 501 }
  );
}
