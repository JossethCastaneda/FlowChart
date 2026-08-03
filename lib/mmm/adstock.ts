/**
 * FLOWCHART · MMM — Adstock (Carryover Effect)
 *
 * El efecto adstock captura que la publicidad de hoy sigue influyendo
 * en ventas futuras. Usa decaimiento geométrico:
 *
 *   A_t = spend_t + λ × A_{t-1}
 *
 * donde λ (lambda) es la tasa de retención: 0 = sin carryover, 0.9 = muy persistente.
 */

/**
 * Aplica la transformación adstock geométrica a una serie de gasto.
 * @param spend  Array de gasto semanal (en orden cronológico)
 * @param lambda Tasa de retención λ ∈ [0, 1]
 * @returns Array con los valores de adstock (misma longitud)
 */
export function applyAdstock(spend: number[], lambda: number): number[] {
  if (spend.length === 0) return [];
  const result: number[] = new Array(spend.length).fill(0);
  result[0] = spend[0];
  for (let t = 1; t < spend.length; t++) {
    result[t] = spend[t] + lambda * result[t - 1];
  }
  return result;
}

/**
 * Genera la curva de decaimiento adstock para visualización.
 * Simula el efecto residual de un único impulso de gasto = 1.
 * @param lambda  Tasa de retención
 * @param periods Número de períodos a simular
 */
export function adstockDecayCurve(lambda: number, periods = 12): number[] {
  const curve: number[] = [1];
  for (let t = 1; t < periods; t++) {
    curve.push(curve[t - 1] * lambda);
  }
  return curve;
}

/**
 * Calcula el "half-life" del adstock: número de períodos para que
 * el efecto decaiga al 50%.
 */
export function adstockHalfLife(lambda: number): number {
  if (lambda <= 0) return 0;
  if (lambda >= 1) return Infinity;
  return Math.log(0.5) / Math.log(lambda);
}
