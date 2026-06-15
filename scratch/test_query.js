const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Checking Project.crmIntegrationIds...");
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, crmIntegrationIds: true },
    take: 1
  });
  console.log("Projects query OK");

  console.log("\nChecking Integration.name...");
  const integrations = await prisma.integration.findMany({
    select: { id: true, provider: true, name: true },
    take: 1
  });
  console.log("Integrations query OK");

  console.log("\nChecking AnalyticsOutcomeRule.projectId...");
  const outcomeRules = await prisma.analyticsOutcomeRule.findMany({
    select: { id: true, projectId: true },
    take: 1
  });
  console.log("AnalyticsOutcomeRule query OK");

  console.log("\nChecking AnalyticsKpiTarget with new composite key...");
  const kpiTargets = await prisma.analyticsKpiTarget.findMany({
    select: { id: true, projectId: true, kpiKey: true },
    take: 1
  });
  console.log("AnalyticsKpiTarget query OK");

  console.log("\nChecking AnalyticsDailyMetric with new composite key...");
  const dailyMetrics = await prisma.analyticsDailyMetric.findMany({
    select: { id: true, projectId: true, date: true },
    take: 1
  });
  console.log("AnalyticsDailyMetric query OK");

  console.log("\nChecking new table AnalyticsFunnel...");
  const funnels = await prisma.analyticsFunnel.findMany({
    select: { id: true, name: true },
    take: 1
  });
  console.log("AnalyticsFunnel query OK");

  console.log("\nChecking new table AnalyticsAlert...");
  const alerts = await prisma.analyticsAlert.findMany({
    select: { id: true, type: true },
    take: 1
  });
  console.log("AnalyticsAlert query OK");

  console.log("\n--- All DB queries completed successfully! ---");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
