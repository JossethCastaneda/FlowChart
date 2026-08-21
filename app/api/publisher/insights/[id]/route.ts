import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiNotFound } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getOrFetchPostInsights } from "@/lib/publisher/insights";

/**
 * GET /api/publisher/insights/[id]
 *
 * Fetch perezoso de métricas reales (Alcance/Interacciones/Engagement) para
 * una publicación del Historial — se llama solo al expandir la fila en el
 * cliente, no en cada carga de la tabla, y el resultado se cachea 6h
 * (MetaAnalyticsCache) para no golpear la Graph API repetidamente.
 */
export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;

  const post = await prisma.scheduledPost.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true, channels: true, status: true, externalIds: true },
  });
  if (!post) return apiNotFound("Post no encontrado");

  const result = await getOrFetchPostInsights(req, ctx.workspaceId, {
    id: post.id,
    channels: post.channels,
    status: post.status,
    externalIds: post.externalIds as Record<string, string> | null,
  });

  return apiSuccess(result);
});
