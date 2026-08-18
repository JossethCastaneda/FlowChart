import { logger } from "@/lib/logger";
import type { OptimizationPlan } from "./planner";
import type { OptimizationContext } from "./context-builder";

export interface EvaluationResult {
  accepted: boolean;
  rejectionReason?: string;
  validatedActions: OptimizationPlan["actions"];
}

/**
 * Deterministic Evaluator (The "Software Authorization" Layer).
 * Ensures that AI-proposed plans do not violate invariants before they reach the Execution Engine.
 */
export function evaluatePlan(
  plan: OptimizationPlan,
  context: OptimizationContext
): EvaluationResult {
  const validatedActions: OptimizationPlan["actions"] = [];

  for (const action of plan.actions) {
    // Invariant 1: Action Type must be supported and reversible
    if (action.actionType !== "PAUSE_CAMPAIGN" && action.actionType !== "CHANGE_CAMPAIGN_STATUS") {
      logger.warn("[Evaluator] Rejected action: Unsupported type", { action });
      continue;
    }

    // Invariant 2: Entity must exist in the context
    if (action.entity.type !== "campaign") {
      logger.warn("[Evaluator] Rejected action: Unsupported entity type", { action });
      continue;
    }

    const campaignExists = context.metricsSummary.topPerformingCampaigns.some(c => c.campaignId === action.entity.id) ||
                           context.metricsSummary.underperformingCampaigns.some(c => c.campaignId === action.entity.id);

    if (!campaignExists) {
      logger.warn("[Evaluator] Rejected action: Entity not found in active context", { action });
      continue;
    }

    // Invariant 3: Evidence is required
    if (!action.evidence || action.evidence.length === 0) {
      logger.warn("[Evaluator] Rejected action: No evidence provided", { action });
      continue;
    }

    validatedActions.push(action);
  }

  if (validatedActions.length === 0 && plan.actions.length > 0) {
    return {
      accepted: false,
      rejectionReason: "All proposed actions violated safety invariants.",
      validatedActions: []
    };
  }

  return {
    accepted: true,
    validatedActions
  };
}
