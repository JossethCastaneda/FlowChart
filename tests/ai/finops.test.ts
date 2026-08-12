import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateProviderCost } from "@/lib/ai/finops/pricing";
import { reserve, settle, release } from "@/lib/ai/finops/reservation";
import { checkEntitlement } from "@/lib/ai/finops/entitlements";
import prisma from "@/lib/prisma";

const { mockPrisma } = vi.hoisted(() => {
  const mPrisma: any = {
    $transaction: vi.fn(async (cb) => cb(mPrisma)),
    aiModelPricing: { findFirst: vi.fn() },
    workspaceEntitlement: { findUnique: vi.fn() },
    aiUsage: { aggregate: vi.fn(), create: vi.fn(), upsert: vi.fn() },
    aiRequest: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  };
  return { mockPrisma: mPrisma };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

describe("FinOps: Pricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates cost accurately if pricing is found", async () => {
    vi.mocked(prisma.aiModelPricing.findFirst).mockResolvedValue({
      id: "price_1",
      provider: "openai",
      providerModelId: "gpt-4o",
      inputPrice: 0.000005,
      outputPrice: 0.000015,
      cachedInputPrice: 0.0000025,
      currency: "USD",
      effectiveFrom: new Date(),
      effectiveTo: null,
      sourceMetadata: null,
    });

    const result = await calculateProviderCost("openai", "gpt-4o", 1000, 500, 200);
    
    // (1000 * 0.000005) + (500 * 0.000015) + (200 * 0.0000025)
    // 0.005 + 0.0075 + 0.0005 = 0.013
    expect(result.cost).toBeCloseTo(0.013);
    expect(result.currency).toBe("USD");
  });

  it("returns null cost if pricing is unknown", async () => {
    vi.mocked(prisma.aiModelPricing.findFirst).mockResolvedValue(null);

    const result = await calculateProviderCost("unknown", "model", 1000, 1000);
    expect(result.cost).toBeNull();
  });
});

describe("FinOps: Entitlements & Reservations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checkEntitlement fails if workspace has no entitlement", async () => {
    vi.mocked(prisma.workspaceEntitlement.findUnique).mockResolvedValue(null);
    
    const result = await checkEntitlement("ws_1", "optimization_planner");
    expect(result.allowed).toBe(false);
  });

  it("checkEntitlement allows access if features match and under budget", async () => {
    vi.mocked(prisma.workspaceEntitlement.findUnique).mockResolvedValue({
      id: "ent_1",
      workspaceId: "ws_1",
      saasPlan: "PRO",
      allowedFeatures: ["optimization_planner"],
      monthlyAiBudget: 100,
      dailyAutopilotAiBudget: null,
      maxAiCostPerRun: null,
      availableCredits: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.aiUsage.aggregate).mockResolvedValue({
      _sum: { customerChargeUsd: 50 }, // under 100
    } as any);

    const result = await checkEntitlement("ws_1", "optimization_planner");
    expect(result.allowed).toBe(true);
  });

  it("checkEntitlement blocks access if over monthly budget", async () => {
    vi.mocked(prisma.workspaceEntitlement.findUnique).mockResolvedValue({
      id: "ent_1",
      workspaceId: "ws_1",
      saasPlan: "PRO",
      allowedFeatures: ["optimization_planner"],
      monthlyAiBudget: 100,
      dailyAutopilotAiBudget: null,
      maxAiCostPerRun: null,
      availableCredits: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.aiUsage.aggregate).mockResolvedValue({
      _sum: { customerChargeUsd: 150 }, // OVER 100
    } as any);

    await expect(checkEntitlement("ws_1", "optimization_planner")).rejects.toThrow("Monthly AI budget exceeded");
  });

  it("reserve uses transaction and idempotencyKey correctly", async () => {
    vi.mocked(prisma.aiRequest.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.workspaceEntitlement.findUnique).mockResolvedValue({
      id: "ent_1",
      workspaceId: "ws_1",
      saasPlan: "PRO",
      allowedFeatures: ["optimization_planner"],
      monthlyAiBudget: null,
      dailyAutopilotAiBudget: null,
      maxAiCostPerRun: null,
      availableCredits: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.aiRequest.create).mockResolvedValue({
      id: "req_123",
      workspaceId: "ws_1",
      idempotencyKey: "idem_key_1",
      feature: "optimization_planner",
      status: "RUNNING",
      createdAt: new Date(),
      completedAt: null,
    });

    const ctx = await reserve("ws_1", "optimization_planner", 0.05, "idem_key_1");
    
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(ctx.requestId).toBe("req_123");
    expect(prisma.aiRequest.create).toHaveBeenCalledOnce();
  });
  
  it("reserve returns existing context if idempotencyKey exists (idempotent)", async () => {
    vi.mocked(prisma.aiRequest.findUnique).mockResolvedValue({
      id: "req_exist_1",
      workspaceId: "ws_1",
      idempotencyKey: "idem_key_1",
      feature: "optimization_planner",
      status: "RUNNING",
      createdAt: new Date(),
      completedAt: null,
    });
    
    const ctx = await reserve("ws_1", "optimization_planner", 0.05, "idem_key_1");
    expect(ctx.requestId).toBe("req_exist_1");
    expect(prisma.aiRequest.create).not.toHaveBeenCalled();
    expect(prisma.workspaceEntitlement.findUnique).not.toHaveBeenCalled();
  });

  it("settle marks request succeeded and creates usages using upsert for idempotency", async () => {
    await settle(
      { workspaceId: "ws_1", requestId: "req_123", feature: "optimization_planner", estimatedCost: 0.1 },
      [{ runId: "run_1", route: "/api/opt", model: "gpt-4", provider: "openai", tokensIn: 10, tokensOut: 20, providerCost: 0.04, customerCharge: 0.05 }]
    );

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    
    expect(prisma.aiRequest.update).toHaveBeenCalledWith({
      where: { id: "req_123" },
      data: expect.objectContaining({ status: "SUCCEEDED" })
    });

    expect(prisma.aiUsage.upsert).toHaveBeenCalledWith({
      where: { idempotencyKey: "req_123-run_1" },
      update: {},
      create: expect.objectContaining({
        workspaceId: "ws_1",
        requestId: "req_123",
        providerCostUsd: 0.04,
        customerChargeUsd: 0.05,
      })
    });
  });
});
