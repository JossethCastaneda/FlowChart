import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { parseFilters, buildConversationWhere } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";
import { computeKpis } from "@/lib/analytics/kpis/engine";

// GET /api/analytics/roi — ROI / ahorro operativo (spec §26)
// Configuración económica vía query (con defaults). Maneja denominador 0.
export const GET = withWorkspace(async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const filters = parseFilters(sp);
  const scopeRes = await scopeFromRequest(sp, ctx.workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);
  const where = buildConversationWhere(ctx.workspaceId, filters, scopeRes.scope);

  const agentCostPerHour = parseFloat(sp.get("agentCostPerHour") || "10") || 10;
  const humanAhtSeconds = parseFloat(sp.get("humanAhtSeconds") || "600") || 600;
  const monthlyBotCost = parseFloat(sp.get("monthlyBotCost") || "0") || 0;
  const incrementalRevenue = parseFloat(sp.get("incrementalRevenue") || "0") || 0;
  const costPerMessage = parseFloat(sp.get("costPerMessage") || "0") || 0;

  const conversations = await prisma.normalizedConversation.findMany({ where });
  const kpis = computeKpis({ conversations, agentCostPerHour, humanAhtBaselineSeconds: humanAhtSeconds });

  const botResolved = conversations.filter((c) => c.outcome === "resolved" && c.resolvedBy === "bot").length;
  const hoursSaved = (botResolved * humanAhtSeconds) / 3600;
  const costAvoided = hoursSaved * agentCostPerHour;
  const totalBotCost = monthlyBotCost + costPerMessage * conversations.reduce((s, c) => s + (c.totalBotMessages || 0), 0);

  const roi = totalBotCost > 0 ? ((costAvoided + incrementalRevenue - totalBotCost) / totalBotCost) * 100 : null;
  const costPerConversation = conversations.length > 0 ? totalBotCost / conversations.length : 0;
  const costPerAutomatedResolution = botResolved > 0 ? totalBotCost / botResolved : 0;

  return apiSuccess({
    botResolved,
    hoursSaved,
    costAvoided,
    totalBotCost,
    incrementalRevenue,
    roiPercent: roi,
    costPerConversation,
    costPerAutomatedResolution,
    estimatedRoiSaved: kpis.estimatedRoiSaved,
    config: { agentCostPerHour, humanAhtSeconds, monthlyBotCost, incrementalRevenue, costPerMessage },
  });
});
