import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { encryptToken } from "@/lib/encryption";
import { validateModulePermissions } from "@/lib/meta-scopes";
import { env } from "@/lib/env";

const META_API_VERSION = env.META_API_VERSION || "v25.0";
const NEXTAUTH_SECRET = env.NEXTAUTH_SECRET || env.AUTH_SECRET;

/**
 * GET /api/connect/callback
 * Facebook OAuth callback — exchanges code for token and saves to Integration table.
 * 
 * Query params from Facebook:
 *   - code: authorization code
 *   - state: base64url-encoded JSON { payload, sig } — HMAC-signed
 * 
 * FIX: Properly separate user access token vs page access token
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  let baseUrl = env.NEXT_PUBLIC_APP_URL || env.NEXTAUTH_URL || request.nextUrl.origin;
  baseUrl = baseUrl.replace(/\/$/, "");

  // User cancelled or error
  if (error) {
    console.error("[CONNECT CALLBACK] Facebook error:", error);
    return NextResponse.redirect(`${baseUrl}/connect/done?error=${error}`);
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${baseUrl}/connect/done?error=missing_params`);
  }

  // ── SECURITY: Verify active session ──
  const jwt = await getToken({ req: request as any, secret: NEXTAUTH_SECRET });
  if (!jwt?.sub) {
    return NextResponse.redirect(`${baseUrl}/connect/done?error=not_authenticated`);
  }

  // ── SECURITY: Verify HMAC signature on state ──
  if (!NEXTAUTH_SECRET) {
    console.error("[CONNECT CALLBACK] NEXTAUTH_SECRET/AUTH_SECRET not configured");
    return NextResponse.redirect(`${baseUrl}/connect/done?error=server_error_auth_secret`);
  }

  let module = "unknown";
  let userId = "";
  let workspaceId = "";
  try {
    const parsed = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    const { payload, sig } = parsed;

    if (!payload || !sig) {
      return NextResponse.redirect(`${baseUrl}/connect/done?error=invalid_state`);
    }

    const expected = createHmac("sha256", NEXTAUTH_SECRET)
      .update(payload)
      .digest("hex");
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expected, "hex");

    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      console.warn("[CONNECT CALLBACK] ❌ HMAC signature mismatch — possible CSRF attack");
      return NextResponse.redirect(`${baseUrl}/connect/done?error=invalid_state`);
    }

    const decoded = JSON.parse(payload);
    module = decoded.module;
    userId = decoded.userId;
    workspaceId = decoded.workspaceId || "";

    // Verify that the userId in the state matches the current JWT session
    if (userId !== jwt.sub) {
      console.warn(`[CONNECT CALLBACK] ❌ User mismatch — state userId: ${userId}, jwt.sub: ${jwt.sub}`);
      return NextResponse.redirect(`${baseUrl}/connect/done?error=user_mismatch`);
    }
  } catch {
    return NextResponse.redirect(`${baseUrl}/connect/done?error=invalid_state`);
  }

  const clientId = env.FACEBOOK_CLIENT_ID || "";
  const clientSecret = env.FACEBOOK_CLIENT_SECRET || "";
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
      return NextResponse.redirect(`${baseUrl}/connect/done?error=token_exchange_failed&details=${encodeURIComponent(tokenData.error?.message || "Unknown error")}`);
    }

    let userAccessToken = tokenData.access_token;

    // 2. Exchange for long-lived token (~60 days)
    try {
      const llUrl = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`);
      llUrl.searchParams.set("grant_type", "fb_exchange_token");
      llUrl.searchParams.set("client_id", clientId);
      llUrl.searchParams.set("client_secret", clientSecret);
      llUrl.searchParams.set("fb_exchange_token", userAccessToken);

      const llRes = await fetch(llUrl.toString());
      const llData = await llRes.json();
      if (llRes.ok && llData.access_token) {
        userAccessToken = llData.access_token;
        console.log(`[CONNECT CALLBACK] Long-lived user token obtained for module: ${module}`);
      }
    } catch (e) {
      console.warn("[CONNECT CALLBACK] Long-lived exchange failed, using short-lived:", e);
    }

    // FIX: Use USER access token to fetch pages, then validate
    // CRITICAL: Do NOT use page tokens for Graph API calls
    let pages: Array<{
      id: string;
      name: string;
      accessToken: string; // Page token (encrypted)
      picture?: string | null;
      instagramId?: string | null;
    }> = [];
    
    let userScopes: string[] = [];
    
    try {
      // 3a. Validate user permissions first
      const permissionsRes = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/me/permissions`,
        { headers: { Authorization: `Bearer ${userAccessToken}` } }
      );
      const permissionsData = await permissionsRes.json();
      
      if (permissionsRes.ok && permissionsData.data) {
        userScopes = permissionsData.data
          .filter((p: any) => p.status === "granted")
          .map((p: any) => p.permission);
        
        // FIX: Validate permissions match module requirements
        const validation = validateModulePermissions(module, userScopes);
        if (!validation.valid) {
          console.warn(`[CONNECT CALLBACK] ⚠️ Missing scopes for ${module}:`, validation.missing);
          // Don't fail yet — proceed but log warning
        }
      }

      // 3b. Fetch connected pages using USER token
      const pagesRes = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/me/accounts?fields=id,name,access_token,picture,instagram_business_account&limit=100`,
        { headers: { Authorization: `Bearer ${userAccessToken}` } }
      );
      const pagesData = await pagesRes.json();
      
      if (pagesRes.ok && pagesData.data) {
        pages = pagesData.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          accessToken: encryptToken(p.access_token), // Encrypt PAGE token for storage
          picture: p.picture?.data?.url || null,
          instagramId: p.instagram_business_account?.id || null,
        }));
        console.log(`[CONNECT CALLBACK] Fetched ${pages.length} pages with user token`);
      }
    } catch (e) {
      console.warn("[CONNECT CALLBACK] Failed to fetch pages:", e);
      return NextResponse.redirect(`${baseUrl}/connect/done?error=fetch_pages_failed`);
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
        return NextResponse.redirect(`${baseUrl}/connect/done?error=insufficient_role`);
      }
    } else {
      // Fallback: find user's first workspace
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId },
        orderBy: { workspace: { createdAt: "asc" } },
        select: { workspaceId: true },
      });
      if (!membership) {
        return NextResponse.redirect(`${baseUrl}/connect/done?error=no_workspace`);
      }
      resolvedWorkspaceId = membership.workspaceId;
    }

    // 5. Store the token in the Integration table keyed by module
    // FIX: Store USER access token (for Graph API), NOT page tokens
    const provider = `meta_${module}`; // e.g. "meta_social", "meta_analytics"
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    
    const encryptedUserToken = encryptToken(userAccessToken);

    // Store module-specific integration
    await prisma.integration.upsert({
      where: {
        workspaceId_provider_userId: {
          workspaceId: resolvedWorkspaceId,
          provider,
          userId: "workspace",
        },
      },
      update: {
        credentials: {
          accessToken: encryptedUserToken, // USER token
          pages, // Page data (with encrypted page tokens)
          expiresAt,
          refreshedAt: new Date().toISOString(),
          module,
          grantedScopes: userScopes, // Track what was actually granted
        },
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
      create: {
        workspaceId: resolvedWorkspaceId,
        provider,
        credentials: {
          accessToken: encryptedUserToken, // USER token
          pages,
          expiresAt,
          refreshedAt: new Date().toISOString(),
          module,
          grantedScopes: userScopes,
        },
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
    });

    // Also update the generic "meta" integration so all modules can use it as fallback
    await prisma.integration.upsert({
      where: {
        workspaceId_provider_userId: {
          workspaceId: resolvedWorkspaceId,
          provider: "meta",
          userId: "workspace",
        },
      },
      update: {
        credentials: {
          accessToken: encryptedUserToken, // USER token
          pages,
          expiresAt,
          refreshedAt: new Date().toISOString(),
          grantedScopes: userScopes,
        },
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
      create: {
        workspaceId: resolvedWorkspaceId,
        provider: "meta",
        credentials: {
          accessToken: encryptedUserToken, // USER token
          pages,
          expiresAt,
          refreshedAt: new Date().toISOString(),
          grantedScopes: userScopes,
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
