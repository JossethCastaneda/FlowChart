"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Sparkles, Check, Loader2, KeyRound, AlertTriangle,
  Bot, Network, Cpu, ChevronRight, Zap, ShieldCheck, Globe, Layers
} from "lucide-react";
import { apiFetch, apiSend } from "@/lib/api-client";
import { useWorkspace } from "@/hooks/use-settings-data";
import { showToast } from "@/components/ui/Toast";
import { SettingsSkeleton } from "@/components/settings/ui";

/* ─── Tipos ─────────────────────────────────────────────────── */
interface CatalogModel {
  id: string;
  label: string;
  note: string;
  inputPerM: number;
  outputPerM: number;
  power: number;
  performance: string;
}

interface CatalogProvider {
  id: string;
  label: string;
  vendor: string;
  tagline: string;
  strengths: string[];
  recommendedModel: string;
  envVar: string;
  configured: boolean;
  models: CatalogModel[];
}

interface AiModelPayload {
  model: string;
  defaultModel: string;
  providers: CatalogProvider[];
}

/* ─── Config visual de cada proveedor ──────────────────────── */
const PROVIDER_VISUAL: Record<string, {
  color: string;
  glow: string;
  border: string;
  bg: string;
  logo: React.ReactNode;
  accentText: string;
}> = {
  openai: {
    color: "#10a37f",
    glow: "rgba(16,163,127,0.18)",
    border: "rgba(16,163,127,0.35)",
    bg: "rgba(16,163,127,0.06)",
    accentText: "text-emerald-400",
    logo: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.032.067L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
      </svg>
    ),
  },
  gemini: {
    color: "#4f8ef7",
    glow: "rgba(79,142,247,0.18)",
    border: "rgba(79,142,247,0.35)",
    bg: "rgba(79,142,247,0.06)",
    accentText: "text-blue-400",
    logo: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm0 2.4c5.304 0 9.6 4.296 9.6 9.6s-4.296 9.6-9.6 9.6S2.4 17.304 2.4 12 6.696 2.4 12 2.4zm0 2.4a7.2 7.2 0 1 0 0 14.4A7.2 7.2 0 0 0 12 4.8zm0 2.4a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6z" />
        <path d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2zm0 1.2a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8z" />
      </svg>
    ),
  },
  anthropic: {
    color: "#d97706",
    glow: "rgba(217,119,6,0.18)",
    border: "rgba(217,119,6,0.35)",
    bg: "rgba(217,119,6,0.06)",
    accentText: "text-amber-400",
    logo: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M13.827 3.52h-3.654L6 20.5h3.8l.74-2.83h3.132l.74 2.83H18.2L13.827 3.52zm-2.8 10.94l1.12-4.29 1.12 4.29h-2.24z" />
      </svg>
    ),
  },
};

/* ─── Capacidades activadas por proveedor ───────────────────── */
const CAPABILITIES = [
  { icon: Bot, label: "Agentes IA", desc: "Agentes autónomos especializados por módulo" },
  { icon: Network, label: "Sub-agentes", desc: "Jerarquías de agentes en paralelo" },
  { icon: Layers, label: "Orquestadores", desc: "Coordinación multi-agente inteligente" },
];

