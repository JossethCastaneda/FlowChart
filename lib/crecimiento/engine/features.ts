/**
 * Feature engineering determinista. Convierte filas crudas (columna→string) en
 * vectores numéricos reproducibles:
 *  - numérico  → z-score con imputación por mediana
 *  - booleano  → 0/1 (imputado 0)
 *  - fecha     → recency en días desde la fecha más reciente del set, z-scored
 *  - categórico→ one-hot acotado a top-K categorías + "__other__"
 *
 * El artefacto (medias, std, categorías, referencia temporal) se persiste en
 * AriaModel.params para aplicar exactamente la misma transformación al puntuar.
 */

import type { ColumnProfile, FeatureArtifact } from "./types";
import { isNullToken } from "./profiling";

const MAX_CATEGORIES = 12;
const OTHER = "__other__";

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
  const n = toNumber(v);
  if (n !== null) return n > 0 ? 1 : 0;
  return null;
}

function toMs(v: string): number | null {
  if (isNullToken(v)) return null;
  const ms = Date.parse(v.trim());
  return Number.isFinite(ms) ? ms : null;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function meanStd(nums: number[]): { mean: number; std: number } {
  if (nums.length === 0) return { mean: 0, std: 1 };
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + (b - mean) * (b - mean), 0) / nums.length;
  const std = Math.sqrt(variance);
  return { mean, std: std > 1e-9 ? std : 1 };
}

/** Construye el transformador de features a partir de las filas de entrenamiento. */
export function buildFeatureArtifact(
  rows: Record<string, string>[],
  profiles: ColumnProfile[],
  targetColumn: string | null,
): FeatureArtifact {
  const artifact: FeatureArtifact = {
    featureNames: [],
    order: [],
    numeric: {},
    categorical: {},
    date: {},
    targetColumn,
  };

  for (const p of profiles) {
    if (!p.isFeature || p.name === targetColumn) continue;
    const raw = rows.map((r) => r[p.name] ?? "");

    if (p.dataType === "number" || p.dataType === "boolean") {
      const vals: number[] = [];
      for (const v of raw) {
        const n = p.dataType === "boolean" ? boolToNum(v) : toNumber(v);
        if (n !== null) vals.push(n);
      }
      const med = median(vals);
      const ms = meanStd(vals);
      artifact.numeric[p.name] = { mean: ms.mean, std: ms.std, median: med };
      artifact.order.push({ column: p.name, kind: "numeric" });
      artifact.featureNames.push(p.name);
    } else if (p.dataType === "date") {
      const msVals: number[] = [];
      for (const v of raw) {
        const ms = toMs(v);
        if (ms !== null) msVals.push(ms);
      }
      const reference = msVals.length > 0 ? Math.max(...msVals) : 0;
      const recencies = msVals.map((m) => (reference - m) / 86_400_000);
      const stats = meanStd(recencies);
      artifact.date[p.name] = {
        referenceMs: reference,
        recencyMean: stats.mean,
        recencyStd: stats.std,
      };
      artifact.order.push({ column: p.name, kind: "date" });
      artifact.featureNames.push(`${p.name}__recency`);
    } else {
      const counts = new Map<string, number>();
      for (const v of raw) {
        if (isNullToken(v)) continue;
        const key = v.trim().toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      const top = [...counts.entries()]
        .sort((a, b) => (b[1] - a[1] !== 0 ? b[1] - a[1] : a[0].localeCompare(b[0])))
        .slice(0, MAX_CATEGORIES)
        .map((e) => e[0]);
      const categories = [...top, OTHER];
      artifact.categorical[p.name] = { categories };
      artifact.order.push({ column: p.name, kind: "categorical" });
      for (const cat of categories) artifact.featureNames.push(`${p.name}=${cat}`);
    }
  }

  return artifact;
}

/** Aplica el artefacto a una fila → vector numérico alineado a featureNames. */
export function transformRow(artifact: FeatureArtifact, row: Record<string, string>): number[] {
  const out: number[] = [];
  for (const spec of artifact.order) {
    const raw = row[spec.column] ?? "";
    if (spec.kind === "numeric") {
      const t = artifact.numeric[spec.column];
      let n = boolOrNum(raw);
      if (n === null) n = t.median;
      out.push((n - t.mean) / t.std);
    } else if (spec.kind === "date") {
      const t = artifact.date[spec.column];
      const ms = toMs(raw);
      const recency = ms === null ? t.recencyMean : (t.referenceMs - ms) / 86_400_000;
      out.push((recency - t.recencyMean) / t.recencyStd);
    } else {
      const t = artifact.categorical[spec.column];
      const key = isNullToken(raw) ? OTHER : raw.trim().toLowerCase();
      const idx = t.categories.indexOf(key);
      const hot = idx === -1 ? t.categories.length - 1 : idx; // -1 → __other__
      for (let c = 0; c < t.categories.length; c++) out.push(c === hot ? 1 : 0);
    }
  }
  return out;
}

function boolOrNum(v: string): number | null {
  const n = toNumber(v);
  if (n !== null) return n;
  return boolToNum(v);
}

/** Transforma todas las filas a la matriz de features X. */
export function transformAll(
  artifact: FeatureArtifact,
  rows: Record<string, string>[],
): number[][] {
  return rows.map((r) => transformRow(artifact, r));
}
