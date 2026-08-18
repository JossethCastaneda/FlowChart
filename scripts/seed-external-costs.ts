import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

const models = [
  {
    provider: "openai",
    providerModelId: "gpt-4o-2024-08-06",
    inputPrice: new Prisma.Decimal(2.50), // Per 1M tokens
    outputPrice: new Prisma.Decimal(10.00),
    cachedInputPrice: new Prisma.Decimal(1.25),
  },
  {
    provider: "openai",
    providerModelId: "gpt-4o-mini-2024-07-18",
    inputPrice: new Prisma.Decimal(0.15),
    outputPrice: new Prisma.Decimal(0.60),
    cachedInputPrice: new Prisma.Decimal(0.075),
  },
  {
    provider: "anthropic",
    providerModelId: "claude-3-5-sonnet-20240620",
    inputPrice: new Prisma.Decimal(3.00),
    outputPrice: new Prisma.Decimal(15.00),
    cachedInputPrice: new Prisma.Decimal(0.30),
  },
  {
    provider: "anthropic",
    providerModelId: "claude-3-haiku-20240307",
    inputPrice: new Prisma.Decimal(0.25),
    outputPrice: new Prisma.Decimal(1.25),
    cachedInputPrice: new Prisma.Decimal(0.025),
  },
  {
    provider: "google",
    providerModelId: "gemini-1.5-pro-001",
    inputPrice: new Prisma.Decimal(3.50),
    outputPrice: new Prisma.Decimal(10.50),
    cachedInputPrice: new Prisma.Decimal(1.75),
  },
  {
    provider: "google",
    providerModelId: "gemini-1.5-flash-001",
    inputPrice: new Prisma.Decimal(0.075),
    outputPrice: new Prisma.Decimal(0.30),
    cachedInputPrice: new Prisma.Decimal(0.0375),
  }
];

async function seed() {
  console.log("Seeding External AI Costs with Prisma.Decimal...");
  
  for (const model of models) {
    await prisma.aiModelPricing.upsert({
      where: {
        provider_providerModelId_effectiveFrom: {
          provider: model.provider,
          providerModelId: model.providerModelId,
          effectiveFrom: new Date("2024-01-01T00:00:00Z")
        }
      },
      update: {
        inputPrice: model.inputPrice,
        outputPrice: model.outputPrice,
        cachedInputPrice: model.cachedInputPrice,
        currency: "USD",
      },
      create: {
        provider: model.provider,
        providerModelId: model.providerModelId,
        inputPrice: model.inputPrice,
        outputPrice: model.outputPrice,
        cachedInputPrice: model.cachedInputPrice,
        effectiveFrom: new Date("2024-01-01T00:00:00Z"),
        currency: "USD",
      }
    });
    console.log(`Seeded ${model.providerModelId}`);
  }
  
  console.log("Successfully seeded official AI costs.");
}

seed().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
