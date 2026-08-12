import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkAiLimit, recordAiUsage } from "@/lib/ai/metering";
import prisma from "@/lib/prisma";
import * as limits from "@/lib/plan-limits";

vi.mock("@/lib/prisma", () => {
  return {
    default: {
      workspace: {
        findUnique: vi.fn(),
      },
      aiUsage: {
        count: vi.fn(),
        create: vi.fn(),
      },
    },
  };
});

describe("AI Metering (metering.ts)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("checkAiLimit", () => {
    it("should return allowed: false if workspace not found", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);
      
      const result = await checkAiLimit("ws-123");
      expect(result.allowed).toBe(false);
      expect(result.message).toBe("Workspace no encontrado");
    });

    it("should return allowed: false if plan limit is exceeded", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        id: "ws-123",
        name: "Test",
        slug: "test",
        plan: "free",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.aiUsage.count).mockResolvedValue(100);
      
      vi.spyOn(limits, "checkPlanLimit").mockReturnValue({
        exceeded: true,
        message: "Límite de IA excedido",
        plan: "free",
        limit: 50,
        used: 100,
        remaining: 0,
      });

      const result = await checkAiLimit("ws-123");
      expect(result.allowed).toBe(false);
      expect(result.message).toBe("Límite de IA excedido");
    });

    it("should return allowed: true if limit is not exceeded", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        id: "ws-123",
        name: "Test",
        slug: "test",
        plan: "pro",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.aiUsage.count).mockResolvedValue(100);
      
      vi.spyOn(limits, "checkPlanLimit").mockReturnValue({
        exceeded: false,
        message: "",
        plan: "pro",
        limit: 500,
        used: 100,
        remaining: 400,
      });

      const result = await checkAiLimit("ws-123");
      expect(result.allowed).toBe(true);
    });

    it("should fail-closed (return false) on DB error", async () => {
      vi.mocked(prisma.workspace.findUnique).mockRejectedValue(new Error("DB Connection Error"));
      
      const result = await checkAiLimit("ws-123");
      expect(result.allowed).toBe(false); // Security measure
      expect(result.message).toContain("Por seguridad, la solicitud fue bloqueada");
    });
  });

  describe("recordAiUsage", () => {
    it("should create aiUsage record successfully", async () => {
      vi.mocked(prisma.aiUsage.create).mockResolvedValue({
        id: "usage-123",
        createdAt: new Date(),
        workspaceId: "ws-123",
        provider: "openai",
        route: "/api/test",
        idempotencyKey: "mock-idem",
        requestId: "mock-req",
        model: "gpt-4",
        tokensIn: 10,
        tokensOut: 20,
        providerCostUsd: 0.04,
        customerChargeUsd: 0.05,
        feature: "test-feature",
      });
      
      await recordAiUsage("ws-123", "/api/test", "gpt-4", 10, 20, {
        provider: "openai",
        feature: "test-feature",
      });

      expect(prisma.aiUsage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: "ws-123",
            route: "/api/test",
            model: "gpt-4",
            tokensIn: 10,
            tokensOut: 20,
            provider: "openai",
            feature: "test-feature",
          }),
        })
      );
    });
    
    it("should log error but not throw if create fails", async () => {
      vi.mocked(prisma.aiUsage.create).mockRejectedValue(new Error("DB Error"));
      
      // Should not throw
      await expect(
        recordAiUsage("ws-123", "/api/test", "gpt-4", 10, 20)
      ).resolves.not.toThrow();
    });
  });
});
