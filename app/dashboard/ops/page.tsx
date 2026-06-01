"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Users, Plus, Trash2, Loader2, ChevronDown, ChevronRight, Search, Calendar, User, AlertCircle } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  priority: string;
  status: string;
  createdAt: string;
}

/* ═══════════════════════════════════════
   CONFIG: Statuses, Priorities, Groups
   ═══════════════════════════════════════ */

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  Backlog:  { label: "Backlog",   bg: "#c4c4c4", color: "#fff" },
  WIP:      { label: "En Progreso", bg: "#fdab3d", color: "#fff" },
  Review:   { label: "En Review",  bg: "#e2445c", color: "#fff" },
  Done:     { label: "Hecho",     bg: "#00c875", color: "#fff" },
};

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  P0: { label: "Urgente", bg: "rgba(226,68,92,0.15)", color: "#e2445c", icon: "🔴" },
  P1: { label: "Alta",    bg: "rgba(253,171,61,0.15)", color: "#fdab3d", icon: "🟡" },
  P2: { label: "Media",   bg: "rgba(86,148,251,0.15)", color: "#579bfc", icon: "🔵" },
  P3: { label: "Baja",    bg: "rgba(196,196,196,0.1)",  color: "#c4c4c4", icon: "⚪" },
};

const GROUP_CONFIG: { key: string; label: string; color: string }[] = [
  { key: "Backlog",  label: "Backlog",      color: "#c4c4c4" },
  { key: "WIP",      label: "En Progreso",  color: "#fdab3d" },
  { key: "Review",   label: "En Review",    color: "#e2445c" },
  { key: "Done",     label: "Completado",   color: "#00c875" },
];

const STATUSES = Object.keys(STATUS_CONFIG);
const PRIORITIES = Object.keys(PRIORITY_CONFIG);

/* ═══════════════════════════════════════
   STATUS PILL COMPONENT
   ═══════════════════════════════════════ */

