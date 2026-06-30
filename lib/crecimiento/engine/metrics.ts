/**
 * Métricas reales (no constantes). AUC por Mann–Whitney U (rank-based, exacto y
 * determinista, sin muestreo), más accuracy/precision/recall/F1, lift@decil y
 * selección de umbral por F1. Calibración de prioridad por cuantiles.
 */

import type { Metrics, Confusion, PriorityCuts } from "./types";

/** AUC = probabilidad de rankear un positivo por encima de un negativo. */
export function computeAuc(yTrue: number[], yScore: number[]): number {
  const n = yTrue.length;
  const pos = yTrue.reduce((a, b) => a + b, 0);
  const neg = n - pos;
  if (pos === 0 || neg === 0) return 0.5;

  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => yScore[a] - yScore[b]);
  const ranks: number[] = Array.from({ length: n }, () => 0);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && yScore[idx[j + 1]] === yScore[idx[i]]) j++;
    const avgRank = (i + 1 + (j + 1)) / 2;
    for (let k = i; k <= j; k++) ranks[idx[k]] = avgRank;
    i = j + 1;
  }
  let sumRanksPos = 0;
  for (let k = 0; k < n; k++) if (yTrue[k] === 1) sumRanksPos += ranks[k];
  return (sumRanksPos - (pos * (pos + 1)) / 2) / (pos * neg);
}

export function liftAtDecile(yTrue: number[], yScore: number[], baseRate: number): number {
  if (baseRate <= 0) return 0;
  const n = yTrue.length;
  if (n === 0) return 0;
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => yScore[b] - yScore[a]);
  const k = Math.max(1, Math.floor(n * 0.1));
  let posTop = 0;
  for (let i = 0; i < k; i++) if (yTrue[idx[i]] === 1) posTop++;
  return posTop / k / baseRate;
}

function f1AtThreshold(yTrue: number[], yScore: number[], threshold: number): number {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (let i = 0; i < yTrue.length; i++) {
    const pred = yScore[i] >= threshold ? 1 : 0;
    if (pred === 1 && yTrue[i] === 1) tp++;
    else if (pred === 1) fp++;
    else if (yTrue[i] === 1) fn++;
  }
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  return precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
}

/** Umbral que maximiza F1 sobre los scores observados (no fijo). */
export function bestThreshold(yTrue: number[], yScore: number[]): number {
  const cands = Array.from(new Set(yScore)).sort((a, b) => a - b);
  let best = 0.5;
  let bestF1 = -1;
  for (const t of cands) {
    const f1 = f1AtThreshold(yTrue, yScore, t);
    if (f1 > bestF1) {
      bestF1 = f1;
      best = t;
    }
  }
  return best;
}

export function computeMetrics(yTrue: number[], yScore: number[], threshold: number): Metrics {
  const confusion: Confusion = { tp: 0, fp: 0, tn: 0, fn: 0 };
  for (let i = 0; i < yTrue.length; i++) {
    const pred = yScore[i] >= threshold ? 1 : 0;
    if (pred === 1 && yTrue[i] === 1) confusion.tp++;
    else if (pred === 1) confusion.fp++;
    else if (yTrue[i] === 1) confusion.fn++;
    else confusion.tn++;
  }
  const precision =
    confusion.tp + confusion.fp > 0 ? confusion.tp / (confusion.tp + confusion.fp) : 0;
  const recall = confusion.tp + confusion.fn > 0 ? confusion.tp / (confusion.tp + confusion.fn) : 0;
  const accuracy = yTrue.length > 0 ? (confusion.tp + confusion.tn) / yTrue.length : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const auc = computeAuc(yTrue, yScore);
  const baseRate = yTrue.length > 0 ? yTrue.reduce((a, b) => a + b, 0) / yTrue.length : 0;
  const lift = liftAtDecile(yTrue, yScore, baseRate);
  return { accuracy, precision, recall, f1, auc, liftAtDecile: lift, confusion, threshold, baseRate };
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const frac = pos - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

/** Cortes de prioridad: top ~20% probabilidad = High, siguiente ~30% = Medium. */
export function computePriorityCuts(probs: number[]): PriorityCuts {
  const sorted = [...probs].sort((a, b) => a - b);
  return { high: quantile(sorted, 0.8), medium: quantile(sorted, 0.5) };
}

export function priorityFor(prob: number, cuts: PriorityCuts): "High" | "Medium" | "Low" {
  if (prob >= cuts.high) return "High";
  if (prob >= cuts.medium) return "Medium";
  return "Low";
}
