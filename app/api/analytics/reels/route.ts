import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

const META_V = process.env.META_API_VERSION || "v25.0";

/**
 * GET /api/analytics/reels
 *
 * Fetches Instagram Reel insights for all IG business accounts in the workspace.
 * Auto-detects IG accounts from connected Facebook Pages.
 *
 * Query params (all optional):
 *   igUserId: string — specific IG account (auto-detected if omitted)
 *   pageIds: string — comma-separated FB page IDs to filter
 *   platform: string — "facebook" | "instagram" (reels only exist for instagram)
 *   limit: number — default 25, max 100
 *
 * Returns: { reels: [...], total: number }
 */
export async function GET(req: NextRequest) {
  try {
    const jwt = await getToken({ req });
    if (!jwt?.sub) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(jwt.sub);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    let token = await getMetaAccessToken(req, "analytics");
    if (!token) token = await getMetaAccessToken(req, "social");
    if (!token) token = await getMetaAccessToken(req, "publisher_facebook");
    if (!token) token = await getMetaAccessToken(req);
    if (!token) {
      return NextResponse.json(
        { error: "No hay token Meta. Ve a Integraciones y conecta tu cuenta." },
        { status: 401 }
      );
    }

    // If platform=facebook, reels don't exist for FB (they're IG only)
    const platformParam = req.nextUrl.searchParams.get("platform") || "all";
    const pageIdsParam = req.nextUrl.searchParams.get("pageIds");
    const explicitIgUserId = req.nextUrl.searchParams.get("igUserId");

    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") || "25", 10),
      100
    );

    // ── CACHE READ ──
    const forceParam = req.nextUrl.searchParams.get("force") === "true";

    // ── CACHE READ ──
    const paramsKey = `limit=${limit}&igUserId=${req.nextUrl.searchParams.get("igUserId") || "all"}&pageIds=${req.nextUrl.searchParams.get("pageIds") || "all"}&platform=${platformParam}`;
    const cached = await prisma.metaAnalyticsCache.findUnique({
      where: {
        workspaceId_endpoint_paramsKey: {
          workspaceId,
          endpoint: "reels",
          paramsKey,
        },
      },
    });

    const now = new Date();
    // 30 min de TTL
    if (!forceParam && cached && (now.getTime() - cached.updatedAt.getTime()) < 30 * 60 * 1000) {
      return NextResponse.json({ ...((cached.data as any) || {}), cached: true });
    }

    if (platformParam === "facebook") {
      return NextResponse.json({ reels: [], total: 0 });
    }

    // M1 FIX: Auto-detect IG accounts from connected pages
    let igUserIds: string[] = [];

    if (explicitIgUserId) {
      igUserIds = [explicitIgUserId];
    } else {
      const pagesUrl = metaUrl("me/accounts", {
        fields: "id,instagram_business_account",
        limit: "100",
      });
      const pagesRes = await metaFetch(pagesUrl, token);
      if (pagesRes.ok) {
        const pagesJson = await pagesRes.json();
        let pages: any[] = pagesJson.data || [];

        if (pageIdsParam) {
          const allowedIds = pageIdsParam.split(",").map((id) => id.trim());
          pages = pages.filter((p) => allowedIds.includes(p.id));
        }

        igUserIds = pages
          .map((p) => p.instagram_business_account?.id)
          .filter(Boolean) as string[];
      }
    }

    if (!igUserIds.length) {
      return NextResponse.json({ reels: [], total: 0, message: "No hay cuentas de Instagram Business conectadas" });
    }

    // Fetch reels from all IG accounts (limit to first 5 to avoid timeout)
    const allReels: any[] = [];
    const accountsToProcess = igUserIds.slice(0, 5);

    const results = await Promise.allSettled(
      accountsToProcess.map(async (igUserId) => {
        const res = await metaFetch(
          `https://graph.facebook.com/${META_V}/${igUserId}/media?fields=id,timestamp,caption,media_type,media_url,thumbnail_url,permalink,insights.metric(comments,likes,views,reach,saved,shares,total_interactions){name,values}&limit=${limit}`,
          token
        );
        const data = await res.json();
        if (!res.ok || data.error) {
          logger.error(`[REELS] Error for ${igUserId}:`, data?.error?.message);
          return [];
        }
        // Filter to only VIDEO (Reels) and normalize.
        // IMPORTANT: the frontend (TabReels / ReelData) reads metrics as
        // TOP-LEVEL fields (reel.plays, reel.engagementRate, ...). Returning
        // them nested under `insights` made reel.plays undefined and crashed
        // the tab on `reel.plays.toLocaleString()`. Flatten + compute eng. rate.
        return (data.data || [])
          .filter((m: any) => m.media_type === "VIDEO")
          .map((reel: any) => {
            const insights: Record<string, number> = {};
            if (reel.insights?.data) {
              for (const metric of reel.insights.data) {
                insights[metric.name] = Number(metric.values?.[0]?.value) || 0;
              }
            }
            const plays = insights.views || insights.plays || 0;
            const reach = insights.reach || 0;
            const likes = insights.likes || 0;
            const comments = insights.comments || 0;
            const saved = insights.saved || 0;
            const shares = insights.shares || 0;
            const interactions = insights.total_interactions || (likes + comments + saved + shares);
            const denominator = reach || plays;
            const engagementRate = denominator > 0
              ? parseFloat(((interactions / denominator) * 100).toFixed(2))
              : 0;
            return {
              id: reel.id,
              timestamp: reel.timestamp,
              caption: reel.caption || "",
              mediaUrl: reel.media_url || null,
              thumbnailUrl: reel.thumbnail_url || reel.media_url || null,
              permalink: reel.permalink || null,
              plays,
              reach,
              likes,
              comments,
              saved,
              shares,
              engagementRate,
            };
          });
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        allReels.push(...r.value);
      }
    }

    // Sort by timestamp descending
    allReels.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const responseData = { reels: allReels, total: allReels.length };

    // ── CACHE WRITE ──
    await prisma.metaAnalyticsCache.upsert({
      where: {
        workspaceId_endpoint_paramsKey: {
          workspaceId,
          endpoint: "reels",
          paramsKey,
        },
      },
      update: { data: responseData as any, updatedAt: now },
      create: { workspaceId, endpoint: "reels", paramsKey, data: responseData as any },
    }).catch((err: any) => logger.error("[REELS] Cache save error:", err));

    return NextResponse.json({ ...responseData, cached: false });
  } catch (err: any) {
    logger.error("[ANALYTICS/REELS] Error:", err.message);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}

export const maxDuration = 30;
