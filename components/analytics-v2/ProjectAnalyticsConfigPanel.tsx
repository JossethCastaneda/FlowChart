"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { RefreshCw, PlugZap, AlertTriangle, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";

// ============================================================================
// Pestaña "Configuración" de Proyectos > Análisis de Resultados (goal §10).
// Self-contained: consume GET/POST /api/projects/[id]/analytics/sync. Surte
// canales configurados, proveedores/integraciones, modo de conexión, último
// sync por integración (estado/errores/contadores), alertas abiertas, sync
// manual y accesos directos a reglas/metas/funnels. No expone credenciales.
// ============================================================================

interface SyncJob {
  id: string;
  provider: string;
  status: string;
  recordsInserted: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  startDate: string;
  endDate: string;
}

interface ConfigData {
  projectId: string;
  clientId: string | null;
  channels: string[];
  providers: string[];
  integrations: { id: string; provider: string; normalizedProvider: string | null; connected: boolean }[];
  recentJobs: SyncJob[];
  openAlerts: number;
}

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  messenger: "Messenger",
  webchat: "Web Chat",
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    completed: { color: "#22c55e", icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Completado" },
    failed: { color: "#ef4444", icon: <XCircle className="w-3.5 h-3.5" />, label: "Fallido" },
    running: { color: "#eab308", icon: <Clock className="w-3.5 h-3.5" />, label: "En curso" },
    pending: { color: "#94a3b8", icon: <Clock className="w-3.5 h-3.5" />, label: "Pendiente" },
  };
  const s = map[status] || { color: "#94a3b8", icon: null, label: status };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: s.color, fontSize: 12 }}>
      {s.icon} {s.label}
    </span>
  );
}

async function fetchConfig(projectId: string): Promise<ConfigData> {
  const res = await fetch(`/api/projects/${projectId}/analytics/sync`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "No se pudo cargar la configuración");
  return json.data ?? json;
}

