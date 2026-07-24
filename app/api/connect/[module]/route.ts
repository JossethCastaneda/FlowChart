import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createHmac } from "crypto";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { resolveModuleConfig, META_MODULES } from "@/lib/meta-config";
import prisma from "@/lib/prisma";

const META_API_VERSION = env.META_API_VERSION;
const NEXTAUTH_SECRET = env.NEXTAUTH_SECRET || env.AUTH_SECRET;


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

  const config = resolveModuleConfig(module);
  if (!config) {
    return NextResponse.json(
      { error: `Unknown module: ${module}. Valid: ${META_MODULES.join(", ")}` },
      { status: 400 }
    );
  }

  const metaAppId = env.META_APP_ID;
  if (!metaAppId) {
    return NextResponse.json({ error: "META_APP_ID not configured" }, { status: 500 });
  }

  const configId = config.configId;
  if (module !== "publisher_instagram" && !configId) {
    return NextResponse.json(
      { error: `${config.expectedEnv} not configured for ${config.label}` },
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
  
  const force = request.nextUrl.searchParams.get("force") === "1";

  // -- REUSE EXISTING CONNECTION LOGIC --
  // If the user already has a valid Meta connection, clone it to avoid double-login.
  const existingProviders = ["meta_publisher_facebook", "meta_social", "meta_community", "meta_inbox", "meta_publisher_instagram", "instagram"];
  const existingIntegration = !force ? await prisma.integration.findFirst({
    where: {
      workspaceId,
      provider: { in: existingProviders, not: `meta_${module}` },
      connected: true,
    }
  }) : null;

  if (existingIntegration) {
    const targetProvider = module === "instagram" ? "instagram" : `meta_${module}`;
    
    await prisma.integration.upsert({
      where: {
        workspaceId_provider_userId: {
          workspaceId,
          provider: targetProvider,
          userId: "workspace"
        }
      },
      create: {
        workspaceId,
        provider: targetProvider,
        userId: "workspace",
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
        credentials: existingIntegration.credentials as any,
      },
      update: {
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
        credentials: existingIntegration.credentials as any,
      }
    });

    logger.info(`Reused existing connection ${existingIntegration.provider} for module ${module}`, { workspaceId });
    return NextResponse.redirect(`${baseUrl}/connect/done?module=${module}`);
  }

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

  let authUrl: URL;

  if (module === "publisher_instagram") {
    authUrl = new URL("https://www.instagram.com/oauth/authorize");
    authUrl.searchParams.set("client_id", metaAppId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages,pages_show_list,pages_read_engagement");
    authUrl.searchParams.set("state", encodedState);
  } else {
    authUrl = new URL(`https://www.facebook.com/${META_API_VERSION}/dialog/oauth`);
    authUrl.searchParams.set("client_id", metaAppId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", encodedState);
    authUrl.searchParams.set("config_id", configId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("override_default_response_type", "true");
    authUrl.searchParams.set("display", "popup");
  }

  logger.info("Redirecting to Meta OAuth", {
    route: "api/connect/[module]",
    module,
    workspaceId,
  });

  return NextResponse.redirect(authUrl.toString());
}
