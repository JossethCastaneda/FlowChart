import { z } from "zod";
import prisma from "@/lib/prisma";
import { withWorkspace, withWorkspaceRole } from "@/lib/api-handler";
import { apiCreated, apiSuccess } from "@/lib/api-response";
import { validateBody, validateQuery } from "@/lib/validate";
import { CreateOptimizationClientSchema } from "@/lib/optimization/contracts";
import { createOptimizationClient } from "@/lib/optimization/service";
import { optimizationErrorResponse } from "@/lib/optimization/http";

const QuerySchema = z.object({
  environment: z.enum(["production", "test", "demo", "legacy"]).optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
});
export const GET = withWorkspace(async (req, ctx) => {
  const query = validateQuery(req, QuerySchema);
  if (!query.ok) return query.response;
  const clients = await prisma.optimizationClient.findMany({
    where: { workspaceId: ctx.workspaceId, ...query.data },
    include: {
      projects: { include: { project: { select: { id: true, name: true, client: true, status: true } } } },
      adAccounts: { select: { id: true, provider: true, externalAccountId: true, displayName: true, currency: true, timezone: true, attributionWindow: true, authorized: true } },
      objectives: { where: { status: "active" }, orderBy: { version: "desc" }, take: 1 },
      _count: { select: { snapshots: true, results: true, actions: true } },
    },
    orderBy: { displayName: "asc" },
  });
  return apiSuccess(clients);
});

export const POST = withWorkspaceRole(["OWNER", "ADMIN"])(async (req, ctx) => {
  const body = await validateBody(req, CreateOptimizationClientSchema);
  if (!body.ok) return body.response;
  try {
    return apiCreated(await createOptimizationClient(ctx.workspaceId, ctx.userId, body.data));
  } catch (error) {
    return optimizationErrorResponse(error);
  }
});
