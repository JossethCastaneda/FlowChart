/**
 * lib/botmaker/aliases.ts
 *
 * Resolves Botmaker variable names to canonical field names using a
 * built-in default alias table and optionally DB-stored custom aliases.
 *
 * Scoped exclusively to the Bot Analytics / Portabilidad module.
 */

import type { ProductType } from "./normalize";

// ---------------------------------------------------------------------------
// Canonical field names
// ---------------------------------------------------------------------------

export type CanonicalField =
  | "name"
  | "last_name"
  | "full_name"
  | "phone_to_change"
  | "nip"
  | "nip_expiration_date"
  | "birth_date"
  | "birth_state"
  | "email"
  | "ocr_image_url"
  | "ga_cid"
  | "ig_post_id"
  | "from_name"
  | "zapier_status"
  | "zapier_response"
  | "flow_state"
  | "raw_nip_detected";

// ---------------------------------------------------------------------------
// Default alias table (from document spec + known variable names)
// ---------------------------------------------------------------------------

interface AliasEntry {
  canonical: CanonicalField;
  variableName: string;
  productType?: ProductType; // undefined = both
  priority: number; // lower = higher priority
}

const DEFAULT_ALIASES: AliasEntry[] = [
  // name
  { canonical: "name", variableName: "name", priority: 10 },
  { canonical: "name", variableName: "fromName", priority: 20 },

  // last_name
  { canonical: "last_name", variableName: "apellidos_usuario", priority: 10 },
  { canonical: "last_name", variableName: "apellido", priority: 20 },

  // full_name
  { canonical: "full_name", variableName: "Nombre_completo", priority: 10 },
  { canonical: "full_name", variableName: "nombre_completo", priority: 20 },

  // phone_to_change
  { canonical: "phone_to_change", variableName: "Numero a cambiar", priority: 10 },
  { canonical: "phone_to_change", variableName: "numero_a_cambiar", priority: 20 },
  { canonical: "phone_to_change", variableName: "telefono", priority: 30 },

  // nip
  { canonical: "nip", variableName: "nip", priority: 10 },
  { canonical: "nip", variableName: "NIP", priority: 20 },

  // nip_expiration_date
  { canonical: "nip_expiration_date", variableName: "Fecha_vigencia_nip", priority: 10 },
  { canonical: "nip_expiration_date", variableName: "Fecha Vigencia Nip", priority: 10 },
  { canonical: "nip_expiration_date", variableName: "fecha_vigencia_nip", priority: 20 },
  { canonical: "nip_expiration_date", variableName: "vigencia_nip", priority: 30 },

  // birth_date (pospago only)
  { canonical: "birth_date", variableName: "fecha_nacimiento", priority: 10, productType: "pospago" },
  { canonical: "birth_date", variableName: "Fecha_nacimiento", priority: 10, productType: "pospago" },
  { canonical: "birth_date", variableName: "Fecha de nacimiento", priority: 20, productType: "pospago" },

  // birth_state (pospago only)
  { canonical: "birth_state", variableName: "estado_nacimiento", priority: 10, productType: "pospago" },
  { canonical: "birth_state", variableName: "Estado_nacimiento", priority: 10, productType: "pospago" },
  { canonical: "birth_state", variableName: "Estado de nacimiento", priority: 20, productType: "pospago" },

  // email (pospago only)
  { canonical: "email", variableName: "correo", priority: 10, productType: "pospago" },
  { canonical: "email", variableName: "email", priority: 10, productType: "pospago" },
  { canonical: "email", variableName: "correo_electronico", priority: 20, productType: "pospago" },
  { canonical: "email", variableName: "Correo electrónico", priority: 20, productType: "pospago" },

  // ocr_image_url
  { canonical: "ocr_image_url", variableName: "ocr_image_url", priority: 10 },
  { canonical: "ocr_image_url", variableName: "imagenOCR", priority: 20 },

  // raw_nip_detected
  { canonical: "raw_nip_detected", variableName: "NIP_DETECTADO_RAW", priority: 10 },

  // ga_cid
  { canonical: "ga_cid", variableName: "ga_cid", priority: 10 },

  // ig_post_id
  { canonical: "ig_post_id", variableName: "igPostId", priority: 10 },

  // from_name
  { canonical: "from_name", variableName: "fromName", priority: 10 },
  { canonical: "from_name", variableName: "from_name", priority: 20 },

  // zapier_status
  { canonical: "zapier_status", variableName: "zapier_prepago_status", priority: 10 },
  { canonical: "zapier_status", variableName: "zapier_pospago_status", priority: 10 },

  // zapier_response
  { canonical: "zapier_response", variableName: "zapier_prepago_respuesta", priority: 10 },
  { canonical: "zapier_response", variableName: "zapier_pospago_respuesta", priority: 10 },

  // flow_state
  { canonical: "flow_state", variableName: "flow_state", priority: 10 },
  { canonical: "flow_state", variableName: "INSTRUCTIONS", priority: 20 },
];

