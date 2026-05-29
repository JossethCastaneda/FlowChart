"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Calendar, DollarSign, Target, MousePointerClick, 
  Eye, TrendingUp, Filter, BarChart2, Activity, Zap, CreditCard,
  CheckCircle, PauseCircle, Clock, Edit3, Save, X
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";
import DateRangePicker from "@/components/DateRangePicker";

/* ═══════════════════════════════════════
   TYPES
   ═══════════════════════════════════════ */

interface ChannelConfig {
  platformId: string;
  platformName: string;
  adAccounts: string[];
  budget: string;
  period: string;
  goal: string;
  cpr: string;
}

interface Project {
  id: string;
  alias: string;
  client: string;
  vertical: string;
  fanpage: string;
  instagram: string;
  whatsapp: string;
  website: string;
  channels: ChannelConfig[];
  dateStart: string;
  dateEnd: string;
  persona: string;
  geo: string;
  status: "Activo" | "Pausado" | "Draft" | "Completado";
  createdAt: string;
}

const STORAGE_KEY = "sodare_projects_v2";

const PLATFORMS = [
  { id: "meta",      name: "Meta Ads",            color: "#0081FB" },
  { id: "google",    name: "Google Ads",          color: "#4285F4" },
  { id: "tiktok",    name: "TikTok Ads",          color: "#25F4EE" },
  { id: "whatsapp",  name: "WhatsApp Business",   color: "#25D366" },
];

const STATUS_COLORS: Record<string, string> = {
  Activo: "emerald", Pausado: "amber", Draft: "muted", Completado: "cyan",
};

/* ═══════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════ */

