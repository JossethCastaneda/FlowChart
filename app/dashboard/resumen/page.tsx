"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LayoutDashboard, FolderKanban, Users, Zap, Target, Plug, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface ResumenData {
  workspace: { name: string; slug: string; plan: string; createdAt: string } | null;
  projects: { total: number; active: number };
  members: { total: number };
  tasks: { total: number; backlog: number; wip: number; done: number };
  briefs: { total: number; draft: number; review: number; approved: number };
  integrations: { connected: number };
}

export default function ResumenPage() {
  const [data, setData] = useState<ResumenData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/resumen")
      .then((r) => r.json())
      .then((res) => { if (res.data) setData(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Command Center" description="Cargando datos del workspace..."
          icon={<LayoutDashboard className="w-6 h-6" style={{ color: "var(--cyan)" }} />} />
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Loader2 style={{ width: 32, height: 32, color: "#00d4ff", animation: "spin 1s linear infinite", margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  const d = data!;
  const taskDoneRate = d.tasks.total > 0 ? Math.round((d.tasks.done / d.tasks.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Center"
        description={d.workspace ? `${d.workspace.name} · Plan ${d.workspace.plan}` : "Tu centro de operaciones"}
        icon={<LayoutDashboard className="w-6 h-6" style={{ color: "var(--cyan)" }} />}
      />

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
            <p style={{ fontSize: "12px", color: "rgba(148,163,184,0.3)", textAlign: "center", padding: "20px 0" }}>
              No hay tasks. Crea tu primera en Ops.
            </p>
          ) : (
            <>
              {/* Progress bar */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "10px", color: "rgba(148,163,184,0.4)", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.1em" }}>
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
                <StatusBlock label="Backlog" value={d.tasks.backlog} color="rgba(148,163,184,0.5)" />
                <StatusBlock label="WIP" value={d.tasks.wip} color="#00d4ff" />
                <StatusBlock label="Done" value={d.tasks.done} color="#06d6a0" />
              </div>
            </>
          )}
        </div>

        {/* Briefs Breakdown */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <span className="section-title">Briefing Pipeline</span>
            <Link href="/dashboard/briefing" style={{ fontSize: "10px", color: "rgba(0,212,255,0.5)",
              fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: "4px" }}>
              VER TODO <ArrowRight style={{ width: 10, height: 10 }} />
            </Link>
          </div>

          {d.briefs.total === 0 ? (
            <p style={{ fontSize: "12px", color: "rgba(148,163,184,0.3)", textAlign: "center", padding: "20px 0" }}>
              No hay briefs. Crea tu primer brief de campaña.
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <StatusBlock label="Draft" value={d.briefs.draft} color="rgba(148,163,184,0.5)" />
              <StatusBlock label="Review" value={d.briefs.review} color="#ffbe0b" />
              <StatusBlock label="Approved" value={d.briefs.approved} color="#06d6a0" />
            </div>
          )}
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
              <span style={{ fontSize: "12px", color: "rgba(148,163,184,0.6)" }}>{action.label}</span>
              <ArrowRight style={{ width: 10, height: 10, color: "rgba(148,163,184,0.2)", marginLeft: "auto" }} />
            </Link>
          ))}
        </div>
      </div>

      {/* Integrations status */}
      <div className="glass-panel" style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Plug style={{ width: 16, height: 16, color: d.integrations.connected > 0 ? "#06d6a0" : "rgba(148,163,184,0.3)" }} />
          <span style={{ fontSize: "12px", color: "rgba(148,163,184,0.5)" }}>
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
            <p style={{ fontSize: "10px", color: "rgba(148,163,184,0.4)", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.1em", marginTop: "2px" }}>
              {label}
            </p>
          </div>
        </div>
        <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.3)", marginTop: "8px" }}>{sub}</p>
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
