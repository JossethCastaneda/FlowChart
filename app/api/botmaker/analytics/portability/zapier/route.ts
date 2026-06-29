import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

/**
 * GET /api/botmaker/analytics/portability/zapier
 *
 * Returns Zapier and Ads attribution analytics:
 * - Zapier event status breakdown
 * - ga_cid / igPostId / fbclid presence
 * - Breakdown by platform target (meta_ads, google_ads)
 * - Top igPostId conversions
 */
export const GET = withWorkspace(async (req: NextRequest, { workspaceId }) => {
  try {
    const url = new URL(req.url);
    const from = new Date(url.searchParams.get("from") ?? new Date(Date.now() - 7 * 86400000).toISOString());
    const to = new Date(url.searchParams.get("to") ?? new Date().toISOString());
    const botId = url.searchParams.get("botId") ?? undefined;
    const channelId = url.searchParams.get("channelId") ?? undefined;
    const productType = url.searchParams.get("productType") ?? undefined;

    const leadWhere = {
      workspaceId: workspaceId,
      startedAt: { gte: from, lte: to },
      ...(botId ? { botId } : {}),
      ...(channelId ? { channelId } : {}),
      ...(productType ? { productType } : {}),
    };

    const [
      totalEvents,
      byStatus,
      byPlatform,
      withGaCid,
      withGclid,
      withFbclid,
      withIgPostId,
      topIgPosts,
      topFromNames,
    ] = await Promise.all([
      prisma.zapierConversionEvent.count({ where: { leadRequest: { ...leadWhere } } }),

      prisma.zapierConversionEvent.groupBy({
        by: ["status"],
        where: { leadRequest: { ...leadWhere } },
        _count: { id: true },
      }),

      prisma.zapierConversionEvent.groupBy({
        by: ["platformTarget"],
        where: { leadRequest: { ...leadWhere } },
        _count: { id: true },
      }),

      prisma.zapierConversionEvent.count({ where: { gaCid: { not: null }, leadRequest: { ...leadWhere } } }),
      prisma.zapierConversionEvent.count({ where: { gclid: { not: null }, leadRequest: { ...leadWhere } } }),
      prisma.zapierConversionEvent.count({ where: { fbclid: { not: null }, leadRequest: { ...leadWhere } } }),
      prisma.zapierConversionEvent.count({ where: { igPostId: { not: null }, leadRequest: { ...leadWhere } } }),

      // Top 10 posts by conversion
      prisma.zapierConversionEvent.groupBy({
        by: ["igPostId"],
        where: { igPostId: { not: null }, status: "success", leadRequest: { ...leadWhere } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),

      // Top 10 fromNames (influencer/referrer)
      prisma.zapierConversionEvent.groupBy({
        by: ["fromName"],
        where: { fromName: { not: null }, leadRequest: { ...leadWhere } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
    ]);

    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 10000) / 100 : 0);

    return apiSuccess({
      from: from.toISOString(),
      to: to.toISOString(),
      totalEvents,
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count.id])),
      byPlatform: Object.fromEntries(byPlatform.map((r) => [r.platformTarget, r._count.id])),
      attributionSignals: {
        withGaCid,
        withGclid,
        withFbclid,
        withIgPostId,
        gaCidRate: pct(withGaCid, totalEvents),
        gclidRate: pct(withGclid, totalEvents),
        fbclidRate: pct(withFbclid, totalEvents),
        igPostIdRate: pct(withIgPostId, totalEvents),
      },
      topIgPosts: topIgPosts.map((r) => ({ igPostId: r.igPostId, conversions: r._count.id })),
      topFromNames: topFromNames.map((r) => ({ fromName: r.fromName, events: r._count.id })),
    });
  } catch (err) {
    console.error("[portability/zapier]", err);
    return apiError("Error calculando métricas de Zapier y Ads", "ANALYTICS_ERROR", 500);
  }
});

