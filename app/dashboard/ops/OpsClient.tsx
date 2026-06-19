"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Users, Plus, Trash2, Loader2, ChevronDown, ChevronRight, Search,
  Calendar as CalendarIcon, X, Clock, AlertTriangle, CheckCircle2, Tag, FileText,
  LayoutGrid, List, ChevronLeft, MessageSquare, Paperclip, History,
  Send, Upload, ExternalLink, Image as ImageIcon, CheckSquare, Square, Target, TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSession } from "next-auth/react";
import { parseWorkflow, findUserArea, estimateEtaHours, etaDate, getPermissions, type WorkflowConfig, type Area, type AreaPermissions } from "@/lib/workflow-config";
import { useLanguage } from "@/components/layout/LanguageContext";

/* ═══ TYPES ═══ */
interface Member { id: string; name: string; email: string | null; image: string | null; role: string; activityStatus?: string }
const STATUS_DOT: Record<string, string> = { disponible: "#00c875", ocupado: "#fdab3d", ausente: "#e2445c", offline: "#64748b" };
interface Comment { id: string; userId: string; userName: string; userImage: string | null; content: string; createdAt: string }
interface Activity { id: string; userName: string; action: string; field: string | null; oldValue: string | null; newValue: string | null; createdAt: string }
interface Attachment { name: string; url: string; type: string; size: number; uploadedAt: string }
interface Task {
  id: string; title: string; description: string | null; assignee: string | null; assigneeId?: string | null;
  priority: string; status: string; dueDate: string | null; tags: string[];
  order: number; parentId: string | null; children: Task[]; createdAt: string;
  closedAt?: string | null;
  attachments?: Attachment[];
  // Cross-area request (Capa 3)
  targetAreaId?: string | null; requestType?: string | null; requesterId?: string | null;
}

/* ═══ CONFIG ═══ */
const STATUS_CFG: Record<string, { label: string; bg: string; c: string }> = {
  Backlog: { label: "Backlog", bg: "var(--text-muted)", c: "#fff" },
  WIP:     { label: "En Progreso", bg: "var(--amber)", c: "#fff" },
  Review:  { label: "En Review", bg: "var(--red)", c: "#fff" },
  Done:    { label: "Completado", bg: "var(--emerald)", c: "#fff" },
};
const PRIO_CFG: Record<string, { label: string; bg: string; c: string }> = {
  P0: { label: "Urgente", bg: "var(--red-dim)", c: "var(--red)" },
  P1: { label: "Alta", bg: "var(--cyan-dim)", c: "var(--cyan)" },
  P2: { label: "Media", bg: "rgba(123,97,255,0.15)", c: "var(--purple)" },
  P3: { label: "Baja", bg: "rgba(148,163,184,0.1)", c: "var(--text-secondary)" },
};
const GROUPS = [
  { key: "Backlog", label: "Backlog", color: "#c4c4c4" },
  { key: "WIP", label: "En Progreso", color: "var(--amber)" },
  { key: "Review", label: "En Review", color: "var(--red)" },
  { key: "Done", label: "Completado", color: "var(--emerald)" },
];
const STATUSES = Object.keys(STATUS_CFG);
const PRIORITIES = Object.keys(PRIO_CFG);
const TAG_PRESETS = ["Contenido", "Diseño", "Pauta", "Reportes", "Estrategia", "SEO", "CRM", "Social Media"];
const GROUP_LABELS: Record<string, string> = { status: "Estado", assignee: "Responsable", priority: "Prioridad" };
const ch: React.CSSProperties = { padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase" };

const TRANSLATIONS = {
  es: {
    title: "Marketing Ops",
    subtitle: "Gestión de tareas, workflows y operaciones del equipo.",
    all: "Todas",
    myArea: "Mi Área",
    searchPlaceholder: "Buscar tareas...",
    groupBy: "Agrupar por",
    assignee: "Responsable",
    priority: "Prioridad",
    tag: "Etiqueta",
    requestsTo: "Solicitudes a",
    clearFilters: "Limpiar filtros",
    totalTasks: "Total Tareas",
    completed: "Completadas",
    overdueSla: "SLA Vencido",
    productivity: "Productividad",
    requestBtn: "Solicitud",
    newTaskBtn: "Nueva Tarea",
    readOnly: "SOLO LECTURA",
    addOption: "Agregar...",
    taskTitle: "Título",
    description: "Descripción",
    cancel: "Cancelar",
    save: "Guardar",
    update: "Actualizar",
    create: "Crear Tarea",
    subtasks: "Subtareas",
    comments: "Comentarios",
    activity: "Actividad",
    attachments: "Archivos Adjuntos",
    noComments: "Sin comentarios. Inicia la conversación.",
    noActivity: "Sin actividad registrada.",
    writeComment: "Escribe un comentario...",
    postAttach: "Pegar URL de archivo...",
    addTagPlaceholder: "Agregar etiqueta...",
    autoAssign: "⚡ Auto-asignar (recomendado)",
    dueDate: "Fecha Límite",
    status: "Estado",
    sla: "SLA",
    actions: "Acciones",
    kanbanView: "Tablero Kanban",
    tableView: "Vista Tabla",
    saving: "Guardando...",
  },
  en: {
    title: "Marketing Ops",
    subtitle: "Task management, workflows and team operations.",
    all: "All",
    myArea: "My Area",
    searchPlaceholder: "Search tasks...",
    groupBy: "Group by",
    assignee: "Assignee",
    priority: "Priority",
    tag: "Tag",
    requestsTo: "Requests to",
    clearFilters: "Clear filters",
    totalTasks: "Total Tasks",
    completed: "Completed",
    overdueSla: "Overdue SLA",
    productivity: "Productivity",
    requestBtn: "Request",
    newTaskBtn: "New Task",
    readOnly: "READ ONLY",
    addOption: "Add...",
    taskTitle: "Title",
    description: "Description",
    cancel: "Cancel",
    save: "Save",
    update: "Update",
    create: "Create Task",
    subtasks: "Subtasks",
    comments: "Comments",
    activity: "Activity",
    attachments: "Attachments",
    noComments: "No comments yet. Start the conversation.",
    noActivity: "No activity recorded.",
    writeComment: "Write a comment...",
    postAttach: "Paste file URL...",
    addTagPlaceholder: "Add tag...",
    autoAssign: "⚡ Auto-assign (recommended)",
    dueDate: "Due Date",
    status: "Status",
    sla: "SLA",
    actions: "Actions",
    kanbanView: "Kanban Board",
    tableView: "Table View",
    saving: "Saving...",
  }
};

/* ═══ HELPERS ═══ */
function sla(due: string | null, st: string, lang: "es" | "en") {
  if (!due || st === "Done") return { l: "—", c: "var(--text-muted)", bg: "transparent", i: "none" as const };
  const d = (new Date(due).getTime() - Date.now()) / 36e5;
  const days = Math.ceil(d / 24);
  if (d < 0) return { l: lang === "es" ? `${Math.abs(days)}d vencido` : `${Math.abs(days)}d overdue`, c: "var(--red)", bg: "var(--red-dim)", i: "late" as const };
  if (d <= 24) return { l: lang === "es" ? "Vence hoy" : "Due today", c: "var(--amber)", bg: "rgba(253,171,61,0.1)", i: "warn" as const };
  if (days <= 3) return { l: `${days}d`, c: "var(--amber)", bg: "rgba(253,171,61,0.08)", i: "warn" as const };
  return { l: `${days}d`, c: "var(--emerald)", bg: "rgba(6,214,160,0.08)", i: "ok" as const };
}
const fmt = (d: string, lang: "es" | "en") => new Date(d).toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { day: "2-digit", month: "short" });
const timeAgo = (d: string, lang: "es" | "en") => {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return lang === "es" ? "ahora" : "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

/* ═══ SHARED UI ═══ */
function Dropdown({ trigger, children }: { trigger: React.ReactNode; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen(!open)} style={{ cursor: "pointer" }}>{trigger}</div>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
          marginTop: 4, zIndex: 150, background: "var(--surface)",
          border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)", minWidth: 150, maxHeight: 240, overflowY: "auto"
        }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return <span style={{ padding: "4px 10px", borderRadius: 4, background: bg, color, fontSize: 11, fontWeight: 700, textAlign: "center", minWidth: 85, display: "inline-block", cursor: "pointer" }}>{label}</span>;
}
function DropdownOption({ label, active, color, onClick }: { label: string; active: boolean; color?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "block", width: "100%", padding: "8px 12px", border: "none", cursor: "pointer", textAlign: "left", background: active ? "var(--surface-hover)" : "transparent", fontSize: 12, color: "var(--foreground)" }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"} onMouseLeave={e => e.currentTarget.style.background = active ? "var(--surface-hover)" : "transparent"}>
      {color && <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: color, marginRight: 8, verticalAlign: "middle" }} />}{label}
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
  if (editing) return <input ref={ref} value={text} onChange={e => setText(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setText(value); setEditing(false); } }} style={{ background: "var(--cyan-dim)", border: "1px solid var(--cyan)", color: "var(--foreground)", fontSize: 12, padding: "4px 8px", outline: "none", width: "100%", borderRadius: 4 }} />;
  return <div onClick={() => setEditing(true)} style={{ cursor: "text", padding: "4px 8px", borderRadius: 4, minHeight: 28, display: "flex", alignItems: "center", fontSize: 12, color: value ? "var(--foreground)" : "var(--text-muted)" }} onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{value || placeholder || "—"}</div>;
}

