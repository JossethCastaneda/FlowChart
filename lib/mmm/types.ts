/* ════════════════════════════════════════════════════════════
   SODARE · MMM — Tipos compartidos (v2)
   ════════════════════════════════════════════════════════════ */

/** Configuracion de un canal publicitario en el modelo MMM */
export interface ChannelConfig {
  id: string;
  name: string;
  color: string;
  /** Tasa de decaimiento adstock lambda in [0, 1] */
  adstockDecay: number;
  /** Parametro de forma Hill alpha > 0 */
  saturationAlpha: number;
  /** Half-saturation point K > 0 */
  saturationK: number;
  enabled: boolean;
  /** Fue calibrado automaticamente (vs. ajustado a mano) */
  autoCalibratedAt?: string;
  /** Restriccion minima de gasto semanal (optimizador respeta esto) */
  minSpend?: number;
  /** Restriccion maxima de gasto semanal */
  maxSpend?: number;
}

/** Una fila de datos semanales */
export interface WeeklyRow {
  week: string;
  label: string;
  spend: Record<string, number>;
  outcome: number;
  /** Si true, la fila se EXCLUYE del modelo (Black Friday, promo, etc.) */
  isOutlier?: boolean;
  /** Nota descriptiva (ej. "Black Friday", "Promo 2x1") */
  note?: string;
  /** "manual" | "api" — si fue importado automaticamente */
  source?: "manual" | "api";
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
  /** Revenue organico (intercepto x semanas activas) */
  baseRevenue: number;
  /** Revenue atribuido a publicidad (totalActual - baseRevenue) */
  incrementalRevenue: number;
  /** Fraccion incremental vs. total (0-1) */
  incrementalShare: number;
  modeledSeries: number[];
  adstockedMatrix: Record<string, number[]>;
  saturatedMatrix: Record<string, number[]>;
  /** Numero de semanas incluidas en el modelo (excluye outliers) */
  weekCount: number;
}

/** Resultado de simulacion de presupuesto */
export interface SimResult {
  deltaOutcome: number;
  projectedOutcome: number;
  simulatedSpend: Record<string, number>;
  marginalRoas: Record<string, number>;
}

/** Asignacion optima de presupuesto */
export interface Allocation {
  recommended: Record<string, number>;
  projectedOutcome: number;
  improvementPct: number;
}

/** Punto de curva de saturacion */
export interface SaturationPoint {
  spend: number;
  response: number;
  isCurrent: boolean;
}

/** Resultado de auto-calibracion */
export interface CalibrationResult {
  channelId: string;
  adstockDecay: number;
  saturationAlpha: number;
  saturationK: number;
  rSquared: number;
  improved: boolean;
}

/** Estado de conexion de canales para ingesta automatica */
export interface ChannelConnectionStatus {
  meta: boolean;
  google: boolean;
  tiktok: boolean;
}

/** Config completa del modulo guardada en DB o localStorage */
export interface MmmSavedConfig {
  channels: ChannelConfig[];
  rows: WeeklyRow[];
  savedAt: string;
  workspaceId?: string;
}
