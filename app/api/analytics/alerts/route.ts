import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";

export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const sp = req.nextUrl.searchParams;
  const resolution = await scopeFromRequest(sp, ctx.workspaceId);
  if (!resolution.ok) return apiError("Proyecto no válido o acceso denegado", "FORBIDDEN", 403);
  const scope = resolution.scope;
  
  const where: any = { workspaceId: ctx.workspaceId, resolved: false };
  if (scope?.projectId) {
    where.projectId = scope.projectId;
  }
  
  const alerts = await prisma.analyticsAlert.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return apiSuccess(alerts);
});

export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const body = await req.json();
  const alertId = body.alertId;
  const action = body.action;

  if (action === "resolve" && alertId) {
    const alert = await prisma.analyticsAlert.update({
      where: { id: alertId, workspaceId: ctx.workspaceId },
      data: { resolved: true }
    });
    return apiSuccess(alert);
  }

  return apiSuccess({ success: false });
});
