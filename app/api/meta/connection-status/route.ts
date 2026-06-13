import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { metaFetch, META_API_VERSION } from "@/lib/server-auth";
import { decryptToken } from "@/lib/encryption";
import { getRequiredScopes, scopeGranted } from "@/lib/meta-scopes";

const MODULE_PROVIDER_MAP: Record<string, string> = {
  publisher_facebook: "meta_publisher_facebook",
  publisher_instagram: "meta_publisher_instagram",
  social: "meta_social",
  ads: "meta_ads",
  analytics: "meta_analytics",
  community: "meta_community",
};

// Los scopes requeridos por módulo viven en lib/meta-scopes.ts (fuente única).

type IntegrationCredentials = {
  accessToken?: unknown;
  expiresAt?: unknown;
};

type MetaPermission = {
  permission?: string;
  status?: string;
};

type MetaPage = {
  instagram_business_account?: {
    id?: string;
  };
};

/**
 * GET /api/meta/connection-status?module=ads
 *
 * Validates the active workspace Meta integration. When module is provided,
 * the module-specific token is checked first (for example meta_ads), then the
 * generic meta token is used only as a fallback.
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

    const requestedModule = req.nextUrl.searchParams.get("module") || "meta";
    const provider = MODULE_PROVIDER_MAP[requestedModule] || "meta";
    const moduleIntegration = provider === "meta"
      ? null
      : await prisma.integration.findUnique({
          where: { workspaceId_provider_userId: { workspaceId, provider, userId: "workspace" } },
        });
    const genericIntegration = await prisma.integration.findUnique({
      where: { workspaceId_provider_userId: { workspaceId, provider: "meta", userId: "workspace" } },
    });
    const integration = moduleIntegration || genericIntegration;
    const providerUsed = integration?.provider || null;

    if (!integration?.connected || !integration.credentials) {
      return NextResponse.json({
        connected: false,
        tokenValid: false,
        module: requestedModule,
        provider,
        providerUsed,
        expiresAt: null,
        scopes: [],
        pages: 0,
        igAccounts: 0,
        message: `No hay integracion de Meta conectada para ${requestedModule}`,
      });
    }

    const creds = integration.credentials as IntegrationCredentials;
    const encryptedAccessToken = typeof creds.accessToken === "string" ? creds.accessToken : undefined;
    const accessToken = decryptToken(encryptedAccessToken);
    const expiresAt = typeof creds.expiresAt === "string" ? creds.expiresAt : null;

    if (!accessToken || accessToken.startsWith("enc:")) {
      return NextResponse.json({
        connected: true,
        tokenValid: false,
        module: requestedModule,
        provider,
        providerUsed,
        expiresAt,
        scopes: [],
        pages: 0,
        igAccounts: 0,
        message: "Token no encontrado o no se pudo descifrar",
      });
    }

    let tokenValid = false;
    let scopes: string[] = [];
    let pagesCount = 0;
    let igAccountsCount = 0;

    try {
      const permissionsRes = await metaFetch(
        `https://graph.facebook.com/${META_API_VERSION}/me/permissions`,
        accessToken
      );
      const permissionsData = await permissionsRes.json() as { data?: MetaPermission[] };

      if (permissionsRes.ok && permissionsData.data) {
        tokenValid = true;
        scopes = permissionsData.data
          .filter((permission) => permission.status === "granted" && typeof permission.permission === "string")
          .map((permission) => permission.permission as string);
      }

      const pagesRes = await metaFetch(
        `https://graph.facebook.com/${META_API_VERSION}/me/accounts?fields=id,instagram_business_account{id}&limit=100`,
        accessToken
      );
      const pagesData = await pagesRes.json() as { data?: MetaPage[] };
      if (pagesRes.ok && pagesData.data) {
        pagesCount = pagesData.data.length;
        igAccountsCount = pagesData.data.filter(
          (page) => page.instagram_business_account?.id
        ).length;
      }
    } catch {
      tokenValid = false;
    }

    let expiringWarning: string | null = null;
    if (expiresAt) {
      const daysUntilExpiry = Math.floor(
        (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry < 0) {
        expiringWarning = "Token expirado. Reconecta tu cuenta.";
      } else if (daysUntilExpiry < 7) {
        expiringWarning = `Token expira en ${daysUntilExpiry} dias. Reconecta para renovar.`;
      }
    }

    const requiredScopes = getRequiredScopes(requestedModule);
    // scopeGranted resuelve alias legacy (instagram_business_content_publish ↔
    // instagram_content_publish) para tokens conectados con nombres viejos.
    const actuallyMissing = requiredScopes.filter((scope) => !scopeGranted(scope, scopes));

    return NextResponse.json({
      connected: true,
      tokenValid,
      module: requestedModule,
      provider,
      providerUsed,
      expiresAt,
      expiringWarning,
      scopes,
      missingScopes: actuallyMissing.length > 0 ? actuallyMissing : undefined,
      pages: pagesCount,
      igAccounts: igAccountsCount,
      connectedAt: integration.connectedAt?.toISOString() || null,
      connectedBy: integration.connectedBy || null,
    });
  } catch (err: unknown) {
    console.error("[META STATUS] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
