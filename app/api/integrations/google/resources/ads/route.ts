import { NextResponse } from "next/server";
import { withWorkspace, withWorkspaceRole } from "@/lib/api-handler";
import prisma from "@/lib/prisma";
import { refreshAccessToken, GoogleCredentials } from "@/lib/integrations/google/oauth";
import { logger } from "@/lib/logger";
import { GOOGLE_ADS_API_VERSION } from "@/lib/integrations/google/google-ads";
import { googleFetch } from "@/lib/google-fetch";


export const GET = withWorkspace(async (request, ctx) => {
  const workspaceId = ctx.workspaceId;

  const accessToken = await refreshAccessToken(workspaceId);
  if (!accessToken) {
    return NextResponse.json({ error: "Google not connected or token expired" }, { status: 401 });
  }

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    return NextResponse.json({ error: "GOOGLE_ADS_DEVELOPER_TOKEN no configurado en el servidor" }, { status: 500 });
  }

  // Log token presence (masked) for debugging
  logger.info(`[Google Ads API] Developer token present: ${developerToken.length} chars, starts with: ${developerToken.substring(0, 4)}...`);

  try {
    // 1. Fetch accessible customer accounts
    const res = await googleFetch(`https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers:listAccessibleCustomers`, accessToken, {
      headers: {
        "developer-token": developerToken,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      logger.error("[Google Ads API] Failed to fetch customers", {
        httpStatus: res.status,
        error: data.error,
        fullResponse: JSON.stringify(data).substring(0, 1000),
      });
      const errorDetail = data.error?.details?.[0]?.errors?.[0]?.message
        || data.error?.message
        || `Google Ads API error (HTTP ${res.status})`;
      return NextResponse.json({
        error: errorDetail,
        errorCode: data.error?.status || data.error?.code,
        httpStatus: res.status,
      }, { status: 502 });
    }

    const resourceNames: string[] = data.resourceNames || [];
    const customers: { id: string; name: string; displayName: string }[] = [];

    // We need the integration ID for the cache
    const integration = await prisma.integration.findUnique({
      where: { workspaceId_provider_userId: { workspaceId, provider: "google", userId: "workspace" } },
      select: { id: true },
    });

    // 2. Fetch descriptive names in parallel (best-effort)
    await Promise.all(
      resourceNames.map(async (resourceName) => {
        const customerId = resourceName.replace("customers/", "");
        try {
          const searchRes = await googleFetch(`https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:searchStream`, accessToken, {
            method: "POST",
            headers: {
              "developer-token": developerToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: "SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1",
            }),
          });

          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (Array.isArray(searchData) && searchData[0]?.results?.[0]?.customer) {
              const cust = searchData[0].results[0].customer;
              const custObj = {
                id: customerId,
                name: cust.descriptiveName || `Cuenta ${customerId}`,
                displayName: `${cust.descriptiveName || "Cuenta"} (${customerId})`,
              };
              customers.push(custObj);
              
              if (integration) {
                await prisma.integrationAssetCache.upsert({
                  where: {
                    integrationId_assetType_externalId: {
                      integrationId: integration.id,
                      assetType: "google_ads",
                      externalId: customerId,
                    },
                  },
                  update: {
                    name: custObj.name,
                    metadata: { displayName: custObj.displayName },
                    syncedAt: new Date(),
                  },
                  create: {
                    integrationId: integration.id,
                    workspaceId,
                    provider: "google",
                    assetType: "google_ads",
                    externalId: customerId,
                    name: custObj.name,
                    metadata: { displayName: custObj.displayName },
                  },
                });
              }

              return;
            }
          }
        } catch (e) {
          logger.warn(`[Google Ads API] Failed to fetch name for ${customerId}`, e);
        }
        
        // Fallback if detail fetch fails
        const fallbackCust = {
          id: customerId,
          name: `Cuenta Ads ${customerId}`,
          displayName: `Cuenta Ads (${customerId})`,
        };
        customers.push(fallbackCust);

        if (integration) {
          await prisma.integrationAssetCache.upsert({
            where: {
              integrationId_assetType_externalId: {
                integrationId: integration.id,
                assetType: "google_ads",
                externalId: customerId,
              },
            },
            update: {
              name: fallbackCust.name,
              metadata: { displayName: fallbackCust.displayName },
              syncedAt: new Date(),
            },
            create: {
              integrationId: integration.id,
              workspaceId,
              provider: "google",
              assetType: "google_ads",
              externalId: customerId,
              name: fallbackCust.name,
              metadata: { displayName: fallbackCust.displayName },
            },
          });
        }
      })
    );

    return NextResponse.json({ customers });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  } catch (err: any) {
    logger.error("[Google Ads API] Exception", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

/** POST: Saves the selected Google Ads Customer ID */
export const POST = withWorkspaceRole(["OWNER", "ADMIN"])(async (request, ctx) => {
  const workspaceId = ctx.workspaceId;

  const { customerId } = await request.json();
  if (!customerId) return NextResponse.json({ error: "Missing customerId" }, { status: 400 });

  const integration = await prisma.integration.findUnique({
    where: { workspaceId_provider_userId: { workspaceId, provider: "google", userId: "workspace" } },
  });

  if (!integration) {
    return NextResponse.json({ error: "Google not connected" }, { status: 400 });
  }

  const creds = (integration.credentials as unknown) as GoogleCredentials;
  const newCreds: GoogleCredentials = {
    ...creds,
    resources: {
      ...creds.resources,
      google_ads: {
        ...(creds.resources?.google_ads || {}),
        customerId,
      },
    },
  };

  await prisma.integration.update({
    where: { id: integration.id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    data: { credentials: newCreds as any },
  });

  return NextResponse.json({ success: true });
});
