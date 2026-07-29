import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { env } from "@/lib/env";
import { decryptToken } from "@/lib/encryption";
import prisma from "@/lib/prisma";
import { subscribePages, logSubscriptionResults } from "@/lib/meta-webhooks";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/resubscribe
 * Manually resubscribes all pages connected to the workspace to the Meta Webhooks.
 * Useful if the webhook subscription was dropped or if new scopes were granted.
 */
export const POST = withWorkspace(async (_req, ctx) => {
  const metaIntegrations = await prisma.integration.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      provider: { startsWith: "meta" },
      connected: true,
    },
    select: {
      id: true,
      provider: true,
      credentials: true,
    },
  });

  const version = env.META_API_VERSION;
  let totalSubscribed = 0;
  let totalFailed = 0;
  const details: any[] = [];
  
  // Aggregate all scopes across all meta integrations for this workspace
  const allScopesSet = new Set<string>();
  for (const intg of metaIntegrations) {
    const creds = intg.credentials as { grantedScopes?: string[] } | null;
    for (const s of creds?.grantedScopes ?? []) {
      allScopesSet.add(s);
    }
  }
  const unionScopes = Array.from(allScopesSet);

  for (const integ of metaIntegrations) {
    const creds = integ.credentials as any;
    if (!creds?.pages || !Array.isArray(creds.pages)) continue;

    const rawPages = [];
    for (const page of creds.pages) {
      if (!page.id || !page.accessToken) continue;

      try {
        const decryptedToken = decryptToken(page.accessToken);
        rawPages.push({
          id: page.id,
          name: page.name,
          accessToken: decryptedToken, // plaintext token required for subscribePages
          instagramId: page.instagramId,
        });
      } catch (err) {
        logger.error(`[RESUBSCRIBE] Failed to decrypt token for page ${page.id}`, { err });
        details.push({ pageId: page.id, name: page.name, success: false, error: "Failed to decrypt token" });
        totalFailed++;
      }
    }

    if (rawPages.length > 0) {
      try {
        const subResults = await subscribePages(rawPages, version, unionScopes);
        const { subscribed, failed } = logSubscriptionResults(subResults, {
          route: "api/webhooks/resubscribe",
          provider: integ.provider,
          workspaceId: ctx.workspaceId,
        });
        totalSubscribed += subscribed;
        totalFailed += failed;
        details.push(...subResults);
      } catch (err: any) {
        logger.error(`[RESUBSCRIBE] Error subscribing pages for ${integ.provider}`, { err });
        return apiError(`Failed to subscribe pages: ${err.message}`, "INTERNAL_ERROR", 500);
      }
    }
  }

  // Audit Log
  await prisma.auditLog.create({
    data: {
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "resubscribe_webhooks",
      resourceType: "Workspace",
      resourceId: ctx.workspaceId,
      details: { subscribed: totalSubscribed, failed: totalFailed, unionScopes, details },
    },
  }).catch((auditErr) => {
    logger.error("[RESUBSCRIBE]  Failed to write AuditLog:", auditErr);
  });

  return apiSuccess({
    subscribed: totalSubscribed,
    failed: totalFailed,
    details,
  });
});
