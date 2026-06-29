import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load env
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
process.env.DATABASE_URL = process.env.STORAGE_POSTGRES_PRISMA_URL;

// 2. Dynamic import Prisma to ensure env is ready
async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  const { createConnection, listSessions } = await import("../lib/botmaker-api.ts");
  const { decryptToken } = await import("../lib/encryption.ts");
  const { normalizeBotmakerBase } = await import("../lib/botmaker.ts");

  try {
    const integration = await prisma.integration.findFirst({
      where: { provider: "botmaker" },
    });
    if (!integration) throw new Error("No botmaker integration");

    const encryptedToken = (integration.credentials as any)?.accessToken;
    const token = decryptToken(encryptedToken);
    const baseUrl = normalizeBotmakerBase((integration.credentials as any)?.baseUrl);

    const conn = createConnection(token, baseUrl);

    // Testing a time window 30 days ago to simulate high load
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString();

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
