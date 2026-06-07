import { META_API_VERSION } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { encryptToken, decryptToken } from "@/lib/encryption";

type RefreshResult =
  | { status: "refreshed"; workspaceId: string; expiresAt: string; integrationsUpdated: number; expiresInDays: number }
  | { status: "missing"; workspaceId: string; error: string }
  | { status: "expired"; workspaceId: string; error: string }
  | { status: "failed"; workspaceId: string; error: string };

function verifyCronAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${cronSecret}`;
}

async function refreshWorkspaceMetaTokens(workspaceId: string): Promise<RefreshResult> {
  const allIntegrations = await prisma.integration.findMany({
    where: {
      workspaceId,
      provider: { startsWith: "meta" },
      connected: true,
    },
  });

  if (allIntegrations.length === 0) {
    return { status: "missing", workspaceId, error: "No connected Meta integrations" };
  }

  const genericMeta = allIntegrations.find((integration) => integration.provider === "meta");
  const integration = genericMeta || allIntegrations[0];
  const creds = integration.credentials as { accessToken?: string } | null;
  const currentToken = decryptToken(creds?.accessToken);

  if (!currentToken || currentToken.startsWith("enc:")) {
    return { status: "missing", workspaceId, error: "No usable Meta token found" };
  }

  const exchangeUrl = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`);
  exchangeUrl.searchParams.set("grant_type", "fb_exchange_token");
  exchangeUrl.searchParams.set("client_id", process.env.FACEBOOK_CLIENT_ID || "");
  exchangeUrl.searchParams.set("client_secret", process.env.FACEBOOK_CLIENT_SECRET || "");
  exchangeUrl.searchParams.set("fb_exchange_token", currentToken);

  const exchangeRes = await fetch(exchangeUrl.toString());
  const exchangeData = await exchangeRes.json();

  if (!exchangeRes.ok || !exchangeData.access_token) {
    const errorMsg = exchangeData?.error?.message || "Error refreshing Meta token";

    if (exchangeData?.error?.code === 190) {
      await prisma.integration.updateMany({
        where: { workspaceId, provider: { startsWith: "meta" } },
        data: { connected: false },
      });
      return { status: "expired", workspaceId, error: "Token expired. Reconnect Meta." };
    }

    return { status: "failed", workspaceId, error: errorMsg };
  }

  const newToken = exchangeData.access_token;
  const expiresIn = exchangeData.expires_in || 5_184_000;
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  const refreshedAt = new Date().toISOString();

  const updatePromises = allIntegrations.map((intg) => {
    const existingCreds = (intg.credentials as Record<string, unknown>) || {};
    return prisma.integration.update({
      where: { id: intg.id },
      data: {
        credentials: {
          ...existingCreds,
          accessToken: encryptToken(newToken),
          expiresAt: expiresAt.toISOString(),
          refreshedAt,
        },
        connectedAt: new Date(),
      },
    });
  });

  await Promise.allSettled(updatePromises);

  console.log(
    `[META REFRESH] Token refreshed for workspace ${workspaceId} - ${allIntegrations.length} integrations updated, expires: ${expiresAt.toISOString()}`
  );

  return {
    status: "refreshed",
    workspaceId,
    expiresAt: expiresAt.toISOString(),
    expiresInDays: Math.floor(expiresIn / 86_400),
    integrationsUpdated: allIntegrations.length,
  };
}

/**
 * POST /api/meta/refresh-token
 *
 * Manual/user-triggered refresh for the active workspace.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    const result = await refreshWorkspaceMetaTokens(workspaceId);

    if (result.status === "refreshed") {
      return NextResponse.json({
        success: true,
        expiresAt: result.expiresAt,
        expiresInDays: result.expiresInDays,
        integrationsUpdated: result.integrationsUpdated,
      });
    }

    return NextResponse.json(
      { error: result.error, expired: result.status === "expired" },
      { status: result.status === "expired" ? 401 : 400 }
    );
  } catch (err: unknown) {
    console.error("[META REFRESH] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

/**
 * GET /api/meta/refresh-token
 *
 * Vercel Cron entrypoint. Refreshes every workspace with connected Meta integrations.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const workspaces = await prisma.integration.findMany({
      where: {
        provider: { startsWith: "meta" },
        connected: true,
      },
      distinct: ["workspaceId"],
      select: { workspaceId: true },
    });

    const results: RefreshResult[] = [];
    for (const workspace of workspaces) {
      results.push(await refreshWorkspaceMetaTokens(workspace.workspaceId));
    }

    return NextResponse.json({
      processed: results.length,
      refreshed: results.filter((result) => result.status === "refreshed").length,
      expired: results.filter((result) => result.status === "expired").length,
      failed: results.filter((result) => result.status === "failed").length,
      missing: results.filter((result) => result.status === "missing").length,
      results,
    });
  } catch (err: unknown) {
    console.error("[META REFRESH CRON] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
