import { NextResponse } from "next/server";
import { withWorkspace, withWorkspaceRole } from "@/lib/api-handler";
import prisma from "@/lib/prisma";
import { refreshAccessToken, GoogleCredentials } from "@/lib/integrations/google/oauth";
import { logger } from "@/lib/logger";
import { googleFetch } from "@/lib/google-fetch";


export const GET = withWorkspace(async (request, ctx) => {
  const workspaceId = ctx.workspaceId;

  const accessToken = await refreshAccessToken(workspaceId);
  if (!accessToken) {
    return NextResponse.json({ error: "Google not connected or token expired" }, { status: 401 });
  }

  try {
    const res = await googleFetch("https://tagmanager.googleapis.com/tagmanager/v2/accounts", accessToken);

    const data = await res.json();
    if (!res.ok) {
      logger.error("[GTM API] Failed to fetch accounts", data);
      return NextResponse.json({ error: "Failed to fetch GTM accounts" }, { status: 502 });
    }

    // A full implementation would likely fetch containers for each account or just
    // return accounts and let the UI request containers for an account. 
    // Since we need to pick a container, let's fetch containers for all accounts (careful with quotas)
    // or just return accounts for now. To be robust, let's return accounts, and if accountId is passed, return containers.
    
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    // We need the integration ID for the cache
    const integration = await prisma.integration.findUnique({
      where: { workspaceId_provider_userId: { workspaceId, provider: "google", userId: "workspace" } },
      select: { id: true },
    });

    if (accountId) {
      const cRes = await googleFetch(`https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers`, accessToken);
      const cData = await cRes.json();
      const containers = cData.container || [];

      if (integration) {
        for (const container of containers) {
          await prisma.integrationAssetCache.upsert({
            where: {
              integrationId_assetType_externalId: {
                integrationId: integration.id,
                assetType: "gtm_container",
                externalId: container.containerId,
              },
            },
            update: {
              name: container.name,
              metadata: { accountId: container.accountId, publicId: container.publicId },
              syncedAt: new Date(),
            },
            create: {
              integrationId: integration.id,
              workspaceId,
              provider: "google",
              assetType: "gtm_container",
              externalId: container.containerId,
              name: container.name,
              metadata: { accountId: container.accountId, publicId: container.publicId },
            },
          });
        }
      }

      return NextResponse.json({ containers });
    }

    const accounts = data.account || [];
    if (integration) {
      for (const account of accounts) {
        await prisma.integrationAssetCache.upsert({
          where: {
            integrationId_assetType_externalId: {
              integrationId: integration.id,
              assetType: "gtm_account",
              externalId: account.accountId,
            },
          },
          update: {
            name: account.name,
            metadata: {},
            syncedAt: new Date(),
          },
          create: {
            integrationId: integration.id,
            workspaceId,
            provider: "google",
            assetType: "gtm_account",
            externalId: account.accountId,
            name: account.name,
            metadata: {},
          },
        });
      }
    }

    return NextResponse.json({ accounts });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  } catch (err: any) {
    logger.error("[GTM API] Exception", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

/** POST: Saves the selected GTM account/container for the workspace */
export const POST = withWorkspaceRole(["OWNER", "ADMIN"])(async (request, ctx) => {
  const workspaceId = ctx.workspaceId;

  const { accountId, containerId } = await request.json();
  if (!accountId || !containerId) return NextResponse.json({ error: "Missing accountId or containerId" }, { status: 400 });

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
      tag_tracking: {
        ...(creds.resources?.tag_tracking || {}),
        accountId,
        containerId,
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
