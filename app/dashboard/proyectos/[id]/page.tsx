"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Calendar, DollarSign, Target, Eye, TrendingUp, TrendingDown, Filter,
  BarChart2, Activity, Zap, CreditCard, CheckCircle, Clock, Edit3, Save, X,
  Users, Palette, Settings, ChevronDown, ChevronUp, AlertTriangle,
  Layers, Monitor, Smartphone, Globe, PieChart as PieIcon,
  HeartPulse, RefreshCw, MousePointer, Shield,
  Tag, Building, MapPin, Link, ShieldCheck, Plus
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

/* �" �" �"  DASHBOARD GRID SYSTEM �" �" �"  */
import { DashboardGrid, type WidgetDefinition } from "@/components/projects/DashboardGrid";
import { useDashboardLayoutStore } from "@/stores/dashboardLayoutStore";
import { ProyeccionWidget } from "@/components/projects/widgets/ProyeccionWidget";
import { InversionChartWidget, CtrCpcChartWidget } from "@/components/projects/widgets/ChartWidgets";
import { CuentasWidget, PresupuestoWidget } from "@/components/projects/widgets/SidebarWidgets";
import { HeatmapWidget } from "@/components/projects/widgets/HeatmapWidget";
import { AlertasGastoWidget, BudgetCardsWidget } from "@/components/projects/widgets/GastoWidgets";
import { GastoSpendTableInline, GastoCurvaWidget } from "@/components/projects/widgets/GastoSpendTableInline";

import { DynamicComposedChartWidget, DynamicKpiCardWidget, type DynamicChartConfig, type DynamicKpiConfig } from "@/components/projects/widgets/DynamicWidgetTemplates";
import { WidgetBuilderModal, type WidgetType } from "@/components/projects/WidgetBuilderModal";

