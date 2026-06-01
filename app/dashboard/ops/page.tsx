"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Users, Plus, Trash2, Loader2, ChevronDown, ChevronRight, Search,
  Calendar, X, Clock, AlertTriangle, CheckCircle2, Tag, FileText,
  LayoutGrid, List, ChevronUp,
} from "lucide-react";

/* ═══ TYPES ═══ */
interface Member { id: string; name: string; email: string | null; image: string | null; role: string }
interface Task {
  id: string; title: string; description: string | null; assignee: string | null;
  priority: string; status: string; dueDate: string | null; tags: string[];
  order: number; parentId: string | null; children: Task[]; createdAt: string;
}

/* ═══ CONFIG ═══ */
const STATUS_CFG: Record<string, { label: string; bg: string; c: string }> = {
  Backlog: { label: "Backlog", bg: "#c4c4c4", c: "#fff" },
  WIP:     { label: "En Progreso", bg: "#fdab3d", c: "#fff" },
  Review:  { label: "En Review", bg: "#e2445c", c: "#fff" },
  Done:    { label: "Hecho", bg: "#00c875", c: "#fff" },
};
const PRIO_CFG: Record<string, { label: string; bg: string; c: string }> = {
  P0: { label: "Urgente", bg: "rgba(226,68,92,0.15)", c: "#e2445c" },
  P1: { label: "Alta", bg: "rgba(253,171,61,0.15)", c: "#fdab3d" },
  P2: { label: "Media", bg: "rgba(86,148,251,0.15)", c: "#579bfc" },
  P3: { label: "Baja", bg: "rgba(196,196,196,0.1)", c: "#c4c4c4" },
};
const GROUPS = [
  { key: "Backlog", label: "Backlog", color: "#c4c4c4" },
  { key: "WIP", label: "En Progreso", color: "#fdab3d" },
  { key: "Review", label: "En Review", color: "#e2445c" },
  { key: "Done", label: "Completado", color: "#00c875" },
];
const STATUSES = Object.keys(STATUS_CFG);
const PRIORITIES = Object.keys(PRIO_CFG);
const TAG_PRESETS = ["Contenido", "Diseño", "Pauta", "Reportes", "Estrategia", "SEO", "CRM", "Social Media"];

/* ═══ SLA ═══ */
function sla(due: string | null, st: string) {
  if (!due || st === "Done") return { l: "—", c: "rgba(148,163,184,0.3)", bg: "transparent", i: "none" as const };
  const d = (new Date(due).getTime() - Date.now()) / 36e5;
  const days = Math.ceil(d / 24);
  if (d < 0) return { l: `${Math.abs(days)}d vencido`, c: "#e2445c", bg: "rgba(226,68,92,0.1)", i: "late" as const };
  if (d <= 24) return { l: "Vence hoy", c: "#fdab3d", bg: "rgba(253,171,61,0.1)", i: "warn" as const };
  if (days <= 3) return { l: `${days}d`, c: "#fdab3d", bg: "rgba(253,171,61,0.08)", i: "warn" as const };
  return { l: `${days}d`, c: "#00c875", bg: "rgba(0,200,117,0.08)", i: "ok" as const };
}

/* ═══ DROPDOWN ═══ */
function Dropdown({ trigger, children }: { trigger: React.ReactNode; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 4, zIndex: 50, background: "#1a1e2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", minWidth: 130, maxHeight: 240, overflowY: "auto" }}>{children(() => setOpen(false))}</div>}
    </div>
  );
}

function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return <span style={{ padding: "4px 14px", borderRadius: 3, background: bg, color, fontSize: 12, fontWeight: 600, textAlign: "center", minWidth: 80, display: "inline-block", cursor: "pointer" }}>{label}</span>;
}

