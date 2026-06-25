/* ════════════════════════════════════════════════════════════
   SODARE · MMM — Tipos compartidos
   ════════════════════════════════════════════════════════════ */

/** Configuración de un canal publicitario en el modelo MMM */
export interface ChannelConfig {
  id: string;
  name: string;
  color: string;
  /** Tasa de decaimiento de adstock λ ∈ [0, 1] */
  adstockDecay: number;
  /** Parámetro de forma de la curva Hill α > 0 */
  saturationAlpha: number;
  /** Half-saturation point K > 0 */
  saturationK: number;
  enabled: boolean;
}

/** Una fila de datos semanales */
export interface WeeklyRow {
  week: string;
  label: string;
  spend: Record<string, number>;
  outcome: number;
}

/** Resultado del modelo MMM */
export interface MmmModel {
  coefficients: Record<string, number>;
  intercept: number;
  rSquared: number;
  contributions: Record<string, number>;
  channelRoas: Record<string, number>;
  totalModeled: number;
  totalActual: number;
  modeledSeries: number[];
  adstockedMatrix: Record<string, number[]>;
  saturatedMatrix: Record<string, number[]>;
}

/** Resultado de una simulación de presupuesto */
export interface SimResult {
  deltaOutcome: number;
  projectedOutcome: number;
  simulatedSpend: Record<string, number>;
  marginalRoas: Record<string, number>;
}

/** Asignación óptima de presupuesto */
export interface Allocation {
  recommended: Record<string, number>;
  projectedOutcome: number;
  improvementPct: number;
}

/** Punto de curva de saturación */
export interface SaturationPoint {
  spend: number;
  response: number;
  isCurrent: boolean;
}
