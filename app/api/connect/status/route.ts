import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import prisma from "@/lib/prisma";

/**
 * GET /api/connect/status
 * Returns the connection status for all modules.
 * Response: { modules: { social, ads, analytics, community }, pages: [...], tokenExpiresSoon }
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

  const now = new Date();

  const modules: Record<string, { connected: boolean; connectedAt: string | null; pages: any[]; tokenExpiresSoon?: boolean; daysUntilExpiry?: number }> = {};

  for (const mod of ["publisher_facebook", "publisher_instagram", "social", "ads", "analytics", "community"]) {
    const integration = integrations.find((i) => i.provider === `meta_${mod}`);
    const creds = integration?.credentials as any;

    // Detect token expiry
    let tokenExpiresSoon = false;
    let daysUntilExpiry: number | undefined;
    if (creds?.expiresAt) {
      const expiresAt = new Date(creds.expiresAt);
      const msLeft = expiresAt.getTime() - now.getTime();
      daysUntilExpiry = Math.floor(msLeft / (1000 * 60 * 60 * 24));
      tokenExpiresSoon = daysUntilExpiry <= 7;
    }

    modules[mod] = {
      connected: integration?.connected ?? false,
      connectedAt: integration?.connectedAt?.toISOString() || null,
      pages: creds?.pages || [],
      tokenExpiresSoon,
      daysUntilExpiry,
    };
  }

  // Also get pages from generic "meta" integration as fallback
  const genericMeta = integrations.find((i) => i.provider === "meta");
  const genericPages = (genericMeta?.credentials as any)?.pages || [];
  const genericCreds = genericMeta?.credentials as any;

  // Check generic token expiry
  let genericTokenExpiresSoon = false;
  let genericDaysUntilExpiry: number | undefined;
  if (genericCreds?.expiresAt) {
    const expiresAt = new Date(genericCreds.expiresAt);
    const msLeft = expiresAt.getTime() - now.getTime();
    genericDaysUntilExpiry = Math.floor(msLeft / (1000 * 60 * 60 * 24));
    genericTokenExpiresSoon = genericDaysUntilExpiry <= 7;
  }

  return NextResponse.json({
    modules,
    pages: genericPages,
    hasAnyConnection: integrations.some((i) => i.connected),
    tokenExpiresSoon: genericTokenExpiresSoon,
    daysUntilExpiry: genericDaysUntilExpiry,
  });
}
