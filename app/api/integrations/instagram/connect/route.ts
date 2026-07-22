import { withWorkspaceRole } from "@/lib/api-handler";
import { apiError } from "@/lib/api-response";
import { env } from "@/lib/env";
import { createInstagramState } from "@/lib/integrations/instagram/state";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/integrations/instagram/connect
 * Initiates Instagram Direct Login OAuth flow.
 * Redirects to instagram.com/oauth/authorize.
 * El redirect_uri se construye dinámicamente (igual que Google/Meta)
 * para no depender de INSTAGRAM_REDIRECT_URI en el entorno.
 * Solo OWNER/ADMIN pueden conectar integraciones (paridad con Google/Meta).
 */
export const GET = withWorkspaceRole(["OWNER", "ADMIN"])(async (req: NextRequest, ctx) => {
  const appId = env.INSTAGRAM_APP_ID;

  if (!appId) {
    logger.error("Instagram Direct Login not configured", { missing: "INSTAGRAM_APP_ID" });
    return apiError("Instagram Direct Login is not configured (missing INSTAGRAM_APP_ID)", "SERVER_CONFIG", 500);
  }

  // Construir redirect_uri dinámicamente desde la URL base de la app
  let baseUrl = env.NEXT_PUBLIC_APP_URL || env.NEXTAUTH_URL || req.nextUrl.origin;
  baseUrl = baseUrl.replace(/\/$/, "");
  const redirectUri = `${baseUrl}/api/integrations/instagram/callback`;

  const scopes = env.INSTAGRAM_SCOPES;
  const state = createInstagramState(ctx.workspaceId, ctx.userId);

  const authUrl = new URL("https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("enable_fb_login", "0");
  authUrl.searchParams.set("force_authentication", "1");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("state", state);

  logger.info("Redirecting to Instagram OAuth", {
    route: "api/integrations/instagram/connect",
    workspaceId: ctx.workspaceId,
    redirectUri,
  });

  return NextResponse.redirect(authUrl.toString());
});
