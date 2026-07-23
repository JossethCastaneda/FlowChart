import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";

/**
 * GET /api/cron/instagram-resubscribe
 * Cron job que garantiza que todas las integraciones de Instagram activas tengan
 * su suscripción a webhooks activa. Se ejecuta periódicamente para cubrir casos donde:
 * - La suscripción inicial falló al conectar
 * - El token fue renovado y la suscripción caducó
 * 
 * Protegido con CRON_SECRET (Bearer token en Authorization header).
 */
export async function GET(req: NextRequest) {
  // Verificar CRON_SECRET
  const cronSecret = env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiVersion = env.META_API_VERSION || "v25.0";
  const results: Array<{
    integrationId: string;
    workspaceId: string;
    instagramUserId: string | null;
    success: boolean;
    endpoint: string | null;
    error?: string;
  }> = [];

  // Buscar todas las integraciones de Instagram conectadas sin suscripción exitosa
  const integrations = await prisma.integration.findMany({
    where: {
      provider: "instagram",
      connected: true,
    },
    select: {
      id: true,
      workspaceId: true,
      credentials: true,
    },
  });

  logger.info("[CRON/IG-RESUB] Starting Instagram webhook resubscription check", {
    total: integrations.length,
  });

  for (const integ of integrations) {
    const creds = integ.credentials as Record<string, unknown>;
    const instagramUserId = creds?.instagramUserId ? String(creds.instagramUserId) : null;
    const existingResult = creds?.webhookSubscriptionResult as string | null;

    // Intentar suscribir incluso si ya tiene éxito previo (para renovar)
    // En producción podrías saltar si `existingResult === "success"` y la fecha es reciente
    if (!creds?.accessToken || typeof creds.accessToken !== "string") {
      results.push({
        integrationId: integ.id,
        workspaceId: integ.workspaceId,
        instagramUserId,
        success: false,
        endpoint: null,
        error: "No access token in credentials",
      });
      continue;
    }

    const token = decryptToken(creds.accessToken);
    if (!token || token.startsWith("enc:")) {
      results.push({
        integrationId: integ.id,
        workspaceId: integ.workspaceId,
        instagramUserId,
        success: false,
        endpoint: null,
        error: "Could not decrypt token",
      });
      continue;
    }

    const subscribedFields = [
      "messages",
      "messaging_postbacks",
      "comments",
      "mentions",
      "story_insights",
      "message_reactions",
      "messaging_seen",
      "messaging_referral",
      "message_edit",
    ].join(",");

    const endpointsToTry = [
      `https://graph.instagram.com/me/subscribed_apps`,
      instagramUserId ? `https://graph.instagram.com/${instagramUserId}/subscribed_apps` : null,
      `https://graph.facebook.com/${apiVersion}/me/subscribed_apps`,
      `https://graph.facebook.com/me/subscribed_apps`,
    ].filter(Boolean) as string[];

    let success = false;
    let successEndpoint: string | null = null;
    let lastError: string | null = null;

    for (const endpoint of endpointsToTry) {
      try {
        const body = new URLSearchParams({ access_token: token, subscribed_fields: subscribedFields });
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });
        const data = await res.json();

        if (res.ok && data.success) {
          success = true;
          successEndpoint = endpoint;
          logger.info("[CRON/IG-RESUB]  Subscription activated", {
            integrationId: integ.id,
            instagramUserId,
            endpoint,
          });
          break;
        } else {
          lastError = JSON.stringify(data?.error ?? data).slice(0, 300);
          logger.warn("[CRON/IG-RESUB] Endpoint failed, trying next", {
            endpoint,
            error: data?.error ?? data,
          });
        }
      } catch (err) {
        lastError = String(err).slice(0, 300);
      }
    }

    // Actualizar DB con el resultado
    try {
      await prisma.integration.update({
        where: { id: integ.id },
        data: {
          credentials: {
            ...(creds as object),
            webhookSubscribedAt: success ? new Date().toISOString() : (creds.webhookSubscribedAt ?? null),
            webhookSubscriptionResult: success ? "success" : "failed",
            webhookSubscribedVia: success ? successEndpoint : (creds.webhookSubscribedVia ?? null),
            webhookSubscribedFields: success ? subscribedFields : (creds.webhookSubscribedFields ?? null),
            webhookLastError: success ? null : lastError,
            webhookLastAttempt: new Date().toISOString(),
          },
        },
      });
    } catch (dbErr) {
      logger.warn("[CRON/IG-RESUB] Failed to update integration", { error: String(dbErr) });
    }

    results.push({
      integrationId: integ.id,
      workspaceId: integ.workspaceId,
      instagramUserId,
      success,
      endpoint: successEndpoint,
      error: success ? undefined : (lastError ?? "All endpoints failed"),
    });
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  logger.info("[CRON/IG-RESUB] Completed", { total: results.length, succeeded, failed });

  return NextResponse.json({
    success: true,
    summary: { total: results.length, succeeded, failed },
    results,
  });
}
