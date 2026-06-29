/**
 * GET /api/oauth/[provider]/start
 *
 * Generic OAuth start — reads config from the provider registry,
 * builds the authorization URL with HMAC-signed state, and redirects.
 *
 * Security: session required + OWNER/ADMIN of the active workspace.
 */

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createHmac } from "crypto";
import { getProvider } from "@/lib/integrations/registry";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getAppBaseUrl } from "@/lib/app-url";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const AUTH_SECRET = env.AUTH_SECRET || env.NEXTAUTH_SECRET;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  // 1. Authenticate
  const jwt = await getToken({ req: request, secret: AUTH_SECRET });
  if (!jwt?.sub) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2. Resolve provider from registry
  const config = getProvider(provider);
  if (!config) {
    return NextResponse.json(
      { error: `Unknown provider: ${provider}. Use the registry.` },
      { status: 400 }
    );
  }

  // 3. Validate env vars
  const clientIdEnvKey = config.clientIdEnv as keyof typeof env;
  const clientId = env[clientIdEnvKey] as string | undefined;
  if (!clientId) {
    return NextResponse.json(
      { error: `${config.clientIdEnv} not configured` },
      { status: 500 }
    );
  }

  if (!AUTH_SECRET) {
    return NextResponse.json(
      { error: "NEXTAUTH_SECRET/AUTH_SECRET not configured" },
      { status: 500 }
    );
  }

  // 4. Resolve workspace + RBAC
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) {
    return NextResponse.json(
      { error: "No active workspace" },
      { status: 400 }
    );
  }

  const hasAccess = await verifyWorkspaceAccess(workspaceId, jwt.sub, ["OWNER", "ADMIN"]);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Solo OWNER/ADMIN pueden conectar integraciones" },
      { status: 403 }
    );
  }

  // 5. Build HMAC-signed state
  const isPopup = request.nextUrl.searchParams.get("popup") === "1";
  const payload = JSON.stringify({
    provider,
    userId: jwt.sub,
    workspaceId,
    nonce: crypto.randomUUID(),
    popup: isPopup,
  });
  const sig = createHmac("sha256", AUTH_SECRET)
    .update(payload)
    .digest("hex");
  const encodedState = Buffer.from(JSON.stringify({ payload, sig })).toString("base64url");

  // 6. Build authorization URL
  const baseUrl = getAppBaseUrl(request.nextUrl.origin);
  const redirectUri = `${baseUrl}/api/oauth/${provider}/callback`;

  const authUrl = new URL(config.authUrl);
  // TikTok auth URL uses numeric App ID (appIdEnv), not the Client Key (clientIdEnv)
  const clientIdParam = config.clientIdParam ?? "client_id";
  const appIdEnvKey = config.appIdEnv as keyof typeof env | undefined;
  const authParamValue = (appIdEnvKey ? env[appIdEnvKey] as string : clientId) || clientId;
  authUrl.searchParams.set(clientIdParam, authParamValue);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", encodedState);
  // TikTok doesn't use response_type=code
  if (!config.skipResponseType) {
    authUrl.searchParams.set("response_type", "code");
  }

  if (config.scopes.length > 0) {
    const sep = config.scopeSeparator ?? " ";
    authUrl.searchParams.set("scope", config.scopes.join(sep));
  }

  // Extra params (e.g. access_type=offline for Google)
  if (config.extraAuthParams) {
    for (const [key, value] of Object.entries(config.extraAuthParams)) {
      authUrl.searchParams.set(key, value);
    }
  }

  logger.info(`[OAUTH] Redirecting to ${config.label} OAuth for workspace ${workspaceId}`);

  return NextResponse.redirect(authUrl.toString());
}
