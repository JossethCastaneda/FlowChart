import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { parseFilters, buildConversationWhere } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";

export const GET = withAuth(async (req, ctx) => {
  const workspaceId = await getActiveWorkspaceId(ctx.userId);
  if (!workspaceId) return apiError("Workspace no encontrado", "NO_WORKSPACE", 400);

  const sp = req.nextUrl.searchParams;
  const filters = parseFilters(sp);

  // Alcance de proyecto opcional: restringe proveedores y canales a los del proyecto.
  const scopeRes = await scopeFromRequest(sp, workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);

  // Fetch all matching conversations in the period to aggregate in-memory
  // For production with millions of rows, this should query `analytics_daily_metrics`
  // But for this first version, we query `NormalizedConversation`
  const where = buildConversationWhere(workspaceId, filters, scopeRes.scope);
  const conversations = await prisma.normalizedConversation.findMany({
    where,
    select: {
      provider: true,
      channel: true,
      status: true,
      outcome: true,
      resolvedBy: true,
      wasBotOnly: true,
      wasHandoff: true,
      csatScore: true,
      firstResponseTimeSeconds: true,
      handleTimeSeconds: true,
      conversationStartedAt: true,
      durationSeconds: true,
    }
  });

  // Calculate KPIs
  const total = conversations.length;
  
  // A. Contención Real: Resueltas por bot / cerradas
  const closed = conversations.filter(c => c.status === "closed" || c.status === "transferred" || c.status === "abandoned");
  const closedCount = closed.length || 1; // prevent div by zero
  const resolvedByBotCount = conversations.filter(c => c.outcome === "resolved" && c.resolvedBy === "bot").length;
  const realContainmentRate = (resolvedByBotCount / closedCount) * 100;

  // B. Escalamiento: Handoff / totales
  const handoffCount = conversations.filter(c => c.wasHandoff).length;
  const handoffRate = (handoffCount / (total || 1)) * 100;

  // C. CSAT Promedio
  const csatScores = conversations.filter(c => c.csatScore !== null).map(c => c.csatScore!);
  const avgCsat = csatScores.length ? csatScores.reduce((a, b) => a + b, 0) / csatScores.length : null;

  // D. FRT y AHT
  const frts = conversations.filter(c => c.firstResponseTimeSeconds !== null).map(c => c.firstResponseTimeSeconds!);
  const avgFrt = frts.length ? frts.reduce((a, b) => a + b, 0) / frts.length : 0;

  const ahts = conversations.filter(c => c.handleTimeSeconds !== null).map(c => c.handleTimeSeconds!);
  const avgAht = ahts.length ? ahts.reduce((a, b) => a + b, 0) / ahts.length : 0;

  // E. Conversaciones por Canal
  const channelsCount = conversations.reduce((acc, c) => {
    acc[c.channel] = (acc[c.channel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topChannels = Object.entries(channelsCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // F. Trend per day
  const dailyDataMap = conversations.reduce((acc, c) => {
    const day = c.conversationStartedAt.toISOString().split("T")[0];
    if (!acc[day]) acc[day] = { date: day, total: 0, botResolved: 0, handoffs: 0 };
    acc[day].total += 1;
    if (c.outcome === "resolved" && c.resolvedBy === "bot") acc[day].botResolved += 1;
    if (c.wasHandoff) acc[day].handoffs += 1;
    return acc;
  }, {} as Record<string, any>);

  const trends = Object.values(dailyDataMap).sort((a, b) => a.date.localeCompare(b.date));

  // H. Conversaciones Recientes para la tabla
  const recentConversations = conversations
    .sort((a, b) => b.conversationStartedAt.getTime() - a.conversationStartedAt.getTime())
    .slice(0, 10)
    .map(c => ({
      provider: c.provider,
      channel: c.channel,
      status: c.status,
      outcome: c.outcome || "N/A",
      resolvedBy: c.resolvedBy || "N/A",
      csatScore: c.csatScore,
      startedAt: c.conversationStartedAt.toISOString()
    }));

  // G. ROI estimado
  // Costo por hora de agente = $10 USD
  const agentCostPerHour = 10;
  // AHT Promedio del humano en horas = (avgAht || 600) / 3600
  const humanAhtHours = (avgAht || 600) / 3600;
  const hoursSaved = resolvedByBotCount * humanAhtHours;
  const costAvoided = hoursSaved * agentCostPerHour;

  return apiSuccess({
    kpis: {
      totalConversations: total,
      containmentRate: realContainmentRate,
      handoffRate,
      avgCsat,
      avgFrtSeconds: avgFrt,
      avgAhtSeconds: avgAht,
      estimatedRoiSaved: costAvoided
    },
    charts: {
      topChannels,
      trends
    },
    table: {
      recentConversations
    }
  });
});
