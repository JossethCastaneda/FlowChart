import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { parseFilters, buildConversationWhere } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";
// GET /api/analytics/agents — ranking y métricas por agente (spec §21)
export const GET = withWorkspace(async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const filters = parseFilters(sp);
  const scopeRes = await scopeFromRequest(sp, ctx.workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);
  const where = buildConversationWhere(ctx.workspaceId, filters, scopeRes.scope);

  const groups = await prisma.normalizedConversation.groupBy({
    by: ['agentId', 'agentName', 'status', 'wasHandoff'],
    where: { ...where, agentId: where.agentId ?? { not: null } },
    _count: {
      _all: true,
      csatScore: true,
      firstResponseTimeSeconds: true,
      handleTimeSeconds: true,
    },
    _sum: {
      csatScore: true,
      firstResponseTimeSeconds: true,
      handleTimeSeconds: true,
    }
  });

  interface AgentAccumulator {
    agentId: string;
    agentName: string;
    handled: number;
    closed: number;
    transfers: number;
    frtSum: number;
    frtN: number;
    ahtSum: number;
    ahtN: number;
    csatSum: number;
    csatN: number;
  }

  const byAgent = new Map<string, AgentAccumulator>();
  for (const g of groups) {
    if (!g.agentId) continue;
    const acc = byAgent.get(g.agentId) || {
      agentId: g.agentId,
      agentName: g.agentName || g.agentId,
      handled: 0,
      closed: 0,
      transfers: 0,
      frtSum: 0,
      frtN: 0,
      ahtSum: 0,
      ahtN: 0,
      csatSum: 0,
      csatN: 0
    };

    const n = g._count._all;
    acc.handled += n;
    if (g.status === "closed") acc.closed += n;
    if (g.wasHandoff) acc.transfers += n;

    acc.frtSum += g._sum.firstResponseTimeSeconds || 0;
    acc.frtN += g._count.firstResponseTimeSeconds;
    acc.ahtSum += g._sum.handleTimeSeconds || 0;
    acc.ahtN += g._count.handleTimeSeconds;
    acc.csatSum += g._sum.csatScore || 0;
    acc.csatN += g._count.csatScore;

    if (g.agentName) {
      acc.agentName = g.agentName;
    }

    byAgent.set(g.agentId, acc);
  }

  const agents = [...byAgent.values()].map((acc) => ({
    agentId: acc.agentId,
    agentName: acc.agentName,
    handled: acc.handled,
    closed: acc.closed,
    transfers: acc.transfers,
    avgFrt: acc.frtN > 0 ? acc.frtSum / acc.frtN : 0,
    avgAht: acc.ahtN > 0 ? acc.ahtSum / acc.ahtN : 0,
    avgCsat: acc.csatN > 0 ? acc.csatSum / acc.csatN : null,
  })).sort((a, b) => b.handled - a.handled);

  return apiSuccess({ agents });
});
