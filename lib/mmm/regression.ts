/**
 * FLOWCHART · MMM — Regresión OLS simplificada
 *
 * Ridge Regression (L2 penalty) para estimar los coeficientes β del modelo:
 *   y = β₀ + β₁X₁ + β₂X₂ + ... + βₙXₙ + ε
 *
 * Implementación con descenso de gradiente estocástico. Inspirado en Meta Robyn (FastMMM)
 * para manejar multicolinealidad entre canales.
 *
 * Implementación con descenso de gradiente para N canales.
 * Suficientemente robusto para los datos que maneja una agencia (< 500 filas).
 */

/**
 * Normaliza una columna al rango [0,1].
 */
function normalizeColumn(col: number[]): { normalized: number[]; min: number; max: number } {
  const min = Math.min(...col);
  const max = Math.max(...col);
  const range = max - min;
  return {
    normalized: range > 0 ? col.map(v => (v - min) / range) : col.map(() => 0),
    min,
    max,
  };
}

/**
 * Regresión múltiple con regularización Ridge (L2 penalty)
 * usando descenso de gradiente simplificado.
 *
 * @param X Matriz de features [n_samples × n_features]
 * @param y Vector de target [n_samples]
 * @param lr Tasa de aprendizaje (default 0.01)
 * @param epochs Iteraciones (default 2000)
 * @param lambda Penalización L2 (default 0.1)
 * @returns Array [β₀, β₁, β₂, ...] con intercepto primero
 */
export function ridgeRegression(
  X: number[][],
  y: number[],
  lr = 0.01,
  epochs = 2000,
  lambda = 0.1
): number[] {
  const n = X.length;
  const m = X[0]?.length ?? 0;
  if (n === 0 || m === 0) return new Array(m + 1).fill(0);

  // Inicializar coeficientes a cero [β₀, β₁, ..., βₘ]
  const beta = new Array(m + 1).fill(0);

  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradients = new Array(m + 1).fill(0);

    for (let i = 0; i < n; i++) {
      // Predicción: β₀ + Σ βⱼ × Xᵢⱼ
      let pred = beta[0];
      for (let j = 0; j < m; j++) pred += beta[j + 1] * X[i][j];

      const error = pred - y[i];
      gradients[0] += error;
      for (let j = 0; j < m; j++) gradients[j + 1] += error * X[i][j];
    }

    for (let j = 0; j <= m; j++) {
      // Aplicar penalización Ridge solo a los coeficientes, no al intercepto
      const penalty = j === 0 ? 0 : (2 * lambda * beta[j]) / n;
      beta[j] -= (lr / n) * gradients[j] + lr * penalty;
    }
  }

  return beta;
}

/**
 * Calcula R² (coeficiente de determinación).
 * @param y     Valores reales
 * @param yHat  Valores predichos
 */
export function rSquared(y: number[], yHat: number[]): number {
  const mean = y.reduce((s, v) => s + v, 0) / y.length;
  const ssTot = y.reduce((s, v) => s + Math.pow(v - mean, 2), 0);
  const ssRes = y.reduce((s, v, i) => s + Math.pow(v - yHat[i], 2), 0);
  return ssTot > 0 ? 1 - ssRes / ssTot : 0;
}

/**
 * Genera predicciones usando los coeficientes ajustados.
 */
export function predict(beta: number[], X: number[][]): number[] {
  return X.map(row => {
    let pred = beta[0];
    for (let j = 0; j < row.length; j++) pred += beta[j + 1] * row[j];
    return pred;
  });
}

/**
 * Calcula NRMSE (Normalized Root Mean Square Error).
 */
export function nrmse(y: number[], yHat: number[]): number {
  if (y.length === 0) return 0;
  const mse = y.reduce((s, v, i) => s + Math.pow(v - yHat[i], 2), 0) / y.length;
  const range = Math.max(...y) - Math.min(...y);
  return range > 0 ? Math.sqrt(mse) / range : 0;
}

export { normalizeColumn };
