import { withWorkspaceRole } from "@/lib/api-handler";
import { apiError, apiServerError } from "@/lib/api-response";
import { env } from "@/lib/env";
import { createInstagramState } from "@/lib/integrations/instagram/state";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/integrations/instagram/connect
 * Initiates Instagram Direct Login OAuth flow.
 * Redirects to instagram.com/oauth/authorize with PKCE state.
 * Solo OWNER/ADMIN pueden conectar integraciones (paridad con Google/Meta).
 */
export const GET = withWorkspaceRole(["OWNER", "ADMIN"])(async (req: NextRequest, ctx) => {
  const appId = env.INSTAGRAM_APP_ID;
  const redirectUri = env.INSTAGRAM_REDIRECT_URI;
  const scopes = env.INSTAGRAM_SCOPES;

  if (!appId || !redirectUri) {
    logger.error("Instagram Direct Login not configured", { missing: !appId ? "INSTAGRAM_APP_ID" : "INSTAGRAM_REDIRECT_URI" });
    return apiError("Instagram Direct Login is not configured (missing env vars)", "SERVER_CONFIG", 500);
  }

  const state = createInstagramState(ctx.workspaceId, ctx.userId);

  const authUrl = new URL("https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("enable_fb_login", "0");
  authUrl.searchParams.set("force_authentication", "1");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
});
