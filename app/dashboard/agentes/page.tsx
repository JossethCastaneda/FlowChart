"use client";
/**
 * Módulo AGENTES — nodo principal de la capa de IA de Sodare.
 *
 * Catálogo ejecutivo comparable: UNA card por modelo (sin desplegables),
 * organizado por proveedor en filas deslizables horizontalmente. Cada card
 * muestra modelo, precio por 1M de tokens (entrada/salida) y potencia.
 * Contratar un modelo lo activa para TODO el sistema (Copilot, Insights,
 * GridIA y los agentes de módulo).
 *
 * Diseño: tokens del sistema (Identidad visual SaaS minimalista = Imperial
 * Command Center): var(--surface), hairlines, Orbitron para etiquetas,
 * cifras tabulares. Sin emojis ni iconografía decorativa.
 */
import { PageHeader } from "@/components/ui/PageHeader";
import { HScroller } from "@/components/ui/HScroller";
import { useCallback, useEffect, useState } from "react";

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
  models: CatalogModel[];
  envVar: string;
  configured: boolean;
}
interface ProvidersResponse {
  providers: CatalogProvider[];
  explicit: boolean;
  activeProviderId: string | null;
  activeModel: string | null;
  canManage: boolean;
}

const PROVIDER_ACCENT: Record<string, string> = {
  gemini: "#3b82f6",
  openai: "#34b77c",
  anthropic: "#e0a83c",
};

const POWER_LABEL: Record<number, string> = {
  1: "Básica",
  2: "Esencial",
  3: "Media",
  4: "Alta",
  5: "Máxima",
};

const fmtUsd = (n: number) => `$${n < 1 ? n.toFixed(2) : n % 1 === 0 ? String(n) : n.toFixed(2)}`;

function PowerBar({ power, accent }: { power: number; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", gap: 3, flex: 1 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              height: 4,
              flex: 1,
              borderRadius: 2,
              background: i <= power ? accent : "var(--hairline)",
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground)", width: 56, textAlign: "right" }}>
        {POWER_LABEL[power] ?? "—"}
      </span>
    </div>
  );
}

