import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

/**
 * POST /api/connect/disconnect
 * User-initiated unlink of a Meta connection (vs the deauthorize webhook).
 *
 * Body: { provider?: string }
 *   - provider = a module key ("publisher_facebook", "ads", ...) → disconnects
 *     just that module (deletes its `meta_<key>` Integration row).
 *   - provider omitted or "all" → disconnects ALL Meta integrations for the
 *     workspace AND revokes the app's access at Meta (DELETE /me/permissions),
 *     which is the proper full unlink per Meta's docs.
 *
 * Requires the caller to be OWNER or ADMIN of the active workspace.
 */
export async function POST(request: NextRequest) {
  const jwt = await getToken({ req: request, secret: AUTH_SECRET });
  if (!jwt?.sub) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "Sin workspace activo" }, { status: 400 });

  // Only OWNER/ADMIN may unlink shared workspace integrations.
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: jwt.sub, workspaceId, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "Solo OWNER/ADMIN pueden desvincular la cuenta de Meta." },
      { status: 403 }
    );
  }

  let provider = "all";
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.provider && typeof body.provider === "string") provider = body.provider;
  } catch { /* default to all */ }

  try {
    if (provider !== "all") {
      // Disconnect a single module — keep the rest connected.
      const result = await prisma.integration.deleteMany({
        where: { workspaceId, provider: `meta_${provider}` },
      });
      // Invalida el cache de connection-status (F6) para reflejar la desconexión.
      await prisma.metaAnalyticsCache.deleteMany({
        where: { workspaceId, endpoint: "connection-status" },
      }).catch(() => {});
      
      if (provider === "community") {
        // Eliminar también las conversaciones y los assets de caché para limpiar la bandeja
        await prisma.inboxConversation.deleteMany({
          where: { workspaceId, platform: { in: ["facebook_messenger", "instagram_dm", "facebook_comment", "instagram_comment"] } }
        }).catch(() => {});
        await prisma.integrationAssetCache.deleteMany({
          where: { workspaceId, assetType: { in: ["page", "ig_account"] } }
        }).catch(() => {});
      }
      
      return NextResponse.json({ success: true, scope: provider, removed: result.count });
    }

    // ── Full unlink: revoke at Meta first (best-effort), then remove all rows ──
    const token = await getMetaAccessToken(request, "ads")
      || await getMetaAccessToken(request);
    if (token) {
      try {
        // DELETE /me/permissions revokes every permission and invalidates the token.
        await metaFetch(metaUrl("me/permissions"), token, { method: "DELETE" });
      } catch (err) {
        logger.warn("[DISCONNECT] Meta permission revoke failed (continuing):", err);
      }
    }

    const result = await prisma.integration.deleteMany({
      where: { workspaceId, provider: { startsWith: "meta" } },
    });
    // Invalida el cache de connection-status (F6).
    await prisma.metaAnalyticsCache.deleteMany({
      where: { workspaceId, endpoint: "connection-status" },
    }).catch(() => {});

    // Limpiar las conversaciones e integraciones cacheadas
    await prisma.inboxConversation.deleteMany({
      where: { workspaceId, platform: { in: ["facebook_messenger", "instagram_dm", "facebook_comment", "instagram_comment"] } }
    }).catch(() => {});
    await prisma.integrationAssetCache.deleteMany({
      where: { workspaceId, assetType: { in: ["page", "ig_account"] } }
    }).catch(() => {});

    return NextResponse.json({ success: true, scope: "all", removed: result.count });
  } catch (err: any) {
    logger.error("[DISCONNECT] Error:", err);
    return NextResponse.json({ error: err?.message || "Error al desvincular" }, { status: 500 });
  }
}
