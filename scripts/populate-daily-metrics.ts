// Pobla AnalyticsDailyMetric con ACUMULADORES diarios (acc_*) por grupo
// workspace/project/provider/bot/channel/fecha. Estos acumuladores son aditivos
// y los vuelve a sumar el lector (lib/analytics/daily-metrics.server.ts) para
// servir overview/operations/roi desde agregados + el día en vivo.
//
// Idempotente: re-ejecutar recalcula y actualiza las filas existentes.
// Uso: npx tsx scripts/populate-daily-metrics.ts
import prisma from "../lib/prisma";
import {
  accumulatorsFromConversations,
  accumulatorsToMetricRows,
  type DailyConv,
} from "../lib/analytics/daily-metrics";

interface Row extends DailyConv {
  workspaceId: string;
  projectId: string | null;
  clientId: string | null;
  provider: string;
  botId: string | null;
}

async function run() {
  const convs = (await prisma.normalizedConversation.findMany({
    select: {
      workspaceId: true,
      projectId: true,
      clientId: true,
      provider: true,
      botId: true,
      channel: true,
      status: true,
      outcome: true,
      resolvedBy: true,
      wasBotOnly: true,
      wasHandoff: true,
      conversationStartedAt: true,
      csatScore: true,
      totalUserMessages: true,
      totalBotMessages: true,
      totalFallbacks: true,
      firstResponseTimeSeconds: true,
      handleTimeSeconds: true,
      waitingTimeSeconds: true,
    },
  })) as Row[];

  // Agrupa por workspace|project|client|provider|bot|channel|fecha(UTC).
  const grouped = new Map<string, Row[]>();
  for (const c of convs) {
    const d = c.conversationStartedAt.toISOString().split("T")[0];
    const key = [c.workspaceId, c.projectId ?? "", c.clientId ?? "", c.provider, c.botId ?? "", c.channel, d].join("|");
    const arr = grouped.get(key) || [];
    arr.push(c);
    grouped.set(key, arr);
  }

  let upserts = 0;
  for (const [key, items] of grouped) {
    const [workspaceId, projectId, clientId, provider, botId, channel, date] = key.split("|");
    const actualProjectId = projectId === "" ? null : projectId;
    const actualClientId = clientId === "" ? null : clientId;
    const day = new Date(date);
    const acc = accumulatorsFromConversations(items);
    const rows = accumulatorsToMetricRows(acc);

    for (const r of rows) {
      const existing = await prisma.analyticsDailyMetric.findFirst({
        where: { workspaceId, projectId: actualProjectId, date: day, provider, botId, channel, metricKey: r.metricKey },
        select: { id: true },
      });
      if (existing) {
        await prisma.analyticsDailyMetric.update({ where: { id: existing.id }, data: { metricValue: r.metricValue } });
      } else {
        await prisma.analyticsDailyMetric.create({
          data: {
            workspaceId,
            projectId: actualProjectId,
            clientId: actualClientId,
            date: day,
            provider,
            botId,
            channel,
            metricKey: r.metricKey,
            metricValue: r.metricValue,
          },
        });
      }
      upserts++;
    }
  }
  console.log(`Terminado: ${grouped.size} grupos, ${upserts} métricas escritas.`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
