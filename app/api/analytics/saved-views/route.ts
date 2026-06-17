import { z } from "zod";
import { Prisma } from "@prisma/client";
import { withWorkspace } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

// Vistas guardadas del dashboard de Análisis de Resultados (combinaciones de
// filtros reutilizables). Compartidas del workspace (userId=null) o privadas.

// GET /api/analytics/saved-views[?projectId=...] — vistas del alcance (compartidas + propias).
export const GET = withWorkspace(async (req, ctx) => {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const views = await prisma.analyticsSavedView.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      projectId: projectId ?? null,
      OR: [{ userId: null }, { userId: ctx.userId }],
    },
    orderBy: { createdAt: "desc" },
  });
  return apiSuccess({ views });
});

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  projectId: z.string().optional(),
  filters: z.record(z.string(), z.unknown()),
  shared: z.boolean().optional(),
});

// POST /api/analytics/saved-views — crea una vista guardada.
export const POST = withWorkspace(async (req, ctx) => {
  const result = await validateBody(req, CreateSchema);
  if (!result.ok) return result.response;
  const { name, projectId, filters, shared } = result.data;
  const view = await prisma.analyticsSavedView.create({
    data: {
      workspaceId: ctx.workspaceId,
      projectId: projectId || null,
      userId: shared ? null : ctx.userId,
      name,
      filters: filters as Prisma.InputJsonValue,
    },
  });
  return apiSuccess({ view });
});

// DELETE /api/analytics/saved-views?id=... — elimina una vista del workspace.
export const DELETE = withWorkspace(async (req, ctx) => {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return apiError("Falta id", "BAD_REQUEST", 400);
  const existing = await prisma.analyticsSavedView.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
  if (!existing) return apiError("Vista no encontrada", "NOT_FOUND", 404);
  await prisma.analyticsSavedView.delete({ where: { id } });
  return apiSuccess({ deleted: true });
});
