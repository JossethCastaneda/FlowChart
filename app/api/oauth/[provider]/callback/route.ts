/**
 * GET /api/oauth/[provider]/callback
 *
 * Generic OAuth callback — validates state HMAC, exchanges code for tokens,
 * encrypts and stores in Integration. Redirects to integrations page.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { encryptToken } from "@/lib/encryption";
import { getProvider } from "@/lib/integrations/registry";
import { getAppBaseUrl } from "@/lib/app-url";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const AUTH_SECRET = env.AUTH_SECRET || env.NEXTAUTH_SECRET;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerParam } = await params;
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  const baseUrl = getAppBaseUrl(request.nextUrl.origin);
  const integrationsUrl = `${baseUrl}/dashboard/integrations`;
  // Helper: pick redirect URL based on popup mode (set after state decode)
   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  let getSuccessUrl: (p: string) => string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  let getErrorUrl: (e: string) => string;

  // User cancelled
  if (error) {
    logger.error(`[OAUTH CALLBACK] ${providerParam} error:`, error);
    return NextResponse.redirect(`${integrationsUrl}?connect_error=${error}`);
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${integrationsUrl}?connect_error=missing_params`);
  }

  // 1. Authenticate session
  const jwt = await getToken({ req: request as never, secret: AUTH_SECRET });
  if (!jwt?.sub) {
    return NextResponse.redirect(`${baseUrl}/login`);
  }

  if (!AUTH_SECRET) {
    return NextResponse.redirect(`${integrationsUrl}?connect_error=server_error`);
  }

  // State vars populated after HMAC validation
  let provider = "";
  let userId = "";
  let workspaceId = "";
  let isPopup = false;
  try {
    const parsed = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    const { payload, sig } = parsed;

    if (!payload || !sig) {
      return NextResponse.redirect(`${integrationsUrl}?connect_error=invalid_state`);
    }

    const expected = createHmac("sha256", AUTH_SECRET)
      .update(payload)
      .digest("hex");
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expected, "hex");

    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      logger.warn("[OAUTH CALLBACK]  HMAC signature mismatch");
      return NextResponse.redirect(`${integrationsUrl}?connect_error=invalid_state`);
    }

    const decoded = JSON.parse(payload);
    provider = decoded.provider;
    userId = decoded.userId;
    workspaceId = decoded.workspaceId || "";
    isPopup = !!decoded.popup;

    // Anti-replay: rechazar estados de más de 15 min (o sin timestamp = legacy).
    if (typeof decoded.ts !== "number" || Date.now() - decoded.ts > 15 * 60 * 1000) {
      logger.warn("[OAUTH CALLBACK]  State expirado o sin timestamp");
      return NextResponse.redirect(`${integrationsUrl}?connect_error=state_expired`);
    }

    if (userId !== jwt.sub) {
      logger.warn(`[OAUTH CALLBACK]  User mismatch — state: ${userId}, jwt: ${jwt.sub}`);
      return NextResponse.redirect(`${integrationsUrl}?connect_error=user_mismatch`);
    }

    if (provider !== providerParam) {
      logger.warn(`[OAUTH CALLBACK]  Provider mismatch — state: ${provider}, URL: ${providerParam}`);
      return NextResponse.redirect(`${integrationsUrl}?connect_error=provider_mismatch`);
    }
  } catch {
    return NextResponse.redirect(`${integrationsUrl}?connect_error=invalid_state`);
  }

  // SEGURIDAD: aunque el state está firmado con HMAC, la membresía pudo revocarse entre
  // el inicio del OAuth y este callback. Re-verificar que el usuario sigue siendo
  // OWNER/ADMIN del workspace ANTES de escribir la Integration (mismo criterio que el
  // resto de conexiones de activos).
  if (workspaceId) {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });
    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      logger.warn("[OAUTH CALLBACK]  Membership/role check failed", { workspaceId, userId });
      return NextResponse.redirect(`${integrationsUrl}?connect_error=forbidden`);
    }
  }

  // 3. Resolve provider config
  const config = getProvider(provider);
  if (!config) {
    return NextResponse.redirect(`${integrationsUrl}?connect_error=unknown_provider`);
  }

  const clientIdEnvKey = config.clientIdEnv as keyof typeof env;
  const clientSecretEnvKey = config.clientSecretEnv as keyof typeof env;
  const clientId = env[clientIdEnvKey] as string || "";
  const clientSecret = env[clientSecretEnvKey] as string || "";
  const redirectUri = `${baseUrl}/api/oauth/${provider}/callback`;

  try {
    // 4. Exchange code for tokens
    // TikTok uses JSON body with different param names; others use form-encoded
    const authCodeParam = config.authCodeParam ?? "code";
    const clientIdParam = config.clientIdParam ?? "client_id";

    let tokenRes: Response;
    if (config.tokenBodyFormat === "json") {
      // TikTok Marketing API token exchange format
      const jsonBody: Record<string, string> = {
        [authCodeParam]: code!,
        [clientIdParam]: clientId,
        secret: clientSecret,
      };
      tokenRes = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonBody),
      });
    } else {
      // Standard OAuth2 form-encoded
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        [authCodeParam]: code!,
        redirect_uri: redirectUri,
        [clientIdParam]: clientId,
        client_secret: clientSecret,
      });
      tokenRes = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
    }

    const tokenData = await tokenRes.json();

    // TikTok wraps the response in a `data` object; standard OAuth returns top-level
    const tokenPayload = tokenData?.data ?? tokenData;

    if (!tokenRes.ok || !tokenPayload.access_token) {
      logger.error(`[OAUTH CALLBACK] Token exchange failed for ${provider}:`, tokenData);
      return NextResponse.redirect(`${integrationsUrl}?connect_error=token_exchange_failed`);
    }

    const accessToken: string = tokenPayload.access_token;
    const refreshToken: string | undefined = tokenPayload.refresh_token;
    const expiresIn: number | undefined = tokenPayload.expires_in;

    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : undefined;

    // 5. Encrypt and store
    const credentials = {
      accessToken: encryptToken(accessToken),
      expiresAt: expiresAt ?? null,
      scopes: config.scopes,
      connectedAt: new Date().toISOString(),
      refreshToken: refreshToken ? encryptToken(refreshToken) : null,
    };

    await prisma.integration.upsert({
      where: {
        workspaceId_provider_userId: { workspaceId, provider, userId: "workspace" },
      },
      create: {
        workspaceId,
        provider,
        credentials,
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
      update: {
        credentials,
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
    });

    logger.info(`[OAUTH CALLBACK]  ${config.label} connected for workspace ${workspaceId}`);
    const successUrl = isPopup
      ? `${baseUrl}/connect/done?module=${provider}`
      : `${integrationsUrl}?connected=${provider}`;
    return NextResponse.redirect(successUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown";
    logger.error(`[OAUTH CALLBACK] Error for ${provider}:`, message);
    const errorUrl = isPopup
      ? `${baseUrl}/connect/done?module=${provider}&error=server_error`
      : `${integrationsUrl}?connect_error=server_error`;
    return NextResponse.redirect(errorUrl);
  }
}
