import { z } from "zod";
import prisma from "@/lib/prisma";
import { withWorkspace, withWorkspaceRole } from "@/lib/api-handler";
import { apiCreated, apiSuccess } from "@/lib/api-response";
import { validateBody, validateQuery } from "@/lib/validate";
import { CreateObjectiveSchema } from "@/lib/optimization/contracts";
import { createOptimizationObjective } from "@/lib/optimization/service";
import { optimizationErrorResponse } from "@/lib/optimization/http";

const QuerySchema = z.object({
  clientId: z.string().min(1).optional(),
  status: z.enum(["draft", "active", "retired"]).optional(),
});
export const GET = withWorkspace(async (req, ctx) => {
  const query = validateQuery(req, QuerySchema);
  if (!query.ok) return query.response;
  const objectives = await prisma.optimizationObjective.findMany({
    where: { workspaceId: ctx.workspaceId, ...query.data },
    orderBy: [{ clientId: "asc" }, { version: "desc" }],
  });
  return apiSuccess(objectives);
});

export const POST = withWorkspaceRole(["OWNER", "ADMIN"])(async (req, ctx) => {
  const body = await validateBody(req, CreateObjectiveSchema);
  if (!body.ok) return body.response;
  try {
    return apiCreated(await createOptimizationObjective(ctx.workspaceId, ctx.userId, body.data));
  } catch (error) {
    return optimizationErrorResponse(error);
  }
});
