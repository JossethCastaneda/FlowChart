"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Users, Plus, Trash2, Loader2, ChevronDown, ChevronRight, Search,
  Calendar as CalendarIcon, X, Clock, AlertTriangle, CheckCircle2, Tag, FileText,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  LayoutGrid, List, ChevronLeft, MessageSquare, Paperclip, History,
  Send, Upload, ExternalLink, Image as ImageIcon, CheckSquare, Square, Target, TrendingUp, Briefcase,
  Download, ShieldCheck, RotateCcw, AlertOctagon
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSession } from "next-auth/react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
import { parseWorkflow, findUserArea, estimateEtaHours, etaDate, getPermissions, type WorkflowConfig, type Area, type AreaPermissions } from "@/lib/workflow-config";
import { useLanguage } from "@/components/layout/LanguageContext";
import { useTasks } from "./useTasks";
import { useTaskFilters } from "./useTaskFilters";
import { GanttView } from "./GanttView";
import { CalendarView } from "./CalendarView";
import { KanbanBoard } from "./KanbanBoard";
import { MyTasksView } from "./MyTasksView";
import { showToast } from "@/components/ui/Toast";
import { dateInputToISO, isoToDateInput } from "@/lib/date-input";
import type { Task, Member, Attachment } from "./types";
import { PRIO_CFG, PRIORITIES } from "./types";
interface Comment { id: string; userId: string; userName: string; userImage: string | null; content: string; createdAt: string }
interface Activity { id: string; userName: string; action: string; field: string | null; oldValue: string | null; newValue: string | null; createdAt: string }

