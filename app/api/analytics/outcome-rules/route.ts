import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError, apiForbidden } from "@/lib/api-response";
import { isWorkspaceAdmin } from "@/lib/analytics/rbac";
import { writeAuditLog } from "@/lib/analytics/audit";
import { validateBody } from "@/lib/validate";
import { z } from "zod";

const RuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.number().int().optional(),
  projectId: z.string().optional(), // opcional porque puede ser regla global
  conditions: z.array(z.record(z.string(), z.any())).min(1),
  outcome: z.string().min(1),
  resolvedBy: z.string().min(1),
  actions: z.record(z.string(), z.any()).optional(),
  appliesToProvider: z.string().optional()
});

export const GET = withWorkspace(async (req, ctx) => {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const where: any = { workspaceId: ctx.workspaceId };
  if (projectId) {
    where.OR = [
      { projectId: null },
      { projectId: projectId }
    ];
  } else {
    where.projectId = null;
  }

  const rules = await prisma.analyticsOutcomeRule.findMany({ where, orderBy: { priority: 'asc' } });
  return apiSuccess(rules);
});

export const POST = withWorkspace(async (req, ctx) => {
  if (!(await isWorkspaceAdmin(ctx.workspaceId, ctx.userId))) {
    return apiForbidden("Solo administradores pueden crear reglas");
  }

  const result = await validateBody(req, RuleSchema);
  if (!result.ok) return result.response;

  const data = result.data;

  // Si envían projectId, validamos que pertenezca al workspace
  if (data.projectId) {
    const p = await prisma.project.findFirst({
      where: { id: data.projectId, workspaceId: ctx.workspaceId }
    });
    if (!p) return apiError("Proyecto no válido", "BAD_REQUEST", 400);
  }

  const rule = await prisma.analyticsOutcomeRule.create({
    data: {
      workspaceId: ctx.workspaceId,
      projectId: data.projectId || null,
      name: data.name,
      description: data.description || null,
      priority: data.priority ?? 100,
      conditions: data.conditions as unknown as Prisma.InputJsonValue,
      outcome: data.outcome,
      resolvedBy: data.resolvedBy,
      actions: (data.actions ? data.actions : Prisma.JsonNull) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput,
      appliesToProvider: data.appliesToProvider || null,
      createdBy: ctx.userId
    }
  });

  await writeAuditLog({
    workspaceId: ctx.workspaceId,
    projectId: data.projectId || null,
    userId: ctx.userId,
    action: "rule_create",
    resourceType: "outcome_rule",
    resourceId: rule.id,
    metadata: { ruleName: rule.name }
  });

  return apiSuccess(rule);
});

