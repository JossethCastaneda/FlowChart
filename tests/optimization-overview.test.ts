import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    optimizationClient: { findMany: vi.fn() },
    optimizationProposedAction: { findMany: vi.fn() },
  },
}));

import prisma from "@/lib/prisma";
import { getOptimizationOverview, parseQualitySummary } from "../lib/optimization/overview";

const mocked = prisma as unknown as {
  optimizationClient: { findMany: ReturnType<typeof vi.fn> };
  optimizationProposedAction: { findMany: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  mocked.optimizationClient.findMany.mockResolvedValue([]);
  mocked.optimizationProposedAction.findMany.mockResolvedValue([]);
});

describe("optimization overview quality parsing", () => {
  it("preserves a valid readiness report", () => {
    expect(parseQualitySummary({ score: 84, readiness: "mmm_ready", issues: [{ code: "stale" }] })).toEqual({
      score: 84,
      readiness: "mmm_ready",
      issues: 1,
    });
  });

  it("fails closed when persisted JSON is malformed", () => {
    expect(parseQualitySummary({ score: 200, readiness: "unknown", issues: "invalid" })).toEqual({
      score: 100,
      readiness: "insufficient_data",
      issues: 0,
    });
    expect(parseQualitySummary(null)).toEqual({ score: 0, readiness: "insufficient_data", issues: 0 });
  });
});

describe("optimization overview tenant boundaries", () => {
  it("scopes both dashboard queries to the active workspace", async () => {
    await getOptimizationOverview("ws-active");

    expect(mocked.optimizationClient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: "ws-active", status: "active" } })
    );
    expect(mocked.optimizationProposedAction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: "ws-active" } })
    );
  });
});
