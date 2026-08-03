import { NextRequest, NextResponse } from "next/server";
import { withWorkspaceRole } from "@/lib/api-handler";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";
import { metaFetch } from "@/lib/server-auth";

/**
 * GET /api/integrations/instagram/status
 * Retorna el estado de la integración de Instagram para el workspace,
 * incluyendo información de configuración de webhook para el usuario.
 */
export const GET = withWorkspaceRole(["OWNER", "ADMIN"])(async (_req: NextRequest, ctx) => {
  const { workspaceId } = ctx;

  const integration = await prisma.integration.findFirst({
    where: { workspaceId, provider: "instagram" },
    select: {
      id: true,
      connected: true,
      connectedAt: true,
      credentials: true,
    },
  });

  const verifyToken = env.META_WEBHOOK_VERIFY_TOKEN;
  const appId = env.INSTAGRAM_APIKEY_CONNECT;
  const baseUrl = env.NEXT_PUBLIC_APP_URL || env.NEXTAUTH_URL || "https://flowchart.xyz";

  let subscriptionStatus: { active: boolean; fields?: string[]; error?: string } | null = null;

  if (integration?.connected && integration.credentials) {
    const creds = integration.credentials as Record<string, unknown>;
    if (creds.accessToken && typeof creds.accessToken === "string") {
      try {
        const token = decryptToken(creds.accessToken);
        if (token && !token.startsWith("enc:")) {
          const subRes = await metaFetch(`https://graph.instagram.com/me/subscribed_apps`, token);
          if (subRes.ok) {
            const subData = await subRes.json();
            const apps = Array.isArray(subData.data) ? subData.data : [];
            subscriptionStatus = {
              active: apps.length > 0,
              fields: apps[0]?.subscribed_fields ?? [],
            };
          } else {
            const errData = await subRes.json();
            subscriptionStatus = { active: false, error: errData.error?.message ?? "Unknown error" };
          }
        }
      } catch (err) {
        logger.warn("[IG STATUS] Error checking subscription", { error: String(err) });
        subscriptionStatus = { active: false, error: "Token check failed" };
      }
    }
  }

  const webhookConfig = {
    callbackUrl: `${baseUrl}/api/webhooks/meta`,
    verifyToken: verifyToken ?? null,
    verifyTokenHint: verifyToken
      ? ` Configurado. Úsalo exactamente así en Meta Developers: "${verifyToken}"`
      : " No configurado. Agrega META_WEBHOOK_VERIFY_TOKEN en Vercel > Settings > Environment Variables.",
    appId: appId ?? null,
    subscribedFields: ["messages", "messaging_postbacks", "comments", "mentions", "story_insights"],
  };

  return NextResponse.json({
    success: true,
    data: {
      integration: integration
        ? {
            id: integration.id,
            connected: integration.connected,
            connectedAt: integration.connectedAt,
            username: (integration.credentials as Record<string, unknown>)?.username,
            instagramUserId: (integration.credentials as Record<string, unknown>)?.instagramUserId,
          }
        : null,
      webhookConfig,
      subscriptionStatus,
    },
  });
});
