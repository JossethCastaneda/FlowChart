import { describe, it, expect } from "vitest";
import { evaluatePlan } from "../../lib/optimization/ai/evaluator";
import type { OptimizationPlan } from "../../lib/optimization/ai/planner";
import type { OptimizationContext } from "../../lib/optimization/ai/context-builder";

describe("Deterministic Evaluator", () => {
  const mockContext: OptimizationContext = {
    clientId: "c-123",
    period: { from: "2026-08-01", to: "2026-08-10" },
    objective: { primaryKpi: "cpa", direction: "minimize", targetValue: 10, guardrails: [] },
    metricsSummary: {
      totalSpend: 100, totalConversions: 5, cpa: 20,
      topPerformingCampaigns: [],
      underperformingCampaigns: [{ campaignId: "camp-bad", spend: 100, conversions: 2, cpa: 50 }]
    }
  };

  it("should accept valid actions", () => {
    const plan: OptimizationPlan = {
      actions: [{
        actionType: "PAUSE_CAMPAIGN",
        entity: { type: "campaign", id: "camp-bad" },
        proposedValue: "PAUSED",
        expectedImpact: "Saves $100",
        evidence: ["CPA is 50, target is 10"]
      }]
    };

    const result = evaluatePlan(plan, mockContext);
    expect(result.accepted).toBe(true);
    expect(result.validatedActions.length).toBe(1);
  });

  it("should reject actions for non-existent entities", () => {
    const plan: OptimizationPlan = {
      actions: [{
        actionType: "PAUSE_CAMPAIGN",
        entity: { type: "campaign", id: "camp-unknown" }, // Not in context
        proposedValue: "PAUSED",
        expectedImpact: "Saves money",
        evidence: ["High spend"]
      }]
    };

    const result = evaluatePlan(plan, mockContext);
    expect(result.accepted).toBe(false);
    expect(result.rejectionReason).toContain("All proposed actions violated safety invariants");
  });

  it("should reject actions with no evidence", () => {
    const plan: OptimizationPlan = {
      actions: [{
        actionType: "PAUSE_CAMPAIGN",
        entity: { type: "campaign", id: "camp-bad" },
        proposedValue: "PAUSED",
        expectedImpact: "Saves money",
        evidence: [] // Empty evidence
      }]
    };

    const result = evaluatePlan(plan, mockContext);
    expect(result.accepted).toBe(false);
  });

  it("should reject unsupported action types", () => {
    const plan: OptimizationPlan = {
      actions: [{
        actionType: "DELETE_CAMPAIGN" as any, // Not allowed
        entity: { type: "campaign", id: "camp-bad" },
        proposedValue: "DELETED",
        expectedImpact: "Gone",
        evidence: ["Bad performance"]
      }]
    };

    const result = evaluatePlan(plan, mockContext);
    expect(result.accepted).toBe(false);
  });
});
