import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

const META_V = process.env.META_API_VERSION || "v25.0";

/**
 * GET /api/analytics/stories
 *
 * Fetches Instagram Story insights for all IG business accounts in the workspace.
 * Auto-detects IG accounts from connected Facebook Pages.
 *
 * Query params (all optional):
 *   igUserId: string — specific IG account (auto-detected if omitted)
 *   pageIds: string — comma-separated FB page IDs to filter
 *   platform: string — "facebook" | "instagram" (stories only exists for instagram)
 *
 * Returns: { stories: [...], total: number }
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

    // If platform=facebook, stories don't exist for FB
    const platformParam = req.nextUrl.searchParams.get("platform") || "all";
    const explicitIgUserId = req.nextUrl.searchParams.get("igUserId");
    const pageIdsParam = req.nextUrl.searchParams.get("pageIds");
    const forceParam = req.nextUrl.searchParams.get("force") === "true";

    // ── CACHE READ ──
    const paramsKey = `platform=${platformParam}&igUserId=${explicitIgUserId || "none"}`;
    const cached = await prisma.metaAnalyticsCache.findUnique({
      where: {
        workspaceId_endpoint_paramsKey: {
          workspaceId,
          endpoint: "stories",
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
      return NextResponse.json({ stories: [], total: 0 });
    }

    // AN-3 FIX: Auto-detect IG accounts from connected pages
    let igUserIds: string[] = [];
    if (explicitIgUserId) {
      igUserIds = [explicitIgUserId];
    } else {
      // Fetch pages to discover IG business accounts
      const pagesUrl = metaUrl("me/accounts", {
        fields: "id,instagram_business_account",
        limit: "100",
      });
      const pagesRes = await metaFetch(pagesUrl, token);
      if (pagesRes.ok) {
        const pagesJson = await pagesRes.json();
        let pages: any[] = pagesJson.data || [];

        // Apply pageIds filter if provided
        if (pageIdsParam) {
          const allowedIds = pageIdsParam.split(",").map((id: string) => id.trim());
          pages = pages.filter((p: any) => allowedIds.includes(p.id));
        }

        igUserIds = pages
          .map((p) => p.instagram_business_account?.id)
          .filter(Boolean) as string[];
      }
    }

    if (!igUserIds.length) {
      return NextResponse.json({ stories: [], total: 0, message: "No hay cuentas de Instagram Business conectadas" });
    }

    // Fetch stories from all IG accounts (limit to first 5 to avoid timeout)
    const allStories: any[] = [];
    const accountsToProcess = igUserIds.slice(0, 5);

    const results = await Promise.allSettled(
      accountsToProcess.map(async (igUserId) => {
        const res = await metaFetch(
          `https://graph.facebook.com/${META_V}/${igUserId}/stories?fields=id,timestamp,media_url,media_type,insights.metric(exits,views,reach,replies,taps_forward,taps_back){name,values}`,
          token
        );
        const data = await res.json();
        if (!res.ok || data.error) {
          logger.error(`[STORIES] Error for ${igUserId}:`, data?.error?.message);
          return [];
        }
        // Normalize to the FLAT shape the frontend (TabHistorias / StoryData)
        // reads as top-level fields. Returning metrics nested under `insights`
        // left story.impressions undefined and crashed on `.toLocaleString()`.
        return (data.data || []).map((story: any) => {
          const insights: Record<string, number> = {};
          if (story.insights?.data) {
            for (const metric of story.insights.data) {
              insights[metric.name] = Number(metric.values?.[0]?.value) || 0;
            }
          }
          const impressions = insights.views || insights.impressions || 0;
          const reach = insights.reach || 0;
          const exits = insights.exits || 0;
          const replies = insights.replies || 0;
          const tapsForward = insights.taps_forward || 0;
          const tapsBack = insights.taps_back || 0;
          // Completion rate ≈ portion that did NOT exit early, clamped to 0–100.
          const completionRate = impressions > 0
            ? Math.max(0, Math.min(100, (1 - exits / impressions) * 100))
            : 0;
          return {
            id: story.id,
            timestamp: story.timestamp,
            mediaUrl: story.media_url || null,
            mediaType: story.media_type || null,
            impressions,
            reach,
            exits,
            replies,
            tapsForward,
            tapsBack,
            completionRate,
          };
        });
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        allStories.push(...r.value);
      }
    }

    // Sort by timestamp descending
    allStories.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const responseData = { stories: allStories, total: allStories.length };

    // ── CACHE WRITE ──
    await prisma.metaAnalyticsCache.upsert({
      where: {
        workspaceId_endpoint_paramsKey: {
          workspaceId,
          endpoint: "stories",
          paramsKey,
        },
      },
      update: { data: responseData as any, updatedAt: now },
      create: { workspaceId, endpoint: "stories", paramsKey, data: responseData as any },
    }).catch((err: any) => logger.error("[STORIES] Cache save error:", err));

    return NextResponse.json({ ...responseData, cached: false });
  } catch (err: any) {
    logger.error("[ANALYTICS/STORIES] Error:", err.message);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}

export const maxDuration = 30;
