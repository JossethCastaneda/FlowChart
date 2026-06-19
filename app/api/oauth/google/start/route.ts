import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createHmac } from "crypto";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { GOOGLE_BASE_SCOPES, scopesForModules } from "@/lib/integrations/google/registry";
import { getAppBaseUrl } from "@/lib/app-url";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const AUTH_SECRET = env.AUTH_SECRET || env.NEXTAUTH_SECRET;

export async function GET(request: NextRequest) {
  // 1. Authenticate
  const jwt = await getToken({ req: request, secret: AUTH_SECRET });
  if (!jwt?.sub) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2. Resolve modules from query string
  const { searchParams } = new URL(request.url);
  const modulesParam = searchParams.get("modules");
  if (!modulesParam) {
    return NextResponse.json({ error: "No modules specified" }, { status: 400 });
  }
  const moduleIds = modulesParam.split(",").map(s => s.trim()).filter(Boolean);

  // 3. Resolve scopes based on requested modules + base scopes
  const requiredScopes = scopesForModules(moduleIds);
  const allScopes = Array.from(new Set([...GOOGLE_BASE_SCOPES, ...requiredScopes]));

  // 4. Validate env vars
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID not configured" }, { status: 500 });
  }
  if (!AUTH_SECRET) {
    return NextResponse.json({ error: "AUTH_SECRET not configured" }, { status: 500 });
  }

  // 5. Resolve workspace + RBAC
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) {
    return NextResponse.json({ error: "No active workspace" }, { status: 400 });
  }

  const hasAccess = await verifyWorkspaceAccess(workspaceId, jwt.sub, ["OWNER", "ADMIN"]);
  if (!hasAccess) {
    return NextResponse.json({ error: "Solo OWNER/ADMIN pueden conectar integraciones" }, { status: 403 });
  }

  // 6. Build HMAC-signed state
  const payload = JSON.stringify({
    provider: "google",
    userId: jwt.sub,
    workspaceId,
    nonce: crypto.randomUUID(),
    moduleIds, // Save requested modules to know what to mark as connected later
  });
  const sig = createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
  const encodedState = Buffer.from(JSON.stringify({ payload, sig })).toString("base64url");

  // 7. Build authorization URL
  const baseUrl = getAppBaseUrl(request.nextUrl.origin);
  const redirectUri = `${baseUrl}/api/oauth/google/callback`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", encodedState);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", allScopes.join(" "));
  
  // Incremental OAuth requirements for Google
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("include_granted_scopes", "true");

  logger.info(`[OAUTH GOOGLE] Redirecting to Google OAuth for workspace ${workspaceId} with scopes:`, allScopes);

  return NextResponse.redirect(authUrl.toString());
}
