import { NextRequest } from "next/server";
import { GET as globalGET } from "@/app/api/analytics/saved-views/route";
import { forwardScoped } from "@/lib/analytics/forward-scoped";

// GET /api/projects/[id]/analytics/saved-views
// projectId desde la RUTA validada → lista las vistas del proyecto. La escritura
// (POST/DELETE) usa el endpoint global con projectId/id explícitos en la llamada
// (forwardScoped no preserva el cuerpo de la petición).
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return forwardScoped(globalGET, req, id);
}

export const maxDuration = 60;