function DropdownOption({ label, active, color, onClick }: { label: string; active: boolean; color?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "block", width: "100%", padding: "8px 12px", border: "none", cursor: "pointer", textAlign: "left", background: active ? "rgba(255,255,255,0.05)" : "transparent", fontSize: 12, color: "#e2e8f0" }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
      onMouseLeave={e => e.currentTarget.style.background = active ? "rgba(255,255,255,0.05)" : "transparent"}>
      {color && <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: color, marginRight: 8, verticalAlign: "middle" }} />}
      {label}
    </button>
  );
}

function EditableCell({ value, onSave, placeholder }: { value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { setText(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const save = () => { setEditing(false); if (text.trim() !== value) onSave(text.trim()); };
  if (editing) return <input ref={ref} value={text} onChange={e => setText(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setText(value); setEditing(false); } }} style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", color: "#e2e8f0", fontSize: 13, padding: "4px 8px", outline: "none", width: "100%", borderRadius: 3 }} />;
  return <div onClick={() => setEditing(true)} style={{ cursor: "text", padding: "4px 8px", borderRadius: 3, minHeight: 28, display: "flex", alignItems: "center", fontSize: 13, color: value ? "#e2e8f0" : "rgba(148,163,184,0.3)" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{value || placeholder || "—"}</div>;
}

/* ═══ TASK MODAL ═══ */
const inp: React.CSSProperties = { width: "100%", padding: "10px 14px", fontSize: 13, background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.1)", color: "#e2e8f0", outline: "none", borderRadius: 3 };
const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "rgba(148,163,184,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, display: "block" };

function TaskModal({ onClose, onSave, initial, members }: { onClose: () => void; onSave: (d: any) => void; initial?: Task; members: Member[] }) {
  const [form, setForm] = useState({
    title: initial?.title || "", description: initial?.description || "", assignee: initial?.assignee || "",
    priority: initial?.priority || "P2", status: initial?.status || "Backlog",
    dueDate: initial?.dueDate ? new Date(initial.dueDate).toISOString().split("T")[0] : "", tags: initial?.tags || [] as string[],
  });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const addTag = (t: string) => { const s = t.trim(); if (s && !form.tags.includes(s)) set("tags", [...form.tags, s]); setTagInput(""); };
  const submit = async () => { if (!form.title.trim()) return; setSaving(true); await onSave({ ...form, dueDate: form.dueDate || null }); setSaving(false); };
  const sl = form.dueDate ? sla(form.dueDate, form.status) : null;
  const sd: Record<string, number> = { P0: 1, P1: 3, P2: 7, P3: 14 };

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "5vh 16px", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 620, background: "rgba(8,12,24,0.97)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 8, animation: "fadeInScale 0.25s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid rgba(0,212,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileText style={{ width: 18, height: 18, color: "#00d4ff" }} />
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.1em" }}>{initial ? "EDITAR TAREA" : "NUEVA TAREA"}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(148,163,184,0.5)", cursor: "pointer", padding: 4 }}><X style={{ width: 18, height: 18 }} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 18 }}>
          <div><label style={lbl}>Título *</label><input style={inp} placeholder="¿Qué necesitas hacer?" value={form.title} onChange={e => set("title", e.target.value)} autoFocus /></div>
          <div><label style={lbl}>Descripción</label><textarea rows={3} style={{ ...inp, resize: "vertical" }} placeholder="Contexto, instrucciones, links..." value={form.description} onChange={e => set("description", e.target.value)} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Asignado a</label>
              <select style={{ ...inp, cursor: "pointer" }} value={form.assignee} onChange={e => set("assignee", e.target.value)}>
                <option value="">Sin asignar</option>
                {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Prioridad</label><select style={{ ...inp, cursor: "pointer" }} value={form.priority} onChange={e => set("priority", e.target.value)}>{PRIORITIES.map(p => <option key={p} value={p}>{PRIO_CFG[p].label}</option>)}</select></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Estado</label><select style={{ ...inp, cursor: "pointer" }} value={form.status} onChange={e => set("status", e.target.value)}>{STATUSES.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}</select></div>
            <div>
              <label style={lbl}>Fecha Límite (SLA)</label>
              <input type="date" style={{ ...inp, cursor: "pointer" }} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
              {!form.dueDate && <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>{Object.entries(sd).map(([p, d]) => <button key={p} onClick={() => { const dt = new Date(); dt.setDate(dt.getDate() + d); set("dueDate", dt.toISOString().split("T")[0]); }} style={{ fontSize: 9, padding: "2px 8px", border: `1px solid ${PRIO_CFG[p].c}30`, background: "transparent", color: PRIO_CFG[p].c, cursor: "pointer", borderRadius: 2 }}>{p}: {d}d</button>)}</div>}
            </div>
          </div>
          {sl && sl.i !== "none" && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: sl.bg, border: `1px solid ${sl.c}25`, borderRadius: 4 }}>
            {sl.i === "late" && <AlertTriangle style={{ width: 14, height: 14, color: sl.c }} />}{sl.i === "warn" && <Clock style={{ width: 14, height: 14, color: sl.c }} />}{sl.i === "ok" && <CheckCircle2 style={{ width: 14, height: 14, color: sl.c }} />}
            <span style={{ fontSize: 12, color: sl.c, fontWeight: 600 }}>SLA: {sl.l}</span>
          </div>}
          <div>
            <label style={lbl}><Tag style={{ width: 10, height: 10, display: "inline", verticalAlign: "middle", marginRight: 4 }} />Etiquetas</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>{form.tags.map((t, i) => <span key={i} style={{ fontSize: 10, padding: "2px 8px", background: "rgba(123,97,255,0.1)", border: "1px solid rgba(123,97,255,0.2)", color: "#7b61ff", borderRadius: 2, display: "flex", alignItems: "center", gap: 4 }}>{t}<X style={{ width: 8, height: 8, cursor: "pointer" }} onClick={() => set("tags", form.tags.filter((_, j) => j !== i))} /></span>)}</div>
            <input style={inp} placeholder="Agregar etiqueta..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>{TAG_PRESETS.filter(t => !form.tags.includes(t)).slice(0, 6).map(t => <button key={t} onClick={() => addTag(t)} style={{ fontSize: 9, padding: "2px 8px", border: "1px solid rgba(148,163,184,0.1)", background: "transparent", color: "rgba(148,163,184,0.4)", cursor: "pointer", borderRadius: 2 }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(123,97,255,0.3)"; e.currentTarget.style.color = "#7b61ff"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.1)"; e.currentTarget.style.color = "rgba(148,163,184,0.4)"; }}>+ {t}</button>)}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "16px 24px", borderTop: "1px solid rgba(0,212,255,0.06)" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(148,163,184,0.15)", color: "rgba(148,163,184,0.5)", cursor: "pointer", fontSize: 12, borderRadius: 3 }}>Cancelar</button>
          <button onClick={submit} disabled={saving || !form.title.trim()} className="btn-primary" style={{ padding: "8px 24px", opacity: saving || !form.title.trim() ? 0.5 : 1 }}>{saving ? "Guardando..." : initial ? "Actualizar" : "Crear Tarea"}</button>
        </div>
      </div>
    </div>, document.body
  );
}