// Build a fast lookup map: lowercase variableName → sorted AliasEntry[]
const ALIAS_MAP = new Map<string, AliasEntry[]>();
for (const entry of DEFAULT_ALIASES) {
  const key = entry.variableName.toLowerCase();
  if (!ALIAS_MAP.has(key)) ALIAS_MAP.set(key, []);
  ALIAS_MAP.get(key)!.push(entry);
}

// ---------------------------------------------------------------------------
// Resolve variable name → canonical field
// ---------------------------------------------------------------------------

export interface ResolvedField {
  canonical: CanonicalField;
  sourceVariableName: string;
  priority: number;
}

/**
 * Resolves a raw Botmaker variable name to its canonical field name.
 * Returns null if the variable is not in any alias table.
 *
 * @param variableName - The raw variable name from the session/event
 * @param productType  - Used to filter productType-specific aliases
 * @param customAliases - Optional extra aliases supplied at call time (e.g. per-bot overrides)
 */
export function resolveAlias(
  variableName: string,
  productType: ProductType = "unknown",
  customAliases: Array<{ canonicalField: string; variableName: string; productType?: string | null; priority: number }> = []
): ResolvedField | null {
  const key = variableName.toLowerCase();

  // 1. Check custom DB aliases first (lower priority number = higher priority)
  const customMatch = customAliases
    .filter(a => a.variableName.toLowerCase() === key)
    .filter(a => !a.productType || a.productType === productType || productType === "unknown")
    .sort((a, b) => a.priority - b.priority)[0];

  if (customMatch) {
    return {
      canonical: customMatch.canonicalField as CanonicalField,
      sourceVariableName: variableName,
      priority: customMatch.priority,
    };
  }

  // 2. Check built-in aliases
  const candidates = ALIAS_MAP.get(key) || [];
  const match = candidates
    .filter(a => !a.productType || a.productType === productType || productType === "unknown")
    .sort((a, b) => a.priority - b.priority)[0];

  if (match) {
    return {
      canonical: match.canonical,
      sourceVariableName: variableName,
      priority: match.priority,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Resolve a full variable bag to canonical fields
// ---------------------------------------------------------------------------

export interface CanonicalFieldSnapshot {
  canonical: CanonicalField;
  sourceVariableName: string;
  rawValue: string;
  isPresent: boolean;
  isValid: boolean;
  validationError?: string;
}

/**
 * Given a session's variable bag (Record<varName, {value}>),
 * returns a map of canonicalField → snapshot for all recognized variables.
 */
export function resolveVariableBag(
  variables: Record<string, { value: string }>,
  productType: ProductType = "unknown",
  customAliases: Array<{ canonicalField: string; variableName: string; productType?: string | null; priority: number }> = []
): Map<CanonicalField, CanonicalFieldSnapshot> {
  const result = new Map<CanonicalField, CanonicalFieldSnapshot>();

  for (const [varName, { value }] of Object.entries(variables)) {
    const resolved = resolveAlias(varName, productType, customAliases);
    if (!resolved) continue;

    // Only keep the highest-priority snapshot for each canonical field
    const existing = result.get(resolved.canonical);
    if (existing && existing.isPresent && !value) continue;
    if (existing && resolved.priority >= (existing as unknown as { priority: number }).priority) continue;

    const rawValue = value ?? "";
    const isPresent = rawValue.trim().length > 0;
    let isValid = isPresent;
    let validationError: string | undefined;

    // Basic validation
    if (isPresent) {
      if (resolved.canonical === "nip" && !/^\d{4,6}$/.test(rawValue.trim())) {
        isValid = false;
        validationError = "NIP debe ser numérico de 4-6 dígitos";
      } else if (resolved.canonical === "phone_to_change" && !/^\d{10}$/.test(rawValue.replace(/\D/g, ""))) {
        isValid = false;
        validationError = "Número de teléfono no es válido";
      } else if (resolved.canonical === "email" && !rawValue.includes("@")) {
        isValid = false;
        validationError = "Email inválido";
      }
    }

    const snapshot: CanonicalFieldSnapshot = {
      canonical: resolved.canonical,
      sourceVariableName: varName,
      rawValue,
      isPresent,
      isValid,
      ...(validationError ? { validationError } : {}),
    };

    // Attach priority for deduplication
    (snapshot as unknown as { priority: number }).priority = resolved.priority;
    result.set(resolved.canonical, snapshot);
  }

  return result;
}
