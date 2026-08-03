import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess } from "@/lib/api-response";
import { metaFetch, META_API_VERSION } from "@/lib/server-auth";
import { decryptToken } from "@/lib/encryption";
import { getRequiredScopes, scopeGranted } from "@/lib/meta-scopes";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

const MODULE_PROVIDER_MAP: Record<string, string> = {
  publisher_facebook: "meta_publisher_facebook",
  publisher_instagram: "meta_publisher_instagram",
  social: "meta_social",
  ads: "meta_ads",
  analytics: "meta_analytics",
  community: "meta_community",
};

type IntegrationCredentials = {
  accessToken?: unknown;
  expiresAt?: unknown;
};

type MetaPermission = {
  permission?: string;
  status?: string;
};

type MetaPage = {
  instagram_business_account?: { id?: string };
};

const CACHE_ENDPOINT = "connection-status";
const CACHE_TTL_MS = 90 * 1000; // 90 seconds

/**
 * GET /api/meta/connection-status?module=ads
 *
 * Validates the active workspace Meta integration for a given module.
 * Modo estricto: solo se evalúa la Integration del módulo (cuenta vinculada en
 * su propio botón); el genérico "meta" únicamente al consultar module=meta.
 * Results are cached for 90s to avoid redundant Graph API calls per request.
 */
export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const { workspaceId } = ctx;
  const requestedModule = req.nextUrl.searchParams.get("module") || "meta";
  const provider = MODULE_PROVIDER_MAP[requestedModule] || "meta";

  // Short cache (90s) to avoid 2 live Graph calls per request.
  // Cache is invalidated on connect/disconnect.
  const cached = await prisma.metaAnalyticsCache.findUnique({
    where: {
      workspaceId_endpoint_paramsKey: {
        workspaceId,
        endpoint: CACHE_ENDPOINT,
        paramsKey: requestedModule,
      },
    },
  });
  if (cached && Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS) {
    return apiSuccess(cached.data as Record<string, unknown>);
  }

  const [moduleIntegration, genericIntegration] = await Promise.all([
    provider === "meta"
      ? null
      : prisma.integration.findUnique({
          where: { workspaceId_provider_userId: { workspaceId, provider, userId: "workspace" } },
        }),
    prisma.integration.findUnique({
      where: { workspaceId_provider_userId: { workspaceId, provider: "meta", userId: "workspace" } },
    }),
  ]);

  // Modo estricto: el estado de un módulo solo refleja SU Integration.
  // El genérico "meta" únicamente cuando se consulta el provider "meta" en sí.
  const integration = provider === "meta" ? genericIntegration : moduleIntegration;
  const providerUsed = integration?.provider || null;

  if (!integration?.connected || !integration.credentials) {
    return apiSuccess({
      connected: false,
      tokenValid: false,
      module: requestedModule,
      provider,
      providerUsed,
      expiresAt: null,
      scopes: [],
      pages: 0,
      igAccounts: 0,
      message: `No hay integración de Meta conectada para ${requestedModule}`,
    });
  }

  const creds = integration.credentials as IntegrationCredentials;
  const encryptedAccessToken = typeof creds.accessToken === "string" ? creds.accessToken : undefined;
  const accessToken = decryptToken(encryptedAccessToken);
  const expiresAt = typeof creds.expiresAt === "string" ? creds.expiresAt : null;

  if (!accessToken || accessToken.startsWith("enc:")) {
    return apiSuccess({
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
    const [permissionsRes, pagesRes] = await Promise.all([
      metaFetch(`https://graph.facebook.com/${META_API_VERSION}/me/permissions`, accessToken),
      metaFetch(
        `https://graph.facebook.com/${META_API_VERSION}/me/accounts?fields=id,instagram_business_account{id}&limit=100`,
        accessToken
      ),
    ]);

    const permissionsData = await permissionsRes.json() as { data?: MetaPermission[] };
    if (permissionsRes.ok && permissionsData.data) {
      tokenValid = true;
      scopes = permissionsData.data
        .filter((p) => p.status === "granted" && typeof p.permission === "string")
        .map((p) => p.permission as string);
    }

    const pagesData = await pagesRes.json() as { data?: MetaPage[] };
    if (pagesRes.ok && pagesData.data) {
      pagesCount = pagesData.data.length;
      igAccountsCount = pagesData.data.filter((page) => page.instagram_business_account?.id).length;
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
      expiringWarning = `Token expira en ${daysUntilExpiry} días. Reconecta para renovar.`;
    }
  }

  const requiredScopes = getRequiredScopes(requestedModule);
  const actuallyMissing = requiredScopes.filter((scope) => !scopeGranted(scope, scopes));

  const payload = {
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
  };

  // Cache only valid-token responses (invalid tokens change on reconnect)
  if (tokenValid) {
    prisma.metaAnalyticsCache
      .upsert({
        where: {
          workspaceId_endpoint_paramsKey: { workspaceId, endpoint: CACHE_ENDPOINT, paramsKey: requestedModule },
        },
        update: { data: payload },
        create: { workspaceId, endpoint: CACHE_ENDPOINT, paramsKey: requestedModule, data: payload },
      })
      .catch((err) => logger.warn("Meta connection-status cache write failed", { workspaceId, error: err }));
  }

  return apiSuccess(payload);
});
