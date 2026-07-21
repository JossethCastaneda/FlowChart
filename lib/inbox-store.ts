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
import { resolveOrCreateContact } from "@/lib/crm/contacts";

export type InboxPlatform = "facebook_messenger" | "instagram_dm" | "facebook_comment" | "instagram_comment" | "whatsapp";

/** Escribe en IntegrationAssetCache para que el próximo mensaje sea O(1) en vez de O(N-tenants). */
async function cacheAssetWorkspace(externalId: string, kind: "page" | "ig_account", workspaceId: string): Promise<void> {
  try {
    // El @@unique es [integrationId, assetType, externalId] — como no tenemos integrationId aquí,
    // hacemos un updateMany + create condicional (no upsert sin la clave compuesta).
    const updated = await prisma.integrationAssetCache.updateMany({
      where: { assetType: kind, externalId, workspaceId },
      data: { syncedAt: new Date() },
    });
    if (updated.count === 0) {
      // No existe aún — crear con integrationId vacío (es para el cache de ruteo, no para sync).
      await prisma.integrationAssetCache.create({
        data: {
          integrationId: `inbox-auto:${workspaceId}`,
          workspaceId,
          provider: "meta",
          assetType: kind,
          externalId,
          name: externalId,  // placeholder — se sobreescribe al sincronizar assets
          metadata: {},
        },
      }).catch(() => {/* race condition: ya existe — ignorar */});
    }
  } catch {
    // No crítico — el siguiente mensaje hará el scan de nuevo.
  }
}

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
  if (src?.project?.workspaceId) {
    // Write-back para que el siguiente mensaje sea un cache hit.
    void cacheAssetWorkspace(externalId, kind, src.project.workspaceId);
    return src.project.workspaceId;
  }

  // 3. Fallback: Channel.config — buscar en la configuración de canales
  //    del proyecto (mismo camino que usa createAlert/findProjectsForEvent).
  //    Esto cubre el caso donde el asset sync no corrió pero el proyecto
  //    tiene la página configurada como fuente de datos.
  try {
    const channels = await prisma.channel.findMany({
      where: { type: { in: ["FACEBOOK", "META"] } },
      select: {
        config: true,
        project: { select: { workspaceId: true, status: true } },
      },
    });
    for (const ch of channels) {
      if (ch.project.status !== "Activo") continue;
      const cfg = ch.config as Record<string, unknown> | null;
      if (!cfg) continue;
      // Verificar pageId directo o en arrays pages[]/instagramAccounts[]
      if (kind === "page") {
        if (cfg.pageId === externalId || cfg.pageId === normalized) {
          void cacheAssetWorkspace(externalId, kind, ch.project.workspaceId);
          return ch.project.workspaceId;
        }
        const pages = cfg.pages as Array<{ id: string }> | undefined;
        if (pages?.some((p) => ids.includes(p.id))) {
          void cacheAssetWorkspace(externalId, kind, ch.project.workspaceId);
          return ch.project.workspaceId;
        }
      } else {
        if (cfg.igAccountId === externalId || cfg.igAccountId === normalized) {
          void cacheAssetWorkspace(externalId, kind, ch.project.workspaceId);
          return ch.project.workspaceId;
        }
        const accounts = cfg.instagramAccounts as Array<{ id: string }> | undefined;
        if (accounts?.some((a) => ids.includes(a.id))) {
          void cacheAssetWorkspace(externalId, kind, ch.project.workspaceId);
          return ch.project.workspaceId;
        }
      }
    }
  } catch (err) {
    logger.warn("[INBOX-STORE] Channel fallback query failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 4. Fallback: Integration credentials (en caso de que sync-assets fallara o se retrasara)
  try {
    const metaIntegrations = await prisma.integration.findMany({
      where: { provider: { startsWith: "meta" } },
      select: { workspaceId: true, credentials: true }
    });
    for (const integ of metaIntegrations) {
      const creds = integ.credentials as any;
      if (!creds?.pages || !Array.isArray(creds.pages)) continue;
      
      const found = creds.pages.some((p: any) => {
        if (kind === "page") return p.id === externalId || p.id === normalized;
        return p.instagramId === externalId || p.instagramId === normalized;
      });
      
      if (found) {
        void cacheAssetWorkspace(externalId, kind, integ.workspaceId);
        return integ.workspaceId;
      }
    }
  } catch (err) {
    logger.warn("[INBOX-STORE] Integration credentials fallback failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Si llegamos aquí, no pudimos resolver el workspace → el mensaje se descartará.
  logger.warn("[INBOX-STORE] resolveWorkspaceForMetaAsset: no workspace found", {
    externalId,
    kind,
    hint: "La página/cuenta IG no está en IntegrationAssetCache, MetaSource, MetaChannel ni Integration credentials. "
        + "Verifica que la página esté conectada correctamente.",
  });

  return null;
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
  /** Override for conversation ID (e.g. post ID for comments). Defaults to contactId */
  conversationExternalId?: string;
  attachments?: any[];
  /** mid del mensaje al que se responde (Messenger reply-to / message_context). */
  replyToId?: string | null;
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

    const convExternalId = m.conversationExternalId || m.contactId;

    // CRM: resolver/crear el Contact unificado para el remitente (best-effort). Solo para
    // mensajes entrantes de un usuario real (no ecos de la página).
    let resolvedContactId: string | null = null;
    if (isUser && m.contactId) {
      resolvedContactId = await resolveOrCreateContact({
        workspaceId: m.workspaceId,
        platform: m.platform,
        externalId: m.contactId,
        name: m.contactName,
        avatar: m.contactAvatar,
      });
    }

    const conversation = await prisma.inboxConversation.upsert({
      where: { workspaceId_externalId: { workspaceId: m.workspaceId, externalId: convExternalId } },
      update: {
        platform: m.platform,
        pageId: m.pageId,
        lastMessage: preview,
        lastMessageAt: when,
        // Solo marca no-leído si el mensaje es del usuario (no si es nuestro eco).
        ...(isUser ? { unread: true } : {}),
        ...(m.contactName ? { contactName: m.contactName } : {}),
        ...(m.contactAvatar ? { contactAvatar: m.contactAvatar } : {}),
        ...(resolvedContactId ? { contactId: resolvedContactId } : {}),
        updatedAt: new Date(),
      },
      create: {
        workspaceId: m.workspaceId,
        platform: m.platform,
        externalId: convExternalId,
        pageId: m.pageId,
        igId: m.platform === "instagram_dm" || m.platform === "instagram_comment" ? m.pageId : null,
        contactName: m.contactName ?? m.contactId,
        contactAvatar: m.contactAvatar ?? null,
        contactId: resolvedContactId,
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
        attachments: m.attachments ? m.attachments : undefined,
        replyToId: m.replyToId ?? null,
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
