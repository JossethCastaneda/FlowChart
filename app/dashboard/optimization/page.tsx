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
          <div className="flex items-center gap-2 text-[var(--purple)] text-xs font-bold uppercase tracking-[0.18em] mb-2">
            <Gauge className="w-4 h-4" /> Centro de Optimización
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--fc-text)] m-0">Decisiones publicitarias gobernadas</h1>
          <p className="text-sm text-[var(--fc-text-secondary)] mt-2 mb-0 max-w-3xl">
            Preparación de datos, metas y recomendaciones reconciliadas por cliente. Esta versión no puede ejecutar cambios en plataformas publicitarias.
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

      <div className="flex items-start gap-3 rounded-xl border border-[rgba(52,183,124,0.3)] bg-[rgba(52,183,124,0.08)] p-4">
        <ShieldCheck className="w-5 h-5 text-[var(--fc-success)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-[var(--fc-text)] m-0">Modo lectura activo</p>
          <p className="text-xs text-[var(--fc-text-secondary)] mt-1 mb-0">Toda acción es una propuesta auditable. No existe ejecución automática ni escritura remota desde este centro.</p>
        </div>
      </div>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard label="Clientes activos" value={overview.summary.activeClients} icon={<Target className="w-5 h-5" />} color="purple" context={`${overview.summary.clientsWithObjective} con meta activa`} />
            <KpiCard label="Cuentas autorizadas" value={overview.summary.authorizedAccounts} icon={<ShieldCheck className="w-5 h-5" />} color="cyan" context="Allow-list del workspace" />
            <KpiCard label="Requieren revisión" value={overview.summary.requiresReview} icon={<Clock3 className="w-5 h-5" />} color="amber" context="Sin ejecución habilitada" />
            <KpiCard label="Acciones bloqueadas" value={overview.summary.blocked} icon={<Ban className="w-5 h-5" />} color="red" context="Guardrails o calidad" />
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

          <Panel title="Cola de recomendaciones" description="Propuestas estructuradas con caducidad y aprobador requerido. Los valores se muestran sin habilitar controles de mutación.">
            {overview.actions.length === 0 ? (
              <div className="p-6"><EmptyState icon={<CheckCircle2 className="w-8 h-8" />} title="No hay recomendaciones pendientes" description="El sistema también puede concluir que no existe una recomendación segura con los datos disponibles." /></div>
            ) : (
              <div className="divide-y divide-[var(--fc-border-subtle)]">
                {overview.actions.map((action) => (
                  <article key={action.id} className="p-5 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_auto] gap-4 items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-[var(--fc-text)]">{action.clientName}</span>
                        <Tag variant={action.state === "requires_review" ? "warning" : action.state === "blocked" ? "danger" : "default"}>{STATE_LABELS[action.state] ?? action.state}</Tag>
                        <Tag variant={action.risk === "low" ? "success" : action.risk === "medium" ? "warning" : "danger"}>Riesgo {action.risk}</Tag>
                      </div>
                      <p className="text-xs text-[var(--fc-text-secondary)] m-0"><span className="uppercase font-bold">{action.provider}</span> · {action.accountId}{action.campaignId ? ` · ${action.campaignId}` : ""}</p>
                      <p className="text-[10px] text-[var(--fc-text-muted)] mt-1 mb-0">Campo: {action.field} · requiere {action.requiredApproverRole}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div><span className="block text-[10px] text-[var(--fc-text-muted)] mb-1">Actual</span><strong className="text-[var(--fc-text)]">{formatValue(action.currentValue, action.unit, action.currency)}</strong></div>
                      <span className="text-[var(--fc-text-muted)]">→</span>
                      <div><span className="block text-[10px] text-[var(--fc-text-muted)] mb-1">Propuesto</span><strong className="text-[var(--purple)]">{formatValue(action.proposedValue, action.unit, action.currency)}</strong></div>
                    </div>
                    <div className="lg:text-right text-[10px] text-[var(--fc-text-muted)]"><span className="block">Caduca</span><span className="font-semibold text-[var(--fc-text-secondary)]">{formatDate(action.expiresAt)}</span></div>
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