/* ─── Componente principal ───────────────────────────────────── */
export default function InteligenciaPage() {
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: loadingWorkspace } = useWorkspace();
  const [hoveredProvider, setHoveredProvider] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["workspaceAiModel"],
    queryFn: () => apiFetch<AiModelPayload>("/api/workspace/ai-model"),
  });

  const selectMutation = useMutation({
    mutationFn: (model: string) => apiSend("/api/workspace/ai-model", "PUT", { model }),
    onSuccess: (_result, model) => {
      queryClient.invalidateQueries({ queryKey: ["workspaceAiModel"] });
      showToast("success", `Proveedor activado correctamente.`);
    },
    onError: (err: Error) => showToast("error", err.message),
  });

  if (loadingWorkspace || isLoading) return <SettingsSkeleton cards={2} />;

  if (isError) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-[var(--fc-warning)] mx-auto" />
          <p className="text-sm font-semibold text-[var(--fc-text)]">No pudimos cargar el catálogo</p>
          <p className="text-xs text-[var(--fc-text-muted)]">{(error as Error)?.message}</p>
        </div>
      </div>
    );
  }

  const providers = data?.providers ?? [];
  const selected = data?.model;

  // Determina qué proveedor está activo (posee el modelo seleccionado)
  const activeProviderId = providers.find(p => p.models.some(m => m.id === selected))?.id ?? null;
  const displayProvider = hoveredProvider ?? activeProviderId;
  const visual = displayProvider ? PROVIDER_VISUAL[displayProvider] : null;

  return (
    <div className="space-y-8 pb-16">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-[var(--fc-accent)]" />
            <h2 className="text-lg font-bold text-[var(--fc-text)] tracking-tight">Motor de inteligencia</h2>
          </div>
          <p className="text-sm text-[var(--fc-text-secondary)] leading-relaxed max-w-lg">
            Elige el proveedor de IA que impulsa a{" "}
            <span className="text-[var(--fc-accent)] font-medium">Aria</span>,{" "}
            <span className="text-[var(--fc-accent)] font-medium">GridIA</span> y todos los módulos.
            Al activarlo, se habilitarán <strong className="text-[var(--fc-text)]">agentes</strong>,{" "}
            <strong className="text-[var(--fc-text)]">sub-agentes</strong> y{" "}
            <strong className="text-[var(--fc-text)]">orquestadores</strong> de ese proveedor.
          </p>
        </div>

        {activeProviderId && (
          <div
            className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: PROVIDER_VISUAL[activeProviderId]?.bg,
              border: `1px solid ${PROVIDER_VISUAL[activeProviderId]?.border}`,
              color: PROVIDER_VISUAL[activeProviderId]?.color,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: PROVIDER_VISUAL[activeProviderId]?.color }} />
            {providers.find(p => p.id === activeProviderId)?.label} · Activo
          </div>
        )}
      </div>

      {/* ── Advertencia sin key ─────────────────────────────── */}
      {!providers.some(p => p.configured) && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--fc-warning)]/20 bg-[var(--fc-warning)]/5">
          <KeyRound className="w-4 h-4 text-[var(--fc-warning)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--fc-warning)] mb-0.5">Sin API keys configuradas</p>
            <p className="text-xs text-[var(--fc-text-muted)] leading-relaxed">
              Añade las variables de entorno de cada proveedor para habilitarlos.
              Puedes configurarlas sin interrumpir el servicio actual.
            </p>
          </div>
        </div>
      )}

      {/* ── Catálogo de proveedores ─────────────────────────── */}
      <div className="grid grid-cols-1 gap-5">
        {providers.map((provider) => {
          const vis = PROVIDER_VISUAL[provider.id];
          const isActive = activeProviderId === provider.id;
          const isHovered = hoveredProvider === provider.id;
          const recModel = provider.models.find(m => m.id === provider.recommendedModel) ?? provider.models[0];

          return (
            <div
              key={provider.id}
              onMouseEnter={() => setHoveredProvider(provider.id)}
              onMouseLeave={() => setHoveredProvider(null)}
              className="relative overflow-hidden rounded-2xl transition-all duration-300"
              style={{
                border: isActive
                  ? `1.5px solid ${vis?.border}`
                  : isHovered
                  ? `1.5px solid ${vis?.border}`
                  : "1.5px solid var(--fc-border)",
                background: isActive
                  ? `linear-gradient(135deg, ${vis?.bg} 0%, var(--fc-surface) 60%)`
                  : "var(--fc-surface)",
                boxShadow: isActive
                  ? `0 0 40px ${vis?.glow}, 0 4px 24px rgba(0,0,0,0.18)`
                  : isHovered
                  ? `0 0 24px ${vis?.glow}, 0 4px 16px rgba(0,0,0,0.12)`
                  : "none",
              }}
            >
              {/* Glow top accent bar */}
              {(isActive || isHovered) && (
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: `linear-gradient(90deg, transparent 0%, ${vis?.color} 50%, transparent 100%)` }}
                />
              )}

              <div className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">

                  {/* ── Left: Provider info ─────────────────── */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className="p-2.5 rounded-xl shrink-0"
                        style={{
                          background: vis?.bg,
                          border: `1px solid ${vis?.border}`,
                          color: vis?.color,
                        }}
                      >
                        {vis?.logo}
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-base font-bold text-[var(--fc-text)]">{provider.label}</span>
                          <span
                            className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                            style={{ background: vis?.bg, color: vis?.color, border: `1px solid ${vis?.border}` }}
                          >
                            {provider.vendor}
                          </span>
                          {provider.configured ? (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Disponible
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--fc-text-muted)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--fc-text-muted)]" />
                              Falta <code className="font-mono">{provider.envVar}</code>
                            </span>
                          )}
                          {isActive && (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: vis?.bg, color: vis?.color, border: `1px solid ${vis?.border}` }}>
                              <Check className="w-2.5 h-2.5" /> EN USO
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-[var(--fc-text-secondary)]">{provider.tagline}</p>
                      </div>
                    </div>

                    {/* Strengths */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                      {provider.strengths.map((s, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" style={{ color: vis?.color }} />
                          <span className="text-[11px] text-[var(--fc-text-secondary)]">{s}</span>
                        </div>
                      ))}
                    </div>

                    {/* Capabilities activated */}
                    <div className="rounded-xl border border-[var(--fc-border)] bg-[var(--fc-surface-raised)]/40 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--fc-text-muted)] mb-3">
                        Se activa al seleccionar este proveedor
                      </p>
                      <div className="flex flex-wrap gap-4">
                        {CAPABILITIES.map(({ icon: Icon, label, desc }) => (
                          <div key={label} className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: isActive ? vis?.bg : "var(--fc-surface-hover)", border: `1px solid ${isActive ? vis?.border : "var(--fc-border)"}` }}
                            >
                              <Icon className="w-3.5 h-3.5" style={{ color: isActive ? vis?.color : "var(--fc-text-muted)" }} />
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-[var(--fc-text)]">{label}</p>
                              <p className="text-[10px] text-[var(--fc-text-muted)]">{desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Right: Models + CTA ─────────────────── */}
                  <div className="lg:w-[280px] shrink-0 flex flex-col gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--fc-text-muted)]">Modelos incluidos</p>

                    <div className="space-y-2 flex-1">
                      {provider.models.map((model) => {
                        const isModelSelected = selected === model.id;
                        return (
                          <div
                            key={model.id}
                            className="flex items-start justify-between gap-3 p-3 rounded-xl"
                            style={{
                              background: isModelSelected ? vis?.bg : "var(--fc-surface-raised)",
                              border: isModelSelected ? `1px solid ${vis?.border}` : "1px solid var(--fc-border)"
                            }}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                <span className="text-[12px] font-semibold text-[var(--fc-text)]">{model.label}</span>
                                {model.id === provider.recommendedModel && !isModelSelected && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                    style={{ color: vis?.color, background: vis?.bg, border: `1px solid ${vis?.border}` }}>
                                    Rec.
                                  </span>
                                )}
                                {isModelSelected && (
                                  <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                                    {selectMutation.isPending
                                      ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                      : <Check className="w-2.5 h-2.5" />}
                                    ACTIVO
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-[var(--fc-text-muted)] leading-relaxed">{model.performance}</p>
                              {/* Power bar */}
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <Zap className="w-2.5 h-2.5" style={{ color: vis?.color }} />
                                <div className="flex gap-0.5">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <div
                                      key={i}
                                      className="h-1 w-3 rounded-full transition-colors"
                                      style={{
                                        background: i < model.power ? vis?.color : "var(--fc-border)"
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Select button */}
                    <button
                      onClick={() => {
                        if (!isAdmin || !provider.configured || isActive) return;
                        selectMutation.mutate(provider.recommendedModel);
                      }}
                      disabled={!isAdmin || !provider.configured || isActive || selectMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200"
                      style={
                        isActive
                          ? { background: vis?.bg, color: vis?.color, border: `1.5px solid ${vis?.border}`, cursor: "default" }
                          : provider.configured && isAdmin
                          ? {
                              background: `linear-gradient(135deg, ${vis?.color}, ${vis?.color}dd)`,
                              color: "#fff",
                              border: "1px solid transparent",
                              cursor: "pointer",
                              boxShadow: `0 4px 16px ${vis?.glow}`,
                            }
                          : {
                              background: "var(--fc-surface-hover)",
                              color: "var(--fc-text-muted)",
                              border: "1px solid var(--fc-border)",
                              cursor: "not-allowed",
                            }
                      }
                    >
                      {selectMutation.isPending && activeProviderId === provider.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Activando…
                        </>
                      ) : isActive ? (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          Proveedor activo
                        </>
                      ) : !provider.configured ? (
                        <>
                          <KeyRound className="w-4 h-4" />
                          Requiere API key
                        </>
                      ) : !isAdmin ? (
                        <>
                          <Globe className="w-4 h-4" />
                          Solo administradores
                        </>
                      ) : (
                        <>
                          <Cpu className="w-4 h-4" />
                          Activar {provider.label}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer info ────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--fc-border)] bg-[var(--fc-surface-raised)]/30">
        <ShieldCheck className="w-4 h-4 text-[var(--fc-text-muted)] shrink-0 mt-0.5" />
        <p className="text-[11px] text-[var(--fc-text-muted)] leading-relaxed">
          Cambiar el proveedor afecta a todo el workspace de inmediato. Los tokens consumidos se facturan
          al proveedor activo en ese momento. Solo <strong>OWNER</strong> y{" "}
          <strong>ADMIN</strong> pueden modificar esta configuración.
        </p>
      </div>
    </div>
  );
}
