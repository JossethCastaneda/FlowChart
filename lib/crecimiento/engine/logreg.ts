/**
 * Regresión logística por descenso de gradiente batch.
 *
 * Determinista (init en ceros, sin RNG), con regularización L2 y ponderación de
 * clase para el fuerte desbalance típico del lead scoring (positivos < 10%).
 */

import type { LogRegParams } from "./types";

export function sigmoid(z: number): number {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

export interface TrainOpts {
  iters?: number;
  lr?: number;
  l2?: number;
}

export function trainLogReg(X: number[][], y: number[], opts: TrainOpts = {}): LogRegParams {
  const iters = opts.iters ?? 400;
  const lr = opts.lr ?? 0.1;
  const l2 = opts.l2 ?? 1e-2;
  const n = X.length;
  const d = n > 0 ? X[0].length : 0;
  const weights: number[] = Array.from({ length: d }, () => 0);
  let bias = 0;

  const pos = y.reduce((a, b) => a + b, 0);
  const neg = n - pos;
  // Ponderación inversa a la frecuencia (balancea el gradiente entre clases).
  const wPos = pos > 0 ? n / (2 * pos) : 1;
  const wNeg = neg > 0 ? n / (2 * neg) : 1;

  for (let it = 0; it < iters; it++) {
    const gradW: number[] = Array.from({ length: d }, () => 0);
    let gradB = 0;
    for (let i = 0; i < n; i++) {
      const xi = X[i];
      let z = bias;
      for (let j = 0; j < d; j++) z += weights[j] * xi[j];
      const p = sigmoid(z);
      const w = y[i] === 1 ? wPos : wNeg;
      const err = (p - y[i]) * w;
      for (let j = 0; j < d; j++) gradW[j] += err * xi[j];
      gradB += err;
    }
    for (let j = 0; j < d; j++) {
      const g = gradW[j] / Math.max(1, n) + l2 * weights[j];
      weights[j] -= lr * g;
    }
    bias -= lr * (gradB / Math.max(1, n));
  }

  return { weights, bias };
}

export function predictProbaLogReg(model: LogRegParams, x: number[]): number {
  let z = model.bias;
  for (let j = 0; j < model.weights.length; j++) z += model.weights[j] * x[j];
  return sigmoid(z);
}
