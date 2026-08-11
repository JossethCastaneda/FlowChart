/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import {
    LayoutDashboard, FolderKanban, Users, Zap, Target, Plug, Loader2, ArrowRight,
    TrendingUp, TrendingDown, CheckCircle, AlertTriangle,
  Activity, ShieldCheck, Clock, AlertCircle, ChevronRight,
    BarChart3, Inbox, Megaphone, Link2
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

/* ─── Animated Counter ─── */
function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const start = 0;
    const end = value;
    const duration = 900;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value]);
  return <>{prefix}{display.toLocaleString("es-MX")}{suffix}</>;
}

/* ─── Thin Pacing Bar ─── */
function PacingBar({ pct, color }: { pct: number; color: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(Math.min(100, pct)), 80); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{ height: 3, background: "var(--fc-surface-hover)", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 99, transition: "width 1.1s cubic-bezier(0.16, 1, 0.3, 1)", boxShadow: `0 0 6px ${color}80` }} />
    </div>
  );
}

/* ─── KPI Card ─── */
function KpiCard({ icon: Icon, label, value, sub, color, href }: {
    icon: any; label: string; value: number; sub: string; color: string; href: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div style={{
        background: "var(--fc-surface)",
        border: "1px solid var(--fc-border)",
        borderRadius: 16,
        padding: "20px 22px",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = color + "50"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${color}15`; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--fc-border)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
      >
        {/* top accent line */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)`, borderRadius: "16px 16px 0 0" }} />
        {/* bg glow blob */}
        <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: color, opacity: 0.05, filter: "blur(20px)", pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon style={{ width: 16, height: 16, color }} />
          </div>
          <ChevronRight style={{ width: 14, height: 14, color: "var(--fc-text-muted)", marginTop: 2 }} />
        </div>

        <p style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, color, lineHeight: 1, margin: "0 0 4px" }}>
          <AnimatedNumber value={value} />
        </p>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--fc-text-muted)", margin: "0 0 2px" }}>{label}</p>
        <p style={{ fontSize: 11, color: "var(--fc-text-secondary)", margin: 0 }}>{sub}</p>
      </div>
    </Link>
  );
}

/* ─── Status Block ─── */
function StatusBlock({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div style={{ textAlign: "center", padding: "14px 10px", background: bg, border: `1px solid ${color}18`, borderRadius: 10 }}>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color, margin: "0 0 4px" }}>{value}</p>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: `${color}90`, margin: 0 }}>{label}</p>
    </div>
  );
}

