import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

/**
 * GET /api/botmaker/analytics/portability/intelix
 *
 * Returns Intelix CRM submission analytics:
 * - Acceptance / rejection / error / timeout counts
 * - Top rejection error codes
 * - Average latency
 * - Breakdown by bot, channel, product type
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

    const [statusGroups, latencyData, topErrors, byProduct, byBot] = await Promise.all([
      // Status breakdown
      prisma.intelixSubmission.groupBy({
        by: ["status"],
        where: { leadRequest: { ...leadWhere } },
        _count: { id: true },
      }),

      // Average latency
      prisma.intelixSubmission.aggregate({
        where: { leadRequest: { ...leadWhere }, latencyMs: { not: null } },
        _avg: { latencyMs: true },
        _min: { latencyMs: true },
        _max: { latencyMs: true },
      }),

      // Top error codes
      prisma.intelixSubmission.groupBy({
        by: ["intelixErrorCode", "intelixErrorMessage"],
        where: {
          status: { in: ["rejected", "error"] },
          leadRequest: { ...leadWhere },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 15,
      }),

      // By product type
      prisma.intelixSubmission.groupBy({
        by: ["productType", "status"],
        where: { leadRequest: { ...leadWhere } },
        _count: { id: true },
      }),

      // By bot
      prisma.botmakerLeadRequest.groupBy({
        by: ["botId", "leadStatus"],
        where: {
          ...leadWhere,
          leadStatus: { in: ["intelix_accepted", "intelix_rejected"] },
        },
        _count: { id: true },
      }),
    ]);

    const total = statusGroups.reduce((s, r) => s + r._count.id, 0);
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 10000) / 100 : 0);

    const byStatus = Object.fromEntries(statusGroups.map((r) => [r.status, r._count.id]));

    return apiSuccess({
      from: from.toISOString(),
      to: to.toISOString(),
      total,
      byStatus,
      rates: {
        acceptance: pct(byStatus["accepted"] ?? 0),
        rejection: pct(byStatus["rejected"] ?? 0),
        error: pct(byStatus["error"] ?? 0),
        timeout: pct(byStatus["timeout"] ?? 0),
      },
      latency: {
        avgMs: Math.round(latencyData._avg.latencyMs ?? 0),
        minMs: latencyData._min.latencyMs ?? 0,
        maxMs: latencyData._max.latencyMs ?? 0,
      },
      topErrors: topErrors.map((e) => ({
        code: e.intelixErrorCode,
        message: e.intelixErrorMessage,
        count: e._count.id,
      })),
      byProduct: byProduct.map((r) => ({
        productType: r.productType,
        status: r.status,
        count: r._count.id,
      })),
      byBot: byBot.map((r) => ({
        botId: r.botId,
        status: r.leadStatus,
        count: r._count.id,
      })),
    });
  } catch (err) {
    console.error("[portability/intelix]", err);
    return apiError("Error calculando métricas de Intelix", "ANALYTICS_ERROR", 500);
  }
});

