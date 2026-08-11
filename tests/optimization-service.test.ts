import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    optimizationClient: { findFirst: vi.fn() },
    optimizationProposedAction: { findUnique: vi.fn() },
    optimizationObjective: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import prisma from "@/lib/prisma";
import {
  createOptimizationClient,
  createOptimizationEvaluation,
  createOptimizationProposedAction,
  createOptimizationSnapshot,
} from "../lib/optimization/service";

const mocked = prisma as unknown as {
  optimizationClient: { findFirst: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Optimization service tenant boundaries", () => {
  it("rechaza un proyecto que no pertenece al workspace antes de crear el cliente", async () => {
    const tx = {
      project: { count: vi.fn().mockResolvedValue(0) },
      optimizationClient: { create: vi.fn() },
    };
    mocked.$transaction.mockImplementation(async (callback: (arg: typeof tx) => unknown) => callback(tx));

    await expect(createOptimizationClient("ws-a", "user-a", {
      key: "cliente-a",
      displayName: "Cliente A",
      environment: "production",
      defaultCurrency: "MXN",
      timezone: "America/Mexico_City",
      projectIds: ["project-from-ws-b"],
      adAccounts: [],
    })).rejects.toMatchObject({ code: "PROJECT_SCOPE_MISMATCH", status: 403 });
    expect(tx.optimizationClient.create).not.toHaveBeenCalled();
  });

  it("rechaza métricas de una cuenta fuera del allow-list antes de persistir el snapshot", async () => {
    mocked.optimizationClient.findFirst.mockResolvedValue({
      id: "client-a",
      defaultCurrency: "MXN",
      timezone: "America/Mexico_City",
      adAccounts: [{
        provider: "meta",
        externalAccountId: "act_allowed",
        currency: "MXN",
        timezone: "America/Mexico_City",
        attributionWindow: "7d_click_1d_view",
      }],
      objectives: [],
    });

    await expect(createOptimizationSnapshot("ws-a", "user-a", {
      clientId: "client-a",
      schemaVersion: "1.0.0",
      period: { from: "2026-08-10", to: "2026-08-10" },
      cutoffAt: "2026-08-11T00:00:00.000Z",
      sources: [{ provider: "meta", sourceId: "meta:other", accountId: "act_other", syncedAt: "2026-08-11T00:00:00.000Z" }],
      normalizedMetrics: [{
        date: "2026-08-10",
        provider: "meta",
        accountId: "act_other",
        level: "campaign",
        entityId: "cmp-1",
        currency: "MXN",
        timezone: "America/Mexico_City",
        attributionWindow: "7d_click_1d_view",
        spend: 10,
        impressions: 100,
        clicks: 5,
        conversions: 1,
        revenue: 20,
        sourceUpdatedAt: "2026-08-11T00:00:00.000Z",
      }],
      modelVersions: [],
      configuration: {},
    })).rejects.toMatchObject({ code: "ACCOUNT_SCOPE_MISMATCH", status: 403 });
    expect(mocked.$transaction).not.toHaveBeenCalled();
  });

  it("busca el snapshot por workspace y cliente antes de crear una propuesta", async () => {
    const tx = {
      optimizationProposedAction: { findUnique: vi.fn().mockResolvedValue(null) },
      optimizationSnapshot: { findFirst: vi.fn().mockResolvedValue(null) },
      optimizationAdAccount: { findFirst: vi.fn() },
      optimizationAuditEvent: { create: vi.fn() },
    };
    mocked.$transaction.mockImplementation(async (callback: (arg: typeof tx) => unknown) => callback(tx));

    await expect(createOptimizationProposedAction("ws-a", "user-a", {
      clientId: "client-a",
      snapshotId: "snapshot-from-ws-b",
      provider: "meta",
      accountId: "act-1",
      entity: { type: "campaign", id: "cmp-1" },
      field: "daily_budget",
      currentValue: 100,
      proposedValue: 90,
      unit: "minor_currency_units",
      expectedImpact: { spendDelta: -10 },
      uncertaintyInterval: { low: -15, high: -5, level: 0.9 },
      risk: "low",
      evidence: [{ id: "e1", source: "quality", locator: "snapshot:s1" }],
      rollbackCondition: { metric: "conversions", operator: "lt", value: 5 },
      idempotencyKey: "ws-a:client-a:snapshot-b:campaign-budget",
      remoteStateFingerprint: "sha256:remote-state",
      expiresAt: "2099-08-20T00:00:00.000Z",
      requiredApproverRole: "OWNER",
      state: "requires_review",
    })).rejects.toMatchObject({ code: "SNAPSHOT_NOT_FOUND", status: 404 });

    expect(tx.optimizationSnapshot.findFirst).toHaveBeenCalledWith({
      where: { id: "snapshot-from-ws-b", workspaceId: "ws-a", clientId: "client-a" },
    });
    expect(tx.optimizationAdAccount.findFirst).not.toHaveBeenCalled();
  });

  it("rechaza un snapshot de resultado perteneciente a otro tenant", async () => {
    const tx = {
      optimizationEvaluation: { findUnique: vi.fn().mockResolvedValue(null) },
      optimizationSnapshot: {
        findFirst: vi.fn()
          .mockResolvedValueOnce({ id: "source", cutoffAt: new Date("2026-08-01T23:59:59Z") })
          .mockResolvedValueOnce(null),
      },
    };
    mocked.$transaction.mockImplementation(async (callback: (arg: typeof tx) => unknown) => callback(tx));

    await expect(createOptimizationEvaluation("ws-a", "user-a", {
      clientId: "client-a",
      sourceSnapshotId: "source",
      outcomeSnapshotId: "outcome-from-ws-b",
      evaluationType: "shadow_policy",
      actionId: "action-a",
      aggregation: "period_total",
      scope: {},
      predictionLocator: "expectedImpact.conversions",
      minimumSampleSize: 1,
      idempotencyKey: "evaluation:tenant-boundary",
    })).rejects.toMatchObject({ code: "OUTCOME_SNAPSHOT_NOT_FOUND", status: 404 });

    expect(tx.optimizationSnapshot.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: "outcome-from-ws-b", workspaceId: "ws-a", clientId: "client-a" },
    });
  });

  it("deriva el valor observado del snapshot y conserva shadow mode como no causal", async () => {
    const source = {
      id: "source",
      cutoffAt: new Date("2026-08-01T23:59:59Z"),
      periodStart: new Date("2026-07-01T00:00:00Z"),
      status: "valid",
      activeObjective: { guardrails: [{ metric: "conversions", operator: "gte", value: 4 }] },
    };
    const outcome = {
      id: "outcome",
      cutoffAt: new Date("2026-08-09T23:59:59Z"),
      periodStart: new Date("2026-08-02T00:00:00Z"),
      status: "valid",
      normalizedMetrics: [{
        date: "2026-08-03",
        provider: "meta",
        accountId: "act-1",
        level: "campaign",
        entityId: "cmp-1",
        campaignId: "cmp-1",
        currency: "MXN",
        timezone: "America/Mexico_City",
        attributionWindow: "7d_click_1d_view",
        spend: 100,
        impressions: 1000,
        clicks: 50,
        conversions: 5,
        revenue: 300,
        sourceUpdatedAt: "2026-08-09T12:00:00.000Z",
      }],
    };
    const tx = {
      optimizationEvaluation: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "eval-1", ...data })),
      },
      optimizationSnapshot: { findFirst: vi.fn().mockResolvedValueOnce(source).mockResolvedValueOnce(outcome) },
      optimizationProposedAction: {
        findFirst: vi.fn().mockResolvedValue({
          id: "action-a",
          expectedImpact: {
            locator: "expectedImpact.conversions",
            metric: "conversions",
            value: 6,
            baselineValue: 4,
          },
        }),
      },
      optimizationAuditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
    };
    mocked.$transaction.mockImplementation(async (callback: (arg: typeof tx) => unknown) => callback(tx));

    await createOptimizationEvaluation("ws-a", "user-a", {
      clientId: "client-a",
      sourceSnapshotId: "source",
      outcomeSnapshotId: "outcome",
      evaluationType: "shadow_policy",
      actionId: "action-a",
      aggregation: "period_total",
      scope: {},
      predictionLocator: "expectedImpact.conversions",
      minimumSampleSize: 1,
      idempotencyKey: "evaluation:derived-outcome",
    });

    expect(tx.optimizationEvaluation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        predictedValue: 6,
        actualValue: 5,
        absoluteError: 1,
        percentageError: 0.2,
        directionalCorrect: true,
        status: "completed",
        causalClaimAllowed: false,
      }),
    });
  });
});