/* ─── Project Health Card ─── */
function ProjectCard({ pc }: { pc: any }) {
  const isHealthy = pc.cumplimiento >= 90 && pc.spendPct <= 110;
  const isWarning = (pc.cumplimiento >= 60 && pc.cumplimiento < 90) || (pc.spendPct > 110 && pc.spendPct <= 125);

  type HealthKey = "healthy" | "warning" | "danger";
    const configs: Record<HealthKey, { color: string; text: string; bg: string; Icon: any }> = {
    healthy: { color: "var(--fc-success)", text: "SALUDABLE", bg: "rgba(52,183,124,0.06)", Icon: ShieldCheck },
    warning: { color: "var(--fc-warning)", text: "PRECAUCIÓN", bg: "rgba(224,168,60,0.06)", Icon: Clock },
    danger: { color: "var(--fc-danger)", text: "EN RIESGO", bg: "rgba(229,72,77,0.06)", Icon: AlertCircle },
  };
  const key: HealthKey = isHealthy ? "healthy" : isWarning ? "warning" : "danger";
  const cfg = configs[key];
  const HealthIcon = cfg.Icon;

  const cprColor = pc.cprActual > 0
    ? (pc.cprActual <= pc.cprProjected ? "var(--fc-success)" : pc.cprActual <= pc.cprProjected * 1.2 ? "var(--fc-warning)" : "var(--fc-danger)")
    : "var(--fc-text)";

  return (
    <Link href={`/dashboard/proyectos/${pc.id}`} style={{ textDecoration: "none" }}>
      <div style={{
        background: `radial-gradient(120% 120% at 50% -10%, ${cfg.bg} 0%, var(--fc-surface) 70%)`,
        border: "1px solid var(--fc-border)",
        borderRadius: 16,
        padding: 0,
        overflow: "hidden",
        position: "relative",
        transition: "border-color 0.25s, box-shadow 0.25s, transform 0.2s",
        cursor: "pointer",
      }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = cfg.color + "40"; el.style.boxShadow = `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${cfg.color}20`; el.style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "var(--fc-border)"; el.style.boxShadow = "none"; el.style.transform = "translateY(0)"; }}
      >
        {/* Top accent */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${cfg.color}80, transparent)` }} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(0, 212, 255, 0.1)", border: "1px solid rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Activity style={{ width: 11, height: 11, color: "var(--fc-accent)" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fc-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pc.alias}</span>
          </div>
          {pc.hasData && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 99, background: `${cfg.color}12`, border: `1px solid ${cfg.color}28`, flexShrink: 0 }}>
              <HealthIcon style={{ width: 10, height: 10, color: cfg.color }} />
              <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.1em", color: cfg.color }}>{cfg.text}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "0 18px 18px" }}>
          {!pc.hasData ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "24px 0", opacity: 0.45 }}>
              <AlertTriangle style={{ width: 14, height: 14, color: "var(--fc-text-muted)" }} />
              <span style={{ fontSize: 11, color: "var(--fc-text-muted)" }}>Sin datos de Meta</span>
            </div>
          ) : (
            <>
              {/* CPR Hero */}
              <div style={{ textAlign: "center", padding: "10px 0 18px", borderBottom: "1px solid var(--fc-border-subtle)" }}>
                <p style={{ fontSize: 9, color: "var(--fc-text-muted)", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 6px" }}>Costo Por Resultado</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: cprColor, lineHeight: 1 }}>
                    {pc.cprActual > 0 ? fmtMXN(pc.cprActual) : "—"}
                  </span>
                  {pc.cprActual > 0 && pc.cprProjected > 0 && (
                    pc.cprActual <= pc.cprProjected
                      ? <TrendingDown style={{ width: 16, height: 16, color: "var(--fc-success)" }} />
                      : <TrendingUp style={{ width: 16, height: 16, color: "var(--fc-danger)" }} />
                  )}
                </div>
                {pc.cprProjected > 0 && (
                  <p style={{ fontSize: 10, color: "var(--fc-text-muted)", margin: "4px 0 0" }}>
                    Meta: <span style={{ color: "var(--fc-text)", fontWeight: 600 }}>{fmtMXN(pc.cprProjected)}</span>
                  </p>
                )}
              </div>

              {/* Pacing */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 14 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fc-text-muted)" }}>Resultados</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--fc-text)" }}>
                      {pc.results.toLocaleString()} <span style={{ color: "var(--fc-text-muted)", fontWeight: 400 }}>/ {Math.round(pc.goalToDate).toLocaleString()}</span>
                    </span>
                  </div>
                  <PacingBar pct={pc.resultsPct} color={pc.resultsPct >= 90 ? "var(--fc-success)" : pc.resultsPct >= 60 ? "var(--fc-warning)" : "var(--fc-danger)"} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fc-text-muted)" }}>Inversión (Gasto)</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--fc-text)" }}>
                      {fmtMXN0(pc.spendToDate)} <span style={{ color: "var(--fc-text-muted)", fontWeight: 400 }}>/ {fmtMXN0(pc.budgetToDate)}</span>
                    </span>
                  </div>
                  <PacingBar pct={pc.spendPct} color={pc.spendPct > 110 ? "var(--fc-danger)" : pc.spendPct > 100 ? "var(--fc-warning)" : "var(--fc-success)"} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─── Quick Nav Pill ─── */
function QuickPill({ label, href, icon: Icon, color }: { label: string; href: string; icon: any; color: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 7, padding: "8px 14px",
        background: "var(--fc-surface-hover)", border: "1px solid var(--fc-border)",
        borderRadius: 10, cursor: "pointer", transition: "all 0.18s",
        fontSize: 12, fontWeight: 600, color: "var(--fc-text-secondary)",
      }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = color + "50"; el.style.color = color; el.style.background = color + "12"; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "var(--fc-border)"; el.style.color = "var(--fc-text-secondary)"; el.style.background = "var(--fc-surface-hover)"; }}
      >
        <Icon style={{ width: 13, height: 13, color }} />
        {label}
      </div>
    </Link>
  );
}

/* ─── MAIN PAGE ─── */
export default function ResumenPage() {
  const [data, setData] = useState<ResumenData | null>(null);
  const [loading, setLoading] = useState(true);
  const insightsStore = useInsightsStore();
    const [projectInsights, setProjectInsights] = useState<Record<string, any>>({});
  const [insightsLoading, setInsightsLoading] = useState(false);
  const now = new Date();
    const timeLabel = now.getHours() < 12 ? "Buenos días" : now.getHours() < 18 ? "Buenas tardes" : "Buenas noches";

  useEffect(() => {
    fetch("/api/resumen")
      .then((r) => r.json())
      .then((res) => { if (res.data) setData(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data?.projectsList?.length) return;
        const activeProjects = data.projectsList?.filter((p: any) => p.status === "EN VUELO" || p.status === "Activo") || [];
    if (activeProjects.length === 0) return;

  // eslint-disable-next-line react-hooks/set-state-in-effect
        setInsightsLoading(true);
        const fetches = activeProjects.map(async (p: any) => {
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 20 }}>
        <div style={{ position: "relative" }}>
          <Loader2 style={{ width: 32, height: 32, color: "var(--fc-accent)", animation: "spin 1s linear infinite" }} />
          <div style={{ position: "absolute", inset: -8, borderRadius: "50%", border: "1px solid rgba(59,130,246,0.2)", animation: "pulse 2s ease-in-out infinite" }} />
        </div>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: "0.2em", color: "var(--fc-accent)", textTransform: "uppercase" }}>Sintonizando datos...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <p style={{ color: "var(--fc-danger)", fontSize: 13 }}>No se pudieron cargar los datos del resumen. Verifica tu conexión.</p>
      </div>
    );
  }

  const d = data;
  const taskDoneRate = d.tasks?.total > 0 ? Math.round((d.tasks.done / d.tasks.total) * 100) : 0;
    const activeProjects = d.projectsList?.filter((p: any) => p.status === "EN VUELO" || p.status === "Activo") || [];

    const projectCards = activeProjects.map((p: any) => {
    const pi = projectInsights[p.id];
    const cfg = pi?.config || {};
    const ins = pi?.insights;

    const parseBudget = (s: string) => parseFloat((s || "0").replace(/[^0-9.]/g, "")) || 0;
    const budgetNum = parseBudget(cfg.budget || "0");
    const cprTarget = parseBudget(cfg.cpr || "0");
    const period = (cfg.period || "Mensual").toLowerCase();

    const daysElapsed = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    let monthly = budgetNum;
    if (period === "semanal" || period === "semana") monthly = budgetNum * 4.33;
    else if (period === "diario" || period === "dia" || period === "día") monthly = budgetNum * 30;
    else if (period === "anual" || period === "año") monthly = budgetNum / 12;
    const daily = monthly / daysInMonth;
    const budgetToDate = daily * daysElapsed;

    let totalSpend = 0, totalResults = 0;
    if (ins?.timeSeries) {
            ins.timeSeries.forEach((d: any) => { totalSpend += parseFloat(d.spend || "0"); });
    }
    totalResults = countResultsFromTimeSeries(ins?.timeSeries || [], cfg.goal);

    const cpr = totalResults > 0 ? totalSpend / totalResults : 0;
    const goalToDate = cprTarget > 0 ? budgetToDate / cprTarget : 0;
    const resultsPct = goalToDate > 0 ? (totalResults / goalToDate) * 100 : 0;
    const spendPct = budgetToDate > 0 ? (totalSpend / budgetToDate) * 100 : 0;
    const cumplimiento = cprTarget > 0 && cpr > 0 ? Math.min(200, (cprTarget / cpr) * 100) : 0;

    return {
      id: p.id, name: p.name, alias: p.alias || p.name,
      budgetToDate, spendToDate: totalSpend, spendPct,
      goalToDate, results: totalResults, resultsPct,
      cprProjected: cprTarget, cprActual: cpr, cumplimiento,
      hasData: !!ins,
    };
  });

    const healthyCount = projectCards.filter((pc: any) => pc.cumplimiento >= 90 && pc.spendPct <= 110).length;
    const warningCount = projectCards.filter((pc: any) => {
    const isHealthy = pc.cumplimiento >= 90 && pc.spendPct <= 110;
    const isDanger = !isHealthy && !(pc.cumplimiento >= 60 && pc.cumplimiento < 90);
    return !isHealthy && !isDanger;
  }).length;
    const dangerCount = projectCards.filter((pc: any) => {
    const isHealthy = pc.cumplimiento >= 90 && pc.spendPct <= 110;
    const isWarning = !isHealthy && ((pc.cumplimiento >= 60 && pc.cumplimiento < 90) || (pc.spendPct > 110 && pc.spendPct <= 125));
    return !isHealthy && !isWarning;
  }).length;

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>



      {/* ── KPI GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <KpiCard icon={FolderKanban} label="Proyectos" value={d.projects.total}
          sub={`${d.projects.active} activos`} color="var(--fc-success)" href="/dashboard/proyectos" />
        <KpiCard icon={Users} label="Equipo" value={d.members.total}
          sub="miembros" color="var(--purple)" href="/dashboard/settings" />
        <KpiCard icon={Zap} label="Tasks" value={d.tasks.total}
          sub={`${d.tasks.wip} en progreso`} color="var(--fc-accent)" href="/dashboard/ops" />
        <KpiCard icon={Target} label="Briefs" value={d.briefs.total}
          sub={`${d.briefs.approved} aprobados`} color="var(--fc-warning)" href="/dashboard/briefing" />
      </div>

      {/* ── PROJECT HEALTH CARDS ── */}
      {activeProjects.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--fc-text-secondary)" }}>
                Salud de Proyectos Activos
              </span>
              {insightsLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 8px", background: "rgba(0, 212, 255, 0.1)", borderRadius: 99, border: "1px solid rgba(59,130,246,0.2)" }}>
                  <Loader2 style={{ width: 10, height: 10, color: "var(--fc-accent)", animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 9, color: "var(--fc-accent)", fontWeight: 600 }}>Cargando</span>
                </div>
              )}
            </div>
            <Link href="/dashboard/proyectos" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "rgba(59,130,246,0.5)", fontFamily: "var(--font-display)", letterSpacing: "0.1em", textDecoration: "none" }}>
              VER TODO <ArrowRight style={{ width: 10, height: 10 }} />
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                        {projectCards.map((pc: any) => <ProjectCard key={pc.id} pc={pc} />)}
          </div>
        </div>
      )}

      {/* ── BOTTOM ROW: Tasks + Quick Actions ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Operations Pipeline */}
        <div style={{ background: "var(--fc-surface)", border: "1px solid var(--fc-border)", borderRadius: 16, padding: 22, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, var(--fc-accent), transparent)" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--fc-text-secondary)" }}>
              Operations Pipeline
            </span>
            <Link href="/dashboard/ops" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "rgba(59,130,246,0.5)", fontFamily: "var(--font-display)", letterSpacing: "0.1em", textDecoration: "none" }}>
              VER TODO <ArrowRight style={{ width: 10, height: 10 }} />
            </Link>
          </div>

          {d.tasks.total === 0 ? (
            <p style={{ fontSize: 12, color: "var(--fc-text-muted)", textAlign: "center", padding: "20px 0" }}>No hay tasks. Crea tu primera en Ops.</p>
          ) : (
            <>
              {/* Completion rate */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--fc-text-muted)" }}>Completion Rate</span>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--fc-success)" }}>{taskDoneRate}%</span>
                </div>
                <div style={{ height: 6, background: "var(--fc-surface-hover)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${taskDoneRate}%`, borderRadius: 99, background: "linear-gradient(90deg, var(--fc-accent), var(--fc-success))", transition: "width 0.8s ease", boxShadow: "0 0 8px rgba(52,183,124,0.4)" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <StatusBlock label="Backlog" value={d.tasks.backlog} color="var(--fc-text-muted)" bg="rgba(255,255,255,0.03)" />
                <StatusBlock label="WIP" value={d.tasks.wip} color="var(--fc-accent)" bg="rgba(59,130,246,0.05)" />
                <StatusBlock label="Done" value={d.tasks.done} color="var(--fc-success)" bg="rgba(52,183,124,0.05)" />
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ background: "var(--fc-surface)", border: "1px solid var(--fc-border)", borderRadius: 16, padding: 22, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, var(--purple), transparent)" }} />

          <div style={{ marginBottom: 18 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--fc-text-secondary)" }}>
              Quick Actions
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "Nuevo Proyecto", href: "/dashboard/proyectos", icon: FolderKanban, color: "var(--fc-success)" },
              { label: "Crear Task", href: "/dashboard/ops", icon: Zap, color: "var(--fc-accent)" },
              { label: "Nuevo Brief IA", href: "/dashboard/briefing", icon: Target, color: "var(--fc-warning)" },
              { label: "Invitar Miembro", href: "/dashboard/settings", icon: Users, color: "var(--purple)" },
            ].map((action) => (
              <Link key={action.label} href={action.href} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                  background: "var(--fc-surface-hover)", border: "1px solid var(--fc-border)",
                  borderRadius: 10, cursor: "pointer", transition: "all 0.18s",
                }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = action.color + "40"; el.style.background = action.color + "08"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "var(--fc-border)"; el.style.background = "var(--fc-surface-hover)"; }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${action.color}12`, border: `1px solid ${action.color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <action.icon style={{ width: 13, height: 13, color: action.color }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fc-text-secondary)", flex: 1 }}>{action.label}</span>
                  <ArrowRight style={{ width: 11, height: 11, color: "var(--fc-text-muted)" }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── INTEGRATIONS FOOTER ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px",
        background: "var(--fc-surface)", border: "1px solid var(--fc-border)",
        borderRadius: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: d.integrations.connected > 0 ? "var(--fc-success)" : "var(--fc-text-muted)", boxShadow: d.integrations.connected > 0 ? "0 0 6px var(--fc-success)" : "none" }} />
          <span style={{ fontSize: 12, color: "var(--fc-text-secondary)" }}>
            {d.integrations.connected > 0
              ? `${d.integrations.connected} integración${d.integrations.connected > 1 ? "es" : ""} activa${d.integrations.connected > 1 ? "s" : ""}`
              : "Sin integraciones conectadas"}
          </span>
        </div>
        <Link href="/dashboard/integrations" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "rgba(59,130,246,0.5)", fontFamily: "var(--font-display)", letterSpacing: "0.1em", textDecoration: "none" }}>
          CONFIGURAR <ArrowRight style={{ width: 9, height: 9 }} />
        </Link>
      </div>

    </div>
  );
}
