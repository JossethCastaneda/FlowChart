import { createHash } from "crypto";

// ============================================================================
// Privacidad / PII (spec §5.2, §36)
// Identificadores sensibles (teléfono, email, documento) NUNCA se guardan en
// claro en las tablas normalizadas: se guardan hasheados (SHA-256 con sal por
// workspace) y solo se muestran enmascarados, salvo permiso explícito
// `conversations.view_sensitive`.
// ============================================================================

// Fallback NO secreto para desarrollo/tests. En staging/producción la sal DEBE
// venir de ANALYTICS_PII_SALT (ver runbook); de lo contrario el hash de PII es
// predecible. Este string es un placeholder público a propósito.
const DEV_FALLBACK_SALT = "sodare-analytics-dev-only-not-a-secret";
const PII_SALT = process.env.ANALYTICS_PII_SALT || DEV_FALLBACK_SALT;

if (PII_SALT === DEV_FALLBACK_SALT && process.env.NODE_ENV === "production") {
  console.warn(
    "[analytics/privacy] ANALYTICS_PII_SALT no configurada — usando fallback de desarrollo. " +
      "Configúrala en staging/producción para que el hash de PII no sea predecible."
  );
}

/** Hash determinístico y salado de un identificador sensible. Vacío => "". */
export function hashPII(value: string | null | undefined, workspaceId = ""): string {
  if (!value) return "";
  return createHash("sha256").update(`${PII_SALT}:${workspaceId}:${value}`).digest("hex");
}

/** Enmascara un teléfono dejando solo los últimos 4 dígitos. */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "••••";
  return `••••••${digits.slice(-4)}`;
}

/** Enmascara un email: j••••@dominio.com */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "••••";
  const [user, domain] = email.split("@");
  const head = user.slice(0, 1);
  return `${head}••••@${domain}`;
}

/** Enmascara un identificador genérico (cliente, documento) dejando prefijo/sufijo. */
export function maskIdentifier(value: string | null | undefined): string {
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}

/**
 * Redacta posibles PII (teléfonos, emails) embebidos en texto libre antes de
 * persistir o exportar. Conservador: prioriza no filtrar sobre conservar texto.
 */
export function redactText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[telefono]");
}
