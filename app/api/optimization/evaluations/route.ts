import { z } from "zod";
import prisma from "@/lib/prisma";
import { withWorkspace, withWorkspaceRole } from "@/lib/api-handler";
import { apiCreated, apiSuccess } from "@/lib/api-response";
import { validateBody, validateQuery } from "@/lib/validate";
import { CreateEvaluationSchema } from "@/lib/optimization/contracts";
import { createOptimizationEvaluation } from "@/lib/optimization/service";
import { optimizationErrorResponse } from "@/lib/optimization/http";

const QuerySchema = z.object({
  clientId: z.string().min(1).optional(),
  evaluationType: z.enum(["forecast_backtest", "shadow_policy"]).optional(),
  status: z.enum(["completed", "inconclusive"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const GET = withWorkspace(async (request, context) => {
  const query = validateQuery(request, QuerySchema);
  if (!query.ok) return query.response;
  const { limit, ...where } = query.data;
  return apiSuccess(await prisma.optimizationEvaluation.findMany({
    where: { workspaceId: context.workspaceId, ...where },
    orderBy: { evaluatedAt: "desc" },
    take: limit,
    include: { client: { select: { displayName: true } } },
  }));
});

export const POST = withWorkspaceRole(["OWNER", "ADMIN"])(async (request, context) => {
  const body = await validateBody(request, CreateEvaluationSchema);
  if (!body.ok) return body.response;
  try {
    return apiCreated(await createOptimizationEvaluation(context.workspaceId, context.userId, body.data));
  } catch (error) {
    return optimizationErrorResponse(error);
  }
});
