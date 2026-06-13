import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { resolveProjectScope } from "@/lib/analytics/project-scope.server";
import { CHANNEL_LABELS, PROVIDER_LABELS } from "@/lib/analytics/project-scope";

// GET /api/projects/[id]/analytics/configured-channels
// Devuelve los canales (y proveedores) realmente configurados en el proyecto.
// projectId desde la ruta; verifica que el proyecto sea del workspace de la sesión.
export const GET = withWorkspace(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const scope = await resolveProjectScope(ctx.workspaceId, id);
  if (!scope) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);

  return apiSuccess({
    projectId: scope.projectId,
    channels: scope.channels.map((c) => ({ value: c, label: CHANNEL_LABELS[c] || c })),
    providers: scope.providers.map((p) => ({ value: p, label: PROVIDER_LABELS[p] || p })),
  });
});
