import { PageHeader } from "@/components/ui/PageHeader";
import { Users } from "lucide-react";

export default function OpsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing Ops"
        description="Gestión de tareas, workflows y operaciones del equipo de marketing."
        icon={<Users className="w-6 h-6" style={{ color: "var(--red)" }} />}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card amber">
          <div className="flex items-center gap-3">
            <div style={{
              width: "36px", height: "36px",
              background: "rgba(255,190,11,0.08)",
              border: "1px solid rgba(255,190,11,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffbe0b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div>
              <p className="kpi-value" style={{ color: "var(--amber)" }}>12</p>
              <p className="kpi-label">Tasks Pendientes</p>
            </div>
          </div>
        </div>

        <div className="kpi-card cyan">
          <div className="flex items-center gap-3">
            <div style={{
              width: "36px", height: "36px",
              background: "rgba(0,212,255,0.08)",
              border: "1px solid rgba(0,212,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <div>
              <p className="kpi-value" style={{ color: "var(--cyan)" }}>5</p>
              <p className="kpi-label">WIP Activos</p>
            </div>
          </div>
        </div>

        <div className="kpi-card emerald">
          <div className="flex items-center gap-3">
            <div style={{
              width: "36px", height: "36px",
              background: "rgba(6,214,160,0.08)",
              border: "1px solid rgba(6,214,160,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06d6a0" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div>
              <p className="kpi-value" style={{ color: "var(--emerald)" }}>34</p>
              <p className="kpi-label">Deliverables Done</p>
            </div>
          </div>
        </div>

        <div className="kpi-card red">
          <div className="flex items-center gap-3">
            <div style={{
              width: "36px", height: "36px",
              background: "rgba(255,45,85,0.08)",
              border: "1px solid rgba(255,45,85,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <div>
              <p className="kpi-value" style={{ color: "var(--red)" }}>3</p>
              <p className="kpi-label">Squad Activo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Task Table */}
      <div className="glass-panel">
        <div className="section-header">
          <span className="section-title">Backlog de Marketing</span>
          <button className="btn-primary">+ Nuevo Task</button>
        </div>

        <div>
          {[
            { title: "Review copy campaña Q3 — A/B test headlines", assignee: "Carlos R. · Copywriter", priority: "P0", status: "WIP", priorityColor: "red", statusColor: "cyan" },
            { title: "Aprobar creativos IG Reels — Ad Set 'Retargeting LTV'", assignee: "María L. · Creative Lead", priority: "P1", status: "Backlog", priorityColor: "amber", statusColor: "muted" },
            { title: "Setup pixel CAPI + UTMs en landing page", assignee: "Dev Team · Growth Eng", priority: "P0", status: "Backlog", priorityColor: "red", statusColor: "muted" },
            { title: "Reporte mensual: CPM, CTR, ROAS por canal", assignee: "Ana G. · Data Analyst", priority: "P2", status: "Done", priorityColor: "muted", statusColor: "emerald" },
            { title: "Segmentación Lookalike 1% top buyers", assignee: "Dev Team · Paid Media", priority: "P1", status: "WIP", priorityColor: "amber", statusColor: "cyan" },
            { title: "Nurturing flow MQL → SQL en email automation", assignee: "Carlos R. · CRM Ops", priority: "P1", status: "Backlog", priorityColor: "amber", statusColor: "muted" },
          ].map((task, i) => (
            <div key={i} className="data-row">
              <div className="flex items-center gap-3">
                <div
                  className="status-indicator"
                  style={{
                    background: task.status === "WIP" ? "var(--cyan)" :
                      task.status === "Done" ? "var(--emerald)" : "rgba(148,163,184,0.3)",
                    boxShadow: task.status === "WIP" ? "0 0 8px var(--cyan)" :
                      task.status === "Done" ? "0 0 8px var(--emerald)" : "none",
                  }}
                />
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "#e2e8f0" }}>{task.title}</p>
                  <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.4)", marginTop: "2px" }}>{task.assignee}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge badge-${task.priorityColor}`}>{task.priority}</span>
                <span className={`badge badge-${task.statusColor}`}>{task.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
