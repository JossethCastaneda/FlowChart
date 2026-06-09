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

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerParam } = await params;
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
  const integrationsUrl = `${baseUrl}/dashboard/integrations`;

  // User cancelled
  if (error) {
    console.error(`[OAUTH CALLBACK] ${providerParam} error:`, error);
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

  // 2. Validate HMAC state
  let provider = "";
  let userId = "";
  let workspaceId = "";
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
      console.warn("[OAUTH CALLBACK] ❌ HMAC signature mismatch");
      return NextResponse.redirect(`${integrationsUrl}?connect_error=invalid_state`);
    }

    const decoded = JSON.parse(payload);
    provider = decoded.provider;
    userId = decoded.userId;
    workspaceId = decoded.workspaceId || "";

    if (userId !== jwt.sub) {
      console.warn(`[OAUTH CALLBACK] ❌ User mismatch — state: ${userId}, jwt: ${jwt.sub}`);
      return NextResponse.redirect(`${integrationsUrl}?connect_error=user_mismatch`);
    }

    if (provider !== providerParam) {
      console.warn(`[OAUTH CALLBACK] ❌ Provider mismatch — state: ${provider}, URL: ${providerParam}`);
      return NextResponse.redirect(`${integrationsUrl}?connect_error=provider_mismatch`);
    }
  } catch {
    return NextResponse.redirect(`${integrationsUrl}?connect_error=invalid_state`);
  }

  // 3. Resolve provider config
  const config = getProvider(provider);
  if (!config) {
    return NextResponse.redirect(`${integrationsUrl}?connect_error=unknown_provider`);
  }

  const clientId = process.env[config.clientIdEnv] || "";
  const clientSecret = process.env[config.clientSecretEnv] || "";
  const redirectUri = `${baseUrl}/api/oauth/${provider}/callback`;

  try {
    // 4. Exchange code for tokens
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const tokenRes = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error(`[OAUTH CALLBACK] Token exchange failed for ${provider}:`, tokenData);
      return NextResponse.redirect(`${integrationsUrl}?connect_error=token_exchange_failed`);
    }

    const accessToken: string = tokenData.access_token;
    const refreshToken: string | undefined = tokenData.refresh_token;
    const expiresIn: number | undefined = tokenData.expires_in;

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
        workspaceId_provider: { workspaceId, provider },
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

    console.log(`[OAUTH CALLBACK] ✅ ${config.label} connected for workspace ${workspaceId}`);
    return NextResponse.redirect(`${integrationsUrl}?connected=${provider}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error(`[OAUTH CALLBACK] Error for ${provider}:`, message);
    return NextResponse.redirect(`${integrationsUrl}?connect_error=server_error`);
  }
}