/* ═══ CONFIG ═══ */
const STATUS_CFG: Record<string, { label: string; bg: string; c: string }> = {
  Backlog: { label: "Backlog", bg: "var(--fc-text-muted)", c: "#fff" },
  WIP:     { label: "En Progreso", bg: "var(--fc-warning)", c: "#fff" },
  Review:  { label: "En Review", bg: "var(--fc-danger)", c: "#fff" },
  Done:    { label: "Completado", bg: "var(--fc-success)", c: "#fff" },
};
const GROUPS = [
  { key: "Backlog", label: "Backlog", color: "var(--fc-text-secondary)" },
  { key: "WIP", label: "En Progreso", color: "var(--fc-warning)", wipLimit: 5 },
  { key: "Review", label: "En Review", color: "var(--fc-danger)" },
  { key: "Done", label: "Completado", color: "var(--fc-success)" },
];
const STATUSES = Object.keys(STATUS_CFG);
const TAG_PRESETS = ["Contenido", "Diseño", "Pauta", "Reportes", "Estrategia", "SEO", "CRM", "Social Media"];
const GROUP_LABELS: Record<string, string> = { status: "Estado", assignee: "Responsable", priority: "Prioridad" };
const ch: React.CSSProperties = { padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--fc-text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase" };

const TRANSLATIONS = {
  es: {
    title: "Marketing Ops",
    subtitle: "Gestión de tareas, workflows y operaciones del equipo.",
    all: "Todas",
    myArea: "Mi Área",
    searchPlaceholder: "Buscar tareas...",
    groupBy: "Agrupar por",
    assignee: "Responsable",
    area: "Área",
    evidence: "Evidencias",
    awaitingApproval: "Esperando aprobación del líder del área",
    approve: "Aprobar",
    sendBack: "Devolver",
    confirmReject: "Devolver tarea",
    rejectReason: "Motivo de la devolución (queda en la bitácora)",
    sentBack: "Devuelta",
    reworkCount: "Devoluciones",
    stalled: "Estancada",
    dropEvidence: "Arrastra o haz clic para subir imágenes, video o archivos",
    uploading: "Subiendo…",
    downloadOriginal: "Descargar original",
    remove: "Quitar",
    pickArea: "Selecciona el área",
    autoAssignHint: "Se asigna automáticamente a quien esté disponible y con menos carga en el área.",
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
    autoAssign: " Auto-asignar (recomendado)",
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
    area: "Area",
    evidence: "Evidence",
    awaitingApproval: "Awaiting area leader approval",
    approve: "Approve",
    sendBack: "Send back",
    confirmReject: "Send task back",
    rejectReason: "Reason for sending back (recorded in the log)",
    sentBack: "Sent back",
    reworkCount: "Send-backs",
    stalled: "Stalled",
    dropEvidence: "Drag or click to upload images, video or files",
    uploading: "Uploading…",
    downloadOriginal: "Download original",
    remove: "Remove",
    pickArea: "Select the area",
    autoAssignHint: "Automatically assigned to whoever is available with the lightest load in the area.",
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
    autoAssign: " Auto-assign (recommended)",
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
  if (!due || st === "Done") return { l: "—", c: "var(--fc-text-muted)", bg: "transparent", i: "none" as const };
  const d = (new Date(due).getTime() - Date.now()) / 36e5;
  const days = Math.ceil(d / 24);
  if (d < 0) return { l: lang === "es" ? `${Math.abs(days)}d vencido` : `${Math.abs(days)}d overdue`, c: "var(--fc-danger)", bg: "var(--fc-danger-wash)", i: "late" as const };
  if (d <= 24) return { l: lang === "es" ? "Vence hoy" : "Due today", c: "var(--fc-warning)", bg: "rgba(253,171,61,0.1)", i: "warn" as const };
  if (days <= 3) return { l: `${days}d`, c: "var(--fc-warning)", bg: "rgba(253,171,61,0.08)", i: "warn" as const };
  return { l: `${days}d`, c: "var(--fc-success)", bg: "rgba(52,183,124,0.08)", i: "ok" as const };
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
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
          marginTop: 4, zIndex: 150, background: "var(--fc-surface)",
          border: "1px solid var(--fc-border)", borderRadius: 8, overflow: "hidden",
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
    <button onClick={onClick} style={{ display: "block", width: "100%", padding: "8px 12px", border: "none", cursor: "pointer", textAlign: "left", background: active ? "var(--surface-hover)" : "transparent", fontSize: 12, color: "var(--fc-text)" }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"} onMouseLeave={e => e.currentTarget.style.background = active ? "var(--surface-hover)" : "transparent"}>
      {color && <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: color, marginRight: 8, verticalAlign: "middle" }} />}{label}
    </button>
  );
}
function EditableCell({ value, onSave, placeholder }: { value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO: [React] Refactor de hooks anti-patrón
  useEffect(() => { setText(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const save = () => { setEditing(false); if (text.trim() !== value) onSave(text.trim()); };
  if (editing) return <input ref={ref} value={text} onChange={e => setText(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setText(value); setEditing(false); } }} style={{ background: "var(--fc-accent-wash)", border: "1px solid var(--fc-accent)", color: "var(--fc-text)", fontSize: 12, padding: "4px 8px", outline: "none", width: "100%", borderRadius: 4 }} />;
  return <div onClick={() => setEditing(true)} style={{ cursor: "text", padding: "4px 8px", borderRadius: 4, minHeight: 28, display: "flex", alignItems: "center", fontSize: 12, color: value ? "var(--fc-text)" : "var(--fc-text-muted)" }} onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{value || placeholder || "—"}</div>;
}

/* ═══ TASK DETAIL MODAL (with Comments, Attachments, Activity, Subtasks checklist) ═══ */
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", fontSize: 12, background: "var(--surface-hover)", border: "1px solid var(--fc-border)", color: "var(--fc-text)", outline: "none", borderRadius: 4 };
const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "var(--fc-text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" };

function TaskDetailModal({ task, allTasks, onClose, onSave, members, onRefresh, onSubtaskCreate, onSubtaskPatch, onSubtaskDelete, canApproveTask }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  task: Task; allTasks: Task[]; onClose: () => void; onSave: (d: any) => void; members: Member[]; onRefresh: () => void;
  onSubtaskCreate: (parentId: string, title: string) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  onSubtaskPatch: (id: string, p: any) => Promise<void>;
  onSubtaskDelete: (id: string) => Promise<void>;
  /** El usuario actual puede aprobar/devolver el trabajo de esta tarea. */
  canApproveTask: boolean;
}) {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];
  const [tab, setTab] = useState<"details" | "subtasks" | "comments" | "activity">("details");
  const [form, setForm] = useState({
    title: task.title, description: task.description || "", assignee: task.assignee || "", assigneeId: task.assigneeId || "",
    priority: task.priority, status: task.status,
    dueDate: isoToDateInput(task.dueDate), 
    startDate: isoToDateInput(task.startDate),
    estimate: task.estimate || "",
    blockedBy: task.blockedBy?.map(b => b.id) || [],
    tags: task.tags || [] as string[],
  });
  const [tagInput, setTagInput] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const [reviewing, setReviewing] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);

  /** Aprueba o devuelve una tarea que está esperando revisión del líder. */
  const resolveReview = async (decision: "approve" | "reject") => {
    setReviewing(true);
    try {
      const r = await fetch(`/api/ops/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approval: decision,
          ...(decision === "reject" ? { rejectionNote: rejectNote.trim() || null } : {}),
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        setUploadError(d?.error || "No se pudo registrar la revisión");
        setReviewing(false);
        return;
      }
      setShowReject(false);
      setRejectNote("");
      onRefresh();
      onClose();
    } catch {
      setUploadError("No se pudo registrar la revisión");
    }
    setReviewing(false);
  };
  const commentEndRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const addTag = (tg: string) => { const s = tg.trim(); if (s && !form.tags.includes(s)) set("tags", [...form.tags, s]); setTagInput(""); };
  const submit = async () => { 
    if (!form.title.trim()) return; 
    setSaving(true); 
    await onSave({ 
      ...form, 
      // `<input type="date">` da "2026-08-10"; el API espera ISO con desfase.
      // Vencimiento = fin de ese día; inicio = comienzo.
      dueDate: dateInputToISO(form.dueDate, "end"),
      startDate: dateInputToISO(form.startDate, "start"),
      estimate: form.estimate ? Number(form.estimate) : null,
      blockedBy: form.blockedBy.map(id => ({ id }))
    }); 
    setSaving(false); 
  };
  const sl = form.dueDate ? sla(form.dueDate, form.status, lang) : null;

  // Load comments + activity
  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const r = await fetch(`/api/ops/${task.id}/comments`);
      const d = await r.json();
      if (d.data?.comments) setComments(d.data.comments);
      if (d.data?.activities) setActivities(d.data.activities);
    } catch {} finally { setLoadingComments(false); }
  }, [task.id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO: [React] Refactor de hooks anti-patrón
  useEffect(() => { loadComments(); }, [loadComments]);
  useEffect(() => { if (tab === "comments") setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }, [tab, comments.length]);

  const postComment = async () => {
    if (!commentText.trim()) return;
    try {
      const r = await fetch(`/api/ops/${task.id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: commentText }) });
      if (r.ok) { setCommentText(""); loadComments(); }
    } catch {}
  };

  /**
   * Sube evidencias (imágenes, video, documentos) SIN recomprimir: el servidor
   * guarda el archivo tal cual, así que lo que se descargue es idéntico a lo
   * que se subió.
   */
  const uploadEvidence = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    setUploadError(null);
    for (const file of list) {
      try {
        const body = new FormData();
        body.append("file", file);
        const r = await fetch(`/api/ops/${task.id}/attachments`, { method: "POST", body });
        if (!r.ok) {
          const d = await r.json().catch(() => null);
          throw new Error(d?.error || `No se pudo subir ${file.name}`);
        }
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : `No se pudo subir ${file.name}`);
        break;
      }
    }
    setUploading(false);
    onRefresh();
  };

  const removeEvidence = async (attachmentId: string) => {
    try {
      const r = await fetch(`/api/ops/${task.id}/attachments?attachmentId=${encodeURIComponent(attachmentId)}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        setUploadError(d?.error || "No se pudo eliminar la evidencia");
        return;
      }
      onRefresh();
    } catch {
      setUploadError("No se pudo eliminar la evidencia");
    }
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
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "3vh 16px", background: "var(--panel-bg)",  }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 700, background: "var(--fc-surface)", border: "1px solid var(--fc-border)", borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid var(--fc-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileText style={{ width: 18, height: 18, color: "var(--fc-accent)" }} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, color: "var(--fc-text)", letterSpacing: "0.1em" }}>{t.title}</span>
            <Pill label={STATUS_CFG[task.status]?.label || task.status} bg={STATUS_CFG[task.status]?.bg || "var(--fc-text-muted)"} color={STATUS_CFG[task.status]?.c || "#fff"} />
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--fc-text-secondary)", cursor: "pointer", padding: 4 }}><X style={{ width: 18, height: 18 }} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--fc-border)", padding: "0 24px", background: "var(--surface-hover)" }}>
          {tabs.map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "12px 16px", border: "none", cursor: "pointer",
              background: "none", fontSize: 11, fontWeight: 600,
              color: tab === tb.key ? "var(--fc-accent)" : "var(--fc-text-secondary)",
              borderBottom: tab === tb.key ? "2px solid var(--fc-accent)" : "2px solid transparent",
              transition: "all 0.15s",
            }}>{tb.icon}{tb.label}</button>
          ))}
        </div>

        {/* ── Banda de revisión ─────────────────────────────────────────────
            Cuando la tarea espera aprobación, el líder resuelve aquí mismo:
            aprobar la cierra, devolver la regresa a quien la entregó con el
            motivo registrado en la bitácora. */}
        {task.approvalState === "pending" && (
          <div style={{ margin: "12px 24px 0", padding: "12px 14px", borderRadius: 8, background: "rgba(224,168,60,0.06)", border: "1px solid rgba(224,168,60,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: canApproveTask ? 10 : 0 }}>
              <ShieldCheck style={{ width: 15, height: 15, color: "var(--fc-warning)", flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 12, color: "var(--fc-text)" }}>
                {t.awaitingApproval}
                {task.submittedAt && (
                  <span style={{ color: "var(--fc-text-muted)" }}> · {new Date(task.submittedAt).toLocaleString()}</span>
                )}
              </div>
              {(task.reworkCount ?? 0) > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--fc-danger)" }}>
                  {t.reworkCount}: {task.reworkCount}
                </span>
              )}
            </div>

            {canApproveTask && (
              showReject ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <textarea
                    rows={2}
                    style={{ ...inp, resize: "vertical" }}
                    placeholder={t.rejectReason}
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => setShowReject(false)} disabled={reviewing}
                      style={{ padding: "6px 14px", borderRadius: 6, background: "transparent", border: "1px solid var(--fc-border)", color: "var(--fc-text-secondary)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      {t.cancel}
                    </button>
                    <button onClick={() => resolveReview("reject")} disabled={reviewing}
                      style={{ padding: "6px 14px", borderRadius: 6, background: "var(--fc-danger-wash)", border: "1px solid rgba(229,72,77,0.3)", color: "var(--fc-danger)", fontSize: 11, fontWeight: 700, cursor: reviewing ? "wait" : "pointer", fontFamily: "inherit" }}>
                      {t.confirmReject}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowReject(true)} disabled={reviewing}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 6, background: "transparent", border: "1px solid rgba(229,72,77,0.3)", color: "var(--fc-danger)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    <RotateCcw style={{ width: 11, height: 11 }} /> {t.sendBack}
                  </button>
                  <button onClick={() => resolveReview("approve")} disabled={reviewing}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 16px", borderRadius: 6, background: "var(--fc-success)", border: "none", color: "#04140c", fontSize: 11, fontWeight: 700, cursor: reviewing ? "wait" : "pointer", fontFamily: "inherit" }}>
                    {reviewing ? <Loader2 className="animate-spin" style={{ width: 11, height: 11 }} /> : <CheckCircle2 style={{ width: 11, height: 11 }} />}
                    {t.approve}
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* Motivo de la última devolución — visible para quien debe rehacerla. */}
        {task.approvalState === "rejected" && task.rejectionNote && (
          <div style={{ margin: "12px 24px 0", padding: "10px 14px", borderRadius: 8, background: "var(--fc-danger-wash)", border: "1px solid rgba(229,72,77,0.25)", display: "flex", gap: 8 }}>
            <AlertOctagon style={{ width: 15, height: 15, color: "var(--fc-danger)", flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: "var(--fc-text)" }}>
              <strong>{t.sentBack}:</strong> {task.rejectionNote}
            </div>
          </div>
        )}

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
              <div><label style={lbl}>{lang === "es" ? "Estimación (hs)" : "Estimate (hrs)"}</label><input type="number" min="0" step="0.5" style={{ ...inp }} value={form.estimate} onChange={e => set("estimate", e.target.value)} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={lbl}>{lang === "es" ? "Fecha Inicio" : "Start Date"}</label><input type="date" style={{ ...inp, cursor: "pointer" }} value={form.startDate} onChange={e => set("startDate", e.target.value)} /></div>
              <div><label style={lbl}>{t.dueDate}</label><input type="date" style={{ ...inp, cursor: "pointer" }} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} /></div>
            </div>
            <div>
              <label style={lbl}>{lang === "es" ? "Dependencias (Bloqueado por)" : "Dependencies (Blocked by)"}</label>
              <select style={{ ...inp, cursor: "pointer", height: "auto" }} multiple size={3} value={form.blockedBy} onChange={e => {
                const options = Array.from(e.target.selectedOptions, option => option.value);
                set("blockedBy", options);
              }}>
                {allTasks.filter(t => t.id !== task.id && !t.parentId).map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <span style={{ fontSize: 10, color: "var(--fc-text-muted)", marginTop: 4, display: "block" }}>{lang === "es" ? "Mantén Ctrl/Cmd para seleccionar múltiples" : "Hold Ctrl/Cmd to select multiple"}</span>
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
                {form.tags.map((tg, i) => <span key={i} style={{ fontSize: 10, padding: "2px 8px", background: "var(--fc-accent-wash)", border: "1px solid var(--fc-border)", color: "var(--fc-accent)", borderRadius: 4, display: "flex", alignItems: "center", gap: 4 }}>{tg}<X style={{ width: 8, height: 8, cursor: "pointer" }} onClick={() => set("tags", form.tags.filter((_, j) => j !== i))} /></span>)}
              </div>
              <input style={inp} placeholder={t.addTagPlaceholder} value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {TAG_PRESETS.filter(tg => !form.tags.includes(tg)).slice(0, 6).map(tg => <button key={tg} onClick={() => addTag(tg)} style={{ fontSize: 9, padding: "2px 8px", border: "1px solid var(--fc-border)", background: "transparent", color: "var(--fc-text-secondary)", cursor: "pointer", borderRadius: 4 }}>+ {tg}</button>)}
              </div>
            </div>
            {/* ── Evidencias ─────────────────────────────────────────────
                Imágenes y video se previsualizan aquí; "Descargar original"
                trae el archivo tal cual se subió, sin recompresión. */}
            <div>
              <label style={lbl}><Paperclip style={{ width: 10, height: 10, display: "inline", verticalAlign: "middle", marginRight: 4 }} />{t.evidence}</label>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                {((task.attachments || []) as Attachment[]).map((a, i) => (
                  <div key={a.id || i} style={{ background: "var(--surface-hover)", border: "1px solid var(--fc-border)", borderRadius: 8, overflow: "hidden" }}>
                    {a.type === "image" && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.url} alt={a.name} style={{ width: "100%", maxHeight: 220, objectFit: "contain", display: "block", background: "rgba(0,0,0,0.3)" }} />
                    )}
                    {a.type === "video" && (
                      <video src={a.url} controls preload="metadata" style={{ width: "100%", maxHeight: 240, display: "block", background: "#000" }} />
                    )}
                    {a.type === "audio" && (
                      <audio src={a.url} controls style={{ width: "100%", display: "block" }} />
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", fontSize: 12 }}>
                      {a.type === "image" ? <ImageIcon style={{ width: 14, height: 14, color: "var(--fc-module-aria)", flexShrink: 0 }} />
                        : <FileText style={{ width: 14, height: 14, color: "var(--fc-accent)", flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                        <div style={{ fontSize: 10, color: "var(--fc-text-muted)" }}>
                          {a.size ? `${(a.size / 1048576).toFixed(1)} MB` : ""}
                          {a.uploadedByName ? ` · ${a.uploadedByName}` : ""}
                        </div>
                      </div>
                      <a
                        href={a.downloadUrl || a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t.downloadOriginal}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 4, background: "var(--fc-accent-wash)", color: "var(--fc-accent)", textDecoration: "none", fontSize: 10, fontWeight: 600, flexShrink: 0 }}
                      >
                        <Download style={{ width: 11, height: 11 }} /> {t.downloadOriginal}
                      </a>
                      {a.id && (
                        <button onClick={() => removeEvidence(a.id!)} title={t.remove}
                          style={{ background: "transparent", border: "none", color: "var(--fc-danger)", cursor: "pointer", padding: 4, display: "flex", flexShrink: 0 }}>
                          <X style={{ width: 12, height: 12 }} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <input
                ref={evidenceInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip"
                style={{ display: "none" }}
                onChange={e => { if (e.target.files) uploadEvidence(e.target.files); e.target.value = ""; }}
              />
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); if (e.dataTransfer.files?.length) uploadEvidence(e.dataTransfer.files); }}
                onClick={() => evidenceInputRef.current?.click()}
                style={{ border: "1px dashed var(--border-strong)", borderRadius: 8, padding: "14px 12px", textAlign: "center", cursor: uploading ? "wait" : "pointer", color: "var(--fc-text-secondary)", fontSize: 12, opacity: uploading ? 0.6 : 1 }}
              >
                {uploading
                  ? <><Loader2 className="animate-spin" style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />{t.uploading}</>
                  : <><Upload style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />{t.dropEvidence}</>}
              </div>
              {uploadError && (
                <p style={{ fontSize: 11, color: "var(--fc-danger)", margin: "6px 2px 0" }}>{uploadError}</p>
              )}
            </div>
          </div>
        )}

        {/* ── Subtasks Tab (Notion style checklist) ── */}
        {tab === "subtasks" && (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", height: "55vh" }}>
            {/* Progress bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--fc-text-secondary)", marginBottom: 6 }}>
                <span>{lang === "es" ? "Progreso de Subtareas" : "Subtasks Progress"}</span>
                <span style={{ fontWeight: 700, color: "var(--fc-text)" }}>{subtaskDone}/{subtaskTotal} ({subtaskPct}%)</span>
              </div>
              <div style={{ height: 6, background: "var(--fc-border)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${subtaskPct}%`, background: "var(--fc-success)", borderRadius: 3, transition: "width 0.3s ease" }} />
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {subtaskTotal === 0 && (
                <p style={{ textAlign: "center", color: "var(--fc-text-muted)", fontSize: 12, padding: "32px 0" }}>
                  {lang === "es" ? "No hay subtareas registradas." : "No subtasks recorded."}
                </p>
              )}
              {task.children?.map(sub => {
                const isDone = sub.status === "Done";
                return (
                  <div key={sub.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 12px", background: "var(--surface-hover)", border: "1px solid var(--fc-border)", borderRadius: 6 }}>
                    <button
                      onClick={() => onSubtaskPatch(sub.id, { status: isDone ? "Backlog" : "Done" })}
                      style={{ background: "none", border: "none", cursor: "pointer", color: isDone ? "var(--fc-success)" : "var(--fc-text-muted)", display: "flex", padding: 0 }}
                    >
                      {isDone ? <CheckSquare style={{ width: 16, height: 16 }} /> : <Square style={{ width: 16, height: 16 }} />}
                    </button>
                    <span style={{ flex: 1, fontSize: 12, color: isDone ? "var(--fc-text-muted)" : "var(--fc-text)", textDecoration: isDone ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {sub.title}
                    </span>
                    <button
                      onClick={() => onSubtaskDelete(sub.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fc-danger)", opacity: 0.7 }}
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
                  padding: "8px 16px", background: "var(--fc-accent-wash)", border: "1px solid var(--border-strong)",
                  borderRadius: 4, color: "var(--fc-accent)", cursor: "pointer", fontSize: 12, fontWeight: 700,
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
              {loadingComments && <div style={{ textAlign: "center", padding: 20 }}><Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite", color: "var(--fc-accent)" }} /></div>}
              {!loadingComments && comments.length === 0 && <p style={{ textAlign: "center", color: "var(--fc-text-secondary)", fontSize: 12, padding: "32px 0" }}>{t.noComments}</p>}
              {comments.map(c => (
                <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--fc-accent-wash)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--fc-accent)", flexShrink: 0 }}>
                    {c.userName[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fc-text)" }}>{c.userName}</span>
                      <span style={{ fontSize: 9, color: "var(--fc-text-muted)" }}>{timeAgo(c.createdAt, lang)}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--fc-text-secondary)", lineHeight: 1.6, margin: 0, wordBreak: "break-word" }}>{c.content}</p>
                  </div>
                </div>
              ))}
              <div ref={commentEndRef} />
            </div>
            <div style={{ padding: "12px 24px", borderTop: "1px solid var(--fc-border)", display: "flex", gap: 8 }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }} placeholder={t.writeComment} style={{ flex: 1, ...inp }} />
              <button onClick={postComment} disabled={!commentText.trim()} style={{ padding: "8px 14px", background: commentText.trim() ? "var(--fc-accent-wash)" : "transparent", border: `1px solid ${commentText.trim() ? "var(--border-strong)" : "var(--fc-border)"}`, borderRadius: 4, color: commentText.trim() ? "var(--fc-accent)" : "var(--fc-text-muted)", cursor: "pointer" }}>
                <Send style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}

        {/* ── Activity Tab ── */}
        {tab === "activity" && (
          <div style={{ padding: "16px 24px", maxHeight: "55vh", overflowY: "auto" }}>
            {activities.length === 0 && <p style={{ textAlign: "center", color: "var(--fc-text-muted)", fontSize: 12, padding: "32px 0" }}>{t.noActivity}</p>}
            {activities.map(a => (
              <div key={a.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--fc-border-subtle)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.action === "status_changed" ? "var(--fc-success)" : a.action === "assigned" ? "var(--fc-accent)" : a.action === "priority_changed" ? "var(--fc-warning)" : "var(--fc-text-muted)", marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: "var(--fc-text-secondary)", margin: 0, lineHeight: 1.5 }}>
                    <strong style={{ color: "var(--fc-text)" }}>{a.userName}</strong> {actLabels[a.action] || a.action}
                    {a.oldValue && a.newValue && <> de <span style={{ color: "var(--fc-danger)", textDecoration: "line-through" }}>{a.oldValue}</span> a <span style={{ color: "var(--fc-success)" }}>{a.newValue}</span></>}
                    {!a.oldValue && a.newValue && <> <span style={{ color: "var(--fc-success)" }}>{a.newValue}</span></>}
                  </p>
                  <span style={{ fontSize: 9, color: "var(--fc-text-muted)" }}>{timeAgo(a.createdAt, lang)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {tab === "details" && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 24px", borderTop: "1px solid var(--fc-border)" }}>
            <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--fc-border)", color: "var(--fc-text-secondary)", cursor: "pointer", fontSize: 12, borderRadius: 4 }}>{t.cancel}</button>
            <button onClick={submit} disabled={saving || !form.title.trim()} className="btn-primary" style={{ padding: "8px 24px", opacity: saving || !form.title.trim() ? 0.5 : 1 }}>{saving ? t.saving : t.update}</button>
          </div>
        )}
      </div>
    </div>, document.body
  );
}

/* ═══ CREATE MODAL ═══ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
function CreateModal({ onClose, onSave, areas, projects }: { onClose: () => void; onSave: (d: any) => void; areas: Area[]; projects: any[] }) {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];
  // Sin "assignee": la asignación la resuelve el servidor por área.
  const [form, setForm] = useState({ title: "", description: "", targetAreaId: "", priority: "P2", status: "Backlog", dueDate: "", projectId: "", clientName: "", tags: [] as string[] });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Extraer clientes únicos
  const clients = useMemo(() => {
    const allClients = projects.map(p => p.client || p.name).filter(Boolean);
    return Array.from(new Set(allClients)).sort();
  }, [projects]);

  // Filtrar proyectos si hay un cliente seleccionado
  const filteredProjects = useMemo(() => {
    if (!form.clientName) return projects;
    return projects.filter(p => (p.client || p.name) === form.clientName);
  }, [projects, form.clientName]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const addTag = (tg: string) => { const s = tg.trim(); if (s && !form.tags.includes(s)) set("tags", [...form.tags, s]); setTagInput(""); };
  const submit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave({
      ...form,
      dueDate: dateInputToISO(form.dueDate, "end"),
      projectId: form.projectId || null,
      targetAreaId: form.targetAreaId || null,
    });
    setSaving(false);
  };

  return createPortal(
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} 
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
    >
      <motion.div 
        initial={{ y: 20, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0, scale: 0.95 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()} 
        style={{ width: "100%", maxWidth: 650, background: "rgba(18, 18, 20, 0.95)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, var(--fc-accent), #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(59,130,246,0.3)" }}>
              <CheckCircle2 style={{ width: 18, height: 18, color: "white" }} />
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--fc-text)", letterSpacing: "0.02em" }}>{lang === "es" ? "Nueva Tarea" : "New Task"}</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fc-text-secondary)", cursor: "pointer", transition: "all 0.2s" }}><X style={{ width: 20, height: 20 }} /></button>
        </div>
        
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, flex: 1, overflowY: "auto" }}>
          {/* SECCIÓN DETALLES */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ ...lbl, fontSize: 11, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, opacity: 0.8 }}><FileText size={14} /> {t.taskTitle} <span style={{ color: "var(--fc-danger)" }}>*</span></label>
              <input style={{ ...inp, fontSize: 15, padding: "12px 16px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, transition: "all 0.2s" }} placeholder="Ej: Configurar campaña de Leads..." value={form.title} onChange={e => set("title", e.target.value)} autoFocus />
            </div>
            <div>
              <label style={{ ...lbl, fontSize: 11, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, opacity: 0.8 }}><LayoutGrid size={14} /> {t.description}</label>
              <textarea rows={3} style={{ ...inp, resize: "vertical", fontSize: 14, padding: "12px 16px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, transition: "all 0.2s" }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Agrega contexto, requerimientos, enlaces..." />
            </div>
          </div>

          {/* SECCIÓN CLIENTE & ASIGNACIÓN */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ ...lbl, fontSize: 11, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, color: "var(--fc-accent)", opacity: 0.9 }}><Briefcase size={14} /> Cliente (Opcional)</label>
                <select style={{ ...inp, cursor: "pointer", fontSize: 13, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, transition: "all 0.2s" }} value={form.clientName} onChange={e => { set("clientName", e.target.value); set("projectId", ""); }}>
                  <option value="">-- Todos los clientes --</option>
                  {clients.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...lbl, fontSize: 11, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, color: "var(--fc-accent)", opacity: 0.9 }}><Target size={14} /> Proyecto</label>
                <select style={{ ...inp, cursor: "pointer", fontSize: 13, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, transition: "all 0.2s" }} value={form.projectId} onChange={e => set("projectId", e.target.value)}>
                  <option value="">-- Seleccionar Proyecto --</option>
                  {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* ÁREA — sustituye a "Responsable". Quién la ejecuta lo decide
                  el servidor por disponibilidad y carga dentro del área. */}
              <div>
                <label style={{ ...lbl, fontSize: 11, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, color: "var(--fc-success)", opacity: 0.9 }}><Users size={14} /> {t.area}</label>
                <select
                  style={{ ...inp, cursor: "pointer", fontSize: 13, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, transition: "all 0.2s" }}
                  value={form.targetAreaId}
                  onChange={e => set("targetAreaId", e.target.value)}
                >
                  <option value="">{t.pickArea}</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <p style={{ fontSize: 10, color: "var(--fc-text-muted)", margin: "6px 2px 0", lineHeight: 1.4 }}>
                  {t.autoAssignHint}
                </p>
              </div>
              <div>
                <label style={{ ...lbl, fontSize: 11, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, color: "var(--fc-success)", opacity: 0.9 }}><CalendarIcon size={14} /> {t.dueDate}</label>
                <input type="date" style={{ ...inp, cursor: "pointer", fontSize: 13, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, transition: "all 0.2s" }} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
              </div>
            </div>
          </div>

          {/* SECCIÓN CLASIFICACIÓN & TAGS */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ ...lbl, fontSize: 11, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, color: "var(--fc-warning)", opacity: 0.9 }}><AlertTriangle size={14} /> {t.priority}</label>
                <select style={{ ...inp, cursor: "pointer", fontSize: 13, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, transition: "all 0.2s" }} value={form.priority} onChange={e => set("priority", e.target.value)}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{PRIO_CFG[p].label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...lbl, fontSize: 11, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, color: "var(--fc-warning)", opacity: 0.9 }}><Clock size={14} /> {t.status}</label>
                <select style={{ ...inp, cursor: "pointer", fontSize: 13, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, transition: "all 0.2s" }} value={form.status} onChange={e => set("status", e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={{ ...lbl, fontSize: 11, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, color: "var(--fc-module-aria)", opacity: 0.9 }}><Tag size={14} /> Etiquetas (Opcional)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {form.tags.map((tg, i) => (
                  <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} key={i} style={{ fontSize: 11, padding: "4px 10px", background: "rgba(168, 85, 247, 0.1)", color: "#c084fc", border: "1px solid rgba(168, 85, 247, 0.2)", borderRadius: 16, display: "flex", alignItems: "center", gap: 6 }}>
                    {tg}
                    <X style={{ width: 12, height: 12, cursor: "pointer", opacity: 0.7 }} onClick={() => set("tags", form.tags.filter((_, j) => j !== i))} />
                  </motion.span>
                ))}
              </div>
              <input style={{ ...inp, fontSize: 13, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, transition: "all 0.2s" }} placeholder={t.addTagPlaceholder} value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {TAG_PRESETS.filter(tg => !form.tags.includes(tg)).slice(0, 6).map(tg => (
                  <button key={tg} onClick={() => addTag(tg)} style={{ fontSize: 10, padding: "4px 12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "var(--fc-text-secondary)", cursor: "pointer", borderRadius: 16, transition: "background 0.2s" }}>
                    + {tg}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, padding: "20px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.4)" }}>
          <button onClick={onClose} style={{ padding: "10px 24px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "var(--fc-text-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 600, borderRadius: 8, transition: "all 0.2s" }}>{t.cancel}</button>
          <button onClick={submit} disabled={saving || !form.title.trim()} style={{ padding: "10px 32px", fontSize: 13, fontWeight: 700, borderRadius: 8, background: "linear-gradient(135deg, var(--fc-accent), #2563eb)", border: "none", color: "white", cursor: saving || !form.title.trim() ? "not-allowed" : "pointer", opacity: saving || !form.title.trim() ? 0.5 : 1, transition: "all 0.2s", boxShadow: saving || !form.title.trim() ? "none" : "0 4px 14px rgba(59,130,246,0.4)" }}>
            {saving ? <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} /> : t.create}
          </button>
        </div>
      </motion.div>
    </motion.div>, document.body
  );
}

/* ═══ FILTER CHIP ═══ */
function FilterChip({ label, value, active, children }: { label: string; value: string; active?: boolean; children: (close: () => void) => React.ReactNode }) {
  return (
    <Dropdown trigger={
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, cursor: "pointer",
        background: active ? "var(--fc-accent-wash)" : "var(--fc-surface)",
        border: `1px solid ${active ? "var(--border-strong)" : "var(--fc-border)"}`,
        fontSize: 11, whiteSpace: "nowrap",
      }}>
        <span style={{ color: "var(--fc-text-secondary)" }}>{label}:</span>
        <span style={{ fontWeight: 700, color: active ? "var(--fc-accent)" : "var(--fc-text)" }}>{value}</span>
        <ChevronDown style={{ width: 12, height: 12, color: "var(--fc-text-muted)" }} />
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

  const { tasks, members, projects, loading, fetchTasks: fetch_, patchTask, createTask, createSubtask, patchSubtask, deleteSubtask } = useTasks();
  const { viewMode, setViewMode, groupBy, setGroupBy, fAssignee, setFAssignee, fPriority, setFPriority, fTag, setFTag, fArea, setFArea, viewArea, setViewArea } = useTaskFilters();

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  const [addingSubIn, setAddingSubIn] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const newRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  const subRef = useRef<HTMLInputElement>(null);

  const { data: session } = useSession();
  const [config, setConfig] = useState<WorkflowConfig>({ areas: [], requireLeadReview: true });
  
  useEffect(() => {
    fetch("/api/workspace/settings")
      .then(r => r.json())
      .then(d => setConfig(parseWorkflow(d)))
      .catch(() => {});
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
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

  // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO: [React] Refactor de hooks anti-patrón
  useEffect(() => { if (myArea && viewArea === "__all__") setViewArea("__mine__"); }, [myArea]);

  /** Mensaje de error de creación — si falla, el usuario debe enterarse. */
  const reportCreateError = (e: unknown) => {
    showToast(
      "error",
      e instanceof Error
        ? e.message
        : lang === "es" ? "No se pudo crear la tarea." : "Could not create the task."
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const createWith = async (defaults: any) => {
    if (!newTitle.trim()) return;
    try {
      await createTask({ title: newTitle.trim(), status: "Backlog", ...defaults });
    } catch (e) {
      reportCreateError(e);
      return;
    }
    setNewTitle("");
    setAddingIn(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const fullCreate = async (data: any) => {
    try {
      await createTask(data);
    } catch (e) {
      reportCreateError(e);
      return;
    }
    setShowCreate(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const fullUpdate = async (data: any) => {
    if (!editTask) return;
    // Ya no se bloquea: el servidor decide. Si el área exige revisión, la
    // tarea pasa a manos del líder en vez de cerrarse, y se avisa de ello.
    if (data.status === "Done" && !canCloseTask(editTask)) {
      showToast("success", lang === "es"
        ? "Enviada al líder del área para su aprobación."
        : "Sent to the area leader for approval.");
    }
    await patchTask(editTask.id, data);
    setEditTask(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const patch = async (id: string, p: any) => {
    if (p.status === "Done") {
      const tsk = tasks.find(x => x.id === id) || tasks.flatMap(x => x.children || []).find(c => c.id === id);
      if (tsk && !canCloseTask(tsk)) {
        showToast("success", lang === "es"
          ? "Enviada al líder del área para su aprobación."
          : "Sent to the area leader for approval.");
      }
    }
    await patchTask(id, p);
  };

  const del = async (id: string) => {
    if (!confirm(lang === "es" ? "¿Eliminar esta tarea?" : "Delete this task?")) return;
    await deleteSubtask(id); // useTasks handles optimistic delete and fallback
  };

  const cnt = (s: string) => tasks.filter(t => t.status === s).length;
  const overdue = tasks.filter(t => t.dueDate && t.status !== "Done" && new Date(t.dueDate) < new Date()).length;

  /**
   * Estancamiento: cuánto lleva sin avanzar y quién la tiene detenida.
   * El umbral es el SLA del área (24 h por defecto). Se calcula desde
   * `lastProgressAt` — el último cambio de estado o de responsable — para que
   * editar el título no disimule una tarea parada.
   */
  const stallOf = useCallback((tsk: Task): { stalled: boolean; hours: number; holder: string } | null => {
    if (tsk.status === "Done" || !tsk.lastProgressAt) return null;
    const hours = (Date.now() - new Date(tsk.lastProgressAt).getTime()) / 36e5;
    const area = (tsk.targetAreaId ? config.areas.find(a => a.id === tsk.targetAreaId) : null) || areaForAssignee(tsk.assignee);
    const threshold = area?.slaHours && area.slaHours > 0 ? area.slaHours : 24;
    if (hours <= threshold) return null;
    const holderId = tsk.holderId;
    const holder = holderId
      ? members.find(m => m.id === holderId)?.name || holderId
      : (lang === "es" ? "sin responsable" : "unassigned");
    return { stalled: true, hours: Math.round(hours), holder };
  }, [config, areaForAssignee, members, lang]);
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
      return names.map(n => ({ key: n || "__none__", label: n || (lang === "es" ? "Sin asignar" : "Unassigned"), color: "var(--fc-accent)", match: (t: Task) => (t.assignee || "") === n, createDefaults: { assignee: n || null } }));
    }
    if (groupBy === "priority") {
      return PRIORITIES.map(p => ({ key: p, label: PRIO_CFG[p].label, color: PRIO_CFG[p].c, match: (t: Task) => t.priority === p, createDefaults: { priority: p } }));
    }
    return GROUPS.map(g => ({ key: g.key, label: g.label, color: g.color, wipLimit: g.wipLimit, match: (t: Task) => t.status === g.key, createDefaults: { status: g.key } }));
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
      const activeTasksList = tasks.filter(t => t.assignee === m.name && t.status !== "Done");
      const activeTasks = activeTasksList.length;
      const activeEstimate = activeTasksList.reduce((acc, t) => acc + (t.estimate || 0), 0);
      const okrStatus = activeTasks <= 5 ? "success" : "danger";
      return {
        member: m,
        activeTasks,
        activeEstimate,
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
        icon={<Users className="w-6 h-6" style={{ color: "var(--fc-danger)" }} />}
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!myPerms.canAccessOps && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--fc-warning)", background: "var(--fc-accent-wash)", padding: "4px 10px", borderRadius: 4, letterSpacing: "0.05em" }}>{t.readOnly}</span>
            )}
            {/* "Nueva solicitud" se eliminó: toda tarea se crea igual y se
                enruta por área desde el formulario de Nueva Tarea. */}
            {myPerms.canAccessOps && <button className="btn-primary" onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}><Plus style={{ width: 14, height: 14 }} /> {t.newTaskBtn}</button>}
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t.totalTasks, value: total, color: "var(--fc-accent)", icon: <FileText style={{ width: 16, height: 16 }} /> },
          { label: t.completed, value: done, color: "var(--fc-success)", icon: <CheckCircle2 style={{ width: 16, height: 16 }} /> },
          { label: t.overdueSla, value: overdue, color: "var(--fc-danger)", icon: <AlertTriangle style={{ width: 16, height: 16 }} /> },
          { label: t.productivity, value: `${pct}%`, color: pct >= 70 ? "var(--fc-success)" : pct >= 40 ? "var(--fc-warning)" : "var(--fc-danger)", icon: <Clock style={{ width: 16, height: 16 }} /> },
        ].map(k => (
          <div key={k.label} className="glass-panel" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ color: k.color, opacity: 0.8 }}>{k.icon}</div>
            <div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: k.color }}>{loading ? "—" : k.value}</p>
              <p style={{ fontSize: 9, color: "var(--fc-text-secondary)", fontFamily: "var(--font-display)", letterSpacing: "0.12em", marginTop: 2 }}>{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Area view tabs */}
      {!loading && config.areas.length > 0 && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          <button onClick={() => setViewArea("__all__")} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: viewArea === "__all__" ? "1px solid var(--border-strong)" : "1px solid var(--fc-border)", background: viewArea === "__all__" ? "var(--fc-accent-wash)" : "transparent", color: viewArea === "__all__" ? "var(--fc-accent)" : "var(--fc-text-secondary)" }}>{t.all}</button>
          {myArea && (
            <button onClick={() => setViewArea("__mine__")} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: viewArea === "__mine__" ? `1px solid ${myArea.color}55` : "1px solid var(--fc-border)", background: viewArea === "__mine__" ? `${myArea.color}18` : "transparent", color: viewArea === "__mine__" ? myArea.color : "var(--fc-text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: myArea.color }} />
              {t.myArea} ({myArea.name})
              {pendingReviews > 0 && myArea.leadIds.includes(currentUserId) && (
                <span style={{ background: "var(--fc-danger)", color: "var(--fc-text)", fontSize: 9, fontWeight: 700, borderRadius: 10, padding: "1px 6px", marginLeft: 4 }}>{pendingReviews}</span>
              )}
            </button>
          )}
          {config.areas.filter(a => a.id !== myArea?.id).map(a => (
            <button key={a.id} onClick={() => setViewArea(a.id)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: viewArea === a.id ? `1px solid ${a.color}55` : "1px solid var(--fc-border)", background: viewArea === a.id ? `${a.color}18` : "transparent", color: viewArea === a.id ? a.color : "var(--fc-text-secondary)", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: a.color }} />
              {a.name}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--fc-surface)", border: "1px solid var(--fc-border)", borderRadius: 6, padding: "6px 12px", flex: 1, maxWidth: 320 }}>
          <Search style={{ width: 14, height: 14, color: "var(--fc-text-muted)" }} />
          <input type="text" placeholder={t.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", color: "var(--fc-text)", fontSize: 13, width: "100%" }} />
        </div>

        {/* View Switcher */}
        <div style={{ display: "flex", background: "var(--fc-surface)", border: "1px solid var(--fc-border)", borderRadius: 8, padding: 2 }}>
          <button
            onClick={() => setViewMode("kanban")}
            title={t.kanbanView}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, border: "none",
              background: viewMode === "kanban" ? "var(--surface-hover)" : "transparent",
              color: viewMode === "kanban" ? "var(--fc-accent)" : "var(--fc-text-secondary)",
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
              color: viewMode === "table" ? "var(--fc-accent)" : "var(--fc-text-secondary)",
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
              color: viewMode === "metrics" ? "var(--fc-accent)" : "var(--fc-text-secondary)",
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
              color: viewMode === "okrs" ? "var(--fc-accent)" : "var(--fc-text-secondary)",
              cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit"
            }}
          >
            <TrendingUp style={{ width: 14, height: 14 }} />
            <span className="hidden sm:inline">{lang === "es" ? "Estrategia (OKRs)" : "Strategy (OKRs)"}</span>
          </button>
          <button
            onClick={() => setViewMode("gantt")}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
              borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none",
              background: viewMode === "gantt" ? "var(--surface-hover)" : "transparent",
              color: viewMode === "gantt" ? "var(--fc-accent)" : "var(--fc-text-secondary)",
              transition: "all 0.2s ease"
            }}
          >
            <Clock size={14} />
            {lang === "es" ? "Gantt" : "Timeline"}
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
              borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none",
              background: viewMode === "calendar" ? "var(--surface-hover)" : "transparent",
              color: viewMode === "calendar" ? "var(--fc-accent)" : "var(--fc-text-secondary)",
              transition: "all 0.2s ease"
            }}
          >
            <CalendarIcon size={14} />
            {lang === "es" ? "Calendario" : "Calendar"}
          </button>
          <button
            onClick={() => setViewMode("my-tasks")}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
              borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none",
              background: viewMode === "my-tasks" ? "var(--surface-hover)" : "transparent",
              color: viewMode === "my-tasks" ? "var(--fc-accent)" : "var(--fc-text-secondary)",
              transition: "all 0.2s ease"
            }}
          >
            <CheckSquare size={14} />
            {lang === "es" ? "Mis Tareas" : "My Tasks"}
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
            <button onClick={() => { setFAssignee(""); setFPriority(""); setFTag(""); setFArea(""); }} style={{ fontSize: 11, color: "var(--fc-text-secondary)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
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
            <span style={{ fontSize: "10px", color: "var(--fc-accent)", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 600 }}>
              Sincronizando Operaciones...
            </span>
          </div>
        </div>
      )}

      {/* KANBAN VIEW */}
      {!loading && viewMode === "kanban" && (
        <KanbanBoard 
          tasks={filtered} 
          dynamicGroups={dynamicGroups} 
          myPerms={myPerms} 
          lang={lang} 
          onTaskClick={setEditTask} 
          onTaskUpdate={patch} 
          onCreateTask={fullCreate} 
          groupBy={groupBy} 
        />
      )}

      {/* TABLE/SPREADSHEET VIEW (Monday.com style) */}
      {!loading && viewMode === "table" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {dynamicGroups.map(g => {
            const gt = filtered.filter(g.match);
            const isCollapsed = expandedGroups[g.key] === true;

            return (
              <div key={g.key} style={{ background: "var(--fc-surface)", border: "1px solid var(--fc-border)", borderRadius: 12, overflow: "hidden" }}>
                {/* Header */}
                <div
                  onClick={() => toggleGroupExpand(g.key)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 18px", borderBottom: isCollapsed ? "none" : "1px solid var(--fc-border)",
                    cursor: "pointer", background: "var(--surface-hover)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {isCollapsed ? <ChevronRight style={{ width: 16, height: 16, color: g.color }} /> : <ChevronDown style={{ width: 16, height: 16, color: g.color }} />}
                    <span style={{ width: 4, height: 16, background: g.color, borderRadius: 2 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fc-text)" }}>{g.label}</span>
                    <span style={{ fontSize: 10, color: "var(--fc-text-muted)", background: "var(--fc-border)", padding: "1px 6px", borderRadius: 8 }}>{gt.length}</span>
                  </div>

                  {myPerms.canAccessOps && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddingIn(g.key);
                        setNewTitle("");
                      }}
                      style={{
                        background: "none", border: "none", cursor: "pointer", color: "var(--fc-text-secondary)",
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
                        <tr style={{ borderBottom: "1px solid var(--fc-border)", background: "var(--fc-surface)" }}>
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
                          const stall = stallOf(tsk);
                          return (
                            <tr key={tsk.id} style={{ borderBottom: "1px solid var(--fc-border-subtle)" }} className="fb-row">
                              {/* Title (editable cell) */}
                              <td style={{ padding: "8px 10px" }}>
                                <EditableCell
                                  value={tsk.title}
                                  onSave={(val) => patch(tsk.id, { title: val })}
                                  placeholder={lang === "es" ? "Título de tarea" : "Task title"}
                                />
                                <div style={{ display: "flex", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                                  {/* Quién la tiene detenida y desde hace cuánto. */}
                                  {stall && (
                                    <span title={`${t.stalled}: ${stall.hours}h — ${stall.holder}`}
                                      style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: "var(--fc-danger-wash)", color: "var(--fc-danger)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                      <AlertOctagon style={{ width: 9, height: 9 }} />
                                      {stall.hours}h · {stall.holder}
                                    </span>
                                  )}
                                  {tsk.approvalState === "pending" && (
                                    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: "rgba(224,168,60,0.12)", color: "var(--fc-warning)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                      <ShieldCheck style={{ width: 9, height: 9 }} /> {t.awaitingApproval}
                                    </span>
                                  )}
                                  {tsk.approvalState === "rejected" && (
                                    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: "var(--fc-danger-wash)", color: "var(--fc-danger)" }}>
                                      {t.sentBack}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Assignee dropdown */}
                              <td style={{ padding: "8px 10px" }}>
                                <select
                                  value={tsk.assignee || ""}
                                  onChange={(e) => patch(tsk.id, { assignee: e.target.value || null })}
                                  style={{ background: "transparent", border: "none", color: "var(--fc-text)", fontSize: 12, outline: "none", cursor: "pointer" }}
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
                                    background: STATUS_CFG[tsk.status]?.bg || "var(--fc-text-muted)",
                                    color: "var(--fc-text)", fontSize: 11, fontWeight: 700,
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
                                    color: PRIO_CFG[tsk.priority]?.c || "var(--fc-text)",
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
                                  value={isoToDateInput(tsk.dueDate)}
                                  onChange={(e) => patch(tsk.id, { dueDate: dateInputToISO(e.target.value, "end") })}
                                  style={{ background: "transparent", border: "none", color: "var(--fc-text)", fontSize: 12, outline: "none", cursor: "pointer" }}
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
                                  <button onClick={() => setEditTask(tsk)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fc-accent)" }} title={t.update}>
                                    <FileText style={{ width: 14, height: 14 }} />
                                  </button>
                                  {myPerms.canAccessOps && (
                                    <button onClick={() => del(tsk.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fc-danger)" }} title="Eliminar">
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
                                  style={{ flex: 1, background: "var(--fc-surface)", border: "1px solid var(--fc-border)", borderRadius: 6, padding: "6px 12px", color: "var(--fc-text)", fontSize: 12, outline: "none" }}
                                />
                                <button
                                  onClick={() => createWith(g.createDefaults)}
                                  disabled={!newTitle.trim()}
                                  style={{
                                    padding: "6px 14px", background: "var(--fc-accent-wash)", border: "1px solid var(--border-strong)",
                                    borderRadius: 6, color: "var(--fc-accent)", cursor: "pointer", fontSize: 11, fontWeight: 700,
                                    opacity: newTitle.trim() ? 1 : 0.4
                                  }}
                                >
                                  {lang === "es" ? "Agregar" : "Add"}
                                </button>
                                <button
                                  onClick={() => { setAddingIn(null); setNewTitle(""); }}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fc-text-secondary)", fontSize: 11, fontFamily: "inherit" }}
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
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--fc-text-secondary)", fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>KPI GLOBAL SLA</span>
                <Target style={{ width: 16, height: 16, color: "var(--fc-accent)" }} />
              </div>
              <p style={{ fontSize: 32, fontWeight: 800, color: globalSlaStats.globalSlaPct >= 95 ? "var(--fc-success)" : "var(--fc-warning)", fontFamily: "var(--font-display)", margin: "4px 0" }}>
                {globalSlaStats.globalSlaPct}%
              </p>
              <div style={{ height: 6, background: "var(--fc-border)", borderRadius: 3, overflow: "hidden", margin: "12px 0 8px 0" }}>
                <div style={{ height: "100%", width: `${globalSlaStats.globalSlaPct}%`, background: globalSlaStats.globalSlaPct >= 95 ? "var(--fc-success)" : "var(--fc-warning)", borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 11, color: "var(--fc-text-muted)" }}>
                {lang === "es" 
                  ? `Meta: >= 95% (${globalSlaStats.completedOnTimeCount}/${globalSlaStats.completedWithDueCount} a tiempo)` 
                  : `Target: >= 95% (${globalSlaStats.completedOnTimeCount}/${globalSlaStats.completedWithDueCount} on time)`}
              </span>
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--fc-text-secondary)", fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>ENTREGAS COMPLETADAS</span>
                <CheckCircle2 style={{ width: 16, height: 16, color: "var(--fc-success)" }} />
              </div>
              <p style={{ fontSize: 32, fontWeight: 800, color: "var(--fc-text)", fontFamily: "var(--font-display)", margin: "4px 0" }}>
                {globalSlaStats.completedCount}
              </p>
              <span style={{ fontSize: 11, color: "var(--fc-text-muted)", display: "block", marginTop: 22 }}>
                {lang === "es" ? "Tareas movidas a Completado con éxito" : "Tasks successfully resolved"}
              </span>
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--fc-text-secondary)", fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>SLA BREACH ACTIVO</span>
                <AlertTriangle style={{ width: 16, height: 16, color: "var(--fc-danger)" }} />
              </div>
              <p style={{ fontSize: 32, fontWeight: 800, color: overdue > 0 ? "var(--fc-danger)" : "var(--fc-text-muted)", fontFamily: "var(--font-display)", margin: "4px 0" }}>
                {overdue}
              </p>
              <span style={{ fontSize: 11, color: "var(--fc-text-muted)", display: "block", marginTop: 22 }}>
                {lang === "es" ? "Tareas con fecha límite vencida activas" : "Active tasks past their due date"}
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
            {/* Area SLA OKR */}
            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--fc-text)", marginBottom: 16, fontFamily: "var(--font-display)" }}>
                {lang === "es" ? "Salud Operativa: SLA por Área (Meta: >= 95%)" : "Health: Area SLA Compliance (Target: >= 95%)"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {areaSlaStats.map(stat => (
                  <div key={stat.area.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: stat.area.color }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fc-text)" }}>{stat.area.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "var(--fc-text-muted)" }}>
                          {stat.avgLeadTimeHours !== null ? `${stat.avgLeadTimeHours}h avg` : "—"}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                          background: stat.okrStatus === "success" ? "rgba(52,183,124,0.12)" : "rgba(253,171,61,0.12)",
                          color: stat.okrStatus === "success" ? "var(--fc-success)" : "var(--fc-warning)"
                        }}>
                          {stat.slaPct}% {stat.okrStatus === "success" ? "OK" : "En Riesgo"}
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: "var(--fc-border)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${stat.slaPct}%`, background: stat.area.color, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User Workload OKR */}
            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--fc-text)", marginBottom: 16, fontFamily: "var(--font-display)" }}>
                {lang === "es" ? "Salud Operativa: Carga de Equipo (Límite: <= 5 Activas)" : "Health: Workload Distribution (Limit: <= 5 Active)"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: 300, overflowY: "auto", paddingRight: 6 }}>
                {memberLoadStats.map(stat => (
                  <div key={stat.member.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--fc-accent-wash)", border: "1px solid var(--fc-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--fc-accent)", flexShrink: 0 }}>
                        {stat.member.name[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--fc-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {stat.member.name}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: stat.okrStatus === "success" ? "var(--fc-text)" : "var(--fc-danger)" }}>
                        {stat.activeTasks} {lang === "es" ? "tareas" : "tasks"}
                      </span>
                      {stat.activeEstimate > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--fc-accent)", background: "var(--fc-accent-wash)", padding: "2px 6px", borderRadius: 4 }}>
                          {stat.activeEstimate} pts
                        </span>
                      )}
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                        background: stat.okrStatus === "success" ? "rgba(52,183,124,0.1)" : "rgba(229,72,77,0.1)",
                        color: stat.okrStatus === "success" ? "var(--fc-success)" : "var(--fc-danger)"
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
      <AnimatePresence>
        {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSave={fullCreate} areas={config.areas} projects={projects} />}
      </AnimatePresence>
      {editTask && (
        <TaskDetailModal
          task={editTask}
          allTasks={tasks}
          onClose={() => setEditTask(null)}
          onSave={fullUpdate}
          members={members}
          onRefresh={fetch_}
          canApproveTask={canCloseTask(editTask)}
          onSubtaskCreate={async (parentId: string, title: string) => {
            try {
              await createSubtask(parentId, title);
            } catch (e) {
              reportCreateError(e);
            }
          }}
          onSubtaskPatch={patchSubtask}
          onSubtaskDelete={deleteSubtask}
        />
      )}

      {/* STRATEGY OKRS VIEW */}
      {!loading && viewMode === "okrs" && (
        <div style={{ padding: "24px 0", maxWidth: 1000, margin: "0 auto", animation: "fadeIn 0.3s ease" }}>
          {/* OKR headers... */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <Target size={24} style={{ color: "var(--fc-accent)" }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--fc-text)" }}>
              {lang === "es" ? "Estrategia Trimestral (OKRs)" : "Quarterly Strategy (OKRs)"}
            </h2>
          </div>
          <p style={{ color: "var(--fc-text-secondary)", fontSize: 14, marginBottom: 32 }}>
            {lang === "es" 
              ? "Objetivos clave vinculados directamente a tareas de alto impacto. El progreso se calcula en base a las tareas marcadas como Done." 
              : "Key objectives tied directly to high-impact tasks. Progress is calculated based on tasks marked as Done."}
          </p>
             <span style={{ fontSize: 12, color: "var(--fc-text-muted)" }}>[Modulo de OKRs en construcción]</span>
        </div>
      )}

      {/* GANTT VIEW */}
      {!loading && viewMode === "gantt" && (
        <div style={{ marginTop: 16 }}>
          <GanttView tasks={filtered} onEditTask={setEditTask} />
        </div>
      )}

      {/* CALENDAR VIEW */}
      {!loading && viewMode === "calendar" && (
        <div style={{ height: "calc(100vh - 180px)", animation: "fadeIn 0.3s ease", padding: "16px 0" }}>
          <CalendarView tasks={filtered} members={members} lang={lang} onTaskClick={t => setEditTask(t)} />
        </div>
      )}

      {/* MY TASKS VIEW */}
      {!loading && viewMode === "my-tasks" && (
        <div style={{ height: "calc(100vh - 180px)", animation: "fadeIn 0.3s ease", padding: "16px 0" }}>
          <MyTasksView tasks={tasks} members={members} lang={lang} onTaskClick={t => setEditTask(t)} currentUser={session?.user} />
        </div>
      )}
    </div>
  );
}
