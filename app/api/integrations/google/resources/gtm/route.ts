import { NextRequest, NextResponse } from "next/server";
import { withWorkspace, withWorkspaceRole } from "@/lib/api-handler";
import prisma from "@/lib/prisma";
import { refreshAccessToken, GoogleCredentials } from "@/lib/integrations/google/oauth";
import { logger } from "@/lib/logger";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

export const GET = withWorkspace(async (request, ctx) => {
  const workspaceId = ctx.workspaceId;

  const accessToken = await refreshAccessToken(workspaceId);
  if (!accessToken) {
    return NextResponse.json({ error: "Google not connected or token expired" }, { status: 401 });
  }

  try {
    const res = await fetch("https://tagmanager.googleapis.com/tagmanager/v2/accounts", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

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

    if (accountId) {
      const cRes = await fetch(`https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const cData = await cRes.json();
      return NextResponse.json({ containers: cData.container || [] });
    }

    return NextResponse.json({ accounts: data.account || [] });
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
    data: { credentials: newCreds as any },
  });

  return NextResponse.json({ success: true });
});
