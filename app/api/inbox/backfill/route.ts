import { NextResponse } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * POST /api/inbox/backfill
 *
 * Siembra en la DB las conversaciones DM recientes (Messenger + IG DM) desde la
 * Graph API, para que el histórico previo al webhook aparezca en el inbox. Es la
 * ÚNICA ruta que hace el trabajo pesado de Graph; la lista (/conversations) solo
 * lee de la DB. Se llama una vez al montar el inbox y desde un botón "Sincronizar".
 *
 * Throttle: como mucho una corrida cada BACKFILL_TTL_MS por workspace (evita que un
 * cliente que la invoque en loop machaque la Graph API). Nivel-lista: NO baja los
 * mensajes de cada hilo (eso ocurre bajo demanda al abrir la conversación).
 */

const BACKFILL_TTL_MS = 120 * 1000;
const CACHE_ENDPOINT = "inbox-backfill";

export const POST = withWorkspace(async (request, ctx) => {
  const workspaceId = ctx.workspaceId;

  // ── Throttle por workspace ──
  const state = await prisma.metaAnalyticsCache.findUnique({
    where: { workspaceId_endpoint_paramsKey: { workspaceId, endpoint: CACHE_ENDPOINT, paramsKey: "state" } },
  });
  if (state && Date.now() - new Date(state.updatedAt).getTime() < BACKFILL_TTL_MS) {
    return NextResponse.json({ ok: true, throttled: true, upserted: 0 });
  }
  await prisma.metaAnalyticsCache.upsert({
    where: { workspaceId_endpoint_paramsKey: { workspaceId, endpoint: CACHE_ENDPOINT, paramsKey: "state" } },
    update: { data: { at: new Date().toISOString() } },
    create: { workspaceId, endpoint: CACHE_ENDPOINT, paramsKey: "state", data: { at: new Date().toISOString() } },
  }).catch(() => {});

  const [fbToken, igToken] = await Promise.all([
    getMetaAccessToken(request, "inbox").catch(() => null),
    getMetaAccessToken(request, "ig_inbox").catch(() => null),
  ]);
  if (!fbToken && !igToken) return NextResponse.json({ error: "No Meta token" }, { status: 401 });

  const skipped: { channel: string; reason: string }[] = [];
  let upserted = 0;

  async function upsertConversation(input: {
    platform: "facebook_messenger" | "instagram_dm";
    pageId: string;
    contactId: string;
    contactName: string;
    contactAvatar: string | null;
    lastMessage: string;
    lastMessageAt: Date;
  }) {
    await prisma.inboxConversation.upsert({
      where: { workspaceId_externalId: { workspaceId: workspaceId as string, externalId: input.contactId } },
      update: {
        platform: input.platform,
        pageId: input.pageId,
        // No pisar un preview/tiempo más nuevo que ya trajo el webhook.
        contactName: input.contactName,
        ...(input.contactAvatar ? { contactAvatar: input.contactAvatar } : {}),
      },
      create: {
        workspaceId: workspaceId as string,
        platform: input.platform,
        externalId: input.contactId,
        pageId: input.pageId,
        igId: input.platform === "instagram_dm" ? input.pageId : null,
        contactName: input.contactName,
        contactAvatar: input.contactAvatar,
        lastMessage: input.lastMessage.slice(0, 255),
        lastMessageAt: input.lastMessageAt,
        unread: false,
        status: "open",
        tags: [],
      },
    });
    upserted++;
  }

  // ── Facebook Messenger ──
  if (fbToken) {
    try {
      const pagesRes = await metaFetch(
        metaUrl("me/accounts", { fields: "id,name,access_token", limit: "100" }),
        fbToken,
        { cache: "no-store" },
      );
      const pages = (await pagesRes.json())?.data ?? [];
      await Promise.allSettled(
        pages.map(async (page: { id: string; name: string; access_token?: string }) => {
          if (!page.access_token) return;
          const r = await metaFetch(
            metaUrl(`${page.id}/conversations`, {
              fields: "participants,updated_time,messages.limit(1){message,from,created_time}",
              limit: "50",
            }),
            page.access_token,
            { cache: "no-store" },
          );
          if (!r.ok) { skipped.push({ channel: `messenger:${page.id}`, reason: `HTTP ${r.status}` }); return; }
          const data = await r.json();
          for (const conv of data?.data ?? []) {
            const other = conv.participants?.data?.find((p: { id: string }) => p.id !== page.id);
            if (!other?.id) continue;
            const last = conv.messages?.data?.[0];
            await upsertConversation({
              platform: "facebook_messenger",
              pageId: page.id,
              contactId: other.id,
              contactName: other.name || "Usuario",
              contactAvatar: null,
              lastMessage: last?.message || "",
              lastMessageAt: new Date(conv.updated_time || last?.created_time || Date.now()),
            });
          }
        }),
      );
    } catch (err) {
      skipped.push({ channel: "messenger", reason: err instanceof Error ? err.message : String(err) });
    }
  }

  // ── Instagram DM ──
  if (igToken) {
    try {
      const pagesRes = await metaFetch(
        metaUrl("me/accounts", { fields: "id,name,access_token,instagram_business_account{id,username}", limit: "100" }),
        igToken,
        { cache: "no-store" },
      );
      const pages = (await pagesRes.json())?.data ?? [];
      await Promise.allSettled(
        pages.map(async (page: { id: string; access_token?: string; instagram_business_account?: { id: string } }) => {
          const igId = page.instagram_business_account?.id;
          if (!page.access_token || !igId) return;
          const r = await metaFetch(
            metaUrl(`${igId}/conversations`, {
              fields: "participants,updated_time,messages.limit(1){message,from,created_time}",
              platform: "instagram",
              limit: "50",
            }),
            page.access_token,
            { cache: "no-store" },
          );
          if (!r.ok) { skipped.push({ channel: `ig_dm:${igId}`, reason: `HTTP ${r.status}` }); return; }
          const data = await r.json();
          for (const conv of data?.data ?? []) {
            const other = conv.participants?.data?.find((p: { id: string }) => p.id !== igId);
            if (!other?.id) continue;
            const last = conv.messages?.data?.[0];
            await upsertConversation({
              platform: "instagram_dm",
              pageId: igId,
              contactId: other.id,
              contactName: other.username || other.name || "Usuario IG",
              contactAvatar: null,
              lastMessage: last?.message || "",
              lastMessageAt: new Date(conv.updated_time || last?.created_time || Date.now()),
            });
          }
        }),
      );
    } catch (err) {
      skipped.push({ channel: "ig_dm", reason: err instanceof Error ? err.message : String(err) });
    }
  }

  logger.info("[INBOX] Backfill done", { workspaceId, upserted, skipped: skipped.length });
  return NextResponse.json({ ok: true, upserted, skipped });
});
