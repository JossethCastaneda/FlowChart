import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { parseFilters, buildConversationWhere } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";
import { aggregateOperations, buildTrends } from "@/lib/analytics/kpis/aggregations";
import { computeKpis } from "@/lib/analytics/kpis/engine";

// GET /api/analytics/operations — métricas operativas (spec §19)
export const GET = withWorkspace(async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const filters = parseFilters(sp);
  const scopeRes = await scopeFromRequest(sp, ctx.workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);
  const where = buildConversationWhere(ctx.workspaceId, filters, scopeRes.scope);

  const conversations = await prisma.normalizedConversation.findMany({ where });

  const ops = aggregateOperations(conversations);
  const kpis = computeKpis({ conversations });

  return apiSuccess({
    summary: {
      active: ops.active,
      closed: ops.closed,
      abandoned: ops.abandoned,
      transferred: ops.transferred,
      slaMet: ops.slaMet,
      slaBreached: ops.slaBreached,
      avgFrtSeconds: kpis.avgFrt,
      avgAhtSeconds: kpis.avgAht,
      avgAsaSeconds: kpis.avgAsa,
    },
    topQueuesByWait: ops.topQueuesByWait,
    trends: buildTrends(conversations),
  });
});
