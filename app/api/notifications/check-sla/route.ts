import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { checkSLAWarnings } from "@/lib/notifications";
import { getActiveWorkspaceId } from "@/lib/active-workspace";

// POST /api/notifications/check-sla — check SLA warnings and send notifications
// Can be called by Vercel cron or manually
export async function POST(req: NextRequest) {
  try {
    // Check for cron secret or authenticated user
    const cronSecret = req.headers.get("x-cron-secret");
    
    if (cronSecret === process.env.CRON_SECRET) {
      // Cron job: check all workspaces
      const workspaces = await prisma.workspace.findMany({ select: { id: true } });
      for (const ws of workspaces) {
        await checkSLAWarnings(ws.id);
      }
      return NextResponse.json({ success: true, checked: workspaces.length });
    }

    // Manual: check current user's workspace
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    await checkSLAWarnings(workspaceId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[SLA CHECK] error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
