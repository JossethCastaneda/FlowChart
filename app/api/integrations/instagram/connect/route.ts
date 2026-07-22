import { withWorkspaceRole } from "@/lib/api-handler";
import { apiError } from "@/lib/api-response";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const NEXTAUTH_SECRET = env.NEXTAUTH_SECRET || env.AUTH_SECRET;

/**
 * GET /api/integrations/instagram/connect
 * Initiates Instagram Direct Login (Business Login) OAuth flow.
 *
 * - redirect_uri usa /api/connect/callback (URI registrada en el panel de Meta para la app IG)
 * - State usa el mismo formato HMAC que el callback existente, con module="instagram"
 *   para que el callback detecte que debe usar INSTAGRAM_APP_ID/SECRET
 *
 * Ref: https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login
 */
export const GET = withWorkspaceRole(["OWNER", "ADMIN"])(async (req: NextRequest, ctx) => {
  const appId = env.INSTAGRAM_APP_ID;

  if (!appId) {
    logger.error("Instagram Business Login not configured", { missing: "INSTAGRAM_APP_ID" });
    return apiError("Instagram Business Login is not configured (missing INSTAGRAM_APP_ID)", "SERVER_CONFIG", 500);
  }

  if (!NEXTAUTH_SECRET) {
    return apiError("NEXTAUTH_SECRET not configured", "SERVER_CONFIG", 500);
  }

  // CRÍTICO: redirect_uri debe coincidir exactamente con lo registrado en Meta Developers.
  // La URL de inserción del panel de Meta muestra: /api/connect/callback
  let baseUrl = env.NEXT_PUBLIC_APP_URL || env.NEXTAUTH_URL || req.nextUrl.origin;
  baseUrl = baseUrl.replace(/\/$/, "");
  const redirectUri = `${baseUrl}/api/connect/callback`;

  // State en formato HMAC compatible con /api/connect/callback
  // module="instagram" → el callback usará INSTAGRAM_APP_ID/SECRET en vez de META_APP_ID/SECRET
  const payload = JSON.stringify({
    module: "instagram",
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
    nonce: crypto.randomUUID(),
    ts: Date.now(),
  });
  const sig = createHmac("sha256", NEXTAUTH_SECRET)
    .update(payload)
    .digest("hex");
  const state = Buffer.from(JSON.stringify({ payload, sig })).toString("base64url");

  const scopes = env.INSTAGRAM_SCOPES;

  // URL de autorización según Instagram Platform Business Login docs
  const authUrl = new URL("https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("force_reauth", "true");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("state", state);

  logger.info("Redirecting to Instagram Business Login", {
    route: "api/integrations/instagram/connect",
    workspaceId: ctx.workspaceId,
    redirectUri,
  });

  return NextResponse.redirect(authUrl.toString());
});
