import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/connect/callback
 * Facebook OAuth callback — exchanges code for token and saves to Integration table.
 * 
 * Query params from Facebook:
 *   - code: authorization code
 *   - state: base64url-encoded JSON { module, userId }
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

  // Decode state
  let module = "unknown";
  let userId = "";
  try {
    const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    module = decoded.module;
    userId = decoded.userId;
  } catch {
    return NextResponse.redirect(`${baseUrl}/dashboard?connect_error=invalid_state`);
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID || "";
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET || "";
  const redirectUri = `${baseUrl}/api/connect/callback`;

  try {
    // 1. Exchange code for short-lived token
    const tokenUrl = new URL("https://graph.facebook.com/v22.0/oauth/access_token");
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
      const llUrl = new URL("https://graph.facebook.com/v22.0/oauth/access_token");
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
        `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,picture,instagram_business_account&limit=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const pagesData = await pagesRes.json();
      pages = (pagesData.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        accessToken: p.access_token,
        picture: p.picture?.data?.url || null,
        instagramId: p.instagram_business_account?.id || null,
      }));
    } catch (e) {
      console.warn("[CONNECT CALLBACK] Failed to fetch pages:", e);
    }

    // 4. Find user's workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId },
      orderBy: { workspace: { createdAt: "asc" } },
      select: { workspaceId: true },
    });

    if (!membership) {
      return NextResponse.redirect(`${baseUrl}/dashboard?connect_error=no_workspace`);
    }

    // 5. Store the token in the Integration table keyed by module
    const provider = `meta_${module}`; // e.g. "meta_social", "meta_analytics"
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    await prisma.integration.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: membership.workspaceId,
          provider,
        },
      },
      update: {
        credentials: {
          accessToken,
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
        workspaceId: membership.workspaceId,
        provider,
        credentials: {
          accessToken,
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
          workspaceId: membership.workspaceId,
          provider: "meta",
        },
      },
      update: {
        credentials: {
          accessToken,
          pages,
          expiresAt,
          refreshedAt: new Date().toISOString(),
        },
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
      create: {
        workspaceId: membership.workspaceId,
        provider: "meta",
        credentials: {
          accessToken,
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

    // All connections redirect to Publisher → Integrations tab
    return NextResponse.redirect(`${baseUrl}/dashboard/publisher?connected=${module}`);

  } catch (err: any) {
    console.error("[CONNECT CALLBACK] Error:", err);
    return NextResponse.redirect(`${baseUrl}/dashboard?connect_error=server_error`);
  }
}
