/**
 * Scorecard aditivo Weight-of-Evidence (WOE) — segundo modelo candidato.
 *
 * Robusto e interpretable sobre datos tabulares/categóricos de leads. Cada feature
 * se binnea (numérico/fecha por cuantiles, categórico por categoría) y aporta un
 * log-odds (WOE con suavizado de Laplace). La probabilidad es sigmoid(intercept +
 * Σ woe). Se entrena en paralelo a la regresión logística y se elige el de mayor
 * AUC en test (paso "comparar modelos candidatos" del plan).
 */

import type { ColumnProfile, WoeParams, WoeFeature, WoeBin } from "./types";
import { isNullToken } from "./profiling";

const N_BINS = 5;
const MAX_CAT = 12;

function toNumber(v: string): number | null {
  const cleaned = v.trim().replace(/\s/g, "").replace(/,/g, ".");
  if (cleaned === "") return null;
  if (!/^[-+]?\d*\.?\d+([eE][-+]?\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
function boolToNum(v: string): number | null {
  const t = v.trim().toLowerCase();
  if (["1", "true", "si", "sí", "yes", "y", "t"].includes(t)) return 1;
  if (["0", "false", "no", "n", "f"].includes(t)) return 0;
  return null;
}
function toMs(v: string): number | null {
  if (isNullToken(v)) return null;
  const ms = Date.parse(v.trim());
  return Number.isFinite(ms) ? ms : null;
}

/** Valor numérico de una celda según el tipo (string → null = categórico/missing). */
function numericValue(raw: string, type: ColumnProfile["dataType"]): number | null {
  if (isNullToken(raw)) return null;
  if (type === "number") return toNumber(raw);
  if (type === "boolean") return boolToNum(raw);
  if (type === "date") return toMs(raw);
  return null;
}

function woe(posInBin: number, negInBin: number, totalPos: number, totalNeg: number): number {
  const distPos = (posInBin + 0.5) / (totalPos + 0.5);
  const distNeg = (negInBin + 0.5) / (totalNeg + 0.5);
  return Math.log(distPos / distNeg);
}

function quantileEdges(values: number[], nBins: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const edges: number[] = [];
  for (let i = 1; i < nBins; i++) {
    const pos = (i / nBins) * (sorted.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    const frac = pos - lo;
    edges.push(sorted[lo] * (1 - frac) + sorted[hi] * frac);
  }
  // Bordes únicos crecientes (datasets con pocos valores distintos).
  return Array.from(new Set(edges)).sort((a, b) => a - b);
}

function binIndex(value: number, edges: number[]): number {
  let idx = 0;
  while (idx < edges.length && value >= edges[idx]) idx++;
  return idx;
}

export function buildWoe(
  rows: Record<string, string>[],
  profiles: ColumnProfile[],
  y: number[],
  targetColumn: string | null,
): WoeParams {
  const totalPos = y.reduce((a, b) => a + b, 0);
  const totalNeg = y.length - totalPos;
  const intercept = Math.log((totalPos + 0.5) / (totalNeg + 0.5));
  const features: WoeFeature[] = [];

  for (const p of profiles) {
    if (!p.isFeature || p.name === targetColumn) continue;
    const isCategorical = p.dataType === "string";

    let missingPos = 0;
    let missingNeg = 0;
    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i][p.name] ?? "";
      const missing = isCategorical ? isNullToken(raw) : numericValue(raw, p.dataType) === null;
      if (missing) {
        if (y[i] === 1) missingPos++;
        else missingNeg++;
      }
    }
    const missingWoe = woe(missingPos, missingNeg, totalPos, totalNeg);

    if (isCategorical) {
      const counts = new Map<string, number>();
      for (const r of rows) {
        const raw = r[p.name] ?? "";
        if (isNullToken(raw)) continue;
        const k = raw.trim().toLowerCase();
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      const top = [...counts.entries()]
        .sort((a, b) => (b[1] - a[1] !== 0 ? b[1] - a[1] : a[0].localeCompare(b[0])))
        .slice(0, MAX_CAT)
        .map((e) => e[0]);
      const bins: WoeBin[] = [];
      const claimed = new Set(top);
      for (const cat of top) {
        let pos = 0;
        let neg = 0;
        for (let i = 0; i < rows.length; i++) {
          if ((rows[i][p.name] ?? "").trim().toLowerCase() === cat) {
            if (y[i] === 1) pos++;
            else neg++;
          }
        }
        bins.push({ kind: "categorical", lo: null, hi: null, categories: [cat], woe: woe(pos, neg, totalPos, totalNeg) });
      }
      // bin "other" (categorías fuera del top)
      let oPos = 0;
      let oNeg = 0;
      for (let i = 0; i < rows.length; i++) {
        const raw = (rows[i][p.name] ?? "").trim().toLowerCase();
        if (isNullToken(raw) || claimed.has(raw)) continue;
        if (y[i] === 1) oPos++;
        else oNeg++;
      }
      bins.push({ kind: "categorical", lo: null, hi: null, categories: null, woe: woe(oPos, oNeg, totalPos, totalNeg) });
      features.push({ column: p.name, type: p.dataType, bins, missingWoe });
    } else {
      const nums: number[] = [];
      for (const r of rows) {
        const n = numericValue(r[p.name] ?? "", p.dataType);
        if (n !== null) nums.push(n);
      }
      if (nums.length === 0) continue;
      const edges = quantileEdges(nums, N_BINS);
      const nBins = edges.length + 1;
      const posCount = Array.from({ length: nBins }, () => 0);
      const negCount = Array.from({ length: nBins }, () => 0);
      for (let i = 0; i < rows.length; i++) {
        const n = numericValue(rows[i][p.name] ?? "", p.dataType);
        if (n === null) continue;
        const b = binIndex(n, edges);
        if (y[i] === 1) posCount[b]++;
        else negCount[b]++;
      }
      const bins: WoeBin[] = [];
      for (let b = 0; b < nBins; b++) {
        const lo = b === 0 ? null : edges[b - 1];
        const hi = b === nBins - 1 ? null : edges[b];
        bins.push({ kind: "numeric", lo, hi, categories: null, woe: woe(posCount[b], negCount[b], totalPos, totalNeg) });
      }
      features.push({ column: p.name, type: p.dataType, bins, missingWoe });
    }
  }

  return { intercept, features };
}

export function predictProbaWoe(params: WoeParams, row: Record<string, string>): number {
  let logit = params.intercept;
  for (const f of params.features) {
    const raw = row[f.column] ?? "";
    if (f.type === "string") {
      if (isNullToken(raw)) {
        logit += f.missingWoe;
        continue;
      }
      const key = raw.trim().toLowerCase();
      const exact = f.bins.find((b) => b.categories !== null && b.categories.includes(key));
      if (exact) logit += exact.woe;
      else {
        const other = f.bins.find((b) => b.kind === "categorical" && b.categories === null);
        logit += other ? other.woe : 0;
      }
    } else {
      const n = numericValue(raw, f.type);
      if (n === null) {
        logit += f.missingWoe;
        continue;
      }
      const bin = f.bins.find((b) => {
        const okLo = b.lo === null || n >= b.lo;
        const okHi = b.hi === null || n < b.hi;
        return okLo && okHi;
      });
      logit += bin ? bin.woe : 0;
    }
  }
  if (logit >= 0) {
    const e = Math.exp(-logit);
    return 1 / (1 + e);
  }
  const e = Math.exp(logit);
  return e / (1 + e);
}
