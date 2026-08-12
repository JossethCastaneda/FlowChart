import prisma from "../lib/prisma";
import { reserve } from "../lib/ai/finops/reservation";

async function run() {
  const wsId = "test_concurrent_ws";
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  try {
    // 1. Setup
    console.log("Setting up workspace...");
    await prisma.workspace.upsert({
      where: { slug: "test_concurrent_ws" },
      create: { id: wsId, name: "Test Concurrent WS", slug: "test_concurrent_ws" },
      update: {}
    });

    await prisma.workspaceAiBudgetBalance.upsert({
      where: { workspaceId_periodStart_periodEnd: { workspaceId: wsId, periodStart, periodEnd } },
      create: {
        workspaceId: wsId,
        periodStart,
        periodEnd,
        customerBilledUsd: 0,
        customerReservedUsd: 0,
      },
      update: { customerBilledUsd: 0, customerReservedUsd: 0 }
    });

    await prisma.workspaceEntitlement.upsert({
      where: { workspaceId: wsId },
      create: {
        workspaceId: wsId,
        saasPlan: "PRO",
        allowedFeatures: ["test_feature"],
        monthlyAiBudget: 50.00,
        availableCredits: 0
      },
      update: {
        monthlyAiBudget: 50.00
      }
    });

    // 2. Fire Concurrent Requests
    console.log("Firing 60 concurrent requests of $1.00 each (budget is $50)...");
    const requests = Array.from({ length: 60 }).map((_, i) => 
      reserve(wsId, "test_feature", 1.00, `idem_test_${Date.now()}_${i}`)
        .then(res => ({ status: 'fulfilled', value: res }))
        .catch(err => ({ status: 'rejected', reason: err }))
    );

    const results = await Promise.all(requests);
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');
    
    console.log(`Successfully reserved ${successful.length} items`);
    console.log(`Rejected ${failed.length} items due to budget constraint`);

    if (successful.length !== 50 || failed.length !== 10) {
      console.error(`❌ CONCURRENT OVERSPEND BUG DETECTED. Expected 50 successful, 10 failed.`);
      process.exit(1);
    }

    // 2.5 Fire Idempotency Check
    console.log("Testing exact identity resolution...");
    const firstContext = (successful[0] as any).value;
    const duplicateContext = await reserve(wsId, "test_feature", 1.00, firstContext.idempotencyKey);
    
    if (duplicateContext.reservationId === firstContext.reservationId) {
      console.log(`✅ EXACT IDENTITY MATCH: ${duplicateContext.reservationId}`);
    } else {
      console.error(`❌ IDENTITY MISMATCH: Expected ${firstContext.reservationId}, got ${duplicateContext.reservationId}`);
      process.exit(1);
    }

    // 3. Verify
    const balance = await prisma.workspaceAiBudgetBalance.findUnique({
      where: { workspaceId_periodStart_periodEnd: { workspaceId: wsId, periodStart, periodEnd } }
    });

    console.log(`Expected Reserved USD: ${(50.0).toFixed(2)}`);
    console.log(`Actual Reserved USD: ${balance?.customerReservedUsd}`);
    
    if (Number(balance?.customerReservedUsd) === 50.0) {
      console.log("✅ CONCURRENT BUDGET ENFORCEMENT PASSED!");
    } else {
      console.error("❌ CONCURRENT TEST FAILED!");
      process.exit(1);
    }

  } finally {
    // 4. Cleanup
    console.log("Cleaning up...");
    await prisma.aiReservationLedger.deleteMany({ where: { workspaceId: wsId } });
    await prisma.aiRequest.deleteMany({ where: { workspaceId: wsId } });
    await prisma.workspaceAiBudgetBalance.deleteMany({ where: { workspaceId: wsId } });
    await prisma.workspaceEntitlement.deleteMany({ where: { workspaceId: wsId } });
    await prisma.workspace.delete({ where: { slug: "test_concurrent_ws" } });
    await prisma.$disconnect();
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
