import { z } from "zod";
import prisma from "@/lib/prisma";
import { withWorkspace, withWorkspaceRole } from "@/lib/api-handler";
import { apiCreated, apiSuccess } from "@/lib/api-response";
import { validateBody, validateQuery } from "@/lib/validate";
import { CreateSnapshotSchema } from "@/lib/optimization/contracts";
import { createOptimizationSnapshot } from "@/lib/optimization/service";
import { optimizationErrorResponse } from "@/lib/optimization/http";

const QuerySchema = z.object({
  clientId: z.string().min(1).optional(),
  status: z.enum(["valid", "degraded", "invalid"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export const GET = withWorkspace(async (req, ctx) => {
  const query = validateQuery(req, QuerySchema);
  if (!query.ok) return query.response;
  const { limit, ...where } = query.data;
  const snapshots = await prisma.optimizationSnapshot.findMany({
    where: { workspaceId: ctx.workspaceId, ...where },
    orderBy: { cutoffAt: "desc" },
    take: limit,
    select: {
      id: true,
      clientId: true,
      schemaVersion: true,
      contentHash: true,
      periodStart: true,
      periodEnd: true,
      cutoffAt: true,
      currency: true,
      timezone: true,
      freshness: true,
      dataQuality: true,
      modelVersions: true,
      status: true,
      createdAt: true,
    },
  });
  return apiSuccess(snapshots);
});

export const POST = withWorkspaceRole(["OWNER", "ADMIN"])(async (req, ctx) => {
  const body = await validateBody(req, CreateSnapshotSchema);
  if (!body.ok) return body.response;
  try {
    return apiCreated(await createOptimizationSnapshot(ctx.workspaceId, ctx.userId, body.data));
  } catch (error) {
    return optimizationErrorResponse(error);
  }
});
