// ============================================================================
// Motor de alertas analíticas (spec §30 / goal §12). FUNCIÓN PURA, sin acceso a
// red ni BD: recibe KPIs ya computados + señales de contexto y devuelve las
// alertas que deberían dispararse. La persistencia/dedup vive en ./persist.ts.
//
// Tipos cubiertos: CSAT bajo, fallback alto, FRT alto, AHT alto, escalamiento
// (handoff) alto, caída de volumen, sync/API fallida, errores de campaña/servicio
// y calidad de datos crítica.
// ============================================================================

import type { AnalyticsKpiData } from "../kpis/engine";

export type AlertType =
  | "csat_low"
  | "fallback_high"
  | "frt_high"
  | "aht_high"
  | "handoff_high"
  | "volume_drop"
  | "sync_failed"
  | "api_failed"
  | "campaign_error"
  | "service_error"
  | "data_quality_critical";

export type AlertSeverity = "warning" | "critical";

/** Umbrales configurables por workspace/proyecto. Defaults alineados con KPI_DEFINITIONS. */
export interface AlertThresholds {
  /** CSAT mínimo aceptable (escala 1-5). Default 3.8. */
  csatMin: number;
  /** Fallback rate máximo (%). Default 20. */
  fallbackMaxPct: number;
  /** FRT máximo (segundos). Default 120. */
  frtMaxSeconds: number;
  /** AHT máximo (segundos). Default 900. */
  ahtMaxSeconds: number;
  /** Escalamiento máximo (%). Default 30. */
  handoffMaxPct: number;
  /** Caída de volumen máxima tolerada vs periodo anterior (%). Default 40. */
  volumeDropPct: number;
  /** Mínimo de conversaciones para que la evaluación sea significativa. Default 20. */
  minSampleSize: number;
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  csatMin: 3.8,
  fallbackMaxPct: 20,
  frtMaxSeconds: 120,
  ahtMaxSeconds: 900,
  handoffMaxPct: 30,
  volumeDropPct: 40,
  minSampleSize: 20,
};

export interface AlertContext {
  kpis: AnalyticsKpiData;
  /** Total de conversaciones del periodo anterior (para caída de volumen). */
  previousVolume?: number | null;
  /** Conteo de issues de calidad de datos de severidad `critical` sin resolver. */
  dataQualityCriticalCount?: number;
  /** Conteo de errores de campaña detectados (mensajes/plantillas fallidas). */
  campaignErrorCount?: number;
  /** Conteo de errores de servicio detectados. */
  serviceErrorCount?: number;
  /** Última sincronización fallida (si aplica): provider + mensaje. */
  syncFailure?: { provider: string; error: string } | null;
  /** Umbrales (parciales). Se completan con DEFAULT_ALERT_THRESHOLDS. */
  thresholds?: Partial<AlertThresholds>;
}

export interface AlertCandidate {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metricValue?: number | null;
  thresholdValue?: number | null;
}

function round(n: number, d = 1): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

/**
 * Evalúa las condiciones de alerta sobre un set de KPIs ya computado.
 * Función PURA y determinística: misma entrada → misma salida, sin efectos.
 */
