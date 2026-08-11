import { z } from "zod";
import prisma from "@/lib/prisma";
import { withWorkspace, withWorkspaceRole } from "@/lib/api-handler";
import { apiCreated, apiSuccess } from "@/lib/api-response";
import { validateBody, validateQuery } from "@/lib/validate";
import { CreateProposedActionSchema } from "@/lib/optimization/contracts";
import { createOptimizationProposedAction } from "@/lib/optimization/service";
import { optimizationErrorResponse } from "@/lib/optimization/http";

const QuerySchema = z.object({
  clientId: z.string().min(1).optional(),
  snapshotId: z.string().min(1).optional(),
  state: z.enum(["draft", "requires_review", "blocked", "expired"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export const GET = withWorkspace(async (req, ctx) => {
  const query = validateQuery(req, QuerySchema);
  if (!query.ok) return query.response;
  const { limit, ...where } = query.data;
  return apiSuccess(await prisma.optimizationProposedAction.findMany({
    where: { workspaceId: ctx.workspaceId, ...where },
    orderBy: { createdAt: "desc" },
    take: limit,
  }));
});

export const POST = withWorkspaceRole(["OWNER", "ADMIN"])(async (req, ctx) => {
  const body = await validateBody(req, CreateProposedActionSchema);
  if (!body.ok) return body.response;
  try {
    return apiCreated(await createOptimizationProposedAction(ctx.workspaceId, ctx.userId, body.data));
  } catch (error) {
    return optimizationErrorResponse(error);
  }
});
