import { z } from "zod";
import { withWorkspace } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiForbidden } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { isWorkspaceAdmin } from "@/lib/analytics/rbac";
import { KPI_DEFINITIONS } from "@/lib/analytics/kpis/definitions";
import { resolveProjectScope } from "@/lib/analytics/project-scope.server";

// GET /api/analytics/kpi-targets — definiciones + overrides del workspace y proyecto
export const GET = withWorkspace(async (req, ctx) => {
  const scope = await resolveProjectScope(req, ctx.workspaceId);
  const where: any = { workspaceId: ctx.workspaceId };
  if (scope.projectId) {
    where.OR = [
      { projectId: null },
      { projectId: scope.projectId }
    ];
  } else {
    where.projectId = null;
  }
  
  const overrides = await prisma.analyticsKpiTarget.findMany({ where, orderBy: { projectId: 'asc' } });
  
  // Prioritize project override over workspace override
  const byKey = new Map();
  for (const o of overrides) {
    if (!byKey.has(o.kpiKey) || o.projectId) {
      byKey.set(o.kpiKey, o);
    }
  }

  const targets = Object.values(KPI_DEFINITIONS).map((def) => {
    const o = byKey.get(def.key);
    return {
      kpiKey: def.key,
      name: def.name,
      description: def.description,
      formula: def.formula,
      unit: def.unit,
      direction: o?.direction || def.direction,
      thresholds: def.thresholds || null,
      targetValue: o?.targetValue ?? def.thresholds?.good ?? null,
      warningThreshold: o?.warningThreshold ?? def.thresholds?.warning ?? null,
      criticalThreshold: o?.criticalThreshold ?? null,
      enabled: o?.enabled ?? true,
      overridden: !!o,
    };
  });

  return apiSuccess({ targets });
});

const TargetSchema = z.object({
  kpiKey: z.string().min(1),
  projectId: z.string().optional(),
  targetValue: z.number().nullable().optional(),
  warningThreshold: z.number().nullable().optional(),
  criticalThreshold: z.number().nullable().optional(),
  direction: z.enum(["higher_is_better", "lower_is_better", "neutral"]).optional(),
  enabled: z.boolean().optional(),
});

// POST /api/analytics/kpi-targets — upsert de meta/semáforo por workspace o proyecto
export const POST = withWorkspace(async (req, ctx) => {
  if (!(await isWorkspaceAdmin(ctx.workspaceId, ctx.userId))) {
    return apiForbidden("Solo administradores pueden configurar metas de KPI");
  }
  const result = await validateBody(req, TargetSchema);
  if (!result.ok) return result.response;
  const { kpiKey, projectId, targetValue, warningThreshold, criticalThreshold, direction, enabled } = result.data;

  const target = await prisma.analyticsKpiTarget.upsert({
    where: { workspaceId_kpiKey_projectId: { workspaceId: ctx.workspaceId, kpiKey, projectId: projectId || null } },
    create: {
      workspaceId: ctx.workspaceId, projectId: projectId || null, kpiKey,
      targetValue: targetValue ?? null, warningThreshold: warningThreshold ?? null,
      criticalThreshold: criticalThreshold ?? null,
      direction: direction || "higher_is_better", enabled: enabled ?? true,
    },
    update: { targetValue, warningThreshold, criticalThreshold, direction, enabled },
  });

  return apiSuccess(target);
});
