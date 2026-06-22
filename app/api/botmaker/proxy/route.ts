import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiError, apiServerError } from "@/lib/api-response";
import { getBotmakerConnection } from "@/lib/botmaker";
import { z } from "zod";

const ProxySchema = z.object({
  method: z.enum(["GET", "POST", "PATCH", "DELETE", "PUT"]),
  path: z.string().min(1),
  body: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /api/botmaker/proxy
 *
 * Proxy genérico para la API de Botmaker.
 * El frontend envía { method, path, body? } y este handler lo reenvía
 * a la API de Botmaker usando las credenciales del workspace activo.
 *
 * ⚠️  Solo disponible para usuarios autenticados con workspace.
 */
export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  // Validate payload
  let parsed: z.infer<typeof ProxySchema>;
  try {
    parsed = ProxySchema.parse(await req.json());
  } catch (err: unknown) {
    return apiError("Petición inválida", "VALIDATION_ERROR", 400);
  }

  // Resolve Botmaker connection for this workspace
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) {
    return apiError(
      "Botmaker no está configurado. Ve a Configuración → Integraciones → Botmaker para agregar tu access-token.",
      "NOT_CONFIGURED",
      503
    );
  }

  const cleanPath = parsed.path.startsWith("/") ? parsed.path : `/${parsed.path}`;
  const url = `${conn.baseUrl}${cleanPath}`;

  const headers: Record<string, string> = {
    "access-token": conn.accessToken,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // Sanitize body — remove empty strings for cleaner API calls
  let bodyPayload: string | undefined;
  if (parsed.method !== "GET" && parsed.body && Object.keys(parsed.body).length > 0) {
    const cleaned = Object.fromEntries(
      Object.entries(parsed.body).filter(([, v]) => v !== "" && v !== null && v !== undefined)
    );
    if (Object.keys(cleaned).length > 0) {
      bodyPayload = JSON.stringify(cleaned);
    }
  }

  try {
    const upstreamRes = await fetch(url, {
      method: parsed.method,
      headers,
      body: bodyPayload,
      signal: AbortSignal.timeout(15_000),
    });

    let data: unknown;
    const ct = upstreamRes.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      data = await upstreamRes.json();
    } else {
      const text = await upstreamRes.text();
      data = text ? { raw: text } : { ok: true, httpStatus: upstreamRes.status };
    }

    return Response.json(data, { status: upstreamRes.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error de red";
    console.error("[BOTMAKER PROXY] Error calling:", url, message);
    return apiError(
      `Error al conectar con Botmaker: ${message}`,
      "UPSTREAM_ERROR",
      502
    );
  }
});

export const maxDuration = 30;
