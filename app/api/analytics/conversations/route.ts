import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { parseFilters, buildConversationWhere, parsePagination } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";
import { maskIdentifier } from "@/lib/analytics/privacy";
import { canViewSensitive } from "@/lib/analytics/sensitive";
import { writeAuditLog } from "@/lib/analytics/audit";

// GET /api/analytics/conversations — listado paginado + filtros (spec §20)
// PII enmascarada por defecto (spec §5.2 / §36). Con ?reveal=1 y permiso
// view_sensitive (OWNER/ADMIN o canViewSensitiveAnalytics) se muestra sin
// enmascarar y se registra un audit log `view_sensitive`.
export const GET = withWorkspace(async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const filters = parseFilters(sp);
  const scopeRes = await scopeFromRequest(sp, ctx.workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);
  const where = buildConversationWhere(ctx.workspaceId, filters, scopeRes.scope);
  const { page, pageSize, skip, take } = parsePagination(sp);

  // Revelar PII solo si se pide explícitamente Y el usuario está autorizado.
  const revealRequested = sp.get("reveal") === "1";
  const reveal = revealRequested && (await canViewSensitive(ctx.workspaceId, ctx.userId));

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
    customer: reveal ? (c.customerId ?? "") : maskIdentifier(c.customerId),
    piiRevealed: reveal,
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

  // Auditar el acceso a PII sin enmascarar (solo cuando efectivamente se reveló).
  if (reveal) {
    await writeAuditLog({
      workspaceId: ctx.workspaceId,
      projectId: scopeRes.scope?.projectId ?? null,
      userId: ctx.userId,
      action: "view_sensitive",
      resourceType: "conversations",
      metadata: { count: conversations.length, page },
    });
  }

  return apiSuccess({
    conversations,
    revealed: reveal,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});
