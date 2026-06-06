import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { encryptToken, decryptToken } from "@/lib/encryption";

/** Centralized Meta Graph API version — use this everywhere, never hardcode */
export const META_API_VERSION = process.env.META_API_VERSION || "v25.0";

/**
 * Module-to-provider mapping for config_id-specific tokens.
 */
const MODULE_PROVIDER_MAP: Record<string, string> = {
  // Publisher — dedicated configs with publish permissions
  publisher_facebook: "meta_publisher_facebook",
  publisher_instagram: "meta_publisher_instagram",
  // Other modules
  social: "meta_social",
  ads: "meta_ads",
  analytics: "meta_analytics",
  community: "meta_community",
  // Inbox / Community aliases (all share inbox token with DM permissions)
  inbox: "meta_community",
  messenger: "meta_community",
  comments: "meta_community",
  listening: "meta_community",
  streams: "meta_community",
  // Aliases
  publisher: "meta_publisher_facebook",  // publisher defaults to FB publisher token
};

/**
 * Get the Meta access token for the current workspace.
 *
 * Priority:
 *   1. Module-specific Integration (e.g. meta_analytics, meta_community)
 *   2. Generic "meta" Integration (workspace-level token)
 *   3. JWT accessToken (user-level — fallback for owner who just connected)
 *
 * @param module - Optional module name to prefer the module-specific token
 */
export async function getMetaAccessToken(
  request: Request | NextRequest,
  module?: string
): Promise<string | null> {
  try {
    const jwtToken = await getToken({ req: request as NextRequest });
    if (!jwtToken?.sub) return null;

    const userId = jwtToken.sub;
    const workspaceId = await getActiveWorkspaceId(userId);

    if (workspaceId) {
      // 1. Try module-specific token first
      if (module) {
        const provider = MODULE_PROVIDER_MAP[module] || `meta_${module}`;
        const moduleIntegration = await prisma.integration.findUnique({
          where: {
            workspaceId_provider: { workspaceId, provider },
          },
        });
        if (moduleIntegration?.connected && moduleIntegration.credentials) {
          const creds = moduleIntegration.credentials as any;
          // A2 FIX: check token expiry before returning
          const expiresAt = creds.expiresAt ? new Date(creds.expiresAt) : null;
          const isExpired = !!expiresAt && expiresAt.getTime() < Date.now();
          if (creds.accessToken && !isExpired) return decryptToken(creds.accessToken);
          if (isExpired) {
            console.warn(`[SERVER-AUTH] Token expired for ${module} (expired ${expiresAt?.toISOString()})`);
          }
        }
      }

      // 2. Try generic "meta" Integration (shared token)
      const integration = await prisma.integration.findUnique({
        where: {
          workspaceId_provider: { workspaceId, provider: "meta" },
        },
      });
      if (integration?.connected && integration.credentials) {
        const creds = integration.credentials as any;
        const expiresAt = creds.expiresAt ? new Date(creds.expiresAt) : null;
        const isExpired = !!expiresAt && expiresAt.getTime() < Date.now();
        if (creds.accessToken && !isExpired) return decryptToken(creds.accessToken);
        if (isExpired) {
          console.warn(`[SERVER-AUTH] Generic meta token expired (expired ${expiresAt?.toISOString()})`);
        }
      }
    }

    // 3. Fallback: JWT token (owner who logged in with Facebook)
    const jwtAccessToken = (jwtToken?.accessToken as string) || null;

    // AUTO-SYNC: If the owner has a Meta token in their JWT but it's NOT
    // in the Integration table, save it now so all members can use it.
    if (jwtAccessToken && workspaceId) {
      try {
        await saveMetaTokenToWorkspace(userId, jwtAccessToken);
        console.log("[SERVER-AUTH] Auto-synced Meta token from JWT to Integration table");
      } catch (syncErr) {
        console.error("[SERVER-AUTH] Auto-sync failed:", syncErr);
      }
    }

    return jwtAccessToken;
  } catch (err) {
    console.error("[SERVER-AUTH] getMetaAccessToken error:", err);
    return null;
  }
}



/**
 * Save Meta access token to the workspace Integration table.
 * W8 FIX: Scoped to the ACTIVE workspace only (not all workspaces).
 * Called from auth.config.ts when owner logs in with Facebook.
 */
export async function saveMetaTokenToWorkspace(
  userId: string,
  accessToken: string,
  targetWorkspaceId?: string
): Promise<void> {
  try {
    // W8 FIX: Only save to the active workspace, not all workspaces
    const workspaceId = targetWorkspaceId || await getActiveWorkspaceId(userId);
    if (!workspaceId) {
      console.warn("[SERVER-AUTH] saveMetaTokenToWorkspace: no active workspace found");
      return;
    }

    // Verify user has permission in this workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId,
        role: { in: ["OWNER", "ADMIN"] },
      },
    });

    if (!membership) {
      console.warn("[SERVER-AUTH] saveMetaTokenToWorkspace: user is not OWNER/ADMIN in workspace");
      return;
    }

    // Long-lived tokens last ~60 days
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const encryptedToken = encryptToken(accessToken);

    await prisma.integration.upsert({
      where: {
        workspaceId_provider: {
          workspaceId,
          provider: "meta",
        },
      },
      update: {
        credentials: { accessToken: encryptedToken, expiresAt, refreshedAt: new Date().toISOString() },
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
      create: {
        workspaceId,
        provider: "meta",
        credentials: { accessToken: encryptedToken, expiresAt, refreshedAt: new Date().toISOString() },
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
    });
  } catch (err) {
    console.error("[SERVER-AUTH] saveMetaTokenToWorkspace error:", err);
  }
}

/**
 * Fetch from Meta Graph API with Authorization Bearer header.
 * IMPORTANT: Use this instead of putting access_token in the URL query string.
 */
export async function metaFetch(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  // Strip any access_token from URL (safety net)
  const cleanUrl = url.replace(/([?&])access_token=[^&]+(&?)/g, (_, prefix, suffix) => {
    return suffix ? prefix : '';
  }).replace(/[?&]$/, '');

  return fetch(cleanUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

/**
 * Build a Meta Graph API URL (without access_token in query).
 */
export function metaUrl(
  path: string,
  params: Record<string, string> = {}
): string {
  const base = `https://graph.facebook.com/${META_API_VERSION}/${path}`;
  const search = new URLSearchParams(params).toString();
  return search ? `${base}?${search}` : base;
}

/**
 * Paginated Meta Graph API GET — fetches all pages using Bearer header.
 * Returns concatenated data from all pages.
 */
export async function metaGetAll(
  initialUrl: string,
  token: string
): Promise<{ data: any[]; error?: string }> {
  const allData: any[] = [];
  let nextUrl: string | null = initialUrl;

  while (nextUrl) {
    const res = await metaFetch(nextUrl, token);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || "Meta API error";
      if (allData.length === 0) return { data: [], error: msg };
      break;
    }
    const json = await res.json();
    if (json.data) allData.push(...json.data);
    // Strip access_token from paging.next before re-using — metaFetch adds Bearer instead
    const rawNext = json.paging?.next || null;
    if (rawNext) {
      try {
        const nextUrlObj = new URL(rawNext);
        nextUrlObj.searchParams.delete("access_token");
        nextUrl = nextUrlObj.toString();
      } catch {
        nextUrl = null;
      }
    } else {
      nextUrl = null;
    }
  }

  return { data: allData };
}



