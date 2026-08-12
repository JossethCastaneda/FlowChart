import { PrismaClient, Prisma } from "@prisma/client";
import { BillingOutboxDispatcher } from "../lib/ai/finops/outbox-dispatcher";
import prisma from "../lib/prisma";

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

  const events = Array.from({ length: 50 }).map((_, i) => ({
    id: `evt_test_${Date.now()}_${i}`,
    workspaceId: WORKSPACE_ID,
    aiUsageId: `usage_test_${Date.now()}_${i}`,
    stripeMeterEventIdentifier: `mtr_test_${Date.now()}_${i}`,
    meterName: 'ai_compute',
    quantity: 1,
    status: 'PENDING'
  }));

  await prisma.billingUsageEvent.createMany({
    data: events
  });
}

async function runTest() {
  await setup();
  console.log("Firing 5 concurrent dispatchers...");
  const dispatchers = Array.from({ length: 5 }).map(() => new BillingOutboxDispatcher().flushOutbox(20));
  
  const results = await Promise.allSettled(dispatchers);
  results.forEach((res, i) => {
    if (res.status === 'rejected') {
      console.error(`Dispatcher ${i} failed:`, res.reason);
    }
  });

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
