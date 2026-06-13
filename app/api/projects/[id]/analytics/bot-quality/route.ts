import { NextRequest } from "next/server";
import { GET as globalGET } from "@/app/api/analytics/bot-quality/route";
import { forwardScoped } from "@/lib/analytics/forward-scoped";

// GET /api/projects/[id]/analytics/bot-quality
// projectId proviene de la RUTA validada; delega al endpoint global (misma lógica, sin duplicar).
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return forwardScoped(globalGET, req, id);
}

export const maxDuration = 60;
