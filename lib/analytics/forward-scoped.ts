import { NextRequest } from "next/server";

type RouteHandler = (
  req: NextRequest,
  ctx?: { params: Promise<Record<string, string>> }
) => Promise<Response>;

/**
 * Reenvía la petición al handler global de analítica forzando el `projectId`
 * desde la RUTA validada (no desde el query). Centraliza el reuso para que las
 * rutas anidadas `/api/projects/[id]/analytics/*` compartan exactamente la
 * lógica de los endpoints globales sin duplicarla.
 *
 * Seguridad:
 *   - `projectId` se fija desde el path (sobrescribe cualquier `projectId` de query).
 *   - `workspaceId` y `clientId` de query se eliminan (nunca deben influir; el
 *     workspace real proviene de la sesión dentro del handler global).
 *   El handler global revalida que el proyecto pertenezca al workspace (404 si no).
 */
export function forwardScoped(
  handler: RouteHandler,
  req: NextRequest,
  projectId: string
): Promise<Response> {
  const url = new URL(req.url);
  url.searchParams.set("projectId", projectId);
  url.searchParams.delete("workspaceId");
  url.searchParams.delete("clientId");
  return handler(new NextRequest(url, { headers: req.headers }));
}