export function evaluateAlerts(ctx: AlertContext): AlertCandidate[] {
  const t: AlertThresholds = { ...DEFAULT_ALERT_THRESHOLDS, ...(ctx.thresholds ?? {}) };
  const k = ctx.kpis;
  const out: AlertCandidate[] = [];

  // Señales independientes del volumen (siempre se evalúan) ------------------

  // Sync/API fallida: viene de la capa de ingesta, no de KPIs.
  if (ctx.syncFailure) {
    out.push({
      type: "sync_failed",
      severity: "critical",
      title: `Sincronización fallida (${ctx.syncFailure.provider})`,
      message: `La última sincronización con ${ctx.syncFailure.provider} falló: ${ctx.syncFailure.error}`,
    });
  }

  // Calidad de datos crítica.
  if ((ctx.dataQualityCriticalCount ?? 0) > 0) {
    out.push({
      type: "data_quality_critical",
      severity: "critical",
      title: "Problemas críticos de calidad de datos",
      message: `Se detectaron ${ctx.dataQualityCriticalCount} incidencias críticas de calidad de datos sin resolver.`,
      metricValue: ctx.dataQualityCriticalCount ?? 0,
      thresholdValue: 0,
    });
  }

  // Errores de campaña / servicio.
  if ((ctx.campaignErrorCount ?? 0) > 0) {
    out.push({
      type: "campaign_error",
      severity: "warning",
      title: "Errores en campañas",
      message: `Se registraron ${ctx.campaignErrorCount} errores de envío/plantilla en campañas.`,
      metricValue: ctx.campaignErrorCount ?? 0,
      thresholdValue: 0,
    });
  }
  if ((ctx.serviceErrorCount ?? 0) > 0) {
    out.push({
      type: "service_error",
      severity: "warning",
      title: "Errores en servicios",
      message: `Se registraron ${ctx.serviceErrorCount} errores en flujos de servicio.`,
      metricValue: ctx.serviceErrorCount ?? 0,
      thresholdValue: 0,
    });
  }

  // Caída de volumen: requiere un baseline previo > 0.
  if (typeof ctx.previousVolume === "number" && ctx.previousVolume > 0) {
    const dropPct = ((ctx.previousVolume - k.totalConversations) / ctx.previousVolume) * 100;
    if (dropPct >= t.volumeDropPct) {
      out.push({
        type: "volume_drop",
        severity: dropPct >= t.volumeDropPct * 1.5 ? "critical" : "warning",
        title: "Caída de volumen de conversaciones",
        message: `El volumen cayó ${round(dropPct)}% vs el periodo anterior (${ctx.previousVolume} → ${k.totalConversations}).`,
        metricValue: round(dropPct),
        thresholdValue: t.volumeDropPct,
      });
    }
  }

  // KPIs de calidad: solo significativos con muestra suficiente ---------------
  if (k.totalConversations < t.minSampleSize) {
    return out;
  }

  if (typeof k.avgCsat === "number" && k.avgCsat < t.csatMin) {
    out.push({
      type: "csat_low",
      severity: k.avgCsat < t.csatMin - 0.5 ? "critical" : "warning",
      title: "CSAT por debajo del umbral",
      message: `El CSAT promedio (${round(k.avgCsat, 2)}) está por debajo del mínimo (${t.csatMin}).`,
      metricValue: round(k.avgCsat, 2),
      thresholdValue: t.csatMin,
    });
  }

  if (k.fallbackRate > t.fallbackMaxPct) {
    out.push({
      type: "fallback_high",
      severity: k.fallbackRate > t.fallbackMaxPct * 1.5 ? "critical" : "warning",
      title: "Fallback rate elevado",
      message: `El fallback rate (${round(k.fallbackRate)}%) supera el máximo (${t.fallbackMaxPct}%).`,
      metricValue: round(k.fallbackRate),
      thresholdValue: t.fallbackMaxPct,
    });
  }

  if (typeof k.avgFrt === "number" && k.avgFrt > t.frtMaxSeconds) {
    out.push({
      type: "frt_high",
      severity: k.avgFrt > t.frtMaxSeconds * 2 ? "critical" : "warning",
      title: "Tiempo de primera respuesta alto",
      message: `El FRT promedio (${round(k.avgFrt)}s) supera el máximo (${t.frtMaxSeconds}s).`,
      metricValue: round(k.avgFrt),
      thresholdValue: t.frtMaxSeconds,
    });
  }

  if (typeof k.avgAht === "number" && k.avgAht > t.ahtMaxSeconds) {
    out.push({
      type: "aht_high",
      severity: k.avgAht > t.ahtMaxSeconds * 2 ? "critical" : "warning",
      title: "Tiempo de atención alto",
      message: `El AHT promedio (${round(k.avgAht)}s) supera el máximo (${t.ahtMaxSeconds}s).`,
      metricValue: round(k.avgAht),
      thresholdValue: t.ahtMaxSeconds,
    });
  }

  if (k.escalationRate > t.handoffMaxPct) {
    out.push({
      type: "handoff_high",
      severity: k.escalationRate > t.handoffMaxPct * 1.5 ? "critical" : "warning",
      title: "Escalamiento elevado",
      message: `El escalamiento a agente (${round(k.escalationRate)}%) supera el máximo (${t.handoffMaxPct}%).`,
      metricValue: round(k.escalationRate),
      thresholdValue: t.handoffMaxPct,
    });
  }

  return out;
}
