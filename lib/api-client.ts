/**
 * lib/api-client.ts
 * =====================================================================
 * Cliente HTTP único para el dashboard.
 *
 * Las rutas de Sodare responden en dos formatos:
 *   1. Sobre estándar  → { success: true, data: T }         (lib/api-response)
 *   2. Cuerpo plano    → T                                   (rutas legacy)
 *
 * Leer `res.json()` directo funciona con (2) y falla en silencio con (1):
 * `workspace.id` queda `undefined` y la pantalla se muestra vacía sin error.
 * `apiFetch` normaliza ambos y convierte los errores en excepciones con el
 * mensaje del servidor, para que React Query pueda mostrarlos.
 */

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type Envelope<T> = { success: boolean; data?: T; error?: string; code?: string };

function unwrap<T>(body: unknown): T {
  if (body && typeof body === "object" && "success" in body && "data" in body) {
    return (body as Envelope<T>).data as T;
  }
  return body as T;
}

/**
 * Sólo los cuerpos serializados a texto llevan Content-Type JSON.
 *
 * Con FormData el navegador tiene que poner él mismo
 * `multipart/form-data; boundary=…`; si se lo forzamos a JSON, el servidor no
 * puede parsear el multipart y toda subida de archivos falla.
 */
function isJsonBody(body: BodyInit | null | undefined): boolean {
  return typeof body === "string";
}

export async function apiFetch<T = unknown>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    credentials: "include",
    ...init,
    headers: {
      ...(isJsonBody(init?.body) ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Respuesta sin cuerpo JSON (error de red o HTML de error).
  }

  if (!res.ok) {
    const err = body as Envelope<T> | null;
    throw new ApiError(
      err?.error || `Error ${res.status} al llamar a ${input}`,
      res.status,
      err?.code,
    );
  }

  return unwrap<T>(body);
}

/** POST/PATCH/PUT/DELETE con cuerpo JSON serializado. */
export function apiSend<T = unknown>(
  input: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  return apiFetch<T>(input, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
