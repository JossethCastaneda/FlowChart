import { NextResponse } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import prisma from "@/lib/prisma";

/**
 * GET /api/connect/facebook-pages
 * Returns all connected Facebook pages with their Messenger and Page status.
 */
export const GET = withWorkspace(async (_req, { workspaceId }) => {
  // Try module-specific first, then fall back to generic "meta"
  const integration = await prisma.integration.findFirst({
    where: {
      workspaceId,
      provider: { in: ["meta_community", "meta"] },
      connected: true,
    },
    orderBy: { connectedAt: "desc" },
  });

  if (!integration) {
    return NextResponse.json({ pages: [], connected: false });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const creds = integration.credentials as Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const rawPages: any[] = creds?.pages || [];

  // Build safe page list (strip accessToken)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const pages = rawPages.map((p: any) => ({
    id: p.id,
    name: p.name,
    picture: typeof p.picture === "object" && p.picture?.data?.url ? p.picture.data.url : (typeof p.picture === "string" && p.picture !== "[object Object]" ? p.picture : null),
    email: p.email || null,
    category: p.category || null,
    // Enabled flags stored in creds.pageSettings
    messengerEnabled: creds?.pageSettings?.[p.id]?.messengerEnabled ?? true,
    pageEnabled: creds?.pageSettings?.[p.id]?.pageEnabled ?? true,
    instagram: p.instagram
      ? {
          id: p.instagram.id,
          username: p.instagram.username,
          picture: p.instagram.profile_picture_url || p.instagram.picture || null,
        }
      : null,
  }));

  const grantedScopes = creds?.grantedScopes || [];
  const requiredScopes = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "instagram_basic",
    "instagram_manage_messages",
    "instagram_manage_comments",
    "instagram_content_publish"
  ];
  const missingScopes = requiredScopes.filter(scope => !grantedScopes.includes(scope));

  return NextResponse.json({
    connected: integration.connected,
    connectedAt: integration.connectedAt?.toISOString() || null,
    provider: integration.provider,
    pages,
    missingScopes,
  });
});

/**
 * PATCH /api/connect/facebook-pages
 * Toggle messengerEnabled / pageEnabled for a specific pageId.
 * Body: { pageId: string; messengerEnabled?: boolean; pageEnabled?: boolean }
 */
export const PATCH = withWorkspace(async (req, { workspaceId }) => {
  const body = await req.json().catch(() => ({}));
  const { pageId, messengerEnabled, pageEnabled } = body as {
    pageId?: string;
    messengerEnabled?: boolean;
    pageEnabled?: boolean;
  };

  if (!pageId) {
    return NextResponse.json({ error: "pageId requerido" }, { status: 400 });
  }

  const integration = await prisma.integration.findFirst({
    where: {
      workspaceId,
      provider: { in: ["meta_community", "meta"] },
      connected: true,
    },
    orderBy: { connectedAt: "desc" },
  });

  if (!integration) {
    return NextResponse.json({ error: "No hay integración Meta conectada" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const creds = (integration.credentials as Record<string, any>) || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const pageSettings: Record<string, any> = { ...(creds.pageSettings || {}) };
  if (!pageSettings[pageId]) pageSettings[pageId] = {};
  if (messengerEnabled !== undefined) pageSettings[pageId].messengerEnabled = messengerEnabled;
  if (pageEnabled !== undefined)      pageSettings[pageId].pageEnabled = pageEnabled;

  await prisma.integration.update({
    where: { id: integration.id },
    data: { credentials: { ...creds, pageSettings } },
  });

  return NextResponse.json({ ok: true, pageSettings: pageSettings[pageId] });
});
