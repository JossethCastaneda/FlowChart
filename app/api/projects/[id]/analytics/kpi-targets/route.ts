import { NextRequest } from "next/server";
import { GET as globalGET } from "@/app/api/analytics/kpi-targets/route";
import { forwardScoped } from "@/lib/analytics/forward-scoped";

// GET /api/projects/[id]/analytics/kpi-targets
// projectId desde la RUTA validada → delega al endpoint global (mismas metas
// con override de proyecto). La escritura (POST) va al endpoint global con el
// projectId en el body (forwardScoped no preserva el cuerpo).
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return forwardScoped(globalGET, req, id);
}

export const maxDuration = 60;
