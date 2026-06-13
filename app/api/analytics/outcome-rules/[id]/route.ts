import { z } from "zod";
import { Prisma } from "@prisma/client";
import { withWorkspace } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiForbidden, apiNotFound } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { isWorkspaceAdmin } from "@/lib/analytics/rbac";
import { writeAuditLog } from "@/lib/analytics/audit";

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.number().int().optional(),
  enabled: z.boolean().optional(),
  conditions: z.array(z.object({ field: z.string(), operator: z.string(), value: z.any() })).optional(),
  outcome: z.string().optional(),
  resolvedBy: z.string().optional(),
  actions: z.object({ requiresReview: z.boolean().optional(), tag: z.string().optional() }).optional(),
  appliesToProvider: z.string().nullable().optional(),
});

async function ownRule(workspaceId: string, id: string) {
  const rule = await prisma.analyticsOutcomeRule.findUnique({ where: { id } });
  return rule && rule.workspaceId === workspaceId ? rule : null;
}

// PATCH /api/analytics/outcome-rules/:id (spec §32)
export const PATCH = withWorkspace(async (req, ctx) => {
  if (!(await isWorkspaceAdmin(ctx.workspaceId, ctx.userId))) {
    return apiForbidden("Solo administradores pueden editar reglas");
  }
  const { id } = await ctx.params;
  if (!(await ownRule(ctx.workspaceId, id))) return apiNotFound("Regla no encontrada");

  const result = await validateBody(req, PatchSchema);
  if (!result.ok) return result.response;
  const data = result.data;

  const updated = await prisma.analyticsOutcomeRule.update({
    where: { id },
    data: {
      ...data,
      conditions: data.conditions as Prisma.InputJsonValue | undefined,
      actions: data.actions as Prisma.InputJsonValue | undefined,
    },
  });

  await writeAuditLog({ workspaceId: ctx.workspaceId, userId: ctx.userId, action: "rule_update", resourceType: "outcome_rule", resourceId: id });
  return apiSuccess(updated);
});

// DELETE /api/analytics/outcome-rules/:id (spec §32)
export const DELETE = withWorkspace(async (_req, ctx) => {
  if (!(await isWorkspaceAdmin(ctx.workspaceId, ctx.userId))) {
    return apiForbidden("Solo administradores pueden eliminar reglas");
  }
  const { id } = await ctx.params;
  if (!(await ownRule(ctx.workspaceId, id))) return apiNotFound("Regla no encontrada");

  await prisma.analyticsOutcomeRule.delete({ where: { id } });
  await writeAuditLog({ workspaceId: ctx.workspaceId, userId: ctx.userId, action: "rule_delete", resourceType: "outcome_rule", resourceId: id });
  return apiSuccess({ deleted: true });
});
