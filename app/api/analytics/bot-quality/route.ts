import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { parseFilters, buildConversationWhere, applyScopeToMessageWhere } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";
import { computeKpis } from "@/lib/analytics/kpis/engine";
import { countBy } from "@/lib/analytics/kpis/aggregations";

// GET /api/analytics/bot-quality — calidad y comprensión del bot (spec §25)
export const GET = withWorkspace(async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const filters = parseFilters(sp);
  const scopeRes = await scopeFromRequest(sp, ctx.workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);
  const where = buildConversationWhere(ctx.workspaceId, filters, scopeRes.scope);

  const conversations = await prisma.normalizedConversation.findMany({ where });
  const kpis = computeKpis({ conversations });

  // Top intents que dispararon fallback (a partir de mensajes normalizados).
  // Acotado por proveedor cuando hay alcance de proyecto (los mensajes no tienen canal).
  const fallbackMessages = await prisma.normalizedMessage.findMany({
    where: applyScopeToMessageWhere({ workspaceId: ctx.workspaceId, isFallback: true }, scopeRes.scope),
    select: { intent: true },
    take: 5000,
  });
  const topFallbackIntents = countBy(fallbackMessages, (m) => m.intent || "Desconocido").slice(0, 10);

  const conversationsForReview = conversations.filter((c) => c.requiresReview).length;

  // Recomendaciones automáticas simples (spec §25).
  const recommendations: string[] = [];
  if (kpis.fallbackRate > 20) recommendations.push("Fallback alto: revisar entrenamiento de intents y agregar respuestas a la base de conocimiento.");
  if ((kpis.avgCsat ?? 5) < 3.8) recommendations.push("CSAT bajo: revisar flujos con peor satisfacción y ajustar handoff.");
  if (kpis.escalationRate > 30) recommendations.push("Escalamiento alto: revisar cobertura del bot en los intents más transferidos.");
  if (topFallbackIntents.length > 0) recommendations.push(`Crear/mejorar intent para la frase más frecuente sin entender: "${topFallbackIntents[0].name}".`);

  return apiSuccess({
    kpis: {
      fallbackRate: kpis.fallbackRate,
      taskCompletionRate: kpis.taskCompletionRate,
      avgCsat: kpis.avgCsat,
      earlyAbandonmentRate: kpis.earlyAbandonmentRate,
      conversationsForReview,
    },
    topFallbackIntents,
    recommendations,
  });
});
