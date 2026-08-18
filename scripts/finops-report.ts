import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function generateReport() {
  console.log("==========================================");
  console.log(" FLOWCHART AI OS - FINOPS METRICS REPORT");
  console.log("==========================================\n");

  // 1. AI Margins (Revenue vs COGS)
  const aiUsage = await prisma.aiUsage.aggregate({
    _sum: {
      providerCostUsd: true,
      customerChargeUsd: true
    }
  });

  const cost = Number(aiUsage._sum.providerCostUsd || 0);
  const revenue = Number(aiUsage._sum.customerChargeUsd || 0);
  const margin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;

  console.log(`[AI Fleet Unit Economics]`);
  console.log(`Total Provider Cost (COGS): $${cost.toFixed(4)} USD`);
  console.log(`Total Billed to Customers:  $${revenue.toFixed(4)} USD`);
  console.log(`Gross Margin:               ${margin.toFixed(2)}%\n`);

  // 2. Outstanding Ledger Balances (Uninvoiced usage)
  const ledger = await prisma.billingLedgerEntry.aggregate({
    _sum: {
      subtotal: true
    }
  });
  
  const uninvoiced = Number(ledger._sum.subtotal || 0);
  console.log(`[Ledger]`);
  console.log(`Total Uninvoiced Subtotal:  $${uninvoiced.toFixed(4)} USD\n`);

  // 3. Subscription MRR
  const subscriptions = await prisma.subscription.findMany({
    where: { status: "active" },
    select: { plan: true }
  });

  console.log(`[MRR - Active Subscriptions]`);
  console.log(`Active Subscriptions: ${subscriptions.length}`);
  // In a real system, we would map the 'plan' ID to the actual price.
  // For this report, we just output the raw count.

  // 4. Pending Recovery Cases
  const dunning = await prisma.billingRecoveryCase.count({
    where: { status: "ACTIVE" }
  });
  console.log(`\n[Dunning]`);
  console.log(`Active Recovery Cases: ${dunning}\n`);
  
  console.log("==========================================");
}

generateReport()
  .catch(e => {
    console.error("Failed to generate report:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
