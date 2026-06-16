import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { parseInstagramState } from "@/lib/integrations/instagram/state";
import prisma from "@/lib/prisma";
import { encryptToken } from "@/lib/encryption";
import { safeGetSession } from "@/lib/api-handler";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const stateToken = searchParams.get("state");
    const error = searchParams.get("error");
    const errorReason = searchParams.get("error_reason");
    const errorDescription = searchParams.get("error_description");

    const frontendUrl = env.NEXT_PUBLIC_APP_URL || "https://sodare.xyz";

    if (error) {
      console.error("[INSTAGRAM CALLBACK] Error from Meta:", error, errorReason, errorDescription);
      return NextResponse.redirect(`${frontendUrl}/connect/done?module=instagram&error=instagram_auth_failed`);
    }

    if (!code || !stateToken) {
      return NextResponse.redirect(`${frontendUrl}/connect/done?module=instagram&error=missing_params`);
    }

    const state = parseInstagramState(stateToken);
    if (!state) {
      return NextResponse.redirect(`${frontendUrl}/connect/done?module=instagram&error=invalid_state`);
    }

    // Verify session matches state
    const session = await safeGetSession();
    if (!session?.user?.id || session.user.id !== state.userId) {
      return NextResponse.redirect(`${frontendUrl}/connect/done?module=instagram&error=unauthorized`);
    }

    const appId = env.INSTAGRAM_APP_ID;
    const appSecret = env.INSTAGRAM_APP_SECRET;
    const redirectUri = env.INSTAGRAM_REDIRECT_URI;
    const tokenUrl = env.INSTAGRAM_TOKEN_URL || "https://api.instagram.com/oauth/access_token";

    if (!appId || !appSecret || !redirectUri) {
      console.error("[INSTAGRAM CALLBACK] Missing env vars");
      return NextResponse.redirect(`${frontendUrl}/connect/done?module=instagram&error=server_config_error`);
    }

    // 1. Exchange code for short-lived token
    const body = new FormData();
    body.append("client_id", appId);
    body.append("client_secret", appSecret);
    body.append("grant_type", "authorization_code");
    body.append("redirect_uri", redirectUri);
    body.append("code", code);

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      body,
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => "unknown");
      console.error("[INSTAGRAM CALLBACK] Token exchange failed:", tokenRes.status, errText);
      return NextResponse.redirect(`${frontendUrl}/connect/done?module=instagram&error=token_exchange_failed`);
    }

    const tokenData = await tokenRes.json();
    const shortLivedToken = tokenData.access_token;
    const instagramUserId = tokenData.user_id;

    if (!shortLivedToken) {
      throw new Error("No access_token returned from Instagram");
    }

    // 2. Exchange short-lived token for long-lived token
    const longLivedUrl = new URL("https://graph.instagram.com/access_token");
    longLivedUrl.searchParams.set("grant_type", "ig_exchange_token");
    longLivedUrl.searchParams.set("client_secret", appSecret);
    longLivedUrl.searchParams.set("access_token", shortLivedToken);

    const longLivedRes = await fetch(longLivedUrl.toString());
    
    let finalToken = shortLivedToken;
    let expiresAt = null;

    if (longLivedRes.ok) {
      const longLivedData = await longLivedRes.json();
      finalToken = longLivedData.access_token || finalToken;
      if (longLivedData.expires_in) {
        expiresAt = new Date(Date.now() + longLivedData.expires_in * 1000).toISOString();
      }
    } else {
      console.warn("[INSTAGRAM CALLBACK] Failed to get long-lived token, falling back to short-lived", await longLivedRes.text());
    }

    // 3. Save to database
    await prisma.integration.upsert({
      where: {
        workspaceId_provider_userId: {
          workspaceId: state.workspaceId,
          provider: "instagram",
          userId: "workspace", // Shared integration for the workspace
        },
      },
      create: {
        workspaceId: state.workspaceId,
        provider: "instagram",
        userId: "workspace",
        connected: true,
        connectedAt: new Date(),
        credentials: {
          accessToken: encryptToken(finalToken),
          expiresAt,
          instagramUserId, // Useful for future API calls
          scopes: env.INSTAGRAM_SCOPES.split(","),
        },
        config: {
          instagramUserId,
        }
      },
      update: {
        connected: true,
        connectedAt: new Date(),
        credentials: {
          accessToken: encryptToken(finalToken),
          expiresAt,
          instagramUserId,
          scopes: env.INSTAGRAM_SCOPES.split(","),
        },
        config: {
          instagramUserId,
        }
      },
    });

    return NextResponse.redirect(`${frontendUrl}/connect/done?module=instagram`);
  } catch (error) {
    console.error("[INSTAGRAM CALLBACK]", error);
    const frontendUrl = env.NEXT_PUBLIC_APP_URL || "https://sodare.xyz";
    return NextResponse.redirect(`${frontendUrl}/connect/done?module=instagram&error=internal_error`);
  }
}
