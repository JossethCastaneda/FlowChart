/* ════════════════════════════════════════════════════════════
   GET    /api/reportes/[id] — Obtener reporte completo
   DELETE /api/reportes/[id] — Eliminar reporte
   ════════════════════════════════════════════════════════════ */

import { NextRequest } from "next/server";
import { withWorkspace, type WorkspaceContext } from "@/lib/api-handler";
import { apiSuccess, apiError, apiForbidden } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export const GET = withWorkspace(async (_req: NextRequest, ctx: WorkspaceContext) => {
  const params = await ctx.params;
  const id = params.id;

  const report = await prisma.report.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    include: {
      project: { select: { name: true, alias: true, client: true, vertical: true } },
      createdBy: { select: { name: true, image: true } },
    },
  });

  if (!report) {
    return apiError("Reporte no encontrado", "NOT_FOUND", 404);
  }

  return apiSuccess(report);
});

export const DELETE = withWorkspace(async (_req: NextRequest, ctx: WorkspaceContext) => {
  if (!["OWNER", "ADMIN"].includes(ctx.role)) {
    return apiForbidden();
  }

  const params = await ctx.params;
  const id = params.id;

  await prisma.report.deleteMany({
    where: { id, workspaceId: ctx.workspaceId },
  });

  return apiSuccess({ deleted: true });
});