/* ═══ TASK DETAIL MODAL (with Comments, Attachments, Activity, Subtasks checklist) ═══ */
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", fontSize: 12, background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--foreground)", outline: "none", borderRadius: 4 };
const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" };

function TaskDetailModal({ task, onClose, onSave, members, onRefresh, onSubtaskCreate, onSubtaskPatch, onSubtaskDelete }: {
  task: Task; onClose: () => void; onSave: (d: any) => void; members: Member[]; onRefresh: () => void;
  onSubtaskCreate: (parentId: string, title: string) => Promise<void>;
  onSubtaskPatch: (id: string, p: any) => Promise<void>;
  onSubtaskDelete: (id: string) => Promise<void>;
}) {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];
  const [tab, setTab] = useState<"details" | "subtasks" | "comments" | "activity">("details");
  const [form, setForm] = useState({
    title: task.title, description: task.description || "", assignee: task.assignee || "", assigneeId: task.assigneeId || "",
    priority: task.priority, status: task.status,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "", tags: task.tags || [] as string[],
  });
  const [tagInput, setTagInput] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [attachUrl, setAttachUrl] = useState("");
  const commentEndRef = useRef<HTMLDivElement>(null);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const addTag = (tg: string) => { const s = tg.trim(); if (s && !form.tags.includes(s)) set("tags", [...form.tags, s]); setTagInput(""); };
  const submit = async () => { if (!form.title.trim()) return; setSaving(true); await onSave({ ...form, dueDate: form.dueDate || null }); setSaving(false); };
  const sl = form.dueDate ? sla(form.dueDate, form.status, lang) : null;

  // Load comments + activity
  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const r = await fetch(`/api/ops/${task.id}/comments`);
      const d = await r.json();
      if (d.comments) setComments(d.comments);
      if (d.activities) setActivities(d.activities);
    } catch {} finally { setLoadingComments(false); }
  }, [task.id]);

  useEffect(() => { loadComments(); }, [loadComments]);
  useEffect(() => { if (tab === "comments") setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }, [tab, comments.length]);

  const postComment = async () => {
    if (!commentText.trim()) return;
    try {
      const r = await fetch(`/api/ops/${task.id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: commentText }) });
      if (r.ok) { setCommentText(""); loadComments(); }
    } catch {}
  };

  const addAttachment = async () => {
    if (!attachUrl.trim()) return;
    const name = attachUrl.split("/").pop() || "archivo";
    const ext = name.split(".").pop()?.toLowerCase() || "";
    const type = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext) ? "image" : ["pdf"].includes(ext) ? "pdf" : "file";
    const current = (task.attachments || []) as Attachment[];
    const updated = [...current, { name, url: attachUrl.trim(), type, size: 0, uploadedAt: new Date().toISOString() }];
    try {
      await fetch(`/api/ops/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attachments: updated }) });
      setAttachUrl(""); onRefresh();
    } catch {}
  };

  const addSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    await onSubtaskCreate(task.id, newSubtaskTitle.trim());
    setNewSubtaskTitle("");
    onRefresh();
  };

  const actLabels: Record<string, string> = {
    created: lang === "es" ? "creó la tarea" : "created the task",
    status_changed: lang === "es" ? "cambió el estado" : "changed status",
    assigned: lang === "es" ? "asignó a" : "assigned to",
    priority_changed: lang === "es" ? "cambió la prioridad" : "changed priority",
    commented: lang === "es" ? "comentó" : "commented",
    attachment_added: lang === "es" ? "adjuntó archivo" : "added attachment"
  };

  const tabs = [
    { key: "details" as const, label: lang === "es" ? "Detalles" : "Details", icon: <FileText style={{ width: 12, height: 12 }} /> },
    { key: "subtasks" as const, label: `${t.subtasks} (${task.children?.length || 0})`, icon: <CheckSquare style={{ width: 12, height: 12 }} /> },
    { key: "comments" as const, label: `${t.comments} (${comments.length})`, icon: <MessageSquare style={{ width: 12, height: 12 }} /> },
    { key: "activity" as const, label: lang === "es" ? "Actividad" : "Activity", icon: <History style={{ width: 12, height: 12 }} /> },
  ];

  // Subtask progress
  const subtaskDone = task.children?.filter(c => c.status === "Done").length || 0;
  const subtaskTotal = task.children?.length || 0;
  const subtaskPct = subtaskTotal > 0 ? Math.round((subtaskDone / subtaskTotal) * 100) : 0;

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "3vh 16px", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 700, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileText style={{ width: 18, height: 18, color: "var(--cyan)" }} />
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.1em" }}>{t.title}</span>
            <Pill label={STATUS_CFG[task.status]?.label || task.status} bg={STATUS_CFG[task.status]?.bg || "var(--text-muted)"} color={STATUS_CFG[task.status]?.c || "#fff"} />
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 4 }}><X style={{ width: 18, height: 18 }} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", padding: "0 24px", background: "var(--surface-hover)" }}>
          {tabs.map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "12px 16px", border: "none", cursor: "pointer",
              background: "none", fontSize: 11, fontWeight: 600,
              color: tab === tb.key ? "var(--cyan)" : "var(--text-secondary)",
              borderBottom: tab === tb.key ? "2px solid var(--cyan)" : "2px solid transparent",
              transition: "all 0.15s",
            }}>{tb.icon}{tb.label}</button>
          ))}
        </div>

        {/* ── Details Tab ── */}
        {tab === "details" && (
          <div style={{ padding: 24, display: "grid", gap: 16, maxHeight: "60vh", overflowY: "auto" }}>
            <div><label style={lbl}>{t.taskTitle}</label><input style={inp} value={form.title} onChange={e => set("title", e.target.value)} /></div>
            <div><label style={lbl}>{t.description}</label><textarea rows={3} style={{ ...inp, resize: "vertical" }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Contexto, instrucciones, links..." /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={lbl}>{t.assignee}</label><select style={{ ...inp, cursor: "pointer" }} value={form.assigneeId} onChange={e => {
                set("assigneeId", e.target.value);
                set("assignee", members.find(m => m.id === e.target.value)?.name || "");
              }}><option value="">Sin asignar</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
              <div><label style={lbl}>{t.priority}</label><select style={{ ...inp, cursor: "pointer" }} value={form.priority} onChange={e => set("priority", e.target.value)}>{PRIORITIES.map(p => <option key={p} value={p}>{PRIO_CFG[p].label}</option>)}</select></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={lbl}>{t.status}</label><select style={{ ...inp, cursor: "pointer" }} value={form.status} onChange={e => set("status", e.target.value)}>{STATUSES.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}</select></div>
              <div><label style={lbl}>{t.dueDate}</label><input type="date" style={{ ...inp, cursor: "pointer" }} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} /></div>
            </div>
            {sl && sl.i !== "none" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: sl.bg, border: `1px solid ${sl.c}25`, borderRadius: 4 }}>
                {sl.i === "late" && <AlertTriangle style={{ width: 14, height: 14, color: sl.c }} />}
                {sl.i === "warn" && <Clock style={{ width: 14, height: 14, color: sl.c }} />}
                {sl.i === "ok" && <CheckCircle2 style={{ width: 14, height: 14, color: sl.c }} />}
                <span style={{ fontSize: 12, color: sl.c, fontWeight: 600 }}>SLA: {sl.l}</span>
              </div>
            )}
            <div>
              <label style={lbl}><Tag style={{ width: 10, height: 10, display: "inline", verticalAlign: "middle", marginRight: 4 }} />Etiquetas</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                {form.tags.map((tg, i) => <span key={i} style={{ fontSize: 10, padding: "2px 8px", background: "var(--cyan-dim)", border: "1px solid var(--border)", color: "var(--cyan)", borderRadius: 4, display: "flex", alignItems: "center", gap: 4 }}>{tg}<X style={{ width: 8, height: 8, cursor: "pointer" }} onClick={() => set("tags", form.tags.filter((_, j) => j !== i))} /></span>)}
              </div>
              <input style={inp} placeholder={t.addTagPlaceholder} value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {TAG_PRESETS.filter(tg => !form.tags.includes(tg)).slice(0, 6).map(tg => <button key={tg} onClick={() => addTag(tg)} style={{ fontSize: 9, padding: "2px 8px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", borderRadius: 4 }}>+ {tg}</button>)}
              </div>
            </div>
            {/* Attachments */}
            <div>
              <label style={lbl}><Paperclip style={{ width: 10, height: 10, display: "inline", verticalAlign: "middle", marginRight: 4 }} />{t.attachments}</label>
              {((task.attachments || []) as Attachment[]).map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--surface-hover)", border: "1px solid var(--border)", borderRadius: 6, marginBottom: 4, textDecoration: "none", color: "var(--foreground)", fontSize: 12 }}>
                  {a.type === "image" ? <ImageIcon style={{ width: 14, height: 14, color: "var(--purple)" }} /> : <FileText style={{ width: 14, height: 14, color: "var(--cyan)" }} />}
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                  <ExternalLink style={{ width: 10, height: 10, color: "var(--text-muted)" }} />
                </a>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input style={{ ...inp, flex: 1 }} placeholder={t.postAttach} value={attachUrl} onChange={e => setAttachUrl(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addAttachment(); }} />
                <button onClick={addAttachment} disabled={!attachUrl.trim()} style={{ padding: "8px 12px", background: "var(--cyan-dim)", border: "1px solid var(--border-strong)", borderRadius: 4, color: "var(--cyan)", cursor: "pointer", opacity: attachUrl.trim() ? 1 : 0.3 }}><Upload style={{ width: 14, height: 14 }} /></button>
              </div>
            </div>
          </div>
        )}

        {/* ── Subtasks Tab (Notion style checklist) ── */}
        {tab === "subtasks" && (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", height: "55vh" }}>
            {/* Progress bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                <span>{lang === "es" ? "Progreso de Subtareas" : "Subtasks Progress"}</span>
                <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{subtaskDone}/{subtaskTotal} ({subtaskPct}%)</span>
              </div>
              <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${subtaskPct}%`, background: "var(--emerald)", borderRadius: 3, transition: "width 0.3s ease" }} />
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {subtaskTotal === 0 && (
                <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, padding: "32px 0" }}>
                  {lang === "es" ? "No hay subtareas registradas." : "No subtasks recorded."}
                </p>
              )}
              {task.children?.map(sub => {
                const isDone = sub.status === "Done";
                return (
                  <div key={sub.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 12px", background: "var(--surface-hover)", border: "1px solid var(--border)", borderRadius: 6 }}>
                    <button
                      onClick={() => onSubtaskPatch(sub.id, { status: isDone ? "Backlog" : "Done" })}
                      style={{ background: "none", border: "none", cursor: "pointer", color: isDone ? "var(--emerald)" : "var(--text-muted)", display: "flex", padding: 0 }}
                    >
                      {isDone ? <CheckSquare style={{ width: 16, height: 16 }} /> : <Square style={{ width: 16, height: 16 }} />}
                    </button>
                    <span style={{ flex: 1, fontSize: 12, color: isDone ? "var(--text-muted)" : "var(--foreground)", textDecoration: isDone ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {sub.title}
                    </span>
                    <button
                      onClick={() => onSubtaskDelete(sub.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", opacity: 0.7 }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
                    >
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* New Subtask Input */}
            <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
              <input
                value={newSubtaskTitle}
                onChange={e => setNewSubtaskTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addSubtask(); }}
                placeholder={lang === "es" ? "Agregar nueva subtarea..." : "Add new subtask..."}
                style={{ flex: 1, ...inp }}
              />
              <button
                onClick={addSubtask}
                disabled={!newSubtaskTitle.trim()}
                style={{
                  padding: "8px 16px", background: "var(--cyan-dim)", border: "1px solid var(--border-strong)",
                  borderRadius: 4, color: "var(--cyan)", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  opacity: newSubtaskTitle.trim() ? 1 : 0.4
                }}
              >
                {t.newTaskBtn}
              </button>
            </div>
          </div>
        )}

        {/* ── Comments Tab ── */}
        {tab === "comments" && (
          <div style={{ display: "flex", flexDirection: "column", height: "55vh" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              {loadingComments && <div style={{ textAlign: "center", padding: 20 }}><Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite", color: "var(--cyan)" }} /></div>}
              {!loadingComments && comments.length === 0 && <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 12, padding: "32px 0" }}>{t.noComments}</p>}
              {comments.map(c => (
                <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--cyan-dim)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--cyan)", flexShrink: 0 }}>
                    {c.userName[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{c.userName}</span>
                      <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{timeAgo(c.createdAt, lang)}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0, wordBreak: "break-word" }}>{c.content}</p>
                  </div>
                </div>
              ))}
              <div ref={commentEndRef} />
            </div>
            <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }} placeholder={t.writeComment} style={{ flex: 1, ...inp }} />
              <button onClick={postComment} disabled={!commentText.trim()} style={{ padding: "8px 14px", background: commentText.trim() ? "var(--cyan-dim)" : "transparent", border: `1px solid ${commentText.trim() ? "var(--border-strong)" : "var(--border)"}`, borderRadius: 4, color: commentText.trim() ? "var(--cyan)" : "var(--text-muted)", cursor: "pointer" }}>
                <Send style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}

        {/* ── Activity Tab ── */}
        {tab === "activity" && (
          <div style={{ padding: "16px 24px", maxHeight: "55vh", overflowY: "auto" }}>
            {activities.length === 0 && <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, padding: "32px 0" }}>{t.noActivity}</p>}
            {activities.map(a => (
              <div key={a.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border-neutral)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.action === "status_changed" ? "var(--emerald)" : a.action === "assigned" ? "var(--cyan)" : a.action === "priority_changed" ? "var(--amber)" : "var(--text-muted)", marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                    <strong style={{ color: "var(--foreground)" }}>{a.userName}</strong> {actLabels[a.action] || a.action}
                    {a.oldValue && a.newValue && <> de <span style={{ color: "var(--red)", textDecoration: "line-through" }}>{a.oldValue}</span> a <span style={{ color: "var(--emerald)" }}>{a.newValue}</span></>}
                    {!a.oldValue && a.newValue && <> <span style={{ color: "var(--emerald)" }}>{a.newValue}</span></>}
                  </p>
                  <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{timeAgo(a.createdAt, lang)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {tab === "details" && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 24px", borderTop: "1px solid var(--border)" }}>
            <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, borderRadius: 4 }}>{t.cancel}</button>
            <button onClick={submit} disabled={saving || !form.title.trim()} className="btn-primary" style={{ padding: "8px 24px", opacity: saving || !form.title.trim() ? 0.5 : 1 }}>{saving ? t.saving : t.update}</button>
          </div>
        )}
      </div>
    </div>, document.body
  );
}