function StatusPill({ status, onChange, disabled }: { status: string; onChange: (s: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Backlog;

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        style={{
          padding: "4px 16px", borderRadius: "3px",
          background: cfg.bg, color: cfg.color,
          border: "none", cursor: disabled ? "default" : "pointer",
          fontSize: "12px", fontWeight: 600,
          minWidth: "100px", textAlign: "center",
          transition: "opacity 0.15s",
        }}
      >
        {cfg.label}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
          marginTop: "4px", zIndex: 50,
          background: "#1a1e2e", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "6px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          minWidth: "130px",
        }}>
          {STATUSES.map(s => {
            const c = STATUS_CONFIG[s];
            return (
              <button key={s} onClick={() => { onChange(s); setOpen(false); }}
                style={{
                  display: "block", width: "100%", padding: "8px 12px",
                  border: "none", cursor: "pointer", textAlign: "left",
                  background: status === s ? "rgba(255,255,255,0.05)" : "transparent",
                  fontSize: "12px", color: "#e2e8f0",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background = status === s ? "rgba(255,255,255,0.05)" : "transparent"}
              >
                <span style={{
                  display: "inline-block", width: 10, height: 10,
                  borderRadius: "2px", background: c.bg,
                  marginRight: "8px", verticalAlign: "middle",
                }} />
                {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   PRIORITY PILL COMPONENT
   ═══════════════════════════════════════ */

function PriorityPill({ priority, onChange, disabled }: { priority: string; onChange: (p: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.P2;

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        style={{
          padding: "4px 12px", borderRadius: "3px",
          background: cfg.bg, color: cfg.color,
          border: "none", cursor: disabled ? "default" : "pointer",
          fontSize: "11px", fontWeight: 600,
          transition: "opacity 0.15s",
        }}
      >
        {cfg.label}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
          marginTop: "4px", zIndex: 50,
          background: "#1a1e2e", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "6px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          minWidth: "120px",
        }}>
          {PRIORITIES.map(p => {
            const c = PRIORITY_CONFIG[p];
            return (
              <button key={p} onClick={() => { onChange(p); setOpen(false); }}
                style={{
                  display: "block", width: "100%", padding: "8px 12px",
                  border: "none", cursor: "pointer", textAlign: "left",
                  background: priority === p ? "rgba(255,255,255,0.05)" : "transparent",
                  fontSize: "12px", color: "#e2e8f0",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background = priority === p ? "rgba(255,255,255,0.05)" : "transparent"}
              >
                <span style={{ marginRight: "6px" }}>{c.icon}</span>
                {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   INLINE EDITABLE CELL
   ═══════════════════════════════════════ */

function EditableCell({ value, onSave, placeholder, style: cellStyle }: { value: string; onSave: (v: string) => void; placeholder?: string; style?: React.CSSProperties }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setText(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = () => {
    setEditing(false);
    if (text.trim() !== value) onSave(text.trim());
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setText(value); setEditing(false); } }}
        style={{
          background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.2)",
          color: "#e2e8f0", fontSize: "13px", padding: "4px 8px",
          outline: "none", width: "100%", borderRadius: "3px",
          ...cellStyle,
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        cursor: "text", padding: "4px 8px", borderRadius: "3px",
        minHeight: "28px", display: "flex", alignItems: "center",
        transition: "background 0.15s", fontSize: "13px",
        color: value ? "#e2e8f0" : "rgba(148,163,184,0.3)",
        ...cellStyle,
      }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {value || placeholder || "—"}
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN OPS PAGE
   ═══════════════════════════════════════ */

export default function OpsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [addingInGroup, setAddingInGroup] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const newTaskRef = useRef<HTMLInputElement>(null);

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
  useEffect(() => { if (addingInGroup) newTaskRef.current?.focus(); }, [addingInGroup]);

  // ── CRUD ──
  const handleCreate = async (status: string) => {
    if (!newTaskTitle.trim()) return;
    try {
      const res = await fetch("/api/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle.trim(), status }),
      });
      const data = await res.json();
      if (res.ok) setTasks(prev => [...prev, data.data]);
    } catch (err) {
      console.error("[OPS] Create error:", err);
    }
    setNewTaskTitle("");
    setAddingInGroup(null);
  };

  const handlePatch = async (id: string, patch: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    try {
      await fetch(`/api/ops/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch { fetchTasks(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta tarea?")) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await fetch(`/api/ops/${id}`, { method: "DELETE" });
    } catch { fetchTasks(); }
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Counts ──
  const getCounts = (status: string) => tasks.filter(t => t.status === status).length;
  const totalTasks = tasks.length;

  // ── Filter ──
  const filteredTasks = search
    ? tasks.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.assignee && t.assignee.toLowerCase().includes(search.toLowerCase()))
      )
    : tasks;

  // ── Column headers ──
  const colHeader: React.CSSProperties = {
    fontSize: "11px", fontWeight: 600, color: "rgba(148,163,184,0.5)",
    textTransform: "uppercase" as const, letterSpacing: "0.05em",
    padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)",
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing Ops"
        description="Gestión de tareas, workflows y operaciones del equipo de marketing."
        icon={<Users className="w-6 h-6" style={{ color: "#ff2d55" }} />}
      />

      {/* ── Toolbar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: "12px", flexWrap: "wrap",
      }}>
        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "6px", padding: "6px 12px", flex: "1", maxWidth: "320px",
        }}>
          <Search style={{ width: 14, height: 14, color: "rgba(148,163,184,0.3)" }} />
          <input
            type="text"
            placeholder="Buscar tareas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: "transparent", border: "none", outline: "none",
              color: "#e2e8f0", fontSize: "13px", width: "100%",
            }}
          />
        </div>

        {/* Quick stats */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {GROUP_CONFIG.map(g => (
            <div key={g.key} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={{ width: 8, height: 8, borderRadius: "2px", background: g.color }} />
              <span style={{ fontSize: "12px", color: "rgba(148,163,184,0.5)" }}>
                {getCounts(g.key)}
              </span>
            </div>
          ))}
          <span style={{ fontSize: "11px", color: "rgba(148,163,184,0.25)", marginLeft: "4px" }}>
            Total: {totalTasks}
          </span>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Loader2 style={{ width: 24, height: 24, color: "#00d4ff", animation: "spin 1s linear infinite", margin: "0 auto" }} />
          <p style={{ fontSize: "12px", color: "rgba(148,163,184,0.3)", marginTop: "8px" }}>Cargando tasks...</p>
        </div>
      )}

      {/* ── Board Groups ── */}
      {!loading && GROUP_CONFIG.map(group => {
        const groupTasks = filteredTasks.filter(t => t.status === group.key);
        const collapsed = collapsedGroups[group.key] || false;

        return (
          <div key={group.key} style={{
            background: "rgba(255,255,255,0.015)",
            border: "1px solid rgba(255,255,255,0.04)",
            borderRadius: "8px",
            overflow: "hidden",
            transition: "all 0.2s ease",
          }}>
            {/* ── Group Header ── */}
            <div
              onClick={() => toggleGroup(group.key)}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 16px", cursor: "pointer",
                borderLeft: `4px solid ${group.color}`,
                background: "rgba(255,255,255,0.02)",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
            >
              {collapsed ? (
                <ChevronRight style={{ width: 16, height: 16, color: group.color }} />
              ) : (
                <ChevronDown style={{ width: 16, height: 16, color: group.color }} />
              )}
              <span style={{ fontSize: "14px", fontWeight: 700, color: group.color }}>
                {group.label}
              </span>
              <span style={{
                fontSize: "11px", color: "rgba(148,163,184,0.4)",
                background: "rgba(255,255,255,0.04)",
                padding: "1px 8px", borderRadius: "10px",
              }}>
                {groupTasks.length}
              </span>
            </div>

            {/* ── Table ── */}
            {!collapsed && (
              <div style={{ borderLeft: `4px solid ${group.color}` }}>
                {/* Column headers */}
                {groupTasks.length > 0 && (
                  <div className="ops-table-header" style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 140px 110px 90px 85px 40px",
                    gap: "0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    <div style={colHeader}>Tarea</div>
                    <div style={{ ...colHeader, textAlign: "center" }}>Persona</div>
                    <div style={{ ...colHeader, textAlign: "center" }}>Estado</div>
                    <div style={{ ...colHeader, textAlign: "center" }}>Prioridad</div>
                    <div style={{ ...colHeader, textAlign: "center" }}>Fecha</div>
                    <div style={colHeader}></div>
                  </div>
                )}

                {/* Rows */}
                {groupTasks.map((task, i) => (
                  <div
                    key={task.id}
                    className="ops-table-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 140px 110px 90px 85px 40px",
                      gap: "0",
                      alignItems: "center",
                      borderBottom: i < groupTasks.length - 1 ? "1px solid rgba(255,255,255,0.025)" : "none",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Title */}
                    <div style={{ padding: "6px 12px", minWidth: 0 }}>
                      <EditableCell
                        value={task.title}
                        onSave={v => handlePatch(task.id, { title: v })}
                        style={{ fontWeight: 500 }}
                      />
                      {task.description && (
                        <div style={{
                          fontSize: "11px", color: "rgba(148,163,184,0.3)",
                          padding: "0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {task.description}
                        </div>
                      )}
                    </div>

                    {/* Assignee */}
                    <div style={{ padding: "6px 8px", display: "flex", justifyContent: "center" }}>
                      <EditableCell
                        value={task.assignee || ""}
                        onSave={v => handlePatch(task.id, { assignee: v || null } as any)}
                        placeholder="Sin asignar"
                        style={{ fontSize: "12px", textAlign: "center" }}
                      />
                    </div>

                    {/* Status */}
                    <div style={{ padding: "6px 4px", display: "flex", justifyContent: "center" }}>
                      <StatusPill
                        status={task.status}
                        onChange={s => handlePatch(task.id, { status: s })}
                      />
                    </div>

                    {/* Priority */}
                    <div style={{ padding: "6px 4px", display: "flex", justifyContent: "center" }}>
                      <PriorityPill
                        priority={task.priority}
                        onChange={p => handlePatch(task.id, { priority: p })}
                      />
                    </div>

                    {/* Date */}
                    <div style={{
                      padding: "6px 8px", fontSize: "11px",
                      color: "rgba(148,163,184,0.4)", textAlign: "center",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                    }}>
                      <Calendar style={{ width: 10, height: 10 }} />
                      {formatDate(task.createdAt)}
                    </div>

                    {/* Delete */}
                    <div style={{ padding: "6px 8px", textAlign: "center" }}>
                      <button
                        onClick={() => handleDelete(task.id)}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          padding: "4px", color: "rgba(148,163,184,0.15)",
                          transition: "color 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = "#e2445c"}
                        onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,0.15)"}
                        title="Eliminar"
                      >
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* ── Add task row ── */}
                {addingInGroup === group.key ? (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 140px 110px 90px 85px 40px",
                    gap: "0", alignItems: "center",
                    borderTop: groupTasks.length > 0 ? "1px solid rgba(255,255,255,0.025)" : "none",
                    background: "rgba(255,255,255,0.02)",
                  }}>
                    <div style={{ padding: "8px 12px" }}>
                      <input
                        ref={newTaskRef}
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleCreate(group.key);
                          if (e.key === "Escape") { setAddingInGroup(null); setNewTaskTitle(""); }
                        }}
                        onBlur={() => {
                          if (newTaskTitle.trim()) handleCreate(group.key);
                          else { setAddingInGroup(null); setNewTaskTitle(""); }
                        }}
                        placeholder="Nombre de la tarea..."
                        style={{
                          width: "100%", background: "transparent",
                          border: "1px solid rgba(0,212,255,0.15)",
                          borderRadius: "3px", padding: "6px 10px",
                          color: "#e2e8f0", fontSize: "13px", outline: "none",
                        }}
                      />
                    </div>
                    <div />
                    <div />
                    <div />
                    <div />
                    <div />
                  </div>
                ) : (
                  <div
                    onClick={() => setAddingInGroup(group.key)}
                    style={{
                      padding: "10px 20px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: "6px",
                      color: "rgba(148,163,184,0.25)", fontSize: "12px",
                      borderTop: groupTasks.length > 0 ? "1px solid rgba(255,255,255,0.02)" : "none",
                      transition: "color 0.15s, background 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = group.color; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(148,163,184,0.25)"; e.currentTarget.style.background = "transparent"; }}
                  >
                    <Plus style={{ width: 13, height: 13 }} />
                    Agregar tarea
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
