// ============================================================================
// Diccionario de KPIs + semáforos por defecto (spec §12, §13, §35).
// Cada workspace puede sobreescribir umbrales vía AnalyticsKpiTarget.
// `direction` define cómo se interpreta el semáforo:
//   higher_is_better  -> verde si >= good, rojo si < warning
//   lower_is_better   -> verde si <= good, rojo si > warning
// ============================================================================

export type KpiDirection = "higher_is_better" | "lower_is_better" | "neutral";

export interface KpiDefinition {
  key: string;
  name: string;
  description: string;
  formula: string;
  unit: "percent" | "seconds" | "count" | "score" | "currency";
  direction: KpiDirection;
  /** Umbrales por defecto del semáforo. */
  thresholds?: { good: number; warning: number };
}

export const KPI_DEFINITIONS: Record<string, KpiDefinition> = {
  containment_real: {
    key: "containment_real",
    name: "Contención real",
    description: "Conversaciones resueltas por el bot sobre el total de cerradas. NO confundir con bot-only.",
    formula: "conversaciones_resueltas_por_bot / conversaciones_cerradas",
    unit: "percent",
    direction: "higher_is_better",
    thresholds: { good: 70, warning: 50 },
  },
  bot_only: {
    key: "bot_only",
    name: "Bot-only",
    description: "Conversaciones sin intervención de agente. Métrica de volumen, NO de éxito.",
    formula: "conversaciones_sin_agente / conversaciones_totales",
    unit: "percent",
    direction: "neutral",
  },
  bot_resolution: {
    key: "bot_resolution",
    name: "Resolución por bot",
    description: "Conversaciones con outcome exitoso y resolved_by = bot sobre elegibles.",
    formula: "conversaciones_resueltas_por_bot / conversaciones_totales",
    unit: "percent",
    direction: "higher_is_better",
    thresholds: { good: 60, warning: 40 },
  },
  escalation: {
    key: "escalation",
    name: "Escalamiento",
    description: "Conversaciones transferidas a un agente humano.",
    formula: "conversaciones_con_handoff / conversaciones_totales",
    unit: "percent",
    direction: "lower_is_better",
    thresholds: { good: 15, warning: 30 },
  },
  fallback_rate: {
    key: "fallback_rate",
    name: "Fallback rate",
    description: "Mensajes de usuario que el bot no entendió.",
    formula: "fallbacks / mensajes_de_usuario",
    unit: "percent",
    direction: "lower_is_better",
    thresholds: { good: 10, warning: 20 },
  },
  task_completion: {
    key: "task_completion",
    name: "Task completion",
    description: "Servicios/transacciones completados sobre iniciados.",
    formula: "servicios_completados / servicios_iniciados",
    unit: "percent",
    direction: "higher_is_better",
    thresholds: { good: 80, warning: 50 },
  },
  abandonment: {
    key: "abandonment",
    name: "Abandono",
    description: "Conversaciones abandonadas sobre el total.",
    formula: "conversaciones_abandonadas / conversaciones_totales",
    unit: "percent",
    direction: "lower_is_better",
    thresholds: { good: 5, warning: 15 },
  },
  csat: {
    key: "csat",
    name: "CSAT",
    description: "Satisfacción promedio (1-5).",
    formula: "promedio(csat_score)",
    unit: "score",
    direction: "higher_is_better",
    thresholds: { good: 4.2, warning: 3.8 },
  },
  nps: {
    key: "nps",
    name: "NPS",
    description: "% promotores - % detractores.",
    formula: "%promotores - %detractores",
    unit: "score",
    direction: "higher_is_better",
    thresholds: { good: 50, warning: 0 },
  },
  frt: {
    key: "frt",
    name: "FRT",
    description: "Tiempo de primera respuesta (segundos).",
    formula: "first_response_at - first_user_message_at",
    unit: "seconds",
    direction: "lower_is_better",
    thresholds: { good: 30, warning: 120 },
  },
  aht: {
    key: "aht",
    name: "AHT",
    description: "Tiempo promedio de atención del agente (segundos).",
    formula: "closed_at - assigned_to_agent_at",
    unit: "seconds",
    direction: "lower_is_better",
    thresholds: { good: 300, warning: 900 },
  },
  roi: {
    key: "roi",
    name: "ROI estimado",
    description: "Retorno sobre la inversión del bot.",
    formula: "(costo_evitado + ingreso_incremental - costo_total_bot) / costo_total_bot",
    unit: "percent",
    direction: "higher_is_better",
    thresholds: { good: 100, warning: 0 },
  },
};

export type SemaphoreColor = "green" | "yellow" | "red" | "neutral";

/** Calcula el color del semáforo para un valor y unos umbrales/dirección. */
export function semaphore(
  value: number | null | undefined,
  direction: KpiDirection,
  thresholds?: { good: number; warning: number }
): SemaphoreColor {
  if (value === null || value === undefined || !thresholds || direction === "neutral") return "neutral";
  if (direction === "higher_is_better") {
    if (value >= thresholds.good) return "green";
    if (value >= thresholds.warning) return "yellow";
    return "red";
  }
  // lower_is_better
  if (value <= thresholds.good) return "green";
  if (value <= thresholds.warning) return "yellow";
  return "red";
}
