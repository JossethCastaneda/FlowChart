import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { parseFilters, buildConversationWhere } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";
// GET /api/analytics/campaigns — métricas por campaña (spec §22)
// NOTA: entrega/lectura de plantillas (HSM) requieren datos de proveedor aún no
// confirmados; lo medible hoy se deriva de conversaciones (iniciadas/respuesta).
export const GET = withWorkspace(async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const filters = parseFilters(sp);
  const scopeRes = await scopeFromRequest(sp, ctx.workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);
  const where = buildConversationWhere(ctx.workspaceId, filters, scopeRes.scope);

  const [outcomeGroups, repliedGroups] = await Promise.all([
    prisma.normalizedConversation.groupBy({
      by: ['campaignId', 'outcome'],
      where: { ...where, campaignId: where.campaignId ?? { not: null } },
      _count: { _all: true },
    }),
    prisma.normalizedConversation.groupBy({
      by: ['campaignId'],
      where: { ...where, campaignId: where.campaignId ?? { not: null }, totalUserMessages: { gt: 0 } },
      _count: { _all: true },
    })
  ]);

  interface CampaignAccumulator {
    campaignId: string;
    started: number;
    replied: number;
    conversions: number;
  }

  const byCampaign = new Map<string, CampaignAccumulator>();

  for (const g of outcomeGroups) {
    if (!g.campaignId) continue;
    const acc = byCampaign.get(g.campaignId) || {
      campaignId: g.campaignId,
      started: 0,
      replied: 0,
      conversions: 0,
    };
    const count = g._count._all;
    acc.started += count;
    if (g.outcome === "resolved") {
      acc.conversions += count;
    }
    byCampaign.set(g.campaignId, acc);
  }

  for (const g of repliedGroups) {
    if (!g.campaignId) continue;
    const acc = byCampaign.get(g.campaignId);
    if (acc) {
      acc.replied = g._count._all;
    }
  }

  const campaigns = [...byCampaign.values()].map((acc) => ({
    campaignId: acc.campaignId,
    conversationsStarted: acc.started,
    replied: acc.replied,
    conversions: acc.conversions,
    responseRate: acc.started > 0 ? (acc.replied / acc.started) * 100 : 0,
  })).sort((a, b) => b.conversationsStarted - a.conversationsStarted);

  return apiSuccess({ campaigns });
});
