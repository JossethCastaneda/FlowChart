import { z } from "zod";
import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiForbidden, apiNotFound, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { isWorkspaceAdmin } from "@/lib/analytics/rbac";
import { writeAuditLog } from "@/lib/analytics/audit";
import { AnalyticsAdapterFactory } from "@/lib/analytics/adapters/AnalyticsAdapterFactory";
import { resolveProjectScope } from "@/lib/analytics/project-scope.server";
import { INTEGRATION_TO_NORMALIZED_PROVIDER, normalizeChannelName } from "@/lib/analytics/project-scope";

// POST /api/projects/[id]/analytics/sync
// Sync manual ACOTADO al proyecto. Solo consulta integraciones vinculadas al
// proyecto (crmIntegrationIds) y del workspace de la sesión. Reutiliza los
// adapters globales (idempotentes vía upsert por providerConversationId).
//
// Validaciones: ownership de proyecto, permiso (admin = projects.analytics.sync),
// channel ∈ canales configurados, provider ∈ proveedores del proyecto, rango válido.
//
// NOTA (límite real): los adapters sincronizan a nivel workspace+proveedor (las
// tablas normalizadas aún no llevan projectId). El `channel` se valida pero el
// adapter no filtra por canal todavía; ver plan de migración aditiva en el reporte.

const SyncBody = z.object({
  channel: z.string().optional(),
  provider: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  reportTypes: z.array(z.string()).optional(),
});

const MAX_SPAN_MS = 180 * 24 * 60 * 60 * 1000;

export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const { id: projectId } = await ctx.params;

  // Permiso: configurar/sincronizar el análisis del proyecto = admin del workspace.
  if (!(await isWorkspaceAdmin(ctx.workspaceId, ctx.userId))) {
    return apiForbidden("No tienes permiso para sincronizar el análisis de este proyecto");
  }

  // Ownership multi-tenant + alcance (proveedores/canales configurados).
  const scope = await resolveProjectScope(ctx.workspaceId, projectId);
  if (!scope) return apiNotFound("Proyecto no encontrado");

  let body: z.infer<typeof SyncBody> = {};
  try {
    const raw = await req.json().catch(() => ({}));
    body = SyncBody.parse(raw ?? {});
  } catch {
    return apiError("Cuerpo de solicitud inválido", "VALIDATION_ERROR", 400);
  }

  // Canal: debe estar configurado en el proyecto.
  if (body.channel) {
    const canonical = normalizeChannelName(body.channel);
    if (!canonical || !scope.channels.includes(canonical)) {
      return apiError("El canal no está configurado en este proyecto", "CHANNEL_NOT_CONFIGURED", 400);
    }
  }

  // Proveedor: debe pertenecer al proyecto.
  if (body.provider && !scope.providers.includes(body.provider)) {
    return apiError("El proveedor no está configurado en este proyecto", "PROVIDER_NOT_CONFIGURED", 400);
  }

  // Rango de fechas.
  const endDate = body.endDate ? new Date(body.endDate) : new Date();
  const startDate = body.startDate
    ? new Date(body.startDate)
    : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
    return apiError("Rango de fechas inválido", "INVALID_DATE_RANGE", 400);
  }
  if (endDate.getTime() - startDate.getTime() > MAX_SPAN_MS) {
    return apiError("El rango no puede exceder 180 días", "DATE_RANGE_TOO_LARGE", 400);
  }

  // Integraciones vinculadas al proyecto (y del workspace), opcionalmente filtradas por provider.
  const ids = scope.providers.length
    ? (await prisma.project.findUnique({ where: { id: projectId }, select: { crmIntegrationId: true, crmIntegrationIds: true } }))
    : null;
  const integrationIds = ids
    ? (ids.crmIntegrationIds.length ? ids.crmIntegrationIds : ids.crmIntegrationId ? [ids.crmIntegrationId] : [])
    : [];

  const integrations = integrationIds.length
    ? await prisma.integration.findMany({
        where: { id: { in: integrationIds }, workspaceId: ctx.workspaceId },
        select: { id: true, provider: true },
      })
    : [];

  // Solo proveedores con adaptador analítico, y respetando el filtro provider.
  const targets = integrations.filter((i) => {
    const normalized = INTEGRATION_TO_NORMALIZED_PROVIDER[i.provider];
    if (!normalized) return false;
    return !body.provider || normalized === body.provider;
  });

  if (targets.length === 0) {
    return apiError("El proyecto no tiene integraciones de analítica activas", "NO_INTEGRATIONS", 400);
  }

  const reportType = body.reportTypes?.join(",") || "conversations+messages";
  const results: { integrationId: string; provider: string; jobId: string; recordsInserted: number; success: boolean; error?: string }[] = [];

  for (const integ of targets) {
    const normalized = INTEGRATION_TO_NORMALIZED_PROVIDER[integ.provider];
    const job = await prisma.syncJob.create({
      data: {
        workspaceId: ctx.workspaceId,
        integrationId: integ.id,
        provider: normalized,
        reportType,
        status: "running",
        startDate,
        endDate,
      },
    });

    try {
      const adapter = AnalyticsAdapterFactory.getAdapter(normalized);
      const conv = await adapter.syncConversations(ctx.workspaceId, startDate, endDate);
      const msg = await adapter.syncMessages(ctx.workspaceId, startDate, endDate);
      const recordsInserted = conv.recordsInserted + msg.recordsInserted;
      const ok = conv.success && msg.success;
      await prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: ok ? "completed" : "failed",
          recordsInserted,
          errorMessage: ok ? null : conv.error || msg.error || "Error de sync",
          finishedAt: new Date(),
        },
      });
      results.push({ integrationId: integ.id, provider: normalized, jobId: job.id, recordsInserted, success: ok, error: ok ? undefined : conv.error || msg.error });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error de sync";
      await prisma.syncJob.update({
        where: { id: job.id },
        data: { status: "failed", errorMessage: message, finishedAt: new Date() },
      });
      results.push({ integrationId: integ.id, provider: normalized, jobId: job.id, recordsInserted: 0, success: false, error: message });
    }
  }

  await writeAuditLog({
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    action: "sync_manual",
    resourceType: "project",
    resourceId: projectId,
    metadata: {
      projectId,
      clientId: undefined,
      channel: body.channel ?? null,
      provider: body.provider ?? null,
      reportType,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      jobs: results.map((r) => r.jobId),
    },
  });

  return apiSuccess({ projectId, jobs: results });
});

export const maxDuration = 60;