/* ═══ CREATE MODAL ═══ */
function CreateModal({ onClose, onSave, members }: { onClose: () => void; onSave: (d: any) => void; members: Member[] }) {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];
  const [form, setForm] = useState({ title: "", description: "", assignee: "", assigneeId: "", priority: "P2", status: "Backlog", dueDate: "", tags: [] as string[] });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const addTag = (tg: string) => { const s = tg.trim(); if (s && !form.tags.includes(s)) set("tags", [...form.tags, s]); setTagInput(""); };
  const submit = async () => { if (!form.title.trim()) return; setSaving(true); await onSave({ ...form, dueDate: form.dueDate || null }); setSaving(false); };

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "5vh 16px", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.1em" }}>NUEVA TAREA</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><X style={{ width: 18, height: 18 }} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          <div><label style={lbl}>{t.taskTitle} *</label><input style={inp} placeholder="¿Qué necesitas hacer?" value={form.title} onChange={e => set("title", e.target.value)} autoFocus /></div>
          <div><label style={lbl}>{t.description}</label><textarea rows={2} style={{ ...inp, resize: "vertical" }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Contexto..." /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>{t.assignee}</label><select style={{ ...inp, cursor: "pointer" }} value={form.assigneeId} onChange={e => {
              set("assigneeId", e.target.value);
              set("assignee", members.find(m => m.id === e.target.value)?.name || "");
            }}><option value="">Sin asignar</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
            <div><label style={lbl}>{t.priority}</label><select style={{ ...inp, cursor: "pointer" }} value={form.priority} onChange={e => set("priority", e.target.value)}>{PRIORITIES.map(p => <option key={p} value={p}>{PRIO_CFG[p].label}</option>)}</select></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>{t.status}</label><select style={{ ...inp, cursor: "pointer" }} value={form.status} onChange={e => set("status", e.target.value)}>{STATUSES.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}</select></div>
            <div><label style={lbl}>{t.dueDate}</label><input type="date" style={{ ...inp, cursor: "pointer" }} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} /></div>
          </div>
          <div>
            <label style={lbl}>Etiquetas</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
              {form.tags.map((tg, i) => <span key={i} style={{ fontSize: 10, padding: "2px 8px", background: "var(--cyan-dim)", color: "var(--cyan)", border: "1px solid var(--border)", borderRadius: 4, display: "flex", alignItems: "center", gap: 4 }}>{tg}<X style={{ width: 8, height: 8, cursor: "pointer" }} onClick={() => set("tags", form.tags.filter((_, j) => j !== i))} /></span>)}
            </div>
            <input style={inp} placeholder={t.addTagPlaceholder} value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
              {TAG_PRESETS.filter(tg => !form.tags.includes(tg)).slice(0, 6).map(tg => <button key={tg} onClick={() => addTag(tg)} style={{ fontSize: 9, padding: "2px 8px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", borderRadius: 4 }}>+ {tg}</button>)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 24px", borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, borderRadius: 4 }}>{t.cancel}</button>
          <button onClick={submit} disabled={saving || !form.title.trim()} className="btn-primary" style={{ padding: "8px 24px", opacity: saving || !form.title.trim() ? 0.5 : 1 }}>{saving ? t.saving : t.create}</button>
        </div>
      </div>
    </div>, document.body
  );
}

