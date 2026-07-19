/**
 * BotMaker channels: listing, caching, and platform normalization.
 */

import prisma from "@/lib/prisma";
import { botmakerFetch } from "./connection";
import type {
  BotmakerConnection,
  BmChannelInfo,
  BotmakerChannelsResult,
  ChannelCanonical,
} from "./types";

/** Mapea el `platform` de un canal Botmaker a su forma canónica (incluye webchat). */
function channelCanonical(platform?: string | null): ChannelCanonical | null {
  const p = (platform || "").toLowerCase().trim();
  if (!p) return null;
  if (
    p.includes("whats") ||
    p.includes("wapp") ||
    p === "wa" ||
    p === "waba" ||
    p === "wsp" ||
    p === "wpp"
  )
    return "whatsapp";
  if (p.includes("insta") || p === "ig") return "instagram";
  if (p.includes("messenger") || p === "fbm") return "messenger";
  if (p.includes("facebook") || p === "fb" || p === "fbk") return "facebook";
  if (
    p.includes("web") ||
    p.includes("chat") ||
    p.includes("widget") ||
    p === "api" ||
    p === "botmaker"
  )
    return "webchat";
  return null;
}

/**
 * Canónico de un canal con INFERENCIA por forma cuando el `platform` no se
 * reconoce: si trae número de teléfono → WhatsApp; si no → Web Chat.
 */
function resolveChannelCanonical(
  platform: string,
  number?: string
): ChannelCanonical {
  return channelCanonical(platform) ?? (number ? "whatsapp" : "webchat");
}

/**
 * Descarga y parsea `/channels` devolviendo además metadatos para diagnóstico.
 * Tolera múltiples shapes (items/channels/data/result/arreglo plano) y campos
 * alternos, e INFIERE el canónico cuando el `platform` no se reconoce.
 */
export async function fetchBotmakerChannels(
  conn: BotmakerConnection
): Promise<BotmakerChannelsResult> {
  const res = await botmakerFetch("/channels", conn.accessToken, {}, 2, conn.baseUrl);
  if (!res.ok) {
    console.warn(`[BOTMAKER] /channels HTTP ${res.status}`);
    return { channels: [], rawCount: 0, platforms: [], httpStatus: res.status };
  }
  const data = await res.json().catch(() => null);
  const raw = Array.isArray(data)
    ? data
    : (data?.items ?? data?.channels ?? data?.data ?? data?.result ?? []);
  const items = (Array.isArray(raw) ? raw : []) as Record<string, unknown>[];
  const str = (v: unknown): string => (typeof v === "string" ? v : "");
  const channels = items
    .map((c) => {
      const platform = str(c.platform) || str(c.type) || str(c.channelType);
      const number =
        str(c.number) || str(c.phoneNumber) || str(c.phone) || undefined;
      return {
        id: str(c.id) || str(c.channelId) || str(c._id),
        platform,
        canonical: resolveChannelCanonical(platform, number),
        name: str(c.name) || str(c.displayName) || str(c.title),
        number,
        active: c.active !== false && c.enabled !== false,
      };
    })
    .filter((c) => c.id);
  const platforms = [
    ...new Set(
      items
        .map((c) => str(c.platform) || str(c.type) || str(c.channelType))
        .filter(Boolean)
    ),
  ];
  if (channels.length === 0) {
    const keys =
      data && typeof data === "object"
        ? Object.keys(data).join(",")
        : typeof data;
    console.warn(
      `[BOTMAKER] /channels sin canales tras parsear (keys=${keys}, raw=${items.length})`
    );
  }
  return { channels, rawCount: items.length, platforms, httpStatus: res.status };
}

export async function listBotmakerChannels(
  conn: BotmakerConnection
): Promise<BmChannelInfo[]> {
  return (await fetchBotmakerChannels(conn)).channels;
}

/**
 * Persiste los canales del bot en `IntegrationAssetCache` (assetType "bot") al
 * CONECTAR la integración, para que el formulario "Nuevo Proyecto" los tenga
 * disponibles de inmediato (y como respaldo si la API en vivo falla/tarda).
 */
export async function cacheBotmakerChannels(
  integrationId: string,
  workspaceId: string,
  channels: BmChannelInfo[]
): Promise<void> {
  for (const c of channels) {
    if (!c.id) continue;
    const metadata = {
      platform: c.platform,
      number: c.number ?? null,
      active: c.active,
    };
    await prisma.integrationAssetCache.upsert({
      where: {
        integrationId_assetType_externalId: {
          integrationId,
          assetType: "bot",
          externalId: c.id,
        },
      },
      update: { name: c.name || c.id, metadata, syncedAt: new Date() },
      create: {
        integrationId,
        workspaceId,
        provider: "botmaker",
        assetType: "bot",
        externalId: c.id,
        name: c.name || c.id,
        metadata,
      },
    });
  }
}

/**
 * Lee los canales del bot cacheados y los reconstruye al mismo contrato que
 * `listBotmakerChannels`. Respaldo para cuando la API en vivo no responde.
 */
export async function getCachedBotmakerChannels(
  workspaceId: string
): Promise<BmChannelInfo[]> {
  try {
    const rows = await prisma.integrationAssetCache.findMany({
      where: { workspaceId, provider: "botmaker", assetType: "bot" },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => {
      const meta = (r.metadata as Record<string, unknown>) || {};
      const platform = String(meta.platform ?? "");
      const number =
        typeof meta.number === "string"
          ? meta.number
          : typeof meta.phoneNumber === "string"
          ? meta.phoneNumber
          : undefined;
      return {
        id: r.externalId,
        platform,
        canonical: resolveChannelCanonical(platform, number),
        name: r.name || r.externalId,
        number,
        active: meta.active !== false,
      };
    });
  } catch {
    return [];
  }
}
