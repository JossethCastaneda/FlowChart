import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { parseInstagramState } from "@/lib/integrations/instagram/state";
import { encryptToken } from "@/lib/encryption";
import { safeGetSession } from "@/lib/api-handler";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { logger } from "@/lib/logger";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

const FRONTEND_URL = env.NEXT_PUBLIC_APP_URL || "https://zefirus.xyz";
const redirect = (error?: string) =>
  NextResponse.redirect(`${FRONTEND_URL}/connect/done?module=instagram${error ? `&error=${error}` : ""}`);

/**
 * GET /api/integrations/instagram/callback
 * OAuth callback from Instagram. Exchanges the auth code for a long-lived token
 * and persists it encrypted to the workspace's integration record.
 *
 * NOTE: This endpoint cannot use `withWorkspace` because it is an OAuth redirect —
 * the session is validated against the PKCE state token rather than the cookie path.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const stateToken = searchParams.get("state");
    const errorParam = searchParams.get("error");
    const errorReason = searchParams.get("error_reason");
    const errorDescription = searchParams.get("error_description");

    if (errorParam) {
      logger.warn("Instagram OAuth error from Meta", { error: errorParam, reason: errorReason, description: errorDescription });
      return redirect("instagram_auth_failed");
    }

    if (!code || !stateToken) return redirect("missing_params");

    const state = parseInstagramState(stateToken);
    if (!state) return redirect("invalid_state");

    // Verify the current session matches the user who initiated the OAuth flow
    const session = await safeGetSession();
    if (!session?.user?.id || session.user.id !== state.userId) {
      logger.warn("Instagram callback session mismatch", {
        sessionUserId: session?.user?.id,
        stateUserId: state.userId,
      });
      return redirect("unauthorized");
    }

    // Re-verifica RBAC como los callbacks de Google/Meta: solo OWNER/ADMIN
    // pueden completar la conexión (el rol pudo cambiar desde que inició el flujo).
    const hasAccess = await verifyWorkspaceAccess(state.workspaceId, state.userId, ["OWNER", "ADMIN"]);
    if (!hasAccess) {
      logger.warn("Instagram callback: usuario sin rol OWNER/ADMIN", {
        workspaceId: state.workspaceId,
        userId: state.userId,
      });
      return redirect("insufficient_role");
    }

    const appId = env.INSTAGRAM_APP_ID;
    const appSecret = env.INSTAGRAM_APP_SECRET;
    const redirectUri = env.INSTAGRAM_REDIRECT_URI;
    const tokenUrl = env.INSTAGRAM_TOKEN_URL || "https://api.instagram.com/oauth/access_token";

    if (!appId || !appSecret || !redirectUri) {
      logger.error("Instagram callback missing env vars", {
        appId: !!appId,
        appSecret: !!appSecret,
        redirectUri: !!redirectUri,
      });
      return redirect("server_config_error");
    }

    // 1. Exchange code for short-lived token
    const formBody = new FormData();
    formBody.append("client_id", appId);
    formBody.append("client_secret", appSecret);
    formBody.append("grant_type", "authorization_code");
    formBody.append("redirect_uri", redirectUri);
    formBody.append("code", code);

    const tokenRes = await fetch(tokenUrl, { method: "POST", body: formBody });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => "unknown");
      logger.error("Instagram token exchange failed", { status: tokenRes.status, error: errText });
      return redirect("token_exchange_failed");
    }

    const tokenData = await tokenRes.json();
    const shortLivedToken = tokenData.access_token;
    const instagramUserId = tokenData.user_id;

    if (!shortLivedToken) {
      logger.error("Instagram token exchange returned no access_token");
      return redirect("token_exchange_failed");
    }

    // 2. Exchange short-lived token for long-lived token
    const longLivedUrl = new URL("https://graph.instagram.com/access_token");
    longLivedUrl.searchParams.set("grant_type", "ig_exchange_token");
    longLivedUrl.searchParams.set("client_secret", appSecret);
    longLivedUrl.searchParams.set("access_token", shortLivedToken);

    const longLivedRes = await fetch(longLivedUrl.toString());
    let finalToken = shortLivedToken;
    let expiresAt: string | null = null;

    if (longLivedRes.ok) {
      const longLivedData = await longLivedRes.json();
      finalToken = longLivedData.access_token || finalToken;
      if (longLivedData.expires_in) {
        expiresAt = new Date(Date.now() + longLivedData.expires_in * 1000).toISOString();
      }
    } else {
      logger.warn("Instagram: failed to get long-lived token, using short-lived fallback", {
        workspaceId: state.workspaceId,
      });
    }

    // 3. Persist encrypted token to the workspace integration record
    const credentials = {
      accessToken: encryptToken(finalToken),
      expiresAt,
      instagramUserId,
      scopes: env.INSTAGRAM_SCOPES?.split(",") ?? [],
    } satisfies Record<string, unknown>;

    await prisma.integration.upsert({
      where: {
        workspaceId_provider_userId: {
          workspaceId: state.workspaceId,
          provider: "instagram",
          userId: "workspace",
        },
      },
      create: {
        workspaceId: state.workspaceId,
        provider: "instagram",
        userId: "workspace",
        connected: true,
        connectedAt: new Date(),
        connectedBy: state.userId,
        credentials: credentials as Prisma.InputJsonValue,
        config: { instagramUserId } as Prisma.InputJsonValue,
      },
      update: {
        connected: true,
        connectedAt: new Date(),
        connectedBy: state.userId,
        credentials: credentials as Prisma.InputJsonValue,
        config: { instagramUserId } as Prisma.InputJsonValue,
      },
    });

    logger.info("Instagram integration connected", {
      workspaceId: state.workspaceId,
      userId: state.userId,
      expiresAt,
    });

    return redirect();
  } catch (error) {
    logger.error("Instagram callback unexpected error", { error });
    return redirect("internal_error");
  }
}
