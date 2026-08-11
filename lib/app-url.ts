import { env } from "@/lib/env";

/**
 * URL base canónica de la app — SIN espacios ni slash final.
 *
 * Defensa contra valores de entorno mal pegados: un espacio al inicio/fin (o en
 * medio) de NEXTAUTH_URL / NEXT_PUBLIC_APP_URL produce redirect_uri del tipo
 * "https://flowchart.lat /api/oauth/google/callback", que Google codifica como
 * `%20` y rechaza con redirect_uri_mismatch. Zod `.url()` valida pero NO
 * normaliza, así que el espacio sobrevive hasta aquí: lo removemos siempre.
 *
 * Precedencia: NEXTAUTH_URL → NEXT_PUBLIC_APP_URL → origin de la request.
 */
export function getAppBaseUrl(fallbackOrigin?: string): string {
  const raw = env.NEXTAUTH_URL || env.NEXT_PUBLIC_APP_URL || fallbackOrigin || "";
  // Una URL base nunca contiene espacios: se eliminan todos (no solo trim).
  return raw.replace(/\s+/g, "").replace(/\/+$/, "");
}
