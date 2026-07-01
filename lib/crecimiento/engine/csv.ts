/**
 * Parser CSV determinista RFC-4180 en TS puro (sin dependencias).
 *
 * Maneja: comillas y comas/saltos embebidos, comillas escapadas (""), CRLF/LF,
 * BOM, detección de encoding (UTF-8 con fallback windows-1252 para exports de
 * Excel en es-MX), sniff de delimitador (",", ";", "\t") y dedupe de headers.
 */

import type { ParsedCsv } from "./types";

const CANDIDATE_DELIMITERS = [",", ";", "\t"];

/** Decodifica bytes crudos detectando BOM, con fallback a windows-1252. */
export function decodeBytes(buf: ArrayBuffer): { text: string; encoding: string } {
  const bytes = new Uint8Array(buf);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: new TextDecoder("utf-8").decode(bytes.subarray(3)), encoding: "utf-8" };
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { text, encoding: "utf-8" };
  } catch {
    return { text: new TextDecoder("windows-1252").decode(bytes), encoding: "windows-1252" };
  }
}

function sniffDelimiter(firstLine: string): string {
  let best = ",";
  let bestCount = -1;
  for (const d of CANDIDATE_DELIMITERS) {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < firstLine.length; i++) {
      const c = firstLine[i];
      if (c === '"') inQuotes = !inQuotes;
      else if (!inQuotes && c === d) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

function dedupeHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((h) => {
    const base = h.trim() || "columna";
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}_${n + 1}`;
  });
}

/** Máquina de estados RFC-4180: texto → matriz de celdas string. */
function parseRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const n = text.length;
  let i = 0;
  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === delimiter) {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  row.push(field);
  rows.push(row);
  return rows;
}

export function parseCsv(input: ArrayBuffer | string): ParsedCsv {
  const decoded =
    typeof input === "string" ? { text: input, encoding: "utf-8" } : decodeBytes(input);
  const normalized = decoded.text.replace(/^﻿/, "");

  const firstBreak = normalized.search(/\r?\n/);
  const firstLine = firstBreak === -1 ? normalized : normalized.slice(0, firstBreak);
  const delimiter = sniffDelimiter(firstLine);

  const cells = parseRows(normalized, delimiter);
  const nonEmpty = cells.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length === 0) {
    return { headers: [], rows: [], delimiter, encoding: decoded.encoding };
  }

  const headers = dedupeHeaders(nonEmpty[0].map((h) => h.trim()));
  const rows: Record<string, string>[] = [];
  for (let r = 1; r < nonEmpty.length; r++) {
    const cellsRow = nonEmpty[r];
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = (cellsRow[c] ?? "").trim();
    }
    rows.push(obj);
  }
  return { headers, rows, delimiter, encoding: decoded.encoding };
}
