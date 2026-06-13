import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { parsePagination } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";

// GET /api/analytics/audit-logs — bitácora de auditoría (spec §31, §36)
// Con `projectId`, solo se devuelven eventos del proyecto (resourceId = projectId).
export const GET = withWorkspace(async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const { page, pageSize, skip, take } = parsePagination(sp);
  const scopeRes = await scopeFromRequest(sp, ctx.workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);

  const where: Prisma.AnalyticsAuditLogWhereInput = { workspaceId: ctx.workspaceId };
  if (scopeRes.scope) where.resourceId = scopeRes.scope.projectId;

  const [total, logs] = await Promise.all([
    prisma.analyticsAuditLog.count({ where }),
    prisma.analyticsAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
  ]);

  return apiSuccess({
    logs,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});
