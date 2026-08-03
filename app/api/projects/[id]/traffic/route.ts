import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getProjectTrafficSummary } from "@/lib/integrations/ga4";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/[id]/traffic?days=28
 *
 * Tráfico de landing (GA4) para la pestaña "Análisis de Tráfico" del proyecto.
 * Prioriza el ga4PropertyId vinculado al proyecto (googleSources) sobre el del workspace.
 */
export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;

  const project = await prisma.project.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { website: true, googleSources: true },
  });
  if (!project) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);

  const daysParam = new URL(req.url).searchParams.get("days");
  const days = daysParam ? parseInt(daysParam, 10) : 28;

  // Use the project-level GA4 property ID if configured, otherwise fall back to workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const googleSources = (project.googleSources as any) || {};
  const projectGa4PropertyId: string | undefined = googleSources.ga4PropertyId || undefined;

  const traffic = await getProjectTrafficSummary(ctx.workspaceId, days, projectGa4PropertyId);

  return apiSuccess({ ...traffic, website: project.website ?? null });
});
