"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Calendar, DollarSign, Target, Eye, TrendingUp, TrendingDown, Filter,
  BarChart2, Activity, Zap, CreditCard, CheckCircle, Clock, Edit3, Save, X,
  Users, Palette, Settings, ChevronDown, ChevronUp, AlertTriangle,
  Layers, Monitor, Smartphone, Globe, PieChart as PieIcon,
  HeartPulse, RefreshCw, MousePointer, Shield
} from "lucide-react";
import { normalizeIntegrationProvider } from "@/lib/analytics/project-scope";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, PieChart, Pie, Cell, Legend, BarChart, Bar, ReferenceLine
} from "recharts";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { CreativeCard, CreativeLightbox } from "@/components/shared/CreativePreview";
import { useInsightsStore } from "@/stores/insightsStore";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import BotAnalyticsDashboard from "@/components/botmaker/analytics/dashboard/BotAnalyticsDashboard";
import { TrafficAnalytics } from "@/components/proyectos/TrafficAnalytics";

/* ═══ TYPES ═══ */
interface ChannelConfig { platformId: string; platformName: string; adAccounts: string[]; budget: string; period: string; goal: string; cpr: string; }
interface Project { id: string; alias: string; client: string; vertical: string; fanpage: string[]; instagram: string[]; whatsapp: string[]; website: string; channels: ChannelConfig[]; dateStart: string; dateEnd: string; persona: string; geo: string; status: "Activo"|"Pausado"|"Draft"|"Completado"|"EN VUELO"|"EN ÓRBITA"; createdAt: string; crmIntegrationId?: string | null; crmType?: string | null; crmIntegrationIds?: string[]; }


const PLATFORMS = [
  { id: "meta", name: "Meta Ads", color: "#0081FB" },
  { id: "google", name: "Google Ads", color: "#4285F4" },
  { id: "tiktok", name: "TikTok Ads", color: "#25F4EE" },
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
const panelStyle: React.CSSProperties = { background: "var(--row-hover)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6, padding: 16 };
const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 };
const headingStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 };
const subStyle: React.CSSProperties = { fontSize: 11, color: "rgba(148,163,184,0.75)", marginBottom: 10 };
const tooltipStyle = { backgroundColor: "rgba(10,15,30,0.95)", border: "1px solid var(--hairline)", borderRadius: 8, fontSize: 12, color: "white" };
const CHART_COLORS = ["var(--cyan)", "var(--emerald)", "var(--amber)", "var(--red)", "var(--purple)", "#579bfc", "#ff007f", "#25F4EE"];

function KpiBox({ title, value, sub, icon, color, progress }: any) {
  const c = color.startsWith("#") ? color : `var(--${color})`;
  return (
    <div style={{ ...panelStyle, position: "relative", overflow: "hidden", paddingBottom: progress !== undefined ? 24 : 20 }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: 100, background: `radial-gradient(circle, ${c}15 0%, transparent 70%)`, transform: "translate(30%, -30%)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(148,163,184,0.6)", marginBottom: 8 }}>
        <div style={{ padding: 4, background: "var(--surface-hover)", borderRadius: 4, color: c }}>{icon}</div>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{title}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "white", marginBottom: 2, fontFamily: "'Orbitron',sans-serif" }}>{value}</div>
      <div style={{ fontSize: 10, color: "rgba(148,163,184,0.7)" }}>{sub}</div>
      {progress !== undefined && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "rgba(148,163,184,0.1)" }}><div style={{ height: "100%", width: `${Math.min(progress, 100)}%`, background: c, transition: "width 1s" }} /></div>}
    </div>
  );
}

function NoData({ msg = "Sin datos disponibles" }: { msg?: string }) {
  return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", gap: 12, padding: 20 }}><BarChart2 style={{ width: 32, height: 32, color: "rgba(148,163,184,0.1)" }} /><p style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>{msg}</p></div>;
}

function LoadingOverlay() {
  return <div style={{ position: "absolute", inset: 0, background: "rgba(10,15,30,0.6)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10, borderRadius: "inherit" }}><div style={{ width: 30, height: 30, border: "3px solid rgba(148,163,184,0.65)", borderTopColor: "var(--cyan)", borderRadius: "50%", animation: "spin 1s linear infinite" }} /><span style={{ marginTop: 10, fontSize: 11, color: "white", letterSpacing: "0.05em", textTransform: "uppercase" }}>Sincronizando Meta...</span></div>;
}

function TabButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 10, fontWeight: 600,
      background: active ? "rgba(0,212,255,0.08)" : "transparent",
      border: `1px solid ${active ? "rgba(0,212,255,0.2)" : "transparent"}`,
      color: active ? "var(--cyan)" : "rgba(148,163,184,0.75)",
      borderRadius: 4, cursor: "pointer", transition: "all 0.2s", letterSpacing: "0.03em",
    }}>{icon}{label}</button>
  );
}

function TimeToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "var(--row-hover)", borderRadius: 6, padding: 3 }}>
      {[{ k: "day", l: "Día" }, { k: "week", l: "Semana" }, { k: "month", l: "Mes" }].map(t => (
        <button key={t.k} onClick={() => onChange(t.k)} style={{
          padding: "4px 12px", fontSize: 10, fontWeight: 600, borderRadius: 4, border: "none", cursor: "pointer",
          background: value === t.k ? "rgba(0,212,255,0.12)" : "transparent",
          color: value === t.k ? "var(--cyan)" : "rgba(148,163,184,0.7)",
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
    };
  });
}

/* ═══ MAIN PAGE ═══ */
export default function ProjectDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<"resumen"|"gasto"|"audiencia"|"creativos"|"salud"|"ads"|"config"|"resultados"|"trafico">("resumen");
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
    fetch("/api/meta/pages").then(r => r.json()).then(d => { if (d.data) setMetaPages(d.data); }).catch(() => {});
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

  if (!project) return <div style={{ padding: 40, textAlign: "center", color: "rgba(148,163,184,0.75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 200 }}><div style={{ width: 40, height: 40, border: "3px solid rgba(148,163,184,0.1)", borderTopColor: "var(--cyan)", borderRadius: "50%", animation: "spin 1s linear infinite" }} /><span style={{ fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" }}>Cargando proyecto...</span></div>;

  const ch = project.channels.find(c => c.platformId === activePlatform);
  const budgetNum = ch ? parseBudget(ch.budget) : 0;
  const cprTarget = ch ? parseBudget(ch.cpr || "0") : 0;
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
      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => router.push("/dashboard/proyectos")} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,15,30,0.5)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, color: "rgba(148,163,184,0.7)", cursor: "pointer" }}><ArrowLeft style={{ width: 14, height: 14 }} /></button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, fontWeight: 700, color: "white", letterSpacing: "0.05em" }}>{project.alias}</h1>
              <span className={`badge badge-${STATUS_COLORS[project.status]}`}>{project.status}</span>
            </div>
            <p style={{ fontSize: 11, color: "rgba(148,163,184,0.6)" }}>{project.vertical}{project.client && ` · ${project.client}`}</p>
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6, borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: 8 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <TabButton active={activeTab === "resumen"} label="Resumen" icon={<BarChart2 style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("resumen")} />
          <TabButton active={activeTab === "gasto"} label="Gasto & Presupuesto" icon={<DollarSign style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("gasto")} />
          <TabButton active={activeTab === "audiencia"} label="Audiencia" icon={<Users style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("audiencia")} />
          <TabButton active={activeTab === "creativos"} label="Creativos" icon={<Palette style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("creativos")} />
          <TabButton active={activeTab === "salud"} label="Salud" icon={<HeartPulse style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("salud")} />
          <TabButton active={activeTab === "ads"} label="Ads Manager" icon={<Layers style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("ads")} />
          {(!!project.crmIntegrationIds?.length || !!project.crmIntegrationId || !!project.whatsapp?.length || !!project.instagram?.length || !!project.fanpage?.length) && (
            <TabButton active={activeTab === "resultados"} label="Análisis de Resultados" icon={<BarChart2 style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("resultados")} />
          )}
          {!!project.website && (
            <TabButton active={activeTab === "trafico"} label="Análisis de tráfico" icon={<Globe style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("trafico")} />
          )}
          <TabButton active={activeTab === "config"} label="Configuración" icon={<Settings style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("config")} />
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {project.channels.map(c => {
            const pl = PLATFORMS.find(p => p.id === c.platformId) || PLATFORMS[0];
            return <button key={c.platformId} onClick={() => { setActivePlatform(c.platformId); setBreakdownData({}); }} style={{ padding: "5px 12px", fontSize: 11, fontWeight: 600, background: activePlatform === c.platformId ? `${pl.color}15` : "transparent", border: `1px solid ${activePlatform === c.platformId ? pl.color : "transparent"}`, color: activePlatform === c.platformId ? pl.color : "rgba(148,163,184,0.75)", borderRadius: 4, cursor: "pointer" }}>{pl.name}</button>;
          })}
          {ch?.adAccounts && ch.adAccounts.length > 1 && (
            <select value={selectedAccountId} onChange={e => { setSelectedAccountId(e.target.value); setBreakdownData({}); }} style={{ background: "rgba(10,15,30,0.6)", border: "1px solid rgba(255,255,255,0.06)", color: "var(--foreground)", fontSize: 11, padding: "5px 24px 5px 8px", borderRadius: 4, cursor: "pointer", appearance: "none" }}>
              <option value="all">Todas ({ch.adAccounts.length})</option>
              {ch.adAccounts.map(a => <option key={a} value={a}>{accountNames[a] || a}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* ═══ TAB: RESUMEN ═══ */}
      {activeTab === "resumen" && (
        <ErrorBoundary name="Tab Resumen">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            {/* Proyeccion al Cierre */}
            <div style={panelStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div><h3 style={headingStyle}>Proyección al Cierre</h3><p style={subStyle}>Día {daysElapsed} de {daysInMonth} del mes{goalNum > 0 ? ` · Meta: ${fmtNum(goalNum)} resultados (${fmtMXN0(bk.monthly)} ÷ ${fmtMXN(cprTarget)})` : ""}</p></div>
                <div style={{ padding: "4px 12px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: trackStatus === "on-track" ? "rgba(0,200,117,0.1)" : trackStatus === "at-risk" ? "rgba(253,171,61,0.1)" : "rgba(226,68,92,0.1)", color: trackStatus === "on-track" ? "var(--emerald)" : trackStatus === "at-risk" ? "var(--amber)" : "var(--red)", border: `1px solid ${trackStatus === "on-track" ? "rgba(0,200,117,0.2)" : trackStatus === "at-risk" ? "rgba(253,171,61,0.2)" : "rgba(226,68,92,0.2)"}` }}>
                  {trackStatus === "on-track" ? "EN TRACK" : trackStatus === "at-risk" ? "EN RIESGO" : trackStatus === "off-track" ? "FUERA DE TRACK" : cprTarget <= 0 ? "FALTA CPR META" : "SIN OBJETIVO"}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div><p style={labelStyle}>Resultados proyectados</p><p style={{ fontSize: 18, fontWeight: 700, color: "white", fontFamily: "'Orbitron',sans-serif" }}>{fmtNum(projectedResults)}</p>{goalNum > 0 && <p style={{ fontSize: 10, color: "rgba(148,163,184,0.7)" }}>de {fmtNum(goalNum)} objetivo</p>}</div>
                <div><p style={labelStyle}>Gasto proyectado</p><p style={{ fontSize: 18, fontWeight: 700, color: "white", fontFamily: "'Orbitron',sans-serif" }}>{fmtMXN0(projectedSpend)}</p><p style={{ fontSize: 10, color: "rgba(148,163,184,0.7)" }}>de {fmtMXN0(bk.monthly)} mensual</p></div>
                <div><p style={labelStyle}>Meta diaria ideal</p><p style={{ fontSize: 18, fontWeight: 700, color: "var(--cyan)", fontFamily: "'Orbitron',sans-serif" }}>{goalBreakdown.daily > 0 ? goalBreakdown.daily.toFixed(1) : "—"}</p><p style={{ fontSize: 10, color: "rgba(148,163,184,0.7)" }}>resultados/día</p></div>
                <div><p style={labelStyle}>Ritmo diario necesario</p><p style={{ fontSize: 18, fontWeight: 700, color: dailyNeeded > 0 ? "var(--amber)" : "white", fontFamily: "'Orbitron',sans-serif" }}>{dailyNeeded > 0 ? fmtNum(dailyNeeded) : "—"}</p><p style={{ fontSize: 10, color: "rgba(148,163,184,0.7)" }}>resultados/día restantes</p></div>
                <div><p style={labelStyle}>Cumplimiento</p><p style={{ fontSize: 18, fontWeight: 700, color: goalCompletion >= 100 ? "var(--emerald)" : "white", fontFamily: "'Orbitron',sans-serif" }}>{goalNum > 0 ? pct(goalCompletion) : "—"}</p><p style={{ fontSize: 10, color: "rgba(148,163,184,0.7)" }}>{daysRemaining} días restantes</p></div>
              </div>
              {goalNum > 0 && <div style={{ marginTop: 16, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(goalCompletion, 100)}%`, background: trackStatus === "on-track" ? "var(--emerald)" : trackStatus === "at-risk" ? "var(--amber)" : "var(--red)", borderRadius: 3, transition: "width 0.5s" }} /></div>}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3" style={{ position: "relative" }}>
              {isLoading && <LoadingOverlay />}
              <div style={panelStyle}><h3 style={headingStyle}>Inversión vs Resultados</h3><p style={subStyle}>Gasto diario y volumen de conversiones</p>
                <div style={{ width: "100%", height: 250 }}>{timeSeriesData.length > 0 ? <ResponsiveContainer><ComposedChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <defs><linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--amber)" stopOpacity={0.3} /><stop offset="95%" stopColor="var(--amber)" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} /><XAxis dataKey="date" stroke="rgba(148,163,184,0.7)" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" angle={0} textAnchor="middle" /><YAxis yAxisId="left" stroke="rgba(148,163,184,0.7)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} /><YAxis yAxisId="right" orientation="right" stroke="rgba(148,163,184,0.7)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 10 }} /><Area yAxisId="left" type="monotone" dataKey="spend" name="Inversión" stroke="var(--amber)" strokeWidth={2} fillOpacity={1} fill="url(#gs)" /><Bar yAxisId="right" dataKey="results" name="Resultados" fill="var(--emerald)" radius={[3, 3, 0, 0]} barSize={6} />
                </ComposedChart></ResponsiveContainer> : <NoData />}</div>
              </div>
              <div style={panelStyle}><h3 style={headingStyle}>CTR vs CPC</h3><p style={subStyle}>Calidad de tráfico y costo por clic</p>
                <div style={{ width: "100%", height: 250 }}>{timeSeriesData.length > 0 ? <ResponsiveContainer><ComposedChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <defs><linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--purple)" stopOpacity={0.3} /><stop offset="95%" stopColor="var(--purple)" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} /><XAxis dataKey="date" stroke="rgba(148,163,184,0.7)" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" angle={0} textAnchor="middle" /><YAxis yAxisId="l" stroke="rgba(148,163,184,0.7)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} /><YAxis yAxisId="r" orientation="right" stroke="rgba(148,163,184,0.7)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 10 }} /><Area yAxisId="l" type="monotone" dataKey="ctr" name="CTR (%)" stroke="var(--purple)" strokeWidth={2} fillOpacity={1} fill="url(#gc)" /><Line yAxisId="r" type="monotone" dataKey="cpc" name="CPC ($)" stroke="var(--amber)" strokeWidth={2} dot={{ r: 3, fill: "rgba(10,15,30,1)" }} />
                </ComposedChart></ResponsiveContainer> : <NoData />}</div>
              </div>
            </div>
          </div>

          {/* Right: Accounts Panel */}
          <div className="space-y-3">
            <div style={panelStyle}>
              <h3 style={headingStyle}>Cuentas Vinculadas</h3>
              <p style={subStyle}>{ch?.adAccounts?.length || 0} cuentas seleccionadas</p>
              {ch?.adAccounts?.map(acc => (
                <div key={acc} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 4, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--emerald)" }} />
                  <div style={{ flex: 1 }}><p style={{ fontSize: 12, color: "var(--foreground)", fontWeight: 500 }}>{accountNames[acc] || acc}</p><p style={{ fontSize: 9, color: "var(--text-muted)" }}>{acc}</p></div>
                </div>
              ))}
            </div>
            <div style={panelStyle}>
              <h3 style={headingStyle}>Presupuesto Diario</h3>
              <p style={subStyle}>{bk.label}: {fmtMXN0(budgetNum)}</p>
              <div className="space-y-3">
                <div><p style={labelStyle}>Diario ideal</p><p style={{ fontSize: 16, fontWeight: 700, color: "var(--cyan)", fontFamily: "'Orbitron',sans-serif" }}>{fmtMXN(bk.daily)}</p></div>
                <div><p style={labelStyle}>Semanal ideal</p><p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{fmtMXN(bk.weekly)}</p></div>
                <div style={{ marginTop: 12, padding: "10px 12px", background: spendPace > 10 ? "rgba(226,68,92,0.08)" : spendPace < -10 ? "rgba(253,171,61,0.08)" : "rgba(0,200,117,0.08)", borderRadius: 4, border: `1px solid ${spendPace > 10 ? "rgba(226,68,92,0.15)" : spendPace < -10 ? "rgba(253,171,61,0.15)" : "rgba(0,200,117,0.15)"}` }}>
                  <p style={{ fontSize: 10, color: "rgba(148,163,184,0.75)", marginBottom: 4 }}>Ritmo de gasto</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: spendPace > 10 ? "var(--red)" : spendPace < -10 ? "var(--amber)" : "var(--emerald)" }}>
                    {spendPace > 10 ? `Adelantado +${pct(spendPace)}` : spendPace < -10 ? `Atrasado ${pct(spendPace)}` : "Al ritmo"}
                  </p>
                  <p style={{ fontSize: 10, color: "rgba(148,163,184,0.7)", marginTop: 2 }}>Ideal hoy: {fmtMXN(idealSpendToday)} | Real: {fmtMXN(totalSpend)}</p>
                </div>
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

          hourlyData.forEach((row: any) => {
            const hour = parseInt(row.hourly_stats_aggregated_by_audience_time_zone || "0", 10);
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
          let maxResults = 0;
          sortedDates.forEach(date => {
            for (let h = 0; h < 24; h++) {
              if (dateMap[date][h].results > maxResults) maxResults = dateMap[date][h].results;
            }
          });

          const getColor = (val: number) => {
            if (maxResults === 0 || val === 0) return "rgba(255,255,255,0.02)";
            const intensity = val / maxResults;
            if (intensity > 0.75) return "rgba(0,200,117,0.6)";
            if (intensity > 0.5) return "rgba(0,200,117,0.35)";
            if (intensity > 0.25) return "rgba(0,212,255,0.25)";
            if (intensity > 0.1) return "rgba(0,212,255,0.12)";
            return "var(--surface-hover)";
          };

          return (
            <div style={{ ...panelStyle, marginTop: 12 }}>
              <h3 style={headingStyle}>Distribución por Hora y Día</h3>
              <p style={subStyle}>Resultados por fecha y hora · Hover para ver gasto e impresiones</p>
              <div style={{ overflowX: "auto", maxHeight: 500, overflowY: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 700 }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                    <tr>
                      <th style={{ padding: "4px 8px", fontSize: 9, color: "rgba(148,163,184,0.75)", textAlign: "left", fontWeight: 600, width: 70, background: "var(--panel-bg)" }}></th>
                      {HOURS.map(h => (
                        <th key={h} style={{ padding: "4px 2px", fontSize: 8, color: "rgba(148,163,184,0.7)", textAlign: "center", fontWeight: 500, minWidth: 26, background: "var(--panel-bg)" }}>
                          {h.toString().padStart(2, "0")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDates.map((dateStr) => {
                      const dateLabel = formatDateLabel(dateStr);
                      const dt = new Date(dateStr + "T12:00:00");
                      const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
                      return (
                        <tr key={dateStr}>
                          <td style={{
                            padding: "4px 8px", fontSize: 9,
                            color: isWeekend ? "rgba(0,212,255,0.5)" : "rgba(148,163,184,0.6)",
                            fontWeight: 600, whiteSpace: "nowrap",
                            background: isWeekend ? "rgba(0,212,255,0.03)" : "transparent",
                          }}>
                            {dateLabel}
                          </td>
                          {HOURS.map(h => {
                            const cell = dateMap[dateStr][h];
                            return (
                              <td
                                key={h}
                                title={`${dateLabel} ${h.toString().padStart(2, "0")}:00\nResultados: ${fmtNum(cell.results)}\nGasto: ${fmtMXN(cell.spend)}\nImpresiones: ${fmtNum(cell.impressions)}`}
                                style={{ padding: 0, textAlign: "center" }}
                              >
                                <div style={{
                                  width: "100%", height: 22,
                                  background: getColor(cell.results),
                                  borderRadius: 2,
                                  margin: 1,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 8, color: cell.results > 0 ? "rgba(255,255,255,0.8)" : "transparent",
                                  fontWeight: 600,
                                  cursor: "default",
                                  transition: "background 0.15s, transform 0.1s",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.3)"; e.currentTarget.style.zIndex = "10"; e.currentTarget.style.position = "relative"; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.zIndex = "auto"; e.currentTarget.style.position = "static"; }}
                                >
                                  {cell.results > 0 ? (cell.results > 999 ? `${(cell.results / 1000).toFixed(1)}k` : cell.results) : ""}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Legend */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                <span style={{ fontSize: 8, color: "var(--text-muted)" }}>Menos</span>
                {["var(--surface-hover)", "rgba(0,212,255,0.12)", "rgba(0,212,255,0.25)", "rgba(0,200,117,0.35)", "rgba(0,200,117,0.6)"].map((c, i) => (
                  <div key={i} style={{ width: 14, height: 10, borderRadius: 2, background: c }} />
                ))}
                <span style={{ fontSize: 8, color: "var(--text-muted)" }}>Más</span>
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
            <div style={panelStyle}><p style={labelStyle}>Presupuesto {bk.label}</p><p style={{ fontSize: 20, fontWeight: 700, color: "white", fontFamily: "'Orbitron',sans-serif" }}>{fmtMXN0(budgetNum)}</p></div>
            <div style={panelStyle}><p style={labelStyle}>Diario ideal</p><p style={{ fontSize: 20, fontWeight: 700, color: "var(--cyan)", fontFamily: "'Orbitron',sans-serif" }}>{fmtMXN(bk.daily)}</p></div>
            <div style={panelStyle}><p style={labelStyle}>Gastado hoy</p><p style={{ fontSize: 20, fontWeight: 700, color: totalSpend > idealSpendToday * 1.1 ? "var(--red)" : "var(--emerald)", fontFamily: "'Orbitron',sans-serif" }}>{fmtMXN0(totalSpend)}</p><p style={{ fontSize: 10, color: "rgba(148,163,184,0.7)" }}>de {fmtMXN0(idealSpendToday)} ideal</p></div>
            <div style={panelStyle}><p style={labelStyle}>Restante</p><p style={{ fontSize: 20, fontWeight: 700, color: "white", fontFamily: "'Orbitron',sans-serif" }}>{fmtMXN0(Math.max(budgetNum - totalSpend, 0))}</p></div>
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

                const cellStyle: React.CSSProperties = { padding: "6px 8px", textAlign: "right", fontSize: 11, color: "var(--foreground)", borderBottom: "1px solid rgba(255,255,255,0.03)", whiteSpace: "nowrap" };
                const headerCellStyle: React.CSSProperties = { ...cellStyle, textAlign: "center", color: "white", fontWeight: 700, fontSize: 10, background: "var(--cyan)", borderBottom: "none" };
                const subHeaderStyle: React.CSSProperties = { ...cellStyle, textAlign: "center", color: "white", fontWeight: 600, fontSize: 9, background: "rgba(0,120,255,0.5)", borderBottom: "1px solid rgba(0,120,255,0.3)" };
                const labelCellStyle: React.CSSProperties = { ...cellStyle, textAlign: "left", fontWeight: 600, color: "rgba(255,255,255,0.9)", fontSize: 11, paddingLeft: 12, position: "sticky" as const, left: 0, background: "rgba(15,23,42,0.95)", borderRight: "1px solid rgba(255,255,255,0.1)", zIndex: 2 };
                const totalCellStyle: React.CSSProperties = { ...cellStyle, fontWeight: 700, background: "rgba(30,41,59,0.95)", borderRight: "1px solid rgba(255,255,255,0.05)", position: "sticky" as const, left: 0, zIndex: 2 };

                const metricRows = [
                  { label: "Presupuesto", total: fmtMXN0(totPresupuesto), values: cols.map(() => fmtMXN(bk.daily)), color: "var(--foreground)" },
                  { label: "Importe Gastado", total: fmtMXN0(totGastado), values: cols.map((c: any) => fmtMXN(c.spend)), color: "var(--amber)" },
                  { label: "%Gastado", total: pct(pctGastado), values: cols.map((c: any) => bk.daily > 0 ? pct((c.spend / bk.daily) * 100) : "—"), color: "var(--foreground)" },
                  { label: goalLabel(ch?.goal), total: fmtNum(totLeads), values: cols.map((c: any) => String(c.results || 0)), color: "var(--emerald)" },
                  { label: "Cumplimiento", total: goalNum > 0 ? pct(totCumplimiento) : "—", values: cols.map((c: any) => goalBreakdown.daily > 0 ? pct((c.results / goalBreakdown.daily) * 100) : "—"), color: "#c084fc" },
                  { label: CPR_MAP[ch?.goal || ""] || "CPR", total: fmtMXN(totCPL), values: cols.map((c: any) => c.results > 0 ? fmtMXN(c.spend / c.results) : "—"), color: "var(--cyan)" },
                  { label: `${CPR_MAP[ch?.goal || ""] || "CPR"} Objetivo`, total: cprTarget > 0 ? fmtMXN(cprTarget) : "—", values: cols.map(() => cprTarget > 0 ? fmtMXN(cprTarget) : "—"), color: "rgba(255,255,255,0.85)" },
                  { label: "Desvío", total: cprTarget > 0 ? `${desvioCPL > 0 ? "+" : ""}${desvioCPL.toFixed(1)}%` : "—", values: cols.map((c: any) => { if (!cprTarget || c.results === 0) return "—"; const d = ((c.spend / c.results) / cprTarget - 1) * 100; return `${d > 0 ? "+" : ""}${d.toFixed(1)}%`; }), color: "rgba(255,255,255,0.85)" },
                ];

                return (
                  <table style={{ borderCollapse: "collapse", fontSize: 11, minWidth: "100%" }}>
                    {/* Day names header */}
                    <thead>
                      <tr>
                        <th style={{ ...totalCellStyle, background: "rgba(30,41,59,0.95)", borderBottom: "none", minWidth: 100, textAlign: "left", fontSize: 10, color: "rgba(255,255,255,0.9)" }}>AL DÍA</th>
                        <th style={{ ...labelCellStyle, borderBottom: "none", minWidth: 120, fontSize: 10, color: "rgba(255,255,255,0.9)" }}>FECHA</th>
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
                        <td colSpan={2 + cols.length} style={{ padding: "8px 12px", fontWeight: 700, fontSize: 11, color: "var(--cyan)", background: "rgba(0,212,255,0.04)", borderBottom: "1px solid rgba(0,212,255,0.1)", letterSpacing: "0.05em" }}>
                          {project.alias?.toUpperCase() || "PROYECTO"}
                        </td>
                      </tr>
                      {metricRows.map((row, ri) => (
                        <tr key={ri} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.015)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ ...totalCellStyle, color: row.color, textAlign: "right", paddingRight: 12, minWidth: 100 }}>{row.total}</td>
                          <td style={labelCellStyle}>{row.label}</td>
                          {row.values.map((v: string, ci: number) => (
                            <td key={ci} style={{ ...cellStyle, color: row.color === "var(--foreground)" ? "rgba(148,163,184,0.6)" : row.color, fontWeight: v !== "—" && v !== "$0.00" && v !== "0" ? 500 : 400 }}>{v}</td>
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} /><XAxis dataKey="date" stroke="rgba(148,163,184,0.7)" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" angle={0} textAnchor="middle" />
                <YAxis stroke="rgba(148,163,184,0.7)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
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

          {/* Section header */}
          <div style={{ ...panelStyle, padding: "14px 18px", background: "linear-gradient(135deg, rgba(0,129,251,0.06), rgba(0,212,255,0.04))" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 4 }}>
              <Users style={{ width: 15, height: 15, display: "inline", verticalAlign: "middle", marginRight: 8, color: "var(--cyan)" }} />
              ¿A quién estás llegando?
            </h3>
            <p style={{ fontSize: 11, color: "rgba(148,163,184,0.6)", lineHeight: 1.5 }}>
              Demografía, ubicación geográfica, plataformas y horarios de tu audiencia. Datos basados en la inversión del periodo seleccionado.
            </p>
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
                  if (raw === undefined) return <NoData msg="Cargando..." />;
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
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                        <XAxis dataKey="age" stroke="rgba(148,163,184,0.7)" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="rgba(148,163,184,0.7)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
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
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
                        <XAxis type="number" stroke="rgba(148,163,184,0.7)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                        <YAxis type="category" dataKey="region" stroke="rgba(148,163,184,0.7)" fontSize={9} tickLine={false} axisLine={false} width={90} />
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
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
                        <XAxis type="number" stroke="rgba(148,163,184,0.7)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                        <YAxis type="category" dataKey="country" stroke="rgba(148,163,184,0.7)" fontSize={9} tickLine={false} axisLine={false} width={40} />
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
                  const d = raw.map((r: any) => ({
                    name: (r.publisher_platform || "otro").charAt(0).toUpperCase() + (r.publisher_platform || "otro").slice(1),
                    spend: Number(r.spend) || 0,
                    impressions: Number(r.impressions) || 0,
                    clicks: Number(r.clicks) || 0,
                  }));
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
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
                        <XAxis type="number" stroke="rgba(148,163,184,0.7)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                        <YAxis type="category" dataKey="placement" stroke="rgba(148,163,184,0.7)" fontSize={8} tickLine={false} axisLine={false} width={120} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => [name === "spend" ? fmtMXN(Number(v)) : Number(v).toLocaleString(), name === "spend" ? "Inversión" : name === "impressions" ? "Impresiones" : "Clicks"]} />
                        <Bar dataKey="spend" fill="#a25ddc" radius={[0, 4, 4, 0]} barSize={12} />
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
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                        <XAxis dataKey="hour" stroke="rgba(148,163,184,0.7)" fontSize={9} tickLine={false} axisLine={false} interval={1} />
                        <YAxis yAxisId="left" stroke="rgba(148,163,184,0.7)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
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
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 4 }}>
              <Palette style={{ width: 15, height: 15, display: "inline", verticalAlign: "middle", marginRight: 8, color: "#a25ddc" }} />
              Análisis de Creativos
            </h3>
            <p style={{ fontSize: 11, color: "rgba(148,163,184,0.6)", lineHeight: 1.5 }}>
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
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 10 }}>
                    {best.length > 0 ? best.map((ad) => (
                      <CreativeCard key={ad.adId} ad={ad} fmtMXN={fmtMXN} cprTarget={cprTarget} onPreview={() => setPreviewAd(ad)} />
                    )) : <NoData msg="Sin anuncios con resultados" />}
                  </div>
                </div>
                {/* Worst */}
                <div style={panelStyle}>
                  <h3 style={headingStyle}><TrendingDown style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6, color: "var(--red)" }} />Top 3 Peores Anuncios</h3>
                  <p style={subStyle}>Mayor gasto sin resultados o CPR más alto</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 10 }}>
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
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <th style={{ padding: "8px 6px", textAlign: "left", color: "rgba(148,163,184,0.75)", fontWeight: 600, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>#</th>
                      <th style={{ padding: "8px 6px", textAlign: "left", color: "rgba(148,163,184,0.75)", fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>Anuncio</th>
                      <th style={{ padding: "8px 6px", textAlign: "left", color: "rgba(148,163,184,0.75)", fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>Estado</th>
                      <th style={{ padding: "8px 6px", textAlign: "right", color: "rgba(148,163,184,0.75)", fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>Inversión</th>
                      <th style={{ padding: "8px 6px", textAlign: "right", color: "rgba(148,163,184,0.75)", fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>Result.</th>
                      <th style={{ padding: "8px 6px", textAlign: "right", color: "rgba(148,163,184,0.75)", fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>CPR</th>
                      <th style={{ padding: "8px 6px", textAlign: "right", color: "rgba(148,163,184,0.75)", fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>CTR</th>
                      <th style={{ padding: "8px 6px", textAlign: "right", color: "rgba(148,163,184,0.75)", fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>Impr.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adCreatives.filter(a => a.spend > 0).slice(0, 30).map((ad: any, i: number) => {
                      const ra = findResultAction(ad.actions, ch?.goal);
                      const results = ra ? parseInt(ra.value, 10) : 0;
                      const cprVal = results > 0 ? ad.spend / results : 0;
                      const ctrVal = ad.ctr || (ad.clicks > 0 && ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0);
                      return (
                        <tr key={ad.adId || i} style={{ borderBottom: "1px solid rgba(255,255,255,0.025)", transition: "background 0.15s", cursor: "pointer" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          onClick={() => { const ra2 = findResultAction(ad.actions, ch?.goal); setPreviewAd({ ...ad, results, cprVal, ctrVal }); }}>
                          <td style={{ padding: "8px 6px", color: "var(--text-muted)", fontSize: 10 }}>{i + 1}</td>
                          <td style={{ padding: "8px 6px", maxWidth: 250 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 40, height: 40, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: "var(--surface-hover)", position: "relative" }}>
                                {ad.thumbnailUrl
                                  ? <img src={ad.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Eye style={{ width: 14, height: 14, color: "rgba(148,163,184,0.15)" }} /></div>
                                }
                                {ad.format === "video" && <span style={{ position: "absolute", bottom: 1, right: 1, fontSize: 7, background: "rgba(162,93,220,0.8)", color: "white", padding: "0 3px", borderRadius: 2, fontWeight: 700 }}>▶</span>}
                                {ad.format === "carousel" && <span style={{ position: "absolute", bottom: 1, right: 1, fontSize: 7, background: "rgba(253,171,61,0.8)", color: "white", padding: "0 3px", borderRadius: 2, fontWeight: 700 }}>⟡</span>}
                              </div>
                              <span style={{ color: "var(--foreground)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.adName}</span>
                            </div>
                          </td>
                          <td style={{ padding: "8px 6px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <span style={{ width: 5, height: 5, borderRadius: "50%", background: ad.status === "ACTIVE" ? "var(--emerald)" : ad.status === "PAUSED" ? "var(--amber)" : "rgba(148,163,184,0.65)" }} />
                              <span style={{ fontSize: 9, color: "rgba(148,163,184,0.75)" }}>{ad.status === "ACTIVE" ? "Activo" : ad.status === "PAUSED" ? "Pausado" : ad.status}</span>
                            </span>
                          </td>
                          <td style={{ padding: "8px 6px", textAlign: "right", color: "var(--amber)", fontWeight: 600 }}>{fmtMXN(ad.spend)}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right", color: "var(--emerald)", fontWeight: 700 }}>{results}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right", color: results === 0 ? "var(--red)" : cprTarget > 0 && cprVal > cprTarget ? "var(--red)" : "var(--cyan)", fontWeight: 600 }}>{results > 0 ? fmtMXN(cprVal) : "—"}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right", color: "rgba(148,163,184,0.7)" }}>{ctrVal.toFixed(2)}%</td>
                          <td style={{ padding: "8px 6px", textAlign: "right", color: "rgba(148,163,184,0.75)" }}>{fmtNum(ad.impressions || 0)}</td>
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
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.025)" }}>
                            <span style={{ width: 22, height: 22, borderRadius: 4, background: `${CHART_COLORS[i]}20`, color: CHART_COLORS[i], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 12, color: "var(--foreground)", lineHeight: 1.4, wordBreak: "break-word" }} title={d.text}>
                                {d.text.length > 80 ? d.text.slice(0, 80) + "..." : d.text}
                              </p>
                              <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 10, color: "var(--amber)" }}>{fmtMXN(d.spend)}</span>
                                <span style={{ fontSize: 10, color: "var(--emerald)" }}>{Math.round(d.results)} result.</span>
                                <span style={{ fontSize: 10, color: "var(--cyan)" }}>{d.results > 0 ? fmtMXN(d.spend / d.results) : "—"} CPR</span>
                                <span style={{ fontSize: 10, color: "rgba(148,163,184,0.7)" }}>{d.count} anuncios</span>
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
                  const formatColors = ["var(--cyan)", "#a25ddc", "var(--amber)", "var(--emerald)"];
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
                    <div key={fmt} style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6, padding: "10px 12px" }}>
                      <p style={{ fontSize: 10, color: "rgba(148,163,184,0.7)", textTransform: "uppercase", marginBottom: 4 }}>{fmt}</p>
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
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
                        <XAxis type="number" stroke="rgba(148,163,184,0.7)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(1)}%`} />
                        <YAxis type="category" dataKey="name" stroke="rgba(148,163,184,0.7)" fontSize={8} tickLine={false} axisLine={false} width={140} />
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
          <div style={panelStyle}>
            <h3 style={headingStyle}><Zap style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6, color: "var(--amber)" }} />Combinación Ganadora</h3>
            <p style={subStyle}>Campaña y conjunto con mejor rendimiento</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(() => {
                const top = (insights?.campaigns || []).map((c: any) => { const s = parseFloat(c.spend || "0"); const ra = findResultAction(c.actions, ch?.goal); const r = ra ? parseInt(ra.value, 10) : 0; return { name: c.campaign_name || "?", results: r, cpa: r > 0 ? s / r : 0, spend: s }; }).sort((a: any, b: any) => b.spend - a.spend)[0];
                return top ? <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6, padding: 16 }}><p style={labelStyle}>Campaña Ganadora</p><p style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 8 }}>{top.name}</p><div style={{ display: "flex", gap: 16, fontSize: 12 }}><span><span style={{ color: "rgba(148,163,184,0.75)" }}>Resultados: </span><span style={{ color: "var(--emerald)", fontWeight: 600 }}>{top.results}</span></span><span><span style={{ color: "rgba(148,163,184,0.75)" }}>CPA: </span><span style={{ color: "var(--cyan)", fontWeight: 600 }}>{fmtMXN(top.cpa)}</span></span></div></div> : <div style={{ padding: 16, color: "var(--text-muted)", fontSize: 12 }}>Sin datos</div>;
              })()}
              {(() => {
                const top = (insights?.adsets || []).map((a: any) => { const s = parseFloat(a.spend || "0"); const ra = findResultAction(a.actions, ch?.goal); const r = ra ? parseInt(ra.value, 10) : 0; return { name: a.adset_name || "?", results: r, cpa: r > 0 ? s / r : 0, spend: s }; }).sort((a: any, b: any) => b.spend - a.spend)[0];
                return top ? <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6, padding: 16 }}><p style={labelStyle}>Adset Ganador</p><p style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 8 }}>{top.name}</p><div style={{ display: "flex", gap: 16, fontSize: 12 }}><span><span style={{ color: "rgba(148,163,184,0.75)" }}>Resultados: </span><span style={{ color: "var(--emerald)", fontWeight: 600 }}>{top.results}</span></span><span><span style={{ color: "rgba(148,163,184,0.75)" }}>CPA: </span><span style={{ color: "var(--cyan)", fontWeight: 600 }}>{fmtMXN(top.cpa)}</span></span></div></div> : <div style={{ padding: 16, color: "var(--text-muted)", fontSize: 12 }}>Sin datos</div>;
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
                      <p style={{ fontSize: 11, color: "rgba(148,163,184,0.7)" }}>Estado general de la campaña</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                         <div style={{ width: 12, height: 12, borderRadius: "50%", background: healthColor, boxShadow: `0 0 10px ${healthColor}` }} />
                         <span style={{ fontSize: 16, fontWeight: 700, color: "white", textTransform: "uppercase" }}>{healthLabel}</span>
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
                        <span style={{ fontSize: 24, fontWeight: 800, color: healthColor, fontFamily: "'Orbitron',sans-serif", lineHeight: 1 }}>{healthScore}</span>
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
                          <span style={{ fontSize: 42, fontWeight: 800, color: "white", fontFamily: "'Orbitron',sans-serif" }}>{indicators[0].value}</span>
                          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{indicators[0].bench}</span>
                       </div>
                    </div>
                    <div style={{ zIndex: 2, textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                       <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Score de Eficiencia</span>
                       <span style={{ fontSize: 32, fontWeight: 800, color: indicators[0].color, fontFamily: "'Orbitron',sans-serif" }}>{indicators[0].score}</span>
                       <div style={{ width: 100, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
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
                          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(148,163,184,0.8)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{step.step}</span>
                          <div style={{ color: step.color, padding: 4, background: `${step.color}15`, borderRadius: 6 }}>
                            {step.icon}
                          </div>
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "white", marginBottom: 4 }}>{step.name}</p>
                        <div style={{ fontSize: 24, fontWeight: 700, color: "white", fontFamily: "'Orbitron',sans-serif", marginBottom: 8 }}>
                          {step.value}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 10, color: "rgba(148,163,184,0.6)" }}>{step.bench}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: step.color, fontFamily: "'Orbitron',sans-serif" }}>{step.score}</span>
                        </div>
                        <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
                          <div style={{ height: "100%", width: `${step.score}%`, background: step.color, borderRadius: 2 }} />
                        </div>
                        <p style={{ fontSize: 10, color: "rgba(148,163,184,0.5)", lineHeight: 1.4 }}>{step.desc}</p>
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
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                            <XAxis dataKey="date" stroke="rgba(148,163,184,0.7)" fontSize={9} tickLine={false} axisLine={false} />
                            <YAxis stroke="rgba(148,163,184,0.7)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} />
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
                border: "1px solid rgba(255, 255, 255, 0.06)",
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


      {/* ═══ TAB: ANÁLISIS DE RESULTADOS (Métricas del Bot, acotado al proyecto) ═══ */}
      {activeTab === "resultados" && (
        <ErrorBoundary name="Tab Análisis de Resultados">
          <div style={{ height: "calc(100vh - 180px)", margin: "8px 0 0", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
            <BotAnalyticsDashboard projectId={project.id} embedded />
          </div>
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
          <div style={panelStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={headingStyle}>Información General</h3>
              {!isEditing ? <button onClick={() => setIsEditing(true)} style={{ background: "none", border: "none", color: "rgba(148,163,184,0.6)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}><Edit3 style={{ width: 14, height: 14 }} /> Editar</button>
                : <div style={{ display: "flex", gap: 8 }}><button onClick={() => { setIsEditing(false); setEditForm(project); }} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer" }}><X style={{ width: 14, height: 14 }} /></button><button onClick={saveChanges} style={{ background: "none", border: "none", color: "var(--emerald)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}><Save style={{ width: 14, height: 14 }} /> Guardar</button></div>}
            </div>
            <div className="space-y-4">
              {([
                { label: "Alias", key: "alias" }, { label: "Cliente", key: "client" },
                { label: "Vertical", key: "vertical" }, { label: "Website", key: "website" },
                { label: "Buyer Persona", key: "persona" }, { label: "Geo Target", key: "geo" },
              ] as const).map(f => (
                <div key={f.key}>
                  <p style={labelStyle}>{f.label}</p>
                  {isEditing ? <input value={(editForm as any)[f.key] || ""} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} style={{ width: "100%", background: "var(--surface-hover)", border: "1px solid rgba(0,212,255,0.15)", color: "white", fontSize: 12, padding: "6px 10px", borderRadius: 4, outline: "none" }} />
                    : <p style={{ fontSize: 13, color: "var(--foreground)" }}>{(project as any)[f.key] || "—"}</p>}
                </div>
              ))}
              <div>
                <p style={labelStyle}>Estado</p>
                {isEditing ? <select value={editForm.status || project.status} onChange={e => setEditForm({ ...editForm, status: e.target.value as any })} style={{ width: "100%", background: "var(--surface-hover)", border: "1px solid rgba(255,255,255,0.06)", color: "white", fontSize: 12, padding: "6px 10px", borderRadius: 4, cursor: "pointer" }}>
                  <option value="Activo">Activo</option><option value="Pausado">Pausado</option><option value="Draft">Draft</option><option value="Completado">Completado</option></select>
                  : <span className={`badge badge-${STATUS_COLORS[project.status]}`}>{project.status}</span>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p style={labelStyle}>Fecha Inicio</p>{isEditing ? <input type="date" value={editForm.dateStart || ""} onChange={e => setEditForm({ ...editForm, dateStart: e.target.value })} style={{ width: "100%", background: "var(--surface-hover)", border: "1px solid rgba(255,255,255,0.06)", color: "var(--foreground)", fontSize: 11, padding: "6px", borderRadius: 4 }} /> : <p style={{ fontSize: 12, color: "var(--foreground)" }}>{project.dateStart ? new Date(project.dateStart).toLocaleDateString() : "—"}</p>}</div>
                <div><p style={labelStyle}>Fecha Fin</p>{isEditing ? <input type="date" value={editForm.dateEnd || ""} onChange={e => setEditForm({ ...editForm, dateEnd: e.target.value })} style={{ width: "100%", background: "var(--surface-hover)", border: "1px solid rgba(255,255,255,0.06)", color: "var(--foreground)", fontSize: 11, padding: "6px", borderRadius: 4 }} /> : <p style={{ fontSize: 12, color: "var(--foreground)" }}>{project.dateEnd ? new Date(project.dateEnd).toLocaleDateString() : "—"}</p>}</div>
              </div>
              <div>
                <p style={labelStyle}>Plataforma del bot (Análisis de Resultados)</p>
                {(() => {
                  const CRM_PROVIDERS = ["botmaker", "cari", "custom_crm", "hubspot"];
                  // Solo botmaker/cari/cari_ai alimentan Análisis de Resultados; el resto
                  // (custom_crm/hubspot) se conserva pero se marca como NO compatible.
                  const crmLabel = (p: string) => {
                    const base = p === "botmaker" ? "Botmaker" : p === "cari" ? "Cari AI" : p === "custom_crm" ? "CRM Custom (vía API)" : p;
                    return normalizeIntegrationProvider(p) ? base : `${base} — no compatible con Análisis de Resultados`;
                  };
                  const crmOptions = activeIntegrations.filter(i => CRM_PROVIDERS.includes(i.provider));
                  // Una sola plataforma de bot por proyecto: el análisis ahora se acota a
                  // los canales de Botmaker del proyecto, así que la multi-selección dejó
                  // de tener sentido. Se conserva crmIntegrationIds (1 elemento) por compat.
                  const selectedId = (editForm.crmIntegrationIds && editForm.crmIntegrationIds[0])
                    || editForm.crmIntegrationId || "";
                  if (isEditing) {
                    return (
                      <>
                        <select
                          value={selectedId}
                          onChange={e => {
                            const sel = e.target.value;
                            const intg = activeIntegrations.find(a => a.id === sel);
                            setEditForm(prev => ({
                              ...prev,
                              crmIntegrationId: sel || null,
                              crmIntegrationIds: sel ? [sel] : [],
                              crmType: intg ? intg.provider : null,
                            }));
                          }}
                          style={{ width: "100%", background: "var(--surface-hover)", border: "1px solid rgba(0,212,255,0.15)", color: "white", fontSize: 12, padding: "6px 10px", borderRadius: 4, cursor: "pointer", appearance: "auto" }}
                        >
                          <option value="">Ninguna</option>
                          {crmOptions.map(i => <option key={i.id} value={i.id}>{crmLabel(i.provider)}</option>)}
                        </select>
                        {crmOptions.length === 0 && <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Conecta Botmaker o Cari AI en Integraciones primero.</p>}
                      </>
                    );
                  }
                  const currentId = (project.crmIntegrationIds && project.crmIntegrationIds[0])
                    || project.crmIntegrationId || "";
                  const cur = currentId ? activeIntegrations.find(a => a.id === currentId) : null;
                  return (
                    <p style={{ fontSize: 13, color: currentId ? "var(--cyan)" : "var(--foreground)" }}>
                      {currentId ? (cur ? crmLabel(cur.provider) : "Conectado") : "—"}
                    </p>
                  );
                })()}
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
                      <div><p style={labelStyle}>Presupuesto</p><input value={editForm.channels?.[i]?.budget || c.budget} onChange={e => { const ch2 = [...(editForm.channels || project.channels)]; ch2[i] = { ...ch2[i], budget: e.target.value }; setEditForm({ ...editForm, channels: ch2 }); }} style={{ width: "100%", background: "var(--surface-hover)", border: "1px solid rgba(0,212,255,0.15)", color: "white", fontSize: 12, padding: "6px 10px", borderRadius: 4 }} /></div>
                      <div><p style={labelStyle}>Período</p><select value={editForm.channels?.[i]?.period || c.period} onChange={e => { const ch2 = [...(editForm.channels || project.channels)]; ch2[i] = { ...ch2[i], period: e.target.value }; setEditForm({ ...editForm, channels: ch2 }); }} style={{ width: "100%", background: "var(--surface-hover)", border: "1px solid rgba(255,255,255,0.06)", color: "white", fontSize: 12, padding: "6px 10px", borderRadius: 4, cursor: "pointer" }}><option value="Diario">Diario</option><option value="Semanal">Semanal</option><option value="Mensual">Mensual</option><option value="Anual">Anual</option></select></div>
                      <div><p style={labelStyle}>Objetivo</p><input value={editForm.channels?.[i]?.goal || c.goal} onChange={e => { const ch2 = [...(editForm.channels || project.channels)]; ch2[i] = { ...ch2[i], goal: e.target.value }; setEditForm({ ...editForm, channels: ch2 }); }} style={{ width: "100%", background: "var(--surface-hover)", border: "1px solid rgba(255,255,255,0.06)", color: "white", fontSize: 12, padding: "6px 10px", borderRadius: 4 }} /></div>
                      <div><p style={labelStyle}>CPR Meta</p><input value={editForm.channels?.[i]?.cpr || c.cpr} onChange={e => { const ch2 = [...(editForm.channels || project.channels)]; ch2[i] = { ...ch2[i], cpr: e.target.value }; setEditForm({ ...editForm, channels: ch2 }); }} style={{ width: "100%", background: "var(--surface-hover)", border: "1px solid rgba(255,255,255,0.06)", color: "white", fontSize: 12, padding: "6px 10px", borderRadius: 4 }} /></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-y-3 gap-x-6" style={{ fontSize: 12 }}>
                      <div><span style={{ color: "rgba(148,163,184,0.75)" }}>Presupuesto:</span> <span style={{ color: "white", fontWeight: 600 }}>{c.budget || "—"}</span></div>
                      <div><span style={{ color: "rgba(148,163,184,0.75)" }}>Período:</span> <span style={{ color: "white" }}>{c.period || "—"}</span></div>
                      <div><span style={{ color: "rgba(148,163,184,0.75)" }}>Objetivo:</span> <span style={{ color: "var(--emerald)", fontWeight: 600 }}>{c.goal || "—"}</span></div>
                      <div><span style={{ color: "rgba(148,163,184,0.75)" }}>CPR Meta:</span> <span style={{ color: "var(--cyan)", fontWeight: 600 }}>{c.cpr || "—"}</span></div>
                      <div><span style={{ color: "rgba(148,163,184,0.75)" }}>Diario ideal:</span> <span style={{ color: "white" }}>{fmtMXN(bk2.daily)}</span></div>
                      <div><span style={{ color: "rgba(148,163,184,0.75)" }}>Cuentas:</span> <span style={{ color: "white" }}>{c.adAccounts?.length || 0}</span></div>
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
