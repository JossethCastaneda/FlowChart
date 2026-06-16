import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import prisma from "@/lib/prisma";
import { encryptToken } from "@/lib/encryption";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { env } from "@/lib/env";

const AUTH_SECRET = env.AUTH_SECRET || env.NEXTAUTH_SECRET;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("[OAUTH GOOGLE] Error from Google:", error);
    return NextResponse.redirect(new URL("/dashboard/integrations?error=google_auth_failed", request.url));
  }

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  if (!AUTH_SECRET) {
    return NextResponse.json({ error: "AUTH_SECRET not configured" }, { status: 500 });
  }

  // 1. Verify state HMAC
  let payloadObj: { provider: string; userId: string; workspaceId: string; nonce: string; moduleIds: string[] };
  try {
    const decodedState = Buffer.from(state, "base64url").toString("utf8");
    const { payload, sig } = JSON.parse(decodedState);
    const expectedSig = createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
    
    if (sig !== expectedSig) {
      throw new Error("Invalid HMAC signature");
    }
    
    payloadObj = JSON.parse(payload);
    if (payloadObj.provider !== "google") {
      throw new Error("Invalid provider in state");
    }
  } catch (err) {
    console.error("[OAUTH GOOGLE] State validation failed:", err);
    return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 });
  }

  const { workspaceId, userId, moduleIds } = payloadObj;

  // 2. Validate RBAC again
  const hasAccess = await verifyWorkspaceAccess(workspaceId, userId, ["OWNER", "ADMIN"]);
  if (!hasAccess) {
    return NextResponse.json({ error: "Solo OWNER/ADMIN pueden conectar integraciones" }, { status: 403 });
  }

  // 3. Exchange code for tokens
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  let baseUrl = env.NEXTAUTH_URL || request.nextUrl.origin;
  baseUrl = baseUrl.replace(/\/$/, "");
  const redirectUri = `${baseUrl}/api/oauth/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Google client credentials not configured" }, { status: 500 });
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("[OAUTH GOOGLE] Token exchange failed:", tokenData);
      return NextResponse.redirect(new URL("/dashboard/integrations?error=google_token_exchange", request.url));
    }

    // 4. Save to database
    // Fetch existing integration to preserve non-overlapping fields (like resources)
    const existing = await prisma.integration.findUnique({
      where: { workspaceId_provider_userId: { workspaceId, provider: "google", userId: "workspace" } },
    });
    const existingCreds = existing?.credentials as Record<string, any> || {};

    const grantedScopes = tokenData.scope ? tokenData.scope.split(" ") : [];
    
    // We update access_token always, but refresh_token is only returned on the first auth
    // or if we forced prompt=consent. If not present, we keep the old one.
    const newRefreshToken = tokenData.refresh_token 
      ? encryptToken(tokenData.refresh_token) 
      : existingCreds.refreshToken;
      
    const newAccessToken = encryptToken(tokenData.access_token);

    const credentials = {
      ...existingCreds,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      grantedScopes,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      // Record which modules the user attempted to connect during this flow
      lastRequestedModules: moduleIds,
    };

    await prisma.integration.upsert({
      where: { workspaceId_provider_userId: { workspaceId, provider: "google", userId: "workspace" } },
      update: {
        credentials,
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
      create: {
        workspaceId,
        provider: "google",
        credentials,
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
    });

    console.log(`[OAUTH GOOGLE] Successfully connected Google for workspace ${workspaceId}`);
    return NextResponse.redirect(new URL(`/dashboard/integrations?success=google_connected`, request.url));

  } catch (err: any) {
    console.error("[OAUTH GOOGLE] Unexpected error:", err);
    return NextResponse.redirect(new URL("/dashboard/integrations?error=google_internal_error", request.url));
  }
}
