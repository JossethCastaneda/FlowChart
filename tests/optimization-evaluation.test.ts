import { describe, expect, it } from "vitest";
import {
  aggregateEvaluationMetric,
  comparePrediction,
  evaluateSnapshotGuardrails,
} from "../lib/optimization/evaluation";
import { CreateEvaluationSchema, type CanonicalMetric } from "../lib/optimization/contracts";

const rows: CanonicalMetric[] = [
  {
    date: "2026-08-01",
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
    clicks: 100,
    conversions: 10,
    revenue: 500,
    sourceUpdatedAt: "2026-08-02T00:00:00.000Z",
  },
  {
    date: "2026-08-01",
    provider: "google",
    accountId: "g-1",
    level: "campaign",
    entityId: "cmp-2",
    campaignId: "cmp-2",
    currency: "MXN",
    timezone: "America/Mexico_City",
    attributionWindow: "30d_click",
    spend: 50,
    impressions: 500,
    clicks: 25,
    conversions: 5,
    revenue: 100,
    sourceUpdatedAt: "2026-08-02T00:00:00.000Z",
  },
];

describe("retrospective metric aggregation", () => {
  it("derives outcomes from canonical rows and honors provider scope", () => {
    expect(aggregateEvaluationMetric(rows, "roas")).toEqual({ value: 4, sampleSize: 2 });
    expect(aggregateEvaluationMetric(rows, "cpa", { provider: "meta" })).toEqual({ value: 10, sampleSize: 1 });
  });

  it("reports prediction error, interval coverage and direction", () => {
    expect(comparePrediction({
      predictedValue: 120,
      actualValue: 110,
      baselineValue: 100,
      interval: { low: 105, high: 125, level: 0.9 },
    })).toEqual({
      absoluteError: 10,
      percentageError: 10 / 110,
      withinInterval: true,
      directionalCorrect: true,
    });
  });

  it("evaluates supported guardrails without inventing unsupported metrics", () => {
    expect(evaluateSnapshotGuardrails(rows, [
      { metric: "roas", operator: "gte", value: 3 },
      { metric: "brand_sentiment", operator: "gte", value: 0.5 },
    ])).toEqual([
      expect.objectContaining({ metric: "roas", status: "evaluated", passed: true, actualValue: 4 }),
      expect.objectContaining({ metric: "brand_sentiment", status: "not_evaluable", passed: null }),
    ]);
  });
});

describe("evaluation contract", () => {
  it("requires the correct immutable source for each evaluation mode", () => {
    const base = {
      clientId: "client-a",
      sourceSnapshotId: "source",
      outcomeSnapshotId: "outcome",
      predictionLocator: "predictions.revenue",
      idempotencyKey: "evaluation:contract:1",
    };

    expect(CreateEvaluationSchema.safeParse({ ...base, evaluationType: "forecast_backtest" }).success).toBe(false);
    expect(CreateEvaluationSchema.safeParse({ ...base, evaluationType: "shadow_policy" }).success).toBe(false);
    expect(CreateEvaluationSchema.safeParse({ ...base, evaluationType: "forecast_backtest", analysisResultId: "result-a" }).success).toBe(true);
    expect(CreateEvaluationSchema.safeParse({ ...base, evaluationType: "shadow_policy", actionId: "action-a" }).success).toBe(true);
  });
});
