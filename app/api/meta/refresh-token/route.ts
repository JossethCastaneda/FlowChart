import { META_API_VERSION } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { encryptToken, decryptToken } from "@/lib/encryption";

const META_VERSION = META_API_VERSION;

/**
 * POST /api/meta/refresh-token
 *
 * Refreshes the Meta long-lived token before it expires (60-day lifecycle).
 * Updates the generic "meta" integration AND all module-specific integrations
 * (meta_ads, meta_analytics, meta_social, meta_community, meta_publisher_facebook, meta_publisher_instagram).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    // Get current integration — prefer generic "meta", fallback to any meta_* module
    const allIntegrations = await prisma.integration.findMany({
      where: {
        workspaceId,
        provider: { startsWith: "meta" },
        connected: true,
      },
    });

    if (allIntegrations.length === 0) {
      return NextResponse.json(
        { error: "No hay integración de Meta conectada" },
        { status: 400 }
      );
    }

    // Pick the best available token to exchange
    const genericMeta = allIntegrations.find(i => i.provider === "meta");
    const anyMeta = allIntegrations[0];
    const integration = genericMeta || anyMeta;
    const creds = integration.credentials as any;
    const currentToken = decryptToken(creds?.accessToken);

    if (!currentToken) {
      return NextResponse.json(
        { error: "No se encontró token de Meta" },
        { status: 400 }
      );
    }

    // Exchange current long-lived token for a new one
    const exchangeUrl = new URL(`https://graph.facebook.com/${META_VERSION}/oauth/access_token`);
    exchangeUrl.searchParams.set("grant_type", "fb_exchange_token");
    exchangeUrl.searchParams.set("client_id", process.env.FACEBOOK_CLIENT_ID || "");
    exchangeUrl.searchParams.set("client_secret", process.env.FACEBOOK_CLIENT_SECRET || "");
    exchangeUrl.searchParams.set("fb_exchange_token", currentToken);

    const exchangeRes = await fetch(exchangeUrl.toString());
    const exchangeData = await exchangeRes.json();

    if (!exchangeRes.ok || !exchangeData.access_token) {
      const errorMsg = exchangeData?.error?.message || "Error al refrescar token";
      console.error("[META REFRESH] Failed:", errorMsg);

      if (exchangeData?.error?.code === 190) {
        // Mark ALL meta integrations as disconnected
        await prisma.integration.updateMany({
          where: { workspaceId, provider: { startsWith: "meta" } },
          data: { connected: false },
        });
        return NextResponse.json(
          { error: "Token expirado. Reconecta tu cuenta de Meta.", expired: true },
          { status: 401 }
        );
      }

      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const newToken = exchangeData.access_token;
    const expiresIn = exchangeData.expires_in || 5184000; // default 60 days
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const refreshedAt = new Date().toISOString();

    // Update ALL connected meta_* integrations with the new token
    const updatePromises = allIntegrations.map(intg => {
      const existingCreds = (intg.credentials as any) || {};
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

    console.log(`[META REFRESH] Token refreshed for workspace ${workspaceId} — ${allIntegrations.length} integrations updated, expires: ${expiresAt.toISOString()}`);

    return NextResponse.json({
      success: true,
      expiresAt: expiresAt.toISOString(),
      expiresInDays: Math.floor(expiresIn / 86400),
      integrationsUpdated: allIntegrations.length,
    });
  } catch (err: any) {
    console.error("[META REFRESH] Error:", err);
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}
