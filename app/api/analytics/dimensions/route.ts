import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { parseFilters, buildConversationWhere } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";

export const GET = withAuth(async (req, ctx) => {
  const workspaceId = await getActiveWorkspaceId(ctx.userId);
  if (!workspaceId) return apiError("Workspace no encontrado", "NO_WORKSPACE", 400);

  const sp = req.nextUrl.searchParams;
  const dimension = sp.get("dimension");
  
  if (!dimension || !["botId", "agentId", "campaignId", "serviceId", "queueName", "skillName"].includes(dimension)) {
    return apiError("Dimensión inválida", "BAD_REQUEST", 400);
  }

  const filters = parseFilters(sp);
  const scopeRes = await scopeFromRequest(sp, workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);

  const where = buildConversationWhere(workspaceId, filters, scopeRes.scope);

  const distinctValues = await prisma.normalizedConversation.findMany({
    where,
    distinct: [dimension as any],
    select: { [dimension]: true },
  });

  const options = distinctValues
    .map((r) => r[dimension as keyof typeof r] as string)
    .filter((v) => typeof v === "string" && v.length > 0)
    .sort();

  return apiSuccess(options);
});
