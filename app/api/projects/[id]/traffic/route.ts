import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getProjectTrafficSummary } from "@/lib/integrations/ga4";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/[id]/traffic?days=28
 *
 * Tráfico de landing (GA4) para la pestaña "Análisis de Tráfico" del proyecto
 * (Plataforma Analítica = Google). Verifica ANTES la propiedad multi-tenant del
 * proyecto. Degrada con gracia: si Google/GA4 no está conectado devuelve
 * `connected:false` y la UI muestra el estado "Conecta GA4".
 */
export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;

  const project = await prisma.project.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { website: true },
  });
  if (!project) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);

  const daysParam = new URL(req.url).searchParams.get("days");
  const days = daysParam ? parseInt(daysParam, 10) : 28;

  const traffic = await getProjectTrafficSummary(ctx.workspaceId, days);

  return apiSuccess({ ...traffic, website: project.website ?? null });
});
