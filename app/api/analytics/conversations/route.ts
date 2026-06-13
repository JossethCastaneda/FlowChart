import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { parseFilters, buildConversationWhere, parsePagination } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";
import { maskIdentifier } from "@/lib/analytics/privacy";

// GET /api/analytics/conversations — listado paginado + filtros (spec §20)
// PII enmascarada por defecto (spec §5.2 / §36).
export const GET = withWorkspace(async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const filters = parseFilters(sp);
  const scopeRes = await scopeFromRequest(sp, ctx.workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);
  const where = buildConversationWhere(ctx.workspaceId, filters, scopeRes.scope);
  const { page, pageSize, skip, take } = parsePagination(sp);

  const [total, rows] = await Promise.all([
    prisma.normalizedConversation.count({ where }),
    prisma.normalizedConversation.findMany({
      where,
      orderBy: { conversationStartedAt: "desc" },
      skip,
      take,
    }),
  ]);

  const conversations = rows.map((c) => ({
    id: c.id,
    provider: c.provider,
    channel: c.channel,
    botName: c.botName,
    customer: maskIdentifier(c.customerId),
    status: c.status,
    outcome: c.outcome,
    resolvedBy: c.resolvedBy,
    wasBotOnly: c.wasBotOnly,
    wasHandoff: c.wasHandoff,
    agentName: c.agentName,
    queueName: c.queueName,
    durationSeconds: c.durationSeconds,
    firstResponseTimeSeconds: c.firstResponseTimeSeconds,
    handleTimeSeconds: c.handleTimeSeconds,
    csatScore: c.csatScore,
    tags: c.tags,
    campaignId: c.campaignId,
    requiresReview: c.requiresReview,
    appliedRuleId: c.appliedRuleId,
    startedAt: c.conversationStartedAt.toISOString(),
  }));

  return apiSuccess({
    conversations,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});
