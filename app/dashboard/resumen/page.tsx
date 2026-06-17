"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  LayoutDashboard, FolderKanban, Users, Zap, Target, Plug, Loader2, ArrowRight,
  DollarSign, TrendingUp, TrendingDown, CheckCircle, AlertTriangle, Bell, BellOff,
  Activity, ShieldCheck, Clock, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { useInsightsStore, countResultsFromTimeSeries } from "@/stores/insightsStore";

interface ResumenData {
  workspace: { name: string; slug: string; plan: string; createdAt: string } | null;
  projects: { total: number; active: number };
  projectsList: any[];
  members: { total: number };
  tasks: { total: number; backlog: number; wip: number; done: number };
  briefs: { total: number; draft: number; review: number; approved: number };
  integrations: { connected: number };
}

const fmtMXN = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtMXN0 = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
const pct = (n: number) => `${n.toFixed(1)}%`;

export default function ResumenPage() {
  const [data, setData] = useState<ResumenData | null>(null);
  const [loading, setLoading] = useState(true);
  // Use insights cache store (preloaded on login)
  const insightsStore = useInsightsStore();
  const [projectInsights, setProjectInsights] = useState<Record<string, any>>({});
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    fetch("/api/resumen")
      .then((r) => r.json())
      .then((res) => { if (res.data) setData(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Fetch Meta insights — use cache first, then fill any gaps
  useEffect(() => {
    if (!data?.projectsList?.length) return;
    const activeProjects = data.projectsList?.filter((p: any) => p.status === "EN VUELO") || [];
    if (activeProjects.length === 0) return;

    setInsightsLoading(true);
    const fetches = activeProjects.map(async (p: any) => {
      // Find meta channel
      const metaCh = p.channels?.find((c: any) => {
        const cfg = (typeof c.config === "string" ? JSON.parse(c.config) : c.config) || {};
        return cfg?.platformId === "meta" || cfg?.platformId === "facebook" || (c.name || "").toLowerCase().includes("meta") || (c.type || "").toLowerCase().includes("facebook");
      }) || p.channels?.find((c: any) => {
        const cfg = (typeof c.config === "string" ? JSON.parse(c.config) : c.config) || {};
        return cfg?.adAccounts?.length > 0;
      });
      if (!metaCh) return null;
      const cfg = (typeof metaCh.config === "string" ? JSON.parse(metaCh.config) : metaCh.config) || {};
      if (!cfg.adAccounts?.length) return null;

      // Use cache store — fetches ALL accounts, not just first
      const insights = await insightsStore.fetchProjectInsights(p.id, cfg.adAccounts, "this_month");
      return { projectId: p.id, insights, config: cfg };
    });

    Promise.all(fetches).then(results => {
      const map: Record<string, any> = {};
      results.filter(Boolean).forEach((r: any) => { map[r.projectId] = r; });
      setProjectInsights(map);
      setInsightsLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Inicio" description="Cargando datos del workspace..."
          icon={<LayoutDashboard className="w-6 h-6" style={{ color: "var(--cyan)" }} />} />
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Loader2 style={{ width: 32, height: 32, color: "#00d4ff", animation: "spin 1s linear infinite", margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Inicio" description="Hubo un problema al cargar el workspace"
          icon={<LayoutDashboard className="w-6 h-6" style={{ color: "var(--cyan)" }} />} />
        <div style={{ textAlign: "center", padding: "60px 0", color: "#e2445c" }}>
          No se pudieron cargar los datos del resumen. Verifica tu conexión.
        </div>
      </div>
    );
  }

  const d = data;
  const taskDoneRate = d.tasks?.total > 0 ? Math.round((d.tasks.done / d.tasks.total) * 100) : 0;

  // Build project cards data
  const activeProjects = d.projectsList?.filter((p: any) => p.status === "EN VUELO") || [];

  const projectCards = activeProjects.map((p: any) => {
    const pi = projectInsights[p.id];
    const cfg = pi?.config || {};
    const ins = pi?.insights;

    const parseBudget = (s: string) => parseFloat((s || "0").replace(/[^0-9.]/g, "")) || 0;
    const budgetNum = parseBudget(cfg.budget || "0");
    const cprTarget = parseBudget(cfg.cpr || "0");
    const period = (cfg.period || "Mensual").toLowerCase();

    const now = new Date();
    const daysElapsed = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    let monthly = budgetNum;
    if (period === "semanal" || period === "semana") monthly = budgetNum * 4.33;
    else if (period === "diario" || period === "dia" || period === "día") monthly = budgetNum * 30;
    else if (period === "anual" || period === "año") monthly = budgetNum / 12;
    const daily = monthly / daysInMonth;
    const budgetToDate = daily * daysElapsed;

    // Parse insights — use goal-aware result counting (consistent with project detail page)
    let totalSpend = 0, totalClicks = 0, totalImpressions = 0;
    if (ins?.timeSeries) {
      ins.timeSeries.forEach((d: any) => {
        totalSpend += parseFloat(d.spend || "0");
        totalClicks += parseInt(d.clicks || "0", 10);
        totalImpressions += parseInt(d.impressions || "0", 10);
      });
    }
    const totalResults = countResultsFromTimeSeries(ins?.timeSeries || [], cfg.goal);

    const cpr = totalResults > 0 ? totalSpend / totalResults : 0;
    const goalMonth = cprTarget > 0 ? monthly / cprTarget : 0;
    const goalToDate = cprTarget > 0 ? budgetToDate / cprTarget : 0;
    const resultsPct = goalToDate > 0 ? (totalResults / goalToDate) * 100 : 0;
    const spendPct = budgetToDate > 0 ? (totalSpend / budgetToDate) * 100 : 0;
    const cprProjected = cprTarget;
    const cumplimiento = cprTarget > 0 && cpr > 0 ? Math.min(200, (cprTarget / cpr) * 100) : 0;

    return {
      id: p.id, name: p.name, alias: p.alias || p.name,
      budgetTotal: monthly, budgetToDate, spendToDate: totalSpend, spendPct,
      goalMonth, goalToDate, results: totalResults, resultsPct,
      cprProjected, cprActual: cpr, cumplimiento,
      hasData: !!ins,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inicio"
        description={d.workspace ? `${d.workspace.name} · Plan ${d.workspace.plan}` : "Tu centro de operaciones"}
        icon={<LayoutDashboard className="w-6 h-6" style={{ color: "var(--cyan)" }} />}
      />

      <div className="glass-panel" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#f8fafc" }}>Trabajo de hoy</h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
              Prioriza publicar, responder, revisar Ads y cerrar tareas sin navegar por todos los modulos.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              ["Planner", "/dashboard/publisher"],
              ["Inbox", "/dashboard/inbox"],
              ["Ads", "/dashboard/ads-manager"],
              ["Integraciones", "/dashboard/integrations"],
            ].map(([label, href]) => (
              <Link
                key={label}
                href={href}
                style={{
                  padding: "7px 11px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#e2e8f0",
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={FolderKanban} label="Proyectos" value={d.projects.total}
          sub={`${d.projects.active} activos`} color="#06d6a0" href="/dashboard/proyectos" />
        <KpiCard icon={Users} label="Equipo" value={d.members.total}
          sub="miembros" color="#7b61ff" href="/dashboard/settings" />
        <KpiCard icon={Zap} label="Tasks" value={d.tasks.total}
          sub={`${d.tasks.wip} en progreso`} color="#00d4ff" href="/dashboard/ops" />
        <KpiCard icon={Target} label="Briefs" value={d.briefs.total}
          sub={`${d.briefs.approved} aprobados`} color="#ff6b35" href="/dashboard/briefing" />
      </div>

      {/* ═══ PROJECT HEALTH CARDS ═══ */}
      {activeProjects.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="section-title">Salud de Proyectos Activos</span>
            {insightsLoading && <Loader2 style={{ width: 14, height: 14, color: "#00d4ff", animation: "spin 1s linear infinite" }} />}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 mt-4">
            {projectCards.map((pc: any) => {
              // Health classification
              const isHealthy = pc.cumplimiento >= 90 && pc.spendPct <= 110;
              const isWarning = (pc.cumplimiento >= 60 && pc.cumplimiento < 90) || (pc.spendPct > 110 && pc.spendPct <= 125);
              
              let healthConfig = { color: "#e2445c", text: "EN RIESGO", bg: "rgba(226,68,92,0.1)", icon: AlertCircle };
              if (isHealthy) healthConfig = { color: "#00c875", text: "SALUDABLE", bg: "rgba(0,200,117,0.1)", icon: ShieldCheck };
              else if (isWarning) healthConfig = { color: "#fdab3d", text: "PRECAUCIÓN", bg: "rgba(253,171,61,0.1)", icon: Clock };
              
              const HealthIcon = healthConfig.icon;

              return (
                <Link key={pc.id} href={`/dashboard/proyectos/${pc.id}`} style={{ textDecoration: "none" }}>
                  <div className="glass-panel group relative flex flex-col h-full overflow-hidden transition-all duration-300" 
                       style={{ 
                         padding: 0, 
                         borderRadius: "16px",
                         background: pc.hasData ? `radial-gradient(120% 120% at 50% 0%, ${healthConfig.bg} 0%, rgba(10,15,30,0.8) 100%)` : undefined,
                         borderColor: "rgba(255,255,255,0.08)"
                       }}>
                    
                    {/* Hover Glow */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" 
                         style={{ boxShadow: `inset 0 0 0 1px ${healthConfig.color}60` }} />
                    
                    {/* Header */}
                    <div className="p-5 pb-3 flex justify-between items-start">
                      <div className="flex items-center gap-2 flex-1 min-w-0 pr-4">
                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                          <Activity className="w-3 h-3 text-[#00d4ff]" />
                        </div>
                        <h3 className="text-sm font-bold text-white truncate m-0">{pc.alias}</h3>
                      </div>
                      {pc.hasData && (
                        <div className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold tracking-wider" 
                             style={{ color: healthConfig.color, background: `${healthConfig.color}15`, border: `1px solid ${healthConfig.color}30` }}>
                          <HealthIcon className="w-3 h-3" />
                          {healthConfig.text}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="px-5 pb-5 flex-1 flex flex-col">
                      {!pc.hasData ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-500 py-10 opacity-60">
                          <AlertTriangle className="w-6 h-6 mb-2" />
                          Sin datos de Meta
                        </div>
                      ) : (
                        <>
                          {/* HERO: CPR */}
                          <div className="py-4 flex flex-col items-center justify-center text-center relative">
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">Costo Por Resultado</p>
                            <div className="flex items-center gap-3">
                              <span className="text-4xl font-black tracking-tight" style={{ color: "white" }}>
                                {pc.cprActual > 0 ? fmtMXN(pc.cprActual) : "—"}
                              </span>
                              {pc.cprProjected > 0 && pc.cprActual > 0 && (
                                <div className="flex flex-col items-start justify-center">
                                  {pc.cprActual <= pc.cprProjected ? (
                                    <TrendingDown className="w-4 h-4 text-[#00c875]" />
                                  ) : (
                                    <TrendingUp className="w-4 h-4 text-[#e2445c]" />
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs font-medium" style={{ color: "rgba(148,163,184,0.8)" }}>
                              <span>Meta: <span className="text-white">{pc.cprProjected > 0 ? fmtMXN(pc.cprProjected) : "—"}</span></span>
                            </div>
                          </div>

                          {/* FOOTER: Pacing Bars */}
                          <div className="mt-auto pt-4 flex flex-col gap-3">
                            {/* Resultados Pacing */}
                            <div>
                              <div className="flex justify-between items-end mb-1">
                                <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">Resultados</span>
                                <span className="text-[10px] font-bold text-white">{pc.results.toLocaleString()} <span className="text-slate-500 font-normal">/ {Math.round(pc.goalToDate).toLocaleString()}</span></span>
                              </div>
                              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-1000" 
                                     style={{ width: `${Math.min(100, pc.resultsPct)}%`, backgroundColor: pc.resultsPct >= 90 ? "#00c875" : pc.resultsPct >= 60 ? "#fdab3d" : "#e2445c" }} />
                              </div>
                            </div>
                            
                            {/* Inversión Pacing */}
                            <div>
                              <div className="flex justify-between items-end mb-1">
                                <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">Inversión (Gasto)</span>
                                <span className="text-[10px] font-bold text-white">{fmtMXN0(pc.spendToDate)} <span className="text-slate-500 font-normal">/ {fmtMXN0(pc.budgetToDate)}</span></span>
                              </div>
                              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-1000" 
                                     style={{ width: `${Math.min(100, pc.spendPct)}%`, backgroundColor: pc.spendPct > 110 ? "#e2445c" : pc.spendPct > 100 ? "#fdab3d" : "#00c875" }} />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tasks Breakdown */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <span className="section-title">Operations Pipeline</span>
            <Link href="/dashboard/ops" style={{ fontSize: "10px", color: "rgba(0,212,255,0.5)",
              fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: "4px" }}>
              VER TODO <ArrowRight style={{ width: 10, height: 10 }} />
            </Link>
          </div>

          {d.tasks.total === 0 ? (
            <p style={{ fontSize: "12px", color: "rgba(148,163,184,0.65)", textAlign: "center", padding: "20px 0" }}>
              No hay tasks. Crea tu primera en Ops.
            </p>
          ) : (
            <>
              {/* Progress bar */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.1em" }}>
                    COMPLETION RATE
                  </span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#06d6a0", fontFamily: "'Orbitron', sans-serif" }}>
                    {taskDoneRate}%
                  </span>
                </div>
                <div style={{ height: "6px", background: "rgba(148,163,184,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${taskDoneRate}%`, borderRadius: "3px",
                    background: "linear-gradient(90deg, #00d4ff, #06d6a0)",
                    transition: "width 0.6s ease",
                  }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <StatusBlock label="Backlog" value={d.tasks.backlog} color="#64748b" />
                <StatusBlock label="WIP" value={d.tasks.wip} color="#00d4ff" />
                <StatusBlock label="Done" value={d.tasks.done} color="#06d6a0" />
              </div>
            </>
          )}
        </div>

        {/* Notification Settings */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <span className="section-title">Alertas y Notificaciones</span>
            <Bell style={{ width: 14, height: 14, color: "#00d4ff" }} />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {[
              { label: "Alerta CPR > Meta", desc: "Cuando el CPR supere la meta configurada", color: "#e2445c", active: true },
              { label: "Frecuencia > 3.0", desc: "Fatiga publicitaria por alta frecuencia", color: "#fdab3d", active: true },
              { label: "Presupuesto > 110%", desc: "Gasto excede el presupuesto diario ideal", color: "#e2445c", active: true },
              { label: "CTR < 0.8%", desc: "Engagement bajo, renovar creativos", color: "#fdab3d", active: true },
              { label: "Health Score < 50", desc: "Salud general del proyecto en riesgo", color: "#e2445c", active: true },
              { label: "Reporte diario 9:00 AM", desc: "Resumen matutino por correo", color: "#00d4ff", active: true },
            ].map((notif, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: notif.color, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 11, color: "white", fontWeight: 500, margin: 0 }}>{notif.label}</p>
                    <p style={{ fontSize: 9, color: "rgba(148,163,184,0.65)", margin: 0 }}>{notif.desc}</p>
                  </div>
                </div>
                <div style={{ fontSize: 8, fontWeight: 700, color: notif.active ? "#00c875" : "rgba(148,163,184,0.65)", padding: "2px 6px", background: notif.active ? "rgba(0,200,117,0.1)" : "rgba(148,163,184,0.05)", borderRadius: 3, letterSpacing: "0.05em" }}>
                  {notif.active ? "ON" : "OFF"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <span className="section-title" style={{ marginBottom: "16px", display: "block" }}>Quick Actions</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Nuevo Proyecto", href: "/dashboard/proyectos", icon: FolderKanban, color: "#06d6a0" },
            { label: "Crear Task", href: "/dashboard/ops", icon: Zap, color: "#00d4ff" },
            { label: "Nuevo Brief", href: "/dashboard/briefing", icon: Target, color: "#ff6b35" },
            { label: "Invitar Miembro", href: "/dashboard/settings", icon: Users, color: "#7b61ff" },
          ].map((action) => (
            <Link key={action.label} href={action.href}
              style={{
                display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px",
                background: "rgba(0,212,255,0.02)", border: "1px solid rgba(0,212,255,0.08)",
                transition: "all 0.2s", cursor: "pointer", textDecoration: "none",
              }}>
              <action.icon style={{ width: 16, height: 16, color: action.color, flexShrink: 0 }} />
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>{action.label}</span>
              <ArrowRight style={{ width: 10, height: 10, color: "rgba(148,163,184,0.65)", marginLeft: "auto" }} />
            </Link>
          ))}
        </div>
      </div>

      {/* Integrations status */}
      <div className="glass-panel" style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Plug style={{ width: 16, height: 16, color: d.integrations.connected > 0 ? "#06d6a0" : "rgba(148,163,184,0.65)" }} />
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            {d.integrations.connected > 0
              ? `${d.integrations.connected} integración${d.integrations.connected > 1 ? "es" : ""} activa${d.integrations.connected > 1 ? "s" : ""}`
              : "Sin integraciones conectadas"}
          </span>
        </div>
        <Link href="/dashboard/integrations" style={{
          fontSize: "10px", color: "rgba(0,212,255,0.4)", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.1em" }}>
          CONFIGURAR →
        </Link>
      </div>
    </div>
  );
}

function MetricCell({ label, value, color, highlight }: { label: string; value: string; color: string; highlight?: boolean }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 8, color: "rgba(148,163,184,0.65)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 3px" }}>{label}</p>
      <p style={{
        fontSize: highlight ? 15 : 13, fontWeight: 700, color, margin: 0,
        fontFamily: highlight ? "'Orbitron',sans-serif" : "inherit",
      }}>{value}</p>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color, href }: {
  icon: any; label: string; value: number; sub: string; color: string; href: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div className="glass-panel" style={{ padding: "20px", cursor: "pointer", transition: "border-color 0.2s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
            background: `${color}10`, border: `1px solid ${color}25`,
          }}>
            <Icon style={{ width: 18, height: 18, color }} />
          </div>
          <div>
            <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "24px", fontWeight: 700, color, lineHeight: 1 }}>
              {value}
            </p>
            <p style={{ fontSize: "10px", color: "#64748b", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.1em", marginTop: "2px" }}>
              {label}
            </p>
          </div>
        </div>
        <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.65)", marginTop: "8px" }}>{sub}</p>
      </div>
    </Link>
  );
}

function StatusBlock({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: "center", padding: "12px", background: `${color}08`, border: `1px solid ${color}15` }}>
      <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "20px", fontWeight: 700, color }}>{value}</p>
      <p style={{ fontSize: "9px", color: `${color}80`, fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.15em", marginTop: "4px" }}>
        {label.toUpperCase()}
      </p>
    </div>
  );
}
