import type { CanonicalMetric, SourceManifest } from "./contracts";

export type QualitySeverity = "info" | "warning" | "critical";

export interface OptimizationQualityIssue {
  code: string;
  severity: QualitySeverity;
  message: string;
  count?: number;
}

export interface OptimizationDataQualityReport {
  score: number;
  status: "valid" | "degraded" | "invalid";
  readiness: "mmm_ready" | "forecast_ready" | "recommendation_only" | "insufficient_data";
  dimensions: {
    identity: number;
    historyAndFreshness: number;
    outcomesAndAttribution: number;
    variation: number;
    normalization: number;
    validation: number;
    operationalSafety: number;
  };
  issues: OptimizationQualityIssue[];
}

interface QualityInput {
  period: { from: string; to: string };
  cutoffAt: string;
  clientCurrency: string;
  clientTimezone: string;
  authorizedAccountKeys: Set<string>;
  metrics: CanonicalMetric[];
  sources: SourceManifest[];
  hasActiveObjective: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1_000;

function accountKey(provider: string, accountId: string) {
  return `${provider}:${accountId}`;
}

export function assessOptimizationDataQuality(input: QualityInput): OptimizationDataQualityReport {
  const issues: OptimizationQualityIssue[] = [];
  const cutoff = new Date(input.cutoffAt).getTime();
  const from = new Date(`${input.period.from}T00:00:00.000Z`).getTime();
  const to = new Date(`${input.period.to}T23:59:59.999Z`).getTime();

  const unauthorized = input.metrics.filter(
    (metric) => !input.authorizedAccountKeys.has(accountKey(metric.provider, metric.accountId))
  ).length;
  if (unauthorized) {
    issues.push({ code: "unauthorized_account", severity: "critical", message: "Hay métricas de cuentas no autorizadas para el cliente", count: unauthorized });
  }

  if (!input.hasActiveObjective) {
    issues.push({ code: "missing_active_objective", severity: "critical", message: "El cliente no tiene una meta activa versionada" });
  }
  if (input.authorizedAccountKeys.size === 0) {
    issues.push({ code: "missing_authorized_accounts", severity: "critical", message: "El cliente no tiene cuentas publicitarias autorizadas" });
  }
  if (input.metrics.length === 0) {
    issues.push({ code: "missing_metrics", severity: "critical", message: "El snapshot no contiene métricas" });
  }

  const outsidePeriod = input.metrics.filter((metric) => {
    const timestamp = new Date(`${metric.date}T12:00:00.000Z`).getTime();
    return timestamp < from || timestamp > to;
  }).length;
  if (outsidePeriod) {
    issues.push({ code: "metric_outside_period", severity: "critical", message: "Hay métricas fuera del periodo solicitado", count: outsidePeriod });
  }

  const currencies = new Set(input.metrics.map((metric) => metric.currency));
  if (currencies.size > 1 || (currencies.size === 1 && !currencies.has(input.clientCurrency))) {
    issues.push({ code: "currency_mismatch", severity: "critical", message: "Las métricas no están normalizadas a la moneda del cliente" });
  }
  const timezones = new Set(input.metrics.map((metric) => metric.timezone));
  if (timezones.size > 1 || (timezones.size === 1 && !timezones.has(input.clientTimezone))) {
    issues.push({ code: "timezone_mismatch", severity: "critical", message: "Las métricas no están normalizadas a la zona horaria del cliente" });
  }

  const fingerprints = new Set<string>();
  let duplicates = 0;
  for (const metric of input.metrics) {
    const fingerprint = [metric.date, metric.provider, metric.accountId, metric.level, metric.entityId, metric.attributionWindow].join("|");
    if (fingerprints.has(fingerprint)) duplicates += 1;
    fingerprints.add(fingerprint);
  }
  if (duplicates) {
    issues.push({ code: "duplicate_metrics", severity: "critical", message: "El snapshot contiene métricas duplicadas", count: duplicates });
  }

  const staleSources = input.sources.filter((source) => cutoff - new Date(source.syncedAt).getTime() > 48 * 60 * 60 * 1_000).length;
  if (staleSources) {
    issues.push({ code: "stale_source", severity: "warning", message: "Una o más fuentes superan 48 horas de antigüedad", count: staleSources });
  }
  const futureSources = input.sources.filter((source) => new Date(source.syncedAt).getTime() > cutoff).length;
  if (futureSources) {
    issues.push({ code: "source_after_cutoff", severity: "critical", message: "Hay fuentes actualizadas después de la fecha de corte", count: futureSources });
  }
  const metricsAfterCutoff = input.metrics.filter((metric) => new Date(metric.sourceUpdatedAt).getTime() > cutoff).length;
  if (metricsAfterCutoff) {
    issues.push({ code: "metric_after_cutoff", severity: "critical", message: "Hay métricas actualizadas después de la fecha de corte", count: metricsAfterCutoff });
  }

  const attributionMissing = input.metrics.filter((metric) => metric.attributionWindow.trim().toLowerCase() === "default").length;
  if (attributionMissing) {
    issues.push({ code: "default_attribution_window", severity: "warning", message: "La ventana de atribución no es explícita", count: attributionMissing });
  }

  const distinctDates = new Set(input.metrics.map((metric) => metric.date)).size;
  const expectedDays = Math.max(1, Math.floor((to - from) / DAY_MS) + 1);
  const coverage = distinctDates / expectedDays;
  if (coverage < 0.8) {
    issues.push({ code: "low_date_coverage", severity: coverage < 0.5 ? "critical" : "warning", message: "La cobertura temporal es inferior al 80%", count: distinctDates });
  }

  const outcomeRows = input.metrics.filter((metric) => metric.conversions > 0 || metric.revenue > 0).length;
  if (input.metrics.length > 0 && outcomeRows / input.metrics.length < 0.1) {
    issues.push({ code: "sparse_outcomes", severity: "warning", message: "Menos del 10% de las filas contienen outcomes" });
  }

  const spendValues = input.metrics.map((metric) => metric.spend);
  const meanSpend = spendValues.length ? spendValues.reduce((sum, value) => sum + value, 0) / spendValues.length : 0;
  const variance = spendValues.length
    ? spendValues.reduce((sum, value) => sum + (value - meanSpend) ** 2, 0) / spendValues.length
    : 0;
  const coefficientOfVariation = meanSpend > 0 ? Math.sqrt(variance) / meanSpend : 0;
  if (input.metrics.length > 0 && coefficientOfVariation < 0.05) {
    issues.push({ code: "insufficient_spend_variation", severity: "warning", message: "La inversión tiene poca variación para estimar respuesta" });
  }

  const critical = issues.filter((issue) => issue.severity === "critical").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  const dimensions = {
    identity: Math.max(0, 10 - (unauthorized ? 10 : 0) - (!input.hasActiveObjective ? 5 : 0)),
    historyAndFreshness: Math.max(0, Math.round(25 * Math.min(1, coverage)) - staleSources * 3),
    outcomesAndAttribution: Math.max(0, Math.round(20 * Math.min(1, input.metrics.length ? outcomeRows / Math.max(1, input.metrics.length * 0.5) : 0)) - (attributionMissing ? 5 : 0)),
    variation: coefficientOfVariation >= 0.15 ? 15 : coefficientOfVariation >= 0.05 ? 8 : 0,
    normalization: currencies.size <= 1 && timezones.size <= 1 && !issues.some((issue) => issue.code.endsWith("_mismatch")) ? 10 : 0,
    validation: distinctDates >= 365 ? 15 : distinctDates >= 90 ? 8 : distinctDates >= 28 ? 4 : 0,
    operationalSafety: unauthorized === 0 && input.authorizedAccountKeys.size > 0 ? 5 : 0,
  };
  const score = Math.max(0, Math.min(100, Object.values(dimensions).reduce((sum, value) => sum + value, 0) - critical * 5 - warnings));
  const status = critical > 0 ? "invalid" : warnings > 0 ? "degraded" : "valid";
  const readiness = status === "invalid" || score < 40
    ? "insufficient_data"
    : score >= 80 && distinctDates >= 365
      ? "mmm_ready"
      : score >= 70 && distinctDates >= 90
        ? "forecast_ready"
        : "recommendation_only";

  return { score, status, readiness, dimensions, issues };
}
