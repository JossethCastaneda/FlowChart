import { NextRequest, NextResponse } from "next/server";
import { apiSuccess, apiServerError } from "@/lib/api-response";
import { verifyCronAuth } from "@/lib/cron-auth";
import { checkSLAWarnings } from "@/lib/notifications";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeGetSession } from "@/lib/api-handler";

/**
 * GET /api/notifications/check-sla
 *
 * Two modes:
 * 1. Cron: Vercel invokes with Authorization: Bearer <CRON_SECRET>
 *    → checks SLA for all workspaces.
 * 2. Manual: authenticated user triggers check for their own workspace.
 *
 * Cron schedule: 0 8 * * * (vercel.json)
 */
export async function GET(req: NextRequest) {
  try {
    if (verifyCronAuth(req)) {
      const workspaces = await prisma.workspace.findMany({ select: { id: true } });
      await Promise.allSettled(workspaces.map((ws) => checkSLAWarnings(ws.id)));
      logger.info("SLA check completed (cron)", { workspaceCount: workspaces.length });
      return apiSuccess({ checked: workspaces.length });
    }

    // Manual invocation: user must be authenticated
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    await checkSLAWarnings(workspaceId);
    return apiSuccess({ checked: 1 });
  } catch (err) {
    logger.error("SLA check failed", { error: err });
    return apiServerError(err);
  }
}

// Keep POST for backward compatibility with manual dashboard calls
export async function POST(req: NextRequest) {
  return GET(req);
}
