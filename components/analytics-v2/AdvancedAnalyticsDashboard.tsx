"use client";

import React, { useState, useMemo } from "react";
import { Download, RefreshCw, BarChart2, MessageSquare, User, TrendingUp, Target, Activity, DollarSign, Filter, LayoutDashboard, Database, ShieldCheck } from "lucide-react";
import { TabOperation } from "./tabs/TabOperation";
import { TabQuality } from "./tabs/TabQuality";
import { TabRoi } from "./tabs/TabRoi";
import {
  TabResumen, TabConversations, TabAgents, TabCampaigns, TabServices, TabFunnels, TabDataQuality, TabAudit,
} from "./tabs/DataTabs";
import { useAnalyticsData } from "./useAnalyticsData";
import { CHANNEL_LABELS, PROVIDER_LABELS } from "@/lib/analytics/project-scope";

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
  comparePeriod: boolean;
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
];

const OVERVIEW_TABS = new Set(["operacion", "calidad", "roi"]);

export interface AdvancedAnalyticsDashboardProps {
  /** Si se pasa, todo el dashboard queda acotado a este proyecto (provider+canal). */
  projectId?: string;
  /** Canales configurados en el proyecto; restringe el selector de canal. */
  availableChannels?: string[];
  /** Proveedores configurados en el proyecto; restringe el selector de plataforma. */
  availableProviders?: string[];
}

export function AdvancedAnalyticsDashboard({
  projectId,
  availableChannels,
  availableProviders,
}: AdvancedAnalyticsDashboardProps = {}) {
  const [activeTab, setActiveTab] = useState("resumen");
  const [nonce, setNonce] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: "28d", platform: "all", botId: "all", channel: "all", agent: "all",
    queue: "all", skill: "all", campaign: "all", service: "all", tag: "all",
    outcome: "all", comparePeriod: false,
  });

  // Query string compartido. El nonce permite forzar refetch sin setState en efecto.
  const query = useMemo(() => {
    const days = filters.dateRange.replace("d", "");
    const provider = filters.platform === "compare" ? "all" : filters.platform;
    const params: Record<string, string> = { days, provider, channel: filters.channel, outcome: filters.outcome, _: String(nonce) };
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

  const overviewEndpoint = OVERVIEW_TABS.has(activeTab) ? "/api/analytics/overview" : null;
  const { data, loading, error } = useAnalyticsData<OverviewData>(overviewEndpoint, query);

  const handleExport = () => {
    window.open(`/api/analytics/export?type=conversations&format=csv&${query}`, "_blank");
  };

  const set = (patch: Partial<FilterState>) => setFilters((f) => ({ ...f, ...patch }));

  return (
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
          <select value={filters.outcome} onChange={(e) => set({ outcome: e.target.value })} className="bg-black/20 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none">
            <option value="all">Cualquier resultado</option>
            <option value="resolved">Resuelto</option>
            <option value="transferred">Transferido</option>
            <option value="abandoned">Abandonado</option>
            <option value="unclassified">Sin clasificar</option>
          </select>
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
        {activeTab === "resumen" && <TabResumen query={query} />}
        {activeTab === "conversaciones" && <TabConversations query={query} />}
        {activeTab === "agentes" && <TabAgents query={query} />}
        {activeTab === "campanas" && <TabCampaigns query={query} />}
        {activeTab === "servicios" && <TabServices query={query} />}
        {activeTab === "funnels" && <TabFunnels query={query} />}
        {activeTab === "calidad-datos" && <TabDataQuality query={query} />}
        {activeTab === "auditoria" && <TabAudit query={query} />}

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
  );
}
