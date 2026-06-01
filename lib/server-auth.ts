import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";

/**
 * Get the Meta access token for the current workspace.
 *
 * Priority:
 *   1. Integration table (workspace-level token — shared by all members)
 *   2. JWT accessToken (user-level — fallback for owner who just connected)
 *
 * This ensures all workspace members can use Meta APIs,
 * not just the owner who originally connected.
 */
export async function getMetaAccessToken(
  request: Request | NextRequest
): Promise<string | null> {
  try {
    const token = await getToken({ req: request as NextRequest });
    if (!token?.sub) return null;

    // 1. Try workspace Integration (shared token)
    const workspaceId = await getActiveWorkspaceId(token.sub);
    if (workspaceId) {
      const integration = await prisma.integration.findUnique({
        where: {
          workspaceId_provider: {
            workspaceId,
            provider: "meta",
          },
        },
      });
      if (integration?.connected && integration.credentials) {
        const creds = integration.credentials as any;
        if (creds.accessToken) {
          return creds.accessToken;
        }
      }
    }

    // 2. Fallback: JWT token (owner who just logged in with Facebook)
    return (token?.accessToken as string) || null;
  } catch (err) {
    console.error("[SERVER-AUTH] getMetaAccessToken error:", err);
    return null;
  }
}

/**
 * Save Meta access token to the workspace Integration table.
 * Called from auth.config.ts when owner logs in with Facebook.
 */
export async function saveMetaTokenToWorkspace(
  userId: string,
  accessToken: string
): Promise<void> {
  try {
    // Find user's workspaces where they are OWNER or ADMIN
    const memberships = await prisma.workspaceMember.findMany({
      where: {
        userId,
        role: { in: ["OWNER", "ADMIN"] },
      },
      select: { workspaceId: true },
    });

    // Save token to ALL workspaces where user is owner/admin
    for (const m of memberships) {
      await prisma.integration.upsert({
        where: {
          workspaceId_provider: {
            workspaceId: m.workspaceId,
            provider: "meta",
          },
        },
        update: {
          credentials: { accessToken },
          connected: true,
          connectedAt: new Date(),
          connectedBy: userId,
        },
        create: {
          workspaceId: m.workspaceId,
          provider: "meta",
          credentials: { accessToken },
          connected: true,
          connectedAt: new Date(),
          connectedBy: userId,
        },
      });
    }
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
  const base = `https://graph.facebook.com/v22.0/${path}`;
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
    // Pagination cursors from Meta — strip access_token, use Bearer instead
    nextUrl = json.paging?.next || null;
  }

  return { data: allData };
}

