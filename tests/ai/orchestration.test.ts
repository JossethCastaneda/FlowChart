import { describe, it, expect, vi } from "vitest";
import { orchestrateOptimization } from "../../lib/optimization/ai/orchestrator";
import { getProvider } from "../../lib/ai/registry";
import type { LLMProvider } from "../../lib/ai/types";
import { AI_CATALOG } from "../../lib/ai/catalog";

// Mock the AI router/provider to avoid hitting actual APIs
vi.mock("../../lib/ai/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/ai/registry")>();
  return {
    ...actual,
    getWorkspaceAiProvider: vi.fn().mockResolvedValue({ provider: null, model: null }), // Force fallback
    getProvider: vi.fn(),
  };
});

// Mock Prisma for durable telemetry
vi.mock("@/lib/prisma", () => ({
  default: {
    aiRequest: {
      create: vi.fn().mockResolvedValue({ id: "req_mock" }),
      update: vi.fn(),
    },
    aiRun: {
      create: vi.fn().mockResolvedValue({ id: "run_mock", startedAt: new Date() }),
      update: vi.fn(),
    },
    aiModelPricing: {
      findFirst: vi.fn().mockResolvedValue(null),
    }
  },
  prisma: {
    aiRequest: {
      create: vi.fn().mockResolvedValue({ id: "req_mock" }),
      update: vi.fn(),
    },
    aiRun: {
      create: vi.fn().mockResolvedValue({ id: "run_mock", startedAt: new Date() }),
      update: vi.fn(),
    },
    aiModelPricing: {
      findFirst: vi.fn().mockResolvedValue(null),
    }
  }
}));

describe("AI Orchestration Pipeline", () => {
  it("should process a context and output safe ProposedActions without executing them", async () => {
    // Mock the provider to return a valid OptimizationPlan
    const mockProvider: LLMProvider = {
      id: "gemini",
      defaultModel: "gemini-1.5-flash",
      isConfigured: () => true,
      complete: vi.fn(),
      completeStructured: vi.fn().mockResolvedValue({
        text: "mock",
        model: "gemini-1.5-flash-latest",
        provider: "gemini",
        data: {
          actions: [
            {
              actionType: "PAUSE_CAMPAIGN",
              entity: { type: "campaign", id: "camp-bad" },
              proposedValue: "PAUSED",
              expectedImpact: "Saves $100",
              evidence: ["CPA 50 > Target 10"]
            }
          ]
        },
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 }
      })
    };

    (getProvider as any).mockReturnValue(mockProvider);

    const snapshot = {
      clientId: "client-test",
      schemaVersion: "1.0.0",
      period: { from: "2026-08-01", to: "2026-08-10" },
      cutoffAt: "2026-08-10T00:00:00Z",
      sources: [{ provider: "meta" as const, sourceId: "s-1", accountId: "acc-1", syncedAt: "2026-08-10T00:00:00Z" }],
      normalizedMetrics: [
        {
          date: "2026-08-05", provider: "meta" as const, accountId: "acc-1", level: "campaign" as const,
          entityId: "camp-bad", campaignId: "camp-bad", currency: "USD", timezone: "UTC",
          attributionWindow: "7d_click", spend: 100, impressions: 1000, clicks: 10, conversions: 2,
          revenue: 0, sourceUpdatedAt: "2026-08-10T00:00:00Z"
        }
      ],
      modelVersions: [],
      configuration: {}
    };

    const objective = {
      clientId: "client-test",
      status: "active" as const,
      primaryKpi: "cpa",
      direction: "minimize" as const,
      targetValue: 10,
      windowType: "rolling" as const,
      currency: "USD",
      timezone: "UTC",
      hardConstraints: [],
      softPreferences: [],
      guardrails: [{ metric: "spend", operator: "lte" as const, value: 500 }],
      riskTolerance: "conservative" as const,
      maxChangePctPerCycle: 10,
      approvalPolicy: { manualOnly: true as const, executionEnabled: false, requiredRoles: ["OWNER" as const], minimumApprovals: 1, highRiskMinimumApprovals: 2 },
    };

    const proposedActions = await orchestrateOptimization("ws-test", snapshot, objective);

    expect(proposedActions.length).toBe(1);
    expect(proposedActions[0].field).toBe("status");
    expect(proposedActions[0].proposedValue).toBe("PAUSED");
    expect(proposedActions[0].evidence.length).toBe(1);
    expect(proposedActions[0].entity.id).toBe("camp-bad");
    expect(proposedActions[0].clientId).toBe("client-test");
    
    // Ensure that it called structured output
    expect(mockProvider.completeStructured).toHaveBeenCalled();
  });
});
