// ============================================================================
// Resolución de overrides por proyecto (goal §9). Prioridad SIEMPRE:
//   proyecto  >  workspace  >  default
// Aplica a: metas/semáforos de KPI (AnalyticsKpiTarget), reglas de outcome
// (AnalyticsOutcomeRule), umbrales de alertas y parámetros de ROI.
//
// FUNCIONES PURAS: operan sobre filas ya cargadas (sin prisma), 100% testeables.
// ============================================================================

import { KPI_DEFINITIONS, type KpiDirection } from "./kpis/definitions";
import { DEFAULT_ALERT_THRESHOLDS, type AlertThresholds } from "./alerts/engine";

export interface ScopedKpiTarget {
  kpiKey: string;
  projectId: string | null;
  targetValue: number | null;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  direction: string;
  enabled: boolean;
}

export interface ResolvedKpiThreshold {
  kpiKey: string;
  good: number | null;
  warning: number | null;
  direction: KpiDirection;
  source: "project" | "workspace" | "default";
}

/** Elige la fila más específica para un kpiKey: proyecto > workspace. */
function pickTarget(
  targets: ScopedKpiTarget[],
  kpiKey: string,
  projectId?: string | null
): ScopedKpiTarget | null {
  const enabled = targets.filter((t) => t.kpiKey === kpiKey && t.enabled);
  if (projectId) {
    const proj = enabled.find((t) => t.projectId === projectId);
    if (proj) return proj;
  }
  const ws = enabled.find((t) => t.projectId === null || t.projectId === undefined);
  return ws ?? null;
}

/**
 * Resuelve los umbrales de semáforo de un KPI con prioridad proyecto > workspace
 * > default (KPI_DEFINITIONS). `good`/`warning` mantienen la semántica de
 * `semaphore()`: para higher_is_better verde si ≥ good; para lower_is_better
 * verde si ≤ good.
 */
export function resolveKpiThreshold(
  kpiKey: string,
  targets: ScopedKpiTarget[],
  projectId?: string | null
): ResolvedKpiThreshold {
  const def = KPI_DEFINITIONS[kpiKey];
  const defaultDirection = (def?.direction ?? "higher_is_better") as KpiDirection;
  const t = pickTarget(targets, kpiKey, projectId);

  if (t) {
    return {
      kpiKey,
      good: t.targetValue ?? t.warningThreshold ?? def?.thresholds?.good ?? null,
      warning: t.criticalThreshold ?? def?.thresholds?.warning ?? null,
      direction: (t.direction as KpiDirection) || defaultDirection,
      source: t.projectId === projectId && projectId ? "project" : "workspace",
    };
  }

  return {
    kpiKey,
    good: def?.thresholds?.good ?? null,
    warning: def?.thresholds?.warning ?? null,
    direction: defaultDirection,
    source: "default",
  };
}

/** Resuelve TODOS los KPIs conocidos con sus overrides aplicados. */
export function resolveAllKpiThresholds(
  targets: ScopedKpiTarget[],
  projectId?: string | null
): Record<string, ResolvedKpiThreshold> {
  const out: Record<string, ResolvedKpiThreshold> = {};
  for (const key of Object.keys(KPI_DEFINITIONS)) {
    out[key] = resolveKpiThreshold(key, targets, projectId);
  }
  return out;
}

/**
 * Deriva umbrales de ALERTA desde las metas de KPI configuradas (proyecto >
 * workspace > default). Si no hay override para un KPI, conserva el default del
 * motor de alertas. Mapea cada umbral de KPI al campo de alerta equivalente.
 */
export function buildAlertThresholdsFromTargets(
  targets: ScopedKpiTarget[],
  projectId?: string | null
): AlertThresholds {
  const t = { ...DEFAULT_ALERT_THRESHOLDS };

  // CSAT: el "warning" (criticalThreshold) actúa como mínimo aceptable.
  const csat = pickTarget(targets, "csat", projectId);
  if (csat?.criticalThreshold != null) t.csatMin = csat.criticalThreshold;
  else if (csat?.warningThreshold != null) t.csatMin = csat.warningThreshold;

  const fallback = pickTarget(targets, "fallback_rate", projectId);
  if (fallback?.warningThreshold != null) t.fallbackMaxPct = fallback.warningThreshold;

  const frt = pickTarget(targets, "frt", projectId);
  if (frt?.warningThreshold != null) t.frtMaxSeconds = frt.warningThreshold;

  const aht = pickTarget(targets, "aht", projectId);
  if (aht?.warningThreshold != null) t.ahtMaxSeconds = aht.warningThreshold;

  const esc = pickTarget(targets, "escalation", projectId);
  if (esc?.warningThreshold != null) t.handoffMaxPct = esc.warningThreshold;

  return t;
}

// --- Reglas de outcome -------------------------------------------------------

export interface ScopedRule {
  id: string;
  projectId: string | null;
  priority: number;
  enabled: boolean;
}

/**
 * Ordena reglas para evaluación con prioridad proyecto > workspace y, dentro de
 * cada nivel, por `priority` ascendente. Las reglas de proyecto se evalúan ANTES
 * que las globales del workspace (pueden anular la clasificación). Filtra las
 * deshabilitadas y las de otro proyecto.
 */
export function sortRulesByScope<T extends ScopedRule>(rules: T[], projectId?: string | null): T[] {
  return rules
    .filter((r) => r.enabled && (r.projectId == null || r.projectId === projectId))
    .sort((a, b) => {
      const aProj = a.projectId === projectId && !!projectId ? 0 : 1;
      const bProj = b.projectId === projectId && !!projectId ? 0 : 1;
      if (aProj !== bProj) return aProj - bProj; // proyecto primero
      return a.priority - b.priority;
    });
}

// --- ROI ---------------------------------------------------------------------

export interface RoiParams {
  agentCostPerHour: number;
  humanAhtBaselineSeconds: number;
  botMonthlyCost: number;
  incrementalRevenue: number;
  costPerMessage: number;
  currency: string;
}

export const DEFAULT_ROI_PARAMS: RoiParams = {
  agentCostPerHour: 10,
  humanAhtBaselineSeconds: 600,
  botMonthlyCost: 0,
  incrementalRevenue: 0,
  costPerMessage: 0,
  currency: "USD",
};

/**
 * Combina capas de parámetros de ROI con prioridad proyecto > workspace >
 * default. Cada capa puede ser parcial; los `undefined`/`null` no pisan.
 */
export type RoiParamsLayer = { [K in keyof RoiParams]?: RoiParams[K] | null };

export function mergeRoiParams(...layers: Array<RoiParamsLayer | null | undefined>): RoiParams {
  const out: RoiParams = { ...DEFAULT_ROI_PARAMS };
  for (const layer of layers) {
    if (!layer) continue;
    for (const k of Object.keys(layer) as Array<keyof RoiParams>) {
      const v = layer[k];
      if (v !== undefined && v !== null) {
        // @ts-expect-error índice homogéneo controlado
        out[k] = v;
      }
    }
  }
  return out;
}
