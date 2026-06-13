import prisma from '../lib/prisma';
import { randomUUID } from 'crypto';

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

const PROVIDERS = ['cari_ai', 'botmaker'];
const CHANNELS = ['whatsapp', 'webchat', 'facebook', 'instagram'];
const BOTS = ['Bot_Ventas', 'Bot_Soporte', 'Bot_RRHH'];
const OUTCOMES = ['resolved', 'transferred', 'abandoned', 'error'];
const STATUSES = ['closed', 'closed', 'closed', 'transferred', 'abandoned'];
const RESOLVED_BY = ['bot', 'agent', 'mixed'];
const QUEUES = ['Ventas', 'Soporte N1', 'Facturacion'];
const SERVICES = ['pago_servicios', 'consulta_saldo', 'agendar_cita', 'cambio_plan'];
const CAMPAIGNS = ['camp_black_friday', 'camp_renovacion', 'camp_bienvenida'];
const TAG_POOL = ['vip', 'reclamo', 'soporte', 'recurrente', 'nuevo'];
const BOT_NAMES: Record<string, string> = { Bot_Ventas: 'Asistente Ventas', Bot_Soporte: 'Asistente Soporte', Bot_RRHH: 'Asistente RRHH' };

async function main() {
  console.log('Starting Analytics Mock Data Generation...');

  // 1. Get a valid workspace to attach the data to
  // If no workspace exists, we fail gracefully
  const workspace = await prisma.workspace.findFirst();
  if (!workspace) {
    console.error('No workspaces found in the database. Cannot generate mock data.');
    return;
  }

  const workspaceId = workspace.id;

  // 2. Clear old mock data
  console.log('Clearing old normalized data...');
  await prisma.normalizedMessage.deleteMany({ where: { workspaceId } });
  await prisma.normalizedConversation.deleteMany({ where: { workspaceId } });

  // 3. Generate 1,000 conversations
  console.log('Generating 1,000 conversations...');
  const conversationsToInsert = [];
  const messagesToInsert = [];

  const now = new Date();

  for (let i = 0; i < 1000; i++) {
    // Distribute randomly over the last 30 days
    const daysAgo = randomInt(0, 30);
    const startedAt = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - randomInt(0, 24*3600*1000));
    const durationSeconds = randomInt(30, 3600); // 30s to 1h
    const endedAt = new Date(startedAt.getTime() + (durationSeconds * 1000));
    
    const isBotOnly = Math.random() > 0.4;
    const isHandoff = !isBotOnly;

    const convId = `mock_conv_${randomUUID()}`;
    const provider = randomItem(PROVIDERS);

    let outcome = randomItem(OUTCOMES);
    let resolvedBy = randomItem(RESOLVED_BY);
    
    // Logical consistency adjustments
    if (isBotOnly) {
      resolvedBy = 'bot';
      if (outcome === 'transferred') outcome = 'resolved';
    } else {
      if (resolvedBy === 'bot') resolvedBy = 'mixed';
    }

    const totalUserMsgs = randomInt(1, 15);
    const totalBotMsgs = randomInt(1, 15);

    const botId = randomItem(BOTS);
    const agentNum = isHandoff ? randomInt(1, 5) : null;
    const queueName = isHandoff ? randomItem(QUEUES) : null;
    const serviceId = Math.random() > 0.5 ? randomItem(SERVICES) : null;
    const campaignId = Math.random() > 0.6 ? randomItem(CAMPAIGNS) : null;
    const csatScore = Math.random() > 0.2 ? randomInt(3, 5) : randomInt(1, 2);
    const convTags = [randomItem(TAG_POOL)];
    if (isBotOnly && outcome === 'resolved') convTags.push('venta_exitosa');

    conversationsToInsert.push({
      workspaceId,
      provider,
      providerConversationId: convId,
      channel: randomItem(CHANNELS),
      botId,
      botName: BOT_NAMES[botId] || botId,
      customerId: `cust_${randomInt(1, 100)}`,

      conversationStartedAt: startedAt,
      conversationEndedAt: endedAt,
      firstBotResponseAt: new Date(startedAt.getTime() + randomInt(1, 10) * 1000),

      status: randomItem(STATUSES),
      outcome,
      resolvedBy,

      wasBotOnly: isBotOnly,
      wasHandoff: isHandoff,
      queueId: queueName,
      queueName,
      agentId: agentNum ? `agent_${agentNum}` : null,
      agentName: agentNum ? `Agente ${agentNum}` : null,

      totalUserMessages: totalUserMsgs,
      totalBotMessages: totalBotMsgs,
      totalAgentMessages: isHandoff ? randomInt(1, 10) : 0,
      totalFallbacks: randomInt(0, 3),

      csatScore,
      npsScore: randomInt(0, 10),
      campaignId,
      serviceId,
      tags: convTags,
      requiresReview: csatScore <= 2,

      durationSeconds,
      waitingTimeSeconds: isHandoff ? randomInt(5, 600) : randomInt(0, 30),
      handleTimeSeconds: isHandoff ? randomInt(60, 1800) : null,
      firstResponseTimeSeconds: isHandoff ? randomInt(10, 300) : null,

      syncedAt: new Date(),
    });

    // Generate some messages for this conversation
    for (let m = 0; m < totalUserMsgs; m++) {
      messagesToInsert.push({
        workspaceId,
        provider,
        providerMessageId: `msg_${randomUUID()}`,
        conversationId: convId,
        senderType: 'user',
        messageType: 'text',
        sentAt: new Date(startedAt.getTime() + (m * 20000)),
        isFallback: false,
      });
    }
  }

  // Insert in batches
  console.log('Saving to DB...');
  await prisma.normalizedConversation.createMany({ data: conversationsToInsert });
  
  // Insert messages in chunks of 500
  const chunkSize = 500;
  for (let i = 0; i < messagesToInsert.length; i += chunkSize) {
    const chunk = messagesToInsert.slice(i, i + chunkSize);
    await prisma.normalizedMessage.createMany({ data: chunk });
  }

  console.log('Mock Data Generation Complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
