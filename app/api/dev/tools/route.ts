import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { start } from "workflow/api";
import { syncIntegrationAssetsWorkflow } from "@/workflows/sync-integration-assets";

// Verify that the request comes from dev.sodare.xyz
function verifyDevHost(req: NextRequest) {
  const hostname = req.nextUrl.hostname;
  return hostname === "dev.sodare.xyz";
}

export async function GET(req: NextRequest) {
  if (!verifyDevHost(req)) {
    return NextResponse.json({ error: "Forbidden. Dev tools are only available on dev.sodare.xyz" }, { status: 403 });
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET });
  if (!token?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get raw integrations for debug
  const integrations = await prisma.integration.findMany({
    where: { workspace: { members: { some: { userId: token.sub } } } },
    select: {
      id: true,
      provider: true,
      connected: true,
      connectedAt: true,
      workspaceId: true,
      credentials: true, // RAW Access!
    }
  });

  return NextResponse.json({ integrations });
}

export async function POST(req: NextRequest) {
  if (!verifyDevHost(req)) {
    return NextResponse.json({ error: "Forbidden. Dev tools are only available on dev.sodare.xyz" }, { status: 403 });
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET });
  if (!token?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, integrationId } = await req.json();

  if (action === "force_sync") {
    if (!integrationId) return NextResponse.json({ error: "Missing integrationId" }, { status: 400 });
    try {
      await start(syncIntegrationAssetsWorkflow, [integrationId]);
      return NextResponse.json({ success: true, message: `Sync forced for integration ${integrationId}` });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  if (action === "delete_integration") {
    if (!integrationId) return NextResponse.json({ error: "Missing integrationId" }, { status: 400 });
    try {
      await prisma.integration.delete({ where: { id: integrationId } });
      return NextResponse.json({ success: true, message: `Integration ${integrationId} deleted completely.` });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
