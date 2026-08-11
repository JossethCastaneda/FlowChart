import { describe, expect, it } from "vitest";
import {
  ApprovalPolicySchema,
  CreateProposedActionSchema,
  CreateSnapshotSchema,
  type CanonicalMetric,
  type SourceManifest,
} from "../lib/optimization/contracts";
import { canonicalJson, hashCanonicalJson } from "../lib/optimization/canonical-json";
import { assessOptimizationDataQuality } from "../lib/optimization/data-quality";

const metric: CanonicalMetric = {
  date: "2026-08-10",
  provider: "meta",
  accountId: "act_1",
  level: "campaign",
  entityId: "cmp_1",
  currency: "MXN",
  timezone: "America/Mexico_City",
  attributionWindow: "7d_click_1d_view",
  spend: 100,
  impressions: 1_000,
  clicks: 50,
  conversions: 5,
  revenue: 800,
  sourceUpdatedAt: "2026-08-11T00:00:00.000Z",
};

const source: SourceManifest = {
  provider: "meta",
  sourceId: "meta:act_1",
  accountId: "act_1",
  syncedAt: "2026-08-11T00:00:00.000Z",
};

describe("Optimization Phase 1 contracts", () => {
  it("canonicaliza objetos antes de calcular el hash", () => {
    expect(canonicalJson({ b: 2, a: { d: 4, c: 3 } })).toBe('{"a":{"c":3,"d":4},"b":2}');
    expect(hashCanonicalJson({ a: 1, b: 2 })).toBe(hashCanonicalJson({ b: 2, a: 1 }));
  });

  it("impide habilitar ejecución automática en la política", () => {
    expect(ApprovalPolicySchema.safeParse({ manualOnly: true, executionEnabled: false }).success).toBe(true);
    expect(ApprovalPolicySchema.safeParse({ manualOnly: false, executionEnabled: true }).success).toBe(false);
  });

  it("no admite estados aprobados o ejecutables en una propuesta", () => {
    const base = {
      clientId: "client_1",
      snapshotId: "snapshot_1",
      provider: "meta",
      accountId: "act_1",
      entity: { type: "campaign", id: "cmp_1" },
      field: "daily_budget",
      currentValue: 100,
      proposedValue: 90,
      unit: "minor_currency_units",
      currency: "MXN",
      expectedImpact: { spendDelta: -10 },
      uncertaintyInterval: { low: -15, high: -5, level: 0.9 },
      risk: "low",
      evidence: [{ id: "e1", source: "quality", locator: "snapshot:s1" }],
      rollbackCondition: { metric: "conversions", operator: "lt", value: 5 },
      idempotencyKey: "client_1:snapshot_1:cmp_1:budget",
      remoteStateFingerprint: "sha256:remote-state",
      expiresAt: "2026-08-20T00:00:00.000Z",
      requiredApproverRole: "OWNER",
    };
    expect(CreateProposedActionSchema.safeParse({ ...base, state: "requires_review" }).success).toBe(true);
    expect(CreateProposedActionSchema.safeParse({ ...base, state: "approved" }).success).toBe(false);
    expect(CreateProposedActionSchema.safeParse({ ...base, state: "executed" }).success).toBe(false);
  });

  it("exige accountId para fuentes publicitarias y permite fuentes contextuales", () => {
    const base = {
      clientId: "client_1",
      period: { from: "2026-08-10", to: "2026-08-10" },
      cutoffAt: "2026-08-11T00:00:00.000Z",
      normalizedMetrics: [metric],
    };
    expect(CreateSnapshotSchema.safeParse({ ...base, sources: [{ provider: "meta", sourceId: "meta-source", syncedAt: source.syncedAt }] }).success).toBe(false);
    expect(CreateSnapshotSchema.safeParse({ ...base, sources: [{ provider: "crm", sourceId: "crm-1", syncedAt: source.syncedAt }] }).success).toBe(true);
  });
});
describe("Optimization data quality", () => {
  it("invalida cuentas fuera del allow-list", () => {
    const report = assessOptimizationDataQuality({
      period: { from: "2026-08-10", to: "2026-08-10" },
      cutoffAt: "2026-08-11T00:00:00.000Z",
      clientCurrency: "MXN",
      clientTimezone: "America/Mexico_City",
      authorizedAccountKeys: new Set(["meta:act_other"]),
      metrics: [metric],
      sources: [source],
      hasActiveObjective: true,
    });
    expect(report.status).toBe("invalid");
    expect(report.readiness).toBe("insufficient_data");
    expect(report.issues.some((issue) => issue.code === "unauthorized_account")).toBe(true);
  });

  it("nunca declara MMM-ready con una sola fecha", () => {
    const report = assessOptimizationDataQuality({
      period: { from: "2026-08-10", to: "2026-08-10" },
      cutoffAt: "2026-08-11T00:00:00.000Z",
      clientCurrency: "MXN",
      clientTimezone: "America/Mexico_City",
      authorizedAccountKeys: new Set(["meta:act_1"]),
      metrics: [metric],
      sources: [source],
      hasActiveObjective: true,
    });
    expect(report.readiness).not.toBe("mmm_ready");
    expect(report.readiness).not.toBe("forecast_ready");
  });

  it("invalida un snapshot sin meta activa", () => {
    const report = assessOptimizationDataQuality({
      period: { from: "2026-08-10", to: "2026-08-10" },
      cutoffAt: "2026-08-11T00:00:00.000Z",
      clientCurrency: "MXN",
      clientTimezone: "America/Mexico_City",
      authorizedAccountKeys: new Set(["meta:act_1"]),
      metrics: [metric],
      sources: [source],
      hasActiveObjective: false,
    });
    expect(report.status).toBe("invalid");
    expect(report.issues.some((issue) => issue.code === "missing_active_objective")).toBe(true);
  });
});
