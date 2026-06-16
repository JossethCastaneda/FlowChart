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

  // Desglose por cola (live, ligero): solo campos de cola/espera.
  const queueRows = await prisma.normalizedConversation.findMany({
    where: { ...buildConversationWhere(ctx.workspaceId, filters, scopeRes.scope), queueName: { not: null } },
    select: { queueName: true, waitingTimeSeconds: true },
  });
  const byQueue = new Map<string, { count: number; waits: number[] }>();
  for (const r of queueRows) {
    if (!r.queueName) continue;
    const q = byQueue.get(r.queueName) || { count: 0, waits: [] };
    q.count += 1;
    if (typeof r.waitingTimeSeconds === "number") q.waits.push(r.waitingTimeSeconds);
    byQueue.set(r.queueName, q);
  }
  const topQueuesByWait = [...byQueue.entries()]
    .map(([name, q]) => ({ name, count: q.count, avgWaitSeconds: avg(q.waits) }))
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