export default function ProjectDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");
  const [activeTableTab, setActiveTableTab] = useState<"campaigns"|"adsets"|"ads">("campaigns");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Project>>({});
  
  // Insights State
  const [insights, setInsights] = useState<any>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Date Range State
  const [datePreset, setDatePreset] = useState<string>("maximum");
  const [dateStart, setDateStart] = useState<string>("");
  const [dateEnd, setDateEnd] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Account filter: "all" or a specific adAccountId
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [accountNames, setAccountNames] = useState<Record<string, string>>({});
  const [metaPages, setMetaPages] = useState<any[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const projects: Project[] = JSON.parse(raw);
      const found = projects.find(p => p.id === params.id);
      if (found) {
        setProject(found);
        setEditForm(found);
        if (found.channels.length > 0) {
          setActiveTab(found.channels[0].platformId);
        }
      } else {
        router.push("/dashboard/proyectos");
      }
    }
  }, [params.id, router]);

  // Fetch account names & Meta Pages details (picture, followers)
  useEffect(() => {
    fetch("/api/meta/adaccounts")
      .then(res => res.json())
      .then(data => {
        if (data.data && Array.isArray(data.data)) {
          const names: Record<string, string> = {};
          data.data.forEach((acc: any) => {
            const namePart = acc.name?.split(" — ")[0] || acc.id;
            names[acc.id] = namePart;
          });
          setAccountNames(names);
        }
      })
      .catch(() => {});

    fetch("/api/meta/pages")
      .then(res => res.json())
      .then(data => {
        if (data.data && Array.isArray(data.data)) {
          setMetaPages(data.data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!project || !activeTab) return;
    const channel = project.channels.find(c => c.platformId === activeTab);
    if (activeTab === "meta" && channel && channel.adAccounts && channel.adAccounts.length > 0) {
      setIsLoadingInsights(true);

      // Determine which accounts to fetch
      const accountsToFetch = selectedAccountId === "all" 
        ? channel.adAccounts 
        : [selectedAccountId];

      // Build date params
      let dateParams = "";
      if (dateStart && dateEnd) {
        dateParams = `&dateStart=${dateStart}&dateEnd=${dateEnd}`;
      } else if (datePreset && datePreset !== "custom") {
        dateParams = `&preset=${datePreset}`;
      }

      // Fetch all accounts in parallel
      const fetches = accountsToFetch.map(accId =>
        fetch(`/api/meta/insights?adAccountId=${accId}${dateParams}`)
          .then(res => res.json())
          .then(data => {
            if (data.error) {
              console.error(`Insights error for ${accId}:`, data.error);
              return null;
            }
            return data;
          })
          .catch(err => {
            console.error(`Insights fetch failed for ${accId}:`, err);
            return null;
          })
      );

      Promise.all(fetches).then(results => {
        const validResults = results.filter(Boolean);
        if (validResults.length === 0) {
          setInsights({ _error: "No se pudieron obtener datos de ninguna cuenta" });
        } else if (validResults.length === 1) {
          setInsights(validResults[0]);
        } else {
          // Merge results from multiple accounts
          const merged: any = {
            timeSeries: [],
            demographics: [],
            geo: [],
            campaigns: [],
            adsets: [],
            ads: [],
          };
          validResults.forEach((r: any) => {
            if (r.timeSeries) merged.timeSeries.push(...r.timeSeries);
            if (r.demographics) merged.demographics.push(...r.demographics);
            if (r.geo) merged.geo.push(...r.geo);
            if (r.campaigns) merged.campaigns.push(...r.campaigns);
            if (r.adsets) merged.adsets.push(...r.adsets);
            if (r.ads) merged.ads.push(...r.ads);
          });
          setInsights(merged);
        }
        setIsLoadingInsights(false);
      });
    } else {
      setInsights(null);
    }
  }, [project, activeTab, dateStart, dateEnd, datePreset, selectedAccountId]);

  const saveChanges = () => {
    if (!project) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      let projects: Project[] = JSON.parse(raw);
      const updated = { ...project, ...editForm } as Project;
      projects = projects.map(p => p.id === updated.id ? updated : p);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      setProject(updated);
      setIsEditing(false);
    }
  };

  if (!project) {
    return <div style={{ padding: "40px", textAlign: "center", color: "rgba(148,163,184,0.5)" }}>Cargando proyecto...</div>;
  }

  const activeChannelConfig = project.channels.find(c => c.platformId === activeTab);
  const activePl = PLATFORMS.find(p => p.id === activeTab) || PLATFORMS[0];

  // Helper: find the best "result" action from an actions array
  const RESULT_TYPES = ['lead', 'purchase', 'complete_registration', 'offsite_conversion', 'onsite_conversion', 'messaging_conversation_started_7d', 'omni_purchase', 'app_install', 'landing_page_view', 'link_click'];
  const findResultAction = (actions: any[] | undefined) => {
    if (!actions || actions.length === 0) return null;
    for (const t of RESULT_TYPES) {
      const found = actions.find((a: any) => a.action_type.includes(t));
      if (found) return found;
    }
    return actions[0]; // fallback: first available action
  };

  // Real Data Aggregation
  let totalSpend = 0;
  let totalResults = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalActionValue = 0;

  if (insights?.timeSeries) {
    insights.timeSeries.forEach((day: any) => {
      totalSpend += parseFloat(day.spend || "0");
      totalImpressions += parseInt(day.impressions || "0", 10);
      totalClicks += parseInt(day.clicks || "0", 10);
      
      const resultAction = findResultAction(day.actions);
      if (resultAction) totalResults += parseInt(resultAction.value, 10);

      const valueAction = findResultAction(day.action_values);
      if (valueAction) totalActionValue += parseFloat(valueAction.value);
    });
  }

  const cpa = totalResults > 0 ? totalSpend / totalResults : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const roas = totalSpend > 0 ? totalActionValue / totalSpend : 0;

  const budgetNum = activeChannelConfig ? parseFloat(activeChannelConfig.budget.replace(/[^0-9.]/g, "")) || 0 : 0;
  const spendProgress = budgetNum > 0 ? (totalSpend / budgetNum) * 100 : 0;

  // 1. Result Quality (Results vs CPA)
  const chartData = (insights?.timeSeries || [])
    .map((day: any) => {
      const s = parseFloat(day.spend || "0");
      const resultAction = findResultAction(day.actions);
      const r = resultAction ? parseInt(resultAction.value, 10) : 0;
      return {
        date: day.date_start ? day.date_start.split('-').reverse().slice(0, 2).join('/') : "",
        spend: parseFloat(s.toFixed(2)),
        results: r,
        cpa: r > 0 ? parseFloat((s / r).toFixed(2)) : 0
      };
    })
    .sort((a: any, b: any) => a.date.localeCompare(b.date));

  // 2. Traffic Quality (CTR vs CPC)
  const trafficChartData = (insights?.timeSeries || [])
    .map((day: any) => {
      const s = parseFloat(day.spend || "0");
      const i = parseInt(day.impressions || "0", 10);
      const c = parseInt(day.clicks || "0", 10);
      return {
        date: day.date_start ? day.date_start.split('-').reverse().slice(0, 2).join('/') : "",
        ctr: i > 0 ? parseFloat(((c / i) * 100).toFixed(2)) : 0,
        cpc: c > 0 ? parseFloat((s / c).toFixed(2)) : 0
      };
    })
    .sort((a: any, b: any) => a.date.localeCompare(b.date));

  // 3. Content Engagement (Top Ads)
  const creativeChartData = (insights?.ads || []).map((ad: any) => {
    const i = parseInt(ad.impressions || "0", 10);
    const c = parseInt(ad.clicks || "0", 10);
    const s = parseFloat(ad.spend || "0");
    return {
      name: (ad.ad_name || "Desconocido").substring(0, 20),
      clicks: c,
      spend: parseFloat(s.toFixed(2)),
      ctr: i > 0 ? parseFloat(((c / i) * 100).toFixed(2)) : 0,
    };
  }).sort((a: any, b: any) => b.spend - a.spend).slice(0, 5);

  // 4. Scaling Decisions (Top Adsets)
  const scalingChartData = (insights?.adsets || []).map((adset: any) => {
    const s = parseFloat(adset.spend || "0");
    const c = parseInt(adset.clicks || "0", 10);
    const resultAction = findResultAction(adset.actions);
    const r = resultAction ? parseInt(resultAction.value, 10) : 0;
    return {
      name: (adset.adset_name || "Desconocido").substring(0, 20),
      results: r,
      clicks: c,
      cpa: r > 0 ? parseFloat((s / r).toFixed(2)) : 0,
      spend: parseFloat(s.toFixed(2))
    };
  }).sort((a: any, b: any) => b.spend - a.spend).slice(0, 5);

  // 5. Strategic Replication (Winning Combo)
  const topCampaign = (insights?.campaigns || []).map((c: any) => {
    const s = parseFloat(c.spend || "0");
    const cl = parseInt(c.clicks || "0", 10);
    const resultAction = findResultAction(c.actions);
    const r = resultAction ? parseInt(resultAction.value, 10) : 0;
    return {
      name: c.campaign_name || "Desconocido",
      results: r,
      clicks: cl,
      spend: parseFloat(s.toFixed(2)),
      cpa: r > 0 ? parseFloat((s / r).toFixed(2)) : 0
    };
  }).sort((a: any, b: any) => b.spend - a.spend)[0];
  const topAdset = scalingChartData[0];

  // Demographics Mapping
  const ageDataMap: Record<string, any> = {};
  if (insights?.demographics) {
    insights.demographics.forEach((row: any) => {
      const age = row.age || "Desconocido";
      const gender = row.gender === "male" ? "Hombres" : row.gender === "female" ? "Mujeres" : "Otro";
      if (!ageDataMap[age]) ageDataMap[age] = { age, Hombres: 0, Mujeres: 0, Otro: 0 };
      ageDataMap[age][gender] += parseFloat(row.spend || "0");
    });
  }
  const ageChartData = Object.values(ageDataMap).sort((a: any, b: any) => a.age.localeCompare(b.age));

  // Geo Mapping
  let geoChartData: any[] = [];
  if (insights?.geo && Array.isArray(insights.geo)) {
    geoChartData = insights.geo.map((row: any) => ({
      region: row.region || "Desconocido",
      spend: parseFloat(row.spend || "0")
    })).sort((a: any, b: any) => b.spend - a.spend).slice(0, 5); // Top 5
  }

  // Define a loading overlay to show while fetching
  const renderLoadingOverlay = () => {
    if (!isLoadingInsights) return null;
    return (
      <div style={{
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        background: "rgba(10,15,30,0.6)", backdropFilter: "blur(4px)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        zIndex: 10, borderRadius: "inherit"
      }}>
        <div style={{ 
          width: "30px", height: "30px", border: "3px solid rgba(148,163,184,0.2)", 
          borderTopColor: "var(--cyan)", borderRadius: "50%", animation: "spin 1s linear infinite" 
        }} />
        <span style={{ marginTop: "10px", fontSize: "11px", color: "white", letterSpacing: "0.05em", textTransform: "uppercase" }}>Sincronizando Meta...</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 page-enter relative">
      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button 
            onClick={() => router.push("/dashboard/proyectos")}
            style={{ 
              width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(10,15,30,0.5)", border: "1px solid var(--border)", borderRadius: "8px",
              color: "rgba(148,163,184,0.7)", cursor: "pointer", transition: "all 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.color = "white"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,0.7)"}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "20px", fontWeight: 700, color: "white", letterSpacing: "0.05em" }}>
                {project.alias}
              </h1>
              {isEditing ? (
                <select 
                  value={editForm.status || project.status} 
                  onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                  style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--border)", color: "white", fontSize: "11px", padding: "2px 8px", borderRadius: "4px" }}
                >
                  <option value="Activo">Activo</option>
                  <option value="Pausado">Pausado</option>
                  <option value="Draft">Draft</option>
                  <option value="Completado">Completado</option>
                </select>
              ) : (
                <span className={`badge badge-${STATUS_COLORS[project.status]}`}>{project.status}</span>
              )}
            </div>
            <p style={{ fontSize: "12px", color: "rgba(148,163,184,0.6)", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>{project.vertical}</span>
              {project.client && <><span>•</span><span>{project.client}</span></>}
            </p>
          </div>
        </div>

        {/* Date Range Picker */}
        <DateRangePicker
          datePreset={datePreset}
          dateStart={dateStart}
          dateEnd={dateEnd}
          showDatePicker={showDatePicker}
          setShowDatePicker={setShowDatePicker}
          onPresetSelect={(preset: string) => {
            setDatePreset(preset);
            setDateStart("");
            setDateEnd("");
          }}
          onCustomRange={(start: string, end: string) => {
            setDatePreset("custom");
            setDateStart(start);
            setDateEnd(end);
          }}
        />
      </div>

      {/* ── HIGH-LEVEL KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
        {renderLoadingOverlay()}
        <KpiBox 
          title="Inversión" 
          value={new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalSpend)} 
          sub={`de ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(budgetNum)} (${project.channels.length ? project.channels[0].period : "Presupuesto"})`} 
          icon={<DollarSign className="w-4 h-4" />} 
          color="amber" 
          progress={spendProgress}
        />
        <KpiBox 
          title="Resultados" 
          value={totalResults.toString()} 
          sub={activeChannelConfig?.goal || "Objetivo principal"} 
          icon={<Target className="w-4 h-4" />} 
          color="emerald" 
        />
        <KpiBox 
          title="CPA Promedio" 
          value={new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cpa)} 
          sub="Costo por Adquisición" 
          icon={<Activity className="w-4 h-4" />} 
          color="cyan" 
        />
        <KpiBox 
          title="ROAS Estimado" 
          value={`${roas.toFixed(1)}x`} 
          sub="Retorno de inversión publicitaria" 
          icon={<TrendingUp className="w-4 h-4" />} 
          color="purple" 
        />
      </div>

      {/* ── CHANNEL TABS ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginTop: "32px" }}>
        {project.channels.map(ch => {
          const pl = PLATFORMS.find(p => p.id === ch.platformId) || PLATFORMS[0];
          const active = activeTab === ch.platformId;
          return (
            <button
              key={ch.platformId}
              onClick={() => setActiveTab(ch.platformId)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 16px", fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em",
                background: active ? `${pl.color}15` : "transparent",
                border: `1px solid ${active ? pl.color : "transparent"}`,
                color: active ? pl.color : "rgba(148,163,184,0.6)",
                borderRadius: "6px", cursor: "pointer", transition: "all 0.2s"
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: active ? pl.color : "rgba(148,163,184,0.4)" }} />
              {pl.name}
            </button>
          );
        })}

        {/* Account Filter */}
        {activeChannelConfig && activeChannelConfig.adAccounts && activeChannelConfig.adAccounts.length > 0 && (
          <select
            value={selectedAccountId}
            onChange={e => setSelectedAccountId(e.target.value)}
            style={{
              marginLeft: "auto",
              background: "rgba(10,15,30,0.6)", border: "1px solid var(--border)",
              color: "#e2e8f0", fontSize: "11px", padding: "6px 28px 6px 10px",
              borderRadius: "6px", cursor: "pointer",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
              fontWeight: 500, letterSpacing: "0.02em"
            }}
          >
            <option value="all">
              {activeChannelConfig.adAccounts.length === 1 
                ? (accountNames[activeChannelConfig.adAccounts[0]] || activeChannelConfig.adAccounts[0])
                : `Todas las cuentas (${activeChannelConfig.adAccounts.length})`
              }
            </option>
            {activeChannelConfig.adAccounts.length > 1 && activeChannelConfig.adAccounts.map((acc: string) => (
              <option key={acc} value={acc}>{accountNames[acc] || acc}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── MAIN DASHBOARD AREA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Actionable Insights */}
        <div className="lg:col-span-2 space-y-6">

          {/* ROW 1: Q1 Traffic & Q2 Results */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative">
            {renderLoadingOverlay()}
            
            {/* Q1: Traffic Quality */}
            <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
              <h3 style={{ fontSize: "12px", fontWeight: 700, color: "white", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px" }}>
                Calidad de Tráfico
              </h3>
              <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.6)", marginBottom: "20px" }}>
                CTR vs CPC — Interés real vs Costo por clic.
              </p>
              <div style={{ width: "100%", height: "250px" }}>
                {trafficChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart data={trafficChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCtr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--purple)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--purple)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                      <XAxis dataKey="date" stroke="rgba(148,163,184,0.4)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                      <YAxis yAxisId="left" stroke="rgba(148,163,184,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                      <YAxis yAxisId="right" orientation="right" stroke="rgba(148,163,184,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val)} />
                      <Tooltip contentStyle={{ backgroundColor: "rgba(10,15,30,0.95)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "white" }} itemStyle={{ color: "white" }} formatter={(value: any, name: any) => [name === 'CPC ($)' ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value) : `${value}%`, name]} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                      <Area yAxisId="left" type="monotone" dataKey="ctr" name="CTR (%)" stroke="var(--purple)" strokeWidth={2} fillOpacity={1} fill="url(#colorCtr)" />
                      <Line yAxisId="right" type="monotone" dataKey="cpc" name="CPC ($)" stroke="var(--amber)" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "rgba(10,15,30,1)" }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <NoDataPlaceholder />
                )}
              </div>
            </div>

            {/* Q2: Results Quality */}
            <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
              <h3 style={{ fontSize: "12px", fontWeight: 700, color: "white", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px" }}>
                Rendimiento de Resultados
              </h3>
              <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.6)", marginBottom: "20px" }}>
                Inversión diaria y volumen de conversiones.
              </p>
              <div style={{ width: "100%", height: "250px" }}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--amber)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--amber)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                      <XAxis dataKey="date" stroke="rgba(148,163,184,0.4)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                      <YAxis yAxisId="left" stroke="rgba(148,163,184,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val)} />
                      <YAxis yAxisId="right" orientation="right" stroke="rgba(148,163,184,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => val} />
                      <Tooltip contentStyle={{ backgroundColor: "rgba(10,15,30,0.95)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "white" }} itemStyle={{ color: "white" }} formatter={(value: any, name: any) => [name === 'Inversión ($)' ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value) : value, name]} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                      <Area yAxisId="left" type="monotone" dataKey="spend" name="Inversión ($)" stroke="var(--amber)" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
                      <Bar yAxisId="right" dataKey="results" name="Resultados" fill="var(--emerald)" radius={[4, 4, 0, 0]} barSize={8} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <NoDataPlaceholder />
                )}
              </div>
            </div>

          </div>

          {/* ROW 2: Q3 Audience (Age & Geo) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            {renderLoadingOverlay()}
            
            {/* Q3a: Age & Gender */}
            <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
              <h3 style={{ fontSize: "12px", fontWeight: 700, color: "white", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px" }}>
                Edad y Género
              </h3>
              <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.6)", marginBottom: "16px" }}>
                Inversión por grupo demográfico.
              </p>
              <div style={{ width: "100%", height: "220px" }}>
                {ageChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={ageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                      <XAxis dataKey="age" stroke="rgba(148,163,184,0.4)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="rgba(148,163,184,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                      <Tooltip contentStyle={{ backgroundColor: "rgba(10,15,30,0.95)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "white" }} itemStyle={{ color: "white" }} formatter={(val: any) => [`$${parseFloat(val).toFixed(2)}`, undefined]} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                      <Bar dataKey="Mujeres" stackId="a" fill="var(--cyan)" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Hombres" stackId="a" fill="var(--emerald)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <NoDataPlaceholder />
                )}
              </div>
            </div>

            {/* Q3b: Geo */}
            <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
              <h3 style={{ fontSize: "12px", fontWeight: 700, color: "white", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px" }}>
                Top Geográfico
              </h3>
              <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.6)", marginBottom: "16px" }}>
                Top 5 regiones con mayor inversión.
              </p>
              <div style={{ width: "100%", height: "220px" }}>
                {geoChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={geoChartData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
                      <XAxis type="number" stroke="rgba(148,163,184,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                      <YAxis type="category" dataKey="region" stroke="rgba(148,163,184,0.4)" fontSize={10} tickLine={false} axisLine={false} width={80} />
                      <Tooltip contentStyle={{ backgroundColor: "rgba(10,15,30,0.95)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "white" }} itemStyle={{ color: "var(--amber)" }} formatter={(val: any) => [`$${parseFloat(val).toFixed(2)}`, "Inversión"]} />
                      <Bar dataKey="spend" fill="var(--amber)" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <NoDataPlaceholder />
                )}
              </div>
            </div>
          </div>

          {/* ROW 3: Q4 Content & Q5 Scaling */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            {renderLoadingOverlay()}

            {/* Q4: Content Engagement (Top Ads) */}
            <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
              <h3 style={{ fontSize: "12px", fontWeight: 700, color: "white", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px" }}>
                Top Anuncios
              </h3>
              <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.6)", marginBottom: "16px" }}>
                Los 5 anuncios con mayor inversión.
              </p>
              <div style={{ width: "100%", height: "250px" }}>
                {creativeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={creativeChartData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
                      <XAxis type="number" stroke="rgba(148,163,184,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                      <YAxis type="category" dataKey="name" stroke="rgba(148,163,184,0.4)" fontSize={9} tickLine={false} axisLine={false} width={80} />
                      <Tooltip contentStyle={{ backgroundColor: "rgba(10,15,30,0.95)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "white" }} itemStyle={{ color: "white" }} formatter={(val: any) => [`$${val}`, undefined]} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                      <Bar dataKey="spend" name="Inversión" fill="var(--cyan)" radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <NoDataPlaceholder />
                )}
              </div>
            </div>

            {/* Q5: Scaling (Top Adsets) */}
            <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
              <h3 style={{ fontSize: "12px", fontWeight: 700, color: "white", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px" }}>
                Top Conjuntos de Anuncios
              </h3>
              <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.6)", marginBottom: "16px" }}>
                Inversión y resultados por Adset.
              </p>
              <div style={{ width: "100%", height: "250px" }}>
                {scalingChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart data={scalingChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                      <XAxis dataKey="name" stroke="rgba(148,163,184,0.4)" fontSize={9} tickLine={false} axisLine={false} dy={10} tickFormatter={(val) => val.length > 10 ? val.substring(0,10)+'...' : val} />
                      <YAxis yAxisId="left" stroke="rgba(148,163,184,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => val} />
                      <YAxis yAxisId="right" orientation="right" stroke="rgba(148,163,184,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val)} />
                      <Tooltip contentStyle={{ backgroundColor: "rgba(10,15,30,0.95)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "white" }} itemStyle={{ color: "white" }} formatter={(value: any, name: any) => [name === 'CPA ($)' ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value) : value, name]} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                      <Bar yAxisId="left" dataKey="results" name="Resultados" fill="var(--emerald)" radius={[4, 4, 0, 0]} barSize={16} />
                      <Line yAxisId="right" type="monotone" dataKey="cpa" name="CPA ($)" stroke="var(--amber)" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "rgba(10,15,30,1)" }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <NoDataPlaceholder />
                )}
              </div>
            </div>

          </div>

          {/* ROW 4: Q6 Strategic Replication */}
          <div className="glass-panel relative" style={{ padding: "20px" }}>
            {renderLoadingOverlay()}
            <h3 style={{ fontSize: "12px", fontWeight: 700, color: "var(--amber)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Zap className="w-4 h-4" /> Combinación Ganadora
            </h3>
            <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.6)", marginBottom: "20px" }}>
              La campaña y el conjunto que concentran el mayor gasto y rendimiento. Candidatos para escalar.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ fontSize: "10px", color: "rgba(148,163,184,0.6)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Campaña Ganadora</div>
                {topCampaign ? (
                  <>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "white", marginBottom: "8px" }}>{topCampaign.name}</div>
                    <div style={{ display: "flex", gap: "16px", fontSize: "12px" }}>
                      <div><span style={{ color: "rgba(148,163,184,0.6)" }}>Resultados:</span> <span style={{ color: "var(--emerald)", fontWeight: 600 }}>{topCampaign.results}</span></div>
                      <div><span style={{ color: "rgba(148,163,184,0.6)" }}>CPA:</span> <span style={{ color: "var(--cyan)", fontWeight: 600 }}>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(topCampaign.cpa)}</span></div>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: "12px", color: "rgba(148,163,184,0.4)" }}>Sin datos suficientes</div>
                )}
              </div>

              <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ fontSize: "10px", color: "rgba(148,163,184,0.6)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Conjunto (Adset) Ganador</div>
                {topAdset ? (
                  <>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "white", marginBottom: "8px" }}>{topAdset.name}</div>
                    <div style={{ display: "flex", gap: "16px", fontSize: "12px" }}>
                      <div><span style={{ color: "rgba(148,163,184,0.6)" }}>Resultados:</span> <span style={{ color: "var(--emerald)", fontWeight: 600 }}>{topAdset.results}</span></div>
                      <div><span style={{ color: "rgba(148,163,184,0.6)" }}>CPA:</span> <span style={{ color: "var(--cyan)", fontWeight: 600 }}>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(topAdset.cpa)}</span></div>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: "12px", color: "rgba(148,163,184,0.4)" }}>Sin datos suficientes</div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Project Info & Editable Settings */}
        <div className="space-y-6">
          
          <div className="glass-panel">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
              <h3 style={{ fontSize: "11px", fontWeight: 700, color: "var(--cyan)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Detalles del Proyecto
              </h3>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} style={{ background: "none", border: "none", color: "rgba(148,163,184,0.6)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
              ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => { setIsEditing(false); setEditForm(project); }} style={{ background: "none", border: "none", color: "var(--amber)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={saveChanges} style={{ background: "none", border: "none", color: "var(--emerald)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
                    <Save className="w-3.5 h-3.5" /> Guardar
                  </button>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              {/* Fanpage with Profile Picture and Followers */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {metaPages.find(p => p.name === project.fanpage)?.picture ? (
                  <img 
                    src={metaPages.find(p => p.name === project.fanpage)?.picture} 
                    alt="" 
                    style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid var(--border-strong)", objectFit: "cover" }} 
                  />
                ) : (
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(0,129,251,0.1)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyItems: "center", color: "var(--cyan)", fontSize: "10px", fontWeight: "bold", paddingLeft: "8px" }}>Meta</div>
                )}
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "9px", color: "rgba(148,163,184,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Fanpage</span>
                  <div style={{ fontSize: "12px", color: "white", fontWeight: 600 }}>{project.fanpage || "—"}</div>
                  {project.fanpage && metaPages.find(p => p.name === project.fanpage) && (
                    <div style={{ fontSize: "10px", color: "rgba(148,163,184,0.5)", marginTop: "1px" }}>
                      {(metaPages.find(p => p.name === project.fanpage)?.followers || 0).toLocaleString()} seguidores
                    </div>
                  )}
                </div>
              </div>

              {/* Instagram with Profile Picture and Followers */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {metaPages.find(p => p.instagram && `@${p.instagram.username}` === project.instagram)?.instagram?.picture ? (
                  <img 
                    src={metaPages.find(p => p.instagram && `@${p.instagram.username}` === project.instagram)?.instagram?.picture} 
                    alt="" 
                    style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid var(--border-strong)", objectFit: "cover" }} 
                  />
                ) : (
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(123,97,255,0.1)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyItems: "center", color: "var(--purple)", fontSize: "10px", fontWeight: "bold", paddingLeft: "10px" }}>IG</div>
                )}
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "9px", color: "rgba(148,163,184,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Instagram</span>
                  <div style={{ fontSize: "12px", color: "white", fontWeight: 600 }}>{project.instagram || "—"}</div>
                  {project.instagram && metaPages.find(p => p.instagram && `@${p.instagram.username}` === project.instagram) && (
                    <div style={{ fontSize: "10px", color: "rgba(148,163,184,0.5)", marginTop: "1px" }}>
                      {(metaPages.find(p => p.instagram && `@${p.instagram.username}` === project.instagram)?.instagram?.followers || 0).toLocaleString()} seguidores
                    </div>
                  )}
                </div>
              </div>
              
              {isEditing ? (
                <>
                  <EditableRow label="Website" value={editForm.website || ""} onChange={val => setEditForm({...editForm, website: val})} />
                  <EditableRow label="Buyer Persona" value={editForm.persona || ""} onChange={val => setEditForm({...editForm, persona: val})} />
                  <EditableRow label="Geo" value={editForm.geo || ""} onChange={val => setEditForm({...editForm, geo: val})} />
                </>
              ) : (
                <>
                  <InfoRow label="Website" value={project.website || "—"} />
                  {project.website && (
                    <div style={{ marginTop: "6px", width: "100%", height: "140px", border: "1px solid var(--border)", borderRadius: "6px", overflow: "hidden", background: "rgba(0,0,0,0.2)" }}>
                      <iframe 
                        src={project.website.startsWith("http") ? project.website : `https://${project.website}`} 
                        title="Website Preview" 
                        style={{ width: "100%", height: "100%", border: "none", transform: "scale(1)", transformOrigin: "0 0" }} 
                      />
                    </div>
                  )}
                  <InfoRow label="Buyer Persona" value={project.persona || "—"} />
                  <InfoRow label="Geo" value={project.geo || "—"} />
                </>
              )}
              
              <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                <h4 style={{ fontSize: "10px", color: "rgba(148,163,184,0.5)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Configuración del Canal</h4>
                
                {activeChannelConfig ? (
                  <>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "12px" }}>
                      <CreditCard className="w-4 h-4 text-slate-400 mt-1" />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "10px", color: "rgba(148,163,184,0.5)" }}>Presupuesto {activeChannelConfig.period}</p>
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={editForm.channels?.find(c => c.platformId === activeTab)?.budget || ""} 
                            onChange={e => {
                              const newChannels = [...(editForm.channels || [])];
                              const idx = newChannels.findIndex(c => c.platformId === activeTab);
                              if(idx >= 0) newChannels[idx].budget = e.target.value;
                              setEditForm({...editForm, channels: newChannels});
                            }}
                            style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid var(--cyan)", color: "white", fontSize: "13px", padding: "4px 8px", borderRadius: "4px", marginTop: "4px" }}
                          />
                        ) : (
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "white" }}>{activeChannelConfig.budget || "$0.00"}</p>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <Clock className="w-4 h-4 text-slate-400 mt-1" />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "10px", color: "rgba(148,163,184,0.5)", marginBottom: "4px" }}>Duración</p>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <input type="date" value={editForm.dateStart || ""} onChange={e => setEditForm({...editForm, dateStart: e.target.value})} style={{ width: "50%", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "#e2e8f0", fontSize: "11px", padding: "4px", borderRadius: "4px" }} />
                            <input type="date" value={editForm.dateEnd || ""} onChange={e => setEditForm({...editForm, dateEnd: e.target.value})} style={{ width: "50%", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "#e2e8f0", fontSize: "11px", padding: "4px", borderRadius: "4px" }} />
                          </div>
                        ) : (
                          <p style={{ fontSize: "12px", color: "#e2e8f0" }}>
                            {project.dateStart ? new Date(project.dateStart).toLocaleDateString() : "—"} al {project.dateEnd ? new Date(project.dateEnd).toLocaleDateString() : "—"}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.4)" }}>Selecciona un canal para ver su configuración.</p>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════ */

function KpiBox({ title, value, sub, icon, color, progress }: any) {
  const c = `var(--${color})`;
  return (
    <div className="glass-panel" style={{ position: "relative", overflow: "hidden", padding: "20px", paddingBottom: progress !== undefined ? "24px" : "20px" }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: "100px", height: "100px", background: `radial-gradient(circle, ${c}15 0%, transparent 70%)`, transform: "translate(30%, -30%)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "rgba(148,163,184,0.6)", marginBottom: "12px" }}>
        <div style={{ padding: "6px", background: "rgba(0,0,0,0.3)", borderRadius: "6px", color: c }}>{icon}</div>
        <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{title}</span>
      </div>
      <div style={{ fontSize: "28px", fontWeight: 700, color: "white", marginBottom: "4px", fontFamily: "'Orbitron', sans-serif" }}>{value}</div>
      <div style={{ fontSize: "11px", color: "rgba(148,163,184,0.4)" }}>{sub}</div>
      
      {progress !== undefined && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "4px", background: "rgba(148,163,184,0.1)" }}>
          <div style={{ height: "100%", width: `${Math.min(progress, 100)}%`, background: c, transition: "width 1s ease-in-out" }} />
        </div>
      )}
    </div>
  );
}

function SmallKpi({ title, value, icon, highlight }: any) {
  return (
    <div className="glass-panel" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: highlight ? "rgba(0,212,255,0.1)" : "rgba(148,163,184,0.05)", border: `1px solid ${highlight ? "rgba(0,212,255,0.2)" : "rgba(148,163,184,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", color: highlight ? "var(--cyan)" : "rgba(148,163,184,0.5)" }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: "10px", color: "rgba(148,163,184,0.5)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>{title}</p>
        <p style={{ fontSize: "16px", fontWeight: 600, color: "white" }}>{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <span style={{ fontSize: "9px", color: "rgba(148,163,184,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
      <span style={{ fontSize: "12px", color: "#e2e8f0", wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

function NoDataPlaceholder({ message = "Esperando sincronización con API de Meta" }: { message?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", gap: "12px", padding: "20px" }}>
      <BarChart2 className="w-8 h-8" style={{ color: "rgba(148,163,184,0.1)" }} />
      <p style={{ fontSize: "11px", color: message.includes("Error") || message.includes("Failed") ? "var(--amber)" : "rgba(148,163,184,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", wordBreak: "break-word" }}>
        {message}
      </p>
    </div>
  );
}

function EditableRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <span style={{ fontSize: "9px", color: "rgba(148,163,184,0.6)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
      <input 
        type="text" 
        value={value} 
        onChange={e => onChange(e.target.value)}
        style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white", fontSize: "12px", padding: "4px 8px", borderRadius: "4px" }}
      />
    </div>
  );
}
