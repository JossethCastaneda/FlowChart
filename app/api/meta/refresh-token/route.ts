import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError, apiServerError } from "@/lib/api-response";
import { META_API_VERSION } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { encryptToken, decryptToken } from "@/lib/encryption";
import { verifyCronAuth } from "@/lib/cron-auth";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// El cron (GET) refresca en SECUENCIA todos los workspaces × integraciones meta_*,
// cada uno con un fetch a Meta. Con 60s podría cortarse a escala dejando workspaces
// sin refrescar. Igual que los demás crons de trabajo real (analytics-sync, etc.).
export const maxDuration = 300;

type RefreshResult =
  | { status: "refreshed"; workspaceId: string; expiresAt: string; integrationsUpdated: number; expiresInDays: number }
  | { status: "missing"; workspaceId: string; error: string }
  | { status: "expired"; workspaceId: string; error: string }
  | { status: "failed"; workspaceId: string; error: string };

/** Exchanges ONE token for its long-lived version. */
async function exchangeToken(currentToken: string): Promise<
  | { ok: true; token: string; expiresIn: number }
  | { ok: false; code: number | null; error: string }
> {
  const exchangeUrl = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`);
  exchangeUrl.searchParams.set("grant_type", "fb_exchange_token");
  exchangeUrl.searchParams.set("client_id", env.META_APP_ID || "");
  exchangeUrl.searchParams.set("client_secret", env.META_APP_SECRET || "");
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

/** Notifies OWNER/ADMIN members that a Meta token expired. */
async function notifyTokenExpired(workspaceId: string): Promise<void> {
  const admins = await prisma.workspaceMember.findMany({
    where: { workspaceId, role: { in: ["OWNER", "ADMIN"] } },
    select: { userId: true },
  });
  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((m) => ({
      userId: m.userId,
      type: "meta_token_expired",
      title: "🔌 Conexión de Meta expirada",
      message:
        "Una o más conexiones de Meta expiraron y se desconectaron. Reconéctalas en Integraciones.",
      link: "/dashboard/integrations",
    })),
    skipDuplicates: true,
  });
}

async function refreshWorkspaceMetaTokens(workspaceId: string): Promise<RefreshResult> {
  const allIntegrations = await prisma.integration.findMany({
    where: { workspaceId, provider: { startsWith: "meta" }, connected: true },
  });

  if (allIntegrations.length === 0) {
    return { status: "missing", workspaceId, error: "No connected Meta integrations" };
  }

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
      errors.push(`${intg.provider}: token ilegible`);
      continue;
    }
    if (!currentToken || currentToken.startsWith("enc:")) {
      errors.push(`${intg.provider}: sin token utilizable`);
      continue;
    }

    // D. Motor Proactivo: Solo refrescar si caduca en menos de 7 días o lleva >50 días
    const expiresAtDate = creds.expiresAt ? new Date(creds.expiresAt as string) : new Date();
    const refreshedAtDate = creds.refreshedAt ? new Date(creds.refreshedAt as string) : new Date(0);
    const daysUntilExpiry = (expiresAtDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    const daysSinceRefresh = (Date.now() - refreshedAtDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntilExpiry > 7 && daysSinceRefresh < 50) {
      // Token is still fresh enough, skip to save rate limits
      continue;
    }

    const exchange = await exchangeToken(currentToken);

    if (!exchange.ok) {
      if (exchange.code === 190) {
        await prisma.integration.update({ where: { id: intg.id }, data: { connected: false } });
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

  logger.info("Meta tokens refresh completed", {
    workspaceId,
    total: allIntegrations.length,
    refreshed: refreshedCount,
    expired: expiredCount,
    errors: errors.length > 0 ? errors : undefined,
  });

  if (expiredCount > 0) {
    await notifyTokenExpired(workspaceId).catch((err) =>
      logger.warn("Failed to notify Meta token expiry", { workspaceId, error: err })
    );
  }

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
 * POST /api/meta/refresh-token — user-triggered refresh for the active workspace.
 */
export const POST = withWorkspace(async (_req, ctx) => {
  const result = await refreshWorkspaceMetaTokens(ctx.workspaceId);

  if (result.status === "refreshed") {
    return apiSuccess({
      expiresAt: result.expiresAt,
      expiresInDays: result.expiresInDays,
      integrationsUpdated: result.integrationsUpdated,
    });
  }

  return apiError(result.error, result.status === "expired" ? "TOKEN_EXPIRED" : "REFRESH_FAILED", result.status === "expired" ? 401 : 400);
});

/**
 * GET /api/meta/refresh-token — Vercel Cron entrypoint.
 * Refreshes all workspaces with connected Meta integrations.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const workspaces = await prisma.integration.findMany({
      where: { provider: { startsWith: "meta" }, connected: true },
      distinct: ["workspaceId"],
      select: { workspaceId: true },
    });

    // D. Motor Proactivo: Procesamiento en lotes/secuencial para evitar Rate Limits masivos
    // Se procesa de forma secuencial para no detonar alarmas de abuso de Meta.
    const results: RefreshResult[] = [];
    for (const ws of workspaces) {
      const result = await refreshWorkspaceMetaTokens(ws.workspaceId);
      results.push(result);
      // Pequeño delay de 500ms entre workspaces para respetar rate limits
      await new Promise((r) => setTimeout(r, 500));
    }

    return NextResponse.json({
      processed: results.length,
      refreshed: results.filter((r) => r.status === "refreshed").length,
      expired: results.filter((r) => r.status === "expired").length,
      failed: results.filter((r) => r.status === "failed").length,
      missing: results.filter((r) => r.status === "missing").length,
    });
  } catch (err) {
    logger.error("Meta refresh-token cron failed", { error: err });
    return apiServerError(err);
  }
}
