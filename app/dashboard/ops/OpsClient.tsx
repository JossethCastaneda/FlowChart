"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Users, Plus, Trash2, Loader2, ChevronDown, ChevronRight, Search,
  Calendar as CalendarIcon, X, Clock, AlertTriangle, CheckCircle2, Tag, FileText,
  LayoutGrid, List, ChevronLeft, MessageSquare, Paperclip, History,
  Send, Upload, ExternalLink, Image as ImageIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSession } from "next-auth/react";
import { parseWorkflow, findUserArea, estimateEtaHours, etaDate, getPermissions, type WorkflowConfig, type Area, type AreaPermissions } from "@/lib/workflow-config";

/* ═══ TYPES ═══ */
interface Member { id: string; name: string; email: string | null; image: string | null; role: string; activityStatus?: string }
const STATUS_DOT: Record<string, string> = { disponible: "#00c875", ocupado: "#fdab3d", ausente: "#e2445c", offline: "#64748b" };
interface Comment { id: string; userId: string; userName: string; userImage: string | null; content: string; createdAt: string }
interface Activity { id: string; userName: string; action: string; field: string | null; oldValue: string | null; newValue: string | null; createdAt: string }
interface Attachment { name: string; url: string; type: string; size: number; uploadedAt: string }
interface Task {
  id: string; title: string; description: string | null; assignee: string | null;
  priority: string; status: string; dueDate: string | null; tags: string[];
  order: number; parentId: string | null; children: Task[]; createdAt: string;
  attachments?: Attachment[];
  // Cross-area request (Capa 3)
  targetAreaId?: string | null; requestType?: string | null; requesterId?: string | null;
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
const GROUP_LABELS: Record<string, string> = { status: "Estado", assignee: "Responsable", priority: "Prioridad" };

/* ═══ HELPERS ═══ */
function sla(due: string | null, st: string) {
  if (!due || st === "Done") return { l: "—", c: "rgba(148,163,184,0.65)", bg: "transparent", i: "none" as const };
  const d = (new Date(due).getTime() - Date.now()) / 36e5;
  const days = Math.ceil(d / 24);
  if (d < 0) return { l: `${Math.abs(days)}d vencido`, c: "#e2445c", bg: "rgba(226,68,92,0.1)", i: "late" as const };
  if (d <= 24) return { l: "Vence hoy", c: "#fdab3d", bg: "rgba(253,171,61,0.1)", i: "warn" as const };
  if (days <= 3) return { l: `${days}d`, c: "#fdab3d", bg: "rgba(253,171,61,0.08)", i: "warn" as const };
  return { l: `${days}d`, c: "#00c875", bg: "rgba(0,200,117,0.08)", i: "ok" as const };
}
const fmt = (d: string) => new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
const timeAgo = (d: string) => { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return "ahora"; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d`; };

/* ═══ SHARED UI ═══ */
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
    <button onClick={onClick} style={{ display: "block", width: "100%", padding: "8px 12px", border: "none", cursor: "pointer", textAlign: "left", background: active ? "rgba(255,255,255,0.1)" : "transparent", fontSize: 12, color: "#e2e8f0" }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"} onMouseLeave={e => e.currentTarget.style.background = active ? "rgba(255,255,255,0.1)" : "transparent"}>
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
  if (editing) return <input ref={ref} value={text} onChange={e => setText(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setText(value); setEditing(false); } }} style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", color: "#e2e8f0", fontSize: 13, padding: "4px 8px", outline: "none", width: "100%", borderRadius: 3 }} />;
  return <div onClick={() => setEditing(true)} style={{ cursor: "text", padding: "4px 8px", borderRadius: 3, minHeight: 28, display: "flex", alignItems: "center", fontSize: 13, color: value ? "#e2e8f0" : "rgba(148,163,184,0.65)" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{value || placeholder || "—"}</div>;
}

/* ═══ TASK DETAIL MODAL (with Comments, Attachments, Activity) ═══ */
const inp: React.CSSProperties = { width: "100%", padding: "10px 14px", fontSize: 13, background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.1)", color: "#e2e8f0", outline: "none", borderRadius: 3 };
const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, display: "block" };

function TaskDetailModal({ task, onClose, onSave, members, onRefresh }: {
  task: Task; onClose: () => void; onSave: (d: any) => void; members: Member[]; onRefresh: () => void;
}) {
  const [tab, setTab] = useState<"details" | "comments" | "activity">("details");
  const [form, setForm] = useState({
    title: task.title, description: task.description || "", assignee: task.assignee || "",
    priority: task.priority, status: task.status,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "", tags: task.tags || [] as string[],
  });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [attachUrl, setAttachUrl] = useState("");
  const commentEndRef = useRef<HTMLDivElement>(null);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const addTag = (t: string) => { const s = t.trim(); if (s && !form.tags.includes(s)) set("tags", [...form.tags, s]); setTagInput(""); };
  const submit = async () => { if (!form.title.trim()) return; setSaving(true); await onSave({ ...form, dueDate: form.dueDate || null }); setSaving(false); };
  const sl = form.dueDate ? sla(form.dueDate, form.status) : null;

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

  const actLabels: Record<string, string> = { created: "creo la tarea", status_changed: "cambio el estado", assigned: "asigno a", priority_changed: "cambio la prioridad", commented: "comento", attachment_added: "adjunto archivo" };
  const tabs = [
    { key: "details" as const, label: "Detalles", icon: <FileText style={{ width: 12, height: 12 }} /> },
    { key: "comments" as const, label: `Comentarios (${comments.length})`, icon: <MessageSquare style={{ width: 12, height: 12 }} /> },
    { key: "activity" as const, label: "Actividad", icon: <History style={{ width: 12, height: 12 }} /> },
  ];

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "3vh 16px", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 700, background: "rgba(8,12,24,0.97)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 8, animation: "fadeInScale 0.25s ease-out" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid rgba(0,212,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileText style={{ width: 18, height: 18, color: "#00d4ff" }} />
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.1em" }}>TAREA</span>
            <Pill label={STATUS_CFG[task.status]?.label || task.status} bg={STATUS_CFG[task.status]?.bg || "#c4c4c4"} color={STATUS_CFG[task.status]?.c || "#fff"} />
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}><X style={{ width: 18, height: 18 }} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(0,212,255,0.06)", padding: "0 24px" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "10px 16px", border: "none", cursor: "pointer",
              background: "none", fontSize: 11, fontWeight: 600,
              color: tab === t.key ? "#00d4ff" : "#64748b",
              borderBottom: tab === t.key ? "2px solid #00d4ff" : "2px solid transparent",
              transition: "all 0.15s",
            }}>{t.icon}{t.label}</button>
          ))}
        </div>

        {/* ── Details Tab ── */}
        {tab === "details" && (
          <div style={{ padding: 24, display: "grid", gap: 16, maxHeight: "60vh", overflowY: "auto" }}>
            <div><label style={lbl}>Título</label><input style={inp} value={form.title} onChange={e => set("title", e.target.value)} /></div>
            <div><label style={lbl}>Descripción</label><textarea rows={3} style={{ ...inp, resize: "vertical" }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Contexto, instrucciones, links..." /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={lbl}>Asignado</label><select style={{ ...inp, cursor: "pointer" }} value={form.assignee} onChange={e => set("assignee", e.target.value)}><option value="">Sin asignar</option>{members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}</select></div>
              <div><label style={lbl}>Prioridad</label><select style={{ ...inp, cursor: "pointer" }} value={form.priority} onChange={e => set("priority", e.target.value)}>{PRIORITIES.map(p => <option key={p} value={p}>{PRIO_CFG[p].label}</option>)}</select></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={lbl}>Estado</label><select style={{ ...inp, cursor: "pointer" }} value={form.status} onChange={e => set("status", e.target.value)}>{STATUSES.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}</select></div>
              <div><label style={lbl}>Fecha Límite</label><input type="date" style={{ ...inp, cursor: "pointer" }} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} /></div>
            </div>
            {sl && sl.i !== "none" && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: sl.bg, border: `1px solid ${sl.c}25`, borderRadius: 4 }}>
              {sl.i === "late" && <AlertTriangle style={{ width: 14, height: 14, color: sl.c }} />}{sl.i === "warn" && <Clock style={{ width: 14, height: 14, color: sl.c }} />}{sl.i === "ok" && <CheckCircle2 style={{ width: 14, height: 14, color: sl.c }} />}
              <span style={{ fontSize: 12, color: sl.c, fontWeight: 600 }}>SLA: {sl.l}</span>
            </div>}
            <div>
              <label style={lbl}><Tag style={{ width: 10, height: 10, display: "inline", verticalAlign: "middle", marginRight: 4 }} />Etiquetas</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>{form.tags.map((t, i) => <span key={i} style={{ fontSize: 10, padding: "2px 8px", background: "rgba(123,97,255,0.1)", border: "1px solid rgba(123,97,255,0.2)", color: "#7b61ff", borderRadius: 2, display: "flex", alignItems: "center", gap: 4 }}>{t}<X style={{ width: 8, height: 8, cursor: "pointer" }} onClick={() => set("tags", form.tags.filter((_, j) => j !== i))} /></span>)}</div>
              <input style={inp} placeholder="Agregar etiqueta..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>{TAG_PRESETS.filter(t => !form.tags.includes(t)).slice(0, 6).map(t => <button key={t} onClick={() => addTag(t)} style={{ fontSize: 9, padding: "2px 8px", border: "1px solid rgba(148,163,184,0.18)", background: "transparent", color: "#64748b", cursor: "pointer", borderRadius: 2 }}>+ {t}</button>)}</div>
            </div>
            {/* Attachments */}
            <div>
              <label style={lbl}><Paperclip style={{ width: 10, height: 10, display: "inline", verticalAlign: "middle", marginRight: 4 }} />Archivos Adjuntos</label>
              {((task.attachments || []) as Attachment[]).map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 4, marginBottom: 4, textDecoration: "none", color: "#e2e8f0", fontSize: 12 }}>
                  {a.type === "image" ? <ImageIcon style={{ width: 14, height: 14, color: "#7b61ff" }} /> : <FileText style={{ width: 14, height: 14, color: "#579bfc" }} />}
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                  <ExternalLink style={{ width: 10, height: 10, color: "rgba(148,163,184,0.65)" }} />
                </a>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input style={{ ...inp, flex: 1 }} placeholder="Pegar URL de archivo..." value={attachUrl} onChange={e => setAttachUrl(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addAttachment(); }} />
                <button onClick={addAttachment} disabled={!attachUrl.trim()} style={{ padding: "8px 12px", background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 3, color: "#00d4ff", cursor: "pointer", opacity: attachUrl.trim() ? 1 : 0.3 }}><Upload style={{ width: 14, height: 14 }} /></button>
              </div>
            </div>
          </div>
        )}

        {/* ── Comments Tab ── */}
        {tab === "comments" && (
          <div style={{ display: "flex", flexDirection: "column", height: "55vh" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              {loadingComments && <div style={{ textAlign: "center", padding: 20 }}><Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite", color: "#00d4ff" }} /></div>}
              {!loadingComments && comments.length === 0 && <p style={{ textAlign: "center", color: "rgba(148,163,184,0.65)", fontSize: 12, padding: "32px 0" }}>Sin comentarios. Inicia la conversacion.</p>}
              {comments.map(c => (
                <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#00d4ff", flexShrink: 0 }}>
                    {c.userName[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{c.userName}</span>
                      <span style={{ fontSize: 9, color: "rgba(148,163,184,0.65)" }}>{timeAgo(c.createdAt)}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(148,163,184,0.7)", lineHeight: 1.6, margin: 0, wordBreak: "break-word" }}>{c.content}</p>
                  </div>
                </div>
              ))}
              <div ref={commentEndRef} />
            </div>
            <div style={{ padding: "12px 24px", borderTop: "1px solid rgba(0,212,255,0.06)", display: "flex", gap: 8 }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }} placeholder="Escribe un comentario..." style={{ flex: 1, ...inp }} />
              <button onClick={postComment} disabled={!commentText.trim()} style={{ padding: "8px 14px", background: commentText.trim() ? "rgba(0,212,255,0.12)" : "transparent", border: `1px solid ${commentText.trim() ? "rgba(0,212,255,0.25)" : "rgba(255,255,255,0.06)"}`, borderRadius: 3, color: commentText.trim() ? "#00d4ff" : "rgba(148,163,184,0.65)", cursor: "pointer" }}>
                <Send style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}

        {/* ── Activity Tab ── */}
        {tab === "activity" && (
          <div style={{ padding: "16px 24px", maxHeight: "55vh", overflowY: "auto" }}>
            {activities.length === 0 && <p style={{ textAlign: "center", color: "rgba(148,163,184,0.65)", fontSize: 12, padding: "32px 0" }}>Sin actividad registrada.</p>}
            {activities.map(a => (
              <div key={a.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.action === "status_changed" ? "#00c875" : a.action === "assigned" ? "#00d4ff" : a.action === "priority_changed" ? "#fdab3d" : "rgba(148,163,184,0.65)", marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
                    <strong style={{ color: "#e2e8f0" }}>{a.userName}</strong> {actLabels[a.action] || a.action}
                    {a.oldValue && a.newValue && <> de <span style={{ color: "rgba(226,68,92,0.6)", textDecoration: "line-through" }}>{a.oldValue}</span> a <span style={{ color: "#00c875" }}>{a.newValue}</span></>}
                    {!a.oldValue && a.newValue && <> <span style={{ color: "#00c875" }}>{a.newValue}</span></>}
                  </p>
                  <span style={{ fontSize: 9, color: "rgba(148,163,184,0.65)" }}>{timeAgo(a.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {tab === "details" && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 24px", borderTop: "1px solid rgba(0,212,255,0.06)" }}>
            <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(148,163,184,0.22)", color: "#64748b", cursor: "pointer", fontSize: 12, borderRadius: 3 }}>Cancelar</button>
            <button onClick={submit} disabled={saving || !form.title.trim()} className="btn-primary" style={{ padding: "8px 24px", opacity: saving || !form.title.trim() ? 0.5 : 1 }}>{saving ? "Guardando..." : "Actualizar"}</button>
          </div>
        )}
      </div>
    </div>, document.body
  );
}

/* ═══ CREATE MODAL (simpler) ═══ */
function CreateModal({ onClose, onSave, members }: { onClose: () => void; onSave: (d: any) => void; members: Member[] }) {
  const [form, setForm] = useState({ title: "", description: "", assignee: "", priority: "P2", status: "Backlog", dueDate: "", tags: [] as string[] });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const addTag = (t: string) => { const s = t.trim(); if (s && !form.tags.includes(s)) set("tags", [...form.tags, s]); setTagInput(""); };
  const submit = async () => { if (!form.title.trim()) return; setSaving(true); await onSave({ ...form, dueDate: form.dueDate || null }); setSaving(false); };

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "5vh 16px", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, background: "rgba(8,12,24,0.97)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 8, animation: "fadeInScale 0.25s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid rgba(0,212,255,0.06)" }}>
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.1em" }}>NUEVA TAREA</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}><X style={{ width: 18, height: 18 }} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          <div><label style={lbl}>Título *</label><input style={inp} placeholder="¿Qué necesitas hacer?" value={form.title} onChange={e => set("title", e.target.value)} autoFocus /></div>
          <div><label style={lbl}>Descripción</label><textarea rows={2} style={{ ...inp, resize: "vertical" }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Contexto..." /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Asignado</label><select style={{ ...inp, cursor: "pointer" }} value={form.assignee} onChange={e => set("assignee", e.target.value)}><option value="">Sin asignar</option>{members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}</select></div>
            <div><label style={lbl}>Prioridad</label><select style={{ ...inp, cursor: "pointer" }} value={form.priority} onChange={e => set("priority", e.target.value)}>{PRIORITIES.map(p => <option key={p} value={p}>{PRIO_CFG[p].label}</option>)}</select></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Estado</label><select style={{ ...inp, cursor: "pointer" }} value={form.status} onChange={e => set("status", e.target.value)}>{STATUSES.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}</select></div>
            <div><label style={lbl}>Fecha Límite</label><input type="date" style={{ ...inp, cursor: "pointer" }} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} /></div>
          </div>
          <div>
            <label style={lbl}>Etiquetas</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>{form.tags.map((t, i) => <span key={i} style={{ fontSize: 10, padding: "2px 8px", background: "rgba(123,97,255,0.1)", color: "#7b61ff", borderRadius: 2, display: "flex", alignItems: "center", gap: 4 }}>{t}<X style={{ width: 8, height: 8, cursor: "pointer" }} onClick={() => set("tags", form.tags.filter((_, j) => j !== i))} /></span>)}</div>
            <input style={inp} placeholder="Agregar etiqueta..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>{TAG_PRESETS.filter(t => !form.tags.includes(t)).slice(0, 6).map(t => <button key={t} onClick={() => addTag(t)} style={{ fontSize: 9, padding: "2px 8px", border: "1px solid rgba(148,163,184,0.18)", background: "transparent", color: "#64748b", cursor: "pointer", borderRadius: 2 }}>+ {t}</button>)}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 24px", borderTop: "1px solid rgba(0,212,255,0.06)" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(148,163,184,0.22)", color: "#64748b", cursor: "pointer", fontSize: 12, borderRadius: 3 }}>Cancelar</button>
          <button onClick={submit} disabled={saving || !form.title.trim()} className="btn-primary" style={{ padding: "8px 24px", opacity: saving || !form.title.trim() ? 0.5 : 1 }}>{saving ? "Guardando..." : "Crear Tarea"}</button>
        </div>
      </div>
    </div>, document.body
  );
}

/* ═══ REQUEST MODAL (solicitud entre áreas) ═══ */
function RequestModal({ onClose, onSave, areas, members }: { onClose: () => void; onSave: (d: any) => void; areas: Area[]; members: Member[] }) {
  const [form, setForm] = useState({ areaId: areas[0]?.id || "", typeId: "", title: "", description: "", priority: "P2", dueDate: "", assignee: "" });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const area = areas.find(a => a.id === form.areaId) || null;
  const type = area?.requestTypes.find(t => t.id === form.typeId) || null;
  const slaH = type?.slaHours || area?.slaHours || 0;
  const etaPreview = slaH > 0 ? etaDate(slaH) : null;
  // Members that belong to the selected area (suggested assignees).
  const areaMembers = area ? members.filter(m => area.memberIds.includes(m.id)) : [];

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
      assignee: form.assignee || null,
    });
    setSaving(false);
  };

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "5vh 16px", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, background: "rgba(8,12,24,0.97)", border: `1px solid ${area ? `${area.color}40` : "rgba(0,212,255,0.12)"}`, borderRadius: 8, animation: "fadeInScale 0.25s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid rgba(0,212,255,0.06)" }}>
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 8 }}><Send style={{ width: 14, height: 14, color: area?.color || "#00d4ff" }} /> NUEVA SOLICITUD</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}><X style={{ width: 18, height: 18 }} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Área destino *</label>
              <select style={{ ...inp, cursor: "pointer" }} value={form.areaId} onChange={e => { set("areaId", e.target.value); set("typeId", ""); set("assignee", ""); }}>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Tipo de solicitud</label>
              <select style={{ ...inp, cursor: "pointer" }} value={form.typeId} onChange={e => set("typeId", e.target.value)} disabled={!area || area.requestTypes.length === 0}>
                <option value="">{area && area.requestTypes.length ? "Selecciona…" : "Sin tipos configurados"}</option>
                {area?.requestTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.slaHours}h)</option>)}
              </select>
            </div>
          </div>
          <div><label style={lbl}>Título *</label><input style={inp} placeholder="¿Qué necesitas?" value={form.title} onChange={e => set("title", e.target.value)} autoFocus /></div>
          <div><label style={lbl}>Brief / contexto</label><textarea rows={3} style={{ ...inp, resize: "vertical" }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Detalles, referencias, links…" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Prioridad</label><select style={{ ...inp, cursor: "pointer" }} value={form.priority} onChange={e => set("priority", e.target.value)}>{PRIORITIES.map(p => <option key={p} value={p}>{PRIO_CFG[p].label}</option>)}</select></div>
            <div><label style={lbl}>Asignar a</label>
              <select style={{ ...inp, cursor: "pointer" }} value={form.assignee} onChange={e => set("assignee", e.target.value)}>
                <option value="">⚡ Auto-asignar (recomendado)</option>
                {areaMembers.map(m => {
                  const sc = STATUS_DOT[m.activityStatus || "offline"] || "#64748b";
                  const available = m.activityStatus === "disponible" || m.activityStatus === "ocupado";
                  return <option key={m.id} value={m.name} disabled={!available}>{available ? "●" : "○"} {m.name} ({m.activityStatus || "offline"})</option>;
                })}
              </select>
            </div>
            <div><label style={lbl}>Fecha límite</label><input type="date" style={{ ...inp, cursor: "pointer" }} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} /></div>
          </div>
          {etaPreview && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 6, background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)" }}>
              <Clock style={{ width: 14, height: 14, color: "#00d4ff" }} />
              <span style={{ fontSize: 12, color: "#94a3b8" }}>SLA base <strong style={{ color: "#e2e8f0" }}>{slaH}h</strong> · entrega aprox. <strong style={{ color: "#00d4ff" }}>{etaPreview.toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</strong></span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 24px", borderTop: "1px solid rgba(0,212,255,0.06)" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(148,163,184,0.22)", color: "#64748b", cursor: "pointer", fontSize: 12, borderRadius: 3 }}>Cancelar</button>
          <button onClick={submit} disabled={saving || !form.title.trim() || !area} className="btn-primary" style={{ padding: "8px 24px", opacity: saving || !form.title.trim() || !area ? 0.5 : 1 }}>{saving ? "Enviando..." : "Enviar solicitud"}</button>
        </div>
      </div>
    </div>, document.body
  );
}

/* ═══ KANBAN CARD ═══ */
function KanbanCard({ task, onEdit }: { task: Task; onEdit: (t: Task) => void }) {
  const sl = sla(task.dueDate, task.status);
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
      onClick={() => onEdit(task)} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "12px 14px", cursor: "grab", transition: "all 0.15s", borderLeft: `3px solid ${pri.c}` }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "rgba(255,255,255,0.09)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0", marginBottom: 8, lineHeight: 1.4 }}>{task.title}</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 2, background: pri.bg, color: pri.c, fontWeight: 600 }}>{pri.label}</span>
        {task.assignee && <span style={{ fontSize: 10, color: "#64748b" }}>{task.assignee}</span>}
        {sl.i !== "none" && <span style={{ fontSize: 9, color: sl.c, fontWeight: 600 }}>{sl.l}</span>}
      </div>
      {task.tags?.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 6 }}>{task.tags.map((t, i) => <span key={i} style={{ fontSize: 8, padding: "1px 5px", background: "rgba(123,97,255,0.08)", color: "rgba(123,97,255,0.5)", borderRadius: 2 }}>{t}</span>)}</div>}
      {childTotal > 0 && <div style={{ marginTop: 8 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#64748b", marginBottom: 3 }}><span>Subtareas</span><span>{childDone}/{childTotal}</span></div><div style={{ height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: `${(childDone / childTotal) * 100}%`, background: "#00c875", borderRadius: 2, transition: "width 0.3s" }} /></div></div>}
    </div>
  );
}

/* Removed Calendar View */

/* ═══ MAIN PAGE ═══ */
function FilterChip({ label, value, active, children }: { label: string; value: string; active?: boolean; children: (close: () => void) => React.ReactNode }) {
  return (
    <Dropdown trigger={
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 6, cursor: "pointer",
        background: active ? "rgba(0,212,255,0.08)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${active ? "rgba(0,212,255,0.25)" : "rgba(255,255,255,0.06)"}`,
        fontSize: 11, whiteSpace: "nowrap",
      }}>
        <span style={{ color: "#64748b" }}>{label}:</span>
        <span style={{ fontWeight: 600, color: active ? "#00d4ff" : "#e2e8f0" }}>{value}</span>
        <ChevronDown style={{ width: 12, height: 12, color: "#64748b" }} />
      </div>
    }>
      {children}
    </Dropdown>
  );
}

