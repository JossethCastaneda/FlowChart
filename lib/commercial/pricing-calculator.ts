import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export type PlanKey = "STARTER" | "PRO" | "AGENCY" | "ENTERPRISE";

export interface PricingEstimateParams {
  planKey: PlanKey;
  billingPeriod: "MONTHLY" | "ANNUALLY";
  seats: number;
  workspaces: number;
}

export interface ProfitabilitySimulationResult {
  RevenueBeforeTax: Prisma.Decimal;
  ProviderCost: Prisma.Decimal;
  VercelCost: Prisma.Decimal;
  NeonCost: Prisma.Decimal;
  StripeCost: Prisma.Decimal;
  OtherAttributedCost: Prisma.Decimal;
  TotalAttributedCost: Prisma.Decimal;
  ContributionAmount: Prisma.Decimal;
  ContributionMarginPercent: Prisma.Decimal;
  MarkupPercent: Prisma.Decimal;
  TargetMarginPercent: Prisma.Decimal;
  MinimumMarginPercent: Prisma.Decimal;
  MarginStatus: "HEALTHY" | "WARNING" | "CRITICAL";
  TaxableBase: Prisma.Decimal;
  TaxAmount: Prisma.Decimal;
  CustomerTotal: Prisma.Decimal;
}

export class PricingCalculator {

  async simulateProfitability(
    planKey: PlanKey,
    billingPeriod: "MONTHLY" | "ANNUALLY",
    scenario: "LOW" | "EXPECTED" | "HEAVY" | "STRESS"
  ): Promise<ProfitabilitySimulationResult> {
    const plan = await prisma.plan.findUnique({
      where: { key: planKey },
      include: { versions: { where: { status: "ACTIVE" }, orderBy: { version: "desc" }, take: 1 } }
    });

    if (!plan || plan.versions.length === 0) throw new Error(`Plan not found`);
    const version = plan.versions[0];
    const isAnnual = billingPeriod === "ANNUALLY";
    const RevenueBeforeTax = isAnnual ? version.annualPriceUsd : version.basePriceUsd;

    // Simulation heuristics based on scenario
    let aiCost = new Prisma.Decimal(0);
    let neonCost = new Prisma.Decimal(0);
    let vercelCost = new Prisma.Decimal(0);

    const multipliers: Record<string, number> = { LOW: 0.2, EXPECTED: 1.0, HEAVY: 3.0, STRESS: 10.0 };
    const mult = multipliers[scenario];

    // Base expected costs (mocked logic for simulation based on DB rates)
    aiCost = new Prisma.Decimal(2.5 * mult); 
    neonCost = new Prisma.Decimal(0.5 * mult);
    vercelCost = new Prisma.Decimal(1.0); // Fixed per seat mostly

    const StripeCost = RevenueBeforeTax.mul(0.036).add(0.30); // Approx stripe fee
    const TotalAttributedCost = aiCost.add(neonCost).add(vercelCost).add(StripeCost);
    const ContributionAmount = RevenueBeforeTax.sub(TotalAttributedCost);
    
    const RevenueNum = Number(RevenueBeforeTax);
    const CostNum = Number(TotalAttributedCost);
    
    let ContributionMarginPercent = new Prisma.Decimal(0);
    if (RevenueNum > 0) {
       ContributionMarginPercent = new Prisma.Decimal((Number(ContributionAmount) / RevenueNum) * 100);
    }

    let MarkupPercent = new Prisma.Decimal(0);
    if (CostNum > 0) {
       MarkupPercent = new Prisma.Decimal((RevenueNum - CostNum) / CostNum * 100);
    }

    const TargetMarginPercent = new Prisma.Decimal(75);
    const MinimumMarginPercent = new Prisma.Decimal(40);
    
    let MarginStatus: "HEALTHY" | "WARNING" | "CRITICAL" = "HEALTHY";
    if (ContributionMarginPercent.lessThan(MinimumMarginPercent)) {
      MarginStatus = "CRITICAL";
    } else if (ContributionMarginPercent.lessThan(TargetMarginPercent)) {
      MarginStatus = "WARNING";
    }

    const TaxableBase = RevenueBeforeTax;
    const TaxAmount = TaxableBase.mul(0.16); // e.g. 16% IVA
    const CustomerTotal = TaxableBase.add(TaxAmount);

    return {
      RevenueBeforeTax,
      ProviderCost: aiCost,
      VercelCost: vercelCost,
      NeonCost: neonCost,
      StripeCost,
      OtherAttributedCost: new Prisma.Decimal(0),
      TotalAttributedCost,
      ContributionAmount,
      ContributionMarginPercent,
      MarkupPercent,
      TargetMarginPercent,
      MinimumMarginPercent,
      MarginStatus,
      TaxableBase,
      TaxAmount,
      CustomerTotal
    };
  }

  /**
   * Resolves the Stripe Price ID for a specific Plan + Period
   */
  async getStripePriceId(planKey: PlanKey, billingPeriod: "MONTHLY" | "ANNUALLY"): Promise<string | null> {
    const plan = await prisma.plan.findUnique({
      where: { key: planKey },
      include: {
        versions: {
          where: { status: "ACTIVE" },
          orderBy: { version: "desc" },
          take: 1,
          include: {
            prices: {
              where: { billingPeriod }
            }
          }
        }
      }
    });

    if (!plan || plan.versions.length === 0) return null;
    const version = plan.versions[0];
    if (version.prices.length === 0) return null;
    
    return version.prices[0].stripePriceId;
  }
}
