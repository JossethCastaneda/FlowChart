import { NextRequest, NextResponse } from "next/server";
import { withWorkspace, withWorkspaceRole } from "@/lib/api-handler";
import prisma from "@/lib/prisma";
import { refreshAccessToken, GoogleCredentials } from "@/lib/integrations/google/oauth";
import { logger } from "@/lib/logger";
import { googleFetch } from "@/lib/google-fetch";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

export const GET = withWorkspace(async (request, ctx) => {
  const workspaceId = ctx.workspaceId;

  const accessToken = await refreshAccessToken(workspaceId);
  if (!accessToken) {
    return NextResponse.json({ error: "Google not connected or token expired" }, { status: 401 });
  }

  try {
    const res = await googleFetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", accessToken);

    const data = await res.json();
    if (!res.ok) {
      logger.error("[GA4 API] Failed to fetch properties", data);
      return NextResponse.json({ error: "Failed to fetch GA4 properties from Google" }, { status: 502 });
    }

    const properties: { id: string; name: string; displayName: string }[] = [];
    
    // We need the integration ID for the cache
    const integration = await prisma.integration.findUnique({
      where: { workspaceId_provider_userId: { workspaceId, provider: "google", userId: "workspace" } },
      select: { id: true },
    });

    if (data.accountSummaries) {
      for (const account of data.accountSummaries) {
        if (account.propertySummaries) {
          for (const prop of account.propertySummaries) {
            properties.push({
              id: prop.property,
              name: prop.property, // "properties/123456"
              displayName: `${account.displayName} > ${prop.displayName}`,
            });

            if (integration) {
              await prisma.integrationAssetCache.upsert({
                where: {
                  integrationId_assetType_externalId: {
                    integrationId: integration.id,
                    assetType: "ga4_property",
                    externalId: prop.property,
                  },
                },
                update: {
                  name: `${account.displayName} > ${prop.displayName}`,
                  metadata: { propertyName: prop.property, displayName: prop.displayName },
                  syncedAt: new Date(),
                },
                create: {
                  integrationId: integration.id,
                  workspaceId,
                  provider: "google",
                  assetType: "ga4_property",
                  externalId: prop.property,
                  name: `${account.displayName} > ${prop.displayName}`,
                  metadata: { propertyName: prop.property, displayName: prop.displayName },
                },
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ properties });
  } catch (err: any) {
    logger.error("[GA4 API] Exception", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

/** POST: Saves the selected GA4 property for the workspace */
export const POST = withWorkspaceRole(["OWNER", "ADMIN"])(async (request, ctx) => {
  const workspaceId = ctx.workspaceId;

  const { propertyId } = await request.json();
  if (!propertyId) return NextResponse.json({ error: "Missing propertyId" }, { status: 400 });

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
      page_analytics: {
        ...(creds.resources?.page_analytics || {}),
        ga4PropertyId: propertyId,
      },
    },
  };

  await prisma.integration.update({
    where: { id: integration.id },
    data: { credentials: newCreds as any },
  });

  return NextResponse.json({ success: true });
});
