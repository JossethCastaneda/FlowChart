import { z } from "zod";
import { withWorkspace } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiForbidden } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { isWorkspaceAdmin } from "@/lib/analytics/rbac";
import { KPI_DEFINITIONS } from "@/lib/analytics/kpis/definitions";

// GET /api/analytics/kpi-targets — definiciones + overrides del workspace (spec §12, §35)
export const GET = withWorkspace(async (_req, ctx) => {
  const overrides = await prisma.analyticsKpiTarget.findMany({ where: { workspaceId: ctx.workspaceId } });
  const byKey = new Map(overrides.map((o) => [o.kpiKey, o]));

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
  targetValue: z.number().nullable().optional(),
  warningThreshold: z.number().nullable().optional(),
  criticalThreshold: z.number().nullable().optional(),
  direction: z.enum(["higher_is_better", "lower_is_better", "neutral"]).optional(),
  enabled: z.boolean().optional(),
});

// POST /api/analytics/kpi-targets — upsert de meta/semáforo por workspace
export const POST = withWorkspace(async (req, ctx) => {
  if (!(await isWorkspaceAdmin(ctx.workspaceId, ctx.userId))) {
    return apiForbidden("Solo administradores pueden configurar metas de KPI");
  }
  const result = await validateBody(req, TargetSchema);
  if (!result.ok) return result.response;
  const { kpiKey, targetValue, warningThreshold, criticalThreshold, direction, enabled } = result.data;

  const target = await prisma.analyticsKpiTarget.upsert({
    where: { workspaceId_kpiKey: { workspaceId: ctx.workspaceId, kpiKey } },
    create: {
      workspaceId: ctx.workspaceId, kpiKey,
      targetValue: targetValue ?? null, warningThreshold: warningThreshold ?? null,
      criticalThreshold: criticalThreshold ?? null,
      direction: direction || "higher_is_better", enabled: enabled ?? true,
    },
    update: { targetValue, warningThreshold, criticalThreshold, direction, enabled },
  });

  return apiSuccess(target);
});
