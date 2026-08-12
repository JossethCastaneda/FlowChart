import prisma from "@/lib/prisma";

export interface ProviderCostResult {
  cost: number | null;
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

  // Cost calculation assumes prices are per 1 token to keep math simple.
  // E.g., if API charges $2.50 per 1M tokens, the DB should store 0.0000025.
  let totalCost = 0;
  totalCost += inputTokens * Number(pricing.inputPrice);
  totalCost += outputTokens * Number(pricing.outputPrice);

  if (cachedTokens > 0 && pricing.cachedInputPrice) {
    totalCost += cachedTokens * Number(pricing.cachedInputPrice);
  }

  return {
    cost: totalCost,
    currency: pricing.currency,
  };
}
