import { NextRequest, NextResponse } from "next/server";
import { withWorkspaceRole } from "@/lib/api-handler";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";

/**
 * POST /api/integrations/instagram/resubscribe
 * Re-suscribe los webhooks de Instagram para las integraciones activas del workspace.
 * Útil cuando la suscripción inicial falló o el token fue renovado.
 * 
 * Intenta múltiples endpoints según la documentación de Instagram Business Login:
 * - graph.instagram.com/me/subscribed_apps (nuevo)
 * - graph.instagram.com/{ig-user-id}/subscribed_apps (explícito)
 * - graph.facebook.com/v25.0/me/subscribed_apps (fallback)
 */
export const POST = withWorkspaceRole(["OWNER", "ADMIN"])(async (_req: NextRequest, ctx) => {
  const { workspaceId } = ctx;

  const igInteg = await prisma.integration.findFirst({
    where: { workspaceId, provider: "instagram", connected: true },
    select: { id: true, credentials: true },
  });

  if (!igInteg) {
    return NextResponse.json({ success: false, error: "No hay integración de Instagram conectada" }, { status: 404 });
  }

  const creds = igInteg.credentials as Record<string, unknown>;
  if (!creds.accessToken || typeof creds.accessToken !== "string") {
    return NextResponse.json({ success: false, error: "No hay token de acceso guardado" }, { status: 400 });
  }

  const token = decryptToken(creds.accessToken);
  if (!token || token.startsWith("enc:")) {
    return NextResponse.json({ success: false, error: "No se pudo descifrar el token" }, { status: 500 });
  }

  const instagramUserId = creds.instagramUserId ? String(creds.instagramUserId) : null;
  const apiVersion = env.META_API_VERSION || "v25.0";
  
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

  const attempts: Array<{ endpoint: string; ok: boolean; data: unknown }> = [];

  // Helper to attempt subscription
  const trySubscribe = async (url: string, label: string): Promise<boolean> => {
    try {
      const body = new URLSearchParams({ access_token: token, subscribed_fields: subscribedFields });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const data = await res.json();
      const ok = res.ok && !!data.success;
      attempts.push({ endpoint: label, ok, data });
      if (ok) {
        logger.info(`[IG RESUBSCRIBE] ✅ Webhook subscription via ${label}`, { workspaceId, instagramUserId });
        // Guardar el resultado en la DB
        await prisma.integration.update({
          where: { id: igInteg.id },
          data: {
            credentials: {
              ...(creds as object),
              webhookSubscribedAt: new Date().toISOString(),
              webhookSubscriptionResult: "success",
              webhookSubscribedFields: subscribedFields,
              webhookSubscribedVia: label,
            },
          },
        });
      }
      return ok;
    } catch (err) {
      attempts.push({ endpoint: label, ok: false, data: String(err) });
      return false;
    }
  };

  // Intento 1: graph.instagram.com/me/subscribed_apps
  if (await trySubscribe("https://graph.instagram.com/me/subscribed_apps", "graph.instagram.com/me")) {
    return NextResponse.json({ success: true, endpoint: "graph.instagram.com/me", subscribedFields, attempts });
  }

  // Intento 2: graph.instagram.com/{ig-user-id}/subscribed_apps (explícito)
  if (instagramUserId) {
    if (await trySubscribe(`https://graph.instagram.com/${instagramUserId}/subscribed_apps`, `graph.instagram.com/${instagramUserId}`)) {
      return NextResponse.json({ success: true, endpoint: `graph.instagram.com/${instagramUserId}`, subscribedFields, attempts });
    }
  }

  // Intento 3: graph.facebook.com/v?/me/subscribed_apps
  if (await trySubscribe(`https://graph.facebook.com/${apiVersion}/me/subscribed_apps`, `graph.facebook.com/${apiVersion}/me`)) {
    return NextResponse.json({ success: true, endpoint: `graph.facebook.com/${apiVersion}/me`, subscribedFields, attempts });
  }

  // Intento 4: graph.facebook.com sin versión
  if (await trySubscribe("https://graph.facebook.com/me/subscribed_apps", "graph.facebook.com/me")) {
    return NextResponse.json({ success: true, endpoint: "graph.facebook.com/me", subscribedFields, attempts });
  }

  logger.warn("[IG RESUBSCRIBE] ⚠️ All subscription attempts failed", { workspaceId, attempts });
  return NextResponse.json({
    success: false,
    error: "Subscription failed on all endpoints",
    attempts,
    hint: "Asegúrate de que el webhook esté configurado en Meta Developers > App de Instagram > Webhooks y que el token sea válido.",
  }, { status: 502 });
});
