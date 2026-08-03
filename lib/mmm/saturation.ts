/**
 * FLOWCHART · MMM — Saturation (Diminishing Returns)
 *
 * La saturación modela el hecho de que cada dólar adicional en un canal
 * produce rendimientos decrecientes. Usa la función Hill (S-curve):
 *
 *   R(x) = x^α / (K^α + x^α)
 *
 * donde:
 *   α (alpha) = controla la pendiente. α < 1: cóncava. α > 1: S-curve.
 *   K = half-saturation point. En K, R = 0.5 (50% del efecto máximo).
 *
 * Resultado está normalizado: R ∈ [0, 1].
 */

import type { SaturationPoint } from "./types";

/**
 * Calcula la respuesta Hill para un valor de spend dado.
 */
export function hillSaturation(x: number, alpha: number, k: number): number {
  if (x <= 0) return 0;
  if (k <= 0) return 1;
  const xA = Math.pow(x, alpha);
  const kA = Math.pow(k, alpha);
  return xA / (kA + xA);
}

/**
 * Aplica la saturación Hill a toda una serie de adstock.
 */
export function applySaturation(adstocked: number[], alpha: number, k: number): number[] {
  return adstocked.map(x => hillSaturation(x, alpha, k));
}

/**
 * Genera la curva de saturación para visualización.
 * @param alpha    Parámetro de forma
 * @param k        Half-saturation point
 * @param maxSpend Gasto máximo del eje X
 * @param currentSpend Gasto actual (para marcar el punto actual)
 * @param points   Número de puntos de la curva
 */
export function saturationCurve(
  alpha: number,
  k: number,
  maxSpend: number,
  currentSpend: number,
  points = 50,
): SaturationPoint[] {
  const step = maxSpend / points;
  return Array.from({ length: points + 1 }, (_, i) => {
    const spend = i * step;
    return {
      spend,
      response: hillSaturation(spend, alpha, k),
      isCurrent: Math.abs(spend - currentSpend) < step / 2,
    };
  });
}

/**
 * Calcula el ROI marginal (derivada de Hill) en un punto x.
 * marginalROI = d/dx Hill(x) = α * K^α * x^(α-1) / (K^α + x^α)^2
 */
export function marginalResponse(x: number, alpha: number, k: number): number {
  if (x <= 0) return alpha / Math.pow(k, alpha) * 0;
  const xA = Math.pow(x, alpha);
  const kA = Math.pow(k, alpha);
  const num = alpha * kA * Math.pow(x, alpha - 1);
  const den = Math.pow(kA + xA, 2);
  return den > 0 ? num / den : 0;
}
