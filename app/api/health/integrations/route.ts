import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiError, apiSuccess } from "@/lib/api-response";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { env } from "@/lib/env";
import prisma from "@/lib/prisma";

/** "ok" si la variable está presente y no vacía, "missing" en otro caso. */
const flag = (value: string | undefined | null) => (value ? "ok" : "missing");

export const GET = withWorkspace(async (_req: NextRequest, ctx) => {
  const canInspect = await verifyWorkspaceAccess(ctx.workspaceId, ctx.userId, [
    "OWNER",
    "ADMIN",
  ]);
  if (!canInspect) {
    return apiError("No autorizado", "FORBIDDEN", 403);
  }

  const result: Record<string, unknown> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    result.database = "ok";
  } catch {
    result.database = "error";
  }

  result.blob = flag(env.BLOB_READ_WRITE_TOKEN);

  // Meta App (Facebook Login for Business) — las MISMAS vars que usan
  // api/connect/[module], el callback y el webhook. METAAPI_VERSION tiene
  // default en env.ts, por eso siempre estará presente.
  result.meta = {
    appId: flag(env.FACEBOOK_CLIENT_ID),
    appSecret: flag(env.FACEBOOK_CLIENT_SECRET),
    apiVersion: flag(env.META_API_VERSION),
    webhookVerifyToken: flag(env.META_WEBHOOK_VERIFY_TOKEN),
  };

  // config_id por módulo (Facebook Login for Business). Sin estos, el botón
  // "Conectar" del módulo correspondiente devuelve 500.
  result.metaConfigIds = {
    login: flag(env.FACEBOOK_LOGIN_CONFIG_ID),
    publisherFacebook: flag(env.FACEBOOK_PUBLISHER_FB_CONFIG_ID),
    publisherInstagram: flag(env.FACEBOOK_PUBLISHER_IG_CONFIG_ID),
    social: flag(env.FACEBOOK_SOCIAL_CONFIG_ID),
    ads: flag(env.FACEBOOK_ADS_CONFIG_ID),
    analytics: flag(env.FACEBOOK_ANALYTICS_CONFIG_ID),
    community: flag(env.FACEBOOK_COMMUNITY_CONFIG_ID),
  };

  // Instagram Login directo (api/integrations/instagram/*)
  result.instagramDirect = {
    appId: flag(env.INSTAGRAM_APP_ID),
    appSecret: flag(env.INSTAGRAM_APP_SECRET),
    redirectUri: flag(env.INSTAGRAM_REDIRECT_URI),
    scopes: flag(env.INSTAGRAM_SCOPES),
  };

  result.scheduler = {
    cronSecret: flag(env.CRON_SECRET),
    workerSecret: flag(env.PUBLISH_WORKER_SECRET),
  };
  result.qstash = {
    token: flag(env.QSTASH_TOKEN),
    signingKeys:
      env.QSTASH_CURRENT_SIGNING_KEY && env.QSTASH_NEXT_SIGNING_KEY
        ? "ok"
        : "missing",
    workerBaseUrl: flag(env.QSTASH_WORKER_BASE_URL || env.NEXT_PUBLIC_APP_URL),
  };
  result.security = {
    encryptionKey: flag(env.ENCRYPTION_KEY),
  };

  return apiSuccess(result);
});
