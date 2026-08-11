"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe, Users, MousePointer, Clock, Target, TrendingUp, Plug, ChevronUp, ChevronDown, Check, Settings } from "lucide-react";

interface TrafficSummary {
  users: number;
  sessions: number;
  engagement: number;
  avg_duration: number;
  conversions: number;
  bounce: number;
}
interface TrafficResponse {
  connected: boolean;
  propertyId: string | null;
  metrics: TrafficSummary | null;
  website: string | null;
}

/** Formatea el valor de cada métrica GA4 para su tarjeta. */
function fmtMetric(id: string, m: TrafficSummary | null): string {
  if (!m) return "—";
  const v = (m as unknown as Record<string, number>)[id];
  if (v == null || Number.isNaN(v)) return "—";
  if (id === "engagement" || id === "bounce") return `${v}%`;
  if (id === "avg_duration") {
    const mm = Math.floor(v / 60);
    const ss = Math.round(v % 60);
    return mm > 0 ? `${mm}m ${ss}s` : `${ss}s`;
  }
  return v.toLocaleString();
}

// Base GA4 / Tag Manager traffic metrics. They render even before GA4 is
// connected or the request form is filled (empty states).
const TRAFFIC_METRICS = [
  { id: "users", label: "Usuarios", icon: Users, color: "#4285F4" },
  { id: "sessions", label: "Sesiones", icon: TrendingUp, color: "var(--fc-accent)" },
  { id: "engagement", label: "Tasa de interacción", icon: MousePointer, color: "var(--fc-success)" },
  { id: "avg_duration", label: "Duración media", icon: Clock, color: "var(--fc-module-aria)" },
  { id: "conversions", label: "Conversiones", icon: Target, color: "#bc5fb2" },
  { id: "bounce", label: "Tasa de rebote", icon: MousePointer, color: "#d98843" },
];

interface Project { id: string; website?: string }

export function TrafficAnalytics({ project }: { project: Project }) {
  const storeKey = `flowchart:traffic-order:${project.id}`;
  const [order, setOrder] = useState<string[]>(TRAFFIC_METRICS.map((m) => m.id));
  const [hidden, setHidden] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Tráfico GA4 real (degradado a "Conecta GA4" si no está conectado).
  const { data: traffic, isLoading: trafficLoading } = useQuery<TrafficResponse>({
    queryKey: ["project-traffic", project.id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${project.id}/traffic?days=28`);
      const json = await res.json();
      return (json.data ?? json) as TrafficResponse;
    },
  });
  const connected = traffic?.connected ?? false;
  const metrics = traffic?.metrics ?? null;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const p = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO: [React] Refactor de hooks anti-patrón
        if (Array.isArray(p.order)) setOrder(p.order);
        if (Array.isArray(p.hidden)) setHidden(p.hidden);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (nextOrder: string[], nextHidden: string[]) => {
    try { localStorage.setItem(storeKey, JSON.stringify({ order: nextOrder, hidden: nextHidden })); } catch { /* ignore */ }
  };
  const move = (id: string, dir: -1 | 1) => {
    setOrder((prev) => {
      const i = prev.indexOf(id); const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev]; [next[i], next[j]] = [next[j], next[i]];
      persist(next, hidden); return next;
    });
  };
  const toggle = (id: string) => {
    setHidden((prev) => { const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]; persist(order, next); return next; });
  };

  const visible = order.filter((id) => !hidden.includes(id)).map((id) => TRAFFIC_METRICS.find((m) => m.id === id)!).filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Connect GA4 banner */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 8, background: "var(--fc-surface)", border: "1px solid rgba(66,133,244,0.2)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Plug style={{ width: 16, height: 16, color: "#4285F4", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--fc-text-secondary)" }}>
            Análisis de tráfico para <strong style={{ color: "var(--fc-text)" }}>{project.website || "el sitio"}</strong>.{" "}
            {connected
              ? <>Datos de <strong style={{ color: "var(--fc-success)" }}>GA4</strong> · últimos 28 días.</>
              : <>Conecta <strong>GA4</strong> en Integraciones ? Google para poblar las métricas.</>}
          </span>
        </div>
        <button onClick={() => setShowForm((s) => !s)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, background: "var(--surface-hover)", border: "1px solid var(--hairline)", color: "var(--fc-text)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
          <Settings style={{ width: 13, height: 13 }} /> Orden de datos
        </button>
      </div>

      {/* Data-request order form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ fontSize: 12, color: "var(--fc-text-secondary)", marginBottom: 12 }}>Define qué métricas mostrar y en qué orden (se guarda por proyecto).</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {order.map((id, i) => {
              const m = TRAFFIC_METRICS.find((x) => x.id === id); if (!m) return null;
              const shown = !hidden.includes(id);
              return (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 6, background: "var(--fc-surface)", border: "1px solid var(--hairline)" }}>
                  <button onClick={() => toggle(id)} style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, border: shown ? "none" : "1.5px solid rgba(255,255,255,0.25)", background: shown ? "#4285F4" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    {shown && <Check style={{ width: 12, height: 12, color: "var(--fc-text)" }} />}
                  </button>
                  <span style={{ flex: 1, fontSize: 13, color: shown ? "var(--fc-text)" : "var(--fc-text-muted)" }}>{m.label}</span>
                  <span style={{ fontSize: 10, color: "var(--fc-text-secondary)" }}>#{i + 1}</span>
                  <button onClick={() => move(id, -1)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "var(--fc-text-secondary)" : "var(--fc-text-secondary)", padding: 2 }}><ChevronUp style={{ width: 14, height: 14 }} /></button>
                  <button onClick={() => move(id, 1)} disabled={i === order.length - 1} style={{ background: "none", border: "none", cursor: i === order.length - 1 ? "default" : "pointer", color: i === order.length - 1 ? "var(--fc-text-secondary)" : "var(--fc-text-secondary)", padding: 2 }}><ChevronDown style={{ width: 14, height: 14 }} /></button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Base metrics (empty until GA4 connected) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {visible.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.id} className="glass-panel" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                <Icon style={{ width: 14, height: 14, color: m.color }} />
                <span style={{ fontSize: 10, color: "var(--fc-text-muted)", fontWeight: 600 }}>{m.label}</span>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: m.color }}>
                {trafficLoading ? "…" : connected ? fmtMetric(m.id, metrics) : "—"}
              </div>
              <div style={{ fontSize: 9, color: "var(--fc-text-secondary)", marginTop: 4 }}>{connected ? "Últimos 28 días" : "Conecta GA4"}</div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="section-header"><span className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}><Globe style={{ width: 14, height: 14 }} /> Fuentes de tráfico</span></div>
        <div style={{ padding: 24, textAlign: "center", color: "var(--fc-text-secondary)", fontSize: 12 }}>
          {connected
            ? "Desglose por fuente/medio (sessionSource) — próxima iteración."
            : "Disponible al conectar Google Analytics 4 / Tag Manager."}
        </div>
      </div>
    </div>
  );
}
