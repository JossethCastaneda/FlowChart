"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { MessageSquare, Bot, User, Clock, DollarSign, Database, ShieldCheck, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { KpiTooltipCard } from "../KpiTooltipCard";
import { useAnalyticsData } from "../useAnalyticsData";
import { useAnalyticsScope } from "../AnalyticsScopeContext";

// ── Helpers de estado compartidos ───────────────────────────────────────────
const card = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px" } as const;

function State({ kind, msg }: { kind: "loading" | "empty" | "error"; msg?: string }) {
  const color = kind === "error" ? "#f87171" : "#64748b";
  return (
    <div style={{ ...card, padding: "48px", textAlign: "center", color }}>
      <p style={{ fontSize: "14px", margin: 0 }}>
        {kind === "loading" ? "Cargando datos…" : kind === "error" ? msg || "Error" : "Sin datos para estos filtros."}
      </p>
    </div>
  );
}

interface Col<T> { key: string; label: string; render?: (row: T) => React.ReactNode }
function DataTable<T extends Record<string, unknown>>({ columns, rows }: { columns: Col<T>[]; rows: T[] }) {
  return (
    <div style={{ ...card, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#94a3b8" }}>
            {columns.map((c) => <th key={c.key} style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", whiteSpace: "nowrap" }}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ color: "#e2e8f0" }}>
              {columns.map((c) => (
                <td key={c.key} style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)", whiteSpace: "nowrap" }}>
                  {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tooltipStyle = { backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" };
const fmtSec = (s: number | null | undefined) => (s == null ? "—" : `${Math.round(s)}s`);
const pct = (n: number | null | undefined) => (n == null ? "—" : `${n.toFixed(1)}%`);

// ── Resumen (spec §18) ───────────────────────────────────────────────────────
export function TabResumen({ query, base = "/api/analytics" }: { query: string; base?: string }) {
  type Kpis = { totalConversations: number; containmentRate: number; handoffRate: number; avgCsat: number | null; avgFrtSeconds: number; avgAhtSeconds: number; estimatedRoiSaved: number };
  type Overview = {
    kpis: Kpis;
    charts: { topChannels: { name: string; count: number }[]; trends: { date: string; total: number; botResolved: number; handoffs: number }[] };
    comparison?: { previous: Kpis; deltas: Record<string, number> } | null;
  };
  const { data, loading, error } = useAnalyticsData<Overview>(`${base}/overview`, query);
  if (loading && !data) return <State kind="loading" />;
  if (error) return <State kind="error" msg={error} />;
  if (!data || data.kpis.totalConversations === 0) return <State kind="empty" />;
  const k = data.kpis;
  const d = data.comparison?.deltas;
  // Delta vs periodo anterior como subtítulo (signo + unidad). Solo si compare=1.
  const deltaNum = (key: string) => (d ? `${d[key] >= 0 ? "▲ +" : "▼ "}${Math.round(d[key]).toLocaleString()} vs periodo ant.` : undefined);
  const deltaPp = (key: string) => (d ? `${d[key] >= 0 ? "▲ +" : "▼ "}${d[key].toFixed(1)} pp vs ant.` : undefined);
  const deltaPt = (key: string) => (d ? `${d[key] >= 0 ? "▲ +" : "▼ "}${d[key].toFixed(1)} vs ant.` : undefined);
  const deltaMoney = (key: string) => (d ? `${d[key] >= 0 ? "▲ +$" : "▼ -$"}${Math.abs(Math.round(d[key])).toLocaleString()} vs ant.` : undefined);
  return (
    <div className="space-y-6">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        <KpiTooltipCard title="Conversaciones" value={k.totalConversations.toLocaleString()} sub={deltaNum("totalConversations")} icon={MessageSquare} color="#3b82f6" />
        <KpiTooltipCard title="Contención real" value={pct(k.containmentRate)} sub={deltaPp("containmentRate")} icon={Bot} color="#10b981" formulaDef="Resueltas por bot / cerradas" trafficLight={{ value: k.containmentRate, thresholds: { good: 70, warning: 50 }, isHigherBetter: true }} />
        <KpiTooltipCard title="Escalamiento" value={pct(k.handoffRate)} sub={deltaPp("handoffRate")} icon={User} color="#f59e0b" trafficLight={{ value: k.handoffRate, thresholds: { good: 15, warning: 30 }, isHigherBetter: false }} />
        <KpiTooltipCard title="CSAT" value={k.avgCsat ? k.avgCsat.toFixed(1) : "N/A"} sub={deltaPt("avgCsat")} icon={ShieldCheck} color="#06b6d4" trafficLight={{ value: k.avgCsat || 0, thresholds: { good: 4.2, warning: 3.8 }, isHigherBetter: true }} />
        <KpiTooltipCard title="FRT" value={fmtSec(k.avgFrtSeconds)} sub={deltaNum("avgFrtSeconds")} icon={Clock} color="#8b5cf6" />
        <KpiTooltipCard title="ROI estimado" value={`$${Math.round(k.estimatedRoiSaved).toLocaleString()}`} sub={deltaMoney("estimatedRoiSaved")} icon={DollarSign} color="#10b981" />
      </div>
      <div style={card}>
        <h3 className="text-white text-sm font-bold mb-4">Evolución diaria (Bot vs Agente)</h3>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.charts.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs><linearGradient id="cT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickFormatter={(v) => String(v).substring(5)} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#cT)" name="Totales" />
              <Line type="monotone" dataKey="botResolved" stroke="#10b981" strokeWidth={2} dot={false} name="Resueltas por bot" />
              <Line type="monotone" dataKey="handoffs" stroke="#f59e0b" strokeWidth={2} dot={false} name="Escaladas" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Conversaciones (spec §20) ────────────────────────────────────────────────
export function TabConversations({ query, base = "/api/analytics" }: { query: string; base?: string }) {
  type Resp = { conversations: Record<string, unknown>[]; pagination: { total: number } };
  const { data, loading, error } = useAnalyticsData<Resp>(`${base}/conversations`, query);
  if (loading && !data) return <State kind="loading" />;
  if (error) return <State kind="error" msg={error} />;
  if (!data || data.conversations.length === 0) return <State kind="empty" />;
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">{data.pagination.total.toLocaleString()} conversaciones (PII enmascarada)</p>
      <DataTable
        rows={data.conversations}
        columns={[
          { key: "startedAt", label: "Fecha", render: (r) => String(r.startedAt).substring(0, 10) },
          { key: "provider", label: "Plataforma" },
          { key: "channel", label: "Canal" },
          { key: "customer", label: "Cliente" },
          { key: "status", label: "Estado" },
          { key: "outcome", label: "Outcome" },
          { key: "resolvedBy", label: "Resuelto por" },
          { key: "wasBotOnly", label: "Bot-only", render: (r) => (r.wasBotOnly ? "Sí" : "No") },
          { key: "csatScore", label: "CSAT" },
          { key: "actions", label: "Acciones", render: (r) => (
            <button style={{ background: "transparent", border: "1px solid rgba(0,212,255,0.3)", color: "#00d4ff", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}>
              Ver Detalle
            </button>
          )},
        ]}
      />
    </div>
  );
}

// ── Agentes (spec §21) ───────────────────────────────────────────────────────
export function TabAgents({ query, base = "/api/analytics" }: { query: string; base?: string }) {
  type Resp = { agents: Record<string, unknown>[] };
  const { data, loading, error } = useAnalyticsData<Resp>(`${base}/agents`, query);
  if (loading && !data) return <State kind="loading" />;
  if (error) return <State kind="error" msg={error} />;
  if (!data || data.agents.length === 0) return <State kind="empty" />;
  return (
    <DataTable
      rows={data.agents}
      columns={[
        { key: "agentName", label: "Agente" },
        { key: "handled", label: "Atendidas" },
        { key: "closed", label: "Cerradas" },
        { key: "transfers", label: "Transferencias" },
        { key: "avgFrt", label: "FRT", render: (r) => fmtSec(r.avgFrt as number) },
        { key: "avgAht", label: "AHT", render: (r) => fmtSec(r.avgAht as number) },
        { key: "avgCsat", label: "CSAT", render: (r) => (r.avgCsat == null ? "—" : (r.avgCsat as number).toFixed(1)) },
      ]}
    />
  );
}

// ── Campañas (spec §22) ──────────────────────────────────────────────────────
export function TabCampaigns({ query, base = "/api/analytics" }: { query: string; base?: string }) {
  type Resp = { campaigns: Record<string, unknown>[] };
  const { data, loading, error } = useAnalyticsData<Resp>(`${base}/campaigns`, query);
  if (loading && !data) return <State kind="loading" />;
  if (error) return <State kind="error" msg={error} />;
  if (!data || data.campaigns.length === 0) return <State kind="empty" />;
  return (
    <DataTable
      rows={data.campaigns}
      columns={[
        { key: "campaignId", label: "Campaña" },
        { key: "conversationsStarted", label: "Iniciadas" },
        { key: "replied", label: "Respondidas" },
        { key: "conversions", label: "Conversiones" },
        { key: "responseRate", label: "Tasa respuesta", render: (r) => pct(r.responseRate as number) },
      ]}
    />
  );
}

// ── Servicios (spec §23) ─────────────────────────────────────────────────────
export function TabServices({ query, base = "/api/analytics" }: { query: string; base?: string }) {
  type Resp = { services: Record<string, unknown>[] };
  const { data, loading, error } = useAnalyticsData<Resp>(`${base}/services`, query);
  if (loading && !data) return <State kind="loading" />;
  if (error) return <State kind="error" msg={error} />;
  if (!data || data.services.length === 0) return <State kind="empty" />;
  return (
    <DataTable
      rows={data.services}
      columns={[
        { key: "serviceId", label: "Servicio" },
        { key: "started", label: "Iniciados" },
        { key: "completed", label: "Completados" },
        { key: "failed", label: "Fallidos" },
        { key: "conversionRate", label: "Conversión", render: (r) => pct(r.conversionRate as number) },
        { key: "avgCompletionSeconds", label: "T. promedio", render: (r) => fmtSec(r.avgCompletionSeconds as number) },
      ]}
    />
  );
}

// ── Funnels (spec §24) ───────────────────────────────────────────────────────
type FunnelAvailable = { id: string; name: string; steps: number };
type FunnelResp = {
  mode: string;
  name?: string;
  steps: { name: string; count: number; conversionFromPrev?: number }[];
  available: FunnelAvailable[];
};

export function TabFunnels({ query, base = "/api/analytics" }: { query: string; base?: string }) {
  const scope = useAnalyticsScope();
  const [selectedId, setSelectedId] = useState("");
  const [showBuilder, setShowBuilder] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const funnelQuery = `${query}&_fb=${reloadNonce}${selectedId ? `&funnelId=${encodeURIComponent(selectedId)}` : ""}`;
  const { data, loading, error } = useAnalyticsData<FunnelResp>(`${base}/funnels`, funnelQuery);

  const available = data?.available ?? [];

  return (
    <div className="space-y-4">
      <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>Funnel:</span>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="bg-black/20 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none">
            <option value="">Canónico (bot → resolución)</option>
            {available.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.steps} pasos)</option>)}
          </select>
        </div>
        <button onClick={() => setShowBuilder((s) => !s)} style={{ background: showBuilder ? "rgba(255,255,255,0.05)" : "var(--cyan)", color: showBuilder ? "#94a3b8" : "#0f172a", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <Plus className="w-3.5 h-3.5" /> {showBuilder ? "Cerrar" : "Crear funnel"}
        </button>
      </div>

      {showBuilder && (
        <FunnelBuilder
          projectId={scope.projectId}
          onSaved={() => { setShowBuilder(false); setReloadNonce((n) => n + 1); }}
        />
      )}

      {loading && !data ? <State kind="loading" />
        : error ? <State kind="error" msg={error} />
        : !data || data.steps.length === 0 ? <State kind="empty" />
        : (
          <div style={card}>
            <h3 className="text-white text-sm font-bold mb-4">
              {selectedId ? data.name || "Funnel configurado" : "Funnel de conversión (bot → resolución)"}
            </h3>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.steps} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={110} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [String(value), "Conversaciones"]} />
                  <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
    </div>
  );
}

const CONDITION_TYPES: { value: string; label: string }[] = [
  { value: "intent", label: "Intención" },
  { value: "event", label: "Evento" },
  { value: "message_text", label: "Texto de mensaje" },
  { value: "tag", label: "Etiqueta" },
  { value: "status", label: "Estado" },
];

// Constructor de funnels personalizados: define una secuencia ordenada de pasos
// (condición sobre intención/evento/texto/etiqueta/estado). Guarda vía el CRUD
// global (admin) con projectId explícito para acotar el funnel al proyecto.
function FunnelBuilder({ projectId, onSaved }: { projectId?: string; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<{ name: string; conditionType: string; conditionValue: string }[]>([
    { name: "", conditionType: "intent", conditionValue: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const setStep = (i: number, patch: Partial<{ name: string; conditionType: string; conditionValue: string }>) =>
    setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, ...patch } : st)));

  const save = async () => {
    if (!name.trim() || steps.some((s) => !s.name.trim() || !s.conditionValue.trim())) {
      alert("Completa el nombre del funnel y de cada paso (nombre + valor de condición).");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        projectId: projectId || undefined,
        steps: steps.map((s, i) => ({ name: s.name.trim(), orderIndex: i, conditionType: s.conditionType, conditionValue: s.conditionValue.trim() })),
      };
      const res = await fetch(`/api/analytics/funnels`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        setName("");
        setSteps([{ name: "", conditionType: "intent", conditionValue: "" }]);
        onSaved();
      } else {
        const e = await res.json().catch(() => ({}));
        alert("No se pudo crear el funnel: " + (e.error || "Desconocido"));
      }
    } catch {
      alert("Fallo al contactar al servidor.");
    } finally {
      setSaving(false);
    }
  };

  const inp: React.CSSProperties = { background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 12, borderRadius: 6, padding: "6px 8px", outline: "none" };

  return (
    <div style={card}>
      <h3 className="text-white text-sm font-bold mb-3">Nuevo funnel personalizado</h3>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del funnel (p. ej. Captura de datos)" style={{ ...inp, width: "100%", marginBottom: 12 }} />
      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "24px 1fr 150px 1fr 32px", gap: 8, alignItems: "center" }}>
            <span style={{ color: "#64748b", fontSize: 12, textAlign: "center" }}>{i + 1}</span>
            <input value={s.name} onChange={(e) => setStep(i, { name: e.target.value })} placeholder="Nombre del paso" style={inp} />
            <select value={s.conditionType} onChange={(e) => setStep(i, { conditionType: e.target.value })} style={inp}>
              {CONDITION_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input value={s.conditionValue} onChange={(e) => setStep(i, { conditionValue: e.target.value })} placeholder="Valor de la condición" style={inp} />
            <button onClick={() => setSteps((st) => st.length > 1 ? st.filter((_, idx) => idx !== i) : st)} disabled={steps.length === 1} title="Eliminar paso" style={{ background: "transparent", border: "none", color: steps.length === 1 ? "#475569" : "#f87171", cursor: steps.length === 1 ? "not-allowed" : "pointer" }}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={() => setSteps((s) => [...s, { name: "", conditionType: "intent", conditionValue: "" }])} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1", borderRadius: 8, padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <Plus className="w-3.5 h-3.5" /> Agregar paso
        </button>
        <button onClick={save} disabled={saving} style={{ background: "var(--cyan)", color: "#0f172a", border: "none", borderRadius: 8, padding: "6px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          {saving ? "Guardando…" : "Guardar funnel"}
        </button>
      </div>
    </div>
  );
}

// ── Calidad de datos (spec §27) ──────────────────────────────────────────────
export function TabDataQuality({ query, base = "/api/analytics" }: { query: string; base?: string }) {
  type Resp = { summary: { total: number; bySeverity: { info: number; warning: number; critical: number } }; issues: Record<string, unknown>[] };
  const { data, loading, error } = useAnalyticsData<Resp>(`${base}/data-quality`, query);
  if (loading && !data) return <State kind="loading" />;
  if (error) return <State kind="error" msg={error} />;
  if (!data) return <State kind="empty" />;
  return (
    <div className="space-y-4">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <KpiTooltipCard title="Issues totales" value={data.summary.total} icon={Database} color="#64748b" />
        <KpiTooltipCard title="Críticos" value={data.summary.bySeverity.critical} icon={AlertTriangle} color="#ef4444" />
        <KpiTooltipCard title="Advertencias" value={data.summary.bySeverity.warning} icon={AlertTriangle} color="#f59e0b" />
        <KpiTooltipCard title="Info" value={data.summary.bySeverity.info} icon={ShieldCheck} color="#3b82f6" />
      </div>
      {data.issues.length === 0 ? <State kind="empty" /> : (
        <DataTable
          rows={data.issues}
          columns={[
            { key: "issueType", label: "Tipo" },
            { key: "severity", label: "Severidad" },
            { key: "provider", label: "Proveedor" },
            { key: "details", label: "Detalle" },
          ]}
        />
      )}
    </div>
  );
}

// ── Auditoría (spec §31) ─────────────────────────────────────────────────────
export function TabAudit({ query, base = "/api/analytics" }: { query: string; base?: string }) {
  type Resp = { logs: Record<string, unknown>[]; pagination: { total: number } };
  const { data, loading, error } = useAnalyticsData<Resp>(`${base}/audit-logs`, query);
  if (loading && !data) return <State kind="loading" />;
  if (error) return <State kind="error" msg={error} />;
  if (!data || data.logs.length === 0) return <State kind="empty" />;
  return (
    <DataTable
      rows={data.logs}
      columns={[
        { key: "createdAt", label: "Fecha", render: (r) => String(r.createdAt).substring(0, 19).replace("T", " ") },
        { key: "action", label: "Acción" },
        { key: "resourceType", label: "Recurso" },
        { key: "userId", label: "Usuario" },
      ]}
    />
  );
}
