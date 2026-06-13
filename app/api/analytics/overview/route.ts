import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { parseFilters, buildConversationWhere } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";

const SELECT = {
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
} as const;

type Conv = {
  outcome: string | null;
  resolvedBy: string | null;
  status: string;
  wasHandoff: boolean;
  csatScore: number | null;
  firstResponseTimeSeconds: number | null;
  handleTimeSeconds: number | null;
};

/** KPIs de cabecera (mismo cálculo para periodo actual y anterior). */
function summarize(convs: Conv[]) {
  const total = convs.length;
  const closedCount = convs.filter(c => c.status === "closed" || c.status === "transferred" || c.status === "abandoned").length || 1;
  const resolvedByBotCount = convs.filter(c => c.outcome === "resolved" && c.resolvedBy === "bot").length;
  const containmentRate = (resolvedByBotCount / closedCount) * 100;
  const handoffRate = (convs.filter(c => c.wasHandoff).length / (total || 1)) * 100;
  const csat = convs.filter(c => c.csatScore !== null).map(c => c.csatScore!);
  const avgCsat = csat.length ? csat.reduce((a, b) => a + b, 0) / csat.length : null;
  const frts = convs.filter(c => c.firstResponseTimeSeconds !== null).map(c => c.firstResponseTimeSeconds!);
  const avgFrt = frts.length ? frts.reduce((a, b) => a + b, 0) / frts.length : 0;
  const ahts = convs.filter(c => c.handleTimeSeconds !== null).map(c => c.handleTimeSeconds!);
  const avgAht = ahts.length ? ahts.reduce((a, b) => a + b, 0) / ahts.length : 0;
  const estimatedRoiSaved = resolvedByBotCount * ((avgAht || 600) / 3600) * 10; // $10/h agente
  return {
    totalConversations: total,
    containmentRate,
    handoffRate,
    avgCsat,
    avgFrtSeconds: avgFrt,
    avgAhtSeconds: avgAht,
    estimatedRoiSaved,
  };
}

export const GET = withAuth(async (req, ctx) => {
  const workspaceId = await getActiveWorkspaceId(ctx.userId);
  if (!workspaceId) return apiError("Workspace no encontrado", "NO_WORKSPACE", 400);

  const sp = req.nextUrl.searchParams;
  const filters = parseFilters(sp);

  // Alcance de proyecto opcional: restringe proveedores y canales a los del proyecto.
  const scopeRes = await scopeFromRequest(sp, workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);

  // Cómputo en vivo desde NormalizedConversation (para datasets grandes: AnalyticsDailyMetric).
  const where = buildConversationWhere(workspaceId, filters, scopeRes.scope);
  const conversations = await prisma.normalizedConversation.findMany({ where, select: SELECT });

  const kpis = summarize(conversations);

  // Conversaciones por canal.
  const channelsCount = conversations.reduce((acc, c) => {
    acc[c.channel] = (acc[c.channel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topChannels = Object.entries(channelsCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  // Tendencia diaria.
  const dailyDataMap = conversations.reduce((acc, c) => {
    const day = c.conversationStartedAt.toISOString().split("T")[0];
    if (!acc[day]) acc[day] = { date: day, total: 0, botResolved: 0, handoffs: 0 };
    acc[day].total += 1;
    if (c.outcome === "resolved" && c.resolvedBy === "bot") acc[day].botResolved += 1;
    if (c.wasHandoff) acc[day].handoffs += 1;
    return acc;
  }, {} as Record<string, { date: string; total: number; botResolved: number; handoffs: number }>);
  const trends = Object.values(dailyDataMap).sort((a, b) => a.date.localeCompare(b.date));

  const recentConversations = [...conversations]
    .sort((a, b) => b.conversationStartedAt.getTime() - a.conversationStartedAt.getTime())
    .slice(0, 10)
    .map(c => ({
      provider: c.provider,
      channel: c.channel,
      status: c.status,
      outcome: c.outcome || "N/A",
      resolvedBy: c.resolvedBy || "N/A",
      csatScore: c.csatScore,
      startedAt: c.conversationStartedAt.toISOString(),
    }));

  // Comparar con periodo anterior (mismo span inmediatamente previo).
  let comparison: unknown = null;
  if (sp.get("compare") === "1") {
    const span = filters.endDate.getTime() - filters.startDate.getTime();
    const prevEnd = filters.startDate;
    const prevStart = new Date(filters.startDate.getTime() - span);
    const prevWhere = buildConversationWhere(workspaceId, { ...filters, startDate: prevStart, endDate: prevEnd }, scopeRes.scope);
    const prevConvs = await prisma.normalizedConversation.findMany({ where: prevWhere, select: SELECT });
    const previous = summarize(prevConvs);
    comparison = {
      previous,
      deltas: {
        totalConversations: kpis.totalConversations - previous.totalConversations,
        containmentRate: kpis.containmentRate - previous.containmentRate,
        handoffRate: kpis.handoffRate - previous.handoffRate,
        avgCsat: (kpis.avgCsat ?? 0) - (previous.avgCsat ?? 0),
        avgFrtSeconds: kpis.avgFrtSeconds - previous.avgFrtSeconds,
        avgAhtSeconds: kpis.avgAhtSeconds - previous.avgAhtSeconds,
        estimatedRoiSaved: kpis.estimatedRoiSaved - previous.estimatedRoiSaved,
      },
      range: { from: prevStart.toISOString(), to: prevEnd.toISOString() },
    };
  }

  return apiSuccess({
    kpis,
    charts: { topChannels, trends },
    table: { recentConversations },
    comparison,
  });
});
