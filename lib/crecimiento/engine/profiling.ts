/**
 * Perfilado determinista del dataset: inferencia de tipos, conteo de nulos/distintos,
 * estadísticos numéricos, detección de columna objetivo y normalización del label.
 *
 * Implementa los pasos 2–4 del pipeline del plan (detectar tipos, limpiar, detectar
 * variable objetivo) de forma reproducible y sin dependencias.
 */

import type { ColumnProfile, ColumnType } from "./types";

const NULL_TOKENS = new Set(["", "na", "n/a", "null", "nan", "none", "-", "—", "undefined"]);

/** Vocabulario canónico es/en para detectar el valor positivo del target. */
const POSITIVE_TOKENS = new Set([
  "1", "true", "si", "sí", "yes", "y", "t",
  "convertido", "converted", "conversion", "won", "ganado",
  "cliente", "venta", "vendido", "sale", "closed", "cierre", "comprado", "buy",
]);
const NEGATIVE_TOKENS = new Set([
  "0", "false", "no", "n", "f",
  "perdido", "lost", "abierto", "open", "sin convertir", "not converted", "abandono",
]);

/** Nombres de columna que sugieren ser la variable objetivo (binaria de conversión). */
const TARGET_NAME_HINTS = [
  "convertido", "converted", "conversion", "conversión", "target", "objetivo",
  "cierre", "closed", "won", "ganado", "venta", "vendido", "sale", "resultado", "label", "y",
];

export function isNullToken(v: string): boolean {
  return NULL_TOKENS.has(v.trim().toLowerCase());
}

function parseNumber(v: string): number | null {
  const cleaned = v.trim().replace(/\s/g, "").replace(/,/g, ".");
  if (cleaned === "") return null;
  // Evita que valores como "1.2.3" o "12/05" pasen como número.
  if (!/^[-+]?\d*\.?\d+([eE][-+]?\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function isBooleanToken(v: string): boolean {
  const t = v.trim().toLowerCase();
  return POSITIVE_TOKENS.has(t) || NEGATIVE_TOKENS.has(t);
}

function isDateToken(v: string): boolean {
  const t = v.trim();
  if (t.length < 6) return false;
  // ISO o dd/mm/yyyy o dd-mm-yyyy
  if (!/[0-9]{4}|[0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4}/.test(t)) return false;
  const ms = Date.parse(t);
  return Number.isFinite(ms);
}

/** Convierte el valor crudo del target a 0/1 según el vocabulario canónico. */
export function parseTargetValue(v: string): 0 | 1 {
  const t = v.trim().toLowerCase();
  if (POSITIVE_TOKENS.has(t)) return 1;
  if (NEGATIVE_TOKENS.has(t)) return 0;
  const n = parseNumber(v);
  if (n !== null) return n > 0 ? 1 : 0;
  return 0;
}

function inferType(values: string[]): ColumnType {
  let nums = 0;
  let bools = 0;
  let dates = 0;
  let nonNull = 0;
  for (const raw of values) {
    if (isNullToken(raw)) continue;
    nonNull++;
    if (isBooleanToken(raw)) bools++;
    if (parseNumber(raw) !== null) nums++;
    if (isDateToken(raw)) dates++;
  }
  if (nonNull === 0) return "string";
  const distinct = new Set(values.map((v) => v.trim().toLowerCase())).size;
  // Booleano: casi todos los no-nulos caen en el vocabulario y hay ≤ 2 valores reales.
  if (bools / nonNull >= 0.9 && distinct <= 3) return "boolean";
  if (nums / nonNull >= 0.85) return "number";
  if (dates / nonNull >= 0.8) return "date";
  return "string";
}

/** Perfila todas las columnas a partir de las filas crudas. */
export function profileColumns(headers: string[], rows: Record<string, string>[]): ColumnProfile[] {
  return headers.map((name) => {
    const values = rows.map((r) => r[name] ?? "");
    const dataType = inferType(values);
    let nullCount = 0;
    const distinct = new Set<string>();
    const sample: string[] = [];
    const numeric: number[] = [];
    for (const raw of values) {
      if (isNullToken(raw)) {
        nullCount++;
        continue;
      }
      distinct.add(raw.trim().toLowerCase());
      if (sample.length < 5 && !sample.includes(raw)) sample.push(raw);
      if (dataType === "number") {
        const n = parseNumber(raw);
        if (n !== null) numeric.push(n);
      }
    }
    let minValue: number | null = null;
    let maxValue: number | null = null;
    let meanValue: number | null = null;
    if (numeric.length > 0) {
      minValue = Math.min(...numeric);
      maxValue = Math.max(...numeric);
      meanValue = numeric.reduce((a, b) => a + b, 0) / numeric.length;
    }
    return {
      name,
      dataType,
      nullCount,
      distinctCount: distinct.size,
      minValue,
      maxValue,
      meanValue,
      sampleValues: sample,
      isTarget: false,
      isFeature: true,
    };
  });
}

/**
 * Detecta la columna objetivo: prioriza columnas binarias cuyo nombre sugiere
 * conversión; si no, cualquier columna binaria del vocabulario. Devuelve null si
 * el dataset no tiene un target reconocible (→ scope sin etiquetar).
 */
export function detectTarget(
  profiles: ColumnProfile[],
  rows: Record<string, string>[],
): string | null {
  const binaryName = profiles.find((p) => {
    const lname = p.name.trim().toLowerCase();
    const named = TARGET_NAME_HINTS.some((h) => lname === h || lname.includes(h));
    return named && p.dataType === "boolean";
  });
  if (binaryName) return binaryName.name;

  const namedAnyType = profiles.find((p) => {
    const lname = p.name.trim().toLowerCase();
    return TARGET_NAME_HINTS.some((h) => lname === h || lname.includes(h));
  });
  if (namedAnyType && isBinaryColumn(namedAnyType.name, rows)) return namedAnyType.name;

  const anyBinary = profiles.find(
    (p) => p.dataType === "boolean" && p.distinctCount <= 2 && p.distinctCount >= 1,
  );
  return anyBinary ? anyBinary.name : null;
}

function isBinaryColumn(name: string, rows: Record<string, string>[]): boolean {
  const labels = new Set<number>();
  for (const r of rows) {
    const raw = r[name] ?? "";
    if (isNullToken(raw)) continue;
    labels.add(parseTargetValue(raw));
  }
  return labels.size === 2 || labels.size === 1;
}

/** Extrae el vector y (0/1) de la columna objetivo. */
export function extractTarget(rows: Record<string, string>[], targetColumn: string): number[] {
  return rows.map((r) => parseTargetValue(r[targetColumn] ?? ""));
}
