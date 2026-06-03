import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";

const META_VERSION = process.env.NEXT_PUBLIC_FB_API_VERSION || "v22.0";

/**
 * POST /api/meta/refresh-token
 *
 * Refreshes the Meta long-lived token before it expires (60-day lifecycle).
 * Should be called periodically (e.g., every 50 days) or when a 401 is detected.
 *
 * Long-lived tokens can be refreshed by exchanging them again, producing
 * a new 60-day token. Tokens that are expired cannot be refreshed.
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

    // Get current integration
    const integration = await prisma.integration.findUnique({
      where: {
        workspaceId_provider: { workspaceId, provider: "meta" },
      },
    });

    if (!integration?.connected || !integration.credentials) {
      return NextResponse.json(
        { error: "No hay integración de Meta conectada" },
        { status: 400 }
      );
    }

    const creds = integration.credentials as any;
    const currentToken = creds?.accessToken;
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

      // If token is expired, mark integration as disconnected
      if (exchangeData?.error?.code === 190) {
        await prisma.integration.update({
          where: { workspaceId_provider: { workspaceId, provider: "meta" } },
          data: { connected: false },
        });
        return NextResponse.json(
          { error: "Token expirado. Reconecta tu cuenta de Meta.", expired: true },
          { status: 401 }
        );
      }

      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    // Update the Integration with the new token
    const expiresIn = exchangeData.expires_in || 5184000; // default 60 days
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await prisma.integration.update({
      where: { workspaceId_provider: { workspaceId, provider: "meta" } },
      data: {
        credentials: {
          accessToken: exchangeData.access_token,
          expiresAt: expiresAt.toISOString(),
          refreshedAt: new Date().toISOString(),
        },
        connectedAt: new Date(),
      },
    });

    console.log(`[META REFRESH] Token refreshed for workspace ${workspaceId}, expires: ${expiresAt.toISOString()}`);

    return NextResponse.json({
      success: true,
      expiresAt: expiresAt.toISOString(),
      expiresInDays: Math.floor(expiresIn / 86400),
    });
  } catch (err: any) {
    console.error("[META REFRESH] Error:", err);
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}
