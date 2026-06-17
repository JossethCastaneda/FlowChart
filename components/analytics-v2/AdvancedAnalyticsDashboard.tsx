"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Download, RefreshCw, BarChart2, MessageSquare, User, TrendingUp, Target, Activity, DollarSign, Filter, LayoutDashboard, Database, ShieldCheck, Settings } from "lucide-react";
import { TabOperation } from "./tabs/TabOperation";
import { TabQuality } from "./tabs/TabQuality";
import { TabRoi } from "./tabs/TabRoi";
import { TabConfig } from "./tabs/TabConfig";
import {
  TabResumen, TabConversations, TabAgents, TabCampaigns, TabServices, TabFunnels, TabDataQuality, TabAudit,
} from "./tabs/DataTabs";
import { useAnalyticsData } from "./useAnalyticsData";
import { CHANNEL_LABELS, PROVIDER_LABELS } from "@/lib/analytics/project-scope";
import { AnalyticsScopeProvider, type AnalyticsScope } from "./AnalyticsScopeContext";

export type FilterState = {
  dateRange: string;
  platform: string;
  botId: string;
  channel: string;
  agent: string;
  queue: string;
  skill: string;
  campaign: string;
  service: string;
  tag: string;
  outcome: string;
  status: string;
  resolvedBy: string;
  comparePeriod: boolean;
};

const INITIAL_FILTERS: FilterState = {
  dateRange: "28d", platform: "all", botId: "", channel: "all", agent: "",
  queue: "", skill: "", campaign: "", service: "", tag: "",
  outcome: "all", status: "all", resolvedBy: "all", comparePeriod: false,
};

type OverviewData = { kpis?: { totalConversations?: number } } & Record<string, unknown>;

const TABS = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "operacion", label: "Operación", icon: BarChart2 },
  { id: "conversaciones", label: "Conversaciones", icon: MessageSquare },
  { id: "agentes", label: "Agentes", icon: User },
  { id: "campanas", label: "Campañas", icon: TrendingUp },
  { id: "servicios", label: "Servicios", icon: Target },
  { id: "funnels", label: "Funnels", icon: Filter },
  { id: "calidad", label: "Calidad del Bot", icon: Activity },
  { id: "roi", label: "ROI", icon: DollarSign },
  { id: "calidad-datos", label: "Calidad de Datos", icon: Database },
  { id: "auditoria", label: "Auditoría", icon: ShieldCheck },
  { id: "configuracion", label: "Configuración", icon: Settings },
];

const OVERVIEW_TABS = new Set(["operacion", "calidad", "roi"]);

const inputCls = "bg-black/20 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none";

