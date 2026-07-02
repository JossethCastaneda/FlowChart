import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { parseFilters, buildConversationWhere } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";
import { getAnalyticsDataset } from "@/lib/analytics/daily-metrics.server";
import { operationsSummaryFromAccumulators } from "@/lib/analytics/daily-metrics";

function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

// GET /api/analytics/operations — métricas operativas (spec §19)
// Summary + tendencias desde AGREGADOS históricos + día en vivo (fallback live).
// El desglose por cola (topQueuesByWait) requiere dimensión de cola, que el
// rollup diario aún no lleva → se calcula con una consulta ligera EN VIVO
// (TODO: agregar `queueName` a AnalyticsDailyMetric para rollup completo de colas).
export const GET = withWorkspace(async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const filters = parseFilters(sp);
  const scopeRes = await scopeFromRequest(sp, ctx.workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);

  const dataset = await getAnalyticsDataset(ctx.workspaceId, filters, scopeRes.scope);
  const summary = operationsSummaryFromAccumulators(dataset.acc);

  // Desglose por cola (live, offloaded a Neon): cuenta y promedio directo en BD.
  const queueGroups = await prisma.normalizedConversation.groupBy({
    by: ["queueName"],
    where: { ...buildConversationWhere(ctx.workspaceId, filters, scopeRes.scope), queueName: { not: null } },
    _count: { queueName: true },
    _avg: { waitingTimeSeconds: true },
  });

  const topQueuesByWait = queueGroups
    .filter((g) => g.queueName !== null)
    .map((g) => ({
      name: g.queueName as string,
      count: g._count.queueName,
      avgWaitSeconds: g._avg.waitingTimeSeconds || 0,
    }))
    .sort((a, b) => b.avgWaitSeconds - a.avgWaitSeconds)
    .slice(0, 10);

  return apiSuccess({
    summary: {
      active: summary.active,
      closed: summary.closed,
      abandoned: summary.abandoned,
      transferred: summary.transferred,
      slaMet: summary.slaMet,
      slaBreached: summary.slaBreached,
      avgFrtSeconds: summary.avgFrtSeconds,
      avgAhtSeconds: summary.avgAhtSeconds,
      avgAsaSeconds: summary.avgAsaSeconds,
    },
    topQueuesByWait,
    trends: dataset.perDate,
    source: dataset.source,
  });
});