export default function AgentesPage() {
  const [data, setData] = useState<ProvidersResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [orchestrating, setOrchestrating] = useState(false);
  const [orchestratorResult, setOrchestratorResult] = useState<any>(null);
  const [orchestratorError, setOrchestratorError] = useState<string | null>(null);

  // Recarga por clave: el efecto sincroniza con la API (sistema externo) y solo
  // transiciona el estado en continuaciones async, con flag de cancelación.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/crecimiento/providers")
      .then((res) => res.json())
      .then((j) => {
        if (cancelled) return;
        if (!j?.success) throw new Error(j?.error ?? "error");
        setData(j.data);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retry = () => {
    setStatus("loading");
    setReloadKey((k) => k + 1);
  };

  const load = useCallback(async () => {
    setReloadKey((k) => k + 1);
  }, []);

  const contratar = async (modelId: string) => {
    if (!data?.canManage || saving) return;
    setSaving(modelId);
    setSaveError(null);
    try {
      const res = await fetch("/api/workspace/ai-model", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelId }),
      });
      const j = await res.json();
      if (!res.ok || !j?.success) {
        setSaveError(j?.error ?? "No se pudo activar el modelo.");
      } else {
        await load();
      }
    } catch {
      setSaveError("Error de conexión.");
    } finally {
      setSaving(null);
    }
  };

  const triggerOrchestrator = async () => {
    setOrchestrating(true);
    setOrchestratorResult(null);
    setOrchestratorError(null);
    try {
      const res = await fetch("/api/agents/orchestrate", { method: "POST" });
      const j = await res.json();
      if (!res.ok || !j?.success) {
        setOrchestratorError(j?.error ?? "Error al orquestar agentes.");
      } else {
        setOrchestratorResult(j.data);
      }
    } catch {
      setOrchestratorError("Error de conexión.");
    } finally {
      setOrchestrating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6">
      <PageHeader
        title="Agentes"
        description="El núcleo de IA de Sodare. Activa un modelo y la inteligencia entra en juego en todos los módulos de la plataforma."
      />

      {/* SECCIÓN: ORQUESTADOR */}
      <section
        className="rounded-xl p-5 sm:p-6 mb-2 flex flex-col gap-4"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-neutral)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--cyan), var(--blue))" }} />
        
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: "0 0 4px" }}>Plan de Acción</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, maxWidth: 600 }}>
            Dispara el orquestador backend. Este proceso ejecuta 5 subagentes en paralelo que analizan tu workspace (crecimiento, proyectos, operaciones, publicaciones e inbox) y sintetiza los hallazgos en un plan priorizado.
          </p>
        </div>

        <div>
          <button
            onClick={triggerOrchestrator}
            disabled={orchestrating || !data?.explicit && !data?.activeProviderId}
            className="px-4 py-2 rounded-md text-sm font-semibold transition"
            style={{
              background: orchestrating ? "var(--surface-hover)" : "var(--foreground)",
              color: orchestrating ? "var(--text-muted)" : "var(--background)",
              cursor: orchestrating ? "default" : "pointer",
            }}
          >
            {orchestrating ? "Analizando workspace..." : "Analizar mi workspace"}
          </button>
        </div>

        {orchestratorError && (
          <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: 13, color: "var(--red)", background: "var(--red-dim)", border: "1px solid rgba(229,72,77,0.3)" }}>
            {orchestratorError}
          </div>
        )}

        {orchestratorResult && (
          <div className="mt-2 flex flex-col gap-4">
            <div style={{ padding: 16, background: "var(--background)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "var(--foreground)" }}>Síntesis del Plan ({orchestratorResult.model})</h3>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                {orchestratorResult.plan.summary}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {orchestratorResult.agentes.map((ag: any) => (
                <div key={ag.key} style={{ padding: 12, background: "var(--background)", borderRadius: 8, border: `1px solid ${ag.ok ? "var(--border)" : "var(--red-dim)"}` }}>
                  <div className="flex justify-between items-center mb-2">
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>{ag.nombre}</span>
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: ag.ok ? "var(--emerald-dim)" : "var(--red-dim)", color: ag.ok ? "var(--emerald)" : "var(--red)" }}>
                      {ag.ok ? "OK" : "Error"}
                    </span>
                  </div>
                  {ag.ok && ag.hallazgos ? (
                    <div className="mt-3 flex flex-col gap-3">
                      <div>
                        <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Hallazgos</h4>
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "var(--text-secondary)", listStyleType: "circle" }}>
                          {ag.hallazgos.hallazgos?.map((h: string, i: number) => (
                            <li key={i} style={{ marginBottom: 3 }}>{h}</li>
                          ))}
                        </ul>
                      </div>
                      {ag.hallazgos.recomendaciones?.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Recomendaciones</h4>
                          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "var(--text-muted)", listStyleType: "circle" }}>
                            {ag.hallazgos.recomendaciones.map((r: string, i: number) => (
                              <li key={i} style={{ marginBottom: 3 }}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div style={{ marginTop: 2, display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Prioridad:</span>
                        <span style={{ 
                          fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 700,
                          background: ag.hallazgos.prioridad === "alta" ? "var(--red-dim)" : ag.hallazgos.prioridad === "media" ? "var(--amber-dim)" : "var(--blue-dim)",
                          color: ag.hallazgos.prioridad === "alta" ? "var(--red)" : ag.hallazgos.prioridad === "media" ? "var(--amber)" : "var(--blue)"
                        }}>
                          {ag.hallazgos.prioridad}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "var(--red)", marginTop: 8 }}>Falló el análisis.</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {saveError && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--red)",
            background: "var(--red-dim)",
            border: "1px solid rgba(229,72,77,0.3)",
          }}
        >
          {saveError}
        </div>
      )}

      {status === "loading" && (
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-[300px] h-[280px] shrink-0 rounded-xl"
              style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}
            />
          ))}
        </div>
      )}

      {status === "error" && (
        <div
          className="rounded-xl p-6 text-sm"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          No se pudo cargar el catálogo de modelos.
          <button
            onClick={retry}
            className="ml-3 px-3 py-1 rounded-md text-xs font-semibold"
            style={{ border: "1px solid var(--border)", color: "var(--foreground)", background: "transparent", cursor: "pointer" }}
          >
            Reintentar
          </button>
        </div>
      )}

      {status === "ready" &&
        data &&
        data.providers.map((p) => {
          const accent = PROVIDER_ACCENT[p.id] ?? "var(--cyan)";
          return (
            <section key={p.id}>
              {/* Encabezado del proveedor */}
              <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-baseline gap-3">
                  <span className="t-label" style={{ color: accent }}>
                    {p.vendor}
                  </span>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{p.label}</h2>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.tagline}</span>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: p.configured ? "var(--emerald)" : "var(--text-muted)",
                  }}
                >
                  {p.configured ? "Conectada" : `No disponible`}
                </span>
              </div>

              {/* Fila deslizable: una card por modelo */}
              <HScroller ariaLabel={`Modelos de ${p.label}`}>
                {p.models.map((m) => {
                  const isActive = data.explicit && data.activeModel === m.id;
                  const isRecommended = p.recommendedModel === m.id;
                  const busy = saving === m.id;
                  return (
                    <article
                      key={m.id}
                      className="shrink-0 snap-start w-[280px] sm:w-[300px] rounded-xl overflow-hidden flex flex-col"
                      style={{
                        background: "var(--surface)",
                        border: `1px solid ${isActive ? accent : "var(--border-neutral)"}`,
                        boxShadow: isActive ? `0 0 0 1px ${accent}, 0 8px 30px rgba(0,0,0,0.35)` : "none",
                        opacity: p.configured ? 1 : 0.65,
                      }}
                    >
                      <div style={{ height: 2, background: accent }} />
                      <div className="p-5 flex flex-col gap-4 flex-1">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="t-label">{p.vendor}</span>
                            {isActive ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  color: accent,
                                }}
                              >
                                En uso
                              </span>
                            ) : isRecommended ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  color: "var(--background)",
                                  background: "var(--foreground)",
                                  padding: "2px 6px",
                                  borderRadius: 4
                                }}
                              >
                                Recomendado
                              </span>
                            ) : null}
                          </div>
                          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: "4px 0 2px" }}>
                            {m.label}
                          </h3>
                          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>{m.note}</p>
                        </div>

                        {/* Precio por 1M tokens */}
                        <div
                          className="grid grid-cols-2"
                          style={{ border: "1px solid var(--hairline)", borderRadius: 10, overflow: "hidden" }}
                        >
                          <div style={{ padding: "10px 12px", borderRight: "1px solid var(--hairline)" }}>
                            <p style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", margin: "0 0 3px" }}>
                              Entrada · 1M
                            </p>
                            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: 0, fontVariantNumeric: "tabular-nums" }}>
                              {fmtUsd(m.inputPerM)}
                            </p>
                          </div>
                          <div style={{ padding: "10px 12px" }}>
                            <p style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", margin: "0 0 3px" }}>
                              Salida · 1M
                            </p>
                            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: 0, fontVariantNumeric: "tabular-nums" }}>
                              {fmtUsd(m.outputPerM)}
                            </p>
                          </div>
                        </div>

                        {/* Potencia */}
                        <div>
                          <p style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", margin: "0 0 6px" }}>
                            Potencia
                          </p>
                          <PowerBar power={m.power} accent={accent} />
                        </div>

                        {/* Rendimiento en la plataforma */}
                        <div>
                          <p style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", margin: "0 0 6px" }}>
                            Rendimiento en la plataforma
                          </p>
                          <p style={{ fontSize: 12, lineHeight: 1.55, color: "var(--text-secondary)", margin: 0 }}>
                            {m.performance}
                          </p>
                        </div>

                        {/* CTA */}
                        <div className="mt-auto">
                          <button
                            onClick={() => contratar(m.id)}
                            disabled={!p.configured || !data.canManage || isActive || busy}
                            title={
                              !p.configured
                                ? `Este modelo no está disponible`
                                : !data.canManage
                                  ? "Solo administradores pueden activar modelos"
                                  : undefined
                            }
                            className="w-full py-2 rounded-md text-sm font-semibold transition disabled:cursor-not-allowed"
                            style={{
                              background: isActive ? "transparent" : p.configured ? accent : "var(--surface-hover)",
                              color: isActive ? accent : p.configured ? "#04070e" : "var(--text-muted)",
                              border: isActive ? `1px solid ${accent}` : "1px solid transparent",
                              opacity: busy ? 0.6 : 1,
                              cursor: !p.configured || !data.canManage || isActive ? "default" : "pointer",
                            }}
                          >
                            {busy ? "Activando..." : isActive ? "Activo" : "Activar"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </HScroller>
            </section>
          );
        })}

      {/* Alcance de la contratación */}
      <section
        className="rounded-xl p-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border-neutral)" }}
      >
        <p className="t-label" style={{ marginBottom: 8 }}>
          Alcance
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)", margin: 0, maxWidth: 720 }}>
          El modelo contratado se convierte en la inteligencia de todo el sistema: entra en juego en todos y
          cada uno de los módulos y submódulos de Sodare — conversación, análisis, generación de contenido y
          agentes automáticos — sin configuraciones adicionales. Cambiar de modelo aplica al instante en toda
          la plataforma.
        </p>
      </section>
    </div>
  );
}
