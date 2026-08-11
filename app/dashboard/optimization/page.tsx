"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock3,
  Database,
  Gauge,
  Loader2,
  Microscope,
  RefreshCw,
  ShieldCheck,
  Target,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { Tag, type TagVariant } from "@/components/ui/Tag";
import type { OptimizationOverview, OptimizationReadiness } from "@/lib/optimization/overview";

type ApiResponse =
  | { success: true; data: OptimizationOverview }
  | { success: false; error: string };

async function fetchOverview(signal?: AbortSignal) {
  const response = await fetch("/api/optimization/overview", { cache: "no-store", signal });
  const payload = (await response.json()) as ApiResponse;
  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "No fue posible cargar el centro" : payload.error);
  }
  return payload.data;
}

const READINESS_LABELS: Record<OptimizationReadiness, string> = {
  mmm_ready: "MMM-ready",
  forecast_ready: "Forecast-ready",
  recommendation_only: "Solo recomendación",
  insufficient_data: "Datos insuficientes",
};

const READINESS_VARIANTS: Record<OptimizationReadiness, TagVariant> = {
  mmm_ready: "success",
  forecast_ready: "accent",
  recommendation_only: "warning",
  insufficient_data: "danger",
};

const STATE_LABELS: Record<string, string> = {
  draft: "Borrador",
  requires_review: "Revisión humana",
  blocked: "Bloqueada",
  expired: "Vencida",
  approved: "Aprobada",
  rejected: "Rechazada",
  executing: "Ejecutando",
  executed: "Ejecutada",
  rollback_pending: "Revirtiendo",
  rolled_back: "Revertida",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatValue(value: unknown, unit?: string, currency?: string | null) {
  if (typeof value === "number") {
    if (currency) {
      return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
    }
    return `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(value)}${unit === "%" ? "%" : unit ? ` ${unit}` : ""}`;
  }
  if (typeof value === "string" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function formatEvaluationValue(value: number | null, metric: string) {
  if (value === null) return "No calculable";
  if (metric === "ctr" || metric === "cvr") return `${(value * 100).toFixed(2)}%`;
  if (metric === "roas") return `${value.toFixed(2)}x`;
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(value);
}

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--fc-border)] bg-[var(--fc-surface)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--fc-border-subtle)]">
        <h2 className="text-sm font-bold text-[var(--fc-text)] m-0">{title}</h2>
        {description && <p className="text-xs text-[var(--fc-text-muted)] mt-1 mb-0">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default function OptimizationCenterPage() {
  const [overview, setOverview] = useState<OptimizationOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mutationError, setMutationError] = useState("");
  const [busyAction, setBusyAction] = useState("");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOverview(await fetchOverview());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No fue posible cargar el centro");
    } finally {
      setLoading(false);
    }
  }, []);

  const mutateAction = useCallback(async (
    actionId: string,
    operation: "approve" | "reject" | "dry_run" | "execute" | "rollback"
  ) => {
    let endpoint = `/api/optimization/actions/${actionId}/execute`;
    let body: Record<string, unknown> = { mode: operation, idempotencyKey: crypto.randomUUID() };
    if (operation === "approve" || operation === "reject") {
      endpoint = `/api/optimization/actions/${actionId}/approval`;
      const comment = operation === "reject" ? window.prompt("Motivo del rechazo") : undefined;
      if (operation === "reject" && !comment) return;
      body = { decision: operation === "approve" ? "approved" : "rejected", comment };
    } else if (operation === "rollback") {
      if (!window.confirm("¿Revertir al estado remoto anterior verificado?")) return;
      endpoint = `/api/optimization/actions/${actionId}/rollback`;
      body = { confirm: true, idempotencyKey: crypto.randomUUID() };
    } else if (operation === "execute" && !window.confirm("Esta acción escribirá en la plataforma publicitaria. ¿Continuar?")) {
      return;
    }

    setBusyAction(`${actionId}:${operation}`);
    setMutationError("");
    setNotice("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as { success: boolean; error?: string; data?: { status?: string } };
      if (!response.ok || !payload.success) throw new Error(payload.error || "La operación no pudo completarse");
      setNotice(operation === "dry_run" ? `Preflight: ${payload.data?.status ?? "completado"}` : "Operación registrada correctamente");
      setOverview(await fetchOverview());
    } catch (mutationError) {
      setMutationError(mutationError instanceof Error ? mutationError.message : "La operación no pudo completarse");
    } finally {
      setBusyAction("");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchOverview(controller.signal)
      .then(setOverview)
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "No fue posible cargar el centro");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
      <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--fc-module-aria)] text-xs font-bold uppercase tracking-[0.18em] mb-2">
            <Gauge className="w-4 h-4" /> Centro de Optimización
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--fc-text)] m-0">Decisiones publicitarias gobernadas</h1>
          <p className="text-sm text-[var(--fc-text-secondary)] mt-2 mb-0 max-w-3xl">
            Preparación de datos, aprobación humana y ejecución reversible controlada por cliente. No existe ejecución automática.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadOverview()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--fc-border)] bg-[var(--fc-surface)] px-4 py-2 text-xs font-semibold text-[var(--fc-text)] disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Actualizar
        </button>
      </header>

      <div className={`flex items-start gap-3 rounded-xl border p-4 ${overview?.executionControl.killSwitch || !overview?.executionControl.enabled ? "border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)]" : "border-[rgba(52,183,124,0.3)] bg-[rgba(52,183,124,0.08)]"}`}>
        <ShieldCheck className="w-5 h-5 text-[var(--fc-success)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-[var(--fc-text)] m-0">Ejecución controlada {overview?.executionControl.enabled && !overview.executionControl.killSwitch ? "disponible" : "bloqueada globalmente"}</p>
          <p className="text-xs text-[var(--fc-text-secondary)] mt-1 mb-0">Solo estados de campaña reversibles, con aprobación humana, dry-run reciente, verificación remota, límites e idempotencia. El rollback permanece manual.</p>
        </div>
      </div>

      {notice && <div className="rounded-lg border border-[rgba(52,183,124,0.3)] bg-[rgba(52,183,124,0.08)] px-4 py-3 text-xs text-[var(--fc-success)]">{notice}</div>}
      {mutationError && <div className="rounded-lg border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-xs text-[var(--fc-danger)]">{mutationError}</div>}

      {loading && !overview ? (
        <div className="min-h-72 flex items-center justify-center gap-3 text-sm text-[var(--fc-text-muted)]">
          <Loader2 className="w-5 h-5 animate-spin" /> Consolidando el workspace activo…
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertTriangle className="w-8 h-8" />}
          title="No se pudo cargar el Centro de Optimización"
          description={error}
          action={{ label: "Reintentar", onClick: () => void loadOverview() }}
        />
      ) : overview ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
            <KpiCard label="Clientes activos" value={overview.summary.activeClients} icon={<Target className="w-5 h-5" />} color="purple" context={`${overview.summary.clientsWithObjective} con meta activa`} />
            <KpiCard label="Cuentas autorizadas" value={overview.summary.authorizedAccounts} icon={<ShieldCheck className="w-5 h-5" />} color="cyan" context="Allow-list del workspace" />
            <KpiCard label="Requieren revisión" value={overview.summary.requiresReview} icon={<Clock3 className="w-5 h-5" />} color="amber" context={`${overview.summary.approved} aprobadas`} />
            <KpiCard label="Acciones bloqueadas" value={overview.summary.blocked} icon={<Ban className="w-5 h-5" />} color="red" context="Guardrails o calidad" />
            <KpiCard label="Evaluaciones válidas" value={overview.summary.completedEvaluations} icon={<Microscope className="w-5 h-5" />} color="emerald" context={`${overview.summary.inconclusiveEvaluations} inconclusas`} />
            <KpiCard label="MAPE retrospectivo" value={overview.summary.meanAbsolutePercentageError === null ? "—" : `${(overview.summary.meanAbsolutePercentageError * 100).toFixed(1)}%`} icon={<Gauge className="w-5 h-5" />} color="purple" context="Solo evaluaciones concluyentes" />
          </div>

          <Panel title="Preparación por cliente" description="La clasificación proviene del último snapshot inmutable; sin snapshot se falla de forma segura a datos insuficientes.">
            {overview.clients.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={<Database className="w-8 h-8" />} title="Aún no hay clientes de optimización" description="Registra clientes, metas y cuentas autorizadas en la capa canónica de Fase 1." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="text-[10px] uppercase tracking-[0.14em] text-[var(--fc-text-muted)] bg-[var(--fc-surface-hover)]">
                    <tr>
                      <th className="px-5 py-3">Cliente</th><th className="px-4 py-3">Preparación</th><th className="px-4 py-3">Calidad</th><th className="px-4 py-3">Meta vigente</th><th className="px-4 py-3">Fuentes</th><th className="px-4 py-3">Último corte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--fc-border-subtle)]">
                    {overview.clients.map((client) => {
                      const readiness = client.latestSnapshot?.readiness ?? "insufficient_data";
                      return (
                        <tr key={client.id} className="text-xs text-[var(--fc-text-secondary)]">
                          <td className="px-5 py-4"><p className="font-bold text-[var(--fc-text)] m-0">{client.displayName}</p><p className="text-[10px] mt-1 mb-0">{client.currency} · {client.timezone}</p></td>
                          <td className="px-4 py-4"><Tag variant={READINESS_VARIANTS[readiness]}>{READINESS_LABELS[readiness]}</Tag></td>
                          <td className="px-4 py-4"><span className="font-bold text-[var(--fc-text)]">{client.latestSnapshot?.score ?? 0}/100</span><span className="block text-[10px] mt-1">{client.latestSnapshot?.issues ?? 0} incidencias</span></td>
                          <td className="px-4 py-4">{client.objective ? <><span className="font-semibold text-[var(--fc-text)]">{client.objective.primaryKpi}</span><span className="block text-[10px] mt-1">{client.objective.direction} · {formatValue(client.objective.targetValue, undefined, client.objective.currency)}</span></> : <Tag variant="danger">Sin meta activa</Tag>}</td>
                          <td className="px-4 py-4"><span className="font-semibold text-[var(--fc-text)]">{client.authorizedAccounts}</span><span className="block text-[10px] mt-1 uppercase">{client.providers.join(", ") || "Sin cuentas"}</span></td>
                          <td className="px-4 py-4">{client.latestSnapshot ? <><span>{formatDate(client.latestSnapshot.cutoffAt)}</span><span className="block text-[10px] mt-1">{client.latestSnapshot.status}</span></> : "Sin snapshot"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Evaluación retrospectiva y shadow mode" description="Compara predicciones con snapshots posteriores. Shadow mode nunca atribuye causalidad porque la acción propuesta no fue ejecutada.">
            {overview.evaluations.length === 0 ? (
              <div className="p-6"><EmptyState icon={<Microscope className="w-8 h-8" />} title="Aún no hay evaluaciones retrospectivas" description="Cuando exista un snapshot posterior, el motor podrá medir error, cobertura del intervalo, dirección y guardrails." /></div>
            ) : (
              <div className="divide-y divide-[var(--fc-border-subtle)]">
                {overview.evaluations.map((evaluation) => (
                  <article key={evaluation.id} className="p-5 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_1fr_auto] gap-4 items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-[var(--fc-text)]">{evaluation.clientName}</span>
                        <Tag variant={evaluation.status === "completed" ? "success" : "warning"}>{evaluation.status === "completed" ? "Concluyente" : "Inconclusa"}</Tag>
                        <Tag variant={evaluation.evaluationType === "shadow_policy" ? "accent" : "default"}>{evaluation.evaluationType === "shadow_policy" ? "Shadow" : "Backtest"}</Tag>
                      </div>
                      <p className="text-xs uppercase font-bold text-[var(--fc-text-secondary)] m-0">{evaluation.metric}</p>
                      <p className="text-[10px] text-[var(--fc-text-muted)] mt-1 mb-0">{evaluation.sampleSize} filas · mínimo {evaluation.minimumSampleSize}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div><span className="block text-[10px] text-[var(--fc-text-muted)] mb-1">Predicción</span><strong className="text-[var(--fc-module-aria)]">{formatEvaluationValue(evaluation.predictedValue, evaluation.metric)}</strong></div>
                      <span className="text-[var(--fc-text-muted)]">→</span>
                      <div><span className="block text-[10px] text-[var(--fc-text-muted)] mb-1">Observado</span><strong className="text-[var(--fc-text)]">{formatEvaluationValue(evaluation.actualValue, evaluation.metric)}</strong></div>
                    </div>
                    <div className="text-xs text-[var(--fc-text-secondary)]">
                      <span className="block text-[10px] text-[var(--fc-text-muted)] mb-1">Error absoluto porcentual</span>
                      <strong className="text-[var(--fc-text)]">{evaluation.percentageError === null ? "—" : `${(evaluation.percentageError * 100).toFixed(1)}%`}</strong>
                      {evaluation.withinInterval !== null && <span className="block text-[10px] mt-1">Intervalo: {evaluation.withinInterval ? "cubierto" : "fuera de rango"}</span>}
                    </div>
                    <div className="lg:text-right text-[10px] text-[var(--fc-text-muted)]">
                      <span className="block">{formatDate(evaluation.evaluatedAt)}</span>
                      <span className="block mt-1 font-semibold text-[var(--fc-warning)]">Sin afirmación causal</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Cola de recomendaciones" description="Aprobación, preflight y ejecución son pasos separados. La primera versión solo habilita status de campaña ACTIVE/PAUSED.">
            {overview.actions.length === 0 ? (
              <div className="p-6"><EmptyState icon={<CheckCircle2 className="w-8 h-8" />} title="No hay recomendaciones pendientes" description="El sistema también puede concluir que no existe una recomendación segura con los datos disponibles." /></div>
            ) : (
              <div className="divide-y divide-[var(--fc-border-subtle)]">
                {overview.actions.map((action) => (
                  <article key={action.id} className="p-5 grid grid-cols-1 xl:grid-cols-[1.3fr_0.8fr_1.2fr] gap-4 items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-[var(--fc-text)]">{action.clientName}</span>
                        <Tag variant={action.state === "requires_review" ? "warning" : action.state === "blocked" ? "danger" : "default"}>{STATE_LABELS[action.state] ?? action.state}</Tag>
                        <Tag variant={action.risk === "low" ? "success" : action.risk === "medium" ? "warning" : "danger"}>Riesgo {action.risk}</Tag>
                      </div>
                      <p className="text-xs text-[var(--fc-text-secondary)] m-0"><span className="uppercase font-bold">{action.provider}</span> · {action.accountId}{action.campaignId ? ` · ${action.campaignId}` : ""}</p>
                      <p className="text-[10px] text-[var(--fc-text-muted)] mt-1 mb-0">Campo: {action.field} · requiere {action.requiredApproverRole}</p>
                      <p className="text-[10px] text-[var(--fc-text-muted)] mt-1 mb-0">Aprobaciones: {action.approvalSummary.approvalCount}/{action.approvalSummary.requiredApprovalCount} · política {action.executionPolicyEnabled ? "habilitada" : "solo lectura"}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div><span className="block text-[10px] text-[var(--fc-text-muted)] mb-1">Actual</span><strong className="text-[var(--fc-text)]">{formatValue(action.currentValue, action.unit, action.currency)}</strong></div>
                      <span className="text-[var(--fc-text-muted)]">→</span>
                      <div><span className="block text-[10px] text-[var(--fc-text-muted)] mb-1">Propuesto</span><strong className="text-[var(--fc-module-aria)]">{formatValue(action.proposedValue, action.unit, action.currency)}</strong></div>
                    </div>
                    <div className="flex flex-wrap xl:justify-end items-center gap-2">
                      {["requires_review", "rejected"].includes(action.state) && ["OWNER", "ADMIN"].includes(overview.executionControl.viewerRole) && (
                        <>
                          <button type="button" disabled={!!busyAction} onClick={() => void mutateAction(action.id, "approve")} className="rounded-lg bg-[var(--fc-module-aria)] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">Aprobar</button>
                          <button type="button" disabled={!!busyAction} onClick={() => void mutateAction(action.id, "reject")} className="rounded-lg border border-[var(--fc-border)] px-3 py-2 text-[10px] font-bold text-[var(--fc-text-secondary)] disabled:opacity-50">Rechazar</button>
                        </>
                      )}
                      {["requires_review", "approved"].includes(action.state) && ["OWNER", "ADMIN"].includes(overview.executionControl.viewerRole) && (
                        <button type="button" disabled={!!busyAction} onClick={() => void mutateAction(action.id, "dry_run")} className="rounded-lg border border-[var(--fc-border)] px-3 py-2 text-[10px] font-bold text-[var(--fc-text)] disabled:opacity-50">Dry-run</button>
                      )}
                      {action.state === "approved" && ["OWNER", "ADMIN"].includes(overview.executionControl.viewerRole) && overview.executionControl.enabled && !overview.executionControl.killSwitch && (
                        <button type="button" disabled={!!busyAction} onClick={() => void mutateAction(action.id, "execute")} className="rounded-lg bg-[var(--fc-success)] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">Ejecutar</button>
                      )}
                      {action.state === "executed" && overview.executionControl.viewerRole === "OWNER" && overview.executionControl.enabled && (
                        <button type="button" disabled={!!busyAction} onClick={() => void mutateAction(action.id, "rollback")} className="rounded-lg border border-[var(--fc-danger)] px-3 py-2 text-[10px] font-bold text-[var(--fc-danger)] disabled:opacity-50">Rollback</button>
                      )}
                      <div className="text-right text-[10px] text-[var(--fc-text-muted)]"><span className="block">Caduca</span><span className="font-semibold text-[var(--fc-text-secondary)]">{formatDate(action.expiresAt)}</span>{action.executions[0] && <span className="block mt-1">Último: {action.executions[0].operation} · {action.executions[0].status}</span>}</div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Panel>

          <p className="text-[10px] text-[var(--fc-text-muted)] text-right m-0">Vista generada: {formatDate(overview.generatedAt)}</p>
        </>
      ) : null}
    </div>
  );
}