/* �" �" �"  TYPES �" �" �"  */
interface ChannelConfig { platformId: string; platformName: string; adAccounts: string[]; budget: string; period: string; goal: string; cpr: string; monthlyOverrides?: Record<string, { budget?: string; cpr?: string; goal?: string }>; }
interface Project { id: string; alias: string; client: string; vertical: string; fanpage: string[]; instagram: string[]; whatsapp: string[]; website: string; channels: ChannelConfig[]; dateStart: string; dateEnd: string; persona: string; geo: string; status: "Activo"|"Pausado"|"Draft"|"Completado"|"EN VUELO"|"EN �RBITA"; createdAt: string; crmIntegrationId?: string | null; crmType?: string | null; crmIntegrationIds?: string[]; googleSources?: { adsCustomerId?: string; ga4PropertyId?: string; gtmAccountId?: string; gtmContainerId?: string; } | null; }


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
// Goal �  Meta action_type mapping
const GOAL_ACTION_MAP: Record<string, string[]> = {
  "Conversaciones (WhatsApp / Messenger)": [
    "onsite_conversion.messaging_conversation_started_7d",
    "messaging_conversation_started_7d",
    "onsite_conversion.messaging_first_reply"
  ],
  "Leads (Formulario Meta)": ["onsite_conversion.flow_complete", "lead", "leadgen", "leadgen_grouped", "onsite_conversion.lead_grouped", "onsite_conversion.lead", "omni_lead"],
  "Leads (Sitio Web / Pixel)": ["offsite_conversion.fb_pixel_lead", "lead", "omni_lead"],
  "Leads (Todas las fuentes)": ["onsite_conversion.flow_complete", "lead", "leadgen", "leadgen_grouped", "omni_lead", "offsite_conversion.fb_pixel_lead", "onsite_conversion.lead_grouped", "onsite_conversion.lead"],
  "Ventas (Sitio Web)": ["offsite_conversion.fb_pixel_purchase"],
  "Ventas (Todas las fuentes)": ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"],
  
  // Legacy goals
  "Conversaciones": ["onsite_conversion.messaging_conversation_started_7d", "messaging_conversation_started_7d", "onsite_conversion.messaging_first_reply"],
  "Leads": ["onsite_conversion.flow_complete", "lead", "leadgen_grouped", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead", "omni_lead"],
  "Ventas (Purchase)": ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"],
  "Registros": ["complete_registration", "omni_complete_registration", "offsite_conversion.fb_pixel_complete_registration"],
  "Clics al sitio": ["link_click", "landing_page_view"],
  "Descargas app": ["app_install", "omni_app_install"],
  "Video views": ["video_view"],
  "Alcance (Reach)": ["reach"],
  "Seguidores": ["page_engagement", "like"],
  "Tráfico a tienda": ["store_visit"],
};

const NATIVE_OBJECTIVE_MAP: Record<string, string[]> = {
  "OUTCOME_LEADS": ["onsite_conversion.flow_complete", "lead", "leadgen", "leadgen_grouped", "omni_lead", "offsite_conversion.fb_pixel_lead", "onsite_conversion.lead_grouped", "onsite_conversion.lead"],
  "LEAD_GENERATION": ["onsite_conversion.flow_complete", "lead", "leadgen", "leadgen_grouped", "omni_lead", "offsite_conversion.fb_pixel_lead", "onsite_conversion.lead_grouped", "onsite_conversion.lead"],
  "OUTCOME_ENGAGEMENT": ["onsite_conversion.messaging_conversation_started_7d", "messaging_conversation_started_7d", "onsite_conversion.messaging_first_reply", "post_engagement", "page_engagement"],
  "MESSAGES": ["onsite_conversion.messaging_conversation_started_7d", "messaging_conversation_started_7d", "onsite_conversion.messaging_first_reply"],
  "VIDEO_VIEWS": ["video_view"],
  "OUTCOME_AWARENESS": ["reach", "brand_awareness", "video_view"],
  "OUTCOME_TRAFFIC": ["link_click", "landing_page_view"],
  "LINK_CLICKS": ["link_click", "landing_page_view"],
  "OUTCOME_SALES": ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"],
  "CONVERSIONS": ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase", "lead"],
  "OUTCOME_APP_PROMOTION": ["app_install", "omni_app_install"]
};

const RESULT_TYPES_FALLBACK = ['onsite_conversion.messaging_conversation_started_7d','messaging_conversation_started_7d','onsite_conversion.messaging_first_reply','onsite_conversion.flow_complete','lead','purchase','complete_registration','omni_purchase','offsite_conversion','onsite_conversion','app_install','landing_page_view','link_click'];

const getObjective = (entity: any, insights: any) => {
  if (!entity) return null;
  if (entity.objective) return entity.objective;
  if (entity.campaign_id && insights?.campaigns) {
    const c = insights.campaigns.find((c: any) => c.campaign_id === entity.campaign_id);
    if (c?.objective) return c.objective;
  }
  return null;
};

const findResultAction = (actions: any[] | undefined, goal?: string, objective?: string) => {
  if (!actions?.length) return null;
  
  if (objective && NATIVE_OBJECTIVE_MAP[objective]) {
    for (const t of NATIVE_OBJECTIVE_MAP[objective]) {
      const exact = actions.find((a: any) => a.action_type === t);
      if (exact) return exact;
    }
  }

  // 1. If we know the goal AND it has a specific map, use ONLY those types
  if (goal && GOAL_ACTION_MAP[goal]) {
    for (const t of GOAL_ACTION_MAP[goal]) {
      const exact = actions.find((a: any) => a.action_type === t);
      if (exact) return exact;
    }
    // Goal has explicit map but no matching action found � return null (0 results)
    // NEVER fall through to generic fallback, which would pick page_engagement/link_click
    return null;
  }
  // 2. No explicit goal: try common result types (more specific first)
  for (const t of RESULT_TYPES_FALLBACK) {
    const exact = actions.find((a: any) => a.action_type === t);
    if (exact) return exact;
  }
  // 3. Last resort when no goal: substring match
  for (const t of RESULT_TYPES_FALLBACK) {
    const partial = actions.find((a: any) => a.action_type?.includes(t));
    if (partial) return partial;
  }
  return null;
};
const parseBudget = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
const parseGoal = (s: string) => { const m = s.match(/(\d[\d,]*)/); return m ? parseInt(m[1].replace(/,/g, ""), 10) : 0; };
const fmtMXN = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
const fmtMXN0 = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat('es-MX').format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

/* ─── HELPERS ─── */
function getTimeFilterMetrics(preset: string, start: string, end: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let totalDays = 30.416;
  let elapsedDays = 30.416;
  let isPast = false;
  let viewedMonthStr = "";

  if (start && end) {
    const s = new Date(start);
    const e = new Date(end);
    totalDays = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    if (e < today) {
      isPast = true;
      elapsedDays = totalDays;
    } else {
      elapsedDays = Math.max(1, Math.ceil((today.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
      if (elapsedDays > totalDays) elapsedDays = totalDays;
    }
    if (s.getDate() === 1) {
      viewedMonthStr = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}`;
    }
  } else {
    if (preset === "this_month" || !preset) {
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      totalDays = daysInMonth;
      elapsedDays = today.getDate();
      viewedMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    } else if (preset === "last_month") {
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      totalDays = lastMonth.getDate();
      elapsedDays = totalDays;
      isPast = true;
      viewedMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
    } else if (preset === "today") {
      totalDays = 1;
      elapsedDays = 1;
    } else if (preset === "yesterday") {
      totalDays = 1;
      elapsedDays = 1;
      isPast = true;
    } else if (preset === "last_7d") {
      totalDays = 7;
      elapsedDays = 7;
      isPast = true; 
    } else if (preset === "last_14d") {
      totalDays = 14;
      elapsedDays = 14;
      isPast = true;
    } else if (preset === "last_30d") {
      totalDays = 30;
      elapsedDays = 30;
      isPast = true;
    } else if (preset === "this_year") {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      totalDays = Math.ceil((endOfYear.getTime() - startOfYear.getTime()) / (1000*60*60*24)) + 1;
      elapsedDays = Math.max(1, Math.ceil((today.getTime() - startOfYear.getTime()) / (1000*60*60*24)));
    } else if (preset === "maximum") {
      totalDays = 365;
      elapsedDays = 365;
      isPast = true;
    }
  }
  return { totalDays, elapsedDays, isPast, viewedMonthStr };
}

function getBudgetBreakdown(budget: number, period: string) {
  const daysInMonth = 30.416;
  switch (period.toLowerCase()) {
    case "mensual": case "mes": return { daily: budget / daysInMonth, weekly: (budget / daysInMonth) * 7, monthly: budget, label: "Mensual" };
    case "semanal": case "semana": return { daily: budget / 7, weekly: budget, monthly: budget * 4.33, label: "Semanal" };
    case "anual": case "año": return { daily: budget / 365, weekly: budget / 52, monthly: budget / 12, label: "Anual" };
    case "diario": case "dia": case "día": return { daily: budget, weekly: budget * 7, monthly: budget * daysInMonth, label: "Diario" };
    default: return { daily: budget / daysInMonth, weekly: (budget / daysInMonth) * 7, monthly: budget, label: period || "Mensual" };
  }
}

/* """ SHARED UI """ */
const panelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "100%",
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

/* �"��"��"� DB �  Frontend Channel Mapper �"��"��"� */
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

function getGroupForTab(tab: string) {
  if (["resumen", "gasto", "trafico", "historial"].includes(tab)) return "Analítica";
  if (["audiencia", "creativos", "salud", "confiabilidad"].includes(tab)) return "Optimización";
  if (["ads", "config"].includes(tab)) return "Configuración";
  return "Analítica";
}

/* ─── MAIN PAGE ─── */
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
  const [audienceMetric, setAudienceMetric] = useState<"spend" | "impressions" | "clicks">("impressions");
  const [editingMonth, setEditingMonth] = useState<string>("global"); // "global" or "YYYY-MM"
  const [isWidgetBuilderOpen, setIsWidgetBuilderOpen] = useState(false);

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
      if (d.data) { const n: Record<string, string> = {}; d.data.forEach((a: any) => { n[a.id] = a.name?.split(" � ")[0] || a.id; }); setAccountNames(n); }
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

  // Load insights � cache-first with background revalidation
  const insightsStore = useInsightsStore();
  useEffect(() => {
    if (!project || !activePlatform) return;
    
    const isMulti = activePlatform === "multichannel";
    const chToUse = isMulti ? project.channels.find(c => c.platformId === "meta") : project.channels.find(c => c.platformId === activePlatform);
    
    if ((activePlatform !== "meta" && !isMulti) || !chToUse?.adAccounts?.length) { 
      if (!isMulti) setInsights(null); 
      return; 
    }

    const accs = selectedAccountId === "all" ? chToUse.adAccounts : [selectedAccountId];
    const effectivePreset = (dateStart && dateEnd) ? undefined : (datePreset || "this_month");

    // 1. Show cached data immediately (no loading spinner)
    const cached = insightsStore.getCached(project.id, effectivePreset, dateStart, dateEnd);
    if (cached) {
      setInsights(cached);
      // Don't show loading for revalidation � data is already visible
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

  const [multichannelData, setMultichannelData] = useState<any>(null);

  useEffect(() => {
    if (activePlatform !== "multichannel" || !project) return;
    const fetchGoogle = async () => {
      const effectivePreset = (dateStart && dateEnd) ? undefined : (datePreset || "this_month");
      let dp = ""; if (dateStart && dateEnd) dp = `&start=${dateStart}&end=${dateEnd}`; else if (effectivePreset) dp = `&preset=${effectivePreset}`;
      try {
        const [adsRes, ga4Res] = await Promise.all([
          fetch(`/api/projects/${project.id}/google/ads?${dp.replace('&', '')}`).then(r => r.json()).catch(() => ({ data: null })),
          fetch(`/api/projects/${project.id}/google/analytics?${dp.replace('&', '')}`).then(r => r.json()).catch(() => ({ data: null }))
        ]);
        setMultichannelData({ ads: adsRes?.data || { spend: 0, impressions: 0, clicks: 0, cpc: 0 }, ga4: ga4Res?.data || { sessions: 0, bounceRate: 0, conversions: 0 } });
      } catch(e) { }
    };
    fetchGoogle();
  }, [project, activePlatform, dateStart, dateEnd, datePreset]);

  // Track which breakdowns have been attempted (prevents re-fetch loops)
  const breakdownFetchedRef = useRef<Record<string, boolean>>({});

  // Heatmap Timezone state
  const [heatmapTimezone, setHeatmapTimezone] = useState<"advertiser" | "audience">("advertiser");

  // Reset breakdown cache when filters change
  useEffect(() => {
    breakdownFetchedRef.current = {};
  }, [project, activePlatform, dateStart, dateEnd, datePreset, selectedAccountId, heatmapTimezone]);

  // Load breakdowns for audience/creative tabs � uses same date range
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
          ? `/api/meta/breakdowns?id=${id}&breakdown=${key}&dateStart=${dateStart}&dateEnd=${dateEnd}&tz=${heatmapTimezone}`
          : `/api/meta/breakdowns?id=${id}&breakdown=${key}&preset=${dp}&tz=${heatmapTimezone}`;
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
  }, [project, activePlatform, selectedAccountId, datePreset, dateStart, dateEnd, heatmapTimezone]);

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
  const timeMetrics = getTimeFilterMetrics(datePreset, dateStart, dateEnd);
  let viewedMonth = timeMetrics.viewedMonthStr;

  let effectiveBudget = 0;
  let effectiveGoal = 0;
  const activeChannels = activePlatform === "multichannel" ? project.channels : project.channels.filter(c => c.platformId === activePlatform);
  
  activeChannels.forEach(channel => {
    let rb = channel.budget || "0";
    let rc = channel.cpr || "0";
    if (channel.monthlyOverrides && viewedMonth && channel.monthlyOverrides[viewedMonth]) {
      const override = channel.monthlyOverrides[viewedMonth];
      if (override.budget) rb = override.budget;
      if (override.cpr) rc = override.cpr;
    }
    const bn = parseBudget(rb);
    const ct = parseBudget(rc);
    const bk = getBudgetBreakdown(bn, channel.period || "Mensual");
    const eb = bk.daily * timeMetrics.totalDays;
    effectiveBudget += eb;
    if (ct > 0) {
      effectiveGoal += Math.floor(eb / ct);
    }
  });

  const cprTarget = effectiveGoal > 0 ? (effectiveBudget / effectiveGoal) : 0;

  const budgetNum = activeChannels.reduce((sum, c) => sum + parseBudget(c.budget || "0"), 0);
  const bk = {
    daily: effectiveBudget / Math.max(1, timeMetrics.totalDays),
    weekly: (effectiveBudget / Math.max(1, timeMetrics.totalDays)) * 7,
    monthly: effectiveBudget, 
    label: "Aproximado"
  };
  const goalBreakdown = {
    daily: cprTarget > 0 ? bk.daily / cprTarget : 0,
    weekly: cprTarget > 0 ? bk.weekly / cprTarget : 0,
    monthly: cprTarget > 0 ? bk.monthly / cprTarget : 0,
    label: "Aproximado"
  };

  // Aggregate metrics using global totals (deduplicated reach, exact Meta API values)
  let totalSpend = 0, totalResults = 0, totalImpressions = 0, totalClicks = 0, totalReach = 0, totalActionValue = 0;
  
  if (insights?.totals && insights.totals.length > 0) {
    const d = insights.totals[0];
    totalSpend = parseFloat(d.spend || "0");
    totalImpressions = parseInt(d.impressions || "0", 10);
    totalClicks = parseInt(d.clicks || "0", 10);
    totalReach = parseInt(d.reach || "0", 10);
    const ra = findResultAction(d.actions, ch?.goal); if (ra) totalResults = parseInt(ra.value, 10);
    const va = findResultAction(d.action_values, ch?.goal); if (va) totalActionValue = parseFloat(va.value);
  } else {
    // Fallback if totals array isn't available for some reason
    (insights?.timeSeries || []).forEach((d: any) => {
      totalSpend += parseFloat(d.spend || "0"); totalImpressions += parseInt(d.impressions || "0", 10); totalClicks += parseInt(d.clicks || "0", 10);
      totalReach += parseInt(d.reach || "0", 10);
      const ra = findResultAction(d.actions, ch?.goal); if (ra) totalResults += parseInt(ra.value, 10);
      const va = findResultAction(d.action_values, ch?.goal); if (va) totalActionValue += parseFloat(va.value);
    });
  }

  if (activePlatform === "multichannel" && multichannelData) {
    totalSpend += (multichannelData.ads?.spend || 0);
    totalImpressions += (multichannelData.ads?.impressions || 0);
    totalClicks += (multichannelData.ads?.clicks || 0);
    totalResults += (multichannelData.ga4?.conversions || 0);
  }

  const cpr = totalResults > 0 ? totalSpend / totalResults : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const roas = totalSpend > 0 ? totalActionValue / totalSpend : 0;
  const spendProgress = effectiveBudget > 0 ? (totalSpend / effectiveBudget) * 100 : 0;

  // Projections and pacing based on filtered time range
  const daysElapsed = timeMetrics.elapsedDays;
  const daysInWindow = timeMetrics.totalDays;
  const daysRemaining = Math.max(0, daysInWindow - daysElapsed);
  
  const idealSpendToday = bk.daily * daysElapsed;
  const spendPace = idealSpendToday > 0 ? ((totalSpend / idealSpendToday) - 1) * 100 : 0;
  
  const projectedResults = daysElapsed > 0 ? Math.round((totalResults / daysElapsed) * daysInWindow) : 0;
  const projectedSpend = daysElapsed > 0 ? (totalSpend / daysElapsed) * daysInWindow : 0;
  const goalCompletion = effectiveGoal > 0 ? (totalResults / effectiveGoal) * 100 : 0;
  
  const dailyNeeded = effectiveGoal > 0 && daysRemaining > 0 ? Math.ceil((effectiveGoal - totalResults) / daysRemaining) : 0;
  const trackStatus = effectiveGoal > 0 ? (goalCompletion >= (daysElapsed / daysInWindow) * 100 ? "on-track" : goalCompletion >= (daysElapsed / daysInWindow) * 70 ? "at-risk" : "off-track") : "unknown";

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

  const totalsData = {
    spend: totalSpend,
    results: totalResults,
    cpr: cpr,
    impressions: totalImpressions,
    clicks: totalClicks,
    reach: totalReach,
  };

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
      {/* ���� HEADER ���� */}
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
        <KpiBox title="Inversión" value={fmtMXN0(totalSpend)} sub={`de ${fmtMXN0(effectiveBudget)}`} icon={<DollarSign style={{ width: 16, height: 16 }} />} color="amber" progress={spendProgress} />
        <KpiBox title="Resultados" value={fmtNum(totalResults)} sub={ch?.goal || "Objetivo"} icon={<Target style={{ width: 16, height: 16 }} />} color="emerald" progress={goalCompletion} />
        <KpiBox title="CPR" value={fmtMXN(cpr)} sub={cprTarget > 0 ? `Meta: ${fmtMXN(cprTarget)}` : "Costo por resultado"} icon={<Activity style={{ width: 16, height: 16 }} />} color="cyan" />
        <KpiBox title="CTR" value={pct(ctr)} sub="Click-through rate" icon={<Eye style={{ width: 16, height: 16 }} />} color="purple" />
        <KpiBox title="ROAS" value={`${roas.toFixed(1)}x`} sub="Return on ad spend" icon={<TrendingUp style={{ width: 16, height: 16 }} />} color="purple" />
      </div>
      )}

      {/*    TABS + PLATFORM SELECTOR    */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        
        {/* Primary group navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
          <div style={{ display: "flex", gap: 24 }}>
            {["Analítica", "Optimización", "Configuración"].map(group => {
              const isActiveGroup = getGroupForTab(activeTab) === group;
              return (
                <button
                  key={group}
                  onClick={() => {
                    if (group === "Analítica") setActiveTab("resumen");
                    if (group === "Optimización") setActiveTab("audiencia");
                    if (group === "Configuración") setActiveTab("config");
                  }}
                  style={{
                    background: "none", border: "none", padding: "0 0 10px 0",
                    color: isActiveGroup ? "var(--cyan)" : "var(--text-muted)",
                    fontWeight: isActiveGroup ? 700 : 500, fontSize: 14, cursor: "pointer",
                    position: "relative",
                    marginBottom: -13, // align with borderBottom
                  }}
                >
                  {group}
                  {isActiveGroup && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "var(--cyan)", borderRadius: "2px 2px 0 0", boxShadow: "0 -2px 10px rgba(59,130,246,0.5)" }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Platform + Account selectors moved up to align with groups */}
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
            
            <button onClick={() => { setActivePlatform("multichannel"); setBreakdownData({}); }} style={{
                  padding: "6px 14px", fontSize: 11, fontWeight: 700,
                  background: activePlatform === "multichannel" ? `rgba(255,255,255,0.15)` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${activePlatform === "multichannel" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.08)"}`,
                  color: activePlatform === "multichannel" ? "var(--foreground)" : "var(--text-muted)",
                  borderRadius: 20, cursor: "pointer", transition: "all 0.2s",
                }}>
                  Multicanal (Vista Global)
            </button>

            {ch?.adAccounts && ch.adAccounts.length > 1 && activePlatform !== "multichannel" && (
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

        {/* Secondary tab navigation (scrollable pills) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ overflowX: "auto", flexShrink: 1, minWidth: 0, paddingBottom: 2 }}>
            <div className="tab-pill-nav">
              {getGroupForTab(activeTab) === "Analítica" && (
                <>
                  <TabButton active={activeTab === "resumen"} label="Resumen" icon={<BarChart2 style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("resumen")} />
                  <TabButton active={activeTab === "gasto"} label="Gasto" icon={<DollarSign style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("gasto")} />
                  {!!project.website && <TabButton active={activeTab === "trafico"} label="Tráfico" icon={<Globe style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("trafico")} />}
                  <TabButton active={activeTab === "historial"} label="Historial" icon={<TrendingUp style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("historial")} />
                </>
              )}
              {getGroupForTab(activeTab) === "Optimización" && (
                <>
                  <TabButton active={activeTab === "audiencia"} label="Audiencia" icon={<Users style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("audiencia")} />
                  <TabButton active={activeTab === "creativos"} label="Creativos" icon={<Palette style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("creativos")} />
                  <TabButton active={activeTab === "salud"} label="Salud" icon={<HeartPulse style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("salud")} />
                  <TabButton active={activeTab === "confiabilidad"} label="Confiabilidad" icon={<ShieldCheck style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("confiabilidad")} />
                </>
              )}
              {getGroupForTab(activeTab) === "Configuración" && (
                <>
                  <TabButton active={activeTab === "ads"} label="Ads Manager" icon={<Layers style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("ads")} />
                  <TabButton active={activeTab === "config"} label="Configuración" icon={<Settings style={{ width: 13, height: 13 }} />} onClick={() => setActiveTab("config")} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* """ TAB: HISTORIAL """ */}
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
                        statusEl = <span style={{ color: "var(--emerald)", fontWeight: 600 }}> Superado</span>;
                      } else if (actualCpa <= mCpr * 1.20) {
                        statusEl = <span style={{ color: "var(--amber)", fontWeight: 600 }}> Riesgo</span>;
                      } else {
                        statusEl = <span style={{ color: "var(--red)", fontWeight: 600 }}> Desviado</span>;
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

      {/* " " "  TAB: CONFIABILIDAD " " "  */}
      {activeTab === "confiabilidad" && activePlatform === "meta" && (
        <ErrorBoundary name="Tab Confiabilidad">
          <UserReliabilityModule 
             adAccountId={selectedAccountId === "all" ? (ch?.adAccounts?.join(",") || "") : selectedAccountId}
             dateStart={dateStart} 
             dateEnd={dateEnd}
             preset={datePreset}
             goal={ch?.goal || "Conversaciones"}
             cprTarget={ch?.cpr ? parseBudget(ch.cpr) : 0}
          />
        </ErrorBoundary>
      )}

      {/* " " "  TAB: RESUMEN " " "  */}
      {activeTab === "resumen" && activePlatform === "google" && (
        <GoogleAdsDashboard project={project} dateStart={dateStart} dateEnd={dateEnd} preset={datePreset} />
      )}
      {activeTab === "resumen" && activePlatform !== "google" && (
        <ErrorBoundary name="Tab Resumen">
        <DashboardGrid
          layoutKey="project-resumen"
          columns={12}
          templates={{
            DynamicComposedChart: {
              id: "template-composed",
              title: "Gráfico Dinámico",
              icon: <BarChart2 style={{ width: 13, height: 13 }} />,
              defaultColSpan: 6,
              minColSpan: 3,
              render: (w) => (
                <DynamicComposedChartWidget
                  timeSeriesData={timeSeriesData}
                  config={w as unknown as DynamicChartConfig | undefined}
                  isLoading={isLoading}
                  fmtMXN={fmtMXN}
                />
              ),
            },
            DynamicKpiCard: {
              id: "template-kpi",
              title: "KPI Dinámico",
              icon: <Target style={{ width: 13, height: 13 }} />,
              defaultColSpan: 3,
              minColSpan: 3,
              render: (w) => (
                <DynamicKpiCardWidget
                  totalData={totalsData}
                  config={w as unknown as DynamicKpiConfig | undefined}
                  fmtMXN={fmtMXN}
                />
              ),
            },
          }}
          renderToolbarActions={() => (
            <button
              onClick={() => setIsWidgetBuilderOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", fontSize: 11, fontWeight: 600,
                background: "var(--brand)", color: "white",
                border: "none", borderRadius: 4, cursor: "pointer",
              }}
            >
              <Plus size={14} /> A�adir Gr�fico
            </button>
          )}
          widgets={[
            {
              id: "proyeccion",
              title: "Proyección al Cierre",
              icon: <Target style={{ width: 13, height: 13 }} />,
              defaultColSpan: 12,
              minColSpan: 3,
              render: () => (
                <ProyeccionWidget
                  budgetNum={effectiveBudget} cprTarget={cprTarget} bk={bk}
                  goalNum={effectiveGoal} goalBreakdown={goalBreakdown}
                  totalSpend={totalSpend} totalResults={totalResults}
                  totalImpressions={totalImpressions} totalClicks={totalClicks}
                  totalReach={totalReach} totalActionValue={totalActionValue}
                  cpr={cpr} ctr={ctr} roas={roas} spendProgress={spendProgress}
                  daysElapsed={daysElapsed} daysInMonth={daysInWindow}
                  daysRemaining={daysRemaining} idealSpendToday={idealSpendToday}
                  spendPace={spendPace} projectedResults={projectedResults}
                  projectedSpend={projectedSpend} goalCompletion={goalCompletion}
                  dailyNeeded={dailyNeeded} trackStatus={trackStatus}
                  timeSeriesData={timeSeriesData} ch={ch} isLoading={isLoading}
                  breakdownData={breakdownData} insights={insights}
                  fmtMXN={fmtMXN} fmtMXN0={fmtMXN0} fmtNum={fmtNum} pct={pct}
                />
              ),
            },
            {
              id: "inversion-chart",
              title: "Inversión vs Resultados",
              icon: <BarChart2 style={{ width: 13, height: 13 }} />,
              defaultColSpan: 6,
              minColSpan: 3,
              render: () => (
                <InversionChartWidget
                  timeSeriesData={timeSeriesData}
                  isLoading={isLoading}
                  fmtMXN={fmtMXN}
                />
              ),
            },
            {
              id: "ctr-cpc-chart",
              title: "CTR vs CPC",
              icon: <Activity style={{ width: 13, height: 13 }} />,
              defaultColSpan: 6,
              minColSpan: 3,
              render: () => (
                <CtrCpcChartWidget
                  timeSeriesData={timeSeriesData}
                  isLoading={isLoading}
                  fmtMXN={fmtMXN}
                />
              ),
            },
            {
              id: "cuentas",
              title: "Cuentas Vinculadas",
              icon: <Link style={{ width: 13, height: 13 }} />,
              defaultColSpan: 6,
              minColSpan: 3,
              render: () => (
                <CuentasWidget
                  ch={ch}
                  accountNames={accountNames}
                />
              ),
            },
            {
              id: "presupuesto",
              title: "Presupuesto",
              icon: <DollarSign style={{ width: 13, height: 13 }} />,
              defaultColSpan: 6,
              minColSpan: 3,
              render: () => (
                <PresupuestoWidget
                  bk={bk} budgetNum={budgetNum}
                  spendPace={spendPace} idealSpendToday={idealSpendToday}
                  totalSpend={totalSpend}
                  fmtMXN={fmtMXN} fmtMXN0={fmtMXN0} pct={pct}
                />
              ),
            },
            {
              id: "heatmap",
              title: "Distribución por Hora y Día",
              icon: <Calendar style={{ width: 13, height: 13 }} />,
              defaultColSpan: 12,
              minColSpan: 3,
              render: () => (
                <HeatmapWidget
                  breakdownData={breakdownData}
                  ch={ch} insights={insights}
                  heatmapTimezone={heatmapTimezone}
                  setHeatmapTimezone={setHeatmapTimezone}
                  findResultAction={findResultAction}
                  getObjective={getObjective}
                  goalLabel={goalLabel}
                  fmtMXN={fmtMXN} fmtNum={fmtNum}
                />
              ),
            },
          ] as WidgetDefinition[]}
        />
        </ErrorBoundary>
      )}



      {/* TAB: GASTO & PRESUPUESTO */}
      {activeTab === "gasto" && (
        <ErrorBoundary name="Tab Gasto">
        <DashboardGrid
          layoutKey="project-gasto"
          columns={12}
          widgets={[
            {
              id: "alertas-gasto",
              title: "Alertas de Gasto",
              icon: <AlertTriangle style={{ width: 13, height: 13 }} />,
              defaultColSpan: 12,
              minColSpan: 3,
              render: () => (
                <AlertasGastoWidget
                  timeSeriesData={timeSeriesData} bk={bk} effectiveBudget={effectiveBudget}
                  totalSpend={totalSpend} idealSpendToday={idealSpendToday}
                  cprTarget={cprTarget} cpr={cpr} totalResults={totalResults}
                  daysElapsed={daysElapsed}
                  fmtMXN={fmtMXN} fmtMXN0={fmtMXN0} pct={pct}
                />
              ),
            },
            {
              id: "budget-cards",
              title: "Resumen de Presupuesto",
              icon: <CreditCard style={{ width: 13, height: 13 }} />,
              defaultColSpan: 12,
              minColSpan: 3,
              render: () => (
                <BudgetCardsWidget
                  bk={bk} totalSpend={totalSpend} effectiveBudget={effectiveBudget}
                  idealSpendToday={idealSpendToday}
                  daysRemaining={daysRemaining}
                  timeSeriesData={timeSeriesData}
                  goalBreakdown={goalBreakdown}
                  fmtMXN={fmtMXN} fmtMXN0={fmtMXN0} pct={pct}
                  panelStyle={panelStyle}
                />
              ),
            },
            {
              id: "desglose-gasto",
              title: "Tabla de Gasto",
              icon: <BarChart2 style={{ width: 13, height: 13 }} />,
              defaultColSpan: 12,
              minColSpan: 3,
              render: () => (
                <GastoSpendTableInline
                  panelStyle={panelStyle} headingStyle={headingStyle} subStyle={subStyle} labelStyle={labelStyle}
                  timeSeriesData={timeSeriesData} timeGranularity={timeGranularity} setTimeGranularity={setTimeGranularity}
                  getSpendTable={getSpendTable} bk={bk} totalSpend={totalSpend} totalResults={totalResults}
                  goalNum={effectiveGoal} goalBreakdown={goalBreakdown} cprTarget={cprTarget}
                  ch={ch} project={project} insights={insights}
                  daysElapsed={daysElapsed} daysInMonth={daysInWindow}
                  fmtMXN={fmtMXN} fmtMXN0={fmtMXN0} fmtNum={fmtNum} pct={pct}
                  goalLabel={goalLabel} findResultAction={findResultAction}
                />
              ),
            },
            {
              id: "curva-gasto",
              title: "Curva de Gasto vs Presupuesto Ideal",
              icon: <Activity style={{ width: 13, height: 13 }} />,
              defaultColSpan: 12,
              minColSpan: 3,
              render: () => (
                <GastoCurvaWidget
                  timeSeriesData={timeSeriesData}
                  bk={bk}
                  fmtMXN={fmtMXN}
                />
              ),
            },
          ] as WidgetDefinition[]}
        />
        </ErrorBoundary>
      )}

      {/* �"��"��"� TAB: AUDIENCIA �"��"��"� */}
      {activeTab === "audiencia" && (
        <ErrorBoundary name="Tab Audiencia">
        <DashboardGrid
          layoutKey="project-audiencia"
          columns={12}
          widgets={[
            {
              id: "audiencia-header",
              title: "An�lisis de Audiencia",
              icon: <Users style={{ width: 13, height: 13 }} />,
              defaultColSpan: 12,
              minColSpan: 3,
              render: () => (
                <>
          {/* Loading state when no breakdowns loaded yet */}
          {Object.keys(breakdownData).length === 0 && <LoadingOverlay />}

          {/* Section header � enriched banner */}
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
                  Demografía, ubicación geográfica, plataformas y dispositivos � basado en inversión del periodo.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                <select 
                  value={audienceMetric} 
                  onChange={e => setAudienceMetric(e.target.value as any)}
                  style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-primary)", cursor: "pointer",
                    outline: "none", marginRight: 8
                  }}
                >
                  <option value="impressions">Impresiones (Alcance)</option>
                  <option value="spend">Inversión ($)</option>
                  <option value="clicks">Clics</option>
                </select>
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
                </>
              ),
            },
            {
              id: "audiencia-edad-genero",
              title: "Edad y Género",
              icon: <Users style={{ width: 13, height: 13 }} />,
              defaultColSpan: 6,
              minColSpan: 3,
              render: () => (
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
                    buckets[age][g as "Hombres" | "Mujeres" | "Otro"] += Number(r[audienceMetric]) || 0;
                  }
                  const cd = Object.values(buckets).sort((a, b) => a.age.localeCompare(b.age));
                  if (!cd.length) return <NoData msg="Sin datos de audiencia" />;
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cd} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="age" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => audienceMetric === "spend" ? `$${v}` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [audienceMetric === "spend" ? fmtMXN(Number(v)) : Number(v).toLocaleString(), audienceMetric === "spend" ? "Inversión" : audienceMetric === "impressions" ? "Impresiones" : "Clics"]} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="Mujeres" stackId="a" fill="var(--purple)" />
                        <Bar dataKey="Hombres" stackId="a" fill="var(--cyan)" radius={[3, 3, 0, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>
              ),
            },
            {
              id: "audiencia-regiones",
              title: "Top Regiones",
              icon: <Globe style={{ width: 13, height: 13 }} />,
              defaultColSpan: 6,
              minColSpan: 3,
              render: () => (
            <div style={panelStyle}>
              <h3 style={headingStyle}><Globe style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />Top Regiones</h3>
              <p style={subStyle}>¿De dónde vienen? Estados y ciudades con mayor alcance</p>
              <div style={{ width: "100%", height: 280 }}>
                {(() => {
                  const raw = breakdownData["region"];
                  if (raw === undefined) return <NoData msg="Cargando..." />;
                  const d = raw
                    .map((r: any) => ({ region: r.region || "?", metric: Number(r[audienceMetric]) || 0 }))
                    .sort((a: any, b: any) => b.metric - a.metric)
                    .slice(0, 8);
                  if (!d.length) return <NoData msg="Sin datos de región" />;
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                        <XAxis type="number" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => audienceMetric === "spend" ? `$${v}` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                        <YAxis type="category" dataKey="region" stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} width={90} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [audienceMetric === "spend" ? fmtMXN(Number(v)) : Number(v).toLocaleString(), audienceMetric === "spend" ? "Inversión" : audienceMetric === "impressions" ? "Impresiones" : "Clics"]} />
                        <Bar dataKey="metric" fill="var(--amber)" radius={[0, 4, 4, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>
              ),
            },
            {
              id: "audiencia-pais",
              title: "País",
              icon: <Globe style={{ width: 13, height: 13 }} />,
              defaultColSpan: 6,
              minColSpan: 3,
              render: () => (
            <div style={panelStyle}>
              <h3 style={headingStyle}><Globe style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />País</h3>
              <p style={subStyle}>¿Desde qué país te ven? �atil para campañas multi-país</p>
              <div style={{ width: "100%", height: 280 }}>
                {(() => {
                  const raw = breakdownData["country"];
                  if (raw === undefined) return <NoData msg="Cargando..." />;
                  const aggregatedCountry = raw.reduce((acc: any, r: any) => {
                    let country = r.country || "Desconocido";
                    if (country === "unknown") country = "Desconocido";
                    if (!acc[country]) acc[country] = { name: country, metric: 0 };
                    acc[country].metric += Number(r[audienceMetric]) || 0;
                    return acc;
                  }, {});
                  const dCountry = Object.values(aggregatedCountry).sort((a: any, b: any) => b.metric - a.metric);
                  if (!dCountry.length) return <NoData msg="Sin datos de país" />;
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dCountry} dataKey="metric" nameKey="name" cx="50%" cy="50%"
                          innerRadius={60} outerRadius={100}
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          labelLine={{ stroke: "rgba(148,163,184,0.65)" }}
                        >
                          {dCountry.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => {
                          return [audienceMetric === "spend" ? fmtMXN(Number(v)) : Number(v).toLocaleString(), audienceMetric === "spend" ? "Inversión" : audienceMetric === "impressions" ? "Impresiones" : "Clics"];
                        }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>
              ),
            },
            {
              id: "audiencia-plataforma",
              title: "Plataforma",
              icon: <Layers style={{ width: 13, height: 13 }} />,
              defaultColSpan: 6,
              minColSpan: 3,
              render: () => (
            <div style={panelStyle}>
              <h3 style={headingStyle}><Layers style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />Plataforma</h3>
              <p style={subStyle}>¿Dónde ven tus anuncios? Facebook, Instagram o Audience Network</p>
              <div style={{ width: "100%", height: 280 }}>
                {(() => {
                  const raw = breakdownData["platform"];
                  if (raw === undefined) return <NoData msg="Cargando..." />;
                  
                  const aggregated = raw.reduce((acc: any, r: any) => {
                    const rawName = (r.publisher_platform || "otro").toLowerCase();
                    let name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
                    if (rawName === "audience_network") name = "Audience Network";
                    if (rawName === "messenger") name = "Messenger";
                    if (!acc[name]) acc[name] = { name, metric: 0 };
                    acc[name].metric += Number(r[audienceMetric]) || 0;
                    return acc;
                  }, {});
                  
                  const d = Object.values(aggregated).sort((a: any, b: any) => b.metric - a.metric);
                  if (!d.length) return <NoData msg="Sin datos de plataforma" />;

                  const platformColors: Record<string, string> = {
                    "Facebook": "#1877F2",
                    "Instagram": "#E1306C",
                    "Audience Network": "var(--cyan)",
                    "Messenger": "#00B2FF"
                  };

                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={d} dataKey="metric" nameKey="name" cx="50%" cy="50%"
                          innerRadius={60} outerRadius={100}
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          labelLine={{ stroke: "rgba(148,163,184,0.65)" }}
                        >
                          {d.map((entry: any, i: number) => <Cell key={i} fill={platformColors[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => {
                          return [audienceMetric === "spend" ? fmtMXN(Number(v)) : Number(v).toLocaleString(), audienceMetric === "spend" ? "Inversión" : audienceMetric === "impressions" ? "Impresiones" : "Clics"];
                        }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>
              ),
            },
            {
              id: "audiencia-dispositivo",
              title: "Dispositivo",
              icon: <Monitor style={{ width: 13, height: 13 }} />,
              defaultColSpan: 6,
              minColSpan: 3,
              render: () => (
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
              ),
            },
            {
              id: "audiencia-placement",
              title: "Placement",
              icon: <Layers style={{ width: 13, height: 13 }} />,
              defaultColSpan: 6,
              minColSpan: 3,
              render: () => (
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
                      const label = pos ? `${plat.charAt(0).toUpperCase() + plat.slice(1)} � ${pos.replace(/_/g, " ")}` : plat;
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
              ),
            },
            {
              id: "audiencia-hora",
              title: "Rendimiento por Hora",
              icon: <Clock style={{ width: 13, height: 13 }} />,
              defaultColSpan: 6,
              minColSpan: 3,
              render: () => (
            <div style={panelStyle}>
              <h3 style={headingStyle}><Clock style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />Rendimiento por Hora</h3>
              <p style={subStyle}>¿A qué hora publicar? Identifica los mejores horarios para tu audiencia</p>
              <div style={{ width: "100%", height: 280 }}>
                {(() => {
                  const raw = breakdownData["time_of_day"];
                  if (raw === undefined) return <NoData msg="Cargando..." />;
                  const hourMap: Record<string, { hour: string; sortKey: number; spend: number; impressions: number; clicks: number }> = {};
                  for (const r of raw) {
                    const h = r.hourly_stats_aggregated_by_audience_time_zone ?? r.hourly_stats_aggregated_by_advertiser_time_zone ?? "?";
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
              ),
            },
          ] as WidgetDefinition[]}
        />
        </ErrorBoundary>
      )}

      {/* �"��"��"� TAB: CREATIVOS �"��"��"� */}
      {activeTab === "creativos" && (
        <ErrorBoundary name="Tab Creativos">
        <DashboardGrid
          layoutKey="project-creativos"
          columns={12}
          widgets={[
            {
              id: "creativos-header",
              title: "Análisis de Creativos",
              icon: <Palette style={{ width: 13, height: 13 }} />,
              defaultColSpan: 12,
              minColSpan: 3,
              render: () => (
                <>
                  {creativesLoading && <LoadingOverlay />}
          <div style={{ ...panelStyle, padding: "14px 18px", background: "linear-gradient(135deg, rgba(162,93,220,0.06), rgba(253,171,61,0.04))" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>
              <Palette style={{ width: 15, height: 15, display: "inline", verticalAlign: "middle", marginRight: 8, color: "#9b7be8" }} />
              Análisis de Creativos
            </h3>
            <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Identifica qué anuncios funcionan mejor y cuáles necesitan optimización. Ordenados por eficiencia (CPR).
            </p>
          </div>
                </>
              ),
            },
            {
              id: "creativos-top-ranking",
              title: "Top Mejores y Peores",
              icon: <TrendingUp style={{ width: 13, height: 13 }} />,
              defaultColSpan: 12,
              minColSpan: 6,
              render: () => {
            const ranked = adCreatives
              .filter(a => a.spend > 0)
              .map((ad: any) => {
                const ra = findResultAction(ad.actions, ch?.goal, getObjective(ad, insights));
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
                  <p style={subStyle}>Menor costo por resultado � clic para ver preview</p>
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
              },
            },
            {
              id: "creativos-tabla",
              title: "Todos los Anuncios",
              icon: <BarChart2 style={{ width: 13, height: 13 }} />,
              defaultColSpan: 12,
              minColSpan: 3,
              render: () => (
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
                      const ra = findResultAction(ad.actions, ch?.goal, getObjective(ad, insights));
                      const results = ra ? parseInt(ra.value, 10) : 0;
                      const cprVal = results > 0 ? ad.spend / results : 0;
                      const ctrVal = ad.ctr || (ad.clicks > 0 && ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0);
                      return (
                        <tr key={ad.adId || i} style={{ border: "1px solid var(--border)", transition: "background 0.15s", cursor: "pointer" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          onClick={() => { const ra2 = findResultAction(ad.actions, ch?.goal, getObjective(ad, insights)); setPreviewAd({ ...ad, results, cprVal, ctrVal }); }}>
                          <td style={{ padding: "8px 6px", color: "var(--text-muted)", fontSize: 10 }}>{i + 1}</td>
                          <td style={{ padding: "8px 6px", maxWidth: 250 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 40, height: 40, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: "var(--surface-hover)", position: "relative" }}>
                                {ad.thumbnailUrl
                                  ? <img src={ad.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Eye style={{ width: 14, height: 14, color: "var(--text-secondary)" }} /></div>
                                }
                                {ad.format === "video" && <span style={{ position: "absolute", bottom: 1, right: 1, fontSize: 7, background: "var(--surface)", color: "var(--foreground)", padding: "0 3px", borderRadius: 2, fontWeight: 700 }}></span>}
                                {ad.format === "carousel" && <span style={{ position: "absolute", bottom: 1, right: 1, fontSize: 7, background: "var(--surface)", color: "var(--foreground)", padding: "0 3px", borderRadius: 2, fontWeight: 700 }}>�x�</span>}
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
                          <td style={{ padding: "8px 6px", textAlign: "right", color: results === 0 ? "var(--red)" : cprTarget > 0 && cprVal > cprTarget ? "var(--red)" : "var(--cyan)", fontWeight: 600 }}>{results > 0 ? fmtMXN(cprVal) : "�"}</td>
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
              ),
            },
            {
              id: "creativos-textos",
              title: "Análisis de Textos",
              icon: <Palette style={{ width: 13, height: 13 }} />,
              defaultColSpan: 12,
              minColSpan: 3,
              render: () => (
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
                const ra = findResultAction(ad.actions, ch?.goal, getObjective(ad, insights));
                const adResults = ra ? parseInt(ra.value, 10) : 0;
                const texts: string[] = [];
                const hasDCO = cfg.arrayKey && Array.isArray(ad[cfg.arrayKey]) && ad[cfg.arrayKey].length > 0;
                if (hasDCO) { texts.push(...(ad[cfg.arrayKey] as string[])); }
                if (!texts.length) { const fb = (ad[cfg.fallbackKey] || "").trim(); if (fb) texts.push(fb); }

                for (const text of texts) {
                  if (!text) continue;
                  const key = normalize(text);
                  if (!grouped[key]) grouped[key] = { text: text.trim(), spend: 0, results: 0, clicks: 0, count: 0, isDCO: false };
                  // Don't split spend across DCO variants � assign 100% to each
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
                                <span style={{ fontSize: 10, color: "var(--cyan)" }}>{d.results > 0 ? fmtMXN(d.spend / d.results) : "�"} CPR</span>
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
              ),
            },
            {
              id: "creativos-formato",
              title: "Formato de Creativos",
              icon: <PieIcon style={{ width: 13, height: 13 }} />,
              defaultColSpan: 6,
              minColSpan: 3,
              render: () => (
            <div style={panelStyle}>
              <h3 style={headingStyle}><PieIcon style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />Formato de Creativos</h3>
              <p style={subStyle}>Imagen vs Video � ¿qué formato te da mejores resultados?</p>
              <div style={{ width: "100%", height: 250 }}>
                {(() => {
                  if (!adCreatives.length && creativesLoading) return <NoData msg="Cargando..." />;
                  const formatMap: Record<string, { name: string; spend: number; results: number; count: number }> = {};
                  adCreatives.forEach((ad: any) => {
                    const fmt = ad.format === "video" ? "Video" : ad.format === "carousel" ? "Carrusel" : "Imagen";
                    if (!formatMap[fmt]) formatMap[fmt] = { name: fmt, spend: 0, results: 0, count: 0 };
                    formatMap[fmt].spend += ad.spend || 0;
                    const ra = findResultAction(ad.actions, ch?.goal, getObjective(ad, insights));
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
                    const ra = findResultAction(ad.actions, ch?.goal, getObjective(ad, insights));
                    formatStats[fmt].results += ra ? parseInt(ra.value, 10) : 0;
                    formatStats[fmt].count++;
                  });
                  return Object.entries(formatStats).map(([fmt, s]) => (
                    <div key={fmt} style={{ background: "var(--surface-hover)", border: "1px solid var(--hairline)", borderRadius: 6, padding: "10px 12px" }}>
                      <p style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: 4 }}>{fmt}</p>
                      <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                        <span style={{ color: "var(--amber)" }}>{fmtMXN(s.spend)}</span>
                        <span style={{ color: "var(--emerald)" }}>{Math.round(s.results)} res.</span>
                        <span style={{ color: "var(--cyan)" }}>{s.results > 0 ? fmtMXN(s.spend / s.results) : "�"} CPR</span>
                      </div>
                      <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>{s.count} anuncios</p>
                    </div>
                  ));
                })()}
              </div>
            </div>
              ),
            },
            {
              id: "creativos-ctr",
              title: "CTR por Creativo",
              icon: <MousePointer style={{ width: 13, height: 13 }} />,
              defaultColSpan: 6,
              minColSpan: 3,
              render: () => (
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
              ),
            },
            {
              id: "creativos-ganador",
              title: "Combinación Ganadora",
              icon: <Zap style={{ width: 13, height: 13 }} />,
              defaultColSpan: 12,
              minColSpan: 3,
              render: () => (
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
                const top = (insights?.campaigns || []).map((c: any) => { const s = parseFloat(c.spend || "0"); const ra = findResultAction(c.actions, ch?.goal, getObjective(c, insights)); const r = ra ? parseInt(ra.value, 10) : 0; return { name: c.campaign_name || "?", results: r, cpa: r > 0 ? s / r : 0, spend: s }; }).sort((a: any, b: any) => b.spend - a.spend)[0];
                return top ? (
                  <div style={{
                    background: "linear-gradient(135deg, rgba(253,171,61,0.08), rgba(0,0,0,0.15))",
                    border: "1px solid rgba(253,171,61,0.2)", borderRadius: 12, padding: 18,
                    position: "relative", overflow: "hidden",
                  }}>
                    <div style={{ position: "absolute", top: -10, right: -10, width: 60, height: 60, borderRadius: "50%", background: "var(--surface)" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}></div>
                      <p style={{ fontSize: 9, color: "var(--amber)", fontWeight: 800, letterSpacing: "0.12em" }}>CAMPA�A GANADORA</p>
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
                const top = (insights?.adsets || []).map((a: any) => { const s = parseFloat(a.spend || "0"); const ra = findResultAction(a.actions, ch?.goal, getObjective(a, insights)); const r = ra ? parseInt(ra.value, 10) : 0; return { name: a.adset_name || "?", results: r, cpa: r > 0 ? s / r : 0, spend: s }; }).sort((a: any, b: any) => b.spend - a.spend)[0];
                return top ? (
                  <div style={{
                    background: "linear-gradient(135deg, rgba(139,141,242,0.08), rgba(0,0,0,0.15))",
                    border: "1px solid rgba(139,141,242,0.2)", borderRadius: 12, padding: 18,
                    position: "relative", overflow: "hidden",
                  }}>
                    <div style={{ position: "absolute", top: -10, right: -10, width: 60, height: 60, borderRadius: "50%", background: "var(--surface)" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}></div>
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
              ),
            },
          ] as WidgetDefinition[]}
        />
        {/* Lightbox modal */}
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
        </ErrorBoundary>
      )}

      {/* �"��"��"� TAB: SALUD DEL RESULTADO �"��"��"� */}
      {activeTab === "salud" && (
        <ErrorBoundary name="Tab Salud">
        <DashboardGrid
          layoutKey="project-salud"
          columns={12}
          widgets={[
            {
              id: "salud-pulse",
              title: "Pulse Check",
              icon: <HeartPulse style={{ width: 13, height: 13 }} />,
              defaultColSpan: 12,
              minColSpan: 3,
              render: () => {
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
              { name: "Tendencia CPR", icon: <Activity style={{ width: 14, height: 14 }} />, score: trendScore, value: firstHalfCPR > 0 ? `${secondHalfCPR <= firstHalfCPR ? "� " : "� "} ${Math.abs(((secondHalfCPR / firstHalfCPR) - 1) * 100).toFixed(1)}%` : "�", bench: "Estable o mejorando", color: trendScore >= 70 ? "var(--emerald)" : trendScore >= 40 ? "var(--amber)" : "var(--red)" },
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
                );
              },
            },
            {
              id: "salud-embudo",
              title: "Análisis del Embudo",
              icon: <Target style={{ width: 13, height: 13 }} />,
              defaultColSpan: 12,
              minColSpan: 3,
              render: () => {
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
              { name: "Tendencia CPR", icon: <Activity style={{ width: 14, height: 14 }} />, score: trendScore, value: firstHalfCPR > 0 ? `${secondHalfCPR <= firstHalfCPR ? "� " : "� "} ${Math.abs(((secondHalfCPR / firstHalfCPR) - 1) * 100).toFixed(1)}%` : "�", bench: "Estable o mejorando", color: trendScore >= 70 ? "var(--emerald)" : trendScore >= 40 ? "var(--amber)" : "var(--red)" },
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
                );
              },
            },
            {
              id: "salud-tendencia",
              title: "Tendencia y Diagnóstico",
              icon: <Activity style={{ width: 13, height: 13 }} />,
              defaultColSpan: 12,
              minColSpan: 3,
              render: () => {
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
              { name: "Tendencia CPR", icon: <Activity style={{ width: 14, height: 14 }} />, score: trendScore, value: firstHalfCPR > 0 ? `${secondHalfCPR <= firstHalfCPR ? "� " : "� "} ${Math.abs(((secondHalfCPR / firstHalfCPR) - 1) * 100).toFixed(1)}%` : "�", bench: "Estable o mejorando", color: trendScore >= 70 ? "var(--emerald)" : trendScore >= 40 ? "var(--amber)" : "var(--red)" },
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
                );
              },
            },
          ] as WidgetDefinition[]}
        />
        </ErrorBoundary>
      )}

      {/* �"��"��"� TAB: ADS MANAGER �"��"��"� */}
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




      {/* �"��"��"� TAB: ANÁLISIS DE TRÁFICO (GA4) �"��"��"� */}
      {activeTab === "trafico" && (
        <ErrorBoundary name="Tab Trafico">
          <TrafficAnalytics project={project as any} />
        </ErrorBoundary>
      )}

      {/* �"��"��"� TAB: CONFIGURACI�N �"��"��"� */}
      {activeTab === "config" && (
        <ErrorBoundary name="Tab Configuracion">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

          {/* ���� Google Sources Panel ���� */}
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
                      <div><span style={{ color: "var(--text-secondary)" }}>Presupuesto:</span> <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{currentBudget || "�"}</span></div>
                      <div><span style={{ color: "var(--text-secondary)" }}>Período:</span> <span style={{ color: "var(--foreground)" }}>{c.period || "�"}</span></div>
                      <div><span style={{ color: "var(--text-secondary)" }}>Objetivo:</span> <span style={{ color: "var(--emerald)", fontWeight: 600 }}>{currentGoal || "�"}</span></div>
                      <div><span style={{ color: "var(--text-secondary)" }}>CPR Meta:</span> <span style={{ color: "var(--cyan)", fontWeight: 600 }}>{currentCpr || "�"}</span></div>
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

      {isWidgetBuilderOpen && (
        <WidgetBuilderModal
          onClose={() => setIsWidgetBuilderOpen(false)}
          onAdd={(type, config, w, h) => {
            useDashboardLayoutStore.getState().addWidget("project-resumen", {
              id: `widget-${Date.now()}`,
              type,
              config,
              w,
              h,
              collapsed: false,
            });
            setIsWidgetBuilderOpen(false);
          }}
          availableMetrics={[
            { key: "spend", label: "Inversi�n", type: "currency" },
            { key: "results", label: "Resultados", type: "number" },
            { key: "cpr", label: "CPA", type: "currency" },
            { key: "impressions", label: "Impresiones", type: "number" },
            { key: "clicks", label: "Clics", type: "number" },
            { key: "reach", label: "Alcance", type: "number" },
          ]}
        />
      )}
    </div>
  );
}
