/**
 * Baseline heurístico HONESTO para scope sin datos etiquetados suficientes.
 *
 * NO es un modelo entrenado: es un scorecard determinista y transparente con pesos
 * documentados sobre señales genéricas de intención (engagement, recency, calidad
 * de fuente). Reemplaza el Math.random anterior: mismo input → mismo score, y la
 * UI lo marca claramente como "baseline / no entrenado" (sin métricas de AUC).
 */

import type { BaselineParams, FeatureArtifact } from "./types";

// Señales cuyo aumento sugiere MAYOR intención de conversión.
const POSITIVE_HINTS = [
  "visit", "visita", "time", "tiempo", "click", "open", "apertura", "engage",
  "interac", "monto", "valor", "score", "sesion", "session", "page", "pagina",
  "compra", "ticket", "lead", "respuesta", "reply",
];
// Señales cuyo aumento sugiere MENOR intención.
const NEGATIVE_HINTS = ["recency", "dias_sin", "rebote", "bounce", "cancel", "baja"];
// Lexicón de calidad de fuente/canal (en el nombre del feature one-hot).
const HIGH_QUALITY_SOURCE = /(organic|orgánico|referral|referido|direct|directo|recomend|whatsapp)/;
const PAID_SOURCE = /(paid|pago|ads|display|banner)/;

export function buildBaseline(artifact: FeatureArtifact): BaselineParams {
  const weights: Record<string, number> = {};
  for (const name of artifact.featureNames) {
    const lname = name.toLowerCase();
    let w = 0;
    if (POSITIVE_HINTS.some((h) => lname.includes(h))) w += 0.6;
    if (NEGATIVE_HINTS.some((h) => lname.includes(h))) w -= 0.6;
    if (
      lname.includes("fuente") ||
      lname.includes("source") ||
      lname.includes("canal") ||
      lname.includes("channel")
    ) {
      if (HIGH_QUALITY_SOURCE.test(lname)) w += 0.5;
      else if (PAID_SOURCE.test(lname)) w += 0.1;
    }
    weights[name] = w;
  }
  return { weights, bias: 0 };
}

export function predictBaseline(
  params: BaselineParams,
  x: number[],
  featureNames: string[],
): number {
  let z = params.bias;
  for (let j = 0; j < featureNames.length; j++) {
    z += (params.weights[featureNames[j]] ?? 0) * x[j];
  }
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}
