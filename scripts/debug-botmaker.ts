const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
process.env.DATABASE_URL = process.env.STORAGE_POSTGRES_PRISMA_URL;

const { PrismaClient } = require('@prisma/client');
const { createConnection, listSessions } = require('../lib/botmaker-api');
const { decryptToken } = require('../lib/encryption');
const { normalizeBotmakerBase } = require('../lib/botmaker');

const prisma = new PrismaClient();

async function main() {
  try {
    const integration = await prisma.integration.findFirst({
      where: { provider: "botmaker" },
    });
    if (!integration) throw new Error("No botmaker integration");

    const encryptedToken = integration.credentials?.accessToken;
    const token = decryptToken(encryptedToken);
    const baseUrl = normalizeBotmakerBase(integration.credentials?.baseUrl);

    const conn = createConnection(token, baseUrl);

    // Let's test a simple 24-hour chunk from 3 days ago
    const from = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`Fetching Botmaker sessions from ${from} to ${to}...`);

    const result = await listSessions(conn, {
      from,
      to,
      includeMessages: false,
      includeEvents: false,
      maxPages: 3,
    });

    console.log(`Fetched ${result.length} sessions.`);
    if (result.length > 0) {
      console.log(`First session sample:`, JSON.stringify(result[0], null, 2));
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
