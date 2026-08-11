import { z } from "zod";
import prisma from "@/lib/prisma";
import { withWorkspaceRole } from "@/lib/api-handler";
import { apiSuccess } from "@/lib/api-response";
import { validateQuery } from "@/lib/validate";

const QuerySchema = z.object({
  clientId: z.string().min(1).optional(),
  snapshotId: z.string().min(1).optional(),
  actionId: z.string().min(1).optional(),
  eventType: z.string().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export const GET = withWorkspaceRole(["OWNER", "ADMIN"])(async (req, ctx) => {
  const query = validateQuery(req, QuerySchema);
  if (!query.ok) return query.response;
  const { limit, ...where } = query.data;
  return apiSuccess(await prisma.optimizationAuditEvent.findMany({
    where: { workspaceId: ctx.workspaceId, ...where },
    orderBy: { createdAt: "desc" },
    take: limit,
  }));
});
