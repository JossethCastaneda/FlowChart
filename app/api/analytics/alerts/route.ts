import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError, apiForbidden } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";
import { isWorkspaceAdmin } from "@/lib/analytics/rbac";
import { buildAlertThresholdsFromTargets, type ScopedKpiTarget } from "@/lib/analytics/overrides";
import { evaluateAndPersistAlerts } from "@/lib/analytics/alerts/persist";
import { writeAuditLog } from "@/lib/analytics/audit";

// GET /api/analytics/alerts — alertas del workspace/proyecto.
// ?resolved=1 incluye también las resueltas; por defecto solo abiertas.
export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const sp = req.nextUrl.searchParams;
  const resolution = await scopeFromRequest(sp, ctx.workspaceId);
  if (!resolution.ok) return apiError("Proyecto no válido o acceso denegado", "FORBIDDEN", 403);
  const scope = resolution.scope;

  const where: { workspaceId: string; resolved?: boolean; projectId?: string } = {
    workspaceId: ctx.workspaceId,
  };
  if (sp.get("resolved") !== "1") where.resolved = false;
  if (scope?.projectId) where.projectId = scope.projectId;

  const alerts = await prisma.analyticsAlert.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return apiSuccess(alerts);
});

// POST /api/analytics/alerts
//   { action: "resolve", alertId }   — marca una alerta como resuelta
//   { action: "evaluate" }           — (admin) evalúa KPIs y genera alertas con
//                                       umbrales resueltos proyecto > workspace > default
export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  if (action === "resolve" && body?.alertId) {
    const alert = await prisma.analyticsAlert.updateMany({
      where: { id: body.alertId, workspaceId: ctx.workspaceId },
      data: { resolved: true },
    });
    if (alert.count === 0) return apiError("Alerta no encontrada", "NOT_FOUND", 404);
    await writeAuditLog({
      workspaceId: ctx.workspaceId, userId: ctx.userId,
      action: "alert_resolve", resourceType: "alert", resourceId: body.alertId,
    });
    return apiSuccess({ resolved: true });
  }

  if (action === "evaluate") {
    if (!(await isWorkspaceAdmin(ctx.workspaceId, ctx.userId))) {
      return apiForbidden("Solo administradores pueden forzar la evaluación de alertas");
    }
    const sp = req.nextUrl.searchParams;
    const resolution = await scopeFromRequest(sp, ctx.workspaceId);
    if (!resolution.ok) return apiError("Proyecto no válido o acceso denegado", "FORBIDDEN", 403);
    const projectId = resolution.scope?.projectId ?? null;

    // Umbrales resueltos: proyecto > workspace > default.
    const rows = await prisma.analyticsKpiTarget.findMany({
      where: { workspaceId: ctx.workspaceId, ...(projectId ? { OR: [{ projectId }, { projectId: null }] } : { projectId: null }) },
    });
    const thresholds = buildAlertThresholdsFromTargets(rows as ScopedKpiTarget[], projectId);

    const candidates = await evaluateAndPersistAlerts({ workspaceId: ctx.workspaceId, projectId, thresholds });
    await writeAuditLog({
      workspaceId: ctx.workspaceId, projectId, userId: ctx.userId,
      action: "alerts_evaluate", resourceType: "alert", metadata: { generated: candidates.length },
    });
    return apiSuccess({ evaluated: true, candidates: candidates.length });
  }

  return apiError("Acción no soportada", "BAD_REQUEST", 400);
});
