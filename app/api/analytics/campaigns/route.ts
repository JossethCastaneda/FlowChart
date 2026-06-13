import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { parseFilters, buildConversationWhere } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";
import { aggregateCampaigns } from "@/lib/analytics/kpis/aggregations";

// GET /api/analytics/campaigns — métricas por campaña (spec §22)
// NOTA: entrega/lectura de plantillas (HSM) requieren datos de proveedor aún no
// confirmados; lo medible hoy se deriva de conversaciones (iniciadas/respuesta).
export const GET = withWorkspace(async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const filters = parseFilters(sp);
  const scopeRes = await scopeFromRequest(sp, ctx.workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);
  const where = buildConversationWhere(ctx.workspaceId, filters, scopeRes.scope);

  const conversations = await prisma.normalizedConversation.findMany({
    where: { ...where, campaignId: where.campaignId ?? { not: null } },
  });

  return apiSuccess({ campaigns: aggregateCampaigns(conversations) });
});
