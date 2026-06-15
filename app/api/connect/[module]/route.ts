import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createHmac } from "crypto";
import { buildScopeString } from "@/lib/meta-scopes";

const META_API_VERSION = process.env.META_API_VERSION || "v25.0";
const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

/**
 * GET /api/connect/[module]
 * Initiates Facebook OAuth with the module-specific config_id.
 * 
 * Modules and their config_ids:
 *   - publisher_facebook → FACEBOOK_PUBLISHER_FB_CONFIG_ID  (Publish posts to FB pages)
 *   - publisher_instagram → FACEBOOK_PUBLISHER_IG_CONFIG_ID (Publish to Instagram)
 *   - social             → FACEBOOK_SOCIAL_CONFIG_ID        (Read engagement/insights)
 *   - ads                → FACEBOOK_ADS_CONFIG_ID           (Ads Manager)
 *   - analytics          → FACEBOOK_ANALYTICS_CONFIG_ID     (Insights)
 *   - community          → FACEBOOK_COMMUNITY_CONFIG_ID     (Inbox, Listening, Streams)
 */

const CONFIG_MAP: Record<string, { envKey: string; label: string }> = {
  publisher_facebook: {
    envKey: "FACEBOOK_PUBLISHER_FB_CONFIG_ID",
    label: "Publisher Facebook",
  },
  publisher_instagram: {
    envKey: "FACEBOOK_PUBLISHER_IG_CONFIG_ID",
    label: "Publisher Instagram",
  },
  social: {
    envKey: "FACEBOOK_SOCIAL_CONFIG_ID",
    label: "Social Channels",
  },
  ads: {
    envKey: "FACEBOOK_ADS_CONFIG_ID",
    label: "Meta Ads Manager",
  },
  analytics: {
    envKey: "FACEBOOK_ANALYTICS_CONFIG_ID",
    label: "Analytics Engine",
  },
  community: {
    envKey: "FACEBOOK_COMMUNITY_CONFIG_ID",
    label: "Community Management",
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  const { module } = await params;

  // Auth check
  const jwt = await getToken({ req: request, secret: AUTH_SECRET });
  if (!jwt?.sub) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const config = CONFIG_MAP[module];
  if (!config) {
    return NextResponse.json(
      { error: `Unknown module: ${module}. Valid: ${Object.keys(CONFIG_MAP).join(", ")}` },
      { status: 400 }
    );
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "FACEBOOK_CLIENT_ID not configured" }, { status: 500 });
  }

  const secret = AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "NEXTAUTH_SECRET/AUTH_SECRET not configured" }, { status: 500 });
  }

  // FIX: Config_ids are REQUIRED in production — no hardcoded fallbacks
  // This prevents using wrong config_ids if env vars are missing
  let configId = process.env[config.envKey];
  if (!configId) {
    const msg = `${config.envKey} not configured for ${config.label}`;
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    console.warn(`[CONNECT] ${msg} — using demo fallback (dev only)`);
    // Fallback config ID for development testing (requires user to be added to Meta App)
    configId = "1234567890";
  }

  // Build the redirect URI for the callback
  const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/connect/callback`;

  // ── SECURITY: HMAC-signed state with nonce ──
  // Resolve user's active workspaceId to embed in state
  let workspaceId = "";
  try {
    const { default: prisma } = await import("@/lib/prisma");
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: jwt.sub },
      orderBy: { workspace: { createdAt: "asc" } },
      select: { workspaceId: true },
    });
    workspaceId = membership?.workspaceId || "";
  } catch {
    // If workspace lookup fails, callback will handle it
  }

  const payload = JSON.stringify({
    module,
    userId: jwt.sub,
    workspaceId,
    nonce: crypto.randomUUID(),
  });
  const sig = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  const encodedState = Buffer.from(JSON.stringify({ payload, sig })).toString("base64url");

  // FIX: Include module-specific scopes (not global)
  const scopeString = buildScopeString(module);

  // Build Facebook OAuth URL with config_id
  const fbUrl = new URL(`https://www.facebook.com/${META_API_VERSION}/dialog/oauth`);
  fbUrl.searchParams.set("client_id", clientId);
  fbUrl.searchParams.set("redirect_uri", redirectUri);
  fbUrl.searchParams.set("state", encodedState);
  fbUrl.searchParams.set("config_id", configId);
  fbUrl.searchParams.set("response_type", "code");
  // override_default_response_type is needed when using config_id
  fbUrl.searchParams.set("override_default_response_type", "true");
  // display=popup tells Facebook to render the OAuth dialog in popup mode (no nav bar)
  fbUrl.searchParams.set("display", "popup");
  
  // FIX: Include scopes ONLY if not using configId, as Meta docs state:
  // "When using configuration IDs, the scope parameter in the OAuth request is ignored or may cause errors."
  // However, since configId is required now, we must not pass scope.
  // fbUrl.searchParams.set("scope", scopeString);

  console.log(`[CONNECT] Redirecting to Meta OAuth for module: ${module} with configId: ${configId}`);

  return NextResponse.redirect(fbUrl.toString());
}
