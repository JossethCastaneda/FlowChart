import { createHash } from "node:crypto";
import type { JsonValue } from "./contracts";

function normalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(normalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, normalize(child)])
    );
  }
  return value;
}
export function canonicalJson(value: JsonValue): string {
  return JSON.stringify(normalize(value));
}

export function hashCanonicalJson(value: JsonValue): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}
