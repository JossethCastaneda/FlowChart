"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Users, Plus, Trash2, Loader2, GripVertical } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  priority: string;
  status: string;
  createdAt: string;
}

const STATUSES = ["Backlog", "WIP", "Done"] as const;
const PRIORITIES = ["P0", "P1", "P2"] as const;

const statusStyle: Record<string, { bg: string; border: string; color: string; glow: string }> = {
  Backlog: { bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.12)", color: "rgba(148,163,184,0.5)", glow: "none" },
  WIP:     { bg: "rgba(0,212,255,0.06)", border: "rgba(0,212,255,0.15)", color: "#00d4ff", glow: "0 0 8px rgba(0,212,255,0.3)" },
  Done:    { bg: "rgba(6,214,160,0.06)", border: "rgba(6,214,160,0.12)", color: "#06d6a0", glow: "0 0 8px rgba(6,214,160,0.3)" },
};

const priorityColor: Record<string, string> = {
  P0: "#ff2d55",
  P1: "#ffbe0b",
  P2: "rgba(148,163,184,0.5)",
};

export default function OpsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assignee: "", priority: "P2" });
  const [error, setError] = useState("");

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/ops");
      const data = await res.json();
      if (data.data) setTasks(data.data);
    } catch (err) {
      console.error("[OPS] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setTasks((prev) => [data.data, ...prev]);
      setForm({ title: "", description: "", assignee: "", priority: "P2" });
      setShowForm(false);
    } catch {
      setError("Error de red");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    try {
      await fetch(`/api/ops/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      fetchTasks(); // Revert on error
    }
  };

  const handlePriorityChange = async (id: string, priority: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, priority } : t)));
    try {
      await fetch(`/api/ops/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });
    } catch {
      fetchTasks();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta tarea?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch(`/api/ops/${id}`, { method: "DELETE" });
    } catch {
      fetchTasks();
    }
  };

  const counts = {
    backlog: tasks.filter((t) => t.status === "Backlog").length,
    wip: tasks.filter((t) => t.status === "WIP").length,
    done: tasks.filter((t) => t.status === "Done").length,
    total: tasks.length,
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 14px", fontSize: "13px",
    background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.1)",
    color: "#e2e8f0", outline: "none",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing Ops"
        description="Gestión de tareas, workflows y operaciones del equipo de marketing."
        icon={<Users className="w-6 h-6" style={{ color: "var(--red)" }} />}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Backlog", value: counts.backlog, color: "rgba(148,163,184,0.5)", bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.12)" },
          { label: "WIP Activos", value: counts.wip, color: "#00d4ff", bg: "rgba(0,212,255,0.06)", border: "rgba(0,212,255,0.15)" },
          { label: "Done", value: counts.done, color: "#06d6a0", bg: "rgba(6,214,160,0.06)", border: "rgba(6,214,160,0.12)" },
          { label: "Total Tasks", value: counts.total, color: "#ff2d55", bg: "rgba(255,45,85,0.06)", border: "rgba(255,45,85,0.12)" },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-panel" style={{ padding: "16px" }}>
            <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "22px", fontWeight: 700, color: kpi.color }}>
              {loading ? "—" : kpi.value}
            </p>
            <p style={{ fontSize: "10px", color: "rgba(148,163,184,0.4)", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.15em", marginTop: "4px" }}>
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      {/* Task Table */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div className="section-header" style={{ marginBottom: "16px" }}>
          <span className="section-title">Backlog de Marketing</span>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus style={{ width: 14, height: 14 }} /> Nuevo Task
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div style={{ padding: "16px", marginBottom: "16px", background: "rgba(0,212,255,0.02)", border: "1px solid rgba(0,212,255,0.1)" }}>
            <div style={{ display: "grid", gap: "10px" }}>
              <input style={inp} placeholder="Título de la tarea *"
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <input style={inp} placeholder="Descripción (opcional)"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div style={{ display: "flex", gap: "10px" }}>
                <input style={{ ...inp, flex: 1 }} placeholder="Asignado a"
                  value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} />
                <select style={{ ...inp, flex: "0 0 100px", cursor: "pointer" }}
                  value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {error && <p style={{ fontSize: "12px", color: "#ff2d55" }}>{error}</p>}
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button onClick={() => setShowForm(false)}
                  style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(148,163,184,0.15)", color: "rgba(148,163,184,0.5)", cursor: "pointer", fontSize: "12px" }}>
                  Cancelar
                </button>
                <button onClick={handleCreate} disabled={creating || !form.title.trim()}
                  className="btn-primary" style={{ padding: "8px 20px" }}>
                  {creating ? "Creando..." : "Crear Task"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Loader2 style={{ width: 24, height: 24, color: "#00d4ff", animation: "spin 1s linear infinite", margin: "0 auto" }} />
            <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.3)", marginTop: "8px" }}>Cargando tasks...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && tasks.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontSize: "13px", color: "rgba(148,163,184,0.4)" }}>No hay tasks aún.</p>
            <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.25)", marginTop: "4px" }}>
              Crea tu primera tarea con el botón de arriba.
            </p>
          </div>
        )}

        {/* Task List */}
        {!loading && tasks.length > 0 && (
          <div>
            {STATUSES.map((status) => {
              const filtered = tasks.filter((t) => t.status === status);
              if (filtered.length === 0) return null;
              const s = statusStyle[status];
              return (
                <div key={status} style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", padding: "0 4px" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, boxShadow: s.glow }} />
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "9px", fontWeight: 600,
                      letterSpacing: "0.2em", color: s.color }}>
                      {status.toUpperCase()} ({filtered.length})
                    </span>
                  </div>
                  {filtered.map((task) => (
                    <div key={task.id} className="data-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                        <GripVertical style={{ width: 14, height: 14, color: "rgba(148,163,184,0.15)", flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: "13px", fontWeight: 500, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {task.title}
                          </p>
                          {(task.assignee || task.description) && (
                            <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.35)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {task.assignee || task.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                        <select value={task.priority}
                          onChange={(e) => handlePriorityChange(task.id, e.target.value)}
                          style={{ background: "transparent", border: "1px solid rgba(148,163,184,0.1)",
                            color: priorityColor[task.priority] || "#94a3b8", fontSize: "10px", fontWeight: 700,
                            fontFamily: "'Orbitron', sans-serif", padding: "3px 6px", cursor: "pointer", outline: "none" }}>
                          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <select value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          style={{ background: "transparent", border: `1px solid ${s.border}`,
                            color: s.color, fontSize: "10px", fontWeight: 600,
                            fontFamily: "'Orbitron', sans-serif", padding: "3px 8px", cursor: "pointer", outline: "none" }}>
                          {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                        </select>
                        <button onClick={() => handleDelete(task.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "rgba(255,45,85,0.4)", transition: "color 0.2s" }}
                          title="Eliminar">
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