/* ═══ REQUEST MODAL ═══ */
function RequestModal({ onClose, onSave, areas, members }: { onClose: () => void; onSave: (d: any) => void; areas: Area[]; members: Member[] }) {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];
  const [form, setForm] = useState({ areaId: areas[0]?.id || "", typeId: "", title: "", description: "", priority: "P2", dueDate: "" });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const area = areas.find(a => a.id === form.areaId) || null;
  const type = area?.requestTypes.find(tp => tp.id === form.typeId) || null;
  const slaH = type?.slaHours || area?.slaHours || 0;
  const etaPreview = slaH > 0 ? etaDate(slaH) : null;

  const submit = async () => {
    if (!form.title.trim() || !area) return;
    setSaving(true);
    await onSave({
      title: form.title.trim(),
      description: form.description || null,
      priority: form.priority,
      status: "Backlog",
      dueDate: form.dueDate || null,
      targetAreaId: area.id,
      requestType: type?.name || null,
      assignee: null,
    });
    setSaving(false);
  };

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "5vh 16px", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, background: "var(--surface)", border: `1px solid ${area ? `${area.color}40` : "var(--border)"}`, borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 8 }}><Send style={{ width: 14, height: 14, color: area?.color || "var(--cyan)" }} /> NUEVA SOLICITUD</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><X style={{ width: 18, height: 18 }} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Área destino *</label>
              <select style={{ ...inp, cursor: "pointer" }} value={form.areaId} onChange={e => { set("areaId", e.target.value); set("typeId", ""); }}>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Tipo de solicitud</label>
              <select style={{ ...inp, cursor: "pointer" }} value={form.typeId} onChange={e => set("typeId", e.target.value)} disabled={!area || area.requestTypes.length === 0}>
                <option value="">{area && area.requestTypes.length ? "Selecciona…" : "Sin tipos configurados"}</option>
                {area?.requestTypes.map(tp => <option key={tp.id} value={tp.id}>{tp.name} ({tp.slaHours}h)</option>)}
              </select>
            </div>
          </div>
          <div><label style={lbl}>{t.taskTitle} *</label><input style={inp} placeholder="¿Qué necesitas?" value={form.title} onChange={e => set("title", e.target.value)} autoFocus /></div>
          <div><label style={lbl}>Brief / contexto</label><textarea rows={3} style={{ ...inp, resize: "vertical" }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Detalles, referencias, links…" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>{t.priority}</label><select style={{ ...inp, cursor: "pointer" }} value={form.priority} onChange={e => set("priority", e.target.value)}>{PRIORITIES.map(p => <option key={p} value={p}>{PRIO_CFG[p].label}</option>)}</select></div>
            <div><label style={lbl}>{t.dueDate}</label><input type="date" style={{ ...inp, cursor: "pointer" }} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} /></div>
          </div>
          {etaPreview && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 6, background: "var(--cyan-dim)", border: "1px solid var(--border-strong)" }}>
              <Clock style={{ width: 14, height: 14, color: "var(--cyan)" }} />
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>SLA base <strong style={{ color: "var(--foreground)" }}>{slaH}h</strong> · entrega aprox. <strong style={{ color: "var(--cyan)" }}>{etaPreview.toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</strong></span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 24px", borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, borderRadius: 4 }}>{t.cancel}</button>
          <button onClick={submit} disabled={saving || !form.title.trim() || !area} className="btn-primary" style={{ padding: "8px 24px", opacity: saving || !form.title.trim() || !area ? 0.5 : 1 }}>{saving ? "Enviando..." : "Enviar solicitud"}</button>
        </div>
      </div>
    </div>, document.body
  );
}

/* ═══ KANBAN CARD ═══ */
function KanbanCard({ task, onEdit }: { task: Task; onEdit: (t: Task) => void }) {
  const { lang } = useLanguage();
  const sl = sla(task.dueDate, task.status, lang);
  const pri = PRIO_CFG[task.priority] || PRIO_CFG.P2;
  const childDone = task.children?.filter(c => c.status === "Done").length || 0;
  const childTotal = task.children?.length || 0;
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onEdit(task)}
      style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 8, padding: "12px 14px", cursor: "grab", transition: "all 0.15s",
        borderLeft: `4px solid ${pri.c}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.background = "var(--surface-hover)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}
    >
      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 8, lineHeight: 1.4 }}>{task.title}</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: pri.bg, color: pri.c, fontWeight: 700 }}>{pri.label}</span>
        {task.assignee && <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 500 }}>{task.assignee}</span>}
        {sl.i !== "none" && <span style={{ fontSize: 9, color: sl.c, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: sl.bg }}>{sl.l}</span>}
      </div>
      {task.tags?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 8 }}>
          {task.tags.map((tg, i) => <span key={i} style={{ fontSize: 8, padding: "1px 6px", background: "var(--cyan-dim)", color: "var(--cyan)", border: "1px solid var(--border)", borderRadius: 4 }}>{tg}</span>)}
        </div>
      )}
      {childTotal > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-secondary)", marginBottom: 4 }}>
            <span>Subtareas</span>
            <span style={{ fontWeight: 600 }}>{childDone}/{childTotal}</span>
          </div>
          <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(childDone / childTotal) * 100}%`, background: "var(--emerald)", borderRadius: 2, transition: "width 0.3s" }} />
          </div>
        </div>
      )}

    </div>
  );
}

