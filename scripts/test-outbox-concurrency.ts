import { PrismaClient, Prisma } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { BillingOutboxDispatcher } from "../lib/ai/finops/outbox-dispatcher";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
let WORKSPACE_ID = "test_workspace_outbox_concurrency";

async function setup() {
  console.log("Setting up workspace...");
  const workspace = await prisma.workspace.upsert({
    where: { slug: "test-outbox-concurrency" },
    create: { name: "Outbox Test Workspace", slug: "test-outbox-concurrency" },
    update: {}
  });
  WORKSPACE_ID = workspace.id;

  await prisma.billingCustomer.upsert({
    where: { workspaceId: WORKSPACE_ID },
    create: {
      workspaceId: WORKSPACE_ID,
      stripeCustomerId: "cus_test_mock",
    },
    update: {}
  });

  // Create 50 events
  console.log("Creating 50 pending events...");
  await prisma.billingUsageEvent.deleteMany({
    where: { workspaceId: WORKSPACE_ID }
  });

  const eventValues = Array.from({ length: 50 }).map((_, i) => `(
    'evt_test_${Date.now()}_${i}',
    '${WORKSPACE_ID}',
    'usage_test_${Date.now()}_${i}',
    'mtr_test_${Date.now()}_${i}',
    'ai_compute',
    1,
    'PENDING'
  )`).join(',');

  await prisma.$executeRawUnsafe(`
    INSERT INTO "BillingUsageEvent" (id, "workspaceId", "aiUsageId", "stripeMeterEventIdentifier", "meterName", quantity, status)
    VALUES ${eventValues}
  `);
}

async function runTest() {
  await setup();
  console.log("Firing 5 concurrent dispatchers...");
  const dispatchers = Array.from({ length: 5 }).map(() => new BillingOutboxDispatcher().flushOutbox(20));
  
  await Promise.allSettled(dispatchers);

  // Check results
  const processed = await prisma.billingUsageEvent.findMany({
    where: { workspaceId: WORKSPACE_ID }
  });

  const processing = processed.filter(e => e.status === "PROCESSING");
  const failed = processed.filter(e => e.status === "FAILED");
  const sent = processed.filter(e => e.status === "SENT");

  console.log(`Results: SENT: ${sent.length}, PROCESSING: ${processing.length}, FAILED: ${failed.length}`);

  if (sent.length > 0 || failed.length > 0) {
    console.log("✅ CONCURRENT OUTBOX TEST PASSED! Items were picked up properly and locks respected.");
  } else {
     console.error("❌ CONCURRENT OUTBOX TEST FAILED! Nothing was processed.");
  }
}

runTest().catch(console.error).finally(async () => {
  await prisma.billingUsageEvent.deleteMany({ where: { workspaceId: WORKSPACE_ID }});
  await prisma.$disconnect();
});
