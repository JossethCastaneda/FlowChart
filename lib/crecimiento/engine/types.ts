/**
 * Tipos compartidos del motor predictivo determinista de Aria (lead scoring).
 *
 * Todo el motor corre en TypeScript puro sobre Vercel Fluid Compute (sin Python,
 * sin binarios nativos) y es DETERMINISTA: la única fuente de aleatoriedad es un
 * RNG sembrado a partir del datasetId (ver rng.ts). Nada de Math.random / Date.now
 * en el cálculo de scores.
 */

export type ColumnType = "number" | "boolean" | "date" | "string";

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: string;
  encoding: string;
}

/** Perfil determinista de una columna, persistido en AriaDatasetColumn. */
export interface ColumnProfile {
  name: string;
  dataType: ColumnType;
  nullCount: number;
  distinctCount: number;
  minValue: number | null;
  maxValue: number | null;
  meanValue: number | null;
  sampleValues: string[];
  isTarget: boolean;
  isFeature: boolean;
}

export interface NumericTransform {
  mean: number;
  std: number;
  median: number;
}
export interface CategoricalTransform {
  /** Orden fijo del one-hot (acotado a top-K + "__other__"). */
  categories: string[];
}
export interface DateTransform {
  /** Epoch ms de referencia para derivar recency (días). */
  referenceMs: number;
  recencyMean: number;
  recencyStd: number;
}

/** Orden estable de las columnas en el vector de features (seguro al serializar). */
export interface FeatureColumnSpec {
  column: string;
  kind: "numeric" | "date" | "categorical";
}

/** Artefacto del transformador de features, persistido dentro de ModelArtifact. */
export interface FeatureArtifact {
  featureNames: string[];
  order: FeatureColumnSpec[];
  numeric: Record<string, NumericTransform>;
  categorical: Record<string, CategoricalTransform>;
  date: Record<string, DateTransform>;
  targetColumn: string | null;
}

export interface LogRegParams {
  weights: number[];
  bias: number;
}

export interface WoeBin {
  kind: "numeric" | "categorical";
  lo: number | null;
  hi: number | null;
  categories: string[] | null;
  woe: number;
}
export interface WoeFeature {
  column: string;
  type: ColumnType;
  bins: WoeBin[];
  missingWoe: number;
}
export interface WoeParams {
  /** log base-odds. */
  intercept: number;
  features: WoeFeature[];
}

export interface BaselineParams {
  /** Pesos transparentes del scorecard heurístico sobre features estandarizadas. */
  weights: Record<string, number>;
  bias: number;
}

/** Cortes de prioridad por probabilidad (calibrados por cuantiles de entrenamiento). */
export interface PriorityCuts {
  high: number;
  medium: number;
}

export type ModelKind = "logistic_regression" | "scorecard_woe" | "heuristic_baseline";

/** Artefacto entrenado completo, persistido en AriaModel.params (Json). */
export interface ModelArtifact {
  kind: ModelKind;
  feature: FeatureArtifact;
  logreg: LogRegParams | null;
  woe: WoeParams | null;
  baseline: BaselineParams | null;
  priorityCuts: PriorityCuts;
  baseRate: number;
}

export interface Confusion {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

export interface Metrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  auc: number;
  liftAtDecile: number;
  confusion: Confusion;
  threshold: number;
  baseRate: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export type Priority = "High" | "Medium" | "Low";

export interface ScoredRecord {
  recordId: string;
  probability: number;
  /** 0..100 */
  score: number;
  priority: Priority;
  topFactors: { factor: string; contribution: number }[];
}