export default function OpsPage() {
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
  // Monday/Jira-style grouping + quick filters (persisted per user).
  const [groupBy, setGroupBy] = useState<"status" | "assignee" | "priority">("status");
  const [fAssignee, setFAssignee] = useState("");
  const [fPriority, setFPriority] = useState("");
  const [fTag, setFTag] = useState("");
  const [fArea, setFArea] = useState(""); // filter by target area (incoming requests)
  const [viewArea, setViewArea] = useState<string>("__all__"); // area-view tab: __all__ | __mine__ | areaId
  const newRef = useRef<HTMLInputElement>(null);
  const subRef = useRef<HTMLInputElement>(null);

  // ── Workflow: SLA/ETA + lead review (MUST be declared before filtered/canCloseTask) ──
  const { data: session } = useSession();
  const [config, setConfig] = useState<WorkflowConfig>({ areas: [], requireLeadReview: true });
  useEffect(() => { fetch("/api/workspace/settings").then(r => r.json()).then(d => setConfig(parseWorkflow(d))).catch(() => {}); }, []);
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
  const canCloseTask = useCallback((task: Task): boolean => {
    const area = (task.targetAreaId ? config.areas.find(a => a.id === task.targetAreaId) : null) || areaForAssignee(task.assignee);
    if (!area) return true;
    const areaRequiresReview = area.requireLeadReview ?? config.requireLeadReview;
    if (!areaRequiresReview) return true;
    const role = members.find(m => m.id === currentUserId)?.role;
    if (role === "OWNER" || role === "ADMIN") return true;
    return area.leadIds.includes(currentUserId);
  }, [config, areaForAssignee, members, currentUserId]);
  const etaForTask = useCallback((task: Task): Date | null => {
    if (task.status === "Done") return null;
    if (task.targetAreaId) {
      const ta = config.areas.find(a => a.id === task.targetAreaId);
      if (ta) {
        const rt = ta.requestTypes.find(t => t.id === task.requestType || t.name === task.requestType);
        const sla = rt?.slaHours || ta.slaHours || 24;
        const ahead = tasks.filter(t => t.id !== task.id && t.targetAreaId === task.targetAreaId && t.status !== "Done").length;
        return etaDate((ahead + 1) * sla);
      }
    }
    const area = areaForAssignee(task.assignee);
    if (!area || !task.assignee) return null;
    const ahead = tasks.filter(t => t.id !== task.id && (t.assignee || "") === task.assignee && t.status !== "Done").length;
    return etaDate(estimateEtaHours(ahead, area));
  }, [config, areaForAssignee, tasks]);
  const areaName = useCallback((id?: string | null) => id ? (config.areas.find(a => a.id === id)?.name || null) : null, [config]);
  const areaColor = useCallback((id?: string | null) => id ? (config.areas.find(a => a.id === id)?.color || "#64748b") : "#64748b", [config]);
  const pendingReviews = useMemo(() => tasks.filter(t => t.status === "Review" && myArea && (t.targetAreaId === myArea.id || (!t.targetAreaId && myArea.memberIds.some(mid => { const mm = members.find(m => m.id === mid); return mm?.name === t.assignee; })))).length, [tasks, myArea, members]);

  const fetch_ = useCallback(async () => {
    try { const r = await fetch("/api/ops"); const d = await r.json(); if (d.data) setTasks(d.data); if (d.members) setMembers(d.members); } catch (e) { console.error("[OPS]", e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => { if (addingIn) newRef.current?.focus(); }, [addingIn]);
  useEffect(() => { if (addingSubIn) subRef.current?.focus(); }, [addingSubIn]);
  useEffect(() => { if (myArea && viewArea === "__all__") setViewArea("__mine__"); }, [myArea]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore + persist grouping/filters.
  useEffect(() => {
    try {
      const r = localStorage.getItem("sodare:ops-prefs");
      if (r) {
        const p = JSON.parse(r);
        if (p.groupBy) setGroupBy(p.groupBy);
        if (typeof p.fAssignee === "string") setFAssignee(p.fAssignee);
        if (typeof p.fPriority === "string") setFPriority(p.fPriority);
        if (typeof p.fTag === "string") setFTag(p.fTag);
        if (typeof p.fArea === "string") setFArea(p.fArea);
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("sodare:ops-prefs", JSON.stringify({ groupBy, fAssignee, fPriority, fTag, fArea })); } catch { /* ignore */ }
  }, [groupBy, fAssignee, fPriority, fTag, fArea]);

  const create = async (status: string) => { if (!newTitle.trim()) return; try { const r = await fetch("/api/ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle.trim(), status }) }); const d = await r.json(); if (r.ok) setTasks(p => [...p, d.data]); } catch {} setNewTitle(""); setAddingIn(null); };
  const createWith = async (defaults: any) => { if (!newTitle.trim()) return; try { const r = await fetch("/api/ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle.trim(), status: "Backlog", ...defaults }) }); const d = await r.json(); if (r.ok) setTasks(p => [...p, d.data]); } catch {} setNewTitle(""); setAddingIn(null); };
  const createSub = async (parentId: string) => { if (!newTitle.trim()) return; try { const r = await fetch("/api/ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle.trim(), parentId, status: "Backlog" }) }); const d = await r.json(); if (r.ok) setTasks(p => p.map(t => t.id === parentId ? { ...t, children: [...(t.children || []), d.data] } : t)); } catch {} setNewTitle(""); setAddingSubIn(null); };
  const fullCreate = async (data: any) => { try { const r = await fetch("/api/ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); const d = await r.json(); if (r.ok) { setTasks(p => [...p, d.data]); setShowCreate(false); } } catch {} };
  const createRequest = async (data: any) => { try { const r = await fetch("/api/ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); const d = await r.json(); if (r.ok) { setTasks(p => [...p, d.data]); setShowRequest(false); } else { alert(d.error || "Error al enviar solicitud"); } } catch (e: any) { alert("Error de red al enviar solicitud"); console.error("[OPS] createRequest error:", e); } };
  const fullUpdate = async (data: any) => { if (!editTask) return; if (data.status === "Done" && !canCloseTask(editTask)) { alert("Esta tarea requiere la aprobación de un líder del área antes de cerrarse."); return; } try { const r = await fetch(`/api/ops/${editTask.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); const d = await r.json(); if (r.ok) { setTasks(p => p.map(t => t.id === editTask.id ? d.data : t)); setEditTask(null); } } catch {} };
  const patch = async (id: string, p: any) => { if (p.status === "Done") { const t = tasks.find(x => x.id === id) || tasks.flatMap(x => x.children || []).find(c => c.id === id); if (t && !canCloseTask(t)) { alert("Esta tarea requiere la aprobación de un líder del área antes de cerrarse."); return; } } setTasks(prev => prev.map(t => t.id === id ? { ...t, ...p } : t)); try { const r = await fetch(`/api/ops/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) }); if (r.status === 403) { const d = await r.json().catch(() => ({})); alert(d.error || "No tienes permisos para editar esta tarea."); fetch_(); } else if (!r.ok) { fetch_(); } } catch { fetch_(); } };
  const del = async (id: string) => { if (!confirm("¿Eliminar esta tarea?")) return; setTasks(p => p.filter(t => t.id !== id)); try { const r = await fetch(`/api/ops/${id}`, { method: "DELETE" }); if (r.status === 403) { const d = await r.json().catch(() => ({})); alert(d.error || "No tienes permisos para eliminar esta tarea."); fetch_(); } else if (!r.ok) { fetch_(); } } catch { fetch_(); } };

  const cnt = (s: string) => tasks.filter(t => t.status === s).length;
  const overdue = tasks.filter(t => t.dueDate && t.status !== "Done" && new Date(t.dueDate) < new Date()).length;
  const done = cnt("Done"), total = tasks.length, pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tasks.filter(t => {
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

  // Dynamic groups for the table view, driven by `groupBy`.
  const dynamicGroups = useMemo(() => {
    if (groupBy === "assignee") {
      const names = Array.from(new Set(filtered.map(t => t.assignee || ""))).sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));
      if (!names.includes("")) names.push("");
      return names.map(n => ({ key: n || "__none__", label: n || "Sin asignar", color: "#579bfc", match: (t: Task) => (t.assignee || "") === n, createDefaults: { assignee: n || null } }));
    }
    if (groupBy === "priority") {
      return PRIORITIES.map(p => ({ key: p, label: PRIO_CFG[p].label, color: PRIO_CFG[p].c, match: (t: Task) => t.priority === p, createDefaults: { priority: p } }));
    }
    return GROUPS.map(g => ({ key: g.key, label: g.label, color: g.color, match: (t: Task) => t.status === g.key, createDefaults: { status: g.key } }));
  }, [groupBy, filtered]);

  // Available tags for the filter (presets + any in use).
  const allTags = useMemo(() => Array.from(new Set([...TAG_PRESETS, ...tasks.flatMap(t => t.tags || [])])).sort(), [tasks]);
  const filtersActive = !!(fAssignee || fPriority || fTag || fArea);
  const ch: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.09)" };

  // (Workflow hooks already declared above filtered/canCloseTask — see top of component)

  return (
    <div className="space-y-6">
      <PageHeader title="Marketing Ops" description="Gestión de tareas, workflows y operaciones del equipo."
        icon={<Users className="w-6 h-6" style={{ color: "#ff2d55" }} />}
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!myPerms.canAccessOps && (
              <span style={{ fontSize: 10, fontWeight: 600, color: "#fdab3d", background: "rgba(253,171,61,0.1)", padding: "4px 10px", borderRadius: 4, letterSpacing: "0.05em" }}>SOLO LECTURA</span>
            )}
            {config.areas.length > 0 && myPerms.canAccessOps && (
              <button onClick={() => setShowRequest(true)} title="Solicitar a otra área (Diseño, Comunicación…)"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                <Send style={{ width: 14, height: 14 }} /> Solicitud
              </button>
            )}
            {myPerms.canAccessOps && <button className="btn-primary" onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}><Plus style={{ width: 14, height: 14 }} /> Nueva Tarea</button>}
          </div>
        } />

      {/* KPIs */}
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
              <p style={{ fontSize: 9, color: "#64748b", fontFamily: "'Orbitron',sans-serif", letterSpacing: "0.12em", marginTop: 2 }}>{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Area view tabs ── */}
      {!loading && config.areas.length > 0 && (
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2 }}>
          <button onClick={() => setViewArea("__all__")} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: viewArea === "__all__" ? "1px solid rgba(0,212,255,0.3)" : "1px solid rgba(255,255,255,0.06)", background: viewArea === "__all__" ? "rgba(0,212,255,0.1)" : "transparent", color: viewArea === "__all__" ? "#00d4ff" : "#94a3b8" }}>Todas</button>
          {myArea && (
            <button onClick={() => setViewArea("__mine__")} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: viewArea === "__mine__" ? `1px solid ${myArea.color}55` : "1px solid rgba(255,255,255,0.06)", background: viewArea === "__mine__" ? `${myArea.color}18` : "transparent", color: viewArea === "__mine__" ? myArea.color : "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: myArea.color }} />
              Mi Área ({myArea.name})
              {pendingReviews > 0 && myArea.leadIds.includes(currentUserId) && (
                <span style={{ background: "#e2445c", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 10, padding: "1px 6px", marginLeft: 4 }}>{pendingReviews}</span>
              )}
            </button>
          )}
          {config.areas.filter(a => a.id !== myArea?.id).map(a => (
            <button key={a.id} onClick={() => setViewArea(a.id)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: viewArea === a.id ? `1px solid ${a.color}55` : "1px solid rgba(255,255,255,0.06)", background: viewArea === a.id ? `${a.color}18` : "transparent", color: viewArea === a.id ? a.color : "#94a3b8", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: a.color }} />
              {a.name}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "6px 12px", flex: 1, maxWidth: 320 }}>
          <Search style={{ width: 14, height: 14, color: "rgba(148,163,184,0.65)" }} />
          <input type="text" placeholder="Buscar tareas..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: 13, width: "100%" }} />
        </div>
      </div>

      {/* Filters + Group by (Monday/Jira-style) */}
      {!loading && tasks.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <FilterChip label="Agrupar por" value={GROUP_LABELS[groupBy]} active={groupBy !== "status"}>
            {(close) => (["status", "assignee", "priority"] as const).map(k => (
              <DropdownOption key={k} label={GROUP_LABELS[k]} active={groupBy === k} onClick={() => { setGroupBy(k); close(); }} />
            ))}
          </FilterChip>
          <FilterChip label="Responsable" value={fAssignee || "Todos"} active={!!fAssignee}>
            {(close) => <>
              <DropdownOption label="Todos" active={!fAssignee} onClick={() => { setFAssignee(""); close(); }} />
              {members.map(m => <DropdownOption key={m.id} label={m.name} active={fAssignee === m.name} onClick={() => { setFAssignee(m.name); close(); }} />)}
            </>}
          </FilterChip>
          <FilterChip label="Prioridad" value={fPriority ? PRIO_CFG[fPriority].label : "Todas"} active={!!fPriority}>
            {(close) => <>
              <DropdownOption label="Todas" active={!fPriority} onClick={() => { setFPriority(""); close(); }} />
              {PRIORITIES.map(p => <DropdownOption key={p} label={PRIO_CFG[p].label} color={PRIO_CFG[p].c} active={fPriority === p} onClick={() => { setFPriority(p); close(); }} />)}
            </>}
          </FilterChip>
          <FilterChip label="Etiqueta" value={fTag || "Todas"} active={!!fTag}>
            {(close) => <>
              <DropdownOption label="Todas" active={!fTag} onClick={() => { setFTag(""); close(); }} />
              {allTags.map(t => <DropdownOption key={t} label={t} active={fTag === t} onClick={() => { setFTag(t); close(); }} />)}
            </>}
          </FilterChip>
          {config.areas.length > 0 && (
            <FilterChip label="Solicitudes a" value={fArea ? (config.areas.find(a => a.id === fArea)?.name || "Área") : "Todas"} active={!!fArea}>
              {(close) => <>
                <DropdownOption label="Todas" active={!fArea} onClick={() => { setFArea(""); close(); }} />
                {config.areas.map(a => <DropdownOption key={a.id} label={a.name} color={a.color} active={fArea === a.id} onClick={() => { setFArea(a.id); close(); }} />)}
              </>}
            </FilterChip>
          )}
          {filtersActive && (
            <button onClick={() => { setFAssignee(""); setFPriority(""); setFTag(""); setFArea(""); }} style={{ fontSize: 11, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
              Limpiar filtros
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
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${dynamicGroups.length}, 1fr)`, gap: 12, minHeight: 400, overflowX: "auto", paddingBottom: 16 }}>
          {dynamicGroups.map(g => {
            const gt = filtered.filter(g.match);
            return (
              <div
                key={g.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.015)";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.background = "rgba(255,255,255,0.015)";
                  const taskId = e.dataTransfer.getData("text/plain");
                  if (taskId) patch(taskId, g.createDefaults);
                }}
                style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8, borderTop: `3px solid ${g.color}`, display: "flex", flexDirection: "column", minWidth: 280 }}
              >
                <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 13, fontWeight: 700, color: g.color }}>{g.label}</span><span style={{ fontSize: 10, color: "#64748b", background: "rgba(255,255,255,0.09)", padding: "1px 6px", borderRadius: 8 }}>{gt.length}</span></div>
                  <button onClick={() => { setAddingIn(g.key); setNewTitle(""); }} aria-label="Agregar tarea" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(148,163,184,0.65)", padding: 2 }} onMouseEnter={e => e.currentTarget.style.color = g.color} onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,0.65)"}><Plus style={{ width: 14, height: 14 }} /></button>
                </div>
                <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 8, flex: 1, overflowY: "auto" }}>
                  {gt.map(t => <KanbanCard key={t.id} task={t} onEdit={setEditTask} />)}
                  {addingIn === g.key && <input ref={newRef} value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") createWith(g.createDefaults); if (e.key === "Escape") { setAddingIn(null); setNewTitle(""); } }} onBlur={() => { if (newTitle.trim()) createWith(g.createDefaults); else { setAddingIn(null); setNewTitle(""); } }} placeholder="Nombre..." style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "8px 10px", color: "#e2e8f0", fontSize: 12, outline: "none" }} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSave={fullCreate} members={members} />}
      {showRequest && <RequestModal onClose={() => setShowRequest(false)} onSave={createRequest} areas={config.areas} members={members} />}
      {editTask && <TaskDetailModal task={editTask} onClose={() => setEditTask(null)} onSave={fullUpdate} members={members} onRefresh={() => { fetch_(); }} />}
    </div>
  );
}
