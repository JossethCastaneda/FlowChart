import { describe, it, expect } from "vitest";
import {
  calcROAS,
  calcCPA,
  findActionValue,
  breakEvenROAS,
  frequencyAlertLevel,
  creativeFatigueScore,
  qualityVisitRate,
  fmtROAS,
} from "../lib/ads-metrics";

describe("calcROAS", () => {
  it("uses purchase_roas when present", () => {
    expect(calcROAS({ purchase_roas: [{ value: "3.5" }] })).toBe(3.5);
  });
  it("falls back to action_values / spend (omni_purchase)", () => {
    const r = calcROAS({
      action_values: [{ action_type: "omni_purchase", value: "200" }],
      spend: 50,
    });
    expect(r).toBe(4);
  });
  it("returns 0 when there is no usable data", () => {
    expect(calcROAS({ spend: 0 })).toBe(0);
  });
});

describe("findActionValue", () => {
  it("extracts a matching action value as a number", () => {
    expect(findActionValue([{ action_type: "lead", value: "12" }], "lead")).toBe(12);
  });
  it("returns 0 for a missing action or bad input", () => {
    expect(findActionValue([], "lead")).toBe(0);
    expect(findActionValue(undefined as never, "lead")).toBe(0);
  });
});

describe("calcCPA", () => {
  it("computes CPL from leads", () => {
    const r = calcCPA({ spend: 100, actions: [{ action_type: "lead", value: "10" }] });
    expect(r).toEqual({ value: 10, label: "CPL" });
  });
  it("returns 0/CPA when spend is 0", () => {
    expect(calcCPA({ spend: 0 })).toEqual({ value: 0, label: "CPA" });
  });
});

describe("breakEvenROAS", () => {
  it("is 1/margin for valid margins", () => {
    expect(breakEvenROAS(0.25)).toBe(4);
  });
  it("returns 0 for out-of-range margins", () => {
    expect(breakEvenROAS(0)).toBe(0);
    expect(breakEvenROAS(1.5)).toBe(0);
  });
});

describe("frequencyAlertLevel", () => {
  it("classifies frequency thresholds", () => {
    expect(frequencyAlertLevel(2)).toBe("none");
    expect(frequencyAlertLevel(3)).toBe("warning");
    expect(frequencyAlertLevel(5)).toBe("critical");
  });
});

describe("creativeFatigueScore", () => {
  it("is 0 when CTR has not dropped", () => {
    expect(creativeFatigueScore(3, 2, 2)).toBe(0);
  });
  it("grows as CTR drops (freq=4, 1 vs 2 → 200)", () => {
    expect(creativeFatigueScore(4, 1, 2)).toBe(200);
  });
  it("guards against a zero baseline", () => {
    expect(creativeFatigueScore(4, 1, 0)).toBe(0);
  });
});

describe("qualityVisitRate", () => {
  it("is lpv/clicks as a percentage", () => {
    expect(qualityVisitRate(50, 100)).toBe(50);
  });
  it("returns 0 with no clicks", () => {
    expect(qualityVisitRate(50, 0)).toBe(0);
  });
});

describe("fmtROAS", () => {
  it("formats with an x suffix", () => {
    expect(fmtROAS(2.5)).toBe("2.50x");
  });
  it("shows a dash for zero", () => {
    expect(fmtROAS(0)).toBe("—");
  });
});
