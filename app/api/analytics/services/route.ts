import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { parseFilters, buildConversationWhere } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";
// GET /api/analytics/services — métricas por servicio/transacción (spec §23)
export const GET = withWorkspace(async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const filters = parseFilters(sp);
  const scopeRes = await scopeFromRequest(sp, ctx.workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);
  const where = buildConversationWhere(ctx.workspaceId, filters, scopeRes.scope);

  const [serviceGroups, durationGroups] = await Promise.all([
    prisma.normalizedConversation.groupBy({
      by: ['serviceId', 'outcome'],
      where: { ...where, serviceId: where.serviceId ?? { not: null } },
      _count: { _all: true }
    }),
    prisma.normalizedConversation.groupBy({
      by: ['serviceId'],
      where: { ...where, serviceId: where.serviceId ?? { not: null }, durationSeconds: { gt: 0 } },
      _avg: { durationSeconds: true }
    })
  ]);

  interface ServiceAccumulator {
    serviceId: string;
    started: number;
    completed: number;
    failed: number;
    avgCompletionSeconds: number;
  }

  const byService = new Map<string, ServiceAccumulator>();

  for (const g of serviceGroups) {
    if (!g.serviceId) continue;
    const acc = byService.get(g.serviceId) || {
      serviceId: g.serviceId,
      started: 0,
      completed: 0,
      failed: 0,
      avgCompletionSeconds: 0
    };

    const count = g._count._all;
    acc.started += count;
    if (g.outcome === "resolved") {
      acc.completed += count;
    } else if (g.outcome === "error" || g.outcome === "not_resolved") {
      acc.failed += count;
    }
    byService.set(g.serviceId, acc);
  }

  for (const g of durationGroups) {
    if (!g.serviceId) continue;
    const acc = byService.get(g.serviceId);
    if (acc) {
      acc.avgCompletionSeconds = g._avg.durationSeconds || 0;
    }
  }

  const services = [...byService.values()].map((acc) => ({
    serviceId: acc.serviceId,
    started: acc.started,
    completed: acc.completed,
    failed: acc.failed,
    conversionRate: acc.started > 0 ? (acc.completed / acc.started) * 100 : 0,
    avgCompletionSeconds: acc.avgCompletionSeconds,
  })).sort((a, b) => b.started - a.started);

  return apiSuccess({ services });
});
