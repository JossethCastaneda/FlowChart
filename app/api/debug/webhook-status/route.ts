import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess } from "@/lib/api-response";
import { env } from "@/lib/env";
import { decryptToken } from "@/lib/encryption";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug/webhook-status
 * Diagnostics endpoint to check if connected pages are actually subscribed to the Meta App.
 * Useful when messages are not arriving in the inbox.
 */
export const GET = withWorkspace(async (_req, ctx) => {
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

  const results = [];
  const version = env.META_API_VERSION;

  for (const integ of metaIntegrations) {
    const creds = integ.credentials as any;
    if (!creds?.pages || !Array.isArray(creds.pages)) continue;

    for (const page of creds.pages) {
      if (!page.id || !page.accessToken) continue;

      let decryptedToken: string;
      try {
        decryptedToken = decryptToken(page.accessToken);
      } catch (err) {
        results.push({
          provider: integ.provider,
          pageId: page.id,
          pageName: page.name,
          status: "error",
          error: "Failed to decrypt page token",
        });
        continue;
      }

      // Check subscribed_apps
      try {
        const res = await fetch(
          `https://graph.facebook.com/${version}/${page.id}/subscribed_apps`,
          {
            headers: {
              Authorization: `Bearer ${decryptedToken}`,
            },
          }
        );
        const data = await res.json();
        
        let isSubscribed = false;
        let subscribedFields: string[] = [];
        
        if (data.data && Array.isArray(data.data)) {
          // Check if OUR app is in the list
          const ourApp = data.data.find((app: any) => app.id === env.META_APP_ID);
          if (ourApp) {
            isSubscribed = true;
            subscribedFields = ourApp.subscribed_fields || [];
          } else {
             // App not found, means no active subscription for this page in this app
             isSubscribed = false;
          }
        }

        // Check if page exists in AssetCache
        const assetCache = await prisma.integrationAssetCache.findFirst({
           where: { workspaceId: ctx.workspaceId, assetType: "page", externalId: page.id }
        });

        results.push({
          provider: integ.provider,
          pageId: page.id,
          pageName: page.name,
          status: isSubscribed ? "subscribed" : "not_subscribed",
          subscribedFields,
          inAssetCache: !!assetCache,
          rawResponse: data
        });
      } catch (err: any) {
        results.push({
          provider: integ.provider,
          pageId: page.id,
          pageName: page.name,
          status: "error",
          error: err.message,
        });
      }
    }
  }

  return apiSuccess({
    workspaceId: ctx.workspaceId,
    metaAppId: env.META_APP_ID,
    results,
  });
});
