import { safeGetSession } from "@/lib/api-handler";
import { META_API_VERSION } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
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

/** Intercambia UN token por su versión long-lived. */
async function exchangeToken(currentToken: string): Promise<
  | { ok: true; token: string; expiresIn: number }
  | { ok: false; code: number | null; error: string }
> {
  const exchangeUrl = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`);
  exchangeUrl.searchParams.set("grant_type", "fb_exchange_token");
  exchangeUrl.searchParams.set("client_id", process.env.FACEBOOK_CLIENT_ID || "");
  exchangeUrl.searchParams.set("client_secret", process.env.FACEBOOK_CLIENT_SECRET || "");
  exchangeUrl.searchParams.set("fb_exchange_token", currentToken);

  const res = await fetch(exchangeUrl.toString());
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    return {
      ok: false,
      code: data?.error?.code ?? null,
      error: data?.error?.message || "Error refreshing Meta token",
    };
  }
  return { ok: true, token: data.access_token, expiresIn: data.expires_in || 5_184_000 };
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

  // Cada integración (meta_ads, meta_community, meta_publisher_*) se conectó
  // con su propio config_id y scopes: se refresca CADA token individualmente.
  // Nunca se sobrescribe un módulo con el token de otro, y un token expirado
  // solo desconecta SU integración.
  let refreshedCount = 0;
  let expiredCount = 0;
  const errors: string[] = [];
  let lastExpiresAt: Date | null = null;
  let lastExpiresIn = 0;

  for (const intg of allIntegrations) {
    const creds = (intg.credentials as Record<string, unknown>) || {};
    let currentToken = "";
    try {
      currentToken = decryptToken(typeof creds.accessToken === "string" ? creds.accessToken : "");
    } catch {
      errors.push(`${intg.provider}: token ilegible (texto plano o corrupto)`);
      continue;
    }
    if (!currentToken || currentToken.startsWith("enc:")) {
      errors.push(`${intg.provider}: sin token utilizable`);
      continue;
    }

    const exchange = await exchangeToken(currentToken);

    if (!exchange.ok) {
      if (exchange.code === 190) {
        await prisma.integration.update({
          where: { id: intg.id },
          data: { connected: false },
        });
        expiredCount++;
        errors.push(`${intg.provider}: token expirado — requiere reconexión`);
      } else {
        errors.push(`${intg.provider}: ${exchange.error}`);
      }
      continue;
    }

    const expiresAt = new Date(Date.now() + exchange.expiresIn * 1000);
    await prisma.integration.update({
      where: { id: intg.id },
      data: {
        credentials: {
          ...creds,
          accessToken: encryptToken(exchange.token),
          expiresAt: expiresAt.toISOString(),
          refreshedAt: new Date().toISOString(),
        },
        connectedAt: new Date(),
      },
    });
    refreshedCount++;
    lastExpiresAt = expiresAt;
    lastExpiresIn = exchange.expiresIn;
  }

  console.log(
    `[META REFRESH] workspace ${workspaceId}: ${refreshedCount}/${allIntegrations.length} refreshed, ${expiredCount} expired${errors.length ? ` — ${errors.join("; ")}` : ""}`
  );

  if (refreshedCount > 0) {
    return {
      status: "refreshed",
      workspaceId,
      expiresAt: (lastExpiresAt as Date).toISOString(),
      expiresInDays: Math.floor(lastExpiresIn / 86_400),
      integrationsUpdated: refreshedCount,
    };
  }
  if (expiredCount > 0) {
    return { status: "expired", workspaceId, error: "Token expired. Reconnect Meta." };
  }
  return { status: "failed", workspaceId, error: errors.join("; ") || "No tokens could be refreshed" };
}

/**
 * POST /api/meta/refresh-token
 *
 * Manual/user-triggered refresh for the active workspace.
 */
export async function POST() {
  try {
    const session = await safeGetSession();
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
