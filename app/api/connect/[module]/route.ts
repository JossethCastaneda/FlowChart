import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createHmac } from "crypto";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const META_API_VERSION = env.META_API_VERSION;
const NEXTAUTH_SECRET = env.NEXTAUTH_SECRET || env.AUTH_SECRET;

const CONFIG_MAP: Record<string, { envKey: keyof typeof env; label: string }> = {
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
    envKey: "MESSENGER_CONFIG_ID",
    label: "Community Management",
  },
};


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  const { module } = await params;

  if (!NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "NEXTAUTH_SECRET/AUTH_SECRET not configured" }, { status: 500 });
  }

  const jwt = await getToken({ req: request, secret: NEXTAUTH_SECRET });
  if (!jwt?.sub) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = String(jwt.sub);

  const config = CONFIG_MAP[module];
  if (!config) {
    return NextResponse.json(
      { error: `Unknown module: ${module}. Valid: ${Object.keys(CONFIG_MAP).join(", ")}` },
      { status: 400 }
    );
  }

  const metaAppId = env.META_APP_ID;
  if (!metaAppId) {
    return NextResponse.json({ error: "META_APP_ID not configured" }, { status: 500 });
  }

  const configId = env[config.envKey];
  if (!configId) {
    return NextResponse.json(
      { error: `${String(config.envKey)} not configured for ${config.label}` },
      { status: 500 }
    );
  }

  const workspaceId = await getActiveWorkspaceId(userId);
  if (!workspaceId) {
    return NextResponse.json({ error: "No active workspace" }, { status: 400 });
  }

  const canConnect = await verifyWorkspaceAccess(workspaceId, userId, ["OWNER", "ADMIN"]);
  if (!canConnect) {
    return NextResponse.json({ error: "Not authorized for this workspace" }, { status: 403 });
  }

  let baseUrl = env.NEXT_PUBLIC_APP_URL || env.NEXTAUTH_URL || request.nextUrl.origin;
  baseUrl = baseUrl.replace(/\/$/, "");
  const redirectUri = `${baseUrl}/api/connect/callback`;

  const payload = JSON.stringify({
    module,
    userId,
    workspaceId,
    nonce: crypto.randomUUID(),
    ts: Date.now(), // el callback rechaza estados de más de 15 min (anti-replay)
  });
  const sig = createHmac("sha256", NEXTAUTH_SECRET)
    .update(payload)
    .digest("hex");
  const encodedState = Buffer.from(JSON.stringify({ payload, sig })).toString("base64url");

  const fbUrl = new URL(`https://www.facebook.com/${META_API_VERSION}/dialog/oauth`);
  fbUrl.searchParams.set("client_id", metaAppId);
  fbUrl.searchParams.set("redirect_uri", redirectUri);
  fbUrl.searchParams.set("state", encodedState);
  fbUrl.searchParams.set("config_id", configId);
  fbUrl.searchParams.set("response_type", "code");
  fbUrl.searchParams.set("override_default_response_type", "true");
  fbUrl.searchParams.set("display", "popup");

  logger.info("Redirecting to Meta OAuth", {
    route: "api/connect/[module]",
    module,
    workspaceId,
  });

  return NextResponse.redirect(fbUrl.toString());
}
