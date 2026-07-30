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
    const res = await googleFetch("https://searchconsole.googleapis.com/webmasters/v3/sites", accessToken);

    const data = await res.json();
    if (!res.ok) {
      logger.error("[GSC API] Failed to fetch sites", data);
      return NextResponse.json({ error: "Failed to fetch GSC sites from Google" }, { status: 502 });
    }

    // We need the integration ID for the cache
    const integration = await prisma.integration.findUnique({
      where: { workspaceId_provider_userId: { workspaceId, provider: "google", userId: "workspace" } },
      select: { id: true },
    });

    const sites = [];
    if (data.siteEntry) {
      for (const site of data.siteEntry) {
        const siteObj = {
          id: site.siteUrl,
          name: site.siteUrl,
          permissionLevel: site.permissionLevel,
        };
        sites.push(siteObj);

        if (integration) {
          await prisma.integrationAssetCache.upsert({
            where: {
              integrationId_assetType_externalId: {
                integrationId: integration.id,
                assetType: "gsc_site",
                externalId: site.siteUrl,
              },
            },
            update: {
              name: site.siteUrl,
              metadata: { permissionLevel: site.permissionLevel },
              syncedAt: new Date(),
            },
            create: {
              integrationId: integration.id,
              workspaceId,
              provider: "google",
              assetType: "gsc_site",
              externalId: site.siteUrl,
              name: site.siteUrl,
              metadata: { permissionLevel: site.permissionLevel },
            },
          });
        }
      }
    }

    return NextResponse.json({ sites });
  } catch (err: any) {
    logger.error("[GSC API] Exception", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

/** POST: Saves the selected GSC site for the workspace */
export const POST = withWorkspaceRole(["OWNER", "ADMIN"])(async (request, ctx) => {
  const workspaceId = ctx.workspaceId;

  const { siteUrl } = await request.json();
  if (!siteUrl) return NextResponse.json({ error: "Missing siteUrl" }, { status: 400 });

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
        gscSiteUrl: siteUrl,
      },
    },
  };

  await prisma.integration.update({
    where: { id: integration.id },
    data: { credentials: newCreds as any },
  });

  return NextResponse.json({ success: true });
});
