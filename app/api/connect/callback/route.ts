import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { encryptToken } from "@/lib/encryption";

const META_API_VERSION = process.env.META_API_VERSION || "v25.0";
const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

/**
 * GET /api/connect/callback
 * Facebook OAuth callback — exchanges code for token and saves to Integration table.
 * 
 * Query params from Facebook:
 *   - code: authorization code
 *   - state: base64url-encoded JSON { payload, sig } — HMAC-signed
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;

  // User cancelled or error
  if (error) {
    console.error("[CONNECT CALLBACK] Facebook error:", error);
    return NextResponse.redirect(`${baseUrl}/dashboard?connect_error=${error}`);
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${baseUrl}/dashboard?connect_error=missing_params`);
  }

  // ── SECURITY: Verify active session ──
  const jwt = await getToken({ req: request as any, secret: AUTH_SECRET });
  if (!jwt?.sub) {
    return NextResponse.redirect(`${baseUrl}/login`);
  }

  // ── SECURITY: Verify HMAC signature on state ──
  const secret = AUTH_SECRET;
  if (!secret) {
    console.error("[CONNECT CALLBACK] NEXTAUTH_SECRET/AUTH_SECRET not configured");
    return NextResponse.redirect(`${baseUrl}/dashboard?connect_error=server_error`);
  }

  let module = "unknown";
  let userId = "";
  let workspaceId = "";
  try {
    const parsed = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    const { payload, sig } = parsed;

    if (!payload || !sig) {
      return NextResponse.redirect(`${baseUrl}/dashboard?connect_error=invalid_state`);
    }

    const expected = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expected, "hex");

    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      console.warn("[CONNECT CALLBACK] ❌ HMAC signature mismatch — possible CSRF attack");
      return NextResponse.redirect(`${baseUrl}/dashboard?connect_error=invalid_state`);
    }

    const decoded = JSON.parse(payload);
    module = decoded.module;
    userId = decoded.userId;
    workspaceId = decoded.workspaceId || "";

    // Verify that the userId in the state matches the current JWT session
    if (userId !== jwt.sub) {
      console.warn(`[CONNECT CALLBACK] ❌ User mismatch — state userId: ${userId}, jwt.sub: ${jwt.sub}`);
      return NextResponse.redirect(`${baseUrl}/dashboard?connect_error=user_mismatch`);
    }
  } catch {
    return NextResponse.redirect(`${baseUrl}/dashboard?connect_error=invalid_state`);
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID || "";
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET || "";
  const redirectUri = `${baseUrl}/api/connect/callback`;

  try {
    // 1. Exchange code for short-lived token
    const tokenUrl = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", clientId);
    tokenUrl.searchParams.set("client_secret", clientSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[CONNECT CALLBACK] Token exchange failed:", tokenData);
      return NextResponse.redirect(`${baseUrl}/dashboard?connect_error=token_exchange_failed`);
    }

    let accessToken = tokenData.access_token;

    // 2. Exchange for long-lived token (~60 days)
    try {
      const llUrl = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`);
      llUrl.searchParams.set("grant_type", "fb_exchange_token");
      llUrl.searchParams.set("client_id", clientId);
      llUrl.searchParams.set("client_secret", clientSecret);
      llUrl.searchParams.set("fb_exchange_token", accessToken);

      const llRes = await fetch(llUrl.toString());
      const llData = await llRes.json();
      if (llRes.ok && llData.access_token) {
        accessToken = llData.access_token;
        console.log(`[CONNECT CALLBACK] Long-lived token obtained for module: ${module}`);
      }
    } catch (e) {
      console.warn("[CONNECT CALLBACK] Long-lived exchange failed, using short-lived:", e);
    }

    // 3. Fetch connected pages to store their IDs and tokens
    let pages: any[] = [];
    try {
      const pagesRes = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/me/accounts?fields=id,name,access_token,picture,instagram_business_account&limit=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const pagesData = await pagesRes.json();
      pages = (pagesData.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        accessToken: encryptToken(p.access_token),
        picture: p.picture?.data?.url || null,
        instagramId: p.instagram_business_account?.id || null,
      }));
    } catch (e) {
      console.warn("[CONNECT CALLBACK] Failed to fetch pages:", e);
    }

    // 4. Verify workspace membership using workspaceId from state
    let resolvedWorkspaceId = workspaceId;

    if (resolvedWorkspaceId) {
      // Verify that the user actually belongs to this workspace
      const member = await prisma.workspaceMember.findFirst({
        where: { userId, workspaceId: resolvedWorkspaceId, role: { in: ["OWNER", "ADMIN"] } },
      });
      if (!member) {
        console.warn(`[CONNECT CALLBACK] ❌ User ${userId} is not OWNER/ADMIN of workspace ${resolvedWorkspaceId}`);
        return NextResponse.redirect(`${baseUrl}/dashboard?connect_error=insufficient_role`);
      }
    } else {
      // Fallback: find user's first workspace
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId },
        orderBy: { workspace: { createdAt: "asc" } },
        select: { workspaceId: true },
      });
      if (!membership) {
        return NextResponse.redirect(`${baseUrl}/dashboard?connect_error=no_workspace`);
      }
      resolvedWorkspaceId = membership.workspaceId;
    }

    // 5. Store the token in the Integration table keyed by module
    const provider = `meta_${module}`; // e.g. "meta_social", "meta_analytics"
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    
    const encryptedAccessToken = encryptToken(accessToken);

    await prisma.integration.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: resolvedWorkspaceId,
          provider,
        },
      },
      update: {
        credentials: {
          accessToken: encryptedAccessToken,
          pages,
          expiresAt,
          refreshedAt: new Date().toISOString(),
          module,
        },
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
      create: {
        workspaceId: resolvedWorkspaceId,
        provider,
        credentials: {
          accessToken: encryptedAccessToken,
          pages,
          expiresAt,
          refreshedAt: new Date().toISOString(),
          module,
        },
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
    });

    // Also update the generic "meta" integration so all modules can use it as fallback
    await prisma.integration.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: resolvedWorkspaceId,
          provider: "meta",
        },
      },
      update: {
        credentials: {
          accessToken: encryptedAccessToken,
          pages,
          expiresAt,
          refreshedAt: new Date().toISOString(),
        },
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
      create: {
        workspaceId: resolvedWorkspaceId,
        provider: "meta",
        credentials: {
          accessToken: encryptedAccessToken,
          pages,
          expiresAt,
          refreshedAt: new Date().toISOString(),
        },
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
    });

    console.log(`[CONNECT CALLBACK] ✅ Module "${module}" connected with ${pages.length} pages`);

    // Always redirect to /connect/done — it handles popup close OR fallback navigation
    return NextResponse.redirect(`${baseUrl}/connect/done?module=${module}`);

  } catch (err: any) {
    console.error("[CONNECT CALLBACK] Error:", err);
    return NextResponse.redirect(`${baseUrl}/connect/done?module=&error=server_error`);
  }

}
