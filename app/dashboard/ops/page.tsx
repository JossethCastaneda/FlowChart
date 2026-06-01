"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Users, Plus, Trash2, Loader2, ChevronDown, ChevronRight, Search,
  Calendar, X, Clock, AlertTriangle, CheckCircle2, Tag, FileText,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  tags: string[];
  createdAt: string;
}

/* ═══════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════ */

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  Backlog:  { label: "Backlog",      bg: "#c4c4c4", color: "#fff" },
  WIP:      { label: "En Progreso", bg: "#fdab3d", color: "#fff" },
  Review:   { label: "En Review",   bg: "#e2445c", color: "#fff" },
  Done:     { label: "Hecho",       bg: "#00c875", color: "#fff" },
};

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  P0: { label: "Urgente", bg: "rgba(226,68,92,0.15)", color: "#e2445c" },
  P1: { label: "Alta",    bg: "rgba(253,171,61,0.15)", color: "#fdab3d" },
  P2: { label: "Media",   bg: "rgba(86,148,251,0.15)", color: "#579bfc" },
  P3: { label: "Baja",    bg: "rgba(196,196,196,0.1)",  color: "#c4c4c4" },
};

const GROUP_CONFIG = [
  { key: "Backlog",  label: "Backlog",      color: "#c4c4c4" },
  { key: "WIP",      label: "En Progreso",  color: "#fdab3d" },
  { key: "Review",   label: "En Review",    color: "#e2445c" },
  { key: "Done",     label: "Completado",   color: "#00c875" },
];

const TAG_PRESETS = ["Contenido", "Diseño", "Pauta", "Reportes", "Estrategia", "SEO", "CRM", "Social Media", "Email", "Landing"];

const STATUSES = Object.keys(STATUS_CONFIG);
const PRIORITIES = Object.keys(PRIORITY_CONFIG);

/* ═══════════════════════════════════════
   SLA HELPERS
   ═══════════════════════════════════════ */

function getSLAStatus(dueDate: string | null, status: string): { label: string; color: string; bg: string; icon: "ok" | "warn" | "late" | "none" } {
  if (!dueDate || status === "Done") return { label: "—", color: "rgba(148,163,184,0.3)", bg: "transparent", icon: "none" };

  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.ceil(diffHours / 24);

  if (diffMs < 0) {
    const overdueDays = Math.abs(diffDays);
    return { label: `${overdueDays}d vencido`, color: "#e2445c", bg: "rgba(226,68,92,0.1)", icon: "late" };
  }
  if (diffHours <= 24) {
    return { label: "Vence hoy", color: "#fdab3d", bg: "rgba(253,171,61,0.1)", icon: "warn" };
  }
  if (diffDays <= 3) {
    return { label: `${diffDays}d restantes`, color: "#fdab3d", bg: "rgba(253,171,61,0.08)", icon: "warn" };
  }
  return { label: `${diffDays}d restantes`, color: "#00c875", bg: "rgba(0,200,117,0.08)", icon: "ok" };
}

/* ═══════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════ */

