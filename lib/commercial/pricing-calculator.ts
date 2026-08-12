import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export type PlanKey = "STARTER" | "PRO" | "AGENCY" | "ENTERPRISE";

export interface PricingEstimateParams {
  planKey: PlanKey;
  billingPeriod: "MONTHLY" | "ANNUALLY";
  seats: number;
  workspaces: number;
}

export interface PricingEstimateResult {
  basePriceUsd: Prisma.Decimal;
  seatCostUsd: Prisma.Decimal;
  workspaceCostUsd: Prisma.Decimal;
  subtotalUsd: Prisma.Decimal;
  discountUsd: Prisma.Decimal;
  totalUsd: Prisma.Decimal;
  currency: string;
}

export class PricingCalculator {
  /**
   * Calculate estimated cost for a given plan configuration.
   */
  async estimatePlan(params: PricingEstimateParams): Promise<PricingEstimateResult> {
    const plan = await prisma.plan.findUnique({
      where: { key: params.planKey },
      include: {
        versions: {
          where: { status: "ACTIVE" },
          orderBy: { version: "desc" },
          take: 1
        }
      }
    });

    if (!plan || plan.versions.length === 0) {
      throw new Error(`Plan ${params.planKey} not found or has no active versions.`);
    }

    const version = plan.versions[0];
    const isAnnual = params.billingPeriod === "ANNUALLY";
    const basePriceUsd = isAnnual ? version.annualPriceUsd : version.basePriceUsd;
    
    // Calculate additional seats
    let seatCostUsd = new Prisma.Decimal(0);
    const extraSeats = Math.max(0, params.seats - version.includedSeats);
    if (extraSeats > 0) {
      const seatPrice = isAnnual ? new Prisma.Decimal(12) : new Prisma.Decimal(15);
      seatCostUsd = seatPrice.mul(extraSeats);
    }

    // Calculate additional workspaces
    let workspaceCostUsd = new Prisma.Decimal(0);
    const extraWorkspaces = Math.max(0, params.workspaces - version.includedWs);
    if (extraWorkspaces > 0) {
      const wsPrice = isAnnual ? new Prisma.Decimal(24) : new Prisma.Decimal(30);
      workspaceCostUsd = wsPrice.mul(extraWorkspaces);
    }

    const subtotalUsd = basePriceUsd.add(seatCostUsd).add(workspaceCostUsd);
    
    // Optional: Annual discount is already factored into base, but if we wanted to show explicit discount:
    const discountUsd = new Prisma.Decimal(0); 
    
    const totalUsd = subtotalUsd.sub(discountUsd);

    return {
      basePriceUsd,
      seatCostUsd,
      workspaceCostUsd,
      subtotalUsd,
      discountUsd,
      totalUsd,
      currency: "USD"
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
