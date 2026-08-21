import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import prisma from "@/lib/prisma";
import { getPostInsightsBatch } from "@/lib/publisher/insights";
import { z } from "zod";

/**
 * POST /api/publisher/insights
 *
 * Métricas de varias publicaciones en una sola petición — Historial las muestra
 * en cada fila, así que pedirlas de a una serían cientos de llamadas HTTP.
 * El lote resuelve la caché en una consulta, reutiliza el token por plataforma
 * y acota la concurrencia contra la Graph API (ver lib/publisher/insights.ts).
 */
export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const parsed = await validateBody(
    req,
    z.object({ postIds: z.array(z.string()).min(1).max(200) })
  );
  if (!parsed.ok) return parsed.response;

  const posts = await prisma.scheduledPost.findMany({
    where: { id: { in: parsed.data.postIds }, workspaceId: ctx.workspaceId },
    select: { id: true, channels: true, status: true, externalIds: true },
  });

  const results = await getPostInsightsBatch(
    req,
    ctx.workspaceId,
    posts.map((p) => ({
      id: p.id,
      channels: p.channels,
      status: p.status,
      externalIds: p.externalIds as Record<string, string> | null,
    }))
  );

  return apiSuccess({ results });
});
