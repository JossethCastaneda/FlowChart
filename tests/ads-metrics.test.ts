import { describe, it, expect } from "vitest";
import {
  calcROAS,
  calcCPA,
  findActionValue,
  findResultsValue,
  getResultsLabel,
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
  it("computes CPC from link_click when no higher-priority actions exist", () => {
    const r = calcCPA({
      spend: 200,
      actions: [{ action_type: "link_click", value: "4" }],
    });
    expect(r).toEqual({ value: 50, label: "CPC" });
  });
  it("ignores page_engagement in cost_per_action_type fallback", () => {
    // This was the original bug: cost_per_action_type[0] was page_engagement ($0.04)
    // and calcCPA blindly returned that value as CPA
    const r = calcCPA({
      spend: 574,
      actions: [{ action_type: "page_engagement", value: "1000" }],
      cost_per_action_type: [
        { action_type: "page_engagement", value: "0.04" },
        { action_type: "post_engagement", value: "0.06" },
      ],
    });
    expect(r).toEqual({ value: 0, label: "CPA" });
  });
  it("uses cost_per_action_type fallback only for relevant types", () => {
    const r = calcCPA({
      spend: 500,
      actions: [],
      cost_per_action_type: [
        { action_type: "page_engagement", value: "0.04" },
        { action_type: "lead", value: "25.00" },
      ],
    });
    expect(r).toEqual({ value: 25, label: "CPA" });
  });
  it("prefers lead over link_click", () => {
    const r = calcCPA({
      spend: 100,
      actions: [
        { action_type: "lead", value: "5" },
        { action_type: "link_click", value: "50" },
      ],
    });
    expect(r).toEqual({ value: 20, label: "CPL" });
  });
});

describe("findResultsValue", () => {
  it("returns the value for the highest-priority action type", () => {
    expect(findResultsValue([
      { action_type: "link_click", value: "50" },
      { action_type: "lead", value: "5" },
    ])).toBe(5); // lead takes priority over link_click
  });
  it("falls back to link_click when no conversion actions exist", () => {
    expect(findResultsValue([
      { action_type: "link_click", value: "20" },
      { action_type: "page_engagement", value: "100" },
    ])).toBe(20);
  });
  it("returns 0 for empty or undefined actions", () => {
    expect(findResultsValue([])).toBe(0);
    expect(findResultsValue(undefined as never)).toBe(0);
  });
});

describe("getResultsLabel", () => {
  it("returns 'Leads' when lead actions are present", () => {
    expect(getResultsLabel([{ action_type: "lead", value: "5" }])).toBe("Leads");
  });
  it("returns 'Clics al enlace' for link_click only", () => {
    expect(getResultsLabel([{ action_type: "link_click", value: "10" }])).toBe("Clics al enlace");
  });
  it("returns empty string for unknown actions", () => {
    expect(getResultsLabel([{ action_type: "page_engagement", value: "10" }])).toBe("");
  });
  it("returns empty string for empty array", () => {
    expect(getResultsLabel([])).toBe("");
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
