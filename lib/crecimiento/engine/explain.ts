/**
 * Explicabilidad real derivada del modelo (no hardcodeada).
 *
 * Importancia global = |coeficiente| agregado por columna original, normalizado a
 * proporción. Atribución por-lead = peso·valor (SHAP exacto para modelos lineales),
 * agregada por columna y devuelta como top-K factores con signo.
 */

import type { FeatureArtifact, FeatureImportance, LogRegParams } from "./types";

function baseColumn(featureName: string): string {
  if (featureName.endsWith("__recency")) return featureName.slice(0, featureName.length - "__recency".length);
  const eq = featureName.indexOf("=");
  return eq === -1 ? featureName : featureName.slice(0, eq);
}

export function featureImportance(
  model: LogRegParams,
  featureNames: string[],
): FeatureImportance[] {
  const agg = new Map<string, number>();
  for (let j = 0; j < featureNames.length; j++) {
    const col = baseColumn(featureNames[j]);
    agg.set(col, (agg.get(col) ?? 0) + Math.abs(model.weights[j]));
  }
  const total = [...agg.values()].reduce((a, b) => a + b, 0) || 1;
  return [...agg.entries()]
    .map(([feature, v]) => ({ feature, importance: v / total }))
    .sort((a, b) => b.importance - a.importance);
}

export function leadTopFactors(
  model: LogRegParams,
  artifact: FeatureArtifact,
  x: number[],
  k = 3,
): { factor: string; contribution: number }[] {
  const agg = new Map<string, number>();
  for (let j = 0; j < artifact.featureNames.length; j++) {
    const col = baseColumn(artifact.featureNames[j]);
    agg.set(col, (agg.get(col) ?? 0) + model.weights[j] * x[j]);
  }
  return [...agg.entries()]
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, k)
    .map(([factor, contribution]) => ({ factor, contribution }));
}
