import { NextRequest, NextResponse } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/inbox/conversations
 *
 * Inbox omnicanal — LECTURA DESDE LA DB (carga instantánea, apto para polling ~12s).
 *
 * Antes esta ruta hacía ~60+ llamadas EN VIVO a la Graph API en cada carga
 * (me/accounts + conversations + feed por cada página + IG), lo que la hacía lenta,
 * propensa a rate limit y sin histórico completo. Ahora los DMs (Messenger, IG DM,
 * WhatsApp) se persisten (webhook en tiempo real + backfill bajo demanda) y aquí
 * solo se leen de InboxConversation. Los mensajes nuevos llegan por webhook y el
 * cliente los ve con el siguiente poll. El histórico de un hilo se trae al abrirlo
 * (ver /api/inbox/messages). Los comentarios FB/IG viven en /api/inbox/comments
 * (carga perezosa) para no frenar los DMs.
 */
export const GET = withWorkspace(async (request, ctx) => {
  const workspaceId = ctx.workspaceId;

  logger.info("[INBOX-DIAG] conversations fetch", { userId: ctx.userId, workspaceId });

  try {
    const rows = await prisma.inboxConversation.findMany({
      where: { workspaceId },
      orderBy: { lastMessageAt: "desc" },
      take: 500,
      include: { contact: { select: { customFields: true } } },
    });

    logger.info("[INBOX-DIAG] conversations result", { workspaceId, count: rows.length });

    // Resolver nombres de página en un solo query (no un join por conversación).
    const pageIds = [...new Set(rows.map((r) => r.pageId).filter((p): p is string => !!p))];
    const pageNameById = new Map<string, string>();
    if (pageIds.length > 0) {
      const assets = await prisma.integrationAssetCache.findMany({
        where: { workspaceId, externalId: { in: pageIds } },
        select: { externalId: true, name: true },
      });
      for (const a of assets) pageNameById.set(a.externalId, a.name);
    }

    const platformLabel: Record<string, string> = {
      whatsapp: "WhatsApp",
      facebook_messenger: "Messenger",
      instagram_dm: "Instagram",
    };

    const conversations = rows.map((c) => {
      const isWa = c.platform === "whatsapp";
      const contactId = isWa ? c.externalId.replace(/^wa_/, "") : c.externalId;
      const pageName =
        (c.pageId && pageNameById.get(c.pageId)) || platformLabel[c.platform] || "Inbox";
      return {
        id: c.id,
        platform: c.platform,
        pageId: c.pageId || "",
        pageName,
        contactName: c.contactName || "Usuario",
        contactId,
        // Contact.id del CRM unificado (distinto del PSID/teléfono de `contactId`).
        crmContactId: c.contactId,
        contactAvatar: c.contactAvatar || null,
        lastMessage: c.lastMessage || "",
        lastMessageAt: c.lastMessageAt || c.updatedAt,
        createdAt: c.createdAt,
        unread: c.unread,
        priority: (c as any).priority ?? null,
        status: c.status,
        assignedTo: c.assignedTo,
        tags: c.tags,
        customFields: c.contact?.customFields || null,
        channelSource: isWa ? "whatsapp" : c.platform.startsWith("instagram") ? "instagram_app" : "facebook_app",
        // externalId: PSID para DMs, post_id para comentarios — lo usa PostView para cargar el post on-demand
        externalId: c.externalId || null,
      };
    });

    return NextResponse.json({ conversations, source: "db" });
  } catch (err) {
    logger.error("[INBOX] DB conversations fetch failed", { err });
    return NextResponse.json({ conversations: [], source: "db", error: "db_error" }, { status: 500 });
  }
});