/* ═══ FILTER CHIP ═══ */
function FilterChip({ label, value, active, children }: { label: string; value: string; active?: boolean; children: (close: () => void) => React.ReactNode }) {
  return (
    <Dropdown trigger={
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, cursor: "pointer",
        background: active ? "var(--cyan-dim)" : "var(--surface)",
        border: `1px solid ${active ? "var(--border-strong)" : "var(--border)"}`,
        fontSize: 11, whiteSpace: "nowrap",
      }}>
        <span style={{ color: "var(--text-secondary)" }}>{label}:</span>
        <span style={{ fontWeight: 700, color: active ? "var(--cyan)" : "var(--foreground)" }}>{value}</span>
        <ChevronDown style={{ width: 12, height: 12, color: "var(--text-muted)" }} />
      </div>
    }>
      {children}
    </Dropdown>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function OpsPage() {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [addingSubIn, setAddingSubIn] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const [viewMode, setViewMode] = useState<"kanban" | "table" | "metrics" | "okrs">("kanban");
  const [groupBy, setGroupBy] = useState<"status" | "assignee" | "priority">("status");
  const [fAssignee, setFAssignee] = useState("");
  const [fPriority, setFPriority] = useState("");
  const [fTag, setFTag] = useState("");
  const [fArea, setFArea] = useState("");
  const [viewArea, setViewArea] = useState<string>("__all__");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const newRef = useRef<HTMLInputElement>(null);
  const subRef = useRef<HTMLInputElement>(null);

  const { data: session } = useSession();
  const [config, setConfig] = useState<WorkflowConfig>({ areas: [], requireLeadReview: true });
  
  useEffect(() => {
    fetch("/api/workspace/settings")
      .then(r => r.json())
      .then(d => setConfig(parseWorkflow(d)))
      .catch(() => {});
  }, []);

  const currentUserId = (session?.user as any)?.id || "";
  const myArea = useMemo(() => findUserArea(config, currentUserId), [config, currentUserId]);
  const myRole = useMemo(() => members.find(m => m.id === currentUserId)?.role || "MEMBER", [members, currentUserId]);
  const myPerms: AreaPermissions = useMemo(() => getPermissions(myArea, currentUserId, myRole), [myArea, currentUserId, myRole]);
  const memberIdByName = useMemo(() => { const m: Record<string, string> = {}; members.forEach(mm => { if (mm.name) m[mm.name] = mm.id; }); return m; }, [members]);
  
  const areaForAssignee = useCallback((assignee?: string | null): Area | null => {
    if (!assignee) return null;
    const uid = memberIdByName[assignee];
    return uid ? findUserArea(config, uid) : null;
  }, [memberIdByName, config]);

  const canCloseTask = useCallback((tsk: Task): boolean => {
    const area = (tsk.targetAreaId ? config.areas.find(a => a.id === tsk.targetAreaId) : null) || areaForAssignee(tsk.assignee);
    if (!area) return true;
    const areaRequiresReview = area.requireLeadReview ?? config.requireLeadReview;
    if (!areaRequiresReview) return true;
    const role = members.find(m => m.id === currentUserId)?.role;
    if (role === "OWNER" || role === "ADMIN") return true;
    return area.leadIds.includes(currentUserId);
  }, [config, areaForAssignee, members, currentUserId]);

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch("/api/ops");
      const d = await r.json();
      if (Array.isArray(d.data?.tasks)) setTasks(d.data.tasks);
      if (Array.isArray(d.data?.members)) setMembers(d.data.members);
    } catch {
      /* silent — error will surface as empty state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => { if (addingIn) newRef.current?.focus(); }, [addingIn]);
  useEffect(() => { if (addingSubIn) subRef.current?.focus(); }, [addingSubIn]);
  useEffect(() => { if (myArea && viewArea === "__all__") setViewArea("__mine__"); }, [myArea]);

  // Restore + persist grouping/filters.
  useEffect(() => {
    try {
      const r = localStorage.getItem("sodare:ops-prefs");
      if (r) {
        const p = JSON.parse(r);
        if (p.groupBy) setGroupBy(p.groupBy);
        if (p.viewMode) setViewMode(p.viewMode);
        if (typeof p.fAssignee === "string") setFAssignee(p.fAssignee);
        if (typeof p.fPriority === "string") setFPriority(p.fPriority);
        if (typeof p.fTag === "string") setFTag(p.fTag);
        if (typeof p.fArea === "string") setFArea(p.fArea);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("sodare:ops-prefs", JSON.stringify({ groupBy, viewMode, fAssignee, fPriority, fTag, fArea }));
    } catch { /* ignore */ }
  }, [groupBy, viewMode, fAssignee, fPriority, fTag, fArea]);

  const createWith = async (defaults: any) => {
    if (!newTitle.trim()) return;
    try {
      const r = await fetch("/api/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), status: "Backlog", ...defaults })
      });
      const d = await r.json();
      if (r.ok) setTasks(p => [...p, d.data]);
    } catch {}
    setNewTitle("");
    setAddingIn(null);
  };

  const createSubtask = async (parentId: string, title: string) => {
    try {
      const r = await fetch("/api/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, parentId, status: "Backlog" })
      });
      const d = await r.json();
      if (r.ok) {
        setTasks(p => p.map(t => t.id === parentId ? { ...t, children: [...(t.children || []), d.data] } : t));
        if (editTask && editTask.id === parentId) {
          setEditTask(prev => prev ? { ...prev, children: [...(prev.children || []), d.data] } : null);
        }
      }
    } catch {}
  };

  const patchSubtask = async (id: string, p: any) => {
    try {
      const r = await fetch(`/api/ops/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p)
      });
      const d = await r.json();
      if (r.ok) {
        setTasks(prev => prev.map(t => {
          if (t.children?.some(c => c.id === id)) {
            return { ...t, children: t.children.map(c => c.id === id ? d.data : c) };
          }
          return t;
        }));
        if (editTask && editTask.children?.some(c => c.id === id)) {
          setEditTask(prev => prev ? {
            ...prev,
            children: prev.children.map(c => c.id === id ? d.data : c)
          } : null);
        }
      }
    } catch {}
  };

  const deleteSubtask = async (id: string) => {
    if (!confirm(lang === "es" ? "¿Eliminar esta subtarea?" : "Delete this subtask?")) return;
    try {
      const r = await fetch(`/api/ops/${id}`, { method: "DELETE" });
      if (r.ok) {
        setTasks(prev => prev.map(t => {
          if (t.children?.some(c => c.id === id)) {
            return { ...t, children: t.children.filter(c => c.id !== id) };
          }
          return t;
        }));
        if (editTask && editTask.children?.some(c => c.id === id)) {
          setEditTask(prev => prev ? {
            ...prev,
            children: prev.children.filter(c => c.id !== id)
          } : null);
        }
      }
    } catch {}
  };

  const fullCreate = async (data: any) => {
    try {
      const r = await fetch("/api/ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const d = await r.json();
      if (r.ok) { setTasks(p => [...p, d.data]); setShowCreate(false); }
    } catch {}
  };

  const createRequest = async (data: any) => {
    try {
      const r = await fetch("/api/ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const d = await r.json();
      if (r.ok) { setTasks(p => [...p, d.data]); setShowRequest(false); }
      else { alert(d.error || (lang === "es" ? "Error al enviar solicitud" : "Error sending request")); }
    } catch (e: any) {
      alert(lang === "es" ? "Error de red al enviar solicitud" : "Network error sending request");
    }
  };

  const fullUpdate = async (data: any) => {
    if (!editTask) return;
    if (data.status === "Done" && !canCloseTask(editTask)) {
      alert(lang === "es" ? "Esta tarea requiere la aprobación de un líder del área antes de cerrarse." : "This task requires approval from an area leader before closing.");
      return;
    }
    try {
      const r = await fetch(`/api/ops/${editTask.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const d = await r.json();
      if (r.ok) {
        setTasks(p => p.map(t => t.id === editTask.id ? d.data : t));
        setEditTask(null);
      }
    } catch {}
  };

  const patch = async (id: string, p: any) => {
    if (p.status === "Done") {
      const tsk = tasks.find(x => x.id === id) || tasks.flatMap(x => x.children || []).find(c => c.id === id);
      if (tsk && !canCloseTask(tsk)) {
        alert(lang === "es" ? "Esta tarea requiere la aprobación de un líder del área antes de cerrarse." : "This task requires approval from an area leader before closing.");
        return;
      }
    }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...p } : t));
    try {
      const r = await fetch(`/api/ops/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      if (r.status === 403) {
        const d = await r.json().catch(() => ({}));
        alert(d.error || (lang === "es" ? "No tienes permisos para editar esta tarea." : "You do not have permission to edit this task."));
        fetch_();
      } else if (!r.ok) {
        fetch_();
      }
    } catch {
      fetch_();
    }
  };

  const del = async (id: string) => {
    if (!confirm(lang === "es" ? "¿Eliminar esta tarea?" : "Delete this task?")) return;
    setTasks(p => p.filter(t => t.id !== id));
    try {
      const r = await fetch(`/api/ops/${id}`, { method: "DELETE" });
      if (r.status === 403) {
        const d = await r.json().catch(() => ({}));
        alert(d.error || (lang === "es" ? "No tienes permisos para eliminar esta tarea." : "You do not have permission to delete this task."));
        fetch_();
      } else if (!r.ok) {
        fetch_();
      }
    } catch {
      fetch_();
    }
  };

  const cnt = (s: string) => tasks.filter(t => t.status === s).length;
  const overdue = tasks.filter(t => t.dueDate && t.status !== "Done" && new Date(t.dueDate) < new Date()).length;
  const done = cnt("Done"), total = tasks.length, pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tasks.filter(t => {
      // Don't show child tasks directly on the root board
      if (t.parentId) return false;
      if (search && !(t.title.toLowerCase().includes(q) || t.assignee?.toLowerCase().includes(q) || t.tags?.some(tg => tg.toLowerCase().includes(q)))) return false;
      if (fAssignee && (t.assignee || "") !== fAssignee) return false;
      if (fPriority && t.priority !== fPriority) return false;
      if (fTag && !t.tags?.includes(fTag)) return false;
      if (fArea && t.targetAreaId !== fArea) return false;
      
      // viewArea tab filter
      if (viewArea === "__mine__" && myArea) {
        const inMyArea = t.targetAreaId === myArea.id || myArea.memberIds.some(mid => { const mm = members.find(m => m.id === mid); return mm?.name === t.assignee; });
        if (!inMyArea) return false;
      } else if (viewArea !== "__all__" && viewArea !== "__mine__") {
        const inSelectedArea = t.targetAreaId === viewArea || config.areas.find(a => a.id === viewArea)?.memberIds.some(mid => { const mm = members.find(m => m.id === mid); return mm?.name === t.assignee; });
        if (!inSelectedArea) return false;
      }
      return true;
    });
  }, [tasks, search, fAssignee, fPriority, fTag, fArea, viewArea, myArea, members, config]);

  // Dynamic groups for the board and table views
  const dynamicGroups = useMemo(() => {
    if (groupBy === "assignee") {
      const names = Array.from(new Set(filtered.map(t => t.assignee || ""))).sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));
      if (!names.includes("")) names.push("");
      return names.map(n => ({ key: n || "__none__", label: n || (lang === "es" ? "Sin asignar" : "Unassigned"), color: "var(--cyan)", match: (t: Task) => (t.assignee || "") === n, createDefaults: { assignee: n || null } }));
    }
    if (groupBy === "priority") {
      return PRIORITIES.map(p => ({ key: p, label: PRIO_CFG[p].label, color: PRIO_CFG[p].c, match: (t: Task) => t.priority === p, createDefaults: { priority: p } }));
    }
    return GROUPS.map(g => ({ key: g.key, label: g.label, color: g.color, match: (t: Task) => t.status === g.key, createDefaults: { status: g.key } }));
  }, [groupBy, filtered, lang]);

  const allTags = useMemo(() => Array.from(new Set([...TAG_PRESETS, ...tasks.flatMap(t => t.tags || [])])).sort(), [tasks]);
  const filtersActive = !!(fAssignee || fPriority || fTag || fArea);
  const pendingReviews = useMemo(() => tasks.filter(t => t.status === "Review" && myArea && (t.targetAreaId === myArea.id || (!t.targetAreaId && myArea.memberIds.some(mid => { const mm = members.find(m => m.id === mid); return mm?.name === t.assignee; })))).length, [tasks, myArea, members]);

  // SLA/OKR dashboard stats
  const globalSlaStats = useMemo(() => {
    const completedTasks = tasks.filter(t => t.status === "Done");
    const completedWithDue = completedTasks.filter(t => t.dueDate);
    const completedOnTime = completedWithDue.filter(t => {
      if (!t.dueDate) return true;
      const limit = new Date(t.dueDate).getTime();
      const close = t.closedAt ? new Date(t.closedAt).getTime() : new Date(t.createdAt).getTime();
      return close <= limit;
    });
    const pct = completedWithDue.length > 0 ? Math.round((completedOnTime.length / completedWithDue.length) * 100) : 100;
    return {
      completedCount: completedTasks.length,
      completedWithDueCount: completedWithDue.length,
      completedOnTimeCount: completedOnTime.length,
      globalSlaPct: pct
    };
  }, [tasks]);

  const areaSlaStats = useMemo(() => {
    return config.areas.map(a => {
      const areaTasks = tasks.filter(t => t.targetAreaId === a.id);
      const completed = areaTasks.filter(t => t.status === "Done");
      const completedWithDue = completed.filter(t => t.dueDate);
      const completedOnTime = completedWithDue.filter(t => {
        if (!t.dueDate) return true;
        const limit = new Date(t.dueDate).getTime();
        const close = t.closedAt ? new Date(t.closedAt).getTime() : new Date(t.createdAt).getTime();
        return close <= limit;
      });
      const pct = completedWithDue.length > 0 ? Math.round((completedOnTime.length / completedWithDue.length) * 100) : 100;
      
      const closedWithTimestamps = completed.filter(t => t.closedAt);
      const avgLeadTimeHours = closedWithTimestamps.length > 0 
        ? Math.round(closedWithTimestamps.reduce((acc, t) => acc + (new Date(t.closedAt!).getTime() - new Date(t.createdAt).getTime()) / 36e5, 0) / closedWithTimestamps.length)
        : null;

      const okrStatus = pct >= 95 ? "success" : "warning";

      return {
        area: a,
        totalTasks: areaTasks.length,
        completedCount: completed.length,
        completedWithDueCount: completedWithDue.length,
        completedOnTimeCount: completedOnTime.length,
        slaPct: pct,
        avgLeadTimeHours,
        okrStatus
      };
    });
  }, [config.areas, tasks]);

  const memberLoadStats = useMemo(() => {
    return members.map(m => {
      const activeTasks = tasks.filter(t => t.assignee === m.name && t.status !== "Done").length;
      const okrStatus = activeTasks <= 5 ? "success" : "danger";
      return {
        member: m,
        activeTasks,
        okrStatus
      };
    }).sort((a, b) => b.activeTasks - a.activeTasks);
  }, [members, tasks]);

  const toggleGroupExpand = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t.title} description={t.subtitle}
        icon={<Users className="w-6 h-6" style={{ color: "var(--red)" }} />}
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!myPerms.canAccessOps && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--amber)", background: "var(--cyan-dim)", padding: "4px 10px", borderRadius: 4, letterSpacing: "0.05em" }}>{t.readOnly}</span>
            )}
            {config.areas.length > 0 && myPerms.canAccessOps && (
              <button onClick={() => setShowRequest(true)} title="Solicitar a otra área"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                <Send style={{ width: 14, height: 14 }} /> {t.requestBtn}
              </button>
            )}
            {myPerms.canAccessOps && <button className="btn-primary" onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}><Plus style={{ width: 14, height: 14 }} /> {t.newTaskBtn}</button>}
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t.totalTasks, value: total, color: "var(--cyan)", icon: <FileText style={{ width: 16, height: 16 }} /> },
          { label: t.completed, value: done, color: "var(--emerald)", icon: <CheckCircle2 style={{ width: 16, height: 16 }} /> },
          { label: t.overdueSla, value: overdue, color: "var(--red)", icon: <AlertTriangle style={{ width: 16, height: 16 }} /> },
          { label: t.productivity, value: `${pct}%`, color: pct >= 70 ? "var(--emerald)" : pct >= 40 ? "var(--amber)" : "var(--red)", icon: <Clock style={{ width: 16, height: 16 }} /> },
        ].map(k => (
          <div key={k.label} className="glass-panel" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ color: k.color, opacity: 0.8 }}>{k.icon}</div>
            <div>
              <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, fontWeight: 700, color: k.color }}>{loading ? "—" : k.value}</p>
              <p style={{ fontSize: 9, color: "var(--text-secondary)", fontFamily: "'Orbitron',sans-serif", letterSpacing: "0.12em", marginTop: 2 }}>{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Area view tabs */}
      {!loading && config.areas.length > 0 && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          <button onClick={() => setViewArea("__all__")} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: viewArea === "__all__" ? "1px solid var(--border-strong)" : "1px solid var(--border)", background: viewArea === "__all__" ? "var(--cyan-dim)" : "transparent", color: viewArea === "__all__" ? "var(--cyan)" : "var(--text-secondary)" }}>{t.all}</button>
          {myArea && (
            <button onClick={() => setViewArea("__mine__")} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: viewArea === "__mine__" ? `1px solid ${myArea.color}55` : "1px solid var(--border)", background: viewArea === "__mine__" ? `${myArea.color}18` : "transparent", color: viewArea === "__mine__" ? myArea.color : "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: myArea.color }} />
              {t.myArea} ({myArea.name})
              {pendingReviews > 0 && myArea.leadIds.includes(currentUserId) && (
                <span style={{ background: "var(--red)", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 10, padding: "1px 6px", marginLeft: 4 }}>{pendingReviews}</span>
              )}
            </button>
          )}
          {config.areas.filter(a => a.id !== myArea?.id).map(a => (
            <button key={a.id} onClick={() => setViewArea(a.id)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: viewArea === a.id ? `1px solid ${a.color}55` : "1px solid var(--border)", background: viewArea === a.id ? `${a.color}18` : "transparent", color: viewArea === a.id ? a.color : "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: a.color }} />
              {a.name}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 12px", flex: 1, maxWidth: 320 }}>
          <Search style={{ width: 14, height: 14, color: "var(--text-muted)" }} />
          <input type="text" placeholder={t.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 13, width: "100%" }} />
        </div>

        {/* View Switcher */}
        <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 2 }}>
          <button
            onClick={() => setViewMode("kanban")}
            title={t.kanbanView}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, border: "none",
              background: viewMode === "kanban" ? "var(--surface-hover)" : "transparent",
              color: viewMode === "kanban" ? "var(--cyan)" : "var(--text-secondary)",
              cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit"
            }}
          >
            <LayoutGrid style={{ width: 14, height: 14 }} />
            <span className="hidden sm:inline">{t.kanbanView}</span>
          </button>
          <button
            onClick={() => setViewMode("table")}
            title={t.tableView}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, border: "none",
              background: viewMode === "table" ? "var(--surface-hover)" : "transparent",
              color: viewMode === "table" ? "var(--cyan)" : "var(--text-secondary)",
              cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit"
            }}
          >
            <List style={{ width: 14, height: 14 }} />
            <span className="hidden sm:inline">{t.tableView}</span>
          </button>
          <button
            onClick={() => setViewMode("metrics")}
            title={lang === "es" ? "Métricas de Salud" : "Health Metrics"}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, border: "none",
              background: viewMode === "metrics" ? "var(--surface-hover)" : "transparent",
              color: viewMode === "metrics" ? "var(--cyan)" : "var(--text-secondary)",
              cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit"
            }}
          >
            <Target style={{ width: 14, height: 14 }} />
            <span className="hidden sm:inline">{lang === "es" ? "Salud (KPIs)" : "Health (KPIs)"}</span>
          </button>
          <button
            onClick={() => setViewMode("okrs")}
            title={lang === "es" ? "Estrategia (OKRs)" : "Strategy (OKRs)"}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, border: "none",
              background: viewMode === "okrs" ? "var(--surface-hover)" : "transparent",
              color: viewMode === "okrs" ? "var(--cyan)" : "var(--text-secondary)",
              cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit"
            }}
          >
            <TrendingUp style={{ width: 14, height: 14 }} />
            <span className="hidden sm:inline">{lang === "es" ? "Estrategia (OKRs)" : "Strategy (OKRs)"}</span>
          </button>
        </div>
      </div>

      {/* Filters + Group by */}
      {!loading && tasks.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <FilterChip label={t.groupBy} value={GROUP_LABELS[groupBy]} active={groupBy !== "status"}>
            {(close) => (["status", "assignee", "priority"] as const).map(k => (
              <DropdownOption key={k} label={GROUP_LABELS[k]} active={groupBy === k} onClick={() => { setGroupBy(k); close(); }} />
            ))}
          </FilterChip>
          <FilterChip label={t.assignee} value={fAssignee || t.all} active={!!fAssignee}>
            {(close) => <>
              <DropdownOption label={t.all} active={!fAssignee} onClick={() => { setFAssignee(""); close(); }} />
              {members.map(m => <DropdownOption key={m.id} label={m.name} active={fAssignee === m.name} onClick={() => { setFAssignee(m.name); close(); }} />)}
            </>}
          </FilterChip>
          <FilterChip label={t.priority} value={fPriority ? PRIO_CFG[fPriority].label : t.all} active={!!fPriority}>
            {(close) => <>
              <DropdownOption label={t.all} active={!fPriority} onClick={() => { setFPriority(""); close(); }} />
              {PRIORITIES.map(p => <DropdownOption key={p} label={PRIO_CFG[p].label} color={PRIO_CFG[p].c} active={fPriority === p} onClick={() => { setFPriority(p); close(); }} />)}
            </>}
          </FilterChip>
          <FilterChip label={t.tag} value={fTag || t.all} active={!!fTag}>
            {(close) => <>
              <DropdownOption label={t.all} active={!fTag} onClick={() => { setFTag(""); close(); }} />
              {allTags.map(tg => <DropdownOption key={tg} label={tg} active={fTag === tg} onClick={() => { setFTag(tg); close(); }} />)}
            </>}
          </FilterChip>
          {config.areas.length > 0 && (
            <FilterChip label={t.requestsTo} value={fArea ? (config.areas.find(a => a.id === fArea)?.name || "Área") : t.all} active={!!fArea}>
              {(close) => <>
                <DropdownOption label={t.all} active={!fArea} onClick={() => { setFArea(""); close(); }} />
                {config.areas.map(a => <DropdownOption key={a.id} label={a.name} color={a.color} active={fArea === a.id} onClick={() => { setFArea(a.id); close(); }} />)}
              </>}
            </FilterChip>
          )}
          {filtersActive && (
            <button onClick={() => { setFAssignee(""); setFPriority(""); setFTag(""); setFArea(""); }} style={{ fontSize: 11, color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
              {t.clearFilters}
            </button>
          )}
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "24px 0" }}>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} style={{ height: "48px", width: "100%", borderRadius: "4px" }} />
          ))}
          <div style={{ textAlign: "center", marginTop: "8px" }}>
            <span style={{ fontSize: "10px", color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 600 }}>
              Sincronizando Operaciones...
            </span>
          </div>
        </div>
      )}

      {/* KANBAN VIEW */}
      {!loading && viewMode === "kanban" && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${dynamicGroups.length}, 1fr)`, gap: 12, minHeight: 400, overflowX: "auto", paddingBottom: 16 }}>
          {dynamicGroups.map(g => {
            const gt = filtered.filter(g.match);
            return (
              <div
                key={g.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.background = "var(--surface-hover)";
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.background = "var(--surface)";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.background = "var(--surface)";
                  const taskId = e.dataTransfer.getData("text/plain");
                  if (taskId) patch(taskId, g.createDefaults);
                }}
                style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, borderTop: `4px solid ${g.color}`, display: "flex", flexDirection: "column", minWidth: 280, padding: 6 }}
              >
                <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: g.color }}>{g.label}</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--border)", padding: "1px 6px", borderRadius: 8 }}>{gt.length}</span>
                  </div>
                  {myPerms.canAccessOps && (
                    <button onClick={() => { setAddingIn(g.key); setNewTitle(""); }} aria-label="Agregar tarea" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }} onMouseEnter={e => e.currentTarget.style.color = g.color} onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>
                      <Plus style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>
                <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 10, flex: 1, overflowY: "auto" }}>
                  {gt.map(tsk => <KanbanCard key={tsk.id} task={tsk} onEdit={setEditTask} />)}
                  {addingIn === g.key && (
                    <input
                      ref={newRef} value={newTitle} onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") createWith(g.createDefaults); if (e.key === "Escape") { setAddingIn(null); setNewTitle(""); } }}
                      onBlur={() => { if (newTitle.trim()) createWith(g.createDefaults); else { setAddingIn(null); setNewTitle(""); } }}
                      placeholder={lang === "es" ? "Nombre..." : "Name..."}
                      style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px", color: "var(--foreground)", fontSize: 12, outline: "none" }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE/SPREADSHEET VIEW (Monday.com style) */}
      {!loading && viewMode === "table" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {dynamicGroups.map(g => {
            const gt = filtered.filter(g.match);
            const isCollapsed = expandedGroups[g.key] === true;

            return (
              <div key={g.key} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                {/* Header */}
                <div
                  onClick={() => toggleGroupExpand(g.key)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 18px", borderBottom: isCollapsed ? "none" : "1px solid var(--border)",
                    cursor: "pointer", background: "var(--surface-hover)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {isCollapsed ? <ChevronRight style={{ width: 16, height: 16, color: g.color }} /> : <ChevronDown style={{ width: 16, height: 16, color: g.color }} />}
                    <span style={{ width: 4, height: 16, background: g.color, borderRadius: 2 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{g.label}</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--border)", padding: "1px 6px", borderRadius: 8 }}>{gt.length}</span>
                  </div>

                  {myPerms.canAccessOps && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddingIn(g.key);
                        setNewTitle("");
                      }}
                      style={{
                        background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)",
                        display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, fontFamily: "inherit"
                      }}
                    >
                      <Plus style={{ width: 12, height: 12 }} />
                      {lang === "es" ? "Agregar" : "Add"}
                    </button>
                  )}
                </div>

                {/* Table list */}
                {!isCollapsed && (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.02)" }}>
                          <th style={{ ...ch, textAlign: "left", width: "35%" }}>{t.taskTitle}</th>
                          <th style={{ ...ch, textAlign: "left" }}>{t.assignee}</th>
                          <th style={{ ...ch, textAlign: "center" }}>{t.status}</th>
                          <th style={{ ...ch, textAlign: "center" }}>{t.priority}</th>
                          <th style={{ ...ch, textAlign: "left" }}>{t.dueDate}</th>
                          <th style={{ ...ch, textAlign: "center" }}>{t.sla}</th>
                          <th style={{ ...ch, textAlign: "center", width: 70 }}>{t.actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gt.map(tsk => {
                          const slVal = sla(tsk.dueDate, tsk.status, lang);
                          return (
                            <tr key={tsk.id} style={{ borderBottom: "1px solid var(--border-neutral)" }} className="fb-row">
                              {/* Title (editable cell) */}
                              <td style={{ padding: "8px 10px" }}>
                                <EditableCell
                                  value={tsk.title}
                                  onSave={(val) => patch(tsk.id, { title: val })}
                                  placeholder={lang === "es" ? "Título de tarea" : "Task title"}
                                />
                              </td>

                              {/* Assignee dropdown */}
                              <td style={{ padding: "8px 10px" }}>
                                <select
                                  value={tsk.assignee || ""}
                                  onChange={(e) => patch(tsk.id, { assignee: e.target.value || null })}
                                  style={{ background: "transparent", border: "none", color: "var(--foreground)", fontSize: 12, outline: "none", cursor: "pointer" }}
                                >
                                  <option value="">{lang === "es" ? "Sin asignar" : "Unassigned"}</option>
                                  {members.map(m => (
                                    <option key={m.id} value={m.name}>{m.name}</option>
                                  ))}
                                </select>
                              </td>

                              {/* Status dropdown */}
                              <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                <select
                                  value={tsk.status}
                                  onChange={(e) => patch(tsk.id, { status: e.target.value })}
                                  style={{
                                    background: STATUS_CFG[tsk.status]?.bg || "var(--text-muted)",
                                    color: "white", fontSize: 11, fontWeight: 700,
                                    border: "none", borderRadius: 4, padding: "4px 8px", cursor: "pointer",
                                    outline: "none"
                                  }}
                                >
                                  {STATUSES.map(s => (
                                    <option key={s} value={s}>{STATUS_CFG[s].label}</option>
                                  ))}
                                </select>
                              </td>

                              {/* Priority dropdown */}
                              <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                <select
                                  value={tsk.priority}
                                  onChange={(e) => patch(tsk.id, { priority: e.target.value })}
                                  style={{
                                    background: PRIO_CFG[tsk.priority]?.bg || "rgba(255,255,255,0.05)",
                                    color: PRIO_CFG[tsk.priority]?.c || "var(--foreground)",
                                    fontSize: 11, fontWeight: 700,
                                    border: "none", borderRadius: 4, padding: "4px 8px", cursor: "pointer",
                                    outline: "none"
                                  }}
                                >
                                  {PRIORITIES.map(p => (
                                    <option key={p} value={p}>{PRIO_CFG[p].label}</option>
                                  ))}
                                </select>
                              </td>

                              {/* Due Date picker */}
                              <td style={{ padding: "8px 10px" }}>
                                <input
                                  type="date"
                                  value={tsk.dueDate ? new Date(tsk.dueDate).toISOString().split("T")[0] : ""}
                                  onChange={(e) => patch(tsk.id, { dueDate: e.target.value || null })}
                                  style={{ background: "transparent", border: "none", color: "var(--foreground)", fontSize: 12, outline: "none", cursor: "pointer" }}
                                />
                              </td>

                              {/* SLA */}
                              <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                {slVal.i !== "none" ? (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: slVal.bg, color: slVal.c }}>
                                    {slVal.l}
                                  </span>
                                ) : "—"}
                              </td>

                              {/* Actions */}
                              <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                  <button onClick={() => setEditTask(tsk)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cyan)" }} title={t.update}>
                                    <FileText style={{ width: 14, height: 14 }} />
                                  </button>
                                  {myPerms.canAccessOps && (
                                    <button onClick={() => del(tsk.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)" }} title="Eliminar">
                                      <Trash2 style={{ width: 14, height: 14 }} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {/* Inline Create Row */}
                        {addingIn === g.key && (
                          <tr style={{ background: "var(--surface-hover)" }}>
                            <td colSpan={7} style={{ padding: "8px 10px" }}>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <input
                                  ref={newRef}
                                  value={newTitle}
                                  onChange={e => setNewTitle(e.target.value)}
                                  onKeyDown={e => { if (e.key === "Enter") createWith(g.createDefaults); if (e.key === "Escape") { setAddingIn(null); setNewTitle(""); } }}
                                  placeholder={lang === "es" ? "Agregar nueva tarea..." : "Add new task..."}
                                  style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 12px", color: "var(--foreground)", fontSize: 12, outline: "none" }}
                                />
                                <button
                                  onClick={() => createWith(g.createDefaults)}
                                  disabled={!newTitle.trim()}
                                  style={{
                                    padding: "6px 14px", background: "var(--cyan-dim)", border: "1px solid var(--border-strong)",
                                    borderRadius: 6, color: "var(--cyan)", cursor: "pointer", fontSize: 11, fontWeight: 700,
                                    opacity: newTitle.trim() ? 1 : 0.4
                                  }}
                                >
                                  {lang === "es" ? "Agregar" : "Add"}
                                </button>
                                <button
                                  onClick={() => { setAddingIn(null); setNewTitle(""); }}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 11, fontFamily: "inherit" }}
                                >
                                  {t.cancel}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* METRICS & OKRS VIEW */}
      {!loading && viewMode === "metrics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Top row summaries */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", fontFamily: "'Orbitron',sans-serif", letterSpacing: "0.05em" }}>KPI GLOBAL SLA</span>
                <Target style={{ width: 16, height: 16, color: "var(--cyan)" }} />
              </div>
              <p style={{ fontSize: 32, fontWeight: 800, color: globalSlaStats.globalSlaPct >= 95 ? "var(--emerald)" : "var(--amber)", fontFamily: "'Orbitron',sans-serif", margin: "4px 0" }}>
                {globalSlaStats.globalSlaPct}%
              </p>
              <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden", margin: "12px 0 8px 0" }}>
                <div style={{ height: "100%", width: `${globalSlaStats.globalSlaPct}%`, background: globalSlaStats.globalSlaPct >= 95 ? "var(--emerald)" : "var(--amber)", borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {lang === "es" 
                  ? `Meta: >= 95% (${globalSlaStats.completedOnTimeCount}/${globalSlaStats.completedWithDueCount} a tiempo)` 
                  : `Target: >= 95% (${globalSlaStats.completedOnTimeCount}/${globalSlaStats.completedWithDueCount} on time)`}
              </span>
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", fontFamily: "'Orbitron',sans-serif", letterSpacing: "0.05em" }}>ENTREGAS COMPLETADAS</span>
                <CheckCircle2 style={{ width: 16, height: 16, color: "var(--emerald)" }} />
              </div>
              <p style={{ fontSize: 32, fontWeight: 800, color: "var(--foreground)", fontFamily: "'Orbitron',sans-serif", margin: "4px 0" }}>
                {globalSlaStats.completedCount}
              </p>
              <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginTop: 22 }}>
                {lang === "es" ? "Tareas movidas a Completado con éxito" : "Tasks successfully resolved"}
              </span>
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", fontFamily: "'Orbitron',sans-serif", letterSpacing: "0.05em" }}>SLA BREACH ACTIVO</span>
                <AlertTriangle style={{ width: 16, height: 16, color: "var(--red)" }} />
              </div>
              <p style={{ fontSize: 32, fontWeight: 800, color: overdue > 0 ? "var(--red)" : "var(--text-muted)", fontFamily: "'Orbitron',sans-serif", margin: "4px 0" }}>
                {overdue}
              </p>
              <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginTop: 22 }}>
                {lang === "es" ? "Tareas con fecha límite vencida activas" : "Active tasks past their due date"}
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
            {/* Area SLA OKR */}
            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 16, fontFamily: "'Orbitron',sans-serif" }}>
                {lang === "es" ? "Salud Operativa: SLA por Área (Meta: >= 95%)" : "Health: Area SLA Compliance (Target: >= 95%)"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {areaSlaStats.map(stat => (
                  <div key={stat.area.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: stat.area.color }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{stat.area.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {stat.avgLeadTimeHours !== null ? `${stat.avgLeadTimeHours}h avg` : "—"}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                          background: stat.okrStatus === "success" ? "rgba(6,214,160,0.12)" : "rgba(253,171,61,0.12)",
                          color: stat.okrStatus === "success" ? "var(--emerald)" : "var(--amber)"
                        }}>
                          {stat.slaPct}% {stat.okrStatus === "success" ? "🟢 OK" : "⚠️ En Riesgo"}
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${stat.slaPct}%`, background: stat.area.color, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User Workload OKR */}
            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 16, fontFamily: "'Orbitron',sans-serif" }}>
                {lang === "es" ? "Salud Operativa: Carga de Equipo (Límite: <= 5 Activas)" : "Health: Workload Distribution (Limit: <= 5 Active)"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: 300, overflowY: "auto", paddingRight: 6 }}>
                {memberLoadStats.map(stat => (
                  <div key={stat.member.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--cyan-dim)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--cyan)", flexShrink: 0 }}>
                        {stat.member.name[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {stat.member.name}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: stat.okrStatus === "success" ? "var(--foreground)" : "var(--red)" }}>
                        {stat.activeTasks}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                        background: stat.okrStatus === "success" ? "rgba(6,214,160,0.1)" : "rgba(239,68,68,0.1)",
                        color: stat.okrStatus === "success" ? "var(--emerald)" : "var(--red)"
                      }}>
                        {stat.okrStatus === "success" ? (lang === "es" ? "Estable" : "Healthy") : (lang === "es" ? "Saturado" : "Overloaded")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSave={fullCreate} members={members} />}
      {showRequest && <RequestModal onClose={() => setShowRequest(false)} onSave={createRequest} areas={config.areas} members={members} />}
      {editTask && (
        <TaskDetailModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onSave={fullUpdate}
          members={members}
          onRefresh={fetch_}
          onSubtaskCreate={createSubtask}
          onSubtaskPatch={patchSubtask}
          onSubtaskDelete={deleteSubtask}
        />
      )}

      {/* STRATEGY OKRS VIEW */}
      {!loading && viewMode === "okrs" && (
        <div style={{ padding: 20 }} className="glass-panel">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <TrendingUp style={{ width: 20, height: 20, color: "var(--cyan)" }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", fontFamily: "'Orbitron',sans-serif" }}>
              {lang === "es" ? "Estrategia Trimestral (OKRs)" : "Quarterly Strategy (OKRs)"}
            </h2>
          </div>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.5 }}>
            {lang === "es" 
              ? "Aquí podrás visualizar los Objetivos y Resultados Clave (OKRs) de tu equipo y cómo las tareas operativas aportan a su cumplimiento. Esta funcionalidad está en fase beta y pronto se integrará completamente con tus tareas."
              : "Here you can visualize your team's Objectives and Key Results (OKRs) and how operational tasks contribute to their achievement. This feature is in beta and will soon be fully integrated with your tasks."}
          </p>
          <div style={{ padding: 24, background: "rgba(255,255,255,0.02)", border: "1px dashed var(--border)", borderRadius: 8, textAlign: "center" }}>
             <span style={{ fontSize: 12, color: "var(--text-muted)" }}>[Modulo de OKRs en construcción]</span>
          </div>
        </div>
      )}
    </div>
  );
}
