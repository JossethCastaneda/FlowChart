import { EvaluationMetricSchema, EvaluationScopeSchema, PolicyConstraintSchema } from "./contracts";
import type { CanonicalMetric, EvaluationMetric, EvaluationScope, JsonValue } from "./contracts";

export interface AggregatedMetric {
  value: number | null;
  sampleSize: number;
}

function matchesScope(row: CanonicalMetric, scope: EvaluationScope) {
  if (scope.provider && row.provider !== scope.provider) return false;
  if (scope.accountId && row.accountId !== scope.accountId) return false;
  if (scope.campaignId && row.campaignId !== scope.campaignId) return false;
  if (scope.groupId && row.groupId !== scope.groupId) return false;
  if (scope.adId && (row.level !== "ad" || row.entityId !== scope.adId)) return false;
  return true;
}

export function aggregateEvaluationMetric(
  rows: CanonicalMetric[],
  metric: EvaluationMetric,
  scope: EvaluationScope = {}
): AggregatedMetric {
  const scoped = rows.filter((row) => matchesScope(row, scope));
  const totals = scoped.reduce(
    (sum, row) => ({
      spend: sum.spend + row.spend,
      impressions: sum.impressions + row.impressions,
      clicks: sum.clicks + row.clicks,
      conversions: sum.conversions + row.conversions,
      revenue: sum.revenue + row.revenue,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
  );

  const direct = metric === "spend" || metric === "impressions" || metric === "clicks" || metric === "conversions" || metric === "revenue";
  if (direct) return { value: totals[metric], sampleSize: scoped.length };

  const value = metric === "cpa"
    ? totals.conversions > 0 ? totals.spend / totals.conversions : null
    : metric === "roas"
      ? totals.spend > 0 ? totals.revenue / totals.spend : null
      : metric === "ctr"
        ? totals.impressions > 0 ? totals.clicks / totals.impressions : null
        : metric === "cpc"
          ? totals.clicks > 0 ? totals.spend / totals.clicks : null
          : totals.clicks > 0 ? totals.conversions / totals.clicks : null;

  return { value, sampleSize: scoped.length };
}

export function comparePrediction(input: {
  predictedValue: number;
  actualValue: number | null;
  baselineValue?: number;
  interval?: { low: number; high: number; level: number };
}) {
  if (input.actualValue === null) {
    return {
      absoluteError: null,
      percentageError: null,
      withinInterval: null,
      directionalCorrect: null,
    };
  }

  const absoluteError = Math.abs(input.predictedValue - input.actualValue);
  const percentageError = input.actualValue === 0 ? null : absoluteError / Math.abs(input.actualValue);
  const withinInterval = input.interval
    ? input.actualValue >= input.interval.low && input.actualValue <= input.interval.high
    : null;
  const directionalCorrect = input.baselineValue === undefined
    ? null
    : Math.sign(input.predictedValue - input.baselineValue) === Math.sign(input.actualValue - input.baselineValue);

  return { absoluteError, percentageError, withinInterval, directionalCorrect };
}

function evaluateOperator(actual: number, operator: string, expected: number | [number, number]) {
  if (operator === "between") return Array.isArray(expected) && actual >= expected[0] && actual <= expected[1];
  if (Array.isArray(expected)) return false;
  if (operator === "gte") return actual >= expected;
  if (operator === "lte") return actual <= expected;
  if (operator === "eq") return actual === expected;
  return false;
}

export function evaluateSnapshotGuardrails(rows: CanonicalMetric[], rawGuardrails: JsonValue) {
  if (!Array.isArray(rawGuardrails)) return [];
  const results: Array<{
    metric: string;
    status: "evaluated" | "not_evaluable";
    passed: boolean | null;
    actualValue: number | null;
    reason?: string;
    operator?: string;
    expectedValue?: number | [number, number];
  }> = [];

  for (const raw of rawGuardrails) {
    const parsed = PolicyConstraintSchema.safeParse(raw);
    if (!parsed.success) continue;
    const metric = EvaluationMetricSchema.safeParse(parsed.data.metric);
    if (!metric.success) {
      results.push({
        metric: parsed.data.metric,
        status: "not_evaluable",
        passed: null,
        actualValue: null,
        reason: "Métrica no soportada por el evaluador retrospectivo",
      });
      continue;
    }
    const scope = EvaluationScopeSchema.safeParse(parsed.data.scope ?? {});
    if (!scope.success) {
      results.push({
        metric: metric.data,
        status: "not_evaluable",
        passed: null,
        actualValue: null,
        reason: "Scope de guardrail no compatible con métricas canónicas",
      });
      continue;
    }
    const aggregated = aggregateEvaluationMetric(rows, metric.data, scope.data);
    if (aggregated.value === null) {
      results.push({
        metric: metric.data,
        status: "not_evaluable",
        passed: null,
        actualValue: null,
        reason: "El denominador requerido es cero o no hay datos",
      });
      continue;
    }
    results.push({
      metric: metric.data,
      status: "evaluated",
      passed: evaluateOperator(aggregated.value, parsed.data.operator, parsed.data.value),
      actualValue: aggregated.value,
      operator: parsed.data.operator,
      expectedValue: parsed.data.value,
    });
  }
  return results;
}
