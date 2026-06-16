import prisma from "@/lib/prisma";
import { CariAiAnalyticsAdapter } from "@/lib/analytics/adapters/CariAiAnalyticsAdapter";
import { BotmakerAnalyticsAdapter } from "@/lib/analytics/adapters/BotmakerAnalyticsAdapter";
import { writeAuditLog } from "@/lib/analytics/audit";
import { evaluateAndPersistAlerts } from "@/lib/analytics/alerts/persist";

const SUPPORTED = ["cari", "botmaker"] as const;
const MAX_ATTEMPTS = 2;
const REPORT_TYPE = "conversations";
/** Solape de seguridad para no perder eventos en el borde de la ventana. */
const OVERLAP_MINUTES = 30;
/** Backfill por defecto si la integración nunca se sincronizó (días). */
const DEFAULT_BACKFILL_DAYS = 1;

interface SyncOutcome {
  integrationId: string;
  workspaceId: string;
  provider: string;
  success: boolean;
  inserted: number;
  failed: number;
  attempts: number;
  error?: string;
}

function adapterFor(provider: string) {
  if (provider === "cari") return new CariAiAnalyticsAdapter();
  if (provider === "botmaker") return new BotmakerAnalyticsAdapter();
  return null;
}

/**
 * Resuelve la ventana de sincronización usando un WATERMARK: el `endDate` del
 * último SyncJob COMPLETADO de esa integración (con un solape de seguridad). Si
 * nunca se sincronizó, hace backfill de `DEFAULT_BACKFILL_DAYS`.
 */
async function resolveWindow(integrationId: string, now: Date): Promise<{ startDate: Date; endDate: Date }> {
  const last = await prisma.syncJob.findFirst({
    where: { integrationId, status: "completed", reportType: REPORT_TYPE },
    orderBy: { endDate: "desc" },
    select: { endDate: true },
  });
  const endDate = now;
  if (last?.endDate) {
    const start = new Date(last.endDate.getTime() - OVERLAP_MINUTES * 60 * 1000);
    return { startDate: start, endDate };
  }
  const start = new Date(now.getTime() - DEFAULT_BACKFILL_DAYS * 24 * 60 * 60 * 1000);
  return { startDate: start, endDate };
}

/**
 * Sincronización programada para una integración: crea un SyncJob con ciclo de
 * vida completo (running → completed/failed), reintenta hasta MAX_ATTEMPTS y
 * registra contadores. Nunca expone credenciales en logs.
 */
async function syncIntegration(integ: { id: string; workspaceId: string; provider: string }, now: Date): Promise<SyncOutcome> {
  const { startDate, endDate } = await resolveWindow(integ.id, now);

  const job = await prisma.syncJob.create({
    data: {
      workspaceId: integ.workspaceId,
      integrationId: integ.id,
      provider: integ.provider,
      reportType: REPORT_TYPE,
      status: "running",
      startDate,
      endDate,
    },
  });

  let attempts = 0;
  let inserted = 0;
  let failed = 0;
  let lastError = "";

  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    try {
      const adapter = adapterFor(integ.provider);
      if (!adapter) {
        lastError = `Proveedor no soportado: ${integ.provider}`;
        break;
      }
      const res = await adapter.syncConversations(integ.workspaceId, startDate, endDate);
      inserted = res.recordsInserted;
      failed = res.recordsFailed;
      if (res.success) {
        await prisma.syncJob.update({
          where: { id: job.id },
          data: { status: "completed", recordsInserted: inserted, finishedAt: new Date(), errorMessage: null },
        });
        return { integrationId: integ.id, workspaceId: integ.workspaceId, provider: integ.provider, success: true, inserted, failed, attempts };
      }
      lastError = res.error || "sync sin éxito";
    } catch (e) {
      lastError = e instanceof Error ? e.message : "error desconocido";
    }
    // Pequeño respiro entre reintentos (no bloqueante en cron).
    if (attempts < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 500 * attempts));
  }

  await prisma.syncJob.update({
    where: { id: job.id },
    data: { status: "failed", recordsInserted: inserted, finishedAt: new Date(), errorMessage: lastError.slice(0, 500) },
  });
  return { integrationId: integ.id, workspaceId: integ.workspaceId, provider: integ.provider, success: false, inserted, failed, attempts, error: lastError };
}

/**
 * Punto de entrada del cron: itera integraciones activas, sincroniza cada una
 * con watermark + reintentos y, al finalizar, dispara la evaluación de alertas
 * por workspace (incluyendo alertas de sync fallida).
 */
export async function runScheduledSync(): Promise<SyncOutcome[]> {
  const now = new Date();
  const integrations = await prisma.integration.findMany({
    where: { connected: true, provider: { in: [...SUPPORTED] } },
    select: { id: true, workspaceId: true, provider: true },
  });

  const outcomes: SyncOutcome[] = [];
  for (const integ of integrations) {
    try {
      const outcome = await syncIntegration(integ, now);
      outcomes.push(outcome);

      await writeAuditLog({
        workspaceId: integ.workspaceId,
        action: "cron_sync",
        resourceType: "integration",
        resourceId: integ.id,
        metadata: {
          provider: integ.provider,
          success: outcome.success,
          inserted: outcome.inserted,
          failed: outcome.failed,
          attempts: outcome.attempts,
        },
      });
    } catch (e) {
      console.error("[cron-sync] fallo no controlado en integración", integ.id, e instanceof Error ? e.message : e);
      outcomes.push({ integrationId: integ.id, workspaceId: integ.workspaceId, provider: integ.provider, success: false, inserted: 0, failed: 0, attempts: 0, error: "uncaught" });
    }
  }

  // Evaluación de alertas por workspace (una vez por workspace afectado).
  const workspaces = [...new Set(outcomes.map((o) => o.workspaceId))];
  for (const workspaceId of workspaces) {
    const failure = outcomes.find((o) => o.workspaceId === workspaceId && !o.success);
    try {
      await evaluateAndPersistAlerts({
        workspaceId,
        syncFailure: failure ? { provider: failure.provider, error: failure.error || "sync fallida" } : null,
      });
    } catch (e) {
      console.error("[cron-sync] fallo evaluando alertas para workspace", workspaceId, e instanceof Error ? e.message : e);
    }
  }

  return outcomes;
}
