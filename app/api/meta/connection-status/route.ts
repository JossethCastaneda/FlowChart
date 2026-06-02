import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { metaFetch } from "@/lib/server-auth";

const META_VERSION = process.env.META_API_VERSION || "v22.0";

/**
 * GET /api/meta/connection-status
 *
 * Returns the current Meta integration status for the workspace:
 * - connected: boolean
 * - tokenValid: boolean (tested against Meta API)
 * - expiresAt: string | null
 * - scopes: string[] (granted permissions)
 * - pages: number (count of accessible pages)
 * - igAccounts: number (count of linked IG business accounts)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    const integration = await prisma.integration.findUnique({
      where: {
        workspaceId_provider: { workspaceId, provider: "meta" },
      },
    });

    if (!integration?.connected || !integration.credentials) {
      return NextResponse.json({
        connected: false,
        tokenValid: false,
        expiresAt: null,
        scopes: [],
        pages: 0,
        igAccounts: 0,
        message: "No hay integración de Meta conectada",
      });
    }

    const creds = integration.credentials as any;
    const accessToken = creds?.accessToken;
    const expiresAt = creds?.expiresAt || null;

    if (!accessToken) {
      return NextResponse.json({
        connected: true,
        tokenValid: false,
        expiresAt,
        scopes: [],
        pages: 0,
        igAccounts: 0,
        message: "Token no encontrado",
      });
    }

    // Test the token by calling /me
    let tokenValid = false;
    let scopes: string[] = [];
    let pagesCount = 0;
    let igAccountsCount = 0;

    try {
      // Check token validity + granted scopes
      const debugRes = await metaFetch(
        `https://graph.facebook.com/${META_VERSION}/me/permissions`,
        accessToken
      );
      const debugData = await debugRes.json();

      if (debugRes.ok && debugData.data) {
        tokenValid = true;
        scopes = debugData.data
          .filter((p: any) => p.status === "granted")
          .map((p: any) => p.permission);
      }

      // Count pages
      const pagesRes = await metaFetch(
        `https://graph.facebook.com/${META_VERSION}/me/accounts?fields=id,instagram_business_account{id}&limit=100`,
        accessToken
      );
      const pagesData = await pagesRes.json();
      if (pagesRes.ok && pagesData.data) {
        pagesCount = pagesData.data.length;
        igAccountsCount = pagesData.data.filter(
          (p: any) => p.instagram_business_account?.id
        ).length;
      }
    } catch {
      tokenValid = false;
    }

    // Check if token is expiring soon (< 7 days)
    let expiringWarning: string | null = null;
    if (expiresAt) {
      const daysUntilExpiry = Math.floor(
        (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry < 0) {
        expiringWarning = "Token expirado. Reconecta tu cuenta.";
      } else if (daysUntilExpiry < 7) {
        expiringWarning = `Token expira en ${daysUntilExpiry} días. Reconecta para renovar.`;
      }
    }

    // Check critical scopes
    const requiredScopes = [
      "pages_show_list",
      "pages_manage_posts",
      "instagram_business_content_publish",
    ];
    const missingScopes = requiredScopes.filter((s) => !scopes.includes(s));
    // Also check old scope names as fallback
    const oldScopeMap: Record<string, string> = {
      instagram_business_content_publish: "instagram_content_publish",
    };
    const actuallyMissing = missingScopes.filter((s) => {
      const oldName = oldScopeMap[s];
      return !oldName || !scopes.includes(oldName);
    });

    return NextResponse.json({
      connected: true,
      tokenValid,
      expiresAt,
      expiringWarning,
      scopes,
      missingScopes: actuallyMissing.length > 0 ? actuallyMissing : undefined,
      pages: pagesCount,
      igAccounts: igAccountsCount,
      connectedAt: integration.connectedAt?.toISOString() || null,
      connectedBy: integration.connectedBy || null,
    });
  } catch (err: any) {
    console.error("[META STATUS] Error:", err);
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}