// Filtro de texto para otras dimensiones.
function TextFilter({ value, placeholder, onCommit }: { value: string; placeholder: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const commit = () => { const v = draft.trim(); if (v !== value) onCommit(v); };
  return (
    <input
      type="text"
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") { commit(); (e.target as HTMLInputElement).blur(); } }}
      className={inputCls}
    />
  );
}

// Select asíncrono para dimensiones de alta cardinalidad (bot, agente, campaña…)
function AsyncDimensionSelect({ 
  dimension, 
  value, 
  placeholder, 
  onChange, 
  baseQuery 
}: { 
  dimension: string; 
  value: string; 
  placeholder: string; 
  onChange: (v: string) => void; 
  baseQuery: string; 
}) {
  const q = baseQuery ? `${baseQuery}&dimension=${dimension}` : `dimension=${dimension}`;
  const { data: options } = useAnalyticsData<string[]>("/api/analytics/dimensions", q);
  
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      <option value="">{placeholder}</option>
      {(options || []).map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

export interface AdvancedAnalyticsDashboardProps {
  /** Si se pasa, todo el dashboard queda acotado a este proyecto (provider+canal). */
  projectId?: string;
  /** Cliente del proyecto (informativo; en este repo es un string del proyecto). */
  clientId?: string | null;
  /** Canales configurados en el proyecto; restringe el selector de canal. */
  availableChannels?: string[];
  /** Proveedores configurados en el proyecto; restringe el selector de plataforma. */
  availableProviders?: string[];
}

export function AdvancedAnalyticsDashboard({
  projectId,
  clientId,
  availableChannels,
  availableProviders,
}: AdvancedAnalyticsDashboardProps = {}) {
  const [activeTab, setActiveTab] = useState("resumen");
  const [nonce, setNonce] = useState(0);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  // Query string compartido. El nonce permite forzar refetch sin setState en efecto.
  // Solo se envían los filtros activos; "all"/"" se omiten (el backend los ignora).
  const query = useMemo(() => {
    const days = filters.dateRange.replace("d", "");
    const provider = filters.platform === "compare" ? "all" : filters.platform;
    const params: Record<string, string> = { days, _: String(nonce) };
    const put = (key: string, val: string) => { if (val && val !== "all") params[key] = val; };
    put("provider", provider);
    put("channel", filters.channel);
    put("outcome", filters.outcome);
    put("status", filters.status);
    put("resolvedBy", filters.resolvedBy);
    put("botId", filters.botId);
    put("agentId", filters.agent);
    put("queueName", filters.queue);
    put("skill", filters.skill);
    put("campaignId", filters.campaign);
    put("serviceId", filters.service);
    put("tag", filters.tag);
    if (filters.comparePeriod) params.compare = "1";
    if (projectId) params.projectId = projectId;
    return new URLSearchParams(params).toString();
  }, [filters, nonce, projectId]);

  // En modo proyecto, los selectores solo ofrecen lo configurado en el proyecto.
  const providerOptions = availableProviders && availableProviders.length > 0
    ? availableProviders
    : ["cari_ai", "botmaker"];
  const channelOptions = availableChannels && availableChannels.length > 0
    ? availableChannels
    : ["whatsapp", "webchat", "facebook", "instagram"];

  // En modo proyecto, las rutas anidadas derivan el projectId del path (canónicas).
  const base = projectId ? `/api/projects/${projectId}/analytics` : "/api/analytics";

  const analyticsScope: AnalyticsScope = useMemo(() => ({
    scope: projectId ? "project" : "global",
    projectId,
    clientId,
    allowedChannels: availableChannels,
    allowedProviders: availableProviders,
    base,
  }), [projectId, clientId, availableChannels, availableProviders, base]);

  const overviewEndpoint = OVERVIEW_TABS.has(activeTab) ? `${base}/overview` : null;
  const { data, loading, error } = useAnalyticsData<OverviewData>(overviewEndpoint, query);

  const handleExport = () => {
    window.open(`${base}/export?type=conversations&format=csv&${query}`, "_blank");
  };

  const set = (patch: Partial<FilterState>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <AnalyticsScopeProvider value={analyticsScope}>
    <div className="space-y-6">
      {/* FILTROS GLOBALES */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ color: "white", fontSize: "16px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
            <Filter className="w-4 h-4 text-cyan-400" /> Filtros Globales
          </h3>
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={handleExport} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", padding: "8px 12px", borderRadius: "8px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <Download className="w-3 h-3" /> Exportar CSV
            </button>
            <button onClick={() => setNonce((n) => n + 1)} style={{ background: "var(--cyan)", border: "none", color: "#0f172a", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Actualizar
            </button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
          <select value={filters.dateRange} onChange={(e) => set({ dateRange: e.target.value })} className="bg-black/20 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none">
            <option value="7d">Últimos 7 días</option>
            <option value="28d">Últimos 28 días</option>
            <option value="90d">Últimos 90 días</option>
          </select>
          <select value={filters.platform} onChange={(e) => set({ platform: e.target.value })} className="bg-black/20 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none">
            <option value="all">Todas las plataformas</option>
            {providerOptions.map((p) => (
              <option key={p} value={p}>{PROVIDER_LABELS[p] || p}</option>
            ))}
            {providerOptions.length > 1 && <option value="compare">Comparar plataformas</option>}
          </select>
          <select value={filters.channel} onChange={(e) => set({ channel: e.target.value })} className="bg-black/20 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none">
            <option value="all">Todos los canales</option>
            {channelOptions.map((c) => (
              <option key={c} value={c}>{CHANNEL_LABELS[c] || c}</option>
            ))}
          </select>
          <select value={filters.outcome} onChange={(e) => set({ outcome: e.target.value })} className={inputCls}>
            <option value="all">Cualquier resultado</option>
            <option value="resolved">Resuelto</option>
            <option value="transferred">Transferido</option>
            <option value="abandoned">Abandonado</option>
            <option value="unclassified">Sin clasificar</option>
            <option value="error">Error</option>
          </select>
          <select value={filters.status} onChange={(e) => set({ status: e.target.value })} className={inputCls}>
            <option value="all">Cualquier estado</option>
            <option value="active">Activa</option>
            <option value="closed">Cerrada</option>
            <option value="transferred">Transferida</option>
            <option value="abandoned">Abandonada</option>
          </select>
          <select value={filters.resolvedBy} onChange={(e) => set({ resolvedBy: e.target.value })} className={inputCls}>
            <option value="all">Resuelto por: cualquiera</option>
            <option value="bot">Bot</option>
            <option value="agent">Agente</option>
            <option value="mixed">Mixto</option>
          </select>
          <AsyncDimensionSelect dimension="botId" value={filters.botId} placeholder="Todos los Bots" onChange={(v) => set({ botId: v })} baseQuery={query} />
          <AsyncDimensionSelect dimension="campaignId" value={filters.campaign} placeholder="Todas las Campañas" onChange={(v) => set({ campaign: v })} baseQuery={query} />
          <AsyncDimensionSelect dimension="agentId" value={filters.agent} placeholder="Todos los Agentes" onChange={(v) => set({ agent: v })} baseQuery={query} />
          <TextFilter value={filters.service} placeholder="Servicio (id)…" onCommit={(v) => set({ service: v })} />
          <TextFilter value={filters.queue} placeholder="Cola…" onCommit={(v) => set({ queue: v })} />
          <TextFilter value={filters.skill} placeholder="Skill…" onCommit={(v) => set({ skill: v })} />
          <TextFilter value={filters.tag} placeholder="Tag…" onCommit={(v) => set({ tag: v })} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#e2e8f0", fontSize: "12px", cursor: "pointer" }}>
            <input type="checkbox" checked={filters.comparePeriod} onChange={(e) => set({ comparePeriod: e.target.checked })} style={{ accentColor: "var(--cyan)" }} />
            Comparar con periodo anterior
          </label>
          <button
            onClick={() => setFilters((f) => ({ ...INITIAL_FILTERS, dateRange: f.dateRange }))}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: "10px 16px", background: activeTab === tab.id ? "rgba(255,255,255,0.05)" : "transparent",
            border: "none", borderBottom: activeTab === tab.id ? "2px solid var(--cyan)" : "2px solid transparent",
            color: activeTab === tab.id ? "white" : "var(--text-secondary)", fontSize: "13px",
            fontWeight: activeTab === tab.id ? 600 : 500, cursor: "pointer", display: "flex",
            alignItems: "center", gap: "8px", whiteSpace: "nowrap",
          }}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENIDO */}
      <div style={{ minHeight: "400px" }}>
        {activeTab === "resumen" && <TabResumen query={query} base={base} />}
        {activeTab === "conversaciones" && <TabConversations query={query} base={base} />}
        {activeTab === "agentes" && <TabAgents query={query} base={base} />}
        {activeTab === "campanas" && <TabCampaigns query={query} base={base} />}
        {activeTab === "servicios" && <TabServices query={query} base={base} />}
        {activeTab === "funnels" && <TabFunnels query={query} base={base} />}
        {activeTab === "calidad-datos" && <TabDataQuality query={query} base={base} />}
        {activeTab === "auditoria" && <TabAudit query={query} base={base} />}
        {activeTab === "configuracion" && <TabConfig base={base} projectId={projectId} clientId={clientId} />}

        {OVERVIEW_TABS.has(activeTab) && (
          loading && !data ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: "#00d4ff" }} />
              <p style={{ fontSize: "14px" }}>Procesando KPIs…</p>
            </div>
          ) : error ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#f87171" }}>{error}</div>
          ) : !data || data.kpis?.totalConversations === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Sin resultados para estos filtros</div>
          ) : (
            <div className="animate-in fade-in duration-300">
              {activeTab === "operacion" && <TabOperation data={data} filters={filters} />}
              {activeTab === "calidad" && <TabQuality data={data} />}
              {activeTab === "roi" && <TabRoi data={data} />}
            </div>
          )
        )}
      </div>
    </div>
    </AnalyticsScopeProvider>
  );
}
