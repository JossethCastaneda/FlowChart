import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiError, apiSuccess } from "@/lib/api-response";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { env } from "@/lib/env";
import prisma from "@/lib/prisma";
import { resolveModuleConfig, resolveLoginConfigId } from "@/lib/meta-config";

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
    appId: flag(env.META_APP_ID),
    appSecret: flag(env.META_APP_SECRET),
    apiVersion: flag(env.META_API_VERSION),
    webhookVerifyToken: flag(env.META_WEBHOOK_VERIFY_TOKEN),
  };

  // config_id por módulo (Facebook Login for Business). Resueltos vía lib/meta-config
  // (nombre nuevo META_CONFIG_* con fallback al legacy). Sin estos, el botón "Conectar"
  // del módulo devuelve 500.
  result.metaConfigIds = {
    login: flag(resolveLoginConfigId()),
    publisherFacebook: flag(resolveModuleConfig("publisher_facebook")?.configId),
    publisherInstagram: flag(resolveModuleConfig("publisher_instagram")?.configId),
    social: flag(resolveModuleConfig("social")?.configId),
    ads: flag(resolveModuleConfig("ads")?.configId),
    analytics: flag(resolveModuleConfig("analytics")?.configId),
    community: flag(resolveModuleConfig("community")?.configId),
  };

  // Instagram Login directo (api/integrations/instagram/*)
  result.instagramDirect = {
    appId: flag(env.INSTAGRAM_APP_ID),
    appSecret: flag(env.INSTAGRAM_APP_SECRET),
    redirectUri: flag(env.INSTAGRAM_REDIRECT_URI),
    scopes: flag(env.INSTAGRAM_SCOPES),
  };

  // Scheduler: las tareas en segundo plano migraron de QStash a Vercel Cron +
  // Workflow DevKit. CRON_SECRET protege los endpoints /api/cron/*.
  result.scheduler = {
    cronSecret: flag(env.CRON_SECRET),
    workerSecret: flag(env.PUBLISH_WORKER_SECRET),
  };
  result.security = {
    encryptionKey: flag(env.ENCRYPTION_KEY),
  };

  return apiSuccess(result);
});
