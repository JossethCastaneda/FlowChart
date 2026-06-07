"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  LayoutDashboard, FolderKanban, Users, Zap, Target, Plug, Loader2, ArrowRight,
  DollarSign, TrendingUp, CheckCircle, AlertTriangle, Bell, BellOff
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

  const d = data!;
  const taskDoneRate = d.tasks.total > 0 ? Math.round((d.tasks.done / d.tasks.total) * 100) : 0;

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
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {projectCards.map((pc: any) => {
              const cColor = pc.cumplimiento >= 90 ? "#00c875" : pc.cumplimiento >= 60 ? "#fdab3d" : "#e2445c";
              const sColor = pc.spendPct > 110 ? "#e2445c" : pc.spendPct > 100 ? "#fdab3d" : "#00c875";
              const rColor = pc.resultsPct >= 90 ? "#00c875" : pc.resultsPct >= 60 ? "#fdab3d" : "#e2445c";

              return (
                <Link key={pc.id} href={`/dashboard/proyectos/${pc.id}`} style={{ textDecoration: "none" }}>
                  <div className="glass-panel" style={{ padding: 0, overflow: "hidden", cursor: "pointer", transition: "border-color 0.2s" }}>
                    {/* Single row: Name + all metrics */}
                    <div style={{ display: "flex", alignItems: "stretch" }}>
                      {/* Left: Project name + badge */}
                      <div style={{ minWidth: 160, maxWidth: 200, padding: "10px 14px", display: "flex", flexDirection: "column", justifyContent: "center", borderRight: "1px solid rgba(255,255,255,0.09)", flexShrink: 0 }}>
                        <h3 style={{ fontSize: 12, fontWeight: 700, color: "white", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pc.alias}</h3>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <span style={{
                            fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 3, letterSpacing: "0.05em",
                            color: cColor, background: `${cColor}12`, border: `1px solid ${cColor}25`,
                          }}>{pc.hasData ? pct(pc.cumplimiento) : "—"}</span>
                        </div>
                      </div>

                      {!pc.hasData ? (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px", color: "rgba(148,163,184,0.65)", fontSize: 10 }}>
                          Sin datos de Meta
                        </div>
                      ) : (
                        /* Right: Metrics in horizontal flow */
                        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(11, 1fr)", alignItems: "center", padding: "8px 0" }}>
                          {([
                            ["Presupuesto", fmtMXN0(pc.budgetTotal), "#00d4ff"],
                            ["Pres. al día", fmtMXN0(pc.budgetToDate), "#00d4ff"],
                            ["Gasto", fmtMXN0(pc.spendToDate), sColor],
                            ["Gasto %", pct(pc.spendPct), sColor],
                            ["Meta Mes", Math.round(pc.goalMonth).toLocaleString(), "#7b61ff"],
                            ["Meta Día", Math.round(pc.goalToDate).toLocaleString(), "#7b61ff"],
                            ["Resultados", pc.results.toLocaleString(), rColor],
                            ["Res. %", pct(pc.resultsPct), rColor],
                            ["CPR Meta", pc.cprProjected > 0 ? fmtMXN(pc.cprProjected) : "—", "#fdab3d"],
                            ["CPR Actual", pc.cprActual > 0 ? fmtMXN(pc.cprActual) : "—", cColor],
                            ["Cumpl.", pct(pc.cumplimiento), cColor],
                          ] as [string, string, string][]).map(([label, value, color], i) => (
                            <div key={i} style={{ textAlign: "center", padding: "0 4px" }}>
                              <p style={{ fontSize: 7, color: "rgba(148,163,184,0.65)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 2px", whiteSpace: "nowrap" }}>{label}</p>
                              <p style={{ fontSize: i >= 10 ? 12 : 10.5, fontWeight: i >= 10 ? 800 : 600, color, margin: 0, fontFamily: i >= 10 ? "'Orbitron',sans-serif" : "inherit", whiteSpace: "nowrap" }}>{value}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Thin progress bar */}
                    {pc.hasData && (
                      <div style={{ height: 2, background: "rgba(255,255,255,0.03)" }}>
                        <div style={{
                          height: "100%", width: `${Math.min(100, pc.cumplimiento)}%`, transition: "width 0.6s ease",
                          background: cColor,
                        }} />
                      </div>
                    )}
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
