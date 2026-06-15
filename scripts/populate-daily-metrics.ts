import prisma from "../lib/prisma";
import { computeKpis, KpiConversation } from "../lib/analytics/kpis/engine";

async function run() {
  const convs = await prisma.normalizedConversation.findMany({
    select: {
      id: true,
      workspaceId: true,
      projectId: true,
      provider: true,
      channel: true,
      status: true,
      outcome: true,
      resolvedBy: true,
      wasBotOnly: true,
      wasHandoff: true,
      conversationStartedAt: true,
      csatScore: true,
      firstResponseTimeSeconds: true,
      handleTimeSeconds: true
    }
  });

  const grouped: Record<string, any[]> = {};
  for (const c of convs) {
    const d = c.conversationStartedAt.toISOString().split("T")[0];
    const key = `${c.workspaceId}_${c.projectId || "none"}_${c.provider}_${c.channel}_${d}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  }

  for (const [key, items] of Object.entries(grouped)) {
    const kpis = computeKpis({ conversations: items as KpiConversation[] });
    const [workspaceId, projectId, provider, channel, date] = key.split("_");
    const actualProjectId = projectId === "none" ? null : projectId;
    const actualDate = new Date(date);

    const saveMetric = async (metricKey: string, val: number) => {
      if (isNaN(val) || val === null || val === undefined) return;
      await prisma.analyticsDailyMetric.upsert({
        where: { workspaceId_projectId_date_provider_botId_channel_metricKey: {
          workspaceId, projectId: actualProjectId, date: actualDate, provider, botId: "", channel, metricKey
        }},
        create: { workspaceId, projectId: actualProjectId, date: actualDate, provider, botId: "", channel, metricKey, metricValue: val },
        update: { metricValue: val }
      });
    };

    await saveMetric("total_conversations", kpis.totalConversations);
    await saveMetric("containment_rate", kpis.realContainmentRate);
    await saveMetric("handoff_rate", kpis.escalationRate);
    await saveMetric("avg_csat", kpis.avgCsat || 0);
  }
  console.log("Terminado");
}

run().catch(console.error);
