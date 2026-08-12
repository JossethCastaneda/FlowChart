import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import { ModuleCatalog } from "../lib/commercial/module-catalog";
import { MODULES } from "../lib/flowchart-kit/modules";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedPlans() {
  const plans = [
    { key: "STARTER", name: "Starter", description: "Essential tools for individuals", basePriceUsd: 19, annualPriceUsd: 15, includedSeats: 1, includedWs: 1 },
    { key: "PRO", name: "Pro", description: "Advanced tools for professionals", basePriceUsd: 49, annualPriceUsd: 39, includedSeats: 3, includedWs: 3 },
    { key: "AGENCY", name: "Agency", description: "Scale your marketing operations", basePriceUsd: 149, annualPriceUsd: 119, includedSeats: 10, includedWs: 10 },
    { key: "ENTERPRISE", name: "Enterprise", description: "Custom solutions for large teams", basePriceUsd: 499, annualPriceUsd: 399, includedSeats: 50, includedWs: 50 },
  ];

  for (const p of plans) {
    const plan = await prisma.plan.upsert({
      where: { key: p.key },
      update: { name: p.name, description: p.description },
      create: { key: p.key, name: p.name, description: p.description }
    });

    const planVersion = await prisma.planVersion.create({
      data: {
        planId: plan.id,
        version: 1,
        status: "ACTIVE",
        basePriceUsd: p.basePriceUsd,
        annualPriceUsd: p.annualPriceUsd,
        includedSeats: p.includedSeats,
        includedWs: p.includedWs,
        effectiveFrom: new Date(),
      }
    });

    // Map modules explicitly to plans
    for (const m of MODULES) {
      let isIncluded = false;
      if (p.key === "STARTER" && ["resumen", "publicacion"].includes(m.key)) isIncluded = true;
      if (p.key === "PRO" && ["resumen", "clientes", "publicacion", "tareas", "briefs", "reportes"].includes(m.key)) isIncluded = true;
      if (p.key === "AGENCY" && !["aria", "optimization"].includes(m.key)) isIncluded = true;
      if (p.key === "ENTERPRISE") isIncluded = true; // All included

      if (isIncluded) {
        // Find existing module record (will be created during ModuleCatalog sync)
        // Since we are seeding, we'll upsert plan modules after modules are synced. 
        // We will do this mapping separately below.
      }
    }
  }
}

async function seedAiPackages() {
  const packages = [
    { key: "GEMINI", name: "Gemini Fleet", baseFeeUsd: 0, includedUnits: 1000, variableUnitPrice: 0.1 },
    { key: "GPT", name: "OpenAI Fleet", baseFeeUsd: 0, includedUnits: 1000, variableUnitPrice: 0.15 },
    { key: "CLAUDE", name: "Claude Fleet", baseFeeUsd: 0, includedUnits: 1000, variableUnitPrice: 0.2 },
    { key: "SMART", name: "Smart Router", baseFeeUsd: 0, includedUnits: 2000, variableUnitPrice: 0.05 },
  ];

  for (const pkg of packages) {
    const p = await prisma.aiPackage.upsert({
      where: { key: pkg.key },
      update: { name: pkg.name },
      create: { key: pkg.key, name: pkg.name }
    });

    await prisma.aiPackageVersion.create({
      data: {
        packageId: p.id,
        status: "ACTIVE",
        baseFeeUsd: pkg.baseFeeUsd,
        includedUnits: pkg.includedUnits,
        variableUnitPrice: pkg.variableUnitPrice,
      }
    });
  }
}

async function main() {
  console.log("Seeding commercial catalog...");

  console.log("Seeding plans...");
  await seedPlans();

  console.log("Seeding modules...");
  // Overriding prisma instance globally isn't easy here, but ModuleCatalog uses its own PrismaClient.
  // We should ideally pass the transaction, but this is a seed script.
  const catalog = new ModuleCatalog(prisma);
  await catalog.syncModulesToDb();

  // Create Plan Modules Mapping
  console.log("Mapping Plan Entitlements...");
  const dbPlans = await prisma.planVersion.findMany({ include: { plan: true } });
  const dbModules = await prisma.module.findMany();

  for (const pv of dbPlans) {
    for (const m of dbModules) {
      const pKey = pv.plan.key;
      const mKey = m.key;
      let isIncluded = false;
      
      if (pKey === "STARTER" && ["resumen", "publicacion"].includes(mKey)) isIncluded = true;
      if (pKey === "PRO" && ["resumen", "clientes", "publicacion", "tareas", "briefs", "reportes"].includes(mKey)) isIncluded = true;
      if (pKey === "AGENCY" && !["aria", "optimization"].includes(mKey)) isIncluded = true;
      if (pKey === "ENTERPRISE") isIncluded = true;

      if (isIncluded) {
        await prisma.planModule.upsert({
          where: {
            planVersionId_moduleId: {
              planVersionId: pv.id,
              moduleId: m.id
            }
          },
          create: {
            planVersionId: pv.id,
            moduleId: m.id,
            isIncluded: true
          },
          update: {
            isIncluded: true
          }
        });
      }
    }
  }

  console.log("Seeding AI Packages...");
  await seedAiPackages();

  console.log("Done.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
