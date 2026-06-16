import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiError, apiSuccess } from "@/lib/api-response";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import prisma from "@/lib/prisma";

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

  result.blob = process.env.BLOB_READ_WRITE_TOKEN ? "ok" : "missing";
  result.meta = {
    appId: process.env.NEXT_PUBLIC_META_APP_ID ? "ok" : "missing",
    appSecret: process.env.META_APP_SECRET ? "ok" : "missing",
    apiVersion: process.env.META_API_VERSION ? "ok" : "missing",
  };
  result.instagramDirect = {
    appId: process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID ? "ok" : "missing",
    appSecret: process.env.INSTAGRAM_APP_SECRET ? "ok" : "missing",
    redirectUri: process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI ? "ok" : "missing",
    scopes: process.env.NEXT_PUBLIC_INSTAGRAM_SCOPES ? "ok" : "missing",
  };
  result.scheduler = {
    cronSecret: process.env.CRON_SECRET ? "ok" : "missing",
    workerSecret: process.env.PUBLISH_WORKER_SECRET ? "ok" : "missing",
  };
  result.qstash = {
    token: process.env.QSTASH_TOKEN ? "ok" : "missing",
    signingKeys:
      process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY
        ? "ok"
        : "missing",
    workerBaseUrl: process.env.QSTASH_WORKER_BASE_URL || process.env.NEXT_PUBLIC_APP_URL
      ? "ok"
      : "missing",
  };
  result.security = {
    encryptionKey: process.env.ENCRYPTION_KEY ? "ok" : "missing",
  };

  return apiSuccess(result);
});
