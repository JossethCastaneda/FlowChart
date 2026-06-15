import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { parseFilters } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";
import { getAnalyticsDataset } from "@/lib/analytics/daily-metrics.server";
import { roiFromAccumulators, overviewKpisFromAccumulators } from "@/lib/analytics/daily-metrics";

// GET /api/analytics/roi — ROI / ahorro operativo (spec §26)
// Configuración económica vía query (con defaults). Maneja denominador 0.
// KPIs desde AGREGADOS históricos + día en vivo (fallback live). Mismo cálculo.
export const GET = withWorkspace(async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const filters = parseFilters(sp);
  const scopeRes = await scopeFromRequest(sp, ctx.workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);

  const agentCostPerHour = parseFloat(sp.get("agentCostPerHour") || "10") || 10;
  const humanAhtSeconds = parseFloat(sp.get("humanAhtSeconds") || "600") || 600;
  const monthlyBotCost = parseFloat(sp.get("monthlyBotCost") || "0") || 0;
  const incrementalRevenue = parseFloat(sp.get("incrementalRevenue") || "0") || 0;
  const costPerMessage = parseFloat(sp.get("costPerMessage") || "0") || 0;

  const dataset = await getAnalyticsDataset(ctx.workspaceId, filters, scopeRes.scope);
  const roi = roiFromAccumulators(dataset.acc, {
    agentCostPerHour, humanAhtSeconds, monthlyBotCost, incrementalRevenue, costPerMessage,
  });
  const estimatedRoiSaved = overviewKpisFromAccumulators(dataset.acc).estimatedRoiSaved;

  return apiSuccess({
    botResolved: roi.botResolved,
    hoursSaved: roi.hoursSaved,
    costAvoided: roi.costAvoided,
    totalBotCost: roi.totalBotCost,
    incrementalRevenue: roi.incrementalRevenue,
    roiPercent: roi.roiPercent,
    costPerConversation: roi.costPerConversation,
    costPerAutomatedResolution: roi.costPerAutomatedResolution,
    estimatedRoiSaved,
    config: { agentCostPerHour, humanAhtSeconds, monthlyBotCost, incrementalRevenue, costPerMessage },
    source: dataset.source,
  });
});
