import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import prisma from "@/lib/prisma";

/**
 * GET /api/connect/status
 * Returns the connection status for all modules.
 * Response: { modules: { social, ads, analytics, community }, pages: [...] }
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  // Fetch all meta integrations for this workspace
  const integrations = await prisma.integration.findMany({
    where: {
      workspaceId,
      provider: { startsWith: "meta" },
    },
  });

  const modules: Record<string, { connected: boolean; connectedAt: string | null; pages: any[] }> = {};

  for (const mod of ["publisher_facebook", "publisher_instagram", "social", "ads", "analytics", "community"]) {
    const integration = integrations.find((i) => i.provider === `meta_${mod}`);
    const creds = integration?.credentials as any;

    modules[mod] = {
      connected: integration?.connected ?? false,
      connectedAt: integration?.connectedAt?.toISOString() || null,
      pages: creds?.pages || [],
    };
  }

  // Also get pages from generic "meta" integration as fallback
  const genericMeta = integrations.find((i) => i.provider === "meta");
  const genericPages = (genericMeta?.credentials as any)?.pages || [];

  return NextResponse.json({
    modules,
    pages: genericPages,
    hasAnyConnection: integrations.some((i) => i.connected),
  });
}
