import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { parseFilters, buildConversationWhere } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";
import { findDataQualityIssues, summarizeIssues } from "@/lib/analytics/data-quality";

// GET /api/analytics/data-quality — validaciones de calidad de datos (spec §27)
// Se computan en vivo sobre el dataset normalizado (no requieren persistencia).
export const GET = withWorkspace(async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const filters = parseFilters(sp);
  const scopeRes = await scopeFromRequest(sp, ctx.workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);
  const where = buildConversationWhere(ctx.workspaceId, filters, scopeRes.scope);

  const conversations = await prisma.normalizedConversation.findMany({
    where,
    select: {
      id: true, provider: true, providerConversationId: true,
      conversationStartedAt: true, conversationEndedAt: true,
      status: true, outcome: true, channel: true,
      durationSeconds: true, firstResponseTimeSeconds: true, handleTimeSeconds: true,
    },
    take: 10000,
  });

  const issues = findDataQualityIssues(conversations);
  const summary = summarizeIssues(issues);

  return apiSuccess({ summary, issues: issues.slice(0, 200) });
});