export function ProjectAnalyticsConfigPanel({ projectId }: { projectId: string }) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // react-query: sin efectos manuales ni setState en effect (lint-clean + idiomático).
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["project-analytics-config", projectId],
    queryFn: () => fetchConfig(projectId),
  });

  const runSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/analytics/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo sincronizar");
      const jobs = (json.data ?? json)?.jobs ?? [];
      const inserted = jobs.reduce((a: number, j: { recordsInserted: number }) => a + (j.recordsInserted || 0), 0);
      setSyncMsg(`Sincronización lanzada: ${jobs.length} integración(es), ${inserted} registros.`);
      await refetch();
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : "Error al sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  if (isLoading) return <div className="glass-panel" style={{ padding: 32, textAlign: "center", color: "#64748b" }}>Cargando configuración…</div>;
  if (error) return <div className="glass-panel" style={{ padding: 32, textAlign: "center", color: "#ef4444" }}>{error instanceof Error ? error.message : "Error"}</div>;
  if (!data) return null;

  const card: React.CSSProperties = { padding: 20 };
  const label: React.CSSProperties = { fontSize: 11, letterSpacing: "0.15em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 10 };
  const chip: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: "rgba(148,163,184,0.12)", fontSize: 12, color: "#cbd5e1", marginRight: 8, marginBottom: 8 };

  return (
    <div className="space-y-4">
      {/* Canales + proveedores */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        <div className="glass-panel" style={card}>
          <div style={label}>Canales configurados</div>
          {data.channels.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 12 }}>Sin canales configurados.</p>
          ) : (
            data.channels.map((c) => <span key={c} style={chip}>{CHANNEL_LABEL[c] || c}</span>)
          )}
        </div>
        <div className="glass-panel" style={card}>
          <div style={label}>Integraciones / proveedores</div>
          {data.integrations.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 12 }}>Sin integraciones de analítica vinculadas.</p>
          ) : (
            data.integrations.map((i) => (
              <span key={i.id} style={chip}>
                <PlugZap className="w-3.5 h-3.5" style={{ color: i.connected ? "#22c55e" : "#94a3b8" }} />
                {i.normalizedProvider || i.provider} · {i.connected ? "conectado" : "desconectado"}
              </span>
            ))
          )}
        </div>
        <div className="glass-panel" style={card}>
          <div style={label}>Estado</div>
          <p style={{ fontSize: 12, color: "#cbd5e1" }}>
            Cliente: <strong>{data.clientId || "—"}</strong>
          </p>
          <p style={{ fontSize: 12, color: data.openAlerts > 0 ? "#eab308" : "#22c55e", marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6 }}>
            {data.openAlerts > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {data.openAlerts} alerta(s) abierta(s)
          </p>
        </div>
      </div>

      {/* Sync manual */}
      <div className="glass-panel" style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={label}>Sincronización manual</div>
            <p style={{ fontSize: 12, color: "#64748b" }}>Trae los últimos 7 días de los proveedores configurados (idempotente).</p>
          </div>
          <button
            className="btn-primary"
            onClick={runSync}
            disabled={syncing || data.integrations.length === 0}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, opacity: syncing || data.integrations.length === 0 ? 0.6 : 1 }}
          >
            <RefreshCw className="w-4 h-4" style={{ animation: syncing ? "spin 1s linear infinite" : undefined }} />
            {syncing ? "Sincronizando…" : "Sincronizar ahora"}
          </button>
        </div>
        {syncMsg && <p style={{ fontSize: 12, color: "#cbd5e1", marginTop: 12 }}>{syncMsg}</p>}
      </div>

      {/* Último sync / historial */}
      <div className="glass-panel" style={card}>
        <div style={label}>Últimas sincronizaciones</div>
        {data.recentJobs.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 12 }}>Aún no hay sincronizaciones registradas.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ color: "#94a3b8", textAlign: "left" }}>
                  <th style={{ padding: "6px 8px" }}>Proveedor</th>
                  <th style={{ padding: "6px 8px" }}>Estado</th>
                  <th style={{ padding: "6px 8px" }}>Registros</th>
                  <th style={{ padding: "6px 8px" }}>Inicio</th>
                  <th style={{ padding: "6px 8px" }}>Error</th>
                </tr>
              </thead>
              <tbody>
                {data.recentJobs.map((j) => (
                  <tr key={j.id} style={{ borderTop: "1px solid rgba(148,163,184,0.12)", color: "#cbd5e1" }}>
                    <td style={{ padding: "6px 8px" }}>{j.provider}</td>
                    <td style={{ padding: "6px 8px" }}><StatusBadge status={j.status} /></td>
                    <td style={{ padding: "6px 8px" }}>{j.recordsInserted}</td>
                    <td style={{ padding: "6px 8px" }}>{new Date(j.startedAt).toLocaleString()}</td>
                    <td style={{ padding: "6px 8px", color: "#ef4444", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.errorMessage || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Accesos directos a configuración avanzada */}
      <div className="glass-panel" style={card}>
        <div style={label}>Configuración avanzada</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/dashboard/analisis-resultados/reglas" style={chip}>Reglas de outcome <ExternalLink className="w-3 h-3" /></Link>
          <Link href="/dashboard/analisis-resultados/configuracion" style={chip}>Integraciones / metas <ExternalLink className="w-3 h-3" /></Link>
        </div>
        <p style={{ fontSize: 11, color: "#64748b", marginTop: 10 }}>
          Metas/semáforos, ROI, costos, moneda, funnels y alertas se gestionan vía API (`kpi-targets`, `roi`, `funnels`, `alerts`) con
          prioridad proyecto &gt; workspace &gt; default. Las exportaciones (CSV/XLSX/JSON) están disponibles desde el dashboard con PII enmascarada y audit log.
        </p>
      </div>
    </div>
  );
}