function StatusPill({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Backlog;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        padding: "4px 16px", borderRadius: "3px", background: cfg.bg, color: cfg.color,
        border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600,
        minWidth: "100px", textAlign: "center",
      }}>{cfg.label}</button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 4, zIndex: 50, background: "#1a1e2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", minWidth: 130 }}>
          {STATUSES.map(s => {
            const c = STATUS_CONFIG[s];
            return (
              <button key={s} onClick={() => { onChange(s); setOpen(false); }}
                style={{ display: "block", width: "100%", padding: "8px 12px", border: "none", cursor: "pointer", textAlign: "left", background: status === s ? "rgba(255,255,255,0.05)" : "transparent", fontSize: 12, color: "#e2e8f0" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background = status === s ? "rgba(255,255,255,0.05)" : "transparent"}>
                <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: c.bg, marginRight: 8, verticalAlign: "middle" }} />
                {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PriorityPill({ priority, onChange }: { priority: string; onChange: (p: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.P2;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        padding: "4px 12px", borderRadius: 3, background: cfg.bg, color: cfg.color,
        border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
      }}>{cfg.label}</button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 4, zIndex: 50, background: "#1a1e2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", minWidth: 120 }}>
          {PRIORITIES.map(p => {
            const c = PRIORITY_CONFIG[p];
            return (
              <button key={p} onClick={() => { onChange(p); setOpen(false); }}
                style={{ display: "block", width: "100%", padding: "8px 12px", border: "none", cursor: "pointer", textAlign: "left", background: priority === p ? "rgba(255,255,255,0.05)" : "transparent", fontSize: 12, color: "#e2e8f0" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background = priority === p ? "rgba(255,255,255,0.05)" : "transparent"}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c.color, marginRight: 6, verticalAlign: "middle" }} />
                {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EditableCell({ value, onSave, placeholder, style: cs }: { value: string; onSave: (v: string) => void; placeholder?: string; style?: React.CSSProperties }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { setText(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const save = () => { setEditing(false); if (text.trim() !== value) onSave(text.trim()); };

  if (editing) return (
    <input ref={ref} value={text} onChange={e => setText(e.target.value)}
      onBlur={save} onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setText(value); setEditing(false); } }}
      style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", color: "#e2e8f0", fontSize: 13, padding: "4px 8px", outline: "none", width: "100%", borderRadius: 3, ...cs }}
    />
  );

  return (
    <div onClick={() => setEditing(true)} style={{ cursor: "text", padding: "4px 8px", borderRadius: 3, minHeight: 28, display: "flex", alignItems: "center", transition: "background 0.15s", fontSize: 13, color: value ? "#e2e8f0" : "rgba(148,163,184,0.3)", ...cs }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      {value || placeholder || "—"}
    </div>
  );
}

/* ═══════════════════════════════════════
   TASK FORM MODAL
   ═══════════════════════════════════════ */

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", fontSize: "13px",
  background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.1)",
  color: "#e2e8f0", outline: "none", borderRadius: "3px",
};

function TaskModal({ onClose, onSave, initial }: {
  onClose: () => void;
  onSave: (data: any) => void;
  initial?: Task;
}) {
  const [form, setForm] = useState({
    title: initial?.title || "",
    description: initial?.description || "",
    assignee: initial?.assignee || "",
    priority: initial?.priority || "P2",
    status: initial?.status || "Backlog",
    dueDate: initial?.dueDate ? new Date(initial.dueDate).toISOString().split("T")[0] : "",
    tags: initial?.tags || [] as string[],
  });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]);
    setTagInput("");
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave({
      ...form,
      dueDate: form.dueDate || null,
    });
    setSaving(false);
  };

  // SLA preview
  const sla = form.dueDate ? getSLAStatus(form.dueDate, form.status) : null;

  // Priority SLA suggestions
  const suggestedDays: Record<string, number> = { P0: 1, P1: 3, P2: 7, P3: 14 };

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "5vh 16px", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: "620px", background: "rgba(8,12,24,0.97)",
        border: "1px solid rgba(0,212,255,0.12)", borderRadius: "8px",
        animation: "fadeInScale 0.25s ease-out",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid rgba(0,212,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText style={{ width: 18, height: 18, color: "#00d4ff" }} />
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "13px", fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.1em" }}>
              {initial ? "EDITAR TAREA" : "NUEVA TAREA"}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(148,163,184,0.5)", cursor: "pointer", padding: 4 }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: "24px", display: "grid", gap: "18px" }}>
          {/* Title */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "rgba(148,163,184,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Título *</label>
            <input style={inp} placeholder="¿Qué necesitas hacer?" value={form.title} onChange={e => set("title", e.target.value)} autoFocus />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "rgba(148,163,184,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Descripción</label>
            <textarea rows={3} style={{ ...inp, resize: "vertical" }} placeholder="Contexto, instrucciones, links de referencia..." value={form.description} onChange={e => set("description", e.target.value)} />
          </div>

          {/* Row: Assignee + Priority */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: "rgba(148,163,184,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Asignado a</label>
              <input style={inp} placeholder="Nombre o email" value={form.assignee} onChange={e => set("assignee", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: "rgba(148,163,184,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Prioridad</label>
              <select style={{ ...inp, cursor: "pointer" }} value={form.priority} onChange={e => set("priority", e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label} ({p})</option>)}
              </select>
            </div>
          </div>

          {/* Row: Status + Due Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: "rgba(148,163,184,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Estado</label>
              <select style={{ ...inp, cursor: "pointer" }} value={form.status} onChange={e => set("status", e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: "rgba(148,163,184,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>
                Fecha Límite (SLA)
              </label>
              <input type="date" style={{ ...inp, cursor: "pointer" }} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
              {!form.dueDate && (
                <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {Object.entries(suggestedDays).map(([p, days]) => (
                    <button key={p} onClick={() => {
                      const d = new Date(); d.setDate(d.getDate() + days);
                      set("dueDate", d.toISOString().split("T")[0]);
                    }} style={{
                      fontSize: 9, padding: "2px 8px", border: `1px solid ${PRIORITY_CONFIG[p].color}30`,
                      background: "transparent", color: PRIORITY_CONFIG[p].color, cursor: "pointer", borderRadius: 2,
                    }}>
                      {p}: {days}d
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SLA Preview */}
          {sla && sla.icon !== "none" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
              background: sla.bg, border: `1px solid ${sla.color}25`, borderRadius: 4,
            }}>
              {sla.icon === "late" && <AlertTriangle style={{ width: 14, height: 14, color: sla.color }} />}
              {sla.icon === "warn" && <Clock style={{ width: 14, height: 14, color: sla.color }} />}
              {sla.icon === "ok" && <CheckCircle2 style={{ width: 14, height: 14, color: sla.color }} />}
              <span style={{ fontSize: 12, color: sla.color, fontWeight: 600 }}>SLA: {sla.label}</span>
            </div>
          )}

          {/* Tags */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "rgba(148,163,184,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>
              <Tag style={{ width: 10, height: 10, display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              Etiquetas
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
              {form.tags.map((t, i) => (
                <span key={i} style={{ fontSize: 10, padding: "2px 8px", background: "rgba(123,97,255,0.1)", border: "1px solid rgba(123,97,255,0.2)", color: "#7b61ff", borderRadius: 2, display: "flex", alignItems: "center", gap: 4 }}>
                  {t}
                  <X style={{ width: 8, height: 8, cursor: "pointer" }} onClick={() => set("tags", form.tags.filter((_, j) => j !== i))} />
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input style={{ ...inp, flex: 1 }} placeholder="Agregar etiqueta..." value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
              {TAG_PRESETS.filter(t => !form.tags.includes(t)).slice(0, 6).map(t => (
                <button key={t} onClick={() => addTag(t)} style={{
                  fontSize: 9, padding: "2px 8px", border: "1px solid rgba(148,163,184,0.1)",
                  background: "transparent", color: "rgba(148,163,184,0.4)", cursor: "pointer", borderRadius: 2,
                  transition: "all 0.15s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(123,97,255,0.3)"; e.currentTarget.style.color = "#7b61ff"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.1)"; e.currentTarget.style.color = "rgba(148,163,184,0.4)"; }}>
                  + {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "16px 24px", borderTop: "1px solid rgba(0,212,255,0.06)" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(148,163,184,0.15)", color: "rgba(148,163,184,0.5)", cursor: "pointer", fontSize: 12, borderRadius: 3 }}>
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving || !form.title.trim()} className="btn-primary" style={{ padding: "8px 24px", opacity: saving || !form.title.trim() ? 0.5 : 1 }}>
            {saving ? "Guardando..." : initial ? "Actualizar" : "Crear Tarea"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════ */

export default function OpsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addingInGroup, setAddingInGroup] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const newTaskRef = useRef<HTMLInputElement>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/ops");
      const data = await res.json();
      if (data.data) setTasks(data.data);
    } catch (err) { console.error("[OPS] Fetch error:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { if (addingInGroup) newTaskRef.current?.focus(); }, [addingInGroup]);

  // ── CRUD ──
  const handleCreate = async (status: string) => {
    if (!newTaskTitle.trim()) return;
    try {
      const res = await fetch("/api/ops", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle.trim(), status }),
      });
      const data = await res.json();
      if (res.ok) setTasks(prev => [...prev, data.data]);
    } catch (err) { console.error("[OPS] Create error:", err); }
    setNewTaskTitle(""); setAddingInGroup(null);
  };

  const handleFullCreate = async (formData: any) => {
    try {
      const res = await fetch("/api/ops", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) { setTasks(prev => [...prev, data.data]); setShowModal(false); }
    } catch (err) { console.error("[OPS] Create error:", err); }
  };

  const handleFullUpdate = async (formData: any) => {
    if (!editingTask) return;
    try {
      const res = await fetch(`/api/ops/${editingTask.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) { setTasks(prev => prev.map(t => t.id === editingTask.id ? data.data : t)); setEditingTask(null); }
    } catch (err) { console.error("[OPS] Update error:", err); }
  };

  const handlePatch = async (id: string, patch: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    try {
      await fetch(`/api/ops/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    } catch { fetchTasks(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta tarea?")) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    try { await fetch(`/api/ops/${id}`, { method: "DELETE" }); } catch { fetchTasks(); }
  };

  const toggleGroup = (key: string) => setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Metrics ──
  const getCounts = (status: string) => tasks.filter(t => t.status === status).length;
  const overdueTasks = tasks.filter(t => t.dueDate && t.status !== "Done" && new Date(t.dueDate) < new Date()).length;
  const totalTasks = tasks.length;

  const filteredTasks = search
    ? tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || (t.assignee && t.assignee.toLowerCase().includes(search.toLowerCase())) || (t.tags && t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))))
    : tasks;

  const colHeader: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "rgba(148,163,184,0.5)",
    textTransform: "uppercase" as const, letterSpacing: "0.05em",
    padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)",
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing Ops"
        description="Gestión de tareas, workflows y operaciones del equipo de marketing."
        icon={<Users className="w-6 h-6" style={{ color: "#ff2d55" }} />}
        action={
          <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus style={{ width: 14, height: 14 }} /> Nueva Tarea
          </button>
        }
      />

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "6px 12px", flex: 1, maxWidth: 320 }}>
          <Search style={{ width: 14, height: 14, color: "rgba(148,163,184,0.3)" }} />
          <input type="text" placeholder="Buscar tareas, personas, tags..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: 13, width: "100%" }} />
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {GROUP_CONFIG.map(g => (
            <div key={g.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: g.color }} />
              <span style={{ fontSize: 12, color: "rgba(148,163,184,0.5)" }}>{getCounts(g.key)}</span>
            </div>
          ))}
          {overdueTasks > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "rgba(226,68,92,0.1)", border: "1px solid rgba(226,68,92,0.2)", borderRadius: 3 }}>
              <AlertTriangle style={{ width: 10, height: 10, color: "#e2445c" }} />
              <span style={{ fontSize: 11, color: "#e2445c", fontWeight: 600 }}>{overdueTasks} vencidas</span>
            </div>
          )}
          <span style={{ fontSize: 11, color: "rgba(148,163,184,0.25)" }}>Total: {totalTasks}</span>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Loader2 style={{ width: 24, height: 24, color: "#00d4ff", animation: "spin 1s linear infinite", margin: "0 auto" }} />
          <p style={{ fontSize: 12, color: "rgba(148,163,184,0.3)", marginTop: 8 }}>Cargando tasks...</p>
        </div>
      )}

      {/* ── Groups ── */}
      {!loading && GROUP_CONFIG.map(group => {
        const groupTasks = filteredTasks.filter(t => t.status === group.key);
        const collapsed = collapsedGroups[group.key] || false;

        return (
          <div key={group.key} style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, overflow: "hidden" }}>
            {/* Group Header */}
            <div onClick={() => toggleGroup(group.key)} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 16px", cursor: "pointer",
              borderLeft: `4px solid ${group.color}`,
              background: "rgba(255,255,255,0.02)",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}>
              {collapsed ? <ChevronRight style={{ width: 16, height: 16, color: group.color }} /> : <ChevronDown style={{ width: 16, height: 16, color: group.color }} />}
              <span style={{ fontSize: 14, fontWeight: 700, color: group.color }}>{group.label}</span>
              <span style={{ fontSize: 11, color: "rgba(148,163,184,0.4)", background: "rgba(255,255,255,0.04)", padding: "1px 8px", borderRadius: 10 }}>{groupTasks.length}</span>
            </div>

            {/* Table */}
            {!collapsed && (
              <div style={{ borderLeft: `4px solid ${group.color}` }}>
                {groupTasks.length > 0 && (
                  <div className="ops-table-header" style={{ display: "grid", gridTemplateColumns: "1fr 120px 110px 80px 100px 85px 40px", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={colHeader}>Tarea</div>
                    <div style={{ ...colHeader, textAlign: "center" }}>Persona</div>
                    <div style={{ ...colHeader, textAlign: "center" }}>Estado</div>
                    <div style={{ ...colHeader, textAlign: "center" }}>Prioridad</div>
                    <div style={{ ...colHeader, textAlign: "center" }}>SLA</div>
                    <div style={{ ...colHeader, textAlign: "center" }}>Fecha</div>
                    <div style={colHeader}></div>
                  </div>
                )}

                {groupTasks.map((task, i) => {
                  const sla = getSLAStatus(task.dueDate, task.status);
                  return (
                    <div key={task.id} className="ops-table-row" style={{
                      display: "grid", gridTemplateColumns: "1fr 120px 110px 80px 100px 85px 40px",
                      gap: 0, alignItems: "center",
                      borderBottom: i < groupTasks.length - 1 ? "1px solid rgba(255,255,255,0.025)" : "none",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                      {/* Title + tags */}
                      <div style={{ padding: "6px 12px", minWidth: 0 }} onDoubleClick={() => setEditingTask(task)}>
                        <EditableCell value={task.title} onSave={v => handlePatch(task.id, { title: v })} style={{ fontWeight: 500 }} />
                        {(task.tags?.length > 0 || task.description) && (
                          <div style={{ padding: "0 8px", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                            {task.tags?.map((t, j) => (
                              <span key={j} style={{ fontSize: 8, padding: "1px 5px", background: "rgba(123,97,255,0.08)", border: "1px solid rgba(123,97,255,0.15)", color: "rgba(123,97,255,0.6)", borderRadius: 2 }}>{t}</span>
                            ))}
                            {task.description && <span style={{ fontSize: 10, color: "rgba(148,163,184,0.25)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>{task.description}</span>}
                          </div>
                        )}
                      </div>

                      {/* Assignee */}
                      <div style={{ padding: "6px 8px", display: "flex", justifyContent: "center" }}>
                        <EditableCell value={task.assignee || ""} onSave={v => handlePatch(task.id, { assignee: v || null } as any)} placeholder="Sin asignar" style={{ fontSize: 12, textAlign: "center" }} />
                      </div>

                      {/* Status */}
                      <div style={{ padding: "6px 4px", display: "flex", justifyContent: "center" }}>
                        <StatusPill status={task.status} onChange={s => handlePatch(task.id, { status: s })} />
                      </div>

                      {/* Priority */}
                      <div style={{ padding: "6px 4px", display: "flex", justifyContent: "center" }}>
                        <PriorityPill priority={task.priority} onChange={p => handlePatch(task.id, { priority: p })} />
                      </div>

                      {/* SLA */}
                      <div style={{ padding: "6px 4px", display: "flex", justifyContent: "center" }}>
                        {sla.icon !== "none" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: sla.bg, borderRadius: 3 }}>
                            {sla.icon === "late" && <AlertTriangle style={{ width: 10, height: 10, color: sla.color }} />}
                            {sla.icon === "warn" && <Clock style={{ width: 10, height: 10, color: sla.color }} />}
                            {sla.icon === "ok" && <CheckCircle2 style={{ width: 10, height: 10, color: sla.color }} />}
                            <span style={{ fontSize: 9, color: sla.color, fontWeight: 600, whiteSpace: "nowrap" }}>{sla.label}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 10, color: "rgba(148,163,184,0.2)" }}>—</span>
                        )}
                      </div>

                      {/* Date */}
                      <div style={{ padding: "6px 8px", fontSize: 11, color: "rgba(148,163,184,0.4)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <Calendar style={{ width: 10, height: 10 }} />
                        {formatDate(task.createdAt)}
                      </div>

                      {/* Delete */}
                      <div style={{ padding: "6px 8px", textAlign: "center" }}>
                        <button onClick={() => handleDelete(task.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "rgba(148,163,184,0.15)" }}
                          onMouseEnter={e => e.currentTarget.style.color = "#e2445c"}
                          onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,0.15)"} title="Eliminar">
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add task inline */}
                {addingInGroup === group.key ? (
                  <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", borderTop: groupTasks.length > 0 ? "1px solid rgba(255,255,255,0.025)" : "none", background: "rgba(255,255,255,0.02)" }}>
                    <input ref={newTaskRef} value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleCreate(group.key); if (e.key === "Escape") { setAddingInGroup(null); setNewTaskTitle(""); } }}
                      onBlur={() => { if (newTaskTitle.trim()) handleCreate(group.key); else { setAddingInGroup(null); setNewTaskTitle(""); } }}
                      placeholder="Nombre de la tarea (Enter para crear rápido, o usa + Nueva Tarea para formulario completo)"
                      style={{ flex: 1, background: "transparent", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 3, padding: "6px 10px", color: "#e2e8f0", fontSize: 13, outline: "none" }} />
                  </div>
                ) : (
                  <div onClick={() => setAddingInGroup(group.key)} style={{
                    padding: "10px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                    color: "rgba(148,163,184,0.25)", fontSize: 12,
                    borderTop: groupTasks.length > 0 ? "1px solid rgba(255,255,255,0.02)" : "none",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.color = group.color; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(148,163,184,0.25)"; e.currentTarget.style.background = "transparent"; }}>
                    <Plus style={{ width: 13, height: 13 }} /> Agregar tarea
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Modals ── */}
      {showModal && <TaskModal onClose={() => setShowModal(false)} onSave={handleFullCreate} />}
      {editingTask && <TaskModal onClose={() => setEditingTask(null)} onSave={handleFullUpdate} initial={editingTask} />}
    </div>
  );
}
