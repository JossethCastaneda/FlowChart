export interface FlowChartPlan {
  id: string;
  stripePriceId: string;
  monthlyAiBudget: number;
}

export const PLAN_CATALOG: Record<string, FlowChartPlan> = {
  pro: {
    id: "pro",
    stripePriceId: process.env.STRIPE_PRICE_PRO || "price_mock_pro",
    monthlyAiBudget: 1000.0, // AI Credits (not cents)
  },
  enterprise: {
    id: "enterprise",
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE || "price_mock_enterprise",
    monthlyAiBudget: 5000.0,
  }
};

export function getPlanByPriceId(stripePriceId: string): FlowChartPlan | null {
  for (const plan of Object.values(PLAN_CATALOG)) {
    if (plan.stripePriceId === stripePriceId) {
      return plan;
    }
  }
  return null;
}

export function getPlan(id: string): FlowChartPlan {
  const plan = PLAN_CATALOG[id];
  if (!plan) {
    throw new Error(`Unknown plan: ${id}`);
  }
  
  if (process.env.NODE_ENV === "production" && plan.stripePriceId.includes("price_mock_")) {
    if (process.env.npm_lifecycle_event !== "build" && process.env.NEXT_PHASE !== "phase-production-build") {
       throw new Error(`Production configuration missing for Stripe Price ID of plan ${id}`);
    }
  }

  return plan;
}
