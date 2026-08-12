import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface ProviderCostResult {
  cost: Prisma.Decimal | null;
  currency: string;
}

export async function calculateProviderCost(
  provider: string,
  providerModelId: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number = 0
): Promise<ProviderCostResult> {
  const pricing = await prisma.aiModelPricing.findFirst({
    where: {
      provider,
      providerModelId,
      effectiveFrom: { lte: new Date() },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (!pricing) {
    return { cost: null, currency: "USD" };
  }

  // Cost calculation uses Prisma.Decimal for financial precision
  // E.g., if API charges $2.50 per 1M tokens, the DB should store 0.0000025.
  let totalCost = new Prisma.Decimal(0);
  
  if (inputTokens > 0) {
    totalCost = totalCost.add(new Prisma.Decimal(inputTokens).mul(pricing.inputPrice));
  }
  if (outputTokens > 0) {
    totalCost = totalCost.add(new Prisma.Decimal(outputTokens).mul(pricing.outputPrice));
  }
  
  if (cachedTokens > 0 && pricing.cachedInputPrice) {
    totalCost = totalCost.add(new Prisma.Decimal(cachedTokens).mul(pricing.cachedInputPrice));
  }

  return {
    cost: totalCost,
    currency: pricing.currency,
  };
}
