"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Calendar, DollarSign, Target, Eye, TrendingUp, TrendingDown, Filter,
  BarChart2, Activity, Zap, CreditCard, CheckCircle, Clock, Edit3, Save, X,
  Users, Palette, Settings, ChevronDown, ChevronUp, AlertTriangle,
  Layers, Monitor, Smartphone, Globe, PieChart as PieIcon,
  HeartPulse, RefreshCw, MousePointer, Shield,
  Tag, Building, MapPin, Link, ShieldCheck
} from "lucide-react";


import { GoogleSourcesPanel } from "@/components/projects/GoogleSourcesPanel";
import { GoogleAdsDashboard } from "@/components/projects/GoogleAdsDashboard";
import { UserReliabilityModule } from "@/components/analytics/UserReliabilityModule";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, PieChart, Pie, Cell, Legend, BarChart, Bar, ReferenceLine
} from "recharts";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { CreativeCard, CreativeLightbox } from "@/components/shared/CreativePreview";
import { useInsightsStore } from "@/stores/insightsStore";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

import { TrafficAnalytics } from "@/components/proyectos/TrafficAnalytics";
import { ChartTheme } from "@/components/ui/charts/ChartTheme";
import { CustomTooltip } from "@/components/ui/charts/CustomTooltip";

/* ═══ TYPES ═══ */
interface ChannelConfig { platformId: string; platformName: string; adAccounts: string[]; budget: string; period: string; goal: string; cpr: string; monthlyOverrides?: Record<string, { budget?: string; cpr?: string; goal?: string }>; }
interface Project { id: string; alias: string; client: string; vertical: string; fanpage: string[]; instagram: string[]; whatsapp: string[]; website: string; channels: ChannelConfig[]; dateStart: string; dateEnd: string; persona: string; geo: string; status: "Activo"|"Pausado"|"Draft"|"Completado"|"EN VUELO"|"EN ÓRBITA"; createdAt: string; crmIntegrationId?: string | null; crmType?: string | null; crmIntegrationIds?: string[]; googleSources?: { adsCustomerId?: string; ga4PropertyId?: string; gtmAccountId?: string; gtmContainerId?: string; } | null; }


const PLATFORMS = [
  { id: "meta", name: "Meta Ads", color: "#0081FB" },
  { id: "google", name: "Google Ads", color: "#4285F4" },
  { id: "tiktok", name: "TikTok Ads", color: "#45aec2" },
  { id: "whatsapp", name: "WhatsApp Business", color: "#25D366" },
];
const STATUS_COLORS: Record<string, string> = { Activo: "emerald", Pausado: "amber", Draft: "muted", Completado: "cyan" };
const CPR_MAP: Record<string, string> = {
  "Conversaciones": "Costo / conversación", "Clics al sitio": "CPC", "Seguidores": "Costo / seguidor",
  "Leads": "CPL", "Ventas (Purchase)": "CPA", "Registros": "Costo / registro", "Descargas app": "CPI",
  "Video views": "CPV", "Alcance (Reach)": "CPM", "Tráfico a tienda": "Costo / visita",
};
const goalLabel = (goal?: string) => {
  if (!goal) return "Resultados";
  if (goal.includes("Lead")) return "Leads";
  if (goal.includes("Conversacion")) return "Conversaciones";
  if (goal.includes("Compra") || goal.includes("Purchase")) return "Compras";
  if (goal.includes("Registro")) return "Registros";
  return "Resultados";
};
// Goal → Meta action_type priority mapping
const GOAL_ACTION_MAP: Record<string, string[]> = {
  "Conversaciones": ["onsite_conversion.messaging_conversation_started_7d", "messaging_conversation_started_7d", "onsite_conversion.messaging_first_reply"],
  "Leads": ["lead", "leadgen_grouped", "onsite_conversion.lead_grouped"],
  "Ventas (Purchase)": ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"],
  "Registros": ["complete_registration", "omni_complete_registration", "offsite_conversion.fb_pixel_complete_registration"],
  "Clics al sitio": ["link_click", "landing_page_view"],
  "Descargas app": ["app_install", "omni_app_install"],
  "Video views": ["video_view"],
  "Alcance (Reach)": ["reach"],
  "Seguidores": ["page_engagement", "like"],
  "Tráfico a tienda": ["store_visit"],
};
const RESULT_TYPES_FALLBACK = ['onsite_conversion.messaging_conversation_started_7d','lead','purchase','complete_registration','omni_purchase','offsite_conversion','onsite_conversion','app_install','landing_page_view','link_click'];
const findResultAction = (actions: any[] | undefined, goal?: string) => {
  if (!actions?.length) return null;
  // 1. If we know the goal, try its specific action types FIRST (exact match)
  if (goal && GOAL_ACTION_MAP[goal]) {
    for (const t of GOAL_ACTION_MAP[goal]) {
      const exact = actions.find((a: any) => a.action_type === t);
      if (exact) return exact;
    }
  }
  // 2. Fallback: try exact match on common types (more specific first)
  for (const t of RESULT_TYPES_FALLBACK) {
    const exact = actions.find((a: any) => a.action_type === t);
    if (exact) return exact;
  }
  // 3. Last resort: substring match on fallback types
  for (const t of RESULT_TYPES_FALLBACK) {
    const partial = actions.find((a: any) => a.action_type.includes(t));
    if (partial) return partial;
  }
  return actions[0];
};
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
const panelStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 18,
};
const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 5 };
const headingStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.03em", marginBottom: 4 };
const subStyle: React.CSSProperties = { fontSize: 11, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 };
const tooltipStyle = { backgroundColor: "var(--surface)", border: "1px solid var(--border-strong)", borderLeft: "3px solid var(--cyan)", borderRadius: 8, fontSize: 12, color: "var(--foreground)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" };
const CHART_COLORS = ["var(--cyan)", "var(--emerald)", "var(--amber)", "var(--red)", "var(--purple)", "#5b9bff", "#bc5fb2", "#45aec2"];

function KpiBox({ title, value, sub, icon, color, progress }: any) {
  const c = color.startsWith("#") ? color : `var(--${color})`;
  const progressPct = progress !== undefined ? Math.min(Math.max(progress, 0), 100) : undefined;
  const isOverBudget = progress !== undefined && progress > 100;
  const progressColor = isOverBudget ? "var(--red)" : progressPct && progressPct > 75 ? "var(--emerald)" : c;
  return (
    <div
      className={`kpi-card ${color.startsWith("#") ? "" : color}`}
      style={{ paddingBottom: progress !== undefined ? 18 : 20, position: "relative" }}
    >
      {/* Background glow */}
      <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: 100, background: `radial-gradient(circle, ${c}10 0%, transparent 70%)`, transform: "translate(30%, -30%)", pointerEvents: "none" }} />
      {/* Icon + Label */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <div style={{ padding: "6px", background: `${c}14`, border: `1px solid ${c}28`, borderRadius: 9, color: c, display: "flex" }}>{icon}</div>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>{title}</span>
      </div>
      {/* Value */}
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", marginBottom: 3, fontFamily: "var(--font-display)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: progress !== undefined ? 10 : 0, fontFamily: "var(--font-mono)" }}>{sub}</div>
      {/* Progress bar */}
      {progress !== undefined && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>PROGRESO</span>
            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: isOverBudget ? "var(--red)" : progressPct && progressPct > 75 ? "var(--emerald)" : c }}>{progress.toFixed(0)}%</span>
          </div>
          <div className="progress-track">
            <div className={`progress-bar${isOverBudget ? " over-budget" : ""}`} style={{ width: `${Math.min(progress, 100)}%`, background: `linear-gradient(90deg, ${progressColor}, ${progressColor}cc)` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function NoData({ msg = "Sin datos disponibles" }: { msg?: string }) {
  return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", gap: 12, padding: 20 }}><BarChart2 style={{ width: 32, height: 32, color: "rgba(255,255,255,0.04)" }} /><p style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>{msg}</p></div>;
}

function LoadingOverlay() {
  return <div style={{ position: "absolute", inset: 0, background: "var(--surface)",  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10, borderRadius: "inherit" }}><div style={{ width: 30, height: 30, border: "3px solid var(--border-strong)", borderTopColor: "var(--cyan)", borderRadius: "50%", animation: "spin 1s linear infinite" }} /><span style={{ marginTop: 10, fontSize: 11, color: "var(--foreground)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Sincronizando Meta...</span></div>;
}

function TabButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`tab-pill${active ? " active" : ""}`}
      style={{ fontSize: 11 }}
    >
      <span className="tab-icon">{icon}</span>
      {label}
    </button>
  );
}

function TimeToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "var(--row-hover)", borderRadius: 6, padding: 3 }}>
      {[{ k: "day", l: "Día" }, { k: "week", l: "Semana" }, { k: "month", l: "Mes" }].map(t => (
        <button key={t.k} onClick={() => onChange(t.k)} style={{
          padding: "4px 12px", fontSize: 10, fontWeight: 600, borderRadius: 4, border: "none", cursor: "pointer",
          background: value === t.k ? "rgba(59,130,246,0.12)" : "transparent",
          color: value === t.k ? "var(--cyan)" : "var(--text-secondary)",
        }}>{t.l}</button>
      ))}
    </div>
  );
}

/* ═══ DB → Frontend Channel Mapper ═══ */
function mapDbChannelsToConfig(dbChannels: any[]): ChannelConfig[] {
  if (!dbChannels?.length) return [];
  return dbChannels.map((ch: any) => {
    const cfg = ch.config || {};
    return {
      platformId: cfg.platformId || ch.type?.toLowerCase() || ch.name?.toLowerCase() || "",
      platformName: cfg.platformName || ch.name || "",
      adAccounts: cfg.adAccounts || [],
      budget: cfg.budget || "",
      period: cfg.period || "Mensual",
      goal: cfg.goal || "",
      cpr: cfg.cpr || "",
      monthlyOverrides: cfg.monthlyOverrides || {},
    };
  });
}

