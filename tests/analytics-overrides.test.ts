import { describe, it, expect } from "vitest";
import {
  resolveKpiThreshold,
  buildAlertThresholdsFromTargets,
  sortRulesByScope,
  mergeRoiParams,
  DEFAULT_ROI_PARAMS,
  type ScopedKpiTarget,
} from "../lib/analytics/overrides";
import { DEFAULT_ALERT_THRESHOLDS } from "../lib/analytics/alerts/engine";

function target(over: Partial<ScopedKpiTarget>): ScopedKpiTarget {
  return {
    kpiKey: "csat", projectId: null, targetValue: null, warningThreshold: null,
    criticalThreshold: null, direction: "higher_is_better", enabled: true, ...over,
  };
}

describe("Override resolution: proyecto > workspace > default", () => {
  it("usa el default de KPI_DEFINITIONS cuando no hay overrides", () => {
    const r = resolveKpiThreshold("csat", []);
    expect(r.source).toBe("default");
    expect(r.good).toBe(4.2);
    expect(r.warning).toBe(3.8);
  });

  it("workspace override gana sobre default", () => {
    const r = resolveKpiThreshold("csat", [target({ targetValue: 4.6, projectId: null })]);
    expect(r.source).toBe("workspace");
    expect(r.good).toBe(4.6);
  });

  it("project override gana sobre workspace", () => {
    const targets = [
      target({ targetValue: 4.6, projectId: null }),
      target({ targetValue: 4.9, projectId: "p1" }),
    ];
    const r = resolveKpiThreshold("csat", targets, "p1");
    expect(r.source).toBe("project");
    expect(r.good).toBe(4.9);
  });

  it("ignora overrides deshabilitados", () => {
    const r = resolveKpiThreshold("csat", [target({ targetValue: 9, enabled: false })]);
    expect(r.source).toBe("default");
  });

  it("buildAlertThresholdsFromTargets mapea metas de KPI a umbrales de alerta", () => {
    const targets: ScopedKpiTarget[] = [
      target({ kpiKey: "csat", criticalThreshold: 4.0, projectId: "p1" }),
      target({ kpiKey: "fallback_rate", warningThreshold: 12, projectId: "p1", direction: "lower_is_better" }),
    ];
    const t = buildAlertThresholdsFromTargets(targets, "p1");
    expect(t.csatMin).toBe(4.0);
    expect(t.fallbackMaxPct).toBe(12);
    // Los no configurados conservan el default.
    expect(t.frtMaxSeconds).toBe(DEFAULT_ALERT_THRESHOLDS.frtMaxSeconds);
  });
});

describe("sortRulesByScope", () => {
  const rules = [
    { id: "ws-high", projectId: null, priority: 1, enabled: true },
    { id: "proj-low", projectId: "p1", priority: 99, enabled: true },
    { id: "other-proj", projectId: "p2", priority: 1, enabled: true },
    { id: "disabled", projectId: "p1", priority: 1, enabled: false },
  ];

  it("evalúa reglas de proyecto antes que las del workspace y excluye otras/deshabilitadas", () => {
    const sorted = sortRulesByScope(rules, "p1");
    expect(sorted.map((r) => r.id)).toEqual(["proj-low", "ws-high"]);
  });

  it("sin projectId solo deja reglas globales", () => {
    const sorted = sortRulesByScope(rules, null);
    expect(sorted.map((r) => r.id)).toEqual(["ws-high"]);
  });
});

describe("mergeRoiParams", () => {
  it("aplica prioridad por capas (proyecto pisa workspace pisa default)", () => {
    const merged = mergeRoiParams(
      { agentCostPerHour: 12 },          // workspace
      { agentCostPerHour: 20, currency: "MXN" }, // proyecto
    );
    expect(merged.agentCostPerHour).toBe(20);
    expect(merged.currency).toBe("MXN");
    expect(merged.humanAhtBaselineSeconds).toBe(DEFAULT_ROI_PARAMS.humanAhtBaselineSeconds);
  });

  it("ignora null/undefined sin pisar capas previas", () => {
    const merged = mergeRoiParams({ agentCostPerHour: 15 }, { agentCostPerHour: undefined, botMonthlyCost: null });
    expect(merged.agentCostPerHour).toBe(15);
    expect(merged.botMonthlyCost).toBe(DEFAULT_ROI_PARAMS.botMonthlyCost);
  });
});
