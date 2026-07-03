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

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6">
      <PageHeader
        title="Agentes"
        description="El núcleo de IA de Sodare. Contrata un modelo y la inteligencia entra en juego en todos y cada uno de los módulos de la plataforma."
      />

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
                  {p.configured ? "Conectada" : `Sin conexión · ${p.envVar}`}
                </span>
              </div>

              {/* Fila deslizable: una card por modelo */}
              <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory" style={{ scrollbarWidth: "thin" }}>
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
                                  color: "var(--text-muted)",
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
                                ? `Conecta ${p.envVar} para habilitar este modelo`
                                : !data.canManage
                                  ? "Solo administradores pueden contratar modelos"
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
                            {busy ? "Activando..." : isActive ? "Activo en el workspace" : "Contratar"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
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
