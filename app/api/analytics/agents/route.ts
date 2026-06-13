import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { parseFilters, buildConversationWhere } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";
import { aggregateAgents } from "@/lib/analytics/kpis/aggregations";

// GET /api/analytics/agents — ranking y métricas por agente (spec §21)
export const GET = withWorkspace(async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const filters = parseFilters(sp);
  const scopeRes = await scopeFromRequest(sp, ctx.workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);
  const where = buildConversationWhere(ctx.workspaceId, filters, scopeRes.scope);

  const conversations = await prisma.normalizedConversation.findMany({
    where: { ...where, agentId: where.agentId ?? { not: null } },
  });

  return apiSuccess({ agents: aggregateAgents(conversations) });
});
