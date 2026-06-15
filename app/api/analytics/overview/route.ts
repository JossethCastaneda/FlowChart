import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { parseFilters, buildConversationWhere } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";
import { getAnalyticsDataset } from "@/lib/analytics/daily-metrics.server";
import { overviewKpisFromAccumulators } from "@/lib/analytics/daily-metrics";

const RECENT_SELECT = {
  provider: true,
  channel: true,
  status: true,
  outcome: true,
  resolvedBy: true,
  csatScore: true,
  conversationStartedAt: true,
} as const;

export const GET = withAuth(async (req, ctx) => {
  const workspaceId = await getActiveWorkspaceId(ctx.userId);
  if (!workspaceId) return apiError("Workspace no encontrado", "NO_WORKSPACE", 400);

  const sp = req.nextUrl.searchParams;
  const filters = parseFilters(sp);

  // Alcance de proyecto opcional: restringe proveedores y canales a los del proyecto.
  const scopeRes = await scopeFromRequest(sp, workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);

  // KPIs de cabecera + charts desde AGREGADOS históricos + día en vivo
  // (fallback seguro a live completo si no hay agregados). Mismo cálculo.
  const dataset = await getAnalyticsDataset(workspaceId, filters, scopeRes.scope);
  const kpis = overviewKpisFromAccumulators(dataset.acc);
  const topChannels = dataset.perChannel;
  const trends = dataset.perDate;

  // Conversaciones recientes: consulta acotada y pequeña (take 10), siempre live.
  const recentRows = await prisma.normalizedConversation.findMany({
    where: buildConversationWhere(workspaceId, filters, scopeRes.scope),
    orderBy: { conversationStartedAt: "desc" },
    take: 10,
    select: RECENT_SELECT,
  });
  const recentConversations = recentRows.map((c) => ({
    provider: c.provider,
    channel: c.channel,
    status: c.status,
    outcome: c.outcome || "N/A",
    resolvedBy: c.resolvedBy || "N/A",
    csatScore: c.csatScore,
    startedAt: c.conversationStartedAt.toISOString(),
  }));

  // Comparar con periodo anterior (mismo span inmediatamente previo), mismo camino.
  let comparison: unknown = null;
  if (sp.get("compare") === "1") {
    const span = filters.endDate.getTime() - filters.startDate.getTime();
    const prevEnd = filters.startDate;
    const prevStart = new Date(filters.startDate.getTime() - span);
    const prevDataset = await getAnalyticsDataset(workspaceId, { ...filters, startDate: prevStart, endDate: prevEnd }, scopeRes.scope);
    const previous = overviewKpisFromAccumulators(prevDataset.acc);
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
    source: dataset.source,
  });
});
