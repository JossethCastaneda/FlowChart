import { describe, it, expect, vi, beforeEach } from "vitest";
import { getActiveProvider, hasAnyProvider, getWorkspaceAiProvider } from "@/lib/ai/registry";
import { geminiProvider } from "@/lib/ai/providers/gemini";
import { openaiProvider } from "@/lib/ai/providers/openai";
import { anthropicProvider } from "@/lib/ai/providers/anthropic";
import prisma from "@/lib/prisma";

vi.mock("@/lib/prisma", () => {
  return {
    default: {
      workspaceSettings: {
        findUnique: vi.fn(),
      },
    },
  };
});

describe("AI Router (registry.ts)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getActiveProvider", () => {
    it("should return Gemini as preferred if configured", () => {
      vi.spyOn(geminiProvider, "isConfigured").mockReturnValue(true);
      vi.spyOn(anthropicProvider, "isConfigured").mockReturnValue(true);
      vi.spyOn(openaiProvider, "isConfigured").mockReturnValue(true);

      expect(getActiveProvider().id).toBe("gemini");
    });

    it("should fallback to Anthropic if Gemini is not configured", () => {
      vi.spyOn(geminiProvider, "isConfigured").mockReturnValue(false);
      vi.spyOn(anthropicProvider, "isConfigured").mockReturnValue(true);
      vi.spyOn(openaiProvider, "isConfigured").mockReturnValue(true);

      expect(getActiveProvider().id).toBe("anthropic");
    });

    it("should fallback to OpenAI if Gemini and Anthropic are not configured", () => {
      vi.spyOn(geminiProvider, "isConfigured").mockReturnValue(false);
      vi.spyOn(anthropicProvider, "isConfigured").mockReturnValue(false);
      vi.spyOn(openaiProvider, "isConfigured").mockReturnValue(true);

      expect(getActiveProvider().id).toBe("openai");
    });
    
    it("should return gemini if nothing is configured (default fallback)", () => {
      vi.spyOn(geminiProvider, "isConfigured").mockReturnValue(false);
      vi.spyOn(anthropicProvider, "isConfigured").mockReturnValue(false);
      vi.spyOn(openaiProvider, "isConfigured").mockReturnValue(false);

      expect(getActiveProvider().id).toBe("gemini");
    });
  });

  describe("hasAnyProvider", () => {
    it("should return true if at least one is configured", () => {
      vi.spyOn(geminiProvider, "isConfigured").mockReturnValue(false);
      vi.spyOn(anthropicProvider, "isConfigured").mockReturnValue(false);
      vi.spyOn(openaiProvider, "isConfigured").mockReturnValue(true);

      expect(hasAnyProvider()).toBe(true);
    });

    it("should return false if none are configured", () => {
      vi.spyOn(geminiProvider, "isConfigured").mockReturnValue(false);
      vi.spyOn(anthropicProvider, "isConfigured").mockReturnValue(false);
      vi.spyOn(openaiProvider, "isConfigured").mockReturnValue(false);

      expect(hasAnyProvider()).toBe(false);
    });
  });

  describe("getWorkspaceAiProvider", () => {
    it("should return workspace preferred provider if it exists and is configured", async () => {
      vi.spyOn(geminiProvider, "isConfigured").mockReturnValue(true);
      vi.spyOn(openaiProvider, "isConfigured").mockReturnValue(true);
      
      vi.mocked(prisma.workspaceSettings.findUnique).mockResolvedValue({
        id: "set-123",
        createdAt: new Date(),
        updatedAt: new Date(),
        workspaceId: "ws-123",
        areas: [],
        requireLeadReview: false,
        branding: {},
        extConfig: { ariaProvider: "openai", ariaGenerativeModel: "gpt-4o" },
      });

      const result = await getWorkspaceAiProvider("ws-123");
      expect(result.provider.id).toBe("openai");
      expect(result.model).toBe("gpt-4o");
    });

    it("should fallback to getActiveProvider if workspace preference is not configured in env", async () => {
      vi.spyOn(geminiProvider, "isConfigured").mockReturnValue(true); // Active
      vi.spyOn(openaiProvider, "isConfigured").mockReturnValue(false); // Workspace preference but not configured
      
      vi.mocked(prisma.workspaceSettings.findUnique).mockResolvedValue({
        id: "set-123",
        createdAt: new Date(),
        updatedAt: new Date(),
        workspaceId: "ws-123",
        areas: [],
        requireLeadReview: false,
        branding: {},
        extConfig: { ariaProvider: "openai" },
      });

      const result = await getWorkspaceAiProvider("ws-123");
      expect(result.provider.id).toBe("gemini"); // Fallback to active
    });

    it("should fallback to getActiveProvider if DB fails", async () => {
      vi.spyOn(geminiProvider, "isConfigured").mockReturnValue(true);
      
      vi.mocked(prisma.workspaceSettings.findUnique).mockRejectedValue(new Error("DB Error"));

      const result = await getWorkspaceAiProvider("ws-123");
      expect(result.provider.id).toBe("gemini");
    });
  });
});
