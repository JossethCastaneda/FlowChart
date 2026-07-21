import { NextRequest } from "next/server";
import { z } from "zod";
import { withWorkspaceRole } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import { logger } from "@/lib/logger";

/**
 * POST /api/workspace/integrations/test-crm
 *
 * Prueba la conexión a un CRM personalizado (URL + token provistos por el usuario).
 * Hace un GET liviano con el token y reporta si la API responde.
 *
 * SEGURIDAD: el apiUrl lo controla el usuario, así que esto es una superficie SSRF.
 * Mitigaciones: solo OWNER/ADMIN, solo https, se bloquean hosts loopback/privados/
 * link-local (incl. metadata de la nube), sin seguir redirects, con timeout corto.
 */

const TestSchema = z.object({
  apiUrl: z.string().url().max(500),
  token: z.string().min(1).max(4000),
});

/** Bloquea hosts internos por nombre/IP (guard SSRF de mejor esfuerzo, sin DNS). */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) return true;
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  // IPv4 privados / loopback / link-local (incl. 169.254.169.254 de metadata cloud)
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local + metadata
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

export const POST = withWorkspaceRole(["OWNER", "ADMIN"])(async (req: NextRequest) => {
  const parsed = await validateBody(req, TestSchema);
  if (!parsed.ok) return parsed.response;
  const { apiUrl, token } = parsed.data;

  let url: URL;
  try {
    url = new URL(apiUrl);
  } catch {
    return apiError("URL inválida", "INVALID_URL", 400);
  }
  if (url.protocol !== "https:") {
    return apiError("La URL del CRM debe usar https", "INSECURE_URL", 400);
  }
  if (isBlockedHost(url.hostname)) {
    return apiError("Host no permitido", "BLOCKED_HOST", 400);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      redirect: "manual", // no seguir redirects (evita rebote a hosts internos)
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // 2xx = ok; 401/403 = alcanzable pero token/permiso — igual confirma conectividad.
    if (res.ok) return apiSuccess({ success: true });
    if (res.status === 401 || res.status === 403) {
      return apiError("La API respondió pero rechazó el token (verifica el token/permisos).", "CRM_AUTH", 400);
    }
    return apiError(`La API respondió con estado ${res.status}.`, "CRM_ERROR", 400);
  } catch (err) {
    logger.warn("[TEST-CRM] fetch failed", { host: url.hostname, error: err instanceof Error ? err.message : String(err) });
    return apiError("No se pudo conectar con la API del CRM.", "CRM_UNREACHABLE", 400);
  }
});
