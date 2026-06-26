import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getBotmakerConnection, botmakerFetch } from "@/lib/botmaker";
import prisma from "@/lib/prisma";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

function resolveInstagramUsername(name: string): string {
  const cleanName = name.replace(/^IG\s*-\s*/i, "").trim();
  if (cleanName === "Cambia fácil") return "_cambiafacil";
  if (cleanName === "Centro de Portabilidad") return "centrodeportabilidad";
  return cleanName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_.-]/g, "");
}

/**
 * GET /api/botmaker/channels — list the workspace's BotMaker channels.
 * Used to link a channel to the project's WhatsApp/Messenger/IG.
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request, secret: AUTH_SECRET });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const conn = await getBotmakerConnection(workspaceId);
  if (!conn) return NextResponse.json({ connected: false, channels: [] });

// Dictionary of known WhatsApp numbers to descriptive aliases
const WHATSAPP_NAMES: Record<string, string> = {
  "5216624982373": "Bot Izquierda Guerrilla",
  "52166249823373": "Bot Izquierda Guerrilla",
  "5217226200493": "Activaciones Lira",
  "5215616447771": "Temm Prepago Alineado",
  "5215573046529": "TEMM Pospago Agente",
  "5215549547446": "Bait Prepago Parque Lira",
  "5217226643456": "(Bloqueado) BAIT PREPAGO LIRA 2",
  "5215611003120": "Bot Biométricos",
  "5215519312878": "Google Bait Pospago",
  "5215568697435": "Pospago OCR"
};

  // Fetch Meta asset names for resolution
  const metaNames: Record<string, string> = {};
  const projectWhatsappMap: Record<string, string> = {};

  try {
    // 1. From asset cache (globally for all workspaces as a lookup fallback)
    const cachedAssets = await prisma.integrationAssetCache.findMany({
      where: {
        assetType: { in: ["page", "ig_account", "bot"] },
      },
    });
    for (const asset of cachedAssets) {
      if (asset.assetType === "page" && asset.name) {
        metaNames[asset.externalId] = asset.name;
      } else if (asset.assetType === "ig_account" && asset.name) {
        metaNames[asset.externalId] = resolveInstagramUsername(asset.name);
      } else if (asset.assetType === "bot" && asset.name) {
        metaNames[asset.externalId] = asset.name;
      }
    }

    // 2. From integrations globally
    const integrations = await prisma.integration.findMany({
      where: {
        provider: { in: ["meta", "meta_community", "meta_social"] },
        connected: true,
      },
    });
    for (const integ of integrations) {
      const creds = integ.credentials as any;
      if (creds && Array.isArray(creds.pages)) {
        for (const p of creds.pages) {
          if (p.id && p.name) {
            metaNames[p.id] = p.name;
          }
          if (p.instagramId) {
            metaNames[p.instagramId] = resolveInstagramUsername(p.name);
          }
        }
      }
    }

    // 3. From projects in active workspace (for mapping custom WA numbers)
    const projects = await prisma.project.findMany({
      where: { workspaceId }
    });
    for (const proj of projects) {
      if (Array.isArray(proj.whatsapp)) {
        for (const num of proj.whatsapp) {
          const cleanNum = num.replace(/\D/g, "");
          if (cleanNum) {
            projectWhatsappMap[cleanNum] = proj.name;
          }
        }
      }
    }
  } catch (err) {
    console.error("Error fetching Meta assets for resolution:", err);
  }

  try {
    let channelsList: any[] = [];
    const res = await botmakerFetch("/channels", conn.accessToken, {}, 2, conn.baseUrl);
    if (res.ok) {
      const data = await res.json();
      channelsList = data.items || data || [];
    } else {
      console.warn(`BotMaker channels API failed with ${res.status}. Falling back to DB bots cache.`);
    }

    // Load cached bots to merge/supplement in case API failed or lacks some channels
    const cachedBots = await prisma.integrationAssetCache.findMany({
      where: { assetType: "bot" }
    });

    const channelsMap = new Map<string, any>();
    for (const c of channelsList) {
      channelsMap.set(c.id, c);
    }
    for (const b of cachedBots) {
      if (!channelsMap.has(b.externalId)) {
        const metadata = (b.metadata as any) || {};
        channelsMap.set(b.externalId, {
          id: b.externalId,
          name: b.name,
          platform: metadata.platform || (b.externalId.includes("whatsapp") ? "whatsapp" : b.externalId.includes("messenger") ? "messenger" : b.externalId.includes("facebook") ? "facebook" : b.externalId.includes("instagram") ? "instagram" : "webchat"),
          active: metadata.active ?? true
        });
      }
    }

    const items = Array.from(channelsMap.values()).map((c: any) => {
      const idParts = c.id.split('-');
      const lastPart = idParts[idParts.length - 1] || c.id;
      
      let platform = c.platform || "";
      let displayName = "";

      // Determine platform normalized label
      let platformLabel = "";
      if (platform.toLowerCase().includes("whatsapp") || c.id.includes("whatsapp")) {
        platformLabel = "whatsapp";
      } else if (platform.toLowerCase().includes("messenger") || c.id.includes("messenger")) {
        platformLabel = "messenger";
      } else if (platform.toLowerCase().includes("facebook") || c.id.includes("facebook")) {
        platformLabel = "Facebook";
      } else if (platform.toLowerCase().includes("instagram") || c.id.includes("instagram")) {
        platformLabel = "instagram";
      } else if (platform.toLowerCase().includes("webchat") || c.id.includes("webchat")) {
        platformLabel = "webchat";
      }

      if (platformLabel === "whatsapp") {
        const num = lastPart;
        const name = WHATSAPP_NAMES[num] || projectWhatsappMap[num] || (c.name && c.name !== c.id && !c.name.includes("whatsapp") ? c.name : "");
        displayName = name ? `whatsapp (${name} (${num}))` : `whatsapp (${num})`;
      } else if (platformLabel === "webchat") {
        const name = c.name && c.name !== c.id && !c.name.includes("webchat") ? c.name : "";
        displayName = name ? `webchat (${name} (${lastPart}))` : `webchat (${lastPart})`;
      } else if (platformLabel === "Facebook") {
        const pageName = metaNames[c.id] || metaNames[lastPart] || (c.name !== c.id ? c.name : lastPart);
        const botAlias = c.name && c.name !== c.id && c.name !== pageName ? c.name : "";
        displayName = botAlias ? `Facebook (${botAlias} (${pageName}))` : `Facebook (${pageName})`;
      } else if (platformLabel === "messenger") {
        const pageName = metaNames[c.id] || metaNames[lastPart] || (c.name !== c.id ? c.name : lastPart);
        const botAlias = c.name && c.name !== c.id && c.name !== pageName ? c.name : "";
        displayName = botAlias ? `messenger (${botAlias} (${pageName}))` : `messenger (${pageName})`;
      } else if (platformLabel === "instagram") {
        const rawName = metaNames[c.id] || metaNames[lastPart] || (c.name !== c.id ? c.name : lastPart);
        const username = resolveInstagramUsername(rawName);
        const botAlias = c.name && c.name !== c.id && c.name !== rawName && c.name !== username ? c.name : "";
        displayName = botAlias ? `instagram (${botAlias} (${username}))` : `instagram (${username})`;
      } else if (platformLabel) {
        displayName = `${platformLabel} (${lastPart})`;
      } else {
        displayName = `${c.name || c.id} (${lastPart})`;
      }

      return {
        id: c.id,
        name: c.name,
        platform: c.platform,
        active: c.active,
        displayName
      };
    });

    return NextResponse.json({ connected: true, channels: items, metaNames });
  } catch (e: any) {
    return NextResponse.json({ connected: false, error: e.message, channels: [] }, { status: 200 });
  }
}