/* ═══ KANBAN CARD ═══ */
function KanbanCard({ task, onPatch, onDelete, onEdit }: { task: Task; onPatch: (id: string, p: any) => void; onDelete: (id: string) => void; onEdit: (t: Task) => void }) {
  const sl = sla(task.dueDate, task.status);
  const pri = PRIO_CFG[task.priority] || PRIO_CFG.P2;
  const childDone = task.children?.filter(c => c.status === "Done").length || 0;
  const childTotal = task.children?.length || 0;

  return (
    <div onClick={() => onEdit(task)} style={{
      background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6,
      padding: "12px 14px", cursor: "pointer", transition: "all 0.15s",
      borderLeft: `3px solid ${pri.c}`,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0", marginBottom: 8, lineHeight: 1.4 }}>{task.title}</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 2, background: pri.bg, color: pri.c, fontWeight: 600 }}>{pri.label}</span>
        {task.assignee && <span style={{ fontSize: 10, color: "rgba(148,163,184,0.5)" }}>{task.assignee}</span>}
        {sl.i !== "none" && <span style={{ fontSize: 9, color: sl.c, fontWeight: 600 }}>{sl.l}</span>}
      </div>
      {task.tags?.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 6 }}>{task.tags.map((t, i) => <span key={i} style={{ fontSize: 8, padding: "1px 5px", background: "rgba(123,97,255,0.08)", color: "rgba(123,97,255,0.5)", borderRadius: 2 }}>{t}</span>)}</div>}
      {childTotal > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(148,163,184,0.4)", marginBottom: 3 }}>
            <span>Subtareas</span><span>{childDone}/{childTotal}</span>
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(childDone / childTotal) * 100}%`, background: "#00c875", borderRadius: 2, transition: "width 0.3s" }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function OpsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "kanban">("table");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [addingSubIn, setAddingSubIn] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const newRef = useRef<HTMLInputElement>(null);
  const subRef = useRef<HTMLInputElement>(null);

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch("/api/ops"); const d = await r.json();
      if (d.data) setTasks(d.data);
      if (d.members) setMembers(d.members);
    } catch (e) { console.error("[OPS]", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => { if (addingIn) newRef.current?.focus(); }, [addingIn]);
  useEffect(() => { if (addingSubIn) subRef.current?.focus(); }, [addingSubIn]);

  // CRUD
  const create = async (status: string) => {
    if (!newTitle.trim()) return;
    try { const r = await fetch("/api/ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle.trim(), status }) }); const d = await r.json(); if (r.ok) setTasks(p => [...p, d.data]); } catch {}
    setNewTitle(""); setAddingIn(null);
  };
  const createSub = async (parentId: string) => {
    if (!newTitle.trim()) return;
    try { const r = await fetch("/api/ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle.trim(), parentId, status: "Backlog" }) }); const d = await r.json(); if (r.ok) setTasks(p => p.map(t => t.id === parentId ? { ...t, children: [...(t.children || []), d.data] } : t)); } catch {}
    setNewTitle(""); setAddingSubIn(null);
  };
  const fullCreate = async (data: any) => {
    try { const r = await fetch("/api/ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); const d = await r.json(); if (r.ok) { setTasks(p => [...p, d.data]); setShowModal(false); } } catch {}
  };
  const fullUpdate = async (data: any) => {
    if (!editTask) return;
    try { const r = await fetch(`/api/ops/${editTask.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); const d = await r.json(); if (r.ok) { setTasks(p => p.map(t => t.id === editTask.id ? d.data : t)); setEditTask(null); } } catch {}
  };
  const patch = async (id: string, p: any) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...p } : t));
    try { await fetch(`/api/ops/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) }); } catch { fetch_(); }
  };
  const del = async (id: string) => {
    if (!confirm("¿Eliminar?")) return;
    setTasks(p => p.filter(t => t.id !== id));
    try { await fetch(`/api/ops/${id}`, { method: "DELETE" }); } catch { fetch_(); }
  };

  // Metrics
  const cnt = (s: string) => tasks.filter(t => t.status === s).length;
  const overdue = tasks.filter(t => t.dueDate && t.status !== "Done" && new Date(t.dueDate) < new Date()).length;
  const done = cnt("Done");
  const total = tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const filtered = useMemo(() => {
    if (!search) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(t => t.title.toLowerCase().includes(q) || t.assignee?.toLowerCase().includes(q) || t.tags?.some(tg => tg.toLowerCase().includes(q)));
  }, [tasks, search]);

  const fmt = (d: string) => new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
  const ch: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "rgba(148,163,184,0.5)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)" };

  return (
    <div className="space-y-6">
      <PageHeader title="Marketing Ops" description="Gestión de tareas, workflows y operaciones del equipo de marketing."
        icon={<Users className="w-6 h-6" style={{ color: "#ff2d55" }} />}
        action={<button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}><Plus style={{ width: 14, height: 14 }} /> Nueva Tarea</button>} />

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Tareas", value: total, color: "#579bfc", icon: <FileText style={{ width: 16, height: 16 }} /> },
          { label: "Completadas", value: done, color: "#00c875", icon: <CheckCircle2 style={{ width: 16, height: 16 }} /> },
          { label: "SLA Vencido", value: overdue, color: "#e2445c", icon: <AlertTriangle style={{ width: 16, height: 16 }} /> },
          { label: "Productividad", value: `${pct}%`, color: pct >= 70 ? "#00c875" : pct >= 40 ? "#fdab3d" : "#e2445c", icon: <Clock style={{ width: 16, height: 16 }} /> },
        ].map(k => (
          <div key={k.label} className="glass-panel" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ color: k.color, opacity: 0.7 }}>{k.icon}</div>
            <div>
              <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, fontWeight: 700, color: k.color }}>{loading ? "—" : k.value}</p>
              <p style={{ fontSize: 9, color: "rgba(148,163,184,0.4)", fontFamily: "'Orbitron',sans-serif", letterSpacing: "0.12em", marginTop: 2 }}>{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "6px 12px", flex: 1, maxWidth: 320 }}>
          <Search style={{ width: 14, height: 14, color: "rgba(148,163,184,0.3)" }} />
          <input type="text" placeholder="Buscar tareas, personas, tags..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: 13, width: "100%" }} />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["table", "kanban"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "6px 10px", background: view === v ? "rgba(0,212,255,0.1)" : "transparent", border: `1px solid ${view === v ? "rgba(0,212,255,0.25)" : "rgba(255,255,255,0.06)"}`, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: view === v ? "#00d4ff" : "rgba(148,163,184,0.4)", fontSize: 11, fontWeight: 600 }}>
              {v === "table" ? <List style={{ width: 13, height: 13 }} /> : <LayoutGrid style={{ width: 13, height: 13 }} />}
              {v === "table" ? "Tabla" : "Kanban"}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: "60px 0" }}><Loader2 style={{ width: 24, height: 24, color: "#00d4ff", animation: "spin 1s linear infinite", margin: "0 auto" }} /></div>}

      {/* ════════ TABLE VIEW ════════ */}
      {!loading && view === "table" && GROUPS.map(g => {
        const gt = filtered.filter(t => t.status === g.key);
        const coll = collapsed[g.key];
        const doneCount = gt.filter(t => t.status === "Done" || t.children?.every(c => c.status === "Done")).length;
        const progressPct = gt.length > 0 ? Math.round((doneCount / gt.length) * 100) : 0;

        return (
          <div key={g.key} style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, overflow: "hidden" }}>
            {/* Group Header */}
            <div onClick={() => setCollapsed(p => ({ ...p, [g.key]: !p[g.key] }))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", borderLeft: `4px solid ${g.color}`, background: "rgba(255,255,255,0.02)" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}>
              {coll ? <ChevronRight style={{ width: 16, height: 16, color: g.color }} /> : <ChevronDown style={{ width: 16, height: 16, color: g.color }} />}
              <span style={{ fontSize: 14, fontWeight: 700, color: g.color }}>{g.label}</span>
              <span style={{ fontSize: 11, color: "rgba(148,163,184,0.4)", background: "rgba(255,255,255,0.04)", padding: "1px 8px", borderRadius: 10 }}>{gt.length}</span>
              {/* Progress bar */}
              {gt.length > 0 && <div style={{ flex: 1, maxWidth: 120, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden", marginLeft: 8 }}>
                <div style={{ height: "100%", width: `${progressPct}%`, background: g.color, borderRadius: 2, transition: "width 0.3s" }} />
              </div>}
              {gt.length > 0 && <span style={{ fontSize: 9, color: "rgba(148,163,184,0.3)" }}>{progressPct}%</span>}
            </div>

            {!coll && (
              <div style={{ borderLeft: `4px solid ${g.color}` }}>
                {gt.length > 0 && (
                  <div className="ops-table-header" style={{ display: "grid", gridTemplateColumns: "1fr 120px 110px 80px 90px 75px 36px", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={ch}>Tarea</div><div style={{ ...ch, textAlign: "center" }}>Persona</div><div style={{ ...ch, textAlign: "center" }}>Estado</div><div style={{ ...ch, textAlign: "center" }}>Prioridad</div><div style={{ ...ch, textAlign: "center" }}>SLA</div><div style={{ ...ch, textAlign: "center" }}>Fecha</div><div style={ch}></div>
                  </div>
                )}

                {gt.map((task, i) => {
                  const sl = sla(task.dueDate, task.status);
                  const hasChildren = task.children?.length > 0;
                  const isExpanded = expanded[task.id];
                  const childDone = task.children?.filter(c => c.status === "Done").length || 0;

                  return (
                    <div key={task.id}>
                      {/* Main row */}
                      <div className="ops-table-row" style={{ display: "grid", gridTemplateColumns: "1fr 120px 110px 80px 90px 75px 36px", gap: 0, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.025)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ padding: "6px 10px", minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
                          {hasChildren ? (
                            <button onClick={() => setExpanded(p => ({ ...p, [task.id]: !p[task.id] }))} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "rgba(148,163,184,0.4)", flexShrink: 0 }}>
                              {isExpanded ? <ChevronDown style={{ width: 12, height: 12 }} /> : <ChevronRight style={{ width: 12, height: 12 }} />}
                            </button>
                          ) : <div style={{ width: 16 }} />}
                          <div style={{ minWidth: 0, flex: 1 }} onDoubleClick={() => setEditTask(task)}>
                            <EditableCell value={task.title} onSave={v => patch(task.id, { title: v })} />
                            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 8px", flexWrap: "wrap" }}>
                              {task.tags?.map((t, j) => <span key={j} style={{ fontSize: 8, padding: "1px 5px", background: "rgba(123,97,255,0.08)", color: "rgba(123,97,255,0.5)", borderRadius: 2 }}>{t}</span>)}
                              {hasChildren && <span style={{ fontSize: 8, color: "rgba(148,163,184,0.3)" }}>{childDone}/{task.children.length} subtareas</span>}
                            </div>
                          </div>
                        </div>
                        <div style={{ padding: "6px 4px", display: "flex", justifyContent: "center" }}>
                          <Dropdown trigger={<span style={{ fontSize: 12, color: task.assignee ? "#e2e8f0" : "rgba(148,163,184,0.25)", cursor: "pointer", padding: "4px 8px" }}>{task.assignee || "—"}</span>}>
                            {(close) => <>{[{ name: "", label: "Sin asignar" }, ...members.map(m => ({ name: m.name, label: m.name }))].map(m => <DropdownOption key={m.name} label={m.label} active={task.assignee === m.name} onClick={() => { patch(task.id, { assignee: m.name || null }); close(); }} />)}</>}
                          </Dropdown>
                        </div>
                        <div style={{ padding: "6px 4px", display: "flex", justifyContent: "center" }}>
                          <Dropdown trigger={<Pill label={STATUS_CFG[task.status]?.label || task.status} bg={STATUS_CFG[task.status]?.bg || "#c4c4c4"} color={STATUS_CFG[task.status]?.c || "#fff"} />}>
                            {(close) => <>{STATUSES.map(s => <DropdownOption key={s} label={STATUS_CFG[s].label} color={STATUS_CFG[s].bg} active={task.status === s} onClick={() => { patch(task.id, { status: s }); close(); }} />)}</>}
                          </Dropdown>
                        </div>
                        <div style={{ padding: "6px 4px", display: "flex", justifyContent: "center" }}>
                          <Dropdown trigger={<Pill label={PRIO_CFG[task.priority]?.label || task.priority} bg={PRIO_CFG[task.priority]?.bg || ""} color={PRIO_CFG[task.priority]?.c || "#c4c4c4"} />}>
                            {(close) => <>{PRIORITIES.map(p => <DropdownOption key={p} label={PRIO_CFG[p].label} color={PRIO_CFG[p].c} active={task.priority === p} onClick={() => { patch(task.id, { priority: p }); close(); }} />)}</>}
                          </Dropdown>
                        </div>
                        <div style={{ padding: "6px 4px", display: "flex", justifyContent: "center" }}>
                          {sl.i !== "none" ? <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 6px", background: sl.bg, borderRadius: 3 }}>
                            {sl.i === "late" && <AlertTriangle style={{ width: 9, height: 9, color: sl.c }} />}{sl.i === "warn" && <Clock style={{ width: 9, height: 9, color: sl.c }} />}{sl.i === "ok" && <CheckCircle2 style={{ width: 9, height: 9, color: sl.c }} />}
                            <span style={{ fontSize: 9, color: sl.c, fontWeight: 600, whiteSpace: "nowrap" }}>{sl.l}</span>
                          </div> : <span style={{ fontSize: 10, color: "rgba(148,163,184,0.2)" }}>—</span>}
                        </div>
                        <div style={{ padding: "6px 4px", fontSize: 10, color: "rgba(148,163,184,0.35)", textAlign: "center" }}>{fmt(task.createdAt)}</div>
                        <div style={{ padding: "6px 4px", textAlign: "center" }}>
                          <button onClick={() => del(task.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 3, color: "rgba(148,163,184,0.15)" }}
                            onMouseEnter={e => e.currentTarget.style.color = "#e2445c"} onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,0.15)"}><Trash2 style={{ width: 12, height: 12 }} /></button>
                        </div>
                      </div>

                      {/* Subitems */}
                      {isExpanded && task.children?.map(sub => {
                        const ssl = sla(sub.dueDate, sub.status);
                        return (
                          <div key={sub.id} className="ops-table-row" style={{ display: "grid", gridTemplateColumns: "1fr 120px 110px 80px 90px 75px 36px", gap: 0, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.015)", background: "rgba(255,255,255,0.01)" }}>
                            <div style={{ padding: "4px 10px 4px 42px", minWidth: 0 }}>
                              <EditableCell value={sub.title} onSave={v => patch(sub.id, { title: v })} />
                            </div>
                            <div style={{ padding: "4px 4px", display: "flex", justifyContent: "center" }}><span style={{ fontSize: 11, color: "rgba(148,163,184,0.35)" }}>{sub.assignee || "—"}</span></div>
                            <div style={{ padding: "4px 4px", display: "flex", justifyContent: "center" }}>
                              <Dropdown trigger={<Pill label={STATUS_CFG[sub.status]?.label || sub.status} bg={STATUS_CFG[sub.status]?.bg || "#c4c4c4"} color={STATUS_CFG[sub.status]?.c || "#fff"} />}>
                                {(close) => <>{STATUSES.map(s => <DropdownOption key={s} label={STATUS_CFG[s].label} color={STATUS_CFG[s].bg} active={sub.status === s} onClick={() => { patch(sub.id, { status: s }); close(); setTasks(p => p.map(t => t.id === task.id ? { ...t, children: t.children.map(c => c.id === sub.id ? { ...c, status: s } : c) } : t)); }} />)}</>}
                              </Dropdown>
                            </div>
                            <div /><div /><div />
                            <div style={{ padding: "4px 4px", textAlign: "center" }}>
                              <button onClick={() => del(sub.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 3, color: "rgba(148,163,184,0.1)" }}
                                onMouseEnter={e => e.currentTarget.style.color = "#e2445c"} onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,0.1)"}><Trash2 style={{ width: 11, height: 11 }} /></button>
                            </div>
                          </div>
                        );
                      })}
                      {isExpanded && (
                        addingSubIn === task.id ? (
                          <div style={{ padding: "6px 10px 6px 42px", background: "rgba(255,255,255,0.01)" }}>
                            <input ref={subRef} value={newTitle} onChange={e => setNewTitle(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") createSub(task.id); if (e.key === "Escape") { setAddingSubIn(null); setNewTitle(""); } }}
                              onBlur={() => { if (newTitle.trim()) createSub(task.id); else { setAddingSubIn(null); setNewTitle(""); } }}
                              placeholder="Agregar subtarea..." style={{ width: "60%", background: "transparent", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 3, padding: "4px 8px", color: "#e2e8f0", fontSize: 12, outline: "none" }} />
                          </div>
                        ) : (
                          <div onClick={() => { setAddingSubIn(task.id); setNewTitle(""); }} style={{ padding: "6px 10px 6px 42px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "rgba(148,163,184,0.2)", fontSize: 11 }}
                            onMouseEnter={e => e.currentTarget.style.color = "#00d4ff"} onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,0.2)"}>
                            <Plus style={{ width: 11, height: 11 }} /> Subtarea
                          </div>
                        )
                      )}
                    </div>
                  );
                })}

                {/* Add task */}
                {addingIn === g.key ? (
                  <div style={{ padding: "8px 12px 8px 28px", borderTop: gt.length > 0 ? "1px solid rgba(255,255,255,0.025)" : "none", background: "rgba(255,255,255,0.02)" }}>
                    <input ref={newRef} value={newTitle} onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") create(g.key); if (e.key === "Escape") { setAddingIn(null); setNewTitle(""); } }}
                      onBlur={() => { if (newTitle.trim()) create(g.key); else { setAddingIn(null); setNewTitle(""); } }}
                      placeholder="Nombre de la tarea..." style={{ width: "100%", background: "transparent", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 3, padding: "6px 10px", color: "#e2e8f0", fontSize: 13, outline: "none" }} />
                  </div>
                ) : (
                  <div onClick={() => { setAddingIn(g.key); setNewTitle(""); }} style={{ padding: "10px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "rgba(148,163,184,0.25)", fontSize: 12, borderTop: gt.length > 0 ? "1px solid rgba(255,255,255,0.02)" : "none" }}
                    onMouseEnter={e => { e.currentTarget.style.color = g.color; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(148,163,184,0.25)"; e.currentTarget.style.background = "transparent"; }}>
                    <Plus style={{ width: 13, height: 13 }} /> Agregar tarea
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* ════════ KANBAN VIEW ════════ */}
      {!loading && view === "kanban" && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${GROUPS.length}, 1fr)`, gap: 12, minHeight: 400 }}>
          {GROUPS.map(g => {
            const gt = filtered.filter(t => t.status === g.key);
            return (
              <div key={g.key} style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, borderTop: `3px solid ${g.color}`, display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: g.color }}>{g.label}</span>
                    <span style={{ fontSize: 10, color: "rgba(148,163,184,0.4)", background: "rgba(255,255,255,0.04)", padding: "1px 6px", borderRadius: 8 }}>{gt.length}</span>
                  </div>
                  <button onClick={() => { setAddingIn(g.key); setNewTitle(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(148,163,184,0.25)", padding: 2 }}
                    onMouseEnter={e => e.currentTarget.style.color = g.color} onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,0.25)"}>
                    <Plus style={{ width: 14, height: 14 }} />
                  </button>
                </div>
                <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 8, flex: 1, overflowY: "auto" }}>
                  {gt.map(t => <KanbanCard key={t.id} task={t} onPatch={patch} onDelete={del} onEdit={setEditTask} />)}
                  {addingIn === g.key && (
                    <input ref={newRef} value={newTitle} onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") create(g.key); if (e.key === "Escape") { setAddingIn(null); setNewTitle(""); } }}
                      onBlur={() => { if (newTitle.trim()) create(g.key); else { setAddingIn(null); setNewTitle(""); } }}
                      placeholder="Nombre..." style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "8px 10px", color: "#e2e8f0", fontSize: 12, outline: "none" }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showModal && <TaskModal onClose={() => setShowModal(false)} onSave={fullCreate} members={members} />}
      {editTask && <TaskModal onClose={() => setEditTask(null)} onSave={fullUpdate} initial={editTask} members={members} />}
    </div>
  );
}
