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

  const subscribedFields = [
    "messages",
    "messaging_postbacks",
    "comments",
    "mentions",
    "story_insights",
  ].join(",");

  const attempts: Array<{ endpoint: string; ok: boolean; data: unknown }> = [];

  // Intento 1: graph.instagram.com
  try {
    const body1 = new URLSearchParams({ access_token: token, subscribed_fields: subscribedFields });
    const res1 = await fetch("https://graph.instagram.com/me/subscribed_apps", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body1.toString(),
    });
    const data1 = await res1.json();
    attempts.push({ endpoint: "graph.instagram.com", ok: res1.ok && !!data1.success, data: data1 });

    if (res1.ok && data1.success) {
      logger.info("[IG RESUBSCRIBE] ✅ Webhook re-subscription via graph.instagram.com", { workspaceId });
      return NextResponse.json({ success: true, endpoint: "graph.instagram.com", subscribedFields });
    }
  } catch (err) {
    attempts.push({ endpoint: "graph.instagram.com", ok: false, data: String(err) });
  }

  // Intento 2: graph.facebook.com
  try {
    const body2 = new URLSearchParams({ access_token: token, subscribed_fields: subscribedFields });
    const res2 = await fetch(`https://graph.facebook.com/${env.META_API_VERSION}/me/subscribed_apps`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body2.toString(),
    });
    const data2 = await res2.json();
    attempts.push({ endpoint: "graph.facebook.com", ok: res2.ok && !!data2.success, data: data2 });

    if (res2.ok && data2.success) {
      logger.info("[IG RESUBSCRIBE] ✅ Webhook re-subscription via graph.facebook.com", { workspaceId });
      return NextResponse.json({ success: true, endpoint: "graph.facebook.com", subscribedFields });
    }
  } catch (err) {
    attempts.push({ endpoint: "graph.facebook.com", ok: false, data: String(err) });
  }

  logger.warn("[IG RESUBSCRIBE] ⚠️ All subscription attempts failed", { workspaceId, attempts });
  return NextResponse.json({
    success: false,
    error: "Subscription failed on all endpoints",
    attempts,
    hint: "Asegúrate de que el webhook esté configurado en Meta Developers > App de Instagram > Webhooks",
  }, { status: 502 });
});
