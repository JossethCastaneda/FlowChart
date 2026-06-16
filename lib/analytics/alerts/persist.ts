// ============================================================================
// Persistencia de alertas analíticas (spec §30 / goal §12). Toma los candidatos
// del motor puro (./engine) y los inserta en AnalyticsAlert con DEDUP: no crea
// una nueva alerta del mismo tipo+proyecto si ya existe una sin resolver.
// Nunca debe tumbar el flujo de ingesta: errores se loguean y se continúa.
// ============================================================================

import prisma from "@/lib/prisma";
import { computeKpis, type KpiConversation } from "@/lib/analytics/kpis/engine";
import { evaluateAlerts, type AlertCandidate, type AlertContext } from "./engine";

const KPI_SELECT = {
  status: true,
  outcome: true,
  resolvedBy: true,
  wasBotOnly: true,
  wasHandoff: true,
  totalUserMessages: true,
  totalFallbacks: true,
  csatScore: true,
  npsScore: true,
  firstResponseTimeSeconds: true,
  handleTimeSeconds: true,
  waitingTimeSeconds: true,
  customerId: true,
  customerIdentifierHash: true,
  provider: true,
} as const;

/**
 * Inserta los candidatos respetando dedup por (workspaceId, projectId, type)
 * sobre alertas NO resueltas. Devuelve cuántas alertas nuevas se crearon.
 */
export async function persistAlerts(
  workspaceId: string,
  projectId: string | null,
  candidates: AlertCandidate[]
): Promise<number> {
  let created = 0;
  for (const c of candidates) {
    try {
      const existing = await prisma.analyticsAlert.findFirst({
        where: { workspaceId, projectId, type: c.type, resolved: false },
        select: { id: true },
      });
      if (existing) continue; // ya hay una alerta abierta de este tipo
      await prisma.analyticsAlert.create({
        data: {
          workspaceId,
          projectId,
          type: c.type,
          severity: c.severity,
          title: c.title,
          message: c.message,
          metricValue: c.metricValue ?? null,
          thresholdValue: c.thresholdValue ?? null,
        },
      });
      created++;
    } catch (e) {
      console.error("[alerts] no se pudo persistir alerta", c.type, e instanceof Error ? e.message : e);
    }
  }
  return created;
}

export interface EvaluateScope {
  workspaceId: string;
  projectId?: string | null;
  /** Ventana de evaluación en días (default 7). */
  windowDays?: number;
  /** Override de umbrales (project > workspace > default lo resuelve el caller). */
  thresholds?: AlertContext["thresholds"];
  /** Señal de sync fallida proveniente del cron. */
  syncFailure?: AlertContext["syncFailure"];
}

/**
 * Carga datos reales del workspace/proyecto, computa KPIs del periodo y del
 * periodo anterior (para caída de volumen), cuenta issues críticos de calidad
 * de datos y persiste las alertas resultantes. Devuelve los candidatos evaluados.
 */
export async function evaluateAndPersistAlerts(scope: EvaluateScope): Promise<AlertCandidate[]> {
  const { workspaceId } = scope;
  const projectId = scope.projectId ?? null;
  const windowDays = scope.windowDays ?? 7;

  const now = new Date();
  const periodStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const prevStart = new Date(now.getTime() - 2 * windowDays * 24 * 60 * 60 * 1000);

  const baseWhere = projectId ? { workspaceId, projectId } : { workspaceId };

  const [current, previousCount, dqCritical, campaignErrors, syncFailed] = await Promise.all([
    prisma.normalizedConversation.findMany({
      where: { ...baseWhere, conversationStartedAt: { gte: periodStart, lte: now } },
      select: KPI_SELECT,
    }),
    prisma.normalizedConversation.count({
      where: { ...baseWhere, conversationStartedAt: { gte: prevStart, lt: periodStart } },
    }),
    prisma.dataQualityIssue.count({
      where: { ...baseWhere, severity: "critical", resolved: false },
    }),
    prisma.normalizedMessage.count({
      where: { ...baseWhere, isError: true, sentAt: { gte: periodStart, lte: now } },
    }),
    scope.syncFailure
      ? Promise.resolve(null)
      : prisma.syncJob.findFirst({
          where: { ...baseWhere, status: "failed", startedAt: { gte: periodStart } },
          orderBy: { startedAt: "desc" },
          select: { provider: true, errorMessage: true },
        }),
  ]);

  const kpis = computeKpis({ conversations: current as KpiConversation[] });

  const candidates = evaluateAlerts({
    kpis,
    previousVolume: previousCount,
    dataQualityCriticalCount: dqCritical,
    campaignErrorCount: campaignErrors,
    syncFailure:
      scope.syncFailure ??
      (syncFailed ? { provider: syncFailed.provider, error: syncFailed.errorMessage || "desconocido" } : null),
    thresholds: scope.thresholds,
  });

  await persistAlerts(workspaceId, projectId, candidates);
  return candidates;
}
