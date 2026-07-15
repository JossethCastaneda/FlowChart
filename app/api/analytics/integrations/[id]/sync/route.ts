import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiForbidden, apiNotFound } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { isWorkspaceAdmin } from "@/lib/analytics/rbac";
import { writeAuditLog } from "@/lib/analytics/audit";
import { AnalyticsAdapterFactory } from "@/lib/analytics/adapters/AnalyticsAdapterFactory";
import { normalizeIntegrationProvider } from "@/lib/analytics/project-scope";

// POST /api/analytics/integrations/:id/sync — dispara un sync manual (spec §28)
// Crea un SyncJob trazable y ejecuta el adaptador (idempotente vía upsert).
export const POST = withWorkspace(async (req, ctx) => {
  if (!(await isWorkspaceAdmin(ctx.workspaceId, ctx.userId))) {
    return apiForbidden("Solo administradores pueden ejecutar sincronizaciones");
  }
  const { id } = await ctx.params;

  let integration = await prisma.integration.findUnique({ where: { id } });
  
  // Si no se encuentra por ID (ej. el front envió "cari_ai" en lugar del cuid), buscar por provider normalizado
  if (!integration) {
    const allIntegrations = await prisma.integration.findMany({
      where: { workspaceId: ctx.workspaceId }
    });
    integration = allIntegrations.find(i => 
      i.provider === id || normalizeIntegrationProvider(i.provider) === id
    ) || null;
  }

  if (!integration || integration.workspaceId !== ctx.workspaceId) {
    return apiNotFound("Integración no encontrada");
  }
  const normProvider = normalizeIntegrationProvider(integration.provider);
  if (!normProvider || !["cari_ai", "botmaker"].includes(normProvider)) {
    return apiNotFound("La integración no es un proveedor de analítica soportado");
  }

  // Validación de scope de proyecto
  const projectId = req.nextUrl.searchParams.get("projectId") || null;
  const channelConfigId = req.nextUrl.searchParams.get("channelConfigId") || null;
  if (projectId) {
    const p = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: ctx.workspaceId }
    });
    if (!p) return apiForbidden("Proyecto no pertenece al workspace");
  }

  const days = parseInt(req.nextUrl.searchParams.get("days") || "7", 10) || 7;
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  const job = await prisma.syncJob.create({
    data: {
      workspaceId: ctx.workspaceId,
      projectId,
      channelConfigId,
      integrationId: integration.id,
      provider: integration.provider,
      reportType: "conversations+messages",
      status: "running",
      startDate,
      endDate,
    },
  });

  try {
    const adapter = AnalyticsAdapterFactory.getAdapter(normProvider);
    const convResult = await adapter.syncConversations(ctx.workspaceId, startDate, endDate);
    const msgResult = await adapter.syncMessages(ctx.workspaceId, startDate, endDate);
    const recordsInserted = convResult.recordsInserted + msgResult.recordsInserted;
    const ok = convResult.success && msgResult.success;

    // Actualizamos los registros de la ventana de sync con el projectId si corresponde (best-effort para "guarda scope en datos")
    if (projectId && ok) {
      await prisma.normalizedConversation.updateMany({
        where: { workspaceId: ctx.workspaceId, provider: normProvider, conversationStartedAt: { gte: startDate, lte: endDate } },
        data: { projectId }
      });
      await prisma.normalizedMessage.updateMany({
        where: { workspaceId: ctx.workspaceId, provider: normProvider, sentAt: { gte: startDate, lte: endDate } },
        data: { projectId }
      });
    }

    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status: ok ? "completed" : "failed",
        recordsInserted,
        errorMessage: ok ? null : convResult.error || msgResult.error || "Error de sync",
        finishedAt: new Date(),
      },
    });

    await writeAuditLog({
      workspaceId: ctx.workspaceId, userId: ctx.userId, action: "sync_manual", projectId,
      resourceType: "integration", resourceId: integration.id, metadata: { recordsInserted, days, projectId }
    });

    if (ok) {
      try {
        const rollupStart = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
        const rollupEnd = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
        await prisma.$executeRawUnsafe(`SELECT zefirus_compute_daily_rollups($1, $2)`, rollupStart, rollupEnd);
      } catch (err) {
        console.error("[Manual Sync] Fallo ejecutando rollup en Neon:", err);
      }
    }

    return apiSuccess({ jobId: job.id, recordsInserted, success: ok });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de sync";
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "failed", errorMessage: message, finishedAt: new Date() },
    });
    return apiSuccess({ jobId: job.id, recordsInserted: 0, success: false, error: message });
  }
});
