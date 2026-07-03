/**
 * Inbox store — persistencia DB del inbox omnicanal (modelo WhatsApp generalizado a FB/IG).
 *
 * Antes: WhatsApp se persistía (webhook → DB → carga instantánea) pero Facebook
 * Messenger e Instagram DM se traían EN VIVO de la Graph API en cada carga (~60+
 * llamadas → lento, rate-limit, sin histórico). Este módulo lleva FB/IG al mismo
 * modelo: el webhook persiste cada mensaje entrante en tiempo real y el inbox lee
 * de la DB. El historial de un hilo se trae de Graph la primera vez que se abre
 * (backfill bajo demanda) y queda persistido.
 *
 * Scoping multi-tenant: el workspace dueño de una página/cuenta IG se resuelve por
 * IntegrationAssetCache (assetType page/ig_account) y, como fallback, por
 * MetaSource → proyecto → workspace. NUNCA se cruza data entre workspaces.
 */

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type InboxPlatform = "facebook_messenger" | "instagram_dm";

/** Resuelve el workspace dueño de un activo Meta (página / cuenta IG) para rutear el inbox. */
export async function resolveWorkspaceForMetaAsset(
  externalId: string,
  kind: "page" | "ig_account",
): Promise<string | null> {
  const normalized = externalId.replace(/^act_/, "");
  const ids = [...new Set([externalId, normalized])];

  // 1. IntegrationAssetCache — activos cacheados al conectar/sincronizar.
  const asset = await prisma.integrationAssetCache.findFirst({
    where: { assetType: kind, externalId: { in: ids } },
    select: { workspaceId: true },
  });
  if (asset) return asset.workspaceId;

  // 2. Fallback: MetaSource → proyecto → workspace (fuente mapeada a un proyecto).
  const src = await prisma.metaSource.findFirst({
    where: { externalId: { in: ids } },
    select: { project: { select: { workspaceId: true } } },
  });
  return src?.project?.workspaceId ?? null;
}

export interface InboundMessageInput {
  workspaceId: string;
  platform: InboxPlatform;
  /** ID del activo de negocio: page id (Messenger) o ig user id (Instagram). */
  pageId: string;
  /** PSID / IG-scoped user id del remitente. Es el externalId de la conversación. */
  contactId: string;
  contactName?: string | null;
  contactAvatar?: string | null;
  /** message id (mid) para idempotencia — los webhooks pueden reentregar. */
  mid?: string | null;
  text: string;
  /** epoch ms del mensaje. */
  timestampMs: number;
  /** "user" (entrante) | "page" (eco/saliente). */
  sender?: "user" | "page";
}

/**
 * Persiste un mensaje entrante (o eco saliente) en InboxConversation/InboxMessage.
 * Idempotente por (conversación, mid): reentregas del webhook no duplican.
 * Devuelve el id de la conversación, o null si no se pudo persistir.
 */
export async function persistInboundMessage(m: InboundMessageInput): Promise<string | null> {
  try {
    const when = new Date(m.timestampMs || Date.now());
    const isUser = (m.sender ?? "user") === "user";
    const preview = (m.text || "").slice(0, 255);

    const conversation = await prisma.inboxConversation.upsert({
      where: { workspaceId_externalId: { workspaceId: m.workspaceId, externalId: m.contactId } },
      update: {
        platform: m.platform,
        pageId: m.pageId,
        lastMessage: preview,
        lastMessageAt: when,
        // Solo marca no-leído si el mensaje es del usuario (no si es nuestro eco).
        ...(isUser ? { unread: true } : {}),
        ...(m.contactName ? { contactName: m.contactName } : {}),
        ...(m.contactAvatar ? { contactAvatar: m.contactAvatar } : {}),
        updatedAt: new Date(),
      },
      create: {
        workspaceId: m.workspaceId,
        platform: m.platform,
        externalId: m.contactId,
        pageId: m.pageId,
        igId: m.platform === "instagram_dm" ? m.pageId : null,
        contactName: m.contactName ?? m.contactId,
        contactAvatar: m.contactAvatar ?? null,
        lastMessage: preview,
        lastMessageAt: when,
        unread: isUser,
        status: "open",
        tags: [],
      },
    });

    // Dedup por mid (sin necesidad de un @@unique nuevo → cero migración de schema).
    if (m.mid) {
      const dup = await prisma.inboxMessage.findFirst({
        where: { conversationId: conversation.id, externalId: m.mid },
        select: { id: true },
      });
      if (dup) return conversation.id;
    }

    await prisma.inboxMessage.create({
      data: {
        conversationId: conversation.id,
        externalId: m.mid ?? null,
        content: m.text || "",
        sender: isUser ? "user" : "page",
        senderName: m.contactName ?? m.contactId,
        createdAt: when,
      },
    });

    return conversation.id;
  } catch (err) {
    logger.warn("[INBOX-STORE] persistInboundMessage failed", {
      workspaceId: m.workspaceId,
      platform: m.platform,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