/* ═══ MAIN PAGE ═══ */
export default function ProjectDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<"resumen"|"gasto"|"audiencia"|"creativos"|"salud"|"ads"|"config"|"trafico"|"historial"|"confiabilidad">("resumen");
  const [activePlatform, setActivePlatform] = useState("");
  const [insights, setInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [datePreset, setDatePreset] = useState("this_month");
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeIntegrations, setActiveIntegrations] = useState<{id: string, provider: string}[]>([]);
  const [heatMetricState, setHeatMetricState] = useState<"results" | "impressions" | "spend">("results");
  const [editingMonth, setEditingMonth] = useState<string>("global"); // "global" or "YYYY-MM"

  // Load project from API
  useEffect(() => {
    async function loadProject() {
      try {
        const res = await fetch(`/api/projects/${params.id}`);
        const json = await res.json();
        if (json.success && json.data) {
          const raw = json.data;
          const mapped: Project = {
            id: raw.id,
            alias: raw.alias || raw.name || "",
            client: raw.client || "",
            vertical: raw.vertical || "",
            fanpage: raw.fanpage || [],
            instagram: raw.instagram || [],
            whatsapp: raw.whatsapp || [],
            website: raw.website || "",
            channels: mapDbChannelsToConfig(raw.channels || []),
            dateStart: raw.dateStart || "",
            dateEnd: raw.dateEnd || "",
            persona: raw.persona || "",
            geo: raw.geo || "",
            status: raw.status || "Draft",
            createdAt: raw.createdAt || "",
            crmIntegrationId: raw.crmIntegrationId || null,
            crmType: raw.crmType || null,
            crmIntegrationIds: raw.crmIntegrationIds || [],
          };
          setProject(mapped);
          setEditForm(mapped);
          if (mapped.channels.length > 0) setActivePlatform(mapped.channels[0].platformId);
        } else {
          router.push("/dashboard/proyectos");
        }
      } catch {
        router.push("/dashboard/proyectos");
      }
    }
    loadProject();
  }, [params.id, router]);

  // Load account names + pages + integrations
  useEffect(() => {
    fetch("/api/meta/adaccounts").then(r => r.json()).then(d => {
      if (d.data) { const n: Record<string, string> = {}; d.data.forEach((a: any) => { n[a.id] = a.name?.split(" — ")[0] || a.id; }); setAccountNames(n); }
    }).catch(() => {});
    Promise.all([
      fetch("/api/meta/pages?module=social").catch(() => null),
      fetch("/api/meta/pages?module=ads").catch(() => null)
    ]).then(async ([resSocial, resAds]) => {
      let allPages: any[] = [];
      if (resSocial?.ok) {
        const d = await resSocial.json();
        if (d.data) allPages = [...d.data];
      }
      if (resAds?.ok) {
        const d = await resAds.json();
        if (d.data) {
          const existingIds = new Set(allPages.map((p) => p.id));
          d.data.forEach((p: any) => {
            if (!existingIds.has(p.id)) allPages.push(p);
          });
        }
      }
      setMetaPages(allPages);
    });
    fetch("/api/workspace/integrations").then(r => r.json()).then(d => { if (Array.isArray(d.data?.data)) setActiveIntegrations(d.data.data.filter((i: any) => i.connected)); }).catch(() => {});
  }, []);

  // Load insights — cache-first with background revalidation
  const insightsStore = useInsightsStore();
  useEffect(() => {
    if (!project || !activePlatform) return;
    const ch = project.channels.find(c => c.platformId === activePlatform);
    if (activePlatform !== "meta" || !ch?.adAccounts?.length) { setInsights(null); return; }

    const accs = selectedAccountId === "all" ? ch.adAccounts : [selectedAccountId];
    const effectivePreset = (dateStart && dateEnd) ? undefined : (datePreset || "this_month");

    // 1. Show cached data immediately (no loading spinner)
    const cached = insightsStore.getCached(project.id, effectivePreset, dateStart, dateEnd);
    if (cached) {
      setInsights(cached);
      // Don't show loading for revalidation — data is already visible
    } else {
      setIsLoading(true);
    }

    // 2. Always revalidate in background
    setBreakdownData({});
    setAdCreatives([]);
    insightsStore.fetchProjectInsights(project.id, accs, effectivePreset, dateStart, dateEnd)
      .then(data => {
        if (data) setInsights(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
        if (!cached) setInsights({ _error: "Fetch failed", timeSeries: [], campaigns: [], adsets: [], ads: [] });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, activePlatform, dateStart, dateEnd, datePreset, selectedAccountId]);

  // Track which breakdowns have been attempted (prevents re-fetch loops)
  const breakdownFetchedRef = useRef<Record<string, boolean>>({});

  // Reset breakdown cache when filters change
  useEffect(() => {
    breakdownFetchedRef.current = {};
  }, [project, activePlatform, dateStart, dateEnd, datePreset, selectedAccountId]);

  // Load breakdowns for audience/creative tabs — uses same date range
  // KEY FIX: Aggregate across ALL ad accounts when "all" selected (not just first)
  const loadBreakdown = useCallback(async (key: string) => {
    // Skip if already fetched for this key
    if (breakdownFetchedRef.current[key] || !project) return;
    breakdownFetchedRef.current[key] = true;

    const ch = project.channels.find(c => c.platformId === activePlatform);
    if (!ch?.adAccounts?.length) return;

    // Determine which accounts to query
    const accs = selectedAccountId === "all" ? ch.adAccounts : [selectedAccountId];
    const dp = datePreset || "this_month";

    try {
      // Fetch from ALL accounts in parallel
      const results = await Promise.all(accs.map(async (accRaw) => {
        const id = accRaw.startsWith("act_") ? accRaw : `act_${accRaw}`;
        const url = dateStart && dateEnd
          ? `/api/meta/breakdowns?id=${id}&breakdown=${key}&dateStart=${dateStart}&dateEnd=${dateEnd}`
          : `/api/meta/breakdowns?id=${id}&breakdown=${key}&preset=${dp}`;
        try {
          const r = await fetch(url);
          const d = await r.json();
          if (d.error) { console.error(`Breakdown ${key} error for ${id}:`, d.error); return []; }
          return d.data || [];
        } catch (err) { console.error(`Breakdown ${key} fetch failed for ${id}:`, err); return []; }
      }));

      // Merge all results into one array
      const merged: any[] = [];
      results.forEach(arr => merged.push(...arr));
      setBreakdownData(prev => ({ ...prev, [key]: merged }));
    } catch (err) {
      console.error(`Breakdown ${key} fetch all failed:`, err);
      setBreakdownData(prev => ({ ...prev, [key]: [] }));
    }
  }, [project, activePlatform, selectedAccountId, datePreset, dateStart, dateEnd]);

  // Ad Creatives state
  const [adCreatives, setAdCreatives] = useState<any[]>([]);
  const [creativesLoading, setCreativesLoading] = useState(false);
  const [previewAd, setPreviewAd] = useState<any>(null);
  const creativeFetchedRef = useRef(false);

  // Reset creative cache when filters change
  useEffect(() => {
    creativeFetchedRef.current = false;
  }, [project, activePlatform, dateStart, dateEnd, datePreset, selectedAccountId]);

  // Load ad creatives when on creativos tab
  const loadAdCreatives = useCallback(async () => {
    if (!project || creativeFetchedRef.current) return;
    creativeFetchedRef.current = true; // Mark as attempted immediately
    const ch = project.channels.find(c => c.platformId === activePlatform);
    if (!ch?.adAccounts?.length) return;
    setCreativesLoading(true);
    const accs = selectedAccountId === "all" ? ch.adAccounts : [selectedAccountId];
    let dp = ""; if (dateStart && dateEnd) dp = `&dateStart=${dateStart}&dateEnd=${dateEnd}`; else if (datePreset && datePreset !== "custom") dp = `&preset=${datePreset}`;
    try {
      const results = await Promise.all(accs.map(a => fetch(`/api/meta/adcreatives?adAccountId=${a}${dp}`).then(r => r.json()).catch(() => null)));
      const all: any[] = [];
      results.forEach((r: any) => { if (r?.data) all.push(...r.data); });
      setAdCreatives(all.sort((a, b) => b.spend - a.spend));
    } catch {}
    setCreativesLoading(false);
  }, [project, activePlatform, selectedAccountId, datePreset, dateStart, dateEnd]);

  // KEY FIX: Track a "filter version" so breakdowns re-load when filters change
  // The loadBreakdown ref is now reset by the effect above, so the effect below
  // just needs to re-trigger when the tab changes OR when loadBreakdown identity changes
  // (which it does because it depends on all filter values via useCallback deps)
  useEffect(() => {
    if (activeTab === "audiencia") {
      loadBreakdown("age_gender");
      loadBreakdown("region");
      loadBreakdown("country");
      loadBreakdown("platform");
      loadBreakdown("device");
      loadBreakdown("placement");
      loadBreakdown("time_of_day");
    }
    if (activeTab === "resumen") {
      loadBreakdown("hourly_daily");
    }
    if (activeTab === "creativos") { loadAdCreatives(); }
  }, [activeTab, loadBreakdown, loadAdCreatives]);

  const saveChanges = async () => {
    if (!project) return;
    try {
      const channelsForApi = (editForm.channels || project.channels).map(c => ({
        name: c.platformName,
        type: c.platformId.toUpperCase(),
        config: {
          platformId: c.platformId,
          platformName: c.platformName,
          adAccounts: c.adAccounts,
          budget: c.budget,
          period: c.period,
          goal: c.goal,
          cpr: c.cpr,
          monthlyOverrides: c.monthlyOverrides,
        },
      }));
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, name: editForm.alias, channels: channelsForApi }),
      });
      const json = await res.json();
      if (json.success) {
        const updated = { ...project, ...editForm } as Project;
        setProject(updated);
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Failed to save project", err);
    }
  };

  if (!project) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 200 }}><div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.04)", borderTopColor: "var(--cyan)", borderRadius: "50%", animation: "spin 1s linear infinite" }} /><span style={{ fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" }}>Cargando proyecto...</span></div>;

  const ch = project.channels.find(c => c.platformId === activePlatform);
  
  // Resolve budget/cpr for current viewed month if possible
  let resolvedBudget = ch?.budget || "0";
  let resolvedCpr = ch?.cpr || "0";
  let resolvedGoal = ch?.goal || "";
  
  // Si estamos filtrando por un mes específico, buscar el override
  let viewedMonth = "";
  if (datePreset === "this_month") {
    const now = new Date();
    viewedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  } else if (datePreset === "last_month") {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    viewedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  
  if (ch?.monthlyOverrides && viewedMonth && ch.monthlyOverrides[viewedMonth]) {
    const override = ch.monthlyOverrides[viewedMonth];
    if (override.budget) resolvedBudget = override.budget;
    if (override.cpr) resolvedCpr = override.cpr;
    if (override.goal) resolvedGoal = override.goal;
  }

  const budgetNum = ch ? parseBudget(resolvedBudget) : 0;
  const cprTarget = ch ? parseBudget(resolvedCpr) : 0;
  const bk = getBudgetBreakdown(budgetNum, ch?.period || "Mensual");
  // Meta de resultados = presupuesto mensual / CPR meta
  const goalMonthly = cprTarget > 0 ? Math.floor(bk.monthly / cprTarget) : 0;
  const goalNum = goalMonthly; // siempre meta mensual para proyecciones
  const goalBreakdown = {
    daily: cprTarget > 0 ? bk.daily / cprTarget : 0,
    weekly: cprTarget > 0 ? bk.weekly / cprTarget : 0,
    monthly: goalMonthly,
  };

  // Aggregate metrics
  let totalSpend = 0, totalResults = 0, totalImpressions = 0, totalClicks = 0, totalReach = 0, totalActionValue = 0;
  (insights?.timeSeries || []).forEach((d: any) => {
    totalSpend += parseFloat(d.spend || "0"); totalImpressions += parseInt(d.impressions || "0", 10); totalClicks += parseInt(d.clicks || "0", 10);
    totalReach += parseInt(d.reach || "0", 10);
    const ra = findResultAction(d.actions, ch?.goal); if (ra) totalResults += parseInt(ra.value, 10);
    const va = findResultAction(d.action_values, ch?.goal); if (va) totalActionValue += parseFloat(va.value);
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
  const timeSeriesData = (() => {
    const grouped: Record<string, any> = {};
    (insights?.timeSeries || []).forEach((d: any) => {
      const fd = d.date_start || "";
      if (!grouped[fd]) {
        grouped[fd] = { fullDate: fd, spend: 0, results: 0, impressions: 0, clicks: 0 };
      }
      const s = parseFloat(d.spend || "0");
      const ra = findResultAction(d.actions, ch?.goal); const r = ra ? parseInt(ra.value, 10) : 0;
      const imp = parseInt(d.impressions || "0", 10); const cl = parseInt(d.clicks || "0", 10);
      
      grouped[fd].spend += s;
      grouped[fd].results += r;
      grouped[fd].impressions += imp;
      grouped[fd].clicks += cl;
    });

    return Object.values(grouped).map((g: any) => {
      const parts = g.fullDate.split('-');
      const dateLabel = parts.length >= 3 ? `${parts[2]}/${parts[1]}` : g.fullDate;
      return {
        date: dateLabel, fullDate: g.fullDate, spend: +g.spend.toFixed(2), results: g.results,
        cpr: g.results > 0 ? +(g.spend / g.results).toFixed(2) : 0,
        ctr: g.impressions > 0 ? +((g.clicks / g.impressions) * 100).toFixed(2) : 0,
        cpc: g.clicks > 0 ? +(g.spend / g.clicks).toFixed(2) : 0,
        impressions: g.impressions, clicks: g.clicks
      };
    }).sort((a: any, b: any) => a.fullDate.localeCompare(b.fullDate));
  })();

  // Spend table with aggregation
  const getSpendTable = () => {
    const grouped: Record<string, any> = {};
    timeSeriesData.forEach((d: any) => {
      let key: string;
      const parts = d.date.split("/");
      if (timeGranularity === "month") key = parts[1] || d.date;
      else if (timeGranularity === "week") {
        const dayNum = parseInt(parts[0] || "1", 10);
        key = `S${Math.ceil(dayNum / 7)}`;
      } else {
        key = d.fullDate;
      }
      
      if (!grouped[key]) grouped[key] = { date: timeGranularity === "day" ? d.date : key, fullDate: d.fullDate, spend: 0, results: 0, impressions: 0, clicks: 0 };
      grouped[key].spend += d.spend;
      grouped[key].results += d.results;
      grouped[key].impressions += d.impressions;
      grouped[key].clicks += d.clicks;
    });
    return Object.values(grouped).map((g: any) => ({ ...g, spend: +g.spend.toFixed(2), cpr: g.results > 0 ? +(g.spend / g.results).toFixed(2) : 0, ctr: g.impressions > 0 ? +((g.clicks / g.impressions) * 100).toFixed(2) : 0, cpc: g.clicks > 0 ? +(g.spend / g.clicks).toFixed(2) : 0 })).sort((a: any, b: any) => (a.fullDate || "").localeCompare(b.fullDate || ""));
  };


  return (
    <div className="space-y-4 page-enter">
      <svg style={{ width: 0, height: 0, position: "absolute" }}><ChartTheme /></svg>
      {/* ── HEADER ── */}
      <div style={{
        position: "relative", zIndex: 999,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
        background: "var(--surface)", border: "1px solid var(--hairline)",
        borderRadius: 14, padding: "14px 18px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.push("/dashboard/proyectos")}
            style={{
              width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--surface-hover)", border: "1px solid var(--border)",
              borderRadius: 8, color: "var(--text-secondary)", cursor: "pointer",
              transition: "all 0.15s", flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)"; (e.currentTarget as HTMLButtonElement).style.color = "white"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; }}
          >
            <ArrowLeft style={{ width: 15, height: 15 }} />
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              {/* Live pulse for active projects */}
              {(project.status === "EN VUELO" || project.status === "Activo") && (
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--emerald)", boxShadow: "0 0 10px rgba(52,183,124,0.8)", animation: "status-pulse 2s infinite", display: "inline-block", flexShrink: 0 }} />
              )}
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.04em", lineHeight: 1 }}>{project.alias}</h1>
              <span className={`badge badge-${STATUS_COLORS[project.status] || "muted"}`}>{project.status}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {project.client && <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>{project.client}</span>}
              {project.client && project.vertical && <span style={{ fontSize: 10, color: "rgba(108,124,147,0.5)" }}>·</span>}
              {project.vertical && <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{project.vertical}</span>}
              {project.channels.length > 0 && (
                <>
                  <span style={{ fontSize: 10, color: "rgba(108,124,147,0.5)" }}>·</span>
                  {project.channels.slice(0, 3).map(c => {
                    const pl = PLATFORMS.find(x => x.id === c.platformId);
                    return (
                      <span key={c.platformId} style={{
                        fontSize: 10, padding: "2px 7px", borderRadius: 4, fontWeight: 700,
                        border: `1px solid ${pl?.color ? pl.color + "50" : "var(--hairline)"}`,
                        color: pl?.color || "var(--text-muted)",
                        background: pl?.color ? pl.color + "14" : "transparent",
                      }}>
                        {c.platformName}
                      </span>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
        <DateRangePicker datePreset={datePreset} dateStart={dateStart} dateEnd={dateEnd} showDatePicker={showDatePicker} setShowDatePicker={setShowDatePicker}
          onPresetSelect={(p: string) => { setDatePreset(p); setDateStart(""); setDateEnd(""); setBreakdownData({}); }}
          onCustomRange={(s: string, e: string) => { setDatePreset("custom"); setDateStart(s); setDateEnd(e); setBreakdownData({}); }} />
      </div>

      {/* ── KPIs ── (hidden on Ads Manager tab) */}
      {activeTab !== "ads" && (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3" style={{ position: "relative" }}>
        {isLoading && <LoadingOverlay />}
        <KpiBox title="Inversión" value={fmtMXN0(totalSpend)} sub={`de ${fmtMXN0(budgetNum)} (${bk.label})`} icon={<DollarSign style={{ width: 16, height: 16 }} />} color="amber" progress={spendProgress} />
        <KpiBox title="Resultados" value={fmtNum(totalResults)} sub={ch?.goal || "Objetivo"} icon={<Target style={{ width: 16, height: 16 }} />} color="emerald" progress={goalCompletion} />
        <KpiBox title="CPR" value={fmtMXN(cpr)} sub={cprTarget > 0 ? `Meta: ${fmtMXN(cprTarget)}` : "Costo por resultado"} icon={<Activity style={{ width: 16, height: 16 }} />} color="cyan" />
        <KpiBox title="CTR" value={pct(ctr)} sub="Click-through rate" icon={<Eye style={{ width: 16, height: 16 }} />} color="purple" />
        <KpiBox title="ROAS" value={`${roas.toFixed(1)}x`} sub="Return on ad spend" icon={<TrendingUp style={{ width: 16, height: 16 }} />} color="purple" />
      </div>
      )}

      {/* ── TABS + PLATFORM SELECTOR ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        {/* Tabs scrollable container */}
        <div style={{ overflowX: "auto", flexShrink: 1, minWidth: 0, paddingBottom: 2 }}>
          <div className="tab-pill-nav">
            <TabButton active={activeTab === "resumen"} label="Resumen" icon={<BarChart2 style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("resumen")} />
            <TabButton active={activeTab === "gasto"} label="Gasto" icon={<DollarSign style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("gasto")} />
            <TabButton active={activeTab === "audiencia"} label="Audiencia" icon={<Users style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("audiencia")} />
            <TabButton active={activeTab === "creativos"} label="Creativos" icon={<Palette style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("creativos")} />
            <TabButton active={activeTab === "salud"} label="Salud" icon={<HeartPulse style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("salud")} />
            <TabButton active={activeTab === "confiabilidad"} label="Confiabilidad" icon={<ShieldCheck style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("confiabilidad")} />
            <TabButton active={activeTab === "ads"} label="Ads Manager" icon={<Layers style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("ads")} />

            {!!project.website && (
              <TabButton active={activeTab === "trafico"} label="Tráfico" icon={<Globe style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("trafico")} />
            )}
            <TabButton active={activeTab === "historial"} label="Historial" icon={<TrendingUp style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("historial")} />
            <TabButton active={activeTab === "config"} label="Configuración" icon={<Settings style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("config")} />
          </div>
        </div>
        {/* Platform + Account selectors */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {project.channels.map(c => {
            const pl = PLATFORMS.find(p => p.id === c.platformId) || PLATFORMS[0];
            const isActive = activePlatform === c.platformId;
            return (
              <button key={c.platformId} onClick={() => { setActivePlatform(c.platformId); setBreakdownData({}); }} style={{
                padding: "6px 14px", fontSize: 11, fontWeight: 700,
                background: isActive ? `${pl.color}20` : "rgba(255,255,255,0.04)",
                border: `1px solid ${isActive ? pl.color + "60" : "rgba(255,255,255,0.08)"}`,
                color: isActive ? pl.color : "var(--text-muted)",
                borderRadius: 20, cursor: "pointer", transition: "all 0.2s",
                boxShadow: isActive ? `0 0 16px ${pl.color}25` : "none",
              }}>
                {pl.name}
              </button>
            );
          })}
          {ch?.adAccounts && ch.adAccounts.length > 1 && (
            <select value={selectedAccountId} onChange={e => { setSelectedAccountId(e.target.value); setBreakdownData({}); }} style={{
background: "var(--surface)", border: "1px solid var(--border)",
              color: "var(--foreground)", fontSize: 11, padding: "6px 24px 6px 12px",
              borderRadius: 20, cursor: "pointer", appearance: "none", fontWeight: 600,
            }}>
              <option value="all">Todas ({ch.adAccounts.length})</option>
              {ch.adAccounts.map(a => <option key={a} value={a}>{accountNames[a] || a}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* ═══ TAB: HISTORIAL ═══ */}
      {activeTab === "historial" && (
        <ErrorBoundary name="Tab Historial">
          <div style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={headingStyle}>Historial de Rendimiento</h3>
                <p style={subStyle}>Comparativa de resultados reales vs. metas mensuales para el rango de fechas seleccionado.</p>
              </div>
            </div>
            
            {/* Disclaimer si el rango no es grande */}
            {datePreset !== "this_year" && datePreset !== "all_time" && (
              <div style={{ padding: "10px 14px", background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 6, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                <Activity style={{ width: 16, height: 16, color: "var(--cyan)" }} />
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Para ver un historial completo, cambia el filtro de fechas a <strong>"Este Año"</strong>.</span>
              </div>
            )}

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ border: "1px solid var(--border)" }}>
                    <th style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 600 }}>Mes</th>
                    <th style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 600 }}>Inversión Real</th>
                    <th style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 600 }}>Inversión Meta</th>
                    <th style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 600 }}>CPA Real</th>
                    <th style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 600 }}>CPA Meta</th>
                    <th style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 600 }}>Resultados</th>
                    <th style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 600 }}>Resultados Meta</th>
                    <th style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 600 }}>Estatus (CPA)</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Group data by YYYY-MM
                    const monthly: Record<string, { spend: number, results: number }> = {};
                    (insights?.timeSeries || []).forEach((d: any) => {
                      const dateStr = d.date_start; // "2026-07-28"
                      if (!dateStr) return;
                      const monthKey = dateStr.substring(0, 7); // "2026-07"
                      if (!monthly[monthKey]) monthly[monthKey] = { spend: 0, results: 0 };
                      
                      const s = parseFloat(d.spend || "0");
                      const ra = findResultAction(d.actions, ch?.goal); 
                      const r = ra ? parseInt(ra.value, 10) : 0;
                      
                      monthly[monthKey].spend += s;
                      monthly[monthKey].results += r;
                    });
                    
                    const sortedKeys = Object.keys(monthly).sort((a, b) => b.localeCompare(a));
                    
                    if (sortedKeys.length === 0) {
                      return <tr><td colSpan={8} style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>No hay datos para el rango seleccionado.</td></tr>;
                    }
                    
                    return sortedKeys.map(monthKey => {
                      const data = monthly[monthKey];
                      const globalBudget = ch ? parseBudget(ch.budget) : 0;
                      const globalCpr = ch ? parseBudget(ch.cpr || "0") : 0;
                      
                      let mBudget = globalBudget;
                      let mCpr = globalCpr;
                      
                      if (ch?.monthlyOverrides?.[monthKey]) {
                        if (ch.monthlyOverrides[monthKey].budget) mBudget = parseBudget(ch.monthlyOverrides[monthKey].budget!);
                        if (ch.monthlyOverrides[monthKey].cpr) mCpr = parseBudget(ch.monthlyOverrides[monthKey].cpr!);
                      }
                      
                      const mBreakdown = getBudgetBreakdown(mBudget, ch?.period || "Mensual");
                      const mBudgetMonthly = mBreakdown.monthly;
                      const mGoal = mCpr > 0 ? Math.floor(mBudgetMonthly / mCpr) : 0;
                      
                      const actualCpa = data.results > 0 ? data.spend / data.results : 0;
                      
                      // Status logic: 
                      // if actualCpa <= mCpr * 1.05 -> on-track (green)
                      // if actualCpa <= mCpr * 1.20 -> at-risk (yellow)
                      // else -> off-track (red)
                      let statusEl;
                      if (mCpr <= 0) {
                        statusEl = <span style={{ color: "var(--text-muted)" }}>Sin meta</span>;
                      } else if (actualCpa <= mCpr * 1.05) {
                        statusEl = <span style={{ color: "var(--emerald)", fontWeight: 600 }}>🟢 Superado</span>;
                      } else if (actualCpa <= mCpr * 1.20) {
                        statusEl = <span style={{ color: "var(--amber)", fontWeight: 600 }}>🟡 Riesgo</span>;
                      } else {
                        statusEl = <span style={{ color: "var(--red)", fontWeight: 600 }}>🔴 Desviado</span>;
                      }

                      return (
                        <tr key={monthKey} style={{ border: "1px solid var(--hairline)" }}>
                          <td style={{ padding: "12px 14px", color: "var(--foreground)", fontWeight: 600 }}>{monthKey}</td>
                          <td style={{ padding: "12px 14px", color: data.spend > mBudgetMonthly ? "var(--red)" : "white" }}>{fmtMXN0(data.spend)}</td>
                          <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>{fmtMXN0(mBudgetMonthly)}</td>
                          <td style={{ padding: "12px 14px", color: actualCpa > mCpr * 1.1 ? "var(--red)" : "white" }}>{fmtMXN(actualCpa)}</td>
                          <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>{fmtMXN(mCpr)}</td>
                          <td style={{ padding: "12px 14px", color: data.results >= mGoal ? "var(--emerald)" : "white" }}>{fmtNum(data.results)}</td>
                          <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>{fmtNum(mGoal)}</td>
                          <td style={{ padding: "12px 14px" }}>{statusEl}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </ErrorBoundary>
      )}

      {/* ═══ TAB: CONFIABILIDAD ═══ */}
      {activeTab === "confiabilidad" && activePlatform === "meta" && (
        <ErrorBoundary name="Tab Confiabilidad">
          <UserReliabilityModule 
             adAccountId={selectedAccountId === "all" ? (ch?.adAccounts?.[0] || "") : selectedAccountId}
             dateStart={dateStart} 
             dateEnd={dateEnd}
             goal={ch?.goal || "Conversaciones"}
             cprTarget={ch?.cpr ? parseBudget(ch.cpr) : 0}
          />
        </ErrorBoundary>
      )}

      {/* ═══ TAB: RESUMEN ═══ */}
      {activeTab === "resumen" && activePlatform === "google" && (
        <GoogleAdsDashboard project={project} dateStart={dateStart} dateEnd={dateEnd} preset={datePreset} />
      )}
      {activeTab === "resumen" && activePlatform !== "google" && (
        <ErrorBoundary name="Tab Resumen">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            {/* Proyeccion al Cierre */}
            <div style={panelStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h3 style={headingStyle}>Proyección al Cierre</h3>
                  <p style={subStyle}>Día {daysElapsed} de {daysInMonth} del mes{goalNum > 0 ? ` · Meta: ${fmtNum(goalNum)} resultados (${fmtMXN0(bk.monthly)} ÷ ${fmtMXN(cprTarget)})` : ""}</p>
                </div>
                <div style={{
                  padding: "5px 14px", borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
                  background: trackStatus === "on-track" ? "rgba(0,200,117,0.12)" : trackStatus === "at-risk" ? "rgba(253,171,61,0.12)" : "rgba(226,68,92,0.12)",
                  color: trackStatus === "on-track" ? "var(--emerald)" : trackStatus === "at-risk" ? "var(--amber)" : "var(--red)",
                  border: `1px solid ${trackStatus === "on-track" ? "rgba(0,200,117,0.25)" : trackStatus === "at-risk" ? "rgba(253,171,61,0.25)" : "rgba(226,68,92,0.25)"}`,
                  boxShadow: trackStatus === "on-track" ? "0 0 12px rgba(0,200,117,0.15)" : trackStatus === "at-risk" ? "0 0 12px rgba(253,171,61,0.15)" : "0 0 12px rgba(226,68,92,0.15)",
                }}>
                  {trackStatus === "on-track" ? "✓ EN TRACK" : trackStatus === "at-risk" ? "⚠ EN RIESGO" : trackStatus === "off-track" ? "✕ FUERA DE TRACK" : cprTarget <= 0 ? "FALTA CPR META" : "SIN OBJETIVO"}
                </div>
              </div>
              {/* Sub-KPI mini-cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { label: "Res. proyectados", value: fmtNum(projectedResults), sub: goalNum > 0 ? `de ${fmtNum(goalNum)} objetivo` : "sin meta", color: "var(--emerald)", accentColor: "rgba(0,200,117,0.35)" },
                  { label: "Gasto proyectado", value: fmtMXN0(projectedSpend), sub: `de ${fmtMXN0(bk.monthly)} mensual`, color: "var(--amber)", accentColor: "rgba(253,171,61,0.35)" },
                  { label: "Meta diaria ideal", value: goalBreakdown.daily > 0 ? goalBreakdown.daily.toFixed(1) : "—", sub: "resultados/día", color: "var(--cyan)", accentColor: "rgba(59,130,246,0.35)" },
                  { label: "Ritmo necesario", value: dailyNeeded > 0 ? fmtNum(dailyNeeded) : "—", sub: "res/día restantes", color: dailyNeeded > 0 ? "var(--amber)" : "var(--text-muted)", accentColor: dailyNeeded > 0 ? "rgba(253,171,61,0.35)" : "rgba(255,255,255,0.1)" },
                  { label: "Cumplimiento", value: goalNum > 0 ? pct(goalCompletion) : "—", sub: `${daysRemaining} días restantes`, color: goalCompletion >= 100 ? "var(--emerald)" : "white", accentColor: goalCompletion >= 100 ? "rgba(0,200,117,0.35)" : "rgba(255,255,255,0.1)" },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: "var(--surface-hover)", borderRadius: 10,
                    border: "1px solid var(--border)", padding: "12px 14px",
                    borderTop: `2px solid ${item.accentColor}`, position: "relative", overflow: "hidden",
                  }}>
                    <p style={{ ...labelStyle, marginBottom: 6 }}>{item.label}</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: item.color, fontFamily: "var(--font-display)", lineHeight: 1 }}>{item.value}</p>
                    <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>{item.sub}</p>
                  </div>
                ))}
              </div>
              {goalNum > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.1em" }}>PROGRESO DEL MES</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: trackStatus === "on-track" ? "var(--emerald)" : trackStatus === "at-risk" ? "var(--amber)" : "var(--red)" }}>{pct(Math.min(goalCompletion, 100))}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--surface-hover)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(goalCompletion, 100)}%`, background: trackStatus === "on-track" ? "var(--emerald)" : trackStatus === "at-risk" ? "var(--amber)" : "var(--red)", borderRadius: 3, transition: "width 0.5s", boxShadow: `0 0 8px ${trackStatus === "on-track" ? "rgba(0,200,117,0.5)" : "rgba(253,171,61,0.5)"}` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3" style={{ position: "relative" }}>
              {isLoading && <LoadingOverlay />}

              {/* Chart 1: Inversión vs Resultados */}
              <div className="chart-panel">
                <div className="chart-panel-header">
                  <div>
                    <span className="chart-panel-title">Inversión vs Resultados</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--cyan)", display: "inline-block" }} /><span style={{ fontSize: 10, color: "var(--text-muted)" }}>Inversión</span></div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--emerald)", display: "inline-block" }} /><span style={{ fontSize: 10, color: "var(--text-muted)" }}>Resultados</span></div>
                    </div>
                  </div>
                </div>
                <div className="chart-panel-body">
                  <div style={{ width: "100%", height: 240 }}>
                    {timeSeriesData.length > 0 ? (
                      <ResponsiveContainer><ComposedChart data={timeSeriesData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" tick={{ fontFamily: "var(--font-mono)" }} />
                        <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} tick={{ fontFamily: "var(--font-mono)" }} />
                        <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} tick={{ fontFamily: "var(--font-mono)" }} />
                        <Tooltip content={<CustomTooltip formatter={(name, v) => name === "spend" || name === "Inversión" ? [fmtMXN(Number(v)), "Inversión"] : [String(v), "Resultados"]} />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                        <Area yAxisId="left" type="monotone" dataKey="spend" name="Inversión" stroke="var(--cyan)" strokeWidth={2} fillOpacity={1} fill="url(#colorCyanArea)" dot={false} />
                        <Bar yAxisId="right" dataKey="results" name="Resultados" fill="url(#colorEmeraldBar)" radius={[4, 4, 0, 0]} barSize={7} />
                      </ComposedChart></ResponsiveContainer>
                    ) : <NoData />}
                  </div>
                </div>
              </div>

              {/* Chart 2: CTR vs CPC */}
              <div className="chart-panel">
                <div className="chart-panel-header">
                  <div>
                    <span className="chart-panel-title">CTR vs CPC</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--cyan)", display: "inline-block" }} /><span style={{ fontSize: 10, color: "var(--text-muted)" }}>CTR %</span></div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--amber)", display: "inline-block" }} /><span style={{ fontSize: 10, color: "var(--text-muted)" }}>CPC $</span></div>
                    </div>
                  </div>
                </div>
                <div className="chart-panel-body">
                  <div style={{ width: "100%", height: 240 }}>
                    {timeSeriesData.length > 0 ? (
                      <ResponsiveContainer><ComposedChart data={timeSeriesData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" tick={{ fontFamily: "var(--font-mono)" }} />
                        <YAxis yAxisId="l" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} tick={{ fontFamily: "var(--font-mono)" }} />
                        <YAxis yAxisId="r" orientation="right" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} tick={{ fontFamily: "var(--font-mono)" }} />
                        <Tooltip content={<CustomTooltip formatter={(name, v) => name === "ctr" || name === "CTR (%)" ? [`${Number(v).toFixed(2)}%`, "CTR"] : [fmtMXN(Number(v)), "CPC"]} />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                        <Area yAxisId="l" type="monotone" dataKey="ctr" name="CTR (%)" stroke="var(--cyan)" strokeWidth={2} fillOpacity={1} fill="url(#colorCyanArea)" dot={false} />
                        <Line yAxisId="r" type="monotone" dataKey="cpc" name="CPC ($)" stroke="var(--amber)" strokeWidth={2} dot={{ r: 3, fill: "var(--surface)", stroke: "var(--amber)", strokeWidth: 2 }} activeDot={{ r: 5, fill: "var(--amber)" }} />
                      </ComposedChart></ResponsiveContainer>
                    ) : <NoData />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Accounts Panel */}
          <div className="space-y-3">
            {/* Cuentas Vinculadas */}
            <div style={panelStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div className="icon-container icon-container-sm icon-container-active">
                  <Link style={{ width: 14, height: 14, color: "var(--cyan)" }} />
                </div>
                <div>
                  <h3 style={headingStyle}>Cuentas Vinculadas</h3>
                  <p style={subStyle}>{ch?.adAccounts?.length || 0} cuenta{(ch?.adAccounts?.length || 0) !== 1 ? "s" : ""} conectada{(ch?.adAccounts?.length || 0) !== 1 ? "s" : ""}</p>
                </div>
              </div>
              {ch?.adAccounts?.length ? ch.adAccounts.map(acc => (
                <div key={acc} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", marginBottom: 6, borderRadius: 10,
                  background: "var(--surface-hover)", border: "1px solid var(--border)",
                  transition: "background 0.15s", cursor: "default",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #1877F2, #0A4FBD)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: "var(--foreground)", fontFamily: "serif" }}>f</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: "var(--foreground)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{accountNames[acc] || "Ad Account"}</p>
                    <p style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{acc}</p>
                  </div>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--emerald)", boxShadow: "0 0 6px rgba(0,200,117,0.6)", flexShrink: 0 }} />
                </div>
              )) : (
                <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                  <p style={{ marginBottom: 4 }}>Sin cuentas vinculadas</p>
                  <p style={{ fontSize: 10 }}>Ve a Configuración para conectar</p>
                </div>
              )}
            </div>

            {/* Presupuesto Diario */}
            <div style={panelStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div className="icon-container icon-container-sm" style={{ background: "var(--surface)", borderColor: "rgba(224,168,60,0.2)", color: "var(--amber)" }}>
                  <DollarSign style={{ width: 14, height: 14, color: "var(--amber)" }} />
                </div>
                <div>
                  <h3 style={headingStyle}>Presupuesto</h3>
                  <p style={subStyle}>{bk.label}: {fmtMXN0(budgetNum)}</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div style={{ padding: "10px 12px", background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 10 }}>
                  <p style={{ ...labelStyle, marginBottom: 4 }}>Diario ideal</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "var(--cyan)", fontFamily: "var(--font-display)" }}>{fmtMXN(bk.daily)}</p>
                </div>
                <div style={{ padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10 }}>
                  <p style={{ ...labelStyle, marginBottom: 4 }}>Semanal ideal</p>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", fontFamily: "var(--font-display)" }}>{fmtMXN(bk.weekly)}</p>
                </div>
              </div>
              {/* Ritmo de gasto */}
              <div style={{
                padding: "12px 14px", borderRadius: 10,
                background: spendPace > 10 ? "rgba(226,68,92,0.08)" : spendPace < -10 ? "rgba(253,171,61,0.08)" : "rgba(0,200,117,0.08)",
                border: `1px solid ${spendPace > 10 ? "rgba(226,68,92,0.2)" : spendPace < -10 ? "rgba(253,171,61,0.2)" : "rgba(0,200,117,0.2)"}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <TrendingUp style={{ width: 12, height: 12, color: spendPace > 10 ? "var(--red)" : spendPace < -10 ? "var(--amber)" : "var(--emerald)" }} />
                  <p style={{ fontSize: 9, color: "var(--text-secondary)", fontWeight: 700, letterSpacing: "0.1em" }}>RITMO DE GASTO</p>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: spendPace > 10 ? "var(--red)" : spendPace < -10 ? "var(--amber)" : "var(--emerald)" }}>
                  {spendPace > 10 ? `Adelantado +${pct(spendPace)}` : spendPace < -10 ? `Atrasado ${pct(spendPace)}` : "Al ritmo ✓"}
                </p>
                <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                  Ideal hoy: <strong style={{ color: "var(--text-secondary)" }}>{fmtMXN(idealSpendToday)}</strong> · Real: <strong style={{ color: "var(--text-secondary)" }}>{fmtMXN(totalSpend)}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Heatmap: Resultados por Hora y Día ── */}
        {(() => {
          const hourlyData = breakdownData["hourly_daily"] || [];
          if (hourlyData.length === 0) return null;

          const HOURS = Array.from({ length: 24 }, (_, i) => i);
          const DOW_LABELS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

          // Build date × hour matrix from hourly_daily breakdown
          // Each row is a specific date (not aggregated by day-of-week)
          const dateMap: Record<string, Record<number, { impressions: number; spend: number; clicks: number; results: number }>> = {};

          // Debug: log first few rows to understand the data shape
          if (hourlyData.length > 0) {
            console.debug("[Heatmap] Sample row keys:", Object.keys(hourlyData[0]));
            console.debug("[Heatmap] Sample row:", hourlyData[0]);
            console.debug("[Heatmap] Total rows:", hourlyData.length);
          }

          // Helper: subtract one day from a YYYY-MM-DD string
          const prevDate = (dateStr: string) => {
            const dt = new Date(dateStr + "T12:00:00");
            dt.setDate(dt.getDate() - 1);
            return dt.toISOString().slice(0, 10);
          };

          hourlyData.forEach((row: any) => {
            // Use the normalized 'hour' field from the API route
            // Fall back to the raw field names in case of older cached data
            const hourRaw =
              row.hour ??
              row.hourly_stats_aggregated_by_audience_time_zone ??
              row.hourly_stats_aggregated_by_advertiser_time_zone;
            if (hourRaw === null || hourRaw === undefined) return;
            const hour = parseInt(String(hourRaw), 10);
            if (isNaN(hour) || hour < 0 || hour > 23) return;

            // Detect "day overflow": Meta sometimes reports hours 0-5 under
            // the NEXT calendar date when the account timezone is behind UTC
            // (e.g., UTC-6 account: hour 18 UTC = hour 00 of account's tomorrow).
            // Heuristic: if ALL the data for a date are hours 0-5 AND there's a
            // previous date, assign those rows to the previous date instead.
            // We process this in a second pass below, so for now just use date_start.
            const dateStr = row.date_start;
            if (!dateStr) return;
            if (!dateMap[dateStr]) {
              dateMap[dateStr] = {};
              for (let h = 0; h < 24; h++) dateMap[dateStr][h] = { impressions: 0, spend: 0, clicks: 0, results: 0 };
            }
            dateMap[dateStr][hour].impressions += row.impressions || 0;
            dateMap[dateStr][hour].spend += row.spend || 0;
            dateMap[dateStr][hour].clicks += row.clicks || 0;
            
            const ra = findResultAction(row.actions, ch?.goal);
            dateMap[dateStr][hour].results += ra ? parseInt(ra.value, 10) : 0;
          });

          // Sort dates chronologically
          const sortedDates = Object.keys(dateMap).sort();

          // Format date label: "Lun 02/06"
          const formatDateLabel = (dateStr: string) => {
            const dt = new Date(dateStr + "T12:00:00");
            const dow = DOW_LABELS_SHORT[dt.getDay()];
            const dd = String(dt.getDate()).padStart(2, "0");
            const mm = String(dt.getMonth() + 1).padStart(2, "0");
            return `${dow} ${dd}/${mm}`;
          };

          // Find max for color scaling
              // Metric selector state (scoped inside this IIFE so it's a local var rendered inline)
          // We use a dataset attribute trick since we can't use useState inside IIFE
          // Instead, wire up a simple toggle via a controlled span + onClick trick with data-attr
          const heatMetrics = [
            { key: "results" as const, label: goalLabel(ch?.goal) || "Resultados" },
            { key: "impressions" as const, label: "Impresiones" },
            { key: "spend" as const, label: "Gasto" },
          ];

          // Determine which metric key is selected (stored in a sibling div via id)
          // We can't use useState here, so we use a JavaScript module-level approach:
          // Render buttons that swap via inline onclick + DOM class toggling.
          // To keep it simple and React-idiomatic, we will just render all 3 variants
          // using a React.useState-style approach by using the parent component's state.
          // Since this is inside an IIFE, we read from a ref set above the IIFE.
          const [heatMetric, setHeatMetric] = [
            heatMetricState ?? "results",
            (v: "results" | "impressions" | "spend") => setHeatMetricState(v),
          ] as const;

          const getVal = (cell: { impressions: number; spend: number; clicks: number; results: number }) => {
            if (heatMetric === "impressions") return cell.impressions;
            if (heatMetric === "spend") return cell.spend;
            return cell.results;
          };

          const fmtVal = (cell: { impressions: number; spend: number; clicks: number; results: number }) => {
            const v = getVal(cell);
            if (heatMetric === "spend") return v > 0 ? fmtMXN(v) : "";
            return v > 0 ? (v > 999 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))) : "";
          };

          let maxVal = 0;
          sortedDates.forEach(date => {
            for (let h = 0; h < 24; h++) {
              const v = getVal(dateMap[date][h]);
              if (v > maxVal) maxVal = v;
            }
          });

          const getColor2 = (val: number) => {
            if (maxVal === 0 || val === 0) return "var(--row-hover)";
            const intensity = val / maxVal;
            if (intensity > 0.75) return heatMetric === "spend" ? "rgba(251,191,36,0.7)" : "rgba(0,200,117,0.6)";
            if (intensity > 0.5)  return heatMetric === "spend" ? "rgba(251,191,36,0.45)" : "rgba(0,200,117,0.35)";
            if (intensity > 0.25) return heatMetric === "spend" ? "rgba(251,191,36,0.25)" : "rgba(59,130,246,0.25)";
            if (intensity > 0.1)  return heatMetric === "spend" ? "rgba(251,191,36,0.12)" : "rgba(59,130,246,0.12)";
            return "var(--border-neutral)";
          };

          // Today's date string for highlighting
          const todayStr = new Date().toISOString().slice(0, 10);

          return (
            <div style={{ ...panelStyle, marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                <div>
                  <h3 style={headingStyle}>Distribución por Hora y Día</h3>
                  <p style={subStyle}>Hover para ver detalle · Horas en zona horaria de la audiencia</p>
                </div>
                {/* Metric switcher */}
                <div style={{ display: "flex", gap: 3, background: "var(--surface-hover)", borderRadius: 8, padding: "3px" }}>
                  {heatMetrics.map(m => (
                    <button
                      key={m.key}
                      onClick={() => setHeatMetric(m.key)}
                      style={{
                        padding: "5px 12px", fontSize: 10, fontWeight: 700, border: "none",
                        borderRadius: 6, cursor: "pointer", transition: "all 0.15s",
                        background: heatMetric === m.key ? "var(--cyan)" : "transparent",
                        color: heatMetric === m.key ? "#000" : "var(--text-secondary)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ overflowX: "auto", maxHeight: 520, overflowY: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 740 }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                    <tr>
                      <th style={{ padding: "5px 10px", fontSize: 9, color: "var(--text-muted)", textAlign: "left", fontWeight: 700, width: 76, background: "var(--surface)", letterSpacing: "0.06em" }}>FECHA</th>
                      {HOURS.map(h => (
                        <th key={h} style={{ padding: "5px 2px", fontSize: 9, color: "var(--text-muted)", textAlign: "center", fontWeight: 600, minWidth: 28, background: "var(--surface)" }}>
                          {h.toString().padStart(2, "0")}
                        </th>
                      ))}
                      <th style={{ padding: "5px 8px", fontSize: 9, color: "rgba(59,130,246,0.6)", textAlign: "right", fontWeight: 700, minWidth: 52, background: "var(--surface)", letterSpacing: "0.06em" }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDates.map((dateStr) => {
                      const dateLabel = formatDateLabel(dateStr);
                      const dt = new Date(dateStr + "T12:00:00");
                      const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
                      const isToday = dateStr === todayStr;
                      // Row total
                      const rowTotal = HOURS.reduce((sum, h) => sum + getVal(dateMap[dateStr][h]), 0);
                      return (
                        <tr key={dateStr} style={{ background: isToday ? "rgba(59,130,246,0.04)" : "transparent" }}>
                          <td style={{
                            padding: "3px 10px", fontSize: 10,
                            color: isToday ? "var(--cyan)" : isWeekend ? "rgba(59,130,246,0.45)" : "var(--text-secondary)",
                            fontWeight: isToday ? 800 : 600, whiteSpace: "nowrap",
                            borderRight: isToday ? "2px solid rgba(59,130,246,0.35)" : "1px solid var(--hairline)",
                          }}>
                            {isToday ? "● " : ""}{dateLabel}
                          </td>
                          {HOURS.map(h => {
                            const cell = dateMap[dateStr][h];
                            const val = getVal(cell);
                            return (
                              <td
                                key={h}
                                title={`${dateLabel} ${h.toString().padStart(2, "0")}:00\nResultados: ${fmtNum(cell.results)}\nGasto: ${fmtMXN(cell.spend)}\nImpresiones: ${fmtNum(cell.impressions)}`}
                                style={{ padding: "1px", textAlign: "center" }}
                              >
                                <div style={{
                                  width: "100%", height: 26,
                                  background: getColor2(val),
                                  borderRadius: 3,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 9, color: val > 0 ? "var(--foreground)" : "transparent",
                                  fontWeight: 700,
                                  cursor: "default",
                                  transition: "transform 0.1s",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.4)"; e.currentTarget.style.zIndex = "10"; e.currentTarget.style.position = "relative"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)"; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.zIndex = "auto"; e.currentTarget.style.position = "static"; e.currentTarget.style.boxShadow = "none"; }}
                                >
                                  {fmtVal(cell)}
                                </div>
                              </td>
                            );
                          })}
                          {/* Row total */}
                          <td style={{ padding: "3px 8px", textAlign: "right" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: rowTotal > 0 ? "rgba(59,130,246,0.8)" : "rgba(108,124,147,0.5)" }}>
                              {rowTotal > 0 ? (heatMetric === "spend" ? fmtMXN(rowTotal) : fmtNum(Math.round(rowTotal))) : "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Column totals footer */}
                  <tfoot style={{ position: "sticky", bottom: 0 }}>
                    <tr style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                      <td style={{ padding: "5px 10px", fontSize: 9, color: "rgba(59,130,246,0.6)", fontWeight: 700, letterSpacing: "0.08em" }}>TOTAL</td>
                      {HOURS.map(h => {
                        const colTotal = sortedDates.reduce((sum, dateStr) => sum + getVal(dateMap[dateStr][h]), 0);
                        return (
                          <td key={h} style={{ padding: "3px 1px", textAlign: "center" }}>
                            <span style={{ fontSize: 8, fontWeight: 700, color: colTotal > 0 ? "rgba(59,130,246,0.7)" : "var(--hairline)" }}>
                              {colTotal > 0 ? (colTotal > 999 ? `${(colTotal / 1000).toFixed(1)}k` : Math.round(colTotal)) : ""}
                            </span>
                          </td>
                        );
                      })}
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              {/* Legend */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
                <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600 }}>Menor actividad</span>
                {["var(--row-hover)", "var(--border-neutral)", "rgba(59,130,246,0.12)", "rgba(59,130,246,0.25)", "rgba(0,200,117,0.35)", "rgba(0,200,117,0.6)"].map((c, i) => (
                  <div key={i} style={{ width: 16, height: 12, borderRadius: 3, background: c }} />
                ))}
                <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600 }}>Mayor actividad</span>
              </div>
            </div>
          );
        })()}
        </ErrorBoundary>
      )}

      {/* ═══ TAB: GASTO & PRESUPUESTO ═══ */}
      {activeTab === "gasto" && (
        <ErrorBoundary name="Tab Gasto">
        <div className="space-y-3">
          {/* Budget Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Presupuesto mensual */}
            <div style={{ ...panelStyle, borderTop: "2px solid rgba(251,191,36,0.5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <DollarSign style={{ width: 12, height: 12, color: "var(--amber)" }} />
                </div>
                <p style={labelStyle}>Presupuesto {bk.label}</p>
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, color: "var(--amber)", fontFamily: "var(--font-display)", lineHeight: 1 }}>{fmtMXN0(budgetNum)}</p>
              <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>Diario: {fmtMXN(bk.daily)} · Semanal: {fmtMXN(bk.weekly)}</p>
            </div>
            {/* Diario ideal */}
            <div style={{ ...panelStyle, borderTop: "2px solid rgba(59,130,246,0.5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--cyan-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Target style={{ width: 12, height: 12, color: "var(--cyan)" }} />
                </div>
                <p style={labelStyle}>Diario ideal</p>
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, color: "var(--cyan)", fontFamily: "var(--font-display)", lineHeight: 1 }}>{fmtMXN(bk.daily)}</p>
              <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>Ritmo objetivo por día</p>
            </div>
            {/* Gastado hoy */}
            <div style={{ ...panelStyle, borderTop: `2px solid ${totalSpend > idealSpendToday * 1.1 ? "rgba(226,68,92,0.5)" : "rgba(0,200,117,0.5)"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: totalSpend > idealSpendToday * 1.1 ? "rgba(226,68,92,0.1)" : "rgba(0,200,117,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Activity style={{ width: 12, height: 12, color: totalSpend > idealSpendToday * 1.1 ? "var(--red)" : "var(--emerald)" }} />
                </div>
                <p style={labelStyle}>Gastado hoy</p>
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, color: totalSpend > idealSpendToday * 1.1 ? "var(--red)" : "var(--emerald)", fontFamily: "var(--font-display)", lineHeight: 1 }}>{fmtMXN0(totalSpend)}</p>
              <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>de {fmtMXN0(idealSpendToday)} ideal</p>
              {/* mini progress bar */}
              {idealSpendToday > 0 && (
                <div style={{ marginTop: 8, height: 3, background: "var(--surface-hover)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min((totalSpend / idealSpendToday) * 100, 100)}%`, background: totalSpend > idealSpendToday * 1.1 ? "var(--red)" : "var(--emerald)", borderRadius: 2 }} />
                </div>
              )}
            </div>
            {/* Restante */}
            <div style={{ ...panelStyle, borderTop: "2px solid rgba(139,141,242,0.5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <TrendingDown style={{ width: 12, height: 12, color: "var(--purple)" }} />
                </div>
                <p style={labelStyle}>Restante</p>
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-display)", lineHeight: 1 }}>{fmtMXN0(Math.max(budgetNum - totalSpend, 0))}</p>
              <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>{budgetNum > 0 ? `${pct(Math.min((totalSpend / budgetNum) * 100, 100))} utilizado` : "Sin presupuesto configurado"}</p>
            </div>
          </div>

          {/* Spend Table — Spreadsheet Style (dates as columns) */}
          <div style={panelStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div><h3 style={headingStyle}>Tabla de Gasto</h3><p style={subStyle}>Desglose de inversión y rendimiento</p></div>
              <TimeToggle value={timeGranularity} onChange={setTimeGranularity} />
            </div>
            <div style={{ overflowX: "auto" }}>
              {(() => {
                const tableData = getSpendTable();
                const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

                // Build column info with day name
                const cols = tableData.map((d: any) => {
                  let dayName = "";
                  if (d.fullDate) {
                    const dt = new Date(d.fullDate + "T12:00:00");
                    dayName = DAYS_ES[dt.getDay()] || "";
                  }
                  return { ...d, dayName };
                });

                // Accumulated totals for "AL DIA" column
                const totPresupuesto = budgetNum;
                const totGastado = totalSpend;
                const pctGastado = budgetNum > 0 ? (totalSpend / budgetNum) * 100 : 0;
                const totLeads = totalResults;
                const totCPL = totalResults > 0 ? totalSpend / totalResults : 0;
                const totCumplimiento = goalNum > 0 ? (totalResults / goalNum) * 100 : 0;
                const projCPL = projectedResults > 0 ? projectedSpend / projectedResults : 0;
                const desvioCPL = cprTarget > 0 ? ((totCPL / cprTarget) - 1) * 100 : 0;

                const cellStyle: React.CSSProperties = { padding: "6px 8px", textAlign: "right", fontSize: 11, color: "var(--foreground)", border: "1px solid var(--hairline)", whiteSpace: "nowrap" };
                const headerCellStyle: React.CSSProperties = { ...cellStyle, textAlign: "center", color: "var(--foreground)", fontWeight: 700, fontSize: 10, background: "var(--cyan)", borderBottom: "none" };
                const subHeaderStyle: React.CSSProperties = { ...cellStyle, textAlign: "center", color: "var(--foreground)", fontWeight: 600, fontSize: 9, background: "var(--surface)", borderBottom: "1px solid rgba(0,120,255,0.3)" };
                const labelCellStyle: React.CSSProperties = { ...cellStyle, textAlign: "left", fontWeight: 600, color: "var(--foreground)", fontSize: 11, paddingLeft: 12, position: "sticky" as const, left: 0, background: "var(--surface)", border: "1px solid var(--border)", zIndex: 2 };
                const totalCellStyle: React.CSSProperties = { ...cellStyle, fontWeight: 700, background: "var(--surface-hover)", border: "1px solid var(--hairline)", position: "sticky" as const, left: 0, zIndex: 2 };

                const metricRows = [
                  { label: "Presupuesto", total: fmtMXN0(totPresupuesto), values: cols.map(() => fmtMXN(bk.daily)), color: "var(--foreground)" },
                  { label: "Importe Gastado", total: fmtMXN0(totGastado), values: cols.map((c: any) => fmtMXN(c.spend)), color: "var(--amber)" },
                  { label: "%Gastado", total: pct(pctGastado), values: cols.map((c: any) => bk.daily > 0 ? pct((c.spend / bk.daily) * 100) : "—"), color: "var(--foreground)" },
                  { label: goalLabel(ch?.goal), total: fmtNum(totLeads), values: cols.map((c: any) => String(c.results || 0)), color: "var(--emerald)" },
                  { label: "Cumplimiento", total: goalNum > 0 ? pct(totCumplimiento) : "—", values: cols.map((c: any) => goalBreakdown.daily > 0 ? pct((c.results / goalBreakdown.daily) * 100) : "—"), color: "#c084fc" },
                  { label: CPR_MAP[ch?.goal || ""] || "CPR", total: fmtMXN(totCPL), values: cols.map((c: any) => c.results > 0 ? fmtMXN(c.spend / c.results) : "—"), color: "var(--cyan)" },
                  { label: `${CPR_MAP[ch?.goal || ""] || "CPR"} Objetivo`, total: cprTarget > 0 ? fmtMXN(cprTarget) : "—", values: cols.map(() => cprTarget > 0 ? fmtMXN(cprTarget) : "—"), color: "var(--text-secondary)" },
                  { label: "Desvío", total: cprTarget > 0 ? `${desvioCPL > 0 ? "+" : ""}${desvioCPL.toFixed(1)}%` : "—", values: cols.map((c: any) => { if (!cprTarget || c.results === 0) return "—"; const d = ((c.spend / c.results) / cprTarget - 1) * 100; return `${d > 0 ? "+" : ""}${d.toFixed(1)}%`; }), color: "var(--text-secondary)" },
                ];

                return (
                  <table style={{ borderCollapse: "collapse", fontSize: 11, minWidth: "100%" }}>
                    {/* Day names header */}
                    <thead>
                      <tr>
                        <th style={{ ...totalCellStyle, background: "var(--surface-hover)", borderBottom: "none", minWidth: 100, textAlign: "left", fontSize: 10, color: "var(--foreground)" }}>AL DÍA</th>
                        <th style={{ ...labelCellStyle, borderBottom: "none", minWidth: 120, fontSize: 10, color: "var(--foreground)" }}>FECHA</th>
                        {cols.map((c: any, i: number) => <th key={i} style={headerCellStyle}>{c.dayName}</th>)}
                      </tr>
                      {/* Date numbers row */}
                      <tr>
                        <th style={{ ...totalCellStyle, borderBottom: "2px solid rgba(0,120,255,0.3)" }}></th>
                        <th style={{ ...labelCellStyle, borderBottom: "2px solid rgba(0,120,255,0.3)" }}></th>
                        {cols.map((c: any, i: number) => <th key={i} style={subHeaderStyle}>{c.date}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Campaign name row */}
                      <tr>
                        <td colSpan={2 + cols.length} style={{ padding: "8px 12px", fontWeight: 700, fontSize: 11, color: "var(--cyan)", background: "var(--cyan-dim)", borderBottom: "1px solid rgba(59,130,246,0.1)", letterSpacing: "0.05em" }}>
                          {project.alias?.toUpperCase() || "PROYECTO"}
                        </td>
                      </tr>
                      {metricRows.map((row, ri) => (
                        <tr key={ri} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.015)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ ...totalCellStyle, color: row.color, textAlign: "right", paddingRight: 12, minWidth: 100 }}>{row.total}</td>
                          <td style={labelCellStyle}>{row.label}</td>
                          {row.values.map((v: string, ci: number) => (
                            <td key={ci} style={{ ...cellStyle, color: row.color === "var(--foreground)" ? "var(--text-muted)" : row.color, fontWeight: v !== "—" && v !== "$0.00" && v !== "0" ? 500 : 400 }}>{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>

          {/* Spend Chart */}
          <div style={panelStyle}>
            <h3 style={headingStyle}>Curva de Gasto vs Presupuesto Ideal</h3>
            <div style={{ width: "100%", height: 280 }}>
              {timeSeriesData.length > 0 ? <ResponsiveContainer><ComposedChart data={timeSeriesData.map((d: any, i: number) => ({ ...d, idealAccum: bk.daily * (i + 1), spendAccum: timeSeriesData.slice(0, i + 1).reduce((a: number, b: any) => a + b.spend, 0) }))} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} /><XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" angle={0} textAnchor="middle" />
                <YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any, n: any) => [fmtMXN(v as number), n]} /><Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="spendAccum" name="Gasto acumulado" stroke="var(--amber)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="idealAccum" name="Presupuesto ideal" stroke="rgba(148,163,184,0.65)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </ComposedChart></ResponsiveContainer> : <NoData />}
            </div>
          </div>
        </div>
        </ErrorBoundary>
      )}

      {/* ═══ TAB: AUDIENCIA ═══ */}
      {activeTab === "audiencia" && (
        <ErrorBoundary name="Tab Audiencia">
        <div className="space-y-3">
          {/* Loading state when no breakdowns loaded yet */}
          {Object.keys(breakdownData).length === 0 && <LoadingOverlay />}

          {/* Section header — enriched banner */}
          <div style={{
            ...panelStyle,
            padding: "18px 22px",
            background: "linear-gradient(135deg, rgba(0,129,251,0.1) 0%, rgba(59,130,246,0.06) 50%, rgba(139,141,242,0.06) 100%)",
            borderLeft: "3px solid var(--cyan)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users style={{ width: 20, height: 20, color: "var(--cyan)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", marginBottom: 3 }}>
                  ¿A quién estás llegando?
                </h3>
                <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Demografía, ubicación geográfica, plataformas y dispositivos — basado en inversión del periodo.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {[
                  { label: "Edad/Género", color: "var(--cyan)" },
                  { label: "Región", color: "var(--amber)" },
                  { label: "Dispositivo", color: "var(--purple)" },
                  { label: "Plataforma", color: "var(--emerald)" },
                ].map((chip, i) => (
                  <div key={i} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 9, fontWeight: 700, background: "var(--surface-hover)", border: "1px solid var(--border)", color: chip.color, letterSpacing: "0.06em" }}>
                    {chip.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

            {/* ── Edad y Género ── */}
            <div style={panelStyle}>
              <h3 style={headingStyle}><Users style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />Edad y Género</h3>
              <p style={subStyle}>¿Quiénes ven tus anuncios? Distribución por rango de edad y género</p>
              <div style={{ width: "100%", height: 280 }}>
                {(() => {
                  // 3-state: undefined = loading, [] = empty, [...] = data
                  const raw = breakdownData["age_gender"];
                  if (raw === undefined) return (
                    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
                      {[70, 90, 55, 80, 65, 45].map((w, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <div style={{ width: 36, height: 14, borderRadius: 4, background: "var(--surface-hover)", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
                          <div style={{ height: 24, borderRadius: 4, background: "var(--cyan-dim)", flex: 1, maxWidth: `${w}%`, animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
                        </div>
                      ))}
                      <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 11, marginTop: 8 }}>Cargando datos de audiencia...</p>
                    </div>
                  );
                  const buckets: Record<string, { age: string; Hombres: number; Mujeres: number; Otro: number }> = {};
                  for (const r of raw) {
                    const age = r.age || "?";
                    const g = r.gender === "male" ? "Hombres" : r.gender === "female" ? "Mujeres" : "Otro";
                    if (!buckets[age]) buckets[age] = { age, Hombres: 0, Mujeres: 0, Otro: 0 };
                    buckets[age][g as "Hombres" | "Mujeres" | "Otro"] += Number(r.spend) || 0;
                  }
                  const cd = Object.values(buckets).sort((a, b) => a.age.localeCompare(b.age));
                  if (!cd.length) return <NoData msg="Sin datos de audiencia" />;
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cd} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="age" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmtMXN(Number(v))]} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="Mujeres" stackId="a" fill="var(--cyan)" />
                        <Bar dataKey="Hombres" stackId="a" fill="var(--emerald)" radius={[3, 3, 0, 0]} barSize={6} />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>

            {/* ── Top Regiones ── */}
            <div style={panelStyle}>
              <h3 style={headingStyle}><Globe style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />Top Regiones</h3>
              <p style={subStyle}>¿De dónde vienen? Estados y ciudades con mayor alcance</p>
              <div style={{ width: "100%", height: 280 }}>
                {(() => {
                  const raw = breakdownData["region"];
                  if (raw === undefined) return <NoData msg="Cargando..." />;
                  const d = raw
                    .map((r: any) => ({ region: r.region || "?", spend: Number(r.spend) || 0 }))
                    .sort((a: any, b: any) => b.spend - a.spend)
                    .slice(0, 8);
                  if (!d.length) return <NoData msg="Sin datos de región" />;
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                        <XAxis type="number" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                        <YAxis type="category" dataKey="region" stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} width={90} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmtMXN(Number(v)), "Inversión"]} />
                        <Bar dataKey="spend" fill="var(--amber)" radius={[0, 4, 4, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>

            {/* ── País ── */}
            <div style={panelStyle}>
              <h3 style={headingStyle}><Globe style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />País</h3>
              <p style={subStyle}>¿Desde qué país te ven? Útil para campañas multi-país</p>
              <div style={{ width: "100%", height: 280 }}>
                {(() => {
                  const raw = breakdownData["country"];
                  if (raw === undefined) return <NoData msg="Cargando..." />;
                  const d = raw
                    .map((r: any) => ({ country: r.country || "?", spend: Number(r.spend) || 0, impressions: Number(r.impressions) || 0, clicks: Number(r.clicks) || 0 }))
                    .sort((a: any, b: any) => b.spend - a.spend)
                    .slice(0, 8);
                  if (!d.length) return <NoData msg="Sin datos de país" />;
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                        <XAxis type="number" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                        <YAxis type="category" dataKey="country" stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} width={40} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => [name === "spend" ? fmtMXN(Number(v)) : Number(v).toLocaleString(), name === "spend" ? "Inversión" : name === "impressions" ? "Impresiones" : "Clicks"]} />
                        <Bar dataKey="spend" fill="var(--cyan)" radius={[0, 4, 4, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>

            {/* ── Plataforma ── */}
            <div style={panelStyle}>
              <h3 style={headingStyle}><Layers style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />Plataforma</h3>
              <p style={subStyle}>¿Dónde ven tus anuncios? Facebook, Instagram o Audience Network</p>
              <div style={{ width: "100%", height: 280 }}>
                {(() => {
                  const raw = breakdownData["platform"];
                  if (raw === undefined) return <NoData msg="Cargando..." />;
                  
                  const aggregated = raw.reduce((acc: any, r: any) => {
                    const rawName = (r.publisher_platform || "otro").toLowerCase();
                    const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
                    if (!acc[name]) acc[name] = { name, spend: 0, impressions: 0, clicks: 0 };
                    acc[name].spend += Number(r.spend) || 0;
                    acc[name].impressions += Number(r.impressions) || 0;
                    acc[name].clicks += Number(r.clicks) || 0;
                    return acc;
                  }, {});
                  
                  const d = Object.values(aggregated);
                  if (!d.length) return <NoData msg="Sin datos de plataforma" />;
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={d} dataKey="spend" nameKey="name" cx="50%" cy="50%"
                          innerRadius={60} outerRadius={100}
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          labelLine={{ stroke: "rgba(148,163,184,0.65)" }}
                        >
                          {d.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => {
                          if (name === "spend") return [fmtMXN(Number(v)), "Inversión"];
                          return [Number(v).toLocaleString(), name];
                        }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>

            {/* ── Dispositivo ── */}
            <div style={panelStyle}>
              <h3 style={headingStyle}><Monitor style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />Dispositivo</h3>
              <p style={subStyle}>¿Desde qué dispositivo? Mobile suele dominar en campañas de Social</p>
              <div style={{ width: "100%", height: 280 }}>
                {(() => {
                  const raw = breakdownData["device"];
                  if (raw === undefined) return <NoData msg="Cargando..." />;
                  const merged: Record<string, { spend: number; impressions: number; clicks: number }> = {};
                  for (const r of raw) {
                    const dp = r.device_platform || "";
                    const name = dp === "mobile_app" || dp === "mobile_web" ? "Mobile"
                      : dp === "desktop" ? "Desktop" : dp || "Otro";
                    if (!merged[name]) merged[name] = { spend: 0, impressions: 0, clicks: 0 };
                    merged[name].spend += (Number(r.spend) || 0);
                    merged[name].impressions += (Number(r.impressions) || 0);
                    merged[name].clicks += (Number(r.clicks) || 0);
                  }
                  const cd = Object.entries(merged)
                    .map(([name, v]) => ({ name, spend: v.spend, impressions: v.impressions, clicks: v.clicks }))
                    .sort((a, b) => b.spend - a.spend);
                  if (!cd.length) return <NoData msg="Sin datos de dispositivo" />;
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={cd} dataKey="spend" nameKey="name" cx="50%" cy="50%"
                          innerRadius={60} outerRadius={100}
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          labelLine={{ stroke: "rgba(148,163,184,0.65)" }}
                        >
                          {cd.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => {
                          if (name === "spend") return [fmtMXN(Number(v)), "Inversión"];
                          return [Number(v).toLocaleString(), name];
                        }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>

          </div>

          {/* ── Row 3: Placement + Hora del Día ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

            {/* ── Placement ── */}
            <div style={panelStyle}>
              <h3 style={headingStyle}><Layers style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />Placement</h3>
              <p style={subStyle}>¿Dónde rinde mejor? Feed, Stories, Reels, Explore y más</p>
              <div style={{ width: "100%", height: 280 }}>
                {(() => {
                  const raw = breakdownData["placement"];
                  if (raw === undefined) return <NoData msg="Cargando..." />;
                  const d = raw
                    .map((r: any) => {
                      const plat = r.publisher_platform || "";
                      const pos = r.platform_position || "";
                      const label = pos ? `${plat.charAt(0).toUpperCase() + plat.slice(1)} — ${pos.replace(/_/g, " ")}` : plat;
                      return { placement: label, spend: Number(r.spend) || 0, impressions: Number(r.impressions) || 0, clicks: Number(r.clicks) || 0 };
                    })
                    .sort((a: any, b: any) => b.spend - a.spend)
                    .slice(0, 10);
                  if (!d.length) return <NoData msg="Sin datos de placement" />;
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                        <XAxis type="number" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                        <YAxis type="category" dataKey="placement" stroke="var(--text-secondary)" fontSize={8} tickLine={false} axisLine={false} width={120} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => [name === "spend" ? fmtMXN(Number(v)) : Number(v).toLocaleString(), name === "spend" ? "Inversión" : name === "impressions" ? "Impresiones" : "Clicks"]} />
                        <Bar dataKey="spend" fill="#9b7be8" radius={[0, 4, 4, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>

            {/* ── Hora del Día ── */}
            <div style={panelStyle}>
              <h3 style={headingStyle}><Clock style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />Rendimiento por Hora</h3>
              <p style={subStyle}>¿A qué hora publicar? Identifica los mejores horarios para tu audiencia</p>
              <div style={{ width: "100%", height: 280 }}>
                {(() => {
                  const raw = breakdownData["time_of_day"];
                  if (raw === undefined) return <NoData msg="Cargando..." />;
                  const hourMap: Record<string, { hour: string; sortKey: number; spend: number; impressions: number; clicks: number }> = {};
                  for (const r of raw) {
                    const h = r.hourly_stats_aggregated_by_audience_time_zone || "?";
                    // Meta returns ranges like "00:00:00 - 00:59:59" or just "0"
                    const hourNum = parseInt(h.split(":")[0]) || 0;
                    const label = `${hourNum}h`;
                    if (!hourMap[label]) hourMap[label] = { hour: label, sortKey: hourNum, spend: 0, impressions: 0, clicks: 0 };
                    hourMap[label].spend += Number(r.spend) || 0;
                    hourMap[label].impressions += Number(r.impressions) || 0;
                    hourMap[label].clicks += Number(r.clicks) || 0;
                  }
                  const d = Object.values(hourMap).sort((a, b) => a.sortKey - b.sortKey);
                  if (!d.length) return <NoData msg="Sin datos por hora" />;
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={d} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="hour" stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} interval={1} />
                        <YAxis yAxisId="left" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                        <YAxis yAxisId="right" orientation="right" stroke="rgba(148,163,184,0.65)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => [name === "Inversión" ? fmtMXN(Number(v)) : fmtNum(Number(v)), name]} />
                        <Bar yAxisId="left" dataKey="spend" name="Inversión" fill="var(--cyan)" radius={[3, 3, 0, 0]} barSize={10} />
                        <Line yAxisId="right" type="monotone" dataKey="impressions" name="Impresiones" stroke="var(--amber)" strokeWidth={2} dot={false} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>

          </div>
        </div>
        </ErrorBoundary>
      )}

      {/* ═══ TAB: CREATIVOS ═══ */}
      {activeTab === "creativos" && (
        <ErrorBoundary name="Tab Creativos">
        <div className="space-y-3">
          {creativesLoading && <LoadingOverlay />}

          {/* Section header */}
          <div style={{ ...panelStyle, padding: "14px 18px", background: "linear-gradient(135deg, rgba(162,93,220,0.06), rgba(253,171,61,0.04))" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>
              <Palette style={{ width: 15, height: 15, display: "inline", verticalAlign: "middle", marginRight: 8, color: "#9b7be8" }} />
              Análisis de Creativos
            </h3>
            <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Identifica qué anuncios funcionan mejor y cuáles necesitan optimización. Ordenados por eficiencia (CPR).
            </p>
          </div>

          {/* ── TOP 3 Mejores + TOP 3 Peores ── */}
          {(() => {
            const ranked = adCreatives
              .filter(a => a.spend > 0)
              .map((ad: any) => {
                const ra = findResultAction(ad.actions, ch?.goal);
                const results = ra ? parseInt(ra.value, 10) : 0;
                const cprVal = results > 0 ? ad.spend / results : Infinity;
                const ctrVal = ad.ctr || (ad.clicks > 0 && ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0);
                return { ...ad, results, cprVal, ctrVal };
              });

            const best = ranked.filter(a => a.results > 0).sort((a, b) => a.cprVal - b.cprVal).slice(0, 3);
            const worst = ranked.filter(a => a.results === 0 && a.spend > 0)
              .sort((a, b) => b.spend - a.spend).slice(0, 3);
            const worstByEfficiency = worst.length < 3
              ? ranked.filter(a => a.results > 0).sort((a, b) => b.cprVal - a.cprVal).slice(0, 3)
              : worst;

            if (!ranked.length && !creativesLoading) return null;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Best */}
                <div style={panelStyle}>
                  <h3 style={headingStyle}><TrendingUp style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6, color: "var(--emerald)" }} />Top 3 Mejores Anuncios</h3>
                  <p style={subStyle}>Menor costo por resultado — clic para ver preview</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 10, alignItems: "flex-start" }}>
                    {best.length > 0 ? best.map((ad) => (
                      <CreativeCard key={ad.adId} ad={ad} fmtMXN={fmtMXN} cprTarget={cprTarget} onPreview={() => setPreviewAd(ad)} />
                    )) : <NoData msg="Sin anuncios con resultados" />}
                  </div>
                </div>
                {/* Worst */}
                <div style={panelStyle}>
                  <h3 style={headingStyle}><TrendingDown style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6, color: "var(--red)" }} />Top 3 Peores Anuncios</h3>
                  <p style={subStyle}>Mayor gasto sin resultados o CPR más alto</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 10, alignItems: "flex-start" }}>
                    {worstByEfficiency.length > 0 ? worstByEfficiency.map((ad) => (
                      <CreativeCard key={ad.adId} ad={ad} fmtMXN={fmtMXN} cprTarget={cprTarget} onPreview={() => setPreviewAd(ad)} />
                    )) : <NoData msg="Sin datos" />}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── All Ads table view ── */}
          <div style={panelStyle}>
            <h3 style={headingStyle}>Todos los Anuncios</h3>
            <p style={subStyle}>Ranking completo por inversión. Haz scroll para ver más.</p>
            {adCreatives.length > 0 ? (
              <div style={{ overflowX: "auto", marginTop: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ border: "1px solid var(--hairline)" }}>
                      <th style={{ padding: "8px 6px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>#</th>
                      <th style={{ padding: "8px 6px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>Anuncio</th>
                      <th style={{ padding: "8px 6px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>Estado</th>
                      <th style={{ padding: "8px 6px", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>Inversión</th>
                      <th style={{ padding: "8px 6px", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>Result.</th>
                      <th style={{ padding: "8px 6px", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>CPR</th>
                      <th style={{ padding: "8px 6px", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>CTR</th>
                      <th style={{ padding: "8px 6px", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>Impr.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adCreatives.filter(a => a.spend > 0).slice(0, 30).map((ad: any, i: number) => {
                      const ra = findResultAction(ad.actions, ch?.goal);
                      const results = ra ? parseInt(ra.value, 10) : 0;
                      const cprVal = results > 0 ? ad.spend / results : 0;
                      const ctrVal = ad.ctr || (ad.clicks > 0 && ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0);
                      return (
                        <tr key={ad.adId || i} style={{ border: "1px solid var(--border)", transition: "background 0.15s", cursor: "pointer" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          onClick={() => { const ra2 = findResultAction(ad.actions, ch?.goal); setPreviewAd({ ...ad, results, cprVal, ctrVal }); }}>
                          <td style={{ padding: "8px 6px", color: "var(--text-muted)", fontSize: 10 }}>{i + 1}</td>
                          <td style={{ padding: "8px 6px", maxWidth: 250 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 40, height: 40, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: "var(--surface-hover)", position: "relative" }}>
                                {ad.thumbnailUrl
                                  ? <img src={ad.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Eye style={{ width: 14, height: 14, color: "var(--text-secondary)" }} /></div>
                                }
                                {ad.format === "video" && <span style={{ position: "absolute", bottom: 1, right: 1, fontSize: 7, background: "var(--surface)", color: "var(--foreground)", padding: "0 3px", borderRadius: 2, fontWeight: 700 }}>▶</span>}
                                {ad.format === "carousel" && <span style={{ position: "absolute", bottom: 1, right: 1, fontSize: 7, background: "var(--surface)", color: "var(--foreground)", padding: "0 3px", borderRadius: 2, fontWeight: 700 }}>⟡</span>}
                              </div>
                              <span style={{ color: "var(--foreground)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.adName}</span>
                            </div>
                          </td>
                          <td style={{ padding: "8px 6px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <span style={{ width: 5, height: 5, borderRadius: "50%", background: ad.status === "ACTIVE" ? "var(--emerald)" : ad.status === "PAUSED" ? "var(--amber)" : "rgba(148,163,184,0.65)" }} />
                              <span style={{ fontSize: 9, color: "var(--text-secondary)" }}>{ad.status === "ACTIVE" ? "Activo" : ad.status === "PAUSED" ? "Pausado" : ad.status}</span>
                            </span>
                          </td>
                          <td style={{ padding: "8px 6px", textAlign: "right", color: "var(--amber)", fontWeight: 600 }}>{fmtMXN(ad.spend)}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right", color: "var(--emerald)", fontWeight: 700 }}>{results}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right", color: results === 0 ? "var(--red)" : cprTarget > 0 && cprVal > cprTarget ? "var(--red)" : "var(--cyan)", fontWeight: 600 }}>{results > 0 ? fmtMXN(cprVal) : "—"}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right", color: "var(--text-secondary)" }}>{ctrVal.toFixed(2)}%</td>
                          <td style={{ padding: "8px 6px", textAlign: "right", color: "var(--text-secondary)" }}>{fmtNum(ad.impressions || 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : !creativesLoading ? <NoData msg="Sin anuncios con datos en el periodo seleccionado" /> : null}
          </div>

          {/* ── Text Analysis Panels (powered by allTitles / allBodies from DCO feed) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {([
              { arrayKey: "allTitles",  fallbackKey: "title",       label: "Mejores Títulos" },
              { arrayKey: "allBodies",  fallbackKey: "body",        label: "Mejores Textos Principales" },
              { arrayKey: null,         fallbackKey: "description",  label: "Mejores Descripciones" },
              { arrayKey: null,         fallbackKey: "cta",          label: "Mejores CTAs" },
            ] as const).map(cfg => {
              // Normalize text to prevent Unicode duplicates (zero-width chars, non-break spaces)
              const normalize = (t: string) => t.trim().normalize("NFC").replace(/\s+/g, " ");

              const grouped: Record<string, { text: string; spend: number; results: number; clicks: number; count: number; isDCO: boolean }> = {};
              adCreatives.forEach((ad: any) => {
                const ra = findResultAction(ad.actions, ch?.goal);
                const adResults = ra ? parseInt(ra.value, 10) : 0;
                const texts: string[] = [];
                const hasDCO = cfg.arrayKey && Array.isArray(ad[cfg.arrayKey]) && ad[cfg.arrayKey].length > 0;
                if (hasDCO) { texts.push(...(ad[cfg.arrayKey] as string[])); }
                if (!texts.length) { const fb = (ad[cfg.fallbackKey] || "").trim(); if (fb) texts.push(fb); }

                for (const text of texts) {
                  if (!text) continue;
                  const key = normalize(text);
                  if (!grouped[key]) grouped[key] = { text: text.trim(), spend: 0, results: 0, clicks: 0, count: 0, isDCO: false };
                  // Don't split spend across DCO variants — assign 100% to each
                  // (Meta doesn't report per-variant performance)
                  grouped[key].spend += ad.spend;
                  grouped[key].results += adResults;
                  grouped[key].clicks += ad.clicks || 0;
                  grouped[key].count++;
                  if (hasDCO && texts.length > 1) grouped[key].isDCO = true;
                }
              });
              const data = Object.values(grouped)
                .sort((a, b) => b.spend - a.spend)
                .slice(0, 5);

              // Hide panel if all entries have $0 spend
              const hasAnySpend = data.some(d => d.spend > 0);
              if (!hasAnySpend && !creativesLoading && adCreatives.length > 0) return null;

              return (
                <div key={cfg.fallbackKey} style={panelStyle}>
                  <h3 style={headingStyle}>{cfg.label}</h3>
                  <p style={subStyle}>Top 5 por inversión{data.some(d => d.isDCO) ? " · En DCO el gasto se comparte entre variantes" : ""}</p>
                  {!adCreatives.length && creativesLoading
                    ? <NoData msg="Cargando..." />
                    : data.length > 0
                      ? data.map((d, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", border: "1px solid var(--border)" }}>
                            <span style={{ width: 22, height: 22, borderRadius: 4, background: `${CHART_COLORS[i]}20`, color: CHART_COLORS[i], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 12, color: "var(--foreground)", lineHeight: 1.4, wordBreak: "break-word" }} title={d.text}>
                                {d.text.length > 80 ? d.text.slice(0, 80) + "..." : d.text}
                              </p>
                              <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 10, color: "var(--amber)" }}>{fmtMXN(d.spend)}</span>
                                <span style={{ fontSize: 10, color: "var(--emerald)" }}>{Math.round(d.results)} result.</span>
                                <span style={{ fontSize: 10, color: "var(--cyan)" }}>{d.results > 0 ? fmtMXN(d.spend / d.results) : "—"} CPR</span>
                                <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{d.count} anuncios</span>
                              </div>
                            </div>
                          </div>
                        ))
                      : <NoData msg="Sin datos de texto" />
                  }
                </div>
              );
            })}
          </div>

          {/* ── Formato y CTR por Creativo ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

            {/* ── Formato de Creativos (Imagen vs Video) ── */}
            <div style={panelStyle}>
              <h3 style={headingStyle}><PieIcon style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />Formato de Creativos</h3>
              <p style={subStyle}>Imagen vs Video — ¿qué formato te da mejores resultados?</p>
              <div style={{ width: "100%", height: 250 }}>
                {(() => {
                  if (!adCreatives.length && creativesLoading) return <NoData msg="Cargando..." />;
                  const formatMap: Record<string, { name: string; spend: number; results: number; count: number }> = {};
                  adCreatives.forEach((ad: any) => {
                    const fmt = ad.format === "video" ? "Video" : ad.format === "carousel" ? "Carrusel" : "Imagen";
                    if (!formatMap[fmt]) formatMap[fmt] = { name: fmt, spend: 0, results: 0, count: 0 };
                    formatMap[fmt].spend += ad.spend || 0;
                    const ra = findResultAction(ad.actions, ch?.goal);
                    formatMap[fmt].results += ra ? parseInt(ra.value, 10) : 0;
                    formatMap[fmt].count++;
                  });
                  const d = Object.values(formatMap).filter(f => f.spend > 0);
                  if (!d.length) return <NoData msg="Sin datos de formato" />;
                  const formatColors = ["var(--cyan)", "#9b7be8", "var(--amber)", "var(--emerald)"];
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={d} dataKey="spend" nameKey="name" cx="50%" cy="50%"
                          innerRadius={55} outerRadius={90}
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          labelLine={{ stroke: "rgba(148,163,184,0.65)" }}
                        >
                          {d.map((_, i) => <Cell key={i} fill={formatColors[i % formatColors.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => {
                          if (name === "spend") return [fmtMXN(Number(v)), "Inversión"];
                          return [Number(v).toLocaleString(), name];
                        }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
              {/* Format summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                {(() => {
                  const formatStats: Record<string, { spend: number; results: number; count: number }> = {};
                  adCreatives.forEach((ad: any) => {
                    const fmt = ad.format === "video" ? "Video" : ad.format === "carousel" ? "Carrusel" : "Imagen";
                    if (!formatStats[fmt]) formatStats[fmt] = { spend: 0, results: 0, count: 0 };
                    formatStats[fmt].spend += ad.spend || 0;
                    const ra = findResultAction(ad.actions, ch?.goal);
                    formatStats[fmt].results += ra ? parseInt(ra.value, 10) : 0;
                    formatStats[fmt].count++;
                  });
                  return Object.entries(formatStats).map(([fmt, s]) => (
                    <div key={fmt} style={{ background: "var(--surface-hover)", border: "1px solid var(--hairline)", borderRadius: 6, padding: "10px 12px" }}>
                      <p style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: 4 }}>{fmt}</p>
                      <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                        <span style={{ color: "var(--amber)" }}>{fmtMXN(s.spend)}</span>
                        <span style={{ color: "var(--emerald)" }}>{Math.round(s.results)} res.</span>
                        <span style={{ color: "var(--cyan)" }}>{s.results > 0 ? fmtMXN(s.spend / s.results) : "—"} CPR</span>
                      </div>
                      <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>{s.count} anuncios</p>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* ── CTR por Creativo (Top 10) ── */}
            <div style={panelStyle}>
              <h3 style={headingStyle}><MousePointer style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />CTR por Creativo</h3>
              <p style={subStyle}>Top 10 anuncios con mejor tasa de clics</p>
              <div style={{ width: "100%", height: 380 }}>
                {(() => {
                  if (!adCreatives.length && creativesLoading) return <NoData msg="Cargando..." />;
                  const d = adCreatives
                    .filter(a => a.spend > 0 && a.impressions > 0)
                    .map((ad: any) => ({
                      name: (ad.adName || "Sin nombre").length > 25 ? (ad.adName || "Sin nombre").slice(0, 25) + "..." : ad.adName || "Sin nombre",
                      ctr: ad.ctr || (ad.clicks > 0 && ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0),
                      spend: ad.spend,
                    }))
                    .sort((a: any, b: any) => b.ctr - a.ctr)
                    .slice(0, 10);
                  if (!d.length) return <NoData msg="Sin datos de CTR" />;
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                        <XAxis type="number" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(1)}%`} />
                        <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" fontSize={8} tickLine={false} axisLine={false} width={140} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => [name === "ctr" ? `${Number(v).toFixed(2)}%` : fmtMXN(Number(v)), name === "ctr" ? "CTR" : "Inversión"]} />
                        <Bar dataKey="ctr" fill="var(--emerald)" radius={[0, 4, 4, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>

          </div>

          {/* Combinación Ganadora */}
          <div style={{
            ...panelStyle,
            background: "linear-gradient(135deg, rgba(253,171,61,0.06) 0%, rgba(0,0,0,0) 60%)",
            borderTop: "2px solid rgba(253,171,61,0.3)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface)", border: "1px solid rgba(253,171,61,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap style={{ width: 16, height: 16, color: "var(--amber)" }} />
              </div>
              <div>
                <h3 style={headingStyle}>Combinación Ganadora</h3>
                <p style={subStyle}>Campaña y conjunto de anuncios con mejor rendimiento del periodo</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(() => {
                const top = (insights?.campaigns || []).map((c: any) => { const s = parseFloat(c.spend || "0"); const ra = findResultAction(c.actions, ch?.goal); const r = ra ? parseInt(ra.value, 10) : 0; return { name: c.campaign_name || "?", results: r, cpa: r > 0 ? s / r : 0, spend: s }; }).sort((a: any, b: any) => b.spend - a.spend)[0];
                return top ? (
                  <div style={{
                    background: "linear-gradient(135deg, rgba(253,171,61,0.08), rgba(0,0,0,0.15))",
                    border: "1px solid rgba(253,171,61,0.2)", borderRadius: 12, padding: 18,
                    position: "relative", overflow: "hidden",
                  }}>
                    <div style={{ position: "absolute", top: -10, right: -10, width: 60, height: 60, borderRadius: "50%", background: "var(--surface)" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🏆</div>
                      <p style={{ fontSize: 9, color: "var(--amber)", fontWeight: 800, letterSpacing: "0.12em" }}>CAMPAÑA GANADORA</p>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", marginBottom: 12, lineHeight: 1.4 }}>{top.name}</p>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ padding: "4px 10px", background: "var(--surface)", border: "1px solid rgba(0,200,117,0.2)", borderRadius: 20, fontSize: 10 }}>
                        <span style={{ color: "var(--text-secondary)" }}>Resultados: </span><span style={{ color: "var(--emerald)", fontWeight: 700 }}>{top.results}</span>
                      </div>
                      <div style={{ padding: "4px 10px", background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 20, fontSize: 10 }}>
                        <span style={{ color: "var(--text-secondary)" }}>CPA: </span><span style={{ color: "var(--cyan)", fontWeight: 700 }}>{fmtMXN(top.cpa)}</span>
                      </div>
                      <div style={{ padding: "4px 10px", background: "var(--surface)", border: "1px solid rgba(253,171,61,0.2)", borderRadius: 20, fontSize: 10 }}>
                        <span style={{ color: "var(--text-secondary)" }}>Inversión: </span><span style={{ color: "var(--amber)", fontWeight: 700 }}>{fmtMXN(top.spend)}</span>
                      </div>
                    </div>
                  </div>
                ) : <div style={{ padding: 20, color: "var(--text-muted)", fontSize: 12, textAlign: "center", border: "1px dashed var(--border)", borderRadius: 12 }}>Sin datos de campaña</div>;
              })()}
              {(() => {
                const top = (insights?.adsets || []).map((a: any) => { const s = parseFloat(a.spend || "0"); const ra = findResultAction(a.actions, ch?.goal); const r = ra ? parseInt(ra.value, 10) : 0; return { name: a.adset_name || "?", results: r, cpa: r > 0 ? s / r : 0, spend: s }; }).sort((a: any, b: any) => b.spend - a.spend)[0];
                return top ? (
                  <div style={{
                    background: "linear-gradient(135deg, rgba(139,141,242,0.08), rgba(0,0,0,0.15))",
                    border: "1px solid rgba(139,141,242,0.2)", borderRadius: 12, padding: 18,
                    position: "relative", overflow: "hidden",
                  }}>
                    <div style={{ position: "absolute", top: -10, right: -10, width: 60, height: 60, borderRadius: "50%", background: "var(--surface)" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🥇</div>
                      <p style={{ fontSize: 9, color: "var(--purple)", fontWeight: 800, letterSpacing: "0.12em" }}>ADSET GANADOR</p>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", marginBottom: 12, lineHeight: 1.4 }}>{top.name}</p>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ padding: "4px 10px", background: "var(--surface)", border: "1px solid rgba(0,200,117,0.2)", borderRadius: 20, fontSize: 10 }}>
                        <span style={{ color: "var(--text-secondary)" }}>Resultados: </span><span style={{ color: "var(--emerald)", fontWeight: 700 }}>{top.results}</span>
                      </div>
                      <div style={{ padding: "4px 10px", background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 20, fontSize: 10 }}>
                        <span style={{ color: "var(--text-secondary)" }}>CPA: </span><span style={{ color: "var(--cyan)", fontWeight: 700 }}>{fmtMXN(top.cpa)}</span>
                      </div>
                      <div style={{ padding: "4px 10px", background: "var(--surface)", border: "1px solid rgba(139,141,242,0.2)", borderRadius: 20, fontSize: 10 }}>
                        <span style={{ color: "var(--text-secondary)" }}>Inversión: </span><span style={{ color: "var(--purple)", fontWeight: 700 }}>{fmtMXN(top.spend)}</span>
                      </div>
                    </div>
                  </div>
                ) : <div style={{ padding: 20, color: "var(--text-muted)", fontSize: 12, textAlign: "center", border: "1px dashed var(--border)", borderRadius: 12 }}>Sin datos de adset</div>;
              })()}
            </div>
          </div>

          {/* ── Lightbox modal ── */}
          {previewAd && (
            <CreativeLightbox
              ad={previewAd}
              onClose={() => setPreviewAd(null)}
              fmtMXN={fmtMXN}
              fmtNum={fmtNum}
              cprTarget={cprTarget}
              cprLabel={"CPR"}
              pageName={project?.fanpage?.[0] || project?.alias || ""}
              pageImageUrl={(() => {
                const fpName = project?.fanpage?.[0] || "";
                const matched = metaPages.find((p: any) => p.name === fpName);
                return matched?.picture || metaPages[0]?.picture || "";
              })()}
            />
          )}
        </div>
        </ErrorBoundary>
      )}


      {/* ═══ TAB: SALUD DEL RESULTADO ═══ */}
      {activeTab === "salud" && (
        <ErrorBoundary name="Tab Salud">
          {(() => {
            // Health calculations
            const frequency = totalImpressions > 0 && totalReach > 0 ? totalImpressions / totalReach : 0;
            const conversionRate = totalClicks > 0 ? (totalResults / totalClicks) * 100 : 0;
            const idealSpend = bk.daily * daysElapsed;
            const spendPaceRatio = idealSpend > 0 ? totalSpend / idealSpend : 1;

            // Score calculations (each 0-100)
            const cprScore = cprTarget > 0 ? Math.max(0, Math.min(100, cpr <= cprTarget ? 100 : Math.round(100 - ((cpr / cprTarget - 1) * 333)))) : 50;
            const freqScore = Math.max(0, Math.min(100, Math.round(frequency <= 2 ? 100 : frequency <= 4 ? 100 - ((frequency - 2) * 25) : Math.max(0, 50 - ((frequency - 4) * 25)))));
            const ctrScore = Math.max(0, Math.min(100, Math.round(ctr >= 2 ? 100 : ctr >= 1 ? 60 + (ctr - 1) * 40 : ctr >= 0.5 ? 20 + (ctr - 0.5) * 80 : ctr * 40)));
            const convScore = Math.max(0, Math.min(100, Math.round(conversionRate >= 8 ? 100 : conversionRate >= 4 ? 60 + (conversionRate - 4) * 10 : conversionRate >= 1 ? 20 + (conversionRate - 1) * 13.33 : conversionRate * 20)));
            const paceScore = Math.max(0, Math.min(100, Math.round(Math.abs(spendPaceRatio - 1) <= 0.1 ? 100 : Math.abs(spendPaceRatio - 1) <= 0.25 ? 50 + (0.25 - Math.abs(spendPaceRatio - 1)) / 0.15 * 50 : Math.max(0, 100 - Math.abs(spendPaceRatio - 1) * 200))));

            const tsd = timeSeriesData || [];
            const half = Math.floor(tsd.length / 2);
            const firstHalfCPR = half > 0 ? tsd.slice(0, half).reduce((a: number, d: any) => a + (d.cpr || 0), 0) / half : 0;
            const secondHalfCPR = tsd.length - half > 0 ? tsd.slice(half).reduce((a: number, d: any) => a + (d.cpr || 0), 0) / (tsd.length - half) : 0;
            const trendScore = firstHalfCPR > 0 ? Math.max(0, Math.min(100, Math.round(secondHalfCPR <= firstHalfCPR ? 100 : 100 - ((secondHalfCPR / firstHalfCPR - 1) * 200)))) : 50;

            const healthScore = Math.round(cprScore * 0.25 + freqScore * 0.20 + ctrScore * 0.15 + convScore * 0.15 + paceScore * 0.15 + trendScore * 0.10);
            const healthLabel = healthScore >= 80 ? "Excelente" : healthScore >= 60 ? "Buena" : healthScore >= 40 ? "En Riesgo" : "Crítica";
            const healthColor = healthScore >= 80 ? "var(--emerald)" : healthScore >= 60 ? "var(--amber)" : "var(--red)";

            // SVG gauge params
            const radius = 80; const circumference = 2 * Math.PI * radius;
            const dashOffset = circumference - (healthScore / 100) * circumference;

            // Indicators
            const indicators = [
              { name: "Eficiencia CPR", icon: <DollarSign style={{ width: 14, height: 14 }} />, score: cprScore, value: fmtMXN(cpr), bench: cprTarget > 0 ? `Meta: ${fmtMXN(cprTarget)}` : "Sin meta", color: cprScore >= 70 ? "var(--emerald)" : cprScore >= 40 ? "var(--amber)" : "var(--red)" },
              { name: "Frecuencia", icon: <RefreshCw style={{ width: 14, height: 14 }} />, score: freqScore, value: frequency.toFixed(2), bench: "Ideal: 1.0 - 2.5", color: freqScore >= 70 ? "var(--emerald)" : freqScore >= 40 ? "var(--amber)" : "var(--red)" },
              { name: "CTR", icon: <MousePointer style={{ width: 14, height: 14 }} />, score: ctrScore, value: pct(ctr), bench: "Ideal: > 1.5%", color: ctrScore >= 70 ? "var(--emerald)" : ctrScore >= 40 ? "var(--amber)" : "var(--red)" },
              { name: "Tasa Conversión", icon: <Target style={{ width: 14, height: 14 }} />, score: convScore, value: pct(conversionRate), bench: "Ideal: > 5%", color: convScore >= 70 ? "var(--emerald)" : convScore >= 40 ? "var(--amber)" : "var(--red)" },
              { name: "Ritmo de Gasto", icon: <TrendingUp style={{ width: 14, height: 14 }} />, score: paceScore, value: pct(spendPaceRatio * 100), bench: "Ideal: 100%", color: paceScore >= 70 ? "var(--emerald)" : paceScore >= 40 ? "var(--amber)" : "var(--red)" },
              { name: "Tendencia CPR", icon: <Activity style={{ width: 14, height: 14 }} />, score: trendScore, value: firstHalfCPR > 0 ? `${secondHalfCPR <= firstHalfCPR ? "↓" : "↑"} ${Math.abs(((secondHalfCPR / firstHalfCPR) - 1) * 100).toFixed(1)}%` : "—", bench: "Estable o mejorando", color: trendScore >= 70 ? "var(--emerald)" : trendScore >= 40 ? "var(--amber)" : "var(--red)" },
            ];

            // Recommendations (Cross-diagnostic logic)
            const recs: { severity: string; text: string }[] = [];
            
            if (cprScore >= 80) {
              recs.push({ severity: "success", text: `Costo por Resultado excelente (${fmtMXN(cpr)}). El embudo está sano y convirtiendo eficientemente. Sugerencia: Escalar presupuesto un 15-20%.` });
            } else if (cprScore < 50 && cprTarget > 0) {
              recs.push({ severity: "critical", text: `Costo por Resultado en riesgo (${fmtMXN(cpr)} vs meta ${fmtMXN(cprTarget)}). Costos de adquisición elevados.` });
            }

            if (ctrScore >= 60 && convScore < 50) {
              recs.push({ severity: "warning", text: `Fuga en Bottom-Funnel: Alto CTR (${pct(ctr)}) pero baja conversión (${pct(conversionRate)}). El anuncio atrae pero la landing page no convence o el lead es de baja intención.` });
            } else if (ctrScore < 50 && convScore >= 60) {
              recs.push({ severity: "warning", text: `Fuga en Mid-Funnel: Baja atracción (${pct(ctr)}) pero buena conversión (${pct(conversionRate)}). Mejora los creativos y hooks, tu landing page funciona bien.` });
            } else if (ctrScore < 50 && convScore < 50) {
              recs.push({ severity: "critical", text: `Fuga General: Los creativos no atraen (${pct(ctr)}) y la oferta no convierte (${pct(conversionRate)}). Revisión total de campaña requerida.` });
            }

            if (freqScore < 50 && ctrScore < 50) {
              recs.push({ severity: "warning", text: `Fatiga Creativa: Frecuencia alta (${frequency.toFixed(1)}) y CTR cayendo. La audiencia ya se cansó de los anuncios actuales. Rota creativos inmediatamente.` });
            }

            if (paceScore < 40) {
               if (spendPaceRatio < 1) {
                  recs.push({ severity: "warning", text: `Sub-inversión: El gasto está por debajo del ritmo ideal. Revisa si las pujas son muy bajas o la audiencia muy pequeña.` });
               } else {
                  recs.push({ severity: "warning", text: `Sobre-inversión: El gasto está muy acelerado. Ajusta límites diarios para no quedarte sin presupuesto antes de fin de mes.` });
               }
            }

            if (recs.length === 0) recs.push({ severity: "success", text: "Todas las métricas están dentro de rangos saludables. Mantén la estrategia actual y monitorea diariamente." });

            const funnelSteps = [
              { ...indicators[1], step: "1. Atracción", desc: "¿A cuántos llegamos sin saturar?" },
              { ...indicators[2], step: "2. Interacción", desc: "¿El creativo llama la atención?" },
              { ...indicators[3], step: "3. Conversión", desc: "¿La oferta o página convence?" },
              { ...indicators[4], step: "4. Gasto", desc: "¿Estamos gastando al ritmo ideal?" },
            ];

            return (
              <div className="space-y-4">
                {/* Top row: Pulse Check (Resumen Ejecutivo) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Health Score Gauge (Pulse) */}
                  <div style={{ ...panelStyle, display: "flex", alignItems: "center", justifyContent: "space-between", padding: 20, minHeight: 140 }}>
                    <div>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>Pulse Check</h3>
                      <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>Estado general de la campaña</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                         <div style={{ width: 12, height: 12, borderRadius: "50%", background: healthColor, boxShadow: `0 0 10px ${healthColor}` }} />
                         <span style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", textTransform: "uppercase" }}>{healthLabel}</span>
                      </div>
                    </div>
                    
                    <div style={{ position: "relative", width: 100, height: 100 }}>
                      <svg width="100" height="100" viewBox="0 0 200 200" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="100" cy="100" r={radius} fill="none" stroke="var(--surface-hover)" strokeWidth="16" />
                        <circle cx="100" cy="100" r={radius} fill="none" stroke={healthColor} strokeWidth="16" strokeLinecap="round"
                          strokeDasharray={circumference} strokeDashoffset={dashOffset}
                          style={{ transition: "stroke-dashoffset 1s ease-out, stroke 0.5s" }} />
                      </svg>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 24, fontWeight: 800, color: healthColor, fontFamily: "var(--font-display)", lineHeight: 1 }}>{healthScore}</span>
                      </div>
                    </div>
                  </div>

                  {/* Eficiencia CPR (Métrica Estrella) */}
                  <div className="lg:col-span-2" style={{ ...panelStyle, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 30px", background: `linear-gradient(135deg, rgba(15,23,42,1) 0%, ${indicators[0].color}15 100%)`, border: `1px solid ${indicators[0].color}30` }}>
                    <div style={{ zIndex: 2 }}>
                       <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: indicators[0].color }}>
                         <div style={{ padding: 6, background: `${indicators[0].color}20`, borderRadius: 8 }}>{indicators[0].icon}</div>
                         <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Eficiencia General (Costo por Resultado)</span>
                       </div>
                       <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                          <span style={{ fontSize: 42, fontWeight: 800, color: "var(--foreground)", fontFamily: "var(--font-display)" }}>{indicators[0].value}</span>
                          <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{indicators[0].bench}</span>
                       </div>
                    </div>
                    <div style={{ zIndex: 2, textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                       <span style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Score de Eficiencia</span>
                       <span style={{ fontSize: 32, fontWeight: 800, color: indicators[0].color, fontFamily: "var(--font-display)" }}>{indicators[0].score}</span>
                       <div style={{ width: 100, height: 4, background: "var(--surface-hover)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${indicators[0].score}%`, background: indicators[0].color, borderRadius: 2 }} />
                       </div>
                    </div>
                    <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, background: `radial-gradient(circle, ${indicators[0].color}20 0%, transparent 70%)` }} />
                  </div>
                </div>

                {/* Fila 2: Análisis del Embudo (Funnel Health) */}
                <div style={panelStyle}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                    <h3 style={headingStyle}>Análisis del Embudo de Conversión</h3>
                    <p style={subStyle}>Diagnóstico del viaje del usuario: Atracción, Interacción, Conversión y Gasto.</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 0 }}>
                    {funnelSteps.map((step, i) => (
                      <div key={i} style={{ padding: 20, position: "relative", borderRight: i < funnelSteps.length - 1 ? "1px dashed rgba(255,255,255,0.1)" : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{step.step}</span>
                          <div style={{ color: step.color, padding: 4, background: `${step.color}15`, borderRadius: 6 }}>
                            {step.icon}
                          </div>
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>{step.name}</p>
                        <div style={{ fontSize: 24, fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-display)", marginBottom: 8 }}>
                          {step.value}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{step.bench}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: step.color, fontFamily: "var(--font-display)" }}>{step.score}</span>
                        </div>
                        <div style={{ height: 4, background: "var(--surface-hover)", borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
                          <div style={{ height: "100%", width: `${step.score}%`, background: step.color, borderRadius: 2 }} />
                        </div>
                        <p style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.4 }}>{step.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fila 3: Tendencia vs Diagnóstico Cruzado */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* CPR Trend Chart */}
                  <div className="lg:col-span-2" style={panelStyle}>
                    <h3 style={headingStyle}>Tendencia de CPR vs Meta</h3>
                    <p style={subStyle}>Evolución del costo por resultado a lo largo del periodo</p>
                    <div style={{ width: "100%", height: 280 }}>
                      {tsd.length > 0 ? (
                        <ResponsiveContainer>
                          <ComposedChart data={tsd} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                            <defs>
                              <linearGradient id="gcpr" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--cyan)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--cyan)" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} />
                            <YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} />
                            <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmtMXN(v), ""]} />
                            <Area type="monotone" dataKey="cpr" name="CPR" stroke="var(--cyan)" strokeWidth={2} fillOpacity={1} fill="url(#gcpr)" />
                            {cprTarget > 0 && <ReferenceLine y={cprTarget} stroke="var(--red)" strokeDasharray="5 5" label={{ value: `Meta: ${fmtMXN(cprTarget)}`, position: "right", fill: "var(--red)", fontSize: 10 }} />}
                          </ComposedChart>
                        </ResponsiveContainer>
                      ) : <NoData />}
                    </div>
                  </div>

                  {/* Diagnostic + Recommendations */}
                  <div style={{ ...panelStyle, display: "flex", flexDirection: "column" }}>
                    <h3 style={headingStyle}><Shield style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6, color: healthColor }} />Plan de Acción Inmediato</h3>
                    <p style={subStyle}>Diagnóstico cruzado y sugerencias</p>
                    <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                      {recs.map((r, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, padding: "12px", background: r.severity === "critical" ? "rgba(226,68,92,0.06)" : r.severity === "warning" ? "rgba(253,171,61,0.06)" : "rgba(0,200,117,0.06)", border: `1px solid ${r.severity === "critical" ? "rgba(226,68,92,0.12)" : r.severity === "warning" ? "rgba(253,171,61,0.12)" : "rgba(0,200,117,0.12)"}`, borderRadius: 8 }}>
                          <div style={{ flexShrink: 0, marginTop: 2 }}>
                            {r.severity === "critical" ? <AlertTriangle style={{ width: 16, height: 16, color: "var(--red)" }} /> : r.severity === "warning" ? <AlertTriangle style={{ width: 16, height: 16, color: "var(--amber)" }} /> : <CheckCircle style={{ width: 16, height: 16, color: "var(--emerald)" }} />}
                          </div>
                          <p style={{ fontSize: 12, color: "var(--foreground)", lineHeight: 1.5 }}>{r.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </ErrorBoundary>
      )}

      {/* ═══ TAB: ADS MANAGER ═══ */}
      {activeTab === "ads" && (
        <ErrorBoundary name="Tab Ads Manager">
          {(() => {
            // Get this project's ad account IDs
            const projectAccounts = project?.channels
              ?.filter((ch: any) => ch.platformId === "meta")
              ?.flatMap((ch: any) => ch.adAccounts || [])
              ?.filter(Boolean) || [];
            const currentActiveAccount = selectedAccountId === "all" ? "all" : selectedAccountId;

            return (
              <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)", margin: "8px 0 0", padding: 0 }}>
            {/* Embedded Ads Manager via iframe */}
            <iframe
              src={`/dashboard/ads-manager?embedded=1&account=${currentActiveAccount}&project_accounts=${projectAccounts.join(",")}&datePreset=${datePreset}&dateStart=${dateStart}&dateEnd=${dateEnd}`}
              style={{
                width: "100%",
                flex: 1,
                border: "1px solid var(--hairline)",
                borderRadius: 8,
                background: "var(--background)",
              }}
              title="Ads Manager"
            />
          </div>
            );
          })()}
        </ErrorBoundary>
      )}




      {/* ═══ TAB: ANÁLISIS DE TRÁFICO (GA4) ═══ */}
      {activeTab === "trafico" && (
        <ErrorBoundary name="Tab Trafico">
          <TrafficAnalytics project={project as any} />
        </ErrorBoundary>
      )}

      {/* ═══ TAB: CONFIGURACIÓN ═══ */}
      {activeTab === "config" && (
        <ErrorBoundary name="Tab Configuracion">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

          {/* ── Google Sources Panel ── */}
          <div style={{ ...panelStyle, gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface)", border: "1px solid rgba(66,133,244,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 24 24" width={14} height={14} fill="#4285F4"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              </div>
              <div>
                <h3 style={headingStyle}>Fuentes de Google</h3>
                <p style={{ ...subStyle, marginBottom: 0 }}>Vincula las cuentas de Google de este cliente al proyecto para ver su rendimiento 360°.</p>
              </div>
            </div>
            <GoogleSourcesPanel projectId={project.id} />
          </div>

          <div style={panelStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Settings style={{ width: 14, height: 14, color: "var(--cyan)" }} />
                </div>
                <h3 style={headingStyle}>Información General</h3>
              </div>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                  background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.2)",
                  color: "var(--cyan)", cursor: "pointer", borderRadius: 20, fontSize: 11, fontWeight: 600,
                  transition: "all 0.15s",
                }}>
                  <Edit3 style={{ width: 12, height: 12 }} /> Editar
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setIsEditing(false); setEditForm(project); }} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "var(--surface)", border: "1px solid rgba(226,68,92,0.2)", color: "var(--red)", cursor: "pointer", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                    <X style={{ width: 12, height: 12 }} /> Cancelar
                  </button>
                  <button onClick={saveChanges} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", background: "var(--surface)", border: "1px solid rgba(0,200,117,0.2)", color: "var(--emerald)", cursor: "pointer", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    <Save style={{ width: 12, height: 12 }} /> Guardar
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {([
                { label: "Alias", key: "alias", icon: <Tag style={{ width: 12, height: 12 }} /> },
                { label: "Cliente", key: "client", icon: <Building style={{ width: 12, height: 12 }} /> },
                { label: "Vertical", key: "vertical", icon: <Layers style={{ width: 12, height: 12 }} /> },
                { label: "Website", key: "website", icon: <Globe style={{ width: 12, height: 12 }} /> },
                { label: "Buyer Persona", key: "persona", icon: <Users style={{ width: 12, height: 12 }} /> },
                { label: "Geo Target", key: "geo", icon: <MapPin style={{ width: 12, height: 12 }} /> },
              ] as const).map(f => (
                <div key={f.key} style={{
                  display: "flex", alignItems: isEditing ? "flex-start" : "center", gap: 12,
                  padding: "10px 12px", borderRadius: 8, transition: "background 0.15s",
                  border: "1px solid var(--hairline)",
                }}
                onMouseEnter={e => !isEditing && (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--text-muted)" }}>
                    {f.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ ...labelStyle, marginBottom: 2 }}>{f.label}</p>
                    {isEditing ? (
                      <input value={(editForm as any)[f.key] || ""} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} style={{ width: "100%", background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--foreground)", fontSize: 12, padding: "6px 10px", borderRadius: 6, outline: "none" }} />
                    ) : (
                      <p style={{ fontSize: 13, color: (project as any)[f.key] ? "var(--foreground)" : "rgba(108,124,147,0.5)", fontStyle: (project as any)[f.key] ? "normal" : "italic" }}>
                        {(project as any)[f.key] || "Sin configurar"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {/* Estado */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--hairline)" }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--text-muted)" }}>
                  <Activity style={{ width: 12, height: 12 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ ...labelStyle, marginBottom: 2 }}>Estado</p>
                  {isEditing ? (
                    <select value={editForm.status || project.status} onChange={e => setEditForm({ ...editForm, status: e.target.value as any })} style={{ width: "100%", background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--foreground)", fontSize: 12, padding: "6px 10px", borderRadius: 6, cursor: "pointer" }}>
                      <option value="Activo">Activo</option><option value="Pausado">Pausado</option><option value="Draft">Draft</option><option value="Completado">Completado</option>
                    </select>
                  ) : (
                    <span className={`badge badge-${STATUS_COLORS[project.status]}`}>{project.status}</span>
                  )}
                </div>
              </div>
              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3" style={{ padding: "10px 0" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--text-muted)", marginLeft: 12 }}>
                    <Calendar style={{ width: 12, height: 12 }} />
                  </div>
                  <div>
                    <p style={labelStyle}>Fecha Inicio</p>
                    {isEditing ? <input type="date" value={editForm.dateStart || ""} onChange={e => setEditForm({ ...editForm, dateStart: e.target.value })} style={{ width: "100%", background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--foreground)", fontSize: 11, padding: "6px", borderRadius: 6 }} /> : <p style={{ fontSize: 12, color: project.dateStart ? "var(--foreground)" : "rgba(108,124,147,0.5)", fontStyle: project.dateStart ? "normal" : "italic" }}>{project.dateStart ? new Date(project.dateStart).toLocaleDateString("es-MX") : "Sin fecha"}</p>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--text-muted)" }}>
                    <Calendar style={{ width: 12, height: 12 }} />
                  </div>
                  <div>
                    <p style={labelStyle}>Fecha Fin</p>
                    {isEditing ? <input type="date" value={editForm.dateEnd || ""} onChange={e => setEditForm({ ...editForm, dateEnd: e.target.value })} style={{ width: "100%", background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--foreground)", fontSize: 11, padding: "6px", borderRadius: 6 }} /> : <p style={{ fontSize: 12, color: project.dateEnd ? "var(--foreground)" : "rgba(108,124,147,0.5)", fontStyle: project.dateEnd ? "normal" : "italic" }}>{project.dateEnd ? new Date(project.dateEnd).toLocaleDateString("es-MX") : "Sin fecha"}</p>}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Channel Config */}
          <div style={panelStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <h3 style={headingStyle}>Configuración de Canales</h3>
                <p style={subStyle}>{project.channels.length} canales configurados</p>
              </div>
              <select 
                value={editingMonth} 
                onChange={e => setEditingMonth(e.target.value)}
                style={{ background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--cyan)", fontSize: 11, padding: "4px 8px", borderRadius: 4, cursor: "pointer", outline: "none" }}
              >
                <option value="global">Meta Global (Por Defecto)</option>
                <option value="2026-05">Mayo 2026</option>
                <option value="2026-06">Junio 2026</option>
                <option value="2026-07">Julio 2026</option>
                <option value="2026-08">Agosto 2026</option>
                <option value="2026-09">Septiembre 2026</option>
                <option value="2026-10">Octubre 2026</option>
                <option value="2026-11">Noviembre 2026</option>
                <option value="2026-12">Diciembre 2026</option>
              </select>
            </div>
            {project.channels.map((c, i) => {
              const pl = PLATFORMS.find(p => p.id === c.platformId) || PLATFORMS[0];
              const isGlobal = editingMonth === "global";
              const currentBudget = isGlobal ? c.budget : (c.monthlyOverrides?.[editingMonth]?.budget || c.budget);
              const currentCpr = isGlobal ? c.cpr : (c.monthlyOverrides?.[editingMonth]?.cpr || c.cpr);
              const currentGoal = isGlobal ? c.goal : (c.monthlyOverrides?.[editingMonth]?.goal || c.goal);
              const isOverridden = !isGlobal && c.monthlyOverrides?.[editingMonth] !== undefined;

              const editCurrentBudget = isGlobal ? (editForm.channels?.[i]?.budget || c.budget) : (editForm.channels?.[i]?.monthlyOverrides?.[editingMonth]?.budget ?? (editForm.channels?.[i]?.budget || c.budget));
              const editCurrentCpr = isGlobal ? (editForm.channels?.[i]?.cpr || c.cpr) : (editForm.channels?.[i]?.monthlyOverrides?.[editingMonth]?.cpr ?? (editForm.channels?.[i]?.cpr || c.cpr));
              const editCurrentGoal = isGlobal ? (editForm.channels?.[i]?.goal || c.goal) : (editForm.channels?.[i]?.monthlyOverrides?.[editingMonth]?.goal ?? (editForm.channels?.[i]?.goal || c.goal));

              const bk2 = getBudgetBreakdown(parseBudget(currentBudget), c.period);
              return (
                <div key={i} style={{ padding: 16, background: "var(--surface)", border: "1px solid var(--hairline)", borderRadius: 6, marginBottom: 8, borderLeft: `3px solid ${pl.color}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: pl.color }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{pl.name}</span>
                    </div>
                    {!isGlobal && isOverridden && !isEditing && (
                      <span style={{ fontSize: 10, background: "var(--cyan-dim)", color: "var(--cyan)", padding: "2px 6px", borderRadius: 4 }}>Meta Mensual Activa</span>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p style={labelStyle}>Presupuesto {isGlobal ? "" : `(${editingMonth})`}</p>
                        <input value={editCurrentBudget} onChange={e => {
                          const ch2 = [...(editForm.channels || project.channels)];
                          if (isGlobal) ch2[i] = { ...ch2[i], budget: e.target.value };
                          else {
                            const overrides = { ...(ch2[i].monthlyOverrides || {}) };
                            overrides[editingMonth] = { ...overrides[editingMonth], budget: e.target.value };
                            ch2[i] = { ...ch2[i], monthlyOverrides: overrides };
                          }
                          setEditForm({ ...editForm, channels: ch2 });
                        }} style={{ width: "100%", background: "var(--surface-hover)", border: "1px solid rgba(59,130,246,0.15)", color: "var(--foreground)", fontSize: 12, padding: "6px 10px", borderRadius: 4 }} />
                      </div>
                      <div>
                        <p style={labelStyle}>Período {isGlobal ? "" : "(Global)"}</p>
                        <select value={editForm.channels?.[i]?.period || c.period} onChange={e => { const ch2 = [...(editForm.channels || project.channels)]; ch2[i] = { ...ch2[i], period: e.target.value }; setEditForm({ ...editForm, channels: ch2 }); }} disabled={!isGlobal} style={{ width: "100%", background: "var(--surface-hover)", border: "1px solid var(--hairline)", color: "var(--foreground)", fontSize: 12, padding: "6px 10px", borderRadius: 4, cursor: isGlobal ? "pointer" : "not-allowed", opacity: isGlobal ? 1 : 0.6 }}><option value="Diario">Diario</option><option value="Semanal">Semanal</option><option value="Mensual">Mensual</option><option value="Anual">Anual</option></select>
                      </div>
                      <div>
                        <p style={labelStyle}>Objetivo</p>
                        <input value={editCurrentGoal} onChange={e => {
                          const ch2 = [...(editForm.channels || project.channels)];
                          if (isGlobal) ch2[i] = { ...ch2[i], goal: e.target.value };
                          else {
                            const overrides = { ...(ch2[i].monthlyOverrides || {}) };
                            overrides[editingMonth] = { ...overrides[editingMonth], goal: e.target.value };
                            ch2[i] = { ...ch2[i], monthlyOverrides: overrides };
                          }
                          setEditForm({ ...editForm, channels: ch2 });
                        }} style={{ width: "100%", background: "var(--surface-hover)", border: "1px solid var(--hairline)", color: "var(--foreground)", fontSize: 12, padding: "6px 10px", borderRadius: 4 }} />
                      </div>
                      <div>
                        <p style={labelStyle}>CPR Meta</p>
                        <input value={editCurrentCpr} onChange={e => {
                          const ch2 = [...(editForm.channels || project.channels)];
                          if (isGlobal) ch2[i] = { ...ch2[i], cpr: e.target.value };
                          else {
                            const overrides = { ...(ch2[i].monthlyOverrides || {}) };
                            overrides[editingMonth] = { ...overrides[editingMonth], cpr: e.target.value };
                            ch2[i] = { ...ch2[i], monthlyOverrides: overrides };
                          }
                          setEditForm({ ...editForm, channels: ch2 });
                        }} style={{ width: "100%", background: "var(--surface-hover)", border: "1px solid var(--hairline)", color: "var(--foreground)", fontSize: 12, padding: "6px 10px", borderRadius: 4 }} />
                      </div>
                      {!isGlobal && (
                        <div className="col-span-2 flex justify-end">
                          <button onClick={() => {
                            const ch2 = [...(editForm.channels || project.channels)];
                            const overrides = { ...(ch2[i].monthlyOverrides || {}) };
                            delete overrides[editingMonth];
                            ch2[i] = { ...ch2[i], monthlyOverrides: overrides };
                            setEditForm({ ...editForm, channels: ch2 });
                          }} style={{ fontSize: 10, color: "var(--red)", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>Eliminar Meta Mensual</button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-y-3 gap-x-6" style={{ fontSize: 12 }}>
                      <div><span style={{ color: "var(--text-secondary)" }}>Presupuesto:</span> <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{currentBudget || "—"}</span></div>
                      <div><span style={{ color: "var(--text-secondary)" }}>Período:</span> <span style={{ color: "var(--foreground)" }}>{c.period || "—"}</span></div>
                      <div><span style={{ color: "var(--text-secondary)" }}>Objetivo:</span> <span style={{ color: "var(--emerald)", fontWeight: 600 }}>{currentGoal || "—"}</span></div>
                      <div><span style={{ color: "var(--text-secondary)" }}>CPR Meta:</span> <span style={{ color: "var(--cyan)", fontWeight: 600 }}>{currentCpr || "—"}</span></div>
                      <div><span style={{ color: "var(--text-secondary)" }}>Diario ideal:</span> <span style={{ color: "var(--foreground)" }}>{fmtMXN(bk2.daily)}</span></div>
                      <div><span style={{ color: "var(--text-secondary)" }}>Cuentas:</span> <span style={{ color: "var(--foreground)" }}>{c.adAccounts?.length || 0}</span></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        </ErrorBoundary>
      )}
    </div>
  );
}
