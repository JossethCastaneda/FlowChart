import prisma from "../lib/prisma";
import { reserve } from "../lib/ai/finops/reservation";

async function run() {
  const wsId = "test_concurrent_ws";
  const period = new Date().toISOString().substring(0, 7);
  
  try {
    // 1. Setup
    console.log("Setting up workspace...");
    await prisma.workspace.upsert({
      where: { slug: "test_concurrent_ws" },
      create: { id: wsId, name: "Test Concurrent WS", slug: "test_concurrent_ws" },
      update: {}
    });

    await prisma.workspaceAiBudgetBalance.upsert({
      where: { workspaceId_period: { workspaceId: wsId, period } },
      create: {
        workspaceId: wsId,
        period,
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
      update: {}
    });

    // 2. Fire Concurrent Requests
    console.log("Firing 5 concurrent requests of $1.00 each...");
    const requests = Array.from({ length: 5 }).map((_, i) => 
      reserve(wsId, "test_feature", 1.00, `idem_test_${Date.now()}_${i}`)
    );

    const contexts = await Promise.all(requests);
    console.log(`Successfully reserved ${contexts.length} items`);

    // 2.5 Fire Idempotency Check
    console.log("Testing exact identity resolution...");
    const firstContext = contexts[0];
    const duplicateContext = await reserve(wsId, "test_feature", 1.00, firstContext.idempotencyKey);
    
    if (duplicateContext.reservationId === firstContext.reservationId) {
      console.log(`✅ EXACT IDENTITY MATCH: ${duplicateContext.reservationId}`);
    } else {
      console.error(`❌ IDENTITY MISMATCH: Expected ${firstContext.reservationId}, got ${duplicateContext.reservationId}`);
      process.exit(1);
    }

    // 3. Verify
    const balance = await prisma.workspaceAiBudgetBalance.findUnique({
      where: { workspaceId_period: { workspaceId: wsId, period } }
    });

    console.log(`Expected Reserved USD: ${(5.0).toFixed(2)}`);
    console.log(`Actual Reserved USD: ${balance?.customerReservedUsd}`);
    
    if (Number(balance?.customerReservedUsd) === 5.0) {
      console.log("✅ CONCURRENT TEST PASSED!");
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
