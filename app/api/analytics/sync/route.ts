import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { start } from "workflow/api";
import { syncIntegrationAssetsWorkflow } from "@/workflows/sync-integration-assets";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const jwt = await getToken({ req: request });
    if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
    
    const workspaceId = await getActiveWorkspaceId(jwt.sub);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    // Find the Meta integration for this workspace
    const integration = await prisma.integration.findFirst({
      where: { workspaceId, provider: { startsWith: "meta" }, connected: true },
    });

    if (!integration) {
      return NextResponse.json({ error: "No Meta integration connected" }, { status: 400 });
    }

    // Trigger the workflow immediately in the background
    await start(syncIntegrationAssetsWorkflow, [integration.id, 0]);

    logger.info(`Manual analytics sync triggered for workspace ${workspaceId}`);

    return NextResponse.json({ success: true, message: "Sync started in background" });
  } catch (error: any) {
    logger.error("Failed to trigger manual sync", { error: error.message });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
