"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Calendar, DollarSign, Target, Eye, TrendingUp, Filter,
  BarChart2, Activity, Zap, CreditCard, CheckCircle, Clock, Edit3, Save, X,
  Users, Palette, Settings, ChevronDown, ChevronUp, AlertTriangle,
  Layers, Monitor, Smartphone, Globe, PieChart as PieIcon
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";
import DateRangePicker from "@/components/DateRangePicker";

/* ═══ TYPES ═══ */
interface ChannelConfig { platformId: string; platformName: string; adAccounts: string[]; budget: string; period: string; goal: string; cpr: string; }
interface Project { id: string; alias: string; client: string; vertical: string; fanpage: string[]; instagram: string[]; whatsapp: string[]; website: string; channels: ChannelConfig[]; dateStart: string; dateEnd: string; persona: string; geo: string; status: "Activo"|"Pausado"|"Draft"|"Completado"; createdAt: string; }

const STORAGE_KEY = "sodare_projects_v2";
const PLATFORMS = [
  { id: "meta", name: "Meta Ads", color: "#0081FB" },
  { id: "google", name: "Google Ads", color: "#4285F4" },
  { id: "tiktok", name: "TikTok Ads", color: "#25F4EE" },
  { id: "whatsapp", name: "WhatsApp Business", color: "#25D366" },
];
const STATUS_COLORS: Record<string, string> = { Activo: "emerald", Pausado: "amber", Draft: "muted", Completado: "cyan" };
const RESULT_TYPES = ['lead','purchase','complete_registration','offsite_conversion','onsite_conversion','messaging_conversation_started_7d','omni_purchase','app_install','landing_page_view','link_click'];
const findResultAction = (actions: any[] | undefined) => { if (!actions?.length) return null; for (const t of RESULT_TYPES) { const f = actions.find((a: any) => a.action_type.includes(t)); if (f) return f; } return actions[0]; };
const parseBudget = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
const parseGoal = (s: string) => { const m = s.match(/(\d[\d,]*)/); return m ? parseInt(m[1].replace(/,/g, ""), 10) : 0; };
const fmtMXN = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
const fmtMXN0 = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat('es-MX').format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

/* ═══ HELPERS ═══ */
function getDaysInCurrentMonth() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate(); }
function getDaysElapsedInMonth() { return new Date().getDate(); }
function getDaysRemainingInMonth() { return getDaysInCurrentMonth() - getDaysElapsedInMonth(); }

function getBudgetBreakdown(budget: number, period: string) {
  const daysInMonth = getDaysInCurrentMonth();
  switch (period.toLowerCase()) {
    case "mensual": case "mes": return { daily: budget / daysInMonth, weekly: (budget / daysInMonth) * 7, monthly: budget, label: "Mensual" };
    case "semanal": case "semana": return { daily: budget / 7, weekly: budget, monthly: budget * 4.33, label: "Semanal" };
    case "anual": case "año": return { daily: budget / 365, weekly: budget / 52, monthly: budget / 12, label: "Anual" };
    case "diario": case "dia": case "día": return { daily: budget, weekly: budget * 7, monthly: budget * daysInMonth, label: "Diario" };
    default: return { daily: budget / daysInMonth, weekly: (budget / daysInMonth) * 7, monthly: budget, label: period || "Mensual" };
  }
}

/* ═══ SHARED UI ═══ */
const panelStyle: React.CSSProperties = { background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, padding: 20 };
const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "rgba(148,163,184,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 };
const headingStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 };
const subStyle: React.CSSProperties = { fontSize: 11, color: "rgba(148,163,184,0.5)", marginBottom: 16 };
const tooltipStyle = { backgroundColor: "rgba(10,15,30,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12, color: "white" };
const CHART_COLORS = ["#00d4ff", "#00c875", "#fdab3d", "#e2445c", "#7b61ff", "#579bfc", "#ff007f", "#25F4EE"];

function KpiBox({ title, value, sub, icon, color, progress }: any) {
  const c = color.startsWith("#") ? color : `var(--${color})`;
  return (
    <div style={{ ...panelStyle, position: "relative", overflow: "hidden", paddingBottom: progress !== undefined ? 24 : 20 }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: 100, background: `radial-gradient(circle, ${c}15 0%, transparent 70%)`, transform: "translate(30%, -30%)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(148,163,184,0.6)", marginBottom: 12 }}>
        <div style={{ padding: 6, background: "rgba(0,0,0,0.3)", borderRadius: 6, color: c }}>{icon}</div>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{title}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "white", marginBottom: 4, fontFamily: "'Orbitron',sans-serif" }}>{value}</div>
      <div style={{ fontSize: 11, color: "rgba(148,163,184,0.4)" }}>{sub}</div>
      {progress !== undefined && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "rgba(148,163,184,0.1)" }}><div style={{ height: "100%", width: `${Math.min(progress, 100)}%`, background: c, transition: "width 1s" }} /></div>}
    </div>
  );
}

function NoData({ msg = "Sin datos disponibles" }: { msg?: string }) {
  return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", gap: 12, padding: 20 }}><BarChart2 style={{ width: 32, height: 32, color: "rgba(148,163,184,0.1)" }} /><p style={{ fontSize: 11, color: "rgba(148,163,184,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>{msg}</p></div>;
}

function LoadingOverlay() {
  return <div style={{ position: "absolute", inset: 0, background: "rgba(10,15,30,0.6)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10, borderRadius: "inherit" }}><div style={{ width: 30, height: 30, border: "3px solid rgba(148,163,184,0.2)", borderTopColor: "var(--cyan)", borderRadius: "50%", animation: "spin 1s linear infinite" }} /><span style={{ marginTop: 10, fontSize: 11, color: "white", letterSpacing: "0.05em", textTransform: "uppercase" }}>Sincronizando Meta...</span></div>;
}

function TabButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 11, fontWeight: 600,
      background: active ? "rgba(0,212,255,0.08)" : "transparent",
      border: `1px solid ${active ? "rgba(0,212,255,0.2)" : "transparent"}`,
      color: active ? "#00d4ff" : "rgba(148,163,184,0.5)",
      borderRadius: 6, cursor: "pointer", transition: "all 0.2s", letterSpacing: "0.03em",
    }}>{icon}{label}</button>
  );
}

function TimeToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: 3 }}>
      {[{ k: "day", l: "Día" }, { k: "week", l: "Semana" }, { k: "month", l: "Mes" }].map(t => (
        <button key={t.k} onClick={() => onChange(t.k)} style={{
          padding: "4px 12px", fontSize: 10, fontWeight: 600, borderRadius: 4, border: "none", cursor: "pointer",
          background: value === t.k ? "rgba(0,212,255,0.12)" : "transparent",
          color: value === t.k ? "#00d4ff" : "rgba(148,163,184,0.4)",
        }}>{t.l}</button>
      ))}
    </div>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function ProjectDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<"resumen"|"gasto"|"audiencia"|"creativos"|"config">("resumen");
  const [activePlatform, setActivePlatform] = useState("");
  const [insights, setInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [datePreset, setDatePreset] = useState("maximum");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [accountNames, setAccountNames] = useState<Record<string, string>>({});
  const [metaPages, setMetaPages] = useState<any[]>([]);
  const [breakdownData, setBreakdownData] = useState<Record<string, any[]>>({});
  const [timeGranularity, setTimeGranularity] = useState("day");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Project>>({});

  // Load project
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const projects: Project[] = JSON.parse(raw);
      const found = projects.find(p => p.id === params.id);
      if (found) { setProject(found); setEditForm(found); if (found.channels.length > 0) setActivePlatform(found.channels[0].platformId); }
      else router.push("/dashboard/proyectos");
    }
  }, [params.id, router]);

  // Load account names + pages
  useEffect(() => {
    fetch("/api/meta/adaccounts").then(r => r.json()).then(d => {
      if (d.data) { const n: Record<string, string> = {}; d.data.forEach((a: any) => { n[a.id] = a.name?.split(" — ")[0] || a.id; }); setAccountNames(n); }
    }).catch(() => {});
    fetch("/api/meta/pages").then(r => r.json()).then(d => { if (d.data) setMetaPages(d.data); }).catch(() => {});
  }, []);

  // Load insights
  useEffect(() => {
    if (!project || !activePlatform) return;
    const ch = project.channels.find(c => c.platformId === activePlatform);
    if (activePlatform !== "meta" || !ch?.adAccounts?.length) { setInsights(null); return; }
    setIsLoading(true);
    const accs = selectedAccountId === "all" ? ch.adAccounts : [selectedAccountId];
    let dp = ""; if (dateStart && dateEnd) dp = `&dateStart=${dateStart}&dateEnd=${dateEnd}`; else if (datePreset && datePreset !== "custom") dp = `&preset=${datePreset}`;
    Promise.all(accs.map(a => fetch(`/api/meta/insights?adAccountId=${a}${dp}`).then(r => r.json()).catch(() => null)))
      .then(results => {
        const valid = results.filter(Boolean).filter((r: any) => !r.error);
        if (valid.length === 0) { setInsights({ _error: "No data" }); }
        else if (valid.length === 1) { setInsights(valid[0]); }
        else {
          const m: any = { timeSeries: [], demographics: [], geo: [], campaigns: [], adsets: [], ads: [] };
          valid.forEach((r: any) => { Object.keys(m).forEach(k => { if (r[k]) m[k].push(...r[k]); }); });
          setInsights(m);
        }
        setIsLoading(false);
      });
  }, [project, activePlatform, dateStart, dateEnd, datePreset, selectedAccountId]);

  // Load breakdowns for audience/creative tabs
  const loadBreakdown = useCallback(async (key: string) => {
    if (breakdownData[key] || !project) return;
    const ch = project.channels.find(c => c.platformId === activePlatform);
    if (!ch?.adAccounts?.length) return;
    const accId = selectedAccountId === "all" ? ch.adAccounts[0] : selectedAccountId;
    const id = accId.startsWith("act_") ? accId : `act_${accId}`;
    try {
      const r = await fetch(`/api/meta/breakdowns?id=${id}&breakdown=${key}&preset=${datePreset}`);
      const d = await r.json();
      if (d.data) setBreakdownData(prev => ({ ...prev, [key]: d.data }));
    } catch {}
  }, [project, activePlatform, selectedAccountId, datePreset, breakdownData]);

  useEffect(() => {
    if (activeTab === "audiencia") { loadBreakdown("age_gender"); loadBreakdown("region"); loadBreakdown("platform"); loadBreakdown("device"); }
    if (activeTab === "creativos") { loadBreakdown("dynamic_headline"); loadBreakdown("dynamic_text"); loadBreakdown("dynamic_description"); loadBreakdown("dynamic_cta"); }
  }, [activeTab, loadBreakdown]);

  const saveChanges = () => {
    if (!project) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      let projects: Project[] = JSON.parse(raw);
      const updated = { ...project, ...editForm } as Project;
      projects = projects.map(p => p.id === updated.id ? updated : p);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      setProject(updated); setIsEditing(false);
    }
  };

  if (!project) return <div style={{ padding: 40, textAlign: "center", color: "rgba(148,163,184,0.5)" }}>Cargando proyecto...</div>;

  const ch = project.channels.find(c => c.platformId === activePlatform);
  const budgetNum = ch ? parseBudget(ch.budget) : 0;
  const goalNum = ch ? parseGoal(ch.goal) : 0;
  const bk = getBudgetBreakdown(budgetNum, ch?.period || "Mensual");

  // Aggregate metrics
  let totalSpend = 0, totalResults = 0, totalImpressions = 0, totalClicks = 0, totalReach = 0, totalActionValue = 0;
  (insights?.timeSeries || []).forEach((d: any) => {
    totalSpend += parseFloat(d.spend || "0"); totalImpressions += parseInt(d.impressions || "0", 10); totalClicks += parseInt(d.clicks || "0", 10);
    totalReach += parseInt(d.reach || "0", 10);
    const ra = findResultAction(d.actions); if (ra) totalResults += parseInt(ra.value, 10);
    const va = findResultAction(d.action_values); if (va) totalActionValue += parseFloat(va.value);
  });
  const cpr = totalResults > 0 ? totalSpend / totalResults : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const roas = totalSpend > 0 ? totalActionValue / totalSpend : 0;
  const spendProgress = budgetNum > 0 ? (totalSpend / budgetNum) * 100 : 0;

  // Projections
  const daysElapsed = getDaysElapsedInMonth();
  const daysInMonth = getDaysInCurrentMonth();
  const daysRemaining = getDaysRemainingInMonth();
  const idealSpendToday = bk.daily * daysElapsed;
  const spendPace = idealSpendToday > 0 ? ((totalSpend / idealSpendToday) - 1) * 100 : 0;
  const projectedResults = daysElapsed > 0 ? Math.round((totalResults / daysElapsed) * daysInMonth) : 0;
  const projectedSpend = daysElapsed > 0 ? (totalSpend / daysElapsed) * daysInMonth : 0;
  const goalCompletion = goalNum > 0 ? (totalResults / goalNum) * 100 : 0;
  const dailyNeeded = goalNum > 0 && daysRemaining > 0 ? Math.ceil((goalNum - totalResults) / daysRemaining) : 0;
  const trackStatus = goalNum > 0 ? (goalCompletion >= (daysElapsed / daysInMonth) * 100 ? "on-track" : goalCompletion >= (daysElapsed / daysInMonth) * 70 ? "at-risk" : "off-track") : "unknown";

  // Chart data
  const timeSeriesData = (insights?.timeSeries || []).map((d: any) => {
    const s = parseFloat(d.spend || "0"); const ra = findResultAction(d.actions); const r = ra ? parseInt(ra.value, 10) : 0;
    const imp = parseInt(d.impressions || "0", 10); const cl = parseInt(d.clicks || "0", 10);
    return { date: d.date_start?.split('-').slice(1).join('/') || "", spend: +s.toFixed(2), results: r, cpr: r > 0 ? +(s / r).toFixed(2) : 0, ctr: imp > 0 ? +((cl / imp) * 100).toFixed(2) : 0, cpc: cl > 0 ? +(s / cl).toFixed(2) : 0, impressions: imp, clicks: cl };
  }).sort((a: any, b: any) => a.date.localeCompare(b.date));

  // Spend table with aggregation
  const getSpendTable = () => {
    if (timeGranularity === "day") return timeSeriesData;
    const grouped: Record<string, any> = {};
    timeSeriesData.forEach((d: any) => {
      let key: string;
      const parts = d.date.split("/");
      if (timeGranularity === "month") key = parts[0] || d.date;
      else { const dayNum = parseInt(parts[1] || "1", 10); key = `S${Math.ceil(dayNum / 7)}`; }
      if (!grouped[key]) grouped[key] = { date: key, spend: 0, results: 0, impressions: 0, clicks: 0 };
      grouped[key].spend += d.spend; grouped[key].results += d.results; grouped[key].impressions += d.impressions; grouped[key].clicks += d.clicks;
    });
    return Object.values(grouped).map((g: any) => ({ ...g, spend: +g.spend.toFixed(2), cpr: g.results > 0 ? +(g.spend / g.results).toFixed(2) : 0, ctr: g.impressions > 0 ? +((g.clicks / g.impressions) * 100).toFixed(2) : 0 }));
  };

  const cprTarget = ch ? parseBudget(ch.cpr) : 0;

  return (
    <div className="space-y-6 page-enter">
      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => router.push("/dashboard/proyectos")} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,15,30,0.5)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, color: "rgba(148,163,184,0.7)", cursor: "pointer" }}><ArrowLeft style={{ width: 16, height: 16 }} /></button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, fontWeight: 700, color: "white", letterSpacing: "0.05em" }}>{project.alias}</h1>
              <span className={`badge badge-${STATUS_COLORS[project.status]}`}>{project.status}</span>
            </div>
            <p style={{ fontSize: 12, color: "rgba(148,163,184,0.6)" }}>{project.vertical}{project.client && ` · ${project.client}`}</p>
          </div>
        </div>
        <DateRangePicker datePreset={datePreset} dateStart={dateStart} dateEnd={dateEnd} showDatePicker={showDatePicker} setShowDatePicker={setShowDatePicker}
          onPresetSelect={(p: string) => { setDatePreset(p); setDateStart(""); setDateEnd(""); setBreakdownData({}); }}
          onCustomRange={(s: string, e: string) => { setDatePreset("custom"); setDateStart(s); setDateEnd(e); setBreakdownData({}); }} />
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" style={{ position: "relative" }}>
        {isLoading && <LoadingOverlay />}
        <KpiBox title="Inversión" value={fmtMXN0(totalSpend)} sub={`de ${fmtMXN0(budgetNum)} (${bk.label})`} icon={<DollarSign style={{ width: 16, height: 16 }} />} color="amber" progress={spendProgress} />
        <KpiBox title="Resultados" value={fmtNum(totalResults)} sub={ch?.goal || "Objetivo"} icon={<Target style={{ width: 16, height: 16 }} />} color="emerald" progress={goalCompletion} />
        <KpiBox title="CPR" value={fmtMXN(cpr)} sub={cprTarget > 0 ? `Meta: ${fmtMXN(cprTarget)}` : "Costo por resultado"} icon={<Activity style={{ width: 16, height: 16 }} />} color="cyan" />
        <KpiBox title="CTR" value={pct(ctr)} sub="Click-through rate" icon={<Eye style={{ width: 16, height: 16 }} />} color="purple" />
        <KpiBox title="ROAS" value={`${roas.toFixed(1)}x`} sub="Return on ad spend" icon={<TrendingUp style={{ width: 16, height: 16 }} />} color="#7b61ff" />
      </div>

      {/* ── TABS + PLATFORM SELECTOR ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: 12 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <TabButton active={activeTab === "resumen"} label="Resumen" icon={<BarChart2 style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("resumen")} />
          <TabButton active={activeTab === "gasto"} label="Gasto & Presupuesto" icon={<DollarSign style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("gasto")} />
          <TabButton active={activeTab === "audiencia"} label="Audiencia" icon={<Users style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("audiencia")} />
          <TabButton active={activeTab === "creativos"} label="Creativos" icon={<Palette style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("creativos")} />
          <TabButton active={activeTab === "config"} label="Configuración" icon={<Settings style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("config")} />
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {project.channels.map(c => {
            const pl = PLATFORMS.find(p => p.id === c.platformId) || PLATFORMS[0];
            return <button key={c.platformId} onClick={() => { setActivePlatform(c.platformId); setBreakdownData({}); }} style={{ padding: "5px 12px", fontSize: 11, fontWeight: 600, background: activePlatform === c.platformId ? `${pl.color}15` : "transparent", border: `1px solid ${activePlatform === c.platformId ? pl.color : "transparent"}`, color: activePlatform === c.platformId ? pl.color : "rgba(148,163,184,0.5)", borderRadius: 4, cursor: "pointer" }}>{pl.name}</button>;
          })}
          {ch?.adAccounts && ch.adAccounts.length > 1 && (
            <select value={selectedAccountId} onChange={e => { setSelectedAccountId(e.target.value); setBreakdownData({}); }} style={{ background: "rgba(10,15,30,0.6)", border: "1px solid rgba(255,255,255,0.06)", color: "#e2e8f0", fontSize: 11, padding: "5px 24px 5px 8px", borderRadius: 4, cursor: "pointer", appearance: "none" }}>
              <option value="all">Todas ({ch.adAccounts.length})</option>
              {ch.adAccounts.map(a => <option key={a} value={a}>{accountNames[a] || a}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* ═══ TAB: RESUMEN ═══ */}
      {activeTab === "resumen" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Proyeccion al Cierre */}
            <div style={panelStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div><h3 style={headingStyle}>Proyección al Cierre</h3><p style={subStyle}>Día {daysElapsed} de {daysInMonth} del mes</p></div>
                <div style={{ padding: "4px 12px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: trackStatus === "on-track" ? "rgba(0,200,117,0.1)" : trackStatus === "at-risk" ? "rgba(253,171,61,0.1)" : "rgba(226,68,92,0.1)", color: trackStatus === "on-track" ? "#00c875" : trackStatus === "at-risk" ? "#fdab3d" : "#e2445c", border: `1px solid ${trackStatus === "on-track" ? "rgba(0,200,117,0.2)" : trackStatus === "at-risk" ? "rgba(253,171,61,0.2)" : "rgba(226,68,92,0.2)"}` }}>
                  {trackStatus === "on-track" ? "EN TRACK" : trackStatus === "at-risk" ? "EN RIESGO" : trackStatus === "off-track" ? "FUERA DE TRACK" : "SIN OBJETIVO"}
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div><p style={labelStyle}>Resultados proyectados</p><p style={{ fontSize: 18, fontWeight: 700, color: "white", fontFamily: "'Orbitron',sans-serif" }}>{fmtNum(projectedResults)}</p>{goalNum > 0 && <p style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>de {fmtNum(goalNum)} objetivo</p>}</div>
                <div><p style={labelStyle}>Gasto proyectado</p><p style={{ fontSize: 18, fontWeight: 700, color: "white", fontFamily: "'Orbitron',sans-serif" }}>{fmtMXN0(projectedSpend)}</p><p style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>de {fmtMXN0(budgetNum)} presupuesto</p></div>
                <div><p style={labelStyle}>Ritmo diario necesario</p><p style={{ fontSize: 18, fontWeight: 700, color: dailyNeeded > 0 ? "#fdab3d" : "white", fontFamily: "'Orbitron',sans-serif" }}>{dailyNeeded > 0 ? fmtNum(dailyNeeded) : "—"}</p><p style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>resultados/día restantes</p></div>
                <div><p style={labelStyle}>Cumplimiento</p><p style={{ fontSize: 18, fontWeight: 700, color: goalCompletion >= 100 ? "#00c875" : "white", fontFamily: "'Orbitron',sans-serif" }}>{goalNum > 0 ? pct(goalCompletion) : "—"}</p><p style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>{daysRemaining} días restantes</p></div>
              </div>
              {goalNum > 0 && <div style={{ marginTop: 16, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(goalCompletion, 100)}%`, background: trackStatus === "on-track" ? "#00c875" : trackStatus === "at-risk" ? "#fdab3d" : "#e2445c", borderRadius: 3, transition: "width 0.5s" }} /></div>}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6" style={{ position: "relative" }}>
              {isLoading && <LoadingOverlay />}
              <div style={panelStyle}><h3 style={headingStyle}>Inversión vs Resultados</h3><p style={subStyle}>Gasto diario y volumen de conversiones</p>
                <div style={{ width: "100%", height: 250 }}>{timeSeriesData.length > 0 ? <ResponsiveContainer><ComposedChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs><linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fdab3d" stopOpacity={0.3} /><stop offset="95%" stopColor="#fdab3d" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} /><XAxis dataKey="date" stroke="rgba(148,163,184,0.4)" fontSize={10} tickLine={false} axisLine={false} /><YAxis yAxisId="left" stroke="rgba(148,163,184,0.4)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} /><YAxis yAxisId="right" orientation="right" stroke="rgba(148,163,184,0.4)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 10 }} /><Area yAxisId="left" type="monotone" dataKey="spend" name="Inversión" stroke="#fdab3d" strokeWidth={2} fillOpacity={1} fill="url(#gs)" /><Bar yAxisId="right" dataKey="results" name="Resultados" fill="#00c875" radius={[3, 3, 0, 0]} barSize={6} />
                </ComposedChart></ResponsiveContainer> : <NoData />}</div>
              </div>
              <div style={panelStyle}><h3 style={headingStyle}>CTR vs CPC</h3><p style={subStyle}>Calidad de tráfico y costo por clic</p>
                <div style={{ width: "100%", height: 250 }}>{timeSeriesData.length > 0 ? <ResponsiveContainer><ComposedChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs><linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7b61ff" stopOpacity={0.3} /><stop offset="95%" stopColor="#7b61ff" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} /><XAxis dataKey="date" stroke="rgba(148,163,184,0.4)" fontSize={10} tickLine={false} axisLine={false} /><YAxis yAxisId="l" stroke="rgba(148,163,184,0.4)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} /><YAxis yAxisId="r" orientation="right" stroke="rgba(148,163,184,0.4)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 10 }} /><Area yAxisId="l" type="monotone" dataKey="ctr" name="CTR (%)" stroke="#7b61ff" strokeWidth={2} fillOpacity={1} fill="url(#gc)" /><Line yAxisId="r" type="monotone" dataKey="cpc" name="CPC ($)" stroke="#fdab3d" strokeWidth={2} dot={{ r: 3, fill: "rgba(10,15,30,1)" }} />
                </ComposedChart></ResponsiveContainer> : <NoData />}</div>
              </div>
            </div>
          </div>

          {/* Right: Accounts Panel */}
          <div className="space-y-6">
            <div style={panelStyle}>
              <h3 style={headingStyle}>Cuentas Vinculadas</h3>
              <p style={subStyle}>{ch?.adAccounts?.length || 0} cuentas seleccionadas</p>
              {ch?.adAccounts?.map(acc => (
                <div key={acc} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 4, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00c875" }} />
                  <div style={{ flex: 1 }}><p style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500 }}>{accountNames[acc] || acc}</p><p style={{ fontSize: 9, color: "rgba(148,163,184,0.3)" }}>{acc}</p></div>
                </div>
              ))}
            </div>
            <div style={panelStyle}>
              <h3 style={headingStyle}>Presupuesto Diario</h3>
              <p style={subStyle}>{bk.label}: {fmtMXN0(budgetNum)}</p>
              <div className="space-y-3">
                <div><p style={labelStyle}>Diario ideal</p><p style={{ fontSize: 16, fontWeight: 700, color: "#00d4ff", fontFamily: "'Orbitron',sans-serif" }}>{fmtMXN(bk.daily)}</p></div>
                <div><p style={labelStyle}>Semanal ideal</p><p style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{fmtMXN(bk.weekly)}</p></div>
                <div style={{ marginTop: 12, padding: "10px 12px", background: spendPace > 10 ? "rgba(226,68,92,0.08)" : spendPace < -10 ? "rgba(253,171,61,0.08)" : "rgba(0,200,117,0.08)", borderRadius: 4, border: `1px solid ${spendPace > 10 ? "rgba(226,68,92,0.15)" : spendPace < -10 ? "rgba(253,171,61,0.15)" : "rgba(0,200,117,0.15)"}` }}>
                  <p style={{ fontSize: 10, color: "rgba(148,163,184,0.5)", marginBottom: 4 }}>Ritmo de gasto</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: spendPace > 10 ? "#e2445c" : spendPace < -10 ? "#fdab3d" : "#00c875" }}>
                    {spendPace > 10 ? `Adelantado +${pct(spendPace)}` : spendPace < -10 ? `Atrasado ${pct(spendPace)}` : "Al ritmo"}
                  </p>
                  <p style={{ fontSize: 10, color: "rgba(148,163,184,0.4)", marginTop: 2 }}>Ideal hoy: {fmtMXN(idealSpendToday)} | Real: {fmtMXN(totalSpend)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: GASTO & PRESUPUESTO ═══ */}
      {activeTab === "gasto" && (
        <div className="space-y-6">
          {/* Budget Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div style={panelStyle}><p style={labelStyle}>Presupuesto {bk.label}</p><p style={{ fontSize: 20, fontWeight: 700, color: "white", fontFamily: "'Orbitron',sans-serif" }}>{fmtMXN0(budgetNum)}</p></div>
            <div style={panelStyle}><p style={labelStyle}>Diario ideal</p><p style={{ fontSize: 20, fontWeight: 700, color: "#00d4ff", fontFamily: "'Orbitron',sans-serif" }}>{fmtMXN(bk.daily)}</p></div>
            <div style={panelStyle}><p style={labelStyle}>Gastado hoy</p><p style={{ fontSize: 20, fontWeight: 700, color: totalSpend > idealSpendToday * 1.1 ? "#e2445c" : "#00c875", fontFamily: "'Orbitron',sans-serif" }}>{fmtMXN0(totalSpend)}</p><p style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>de {fmtMXN0(idealSpendToday)} ideal</p></div>
            <div style={panelStyle}><p style={labelStyle}>Restante</p><p style={{ fontSize: 20, fontWeight: 700, color: "white", fontFamily: "'Orbitron',sans-serif" }}>{fmtMXN0(Math.max(budgetNum - totalSpend, 0))}</p></div>
          </div>

          {/* Spend Table */}
          <div style={panelStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div><h3 style={headingStyle}>Tabla de Gasto</h3><p style={subStyle}>Desglose de inversión y rendimiento</p></div>
              <TimeToggle value={timeGranularity} onChange={setTimeGranularity} />
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Período", "Inversión", "Resultados", "CPR", "Impresiones", "Clicks", "CTR"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: h === "Período" ? "left" : "right", fontSize: 10, fontWeight: 600, color: "rgba(148,163,184,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {getSpendTable().map((r: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.025)" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "8px 10px", color: "#e2e8f0", fontWeight: 500 }}>{r.date}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#fdab3d", fontWeight: 600 }}>{fmtMXN(r.spend)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#00c875", fontWeight: 600 }}>{r.results}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 3, fontSize: 11, fontWeight: 600, background: cprTarget > 0 && r.cpr > cprTarget ? "rgba(226,68,92,0.1)" : cprTarget > 0 && r.cpr <= cprTarget ? "rgba(0,200,117,0.1)" : "transparent", color: cprTarget > 0 && r.cpr > cprTarget ? "#e2445c" : cprTarget > 0 ? "#00c875" : "#e2e8f0" }}>{fmtMXN(r.cpr)}</span>
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "rgba(148,163,184,0.6)" }}>{fmtNum(r.impressions)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "rgba(148,163,184,0.6)" }}>{fmtNum(r.clicks)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#7b61ff", fontWeight: 500 }}>{pct(r.ctr)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr style={{ borderTop: "2px solid rgba(0,212,255,0.15)" }}>
                  <td style={{ padding: "10px", fontWeight: 700, color: "#00d4ff", fontSize: 11 }}>TOTAL</td>
                  <td style={{ padding: "10px", textAlign: "right", fontWeight: 700, color: "#fdab3d" }}>{fmtMXN(totalSpend)}</td>
                  <td style={{ padding: "10px", textAlign: "right", fontWeight: 700, color: "#00c875" }}>{totalResults}</td>
                  <td style={{ padding: "10px", textAlign: "right", fontWeight: 700, color: "#e2e8f0" }}>{fmtMXN(cpr)}</td>
                  <td style={{ padding: "10px", textAlign: "right", fontWeight: 700, color: "rgba(148,163,184,0.6)" }}>{fmtNum(totalImpressions)}</td>
                  <td style={{ padding: "10px", textAlign: "right", fontWeight: 700, color: "rgba(148,163,184,0.6)" }}>{fmtNum(totalClicks)}</td>
                  <td style={{ padding: "10px", textAlign: "right", fontWeight: 700, color: "#7b61ff" }}>{pct(ctr)}</td>
                </tr></tfoot>
              </table>
            </div>
          </div>

          {/* Spend Chart */}
          <div style={panelStyle}>
            <h3 style={headingStyle}>Curva de Gasto vs Presupuesto Ideal</h3>
            <div style={{ width: "100%", height: 280 }}>
              {timeSeriesData.length > 0 ? <ResponsiveContainer><ComposedChart data={timeSeriesData.map((d: any, i: number) => ({ ...d, idealAccum: bk.daily * (i + 1), spendAccum: timeSeriesData.slice(0, i + 1).reduce((a: number, b: any) => a + b.spend, 0) }))} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} /><XAxis dataKey="date" stroke="rgba(148,163,184,0.4)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(148,163,184,0.4)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any, n: any) => [fmtMXN(v as number), n]} /><Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="spendAccum" name="Gasto acumulado" stroke="#fdab3d" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="idealAccum" name="Presupuesto ideal" stroke="rgba(148,163,184,0.3)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </ComposedChart></ResponsiveContainer> : <NoData />}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: AUDIENCIA ═══ */}
      {activeTab === "audiencia" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Age & Gender */}
            <div style={panelStyle}>
              <h3 style={headingStyle}><Users style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />Edad y Género</h3>
              <p style={subStyle}>Distribución del gasto por demografía</p>
              <div style={{ width: "100%", height: 280 }}>
                {(() => {
                  const d = breakdownData["age_gender"] || insights?.demographics || [];
                  const map: Record<string, any> = {};
                  d.forEach((r: any) => { const age = r.age || "?"; const g = r.gender === "male" ? "Hombres" : r.gender === "female" ? "Mujeres" : "Otro"; if (!map[age]) map[age] = { age, Hombres: 0, Mujeres: 0, Otro: 0 }; map[age][g] += parseFloat(r.spend || "0"); });
                  const cd = Object.values(map).sort((a: any, b: any) => a.age.localeCompare(b.age));
                  return cd.length > 0 ? <ResponsiveContainer><BarChart data={cd} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} /><XAxis dataKey="age" stroke="rgba(148,163,184,0.4)" fontSize={10} tickLine={false} axisLine={false} /><YAxis stroke="rgba(148,163,184,0.4)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmtMXN(v)]} /><Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Mujeres" stackId="a" fill="#00d4ff" /><Bar dataKey="Hombres" stackId="a" fill="#00c875" radius={[3, 3, 0, 0]} />
                  </BarChart></ResponsiveContainer> : <NoData />;
                })()}
              </div>
            </div>
            {/* Geo */}
            <div style={panelStyle}>
              <h3 style={headingStyle}><Globe style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />Top Regiones</h3>
              <p style={subStyle}>Regiones con mayor inversión</p>
              <div style={{ width: "100%", height: 280 }}>
                {(() => {
                  const d = (breakdownData["region"] || insights?.geo || []).map((r: any) => ({ region: r.region || "?", spend: parseFloat(r.spend || "0") })).sort((a: any, b: any) => b.spend - a.spend).slice(0, 8);
                  return d.length > 0 ? <ResponsiveContainer><BarChart data={d} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} /><XAxis type="number" stroke="rgba(148,163,184,0.4)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} /><YAxis type="category" dataKey="region" stroke="rgba(148,163,184,0.4)" fontSize={9} tickLine={false} axisLine={false} width={80} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmtMXN(v), "Inversión"]} /><Bar dataKey="spend" fill="#fdab3d" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart></ResponsiveContainer> : <NoData />;
                })()}
              </div>
            </div>
            {/* Platform */}
            <div style={panelStyle}>
              <h3 style={headingStyle}><Layers style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />Plataforma</h3>
              <p style={subStyle}>Facebook vs Instagram vs Audience Network</p>
              <div style={{ width: "100%", height: 280 }}>
                {(() => {
                  const d = (breakdownData["platform"] || []).map((r: any) => ({ name: r.publisher_platform || "?", spend: parseFloat(r.spend || "0"), impressions: parseInt(r.impressions || "0", 10) }));
                  const total = d.reduce((a: number, r: any) => a + r.spend, 0);
                  return d.length > 0 ? <ResponsiveContainer><PieChart><Pie data={d} dataKey="spend" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={{ stroke: "rgba(148,163,184,0.3)" }}>
                    {d.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie><Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmtMXN(v), "Inversión"]} /></PieChart></ResponsiveContainer> : <NoData msg="Cargando plataformas..." />;
                })()}
              </div>
            </div>
            {/* Device */}
            <div style={panelStyle}>
              <h3 style={headingStyle}><Monitor style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />Dispositivo</h3>
              <p style={subStyle}>Mobile vs Desktop</p>
              <div style={{ width: "100%", height: 280 }}>
                {(() => {
                  const d = (breakdownData["device"] || []).map((r: any) => ({ name: r.device_platform === "mobile_app" || r.device_platform === "mobile_web" ? "Mobile" : r.device_platform === "desktop" ? "Desktop" : r.device_platform || "Otro", spend: parseFloat(r.spend || "0") }));
                  const merged: Record<string, number> = {}; d.forEach((r: any) => { merged[r.name] = (merged[r.name] || 0) + r.spend; });
                  const cd = Object.entries(merged).map(([name, spend]) => ({ name, spend })).sort((a, b) => b.spend - a.spend);
                  return cd.length > 0 ? <ResponsiveContainer><PieChart><Pie data={cd} dataKey="spend" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={{ stroke: "rgba(148,163,184,0.3)" }}>
                    {cd.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie><Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmtMXN(v), "Inversión"]} /></PieChart></ResponsiveContainer> : <NoData msg="Cargando dispositivos..." />;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: CREATIVOS ═══ */}
      {activeTab === "creativos" && (
        <div className="space-y-6">
          {/* Top Ads from insights */}
          <div style={panelStyle}>
            <h3 style={headingStyle}>Top Anuncios por Rendimiento</h3>
            <p style={subStyle}>Los anuncios con mejor retorno de inversión</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Anuncio", "Inversión", "Resultados", "CPR", "CTR", "Clicks"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: h === "Anuncio" ? "left" : "right", fontSize: 10, fontWeight: 600, color: "rgba(148,163,184,0.4)", textTransform: "uppercase" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {(insights?.ads || []).map((ad: any) => {
                    const s = parseFloat(ad.spend || "0"); const c = parseInt(ad.clicks || "0", 10); const imp = parseInt(ad.impressions || "0", 10);
                    const ra = findResultAction(ad.actions); const r = ra ? parseInt(ra.value, 10) : 0;
                    return { name: ad.ad_name || "?", spend: s, results: r, cpr: r > 0 ? s / r : 0, ctr: imp > 0 ? (c / imp) * 100 : 0, clicks: c };
                  }).sort((a: any, b: any) => b.results - a.results).slice(0, 10).map((ad: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.025)" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "8px 10px", color: "#e2e8f0", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.name}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#fdab3d" }}>{fmtMXN(ad.spend)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#00c875", fontWeight: 600 }}>{ad.results}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#e2e8f0" }}>{fmtMXN(ad.cpr)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#7b61ff" }}>{pct(ad.ctr)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "rgba(148,163,184,0.6)" }}>{fmtNum(ad.clicks)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!insights?.ads?.length && <NoData />}
            </div>
          </div>

          {/* Dynamic Creative Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {([
              { key: "dynamic_headline", title: "Mejores Títulos", field: "title_asset" },
              { key: "dynamic_text", title: "Mejores Textos Principales", field: "body_asset" },
              { key: "dynamic_description", title: "Mejores Descripciones", field: "description_asset" },
              { key: "dynamic_cta", title: "Mejores CTAs", field: "call_to_action_asset" },
            ] as const).map(cfg => {
              const data = (breakdownData[cfg.key] || []).map((r: any) => {
                const label = r[cfg.field]?.text || r[cfg.field]?.name || r[cfg.field] || "?";
                return { name: typeof label === "string" ? label.slice(0, 40) : String(label), spend: parseFloat(r.spend || "0"), impressions: parseInt(r.impressions || "0", 10), clicks: parseInt(r.clicks || "0", 10) };
              }).sort((a: any, b: any) => b.spend - a.spend).slice(0, 5);
              return (
                <div key={cfg.key} style={panelStyle}>
                  <h3 style={headingStyle}>{cfg.title}</h3>
                  <p style={subStyle}>Top 5 por inversión (contenido dinámico)</p>
                  {data.length > 0 ? data.map((d: any, i: number) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.025)" }}>
                      <span style={{ width: 20, height: 20, borderRadius: 4, background: `${CHART_COLORS[i]}20`, color: CHART_COLORS[i], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</p>
                        <p style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>{fmtMXN(d.spend)} · {fmtNum(d.clicks)} clicks</p>
                      </div>
                      <div style={{ height: 4, width: 60, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${data[0]?.spend > 0 ? (d.spend / data[0].spend) * 100 : 0}%`, background: CHART_COLORS[i], borderRadius: 2 }} />
                      </div>
                    </div>
                  )) : <NoData msg="Requiere anuncios con contenido dinámico activo" />}
                </div>
              );
            })}
          </div>

          {/* Top Adsets */}
          <div style={panelStyle}>
            <h3 style={headingStyle}><Zap style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6, color: "#fdab3d" }} />Combinación Ganadora</h3>
            <p style={subStyle}>Campaña y conjunto con mejor rendimiento</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(() => {
                const top = (insights?.campaigns || []).map((c: any) => { const s = parseFloat(c.spend || "0"); const ra = findResultAction(c.actions); const r = ra ? parseInt(ra.value, 10) : 0; return { name: c.campaign_name || "?", results: r, cpa: r > 0 ? s / r : 0, spend: s }; }).sort((a: any, b: any) => b.spend - a.spend)[0];
                return top ? <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6, padding: 16 }}><p style={labelStyle}>Campaña Ganadora</p><p style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 8 }}>{top.name}</p><div style={{ display: "flex", gap: 16, fontSize: 12 }}><span><span style={{ color: "rgba(148,163,184,0.5)" }}>Resultados: </span><span style={{ color: "#00c875", fontWeight: 600 }}>{top.results}</span></span><span><span style={{ color: "rgba(148,163,184,0.5)" }}>CPA: </span><span style={{ color: "#00d4ff", fontWeight: 600 }}>{fmtMXN(top.cpa)}</span></span></div></div> : <div style={{ padding: 16, color: "rgba(148,163,184,0.3)", fontSize: 12 }}>Sin datos</div>;
              })()}
              {(() => {
                const top = (insights?.adsets || []).map((a: any) => { const s = parseFloat(a.spend || "0"); const ra = findResultAction(a.actions); const r = ra ? parseInt(ra.value, 10) : 0; return { name: a.adset_name || "?", results: r, cpa: r > 0 ? s / r : 0, spend: s }; }).sort((a: any, b: any) => b.spend - a.spend)[0];
                return top ? <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6, padding: 16 }}><p style={labelStyle}>Adset Ganador</p><p style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 8 }}>{top.name}</p><div style={{ display: "flex", gap: 16, fontSize: 12 }}><span><span style={{ color: "rgba(148,163,184,0.5)" }}>Resultados: </span><span style={{ color: "#00c875", fontWeight: 600 }}>{top.results}</span></span><span><span style={{ color: "rgba(148,163,184,0.5)" }}>CPA: </span><span style={{ color: "#00d4ff", fontWeight: 600 }}>{fmtMXN(top.cpa)}</span></span></div></div> : <div style={{ padding: 16, color: "rgba(148,163,184,0.3)", fontSize: 12 }}>Sin datos</div>;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: CONFIGURACIÓN ═══ */}
      {activeTab === "config" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div style={panelStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={headingStyle}>Información General</h3>
              {!isEditing ? <button onClick={() => setIsEditing(true)} style={{ background: "none", border: "none", color: "rgba(148,163,184,0.6)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}><Edit3 style={{ width: 14, height: 14 }} /> Editar</button>
                : <div style={{ display: "flex", gap: 8 }}><button onClick={() => { setIsEditing(false); setEditForm(project); }} style={{ background: "none", border: "none", color: "#e2445c", cursor: "pointer" }}><X style={{ width: 14, height: 14 }} /></button><button onClick={saveChanges} style={{ background: "none", border: "none", color: "#00c875", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}><Save style={{ width: 14, height: 14 }} /> Guardar</button></div>}
            </div>
            <div className="space-y-4">
              {([
                { label: "Alias", key: "alias" }, { label: "Cliente", key: "client" },
                { label: "Vertical", key: "vertical" }, { label: "Website", key: "website" },
                { label: "Buyer Persona", key: "persona" }, { label: "Geo Target", key: "geo" },
              ] as const).map(f => (
                <div key={f.key}>
                  <p style={labelStyle}>{f.label}</p>
                  {isEditing ? <input value={(editForm as any)[f.key] || ""} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(0,212,255,0.15)", color: "white", fontSize: 12, padding: "6px 10px", borderRadius: 4, outline: "none" }} />
                    : <p style={{ fontSize: 13, color: "#e2e8f0" }}>{(project as any)[f.key] || "—"}</p>}
                </div>
              ))}
              <div>
                <p style={labelStyle}>Estado</p>
                {isEditing ? <select value={editForm.status || project.status} onChange={e => setEditForm({ ...editForm, status: e.target.value as any })} style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", color: "white", fontSize: 12, padding: "6px 10px", borderRadius: 4, cursor: "pointer" }}>
                  <option value="Activo">Activo</option><option value="Pausado">Pausado</option><option value="Draft">Draft</option><option value="Completado">Completado</option></select>
                  : <span className={`badge badge-${STATUS_COLORS[project.status]}`}>{project.status}</span>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p style={labelStyle}>Fecha Inicio</p>{isEditing ? <input type="date" value={editForm.dateStart || ""} onChange={e => setEditForm({ ...editForm, dateStart: e.target.value })} style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", color: "#e2e8f0", fontSize: 11, padding: "6px", borderRadius: 4 }} /> : <p style={{ fontSize: 12, color: "#e2e8f0" }}>{project.dateStart ? new Date(project.dateStart).toLocaleDateString() : "—"}</p>}</div>
                <div><p style={labelStyle}>Fecha Fin</p>{isEditing ? <input type="date" value={editForm.dateEnd || ""} onChange={e => setEditForm({ ...editForm, dateEnd: e.target.value })} style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", color: "#e2e8f0", fontSize: 11, padding: "6px", borderRadius: 4 }} /> : <p style={{ fontSize: 12, color: "#e2e8f0" }}>{project.dateEnd ? new Date(project.dateEnd).toLocaleDateString() : "—"}</p>}</div>
              </div>
            </div>
          </div>

          {/* Channel Config */}
          <div style={panelStyle}>
            <h3 style={headingStyle}>Configuración de Canales</h3>
            <p style={subStyle}>{project.channels.length} canales configurados</p>
            {project.channels.map((c, i) => {
              const pl = PLATFORMS.find(p => p.id === c.platformId) || PLATFORMS[0];
              const bk2 = getBudgetBreakdown(parseBudget(c.budget), c.period);
              return (
                <div key={i} style={{ padding: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6, marginBottom: 8, borderLeft: `3px solid ${pl.color}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: pl.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{pl.name}</span>
                  </div>
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div><p style={labelStyle}>Presupuesto</p><input value={editForm.channels?.[i]?.budget || c.budget} onChange={e => { const ch2 = [...(editForm.channels || project.channels)]; ch2[i] = { ...ch2[i], budget: e.target.value }; setEditForm({ ...editForm, channels: ch2 }); }} style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(0,212,255,0.15)", color: "white", fontSize: 12, padding: "6px 10px", borderRadius: 4 }} /></div>
                      <div><p style={labelStyle}>Período</p><select value={editForm.channels?.[i]?.period || c.period} onChange={e => { const ch2 = [...(editForm.channels || project.channels)]; ch2[i] = { ...ch2[i], period: e.target.value }; setEditForm({ ...editForm, channels: ch2 }); }} style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", color: "white", fontSize: 12, padding: "6px 10px", borderRadius: 4, cursor: "pointer" }}><option value="Diario">Diario</option><option value="Semanal">Semanal</option><option value="Mensual">Mensual</option><option value="Anual">Anual</option></select></div>
                      <div><p style={labelStyle}>Objetivo</p><input value={editForm.channels?.[i]?.goal || c.goal} onChange={e => { const ch2 = [...(editForm.channels || project.channels)]; ch2[i] = { ...ch2[i], goal: e.target.value }; setEditForm({ ...editForm, channels: ch2 }); }} style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", color: "white", fontSize: 12, padding: "6px 10px", borderRadius: 4 }} /></div>
                      <div><p style={labelStyle}>CPR Meta</p><input value={editForm.channels?.[i]?.cpr || c.cpr} onChange={e => { const ch2 = [...(editForm.channels || project.channels)]; ch2[i] = { ...ch2[i], cpr: e.target.value }; setEditForm({ ...editForm, channels: ch2 }); }} style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", color: "white", fontSize: 12, padding: "6px 10px", borderRadius: 4 }} /></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-y-3 gap-x-6" style={{ fontSize: 12 }}>
                      <div><span style={{ color: "rgba(148,163,184,0.5)" }}>Presupuesto:</span> <span style={{ color: "white", fontWeight: 600 }}>{c.budget || "—"}</span></div>
                      <div><span style={{ color: "rgba(148,163,184,0.5)" }}>Período:</span> <span style={{ color: "white" }}>{c.period || "—"}</span></div>
                      <div><span style={{ color: "rgba(148,163,184,0.5)" }}>Objetivo:</span> <span style={{ color: "#00c875", fontWeight: 600 }}>{c.goal || "—"}</span></div>
                      <div><span style={{ color: "rgba(148,163,184,0.5)" }}>CPR Meta:</span> <span style={{ color: "#00d4ff", fontWeight: 600 }}>{c.cpr || "—"}</span></div>
                      <div><span style={{ color: "rgba(148,163,184,0.5)" }}>Diario ideal:</span> <span style={{ color: "white" }}>{fmtMXN(bk2.daily)}</span></div>
                      <div><span style={{ color: "rgba(148,163,184,0.5)" }}>Cuentas:</span> <span style={{ color: "white" }}>{c.adAccounts?.length || 0}</span></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
