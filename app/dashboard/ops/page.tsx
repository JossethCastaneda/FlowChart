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

/* ═══ TYPES ═══ */
interface Member { id: string; name: string; email: string | null; image: string | null; role: string }
interface Comment { id: string; userId: string; userName: string; userImage: string | null; content: string; createdAt: string }
interface Activity { id: string; userName: string; action: string; field: string | null; oldValue: string | null; newValue: string | null; createdAt: string }
interface Attachment { name: string; url: string; type: string; size: number; uploadedAt: string }
interface Task {
  id: string; title: string; description: string | null; assignee: string | null;
  priority: string; status: string; dueDate: string | null; tags: string[];
  order: number; parentId: string | null; children: Task[]; createdAt: string;
  attachments?: Attachment[];
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

/* ═══ HELPERS ═══ */
function sla(due: string | null, st: string) {
  if (!due || st === "Done") return { l: "—", c: "rgba(148,163,184,0.3)", bg: "transparent", i: "none" as const };
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
    <button onClick={onClick} style={{ display: "block", width: "100%", padding: "8px 12px", border: "none", cursor: "pointer", textAlign: "left", background: active ? "rgba(255,255,255,0.05)" : "transparent", fontSize: 12, color: "#e2e8f0" }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"} onMouseLeave={e => e.currentTarget.style.background = active ? "rgba(255,255,255,0.05)" : "transparent"}>
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
  return <div onClick={() => setEditing(true)} style={{ cursor: "text", padding: "4px 8px", borderRadius: 3, minHeight: 28, display: "flex", alignItems: "center", fontSize: 13, color: value ? "#e2e8f0" : "rgba(148,163,184,0.3)" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{value || placeholder || "—"}</div>;
}

/* ═══ TASK DETAIL MODAL (with Comments, Attachments, Activity) ═══ */
const inp: React.CSSProperties = { width: "100%", padding: "10px 14px", fontSize: 13, background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.1)", color: "#e2e8f0", outline: "none", borderRadius: 3 };
const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "rgba(148,163,184,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, display: "block" };

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
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(148,163,184,0.5)", cursor: "pointer", padding: 4 }}><X style={{ width: 18, height: 18 }} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(0,212,255,0.06)", padding: "0 24px" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "10px 16px", border: "none", cursor: "pointer",
              background: "none", fontSize: 11, fontWeight: 600,
              color: tab === t.key ? "#00d4ff" : "rgba(148,163,184,0.4)",
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
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>{TAG_PRESETS.filter(t => !form.tags.includes(t)).slice(0, 6).map(t => <button key={t} onClick={() => addTag(t)} style={{ fontSize: 9, padding: "2px 8px", border: "1px solid rgba(148,163,184,0.1)", background: "transparent", color: "rgba(148,163,184,0.4)", cursor: "pointer", borderRadius: 2 }}>+ {t}</button>)}</div>
            </div>
            {/* Attachments */}
            <div>
              <label style={lbl}><Paperclip style={{ width: 10, height: 10, display: "inline", verticalAlign: "middle", marginRight: 4 }} />Archivos Adjuntos</label>
              {((task.attachments || []) as Attachment[]).map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 4, marginBottom: 4, textDecoration: "none", color: "#e2e8f0", fontSize: 12 }}>
                  {a.type === "image" ? <ImageIcon style={{ width: 14, height: 14, color: "#7b61ff" }} /> : <FileText style={{ width: 14, height: 14, color: "#579bfc" }} />}
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                  <ExternalLink style={{ width: 10, height: 10, color: "rgba(148,163,184,0.3)" }} />
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
              {!loadingComments && comments.length === 0 && <p style={{ textAlign: "center", color: "rgba(148,163,184,0.3)", fontSize: 12, padding: "32px 0" }}>Sin comentarios. Inicia la conversacion.</p>}
              {comments.map(c => (
                <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#00d4ff", flexShrink: 0 }}>
                    {c.userName[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{c.userName}</span>
                      <span style={{ fontSize: 9, color: "rgba(148,163,184,0.3)" }}>{timeAgo(c.createdAt)}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(148,163,184,0.7)", lineHeight: 1.6, margin: 0, wordBreak: "break-word" }}>{c.content}</p>
                  </div>
                </div>
              ))}
              <div ref={commentEndRef} />
            </div>
            <div style={{ padding: "12px 24px", borderTop: "1px solid rgba(0,212,255,0.06)", display: "flex", gap: 8 }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }} placeholder="Escribe un comentario..." style={{ flex: 1, ...inp }} />
              <button onClick={postComment} disabled={!commentText.trim()} style={{ padding: "8px 14px", background: commentText.trim() ? "rgba(0,212,255,0.12)" : "transparent", border: `1px solid ${commentText.trim() ? "rgba(0,212,255,0.25)" : "rgba(255,255,255,0.06)"}`, borderRadius: 3, color: commentText.trim() ? "#00d4ff" : "rgba(148,163,184,0.2)", cursor: "pointer" }}>
                <Send style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}

        {/* ── Activity Tab ── */}
        {tab === "activity" && (
          <div style={{ padding: "16px 24px", maxHeight: "55vh", overflowY: "auto" }}>
            {activities.length === 0 && <p style={{ textAlign: "center", color: "rgba(148,163,184,0.3)", fontSize: 12, padding: "32px 0" }}>Sin actividad registrada.</p>}
            {activities.map(a => (
              <div key={a.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.action === "status_changed" ? "#00c875" : a.action === "assigned" ? "#00d4ff" : a.action === "priority_changed" ? "#fdab3d" : "rgba(148,163,184,0.2)", marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: "rgba(148,163,184,0.6)", margin: 0, lineHeight: 1.5 }}>
                    <strong style={{ color: "#e2e8f0" }}>{a.userName}</strong> {actLabels[a.action] || a.action}
                    {a.oldValue && a.newValue && <> de <span style={{ color: "rgba(226,68,92,0.6)", textDecoration: "line-through" }}>{a.oldValue}</span> a <span style={{ color: "#00c875" }}>{a.newValue}</span></>}
                    {!a.oldValue && a.newValue && <> <span style={{ color: "#00c875" }}>{a.newValue}</span></>}
                  </p>
                  <span style={{ fontSize: 9, color: "rgba(148,163,184,0.25)" }}>{timeAgo(a.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {tab === "details" && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 24px", borderTop: "1px solid rgba(0,212,255,0.06)" }}>
            <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(148,163,184,0.15)", color: "rgba(148,163,184,0.5)", cursor: "pointer", fontSize: 12, borderRadius: 3 }}>Cancelar</button>
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
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(148,163,184,0.5)", cursor: "pointer" }}><X style={{ width: 18, height: 18 }} /></button>
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>{TAG_PRESETS.filter(t => !form.tags.includes(t)).slice(0, 6).map(t => <button key={t} onClick={() => addTag(t)} style={{ fontSize: 9, padding: "2px 8px", border: "1px solid rgba(148,163,184,0.1)", background: "transparent", color: "rgba(148,163,184,0.4)", cursor: "pointer", borderRadius: 2 }}>+ {t}</button>)}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 24px", borderTop: "1px solid rgba(0,212,255,0.06)" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(148,163,184,0.15)", color: "rgba(148,163,184,0.5)", cursor: "pointer", fontSize: 12, borderRadius: 3 }}>Cancelar</button>
          <button onClick={submit} disabled={saving || !form.title.trim()} className="btn-primary" style={{ padding: "8px 24px", opacity: saving || !form.title.trim() ? 0.5 : 1 }}>{saving ? "Guardando..." : "Crear Tarea"}</button>
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
    <div onClick={() => onEdit(task)} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "12px 14px", cursor: "pointer", transition: "all 0.15s", borderLeft: `3px solid ${pri.c}` }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0", marginBottom: 8, lineHeight: 1.4 }}>{task.title}</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 2, background: pri.bg, color: pri.c, fontWeight: 600 }}>{pri.label}</span>
        {task.assignee && <span style={{ fontSize: 10, color: "rgba(148,163,184,0.5)" }}>{task.assignee}</span>}
        {sl.i !== "none" && <span style={{ fontSize: 9, color: sl.c, fontWeight: 600 }}>{sl.l}</span>}
      </div>
      {task.tags?.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 6 }}>{task.tags.map((t, i) => <span key={i} style={{ fontSize: 8, padding: "1px 5px", background: "rgba(123,97,255,0.08)", color: "rgba(123,97,255,0.5)", borderRadius: 2 }}>{t}</span>)}</div>}
      {childTotal > 0 && <div style={{ marginTop: 8 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(148,163,184,0.4)", marginBottom: 3 }}><span>Subtareas</span><span>{childDone}/{childTotal}</span></div><div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: `${(childDone / childTotal) * 100}%`, background: "#00c875", borderRadius: 2, transition: "width 0.3s" }} /></div></div>}
    </div>
  );
}

/* ═══ CALENDAR VIEW ═══ */
function CalendarView({ tasks, onEdit }: { tasks: Task[]; onEdit: (t: Task) => void }) {
  const [month, setMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const year = month.getFullYear(), mo = month.getMonth();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const firstDay = new Date(year, mo, 1).getDay();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const padEnd = 7 - (cells.length % 7); if (padEnd < 7) cells.push(...Array(padEnd).fill(null));
  const monthName = month.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const today = new Date(); const isToday = (d: number) => d === today.getDate() && mo === today.getMonth() && year === today.getFullYear();

  const byDate: Record<number, Task[]> = {};
  tasks.forEach(t => { if (t.dueDate) { const d = new Date(t.dueDate); if (d.getMonth() === mo && d.getFullYear() === year) { const day = d.getDate(); if (!byDate[day]) byDate[day] = []; byDate[day].push(t); } } });

  return (
    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <button onClick={() => setMonth(new Date(year, mo - 1, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(148,163,184,0.5)", padding: 4 }}><ChevronLeft style={{ width: 16, height: 16 }} /></button>
        <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.1em", textTransform: "capitalize" }}>{monthName}</span>
        <button onClick={() => setMonth(new Date(year, mo + 1, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(148,163,184,0.5)", padding: 4 }}><ChevronRight style={{ width: 16, height: 16 }} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(d => <div key={d} style={{ padding: "8px 4px", textAlign: "center", fontSize: 9, fontWeight: 600, color: "rgba(148,163,184,0.3)", borderBottom: "1px solid rgba(255,255,255,0.03)", letterSpacing: "0.1em" }}>{d}</div>)}
        {cells.map((day, i) => {
          const dt = day ? byDate[day] : undefined;
          return (
            <div key={i} style={{ minHeight: 80, padding: "4px 6px", borderBottom: "1px solid rgba(255,255,255,0.02)", borderRight: i % 7 !== 6 ? "1px solid rgba(255,255,255,0.02)" : "none", background: isToday(day!) ? "rgba(0,212,255,0.03)" : "transparent" }}>
              {day && <>
                <div style={{ fontSize: 11, fontWeight: isToday(day) ? 700 : 400, color: isToday(day) ? "#00d4ff" : "rgba(148,163,184,0.4)", marginBottom: 4 }}>{day}</div>
                {dt?.slice(0, 3).map(t => (
                  <div key={t.id} onClick={() => onEdit(t)} style={{ fontSize: 9, padding: "2px 4px", marginBottom: 2, borderRadius: 2, background: STATUS_CFG[t.status]?.bg || "#c4c4c4", color: "#fff", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{t.title}</div>
                ))}
                {dt && dt.length > 3 && <div style={{ fontSize: 8, color: "rgba(148,163,184,0.3)" }}>+{dt.length - 3} más</div>}
              </>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function OpsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "kanban" | "calendar">("table");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [addingSubIn, setAddingSubIn] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const newRef = useRef<HTMLInputElement>(null);
  const subRef = useRef<HTMLInputElement>(null);

  const fetch_ = useCallback(async () => {
    try { const r = await fetch("/api/ops"); const d = await r.json(); if (d.data) setTasks(d.data); if (d.members) setMembers(d.members); } catch (e) { console.error("[OPS]", e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => { if (addingIn) newRef.current?.focus(); }, [addingIn]);
  useEffect(() => { if (addingSubIn) subRef.current?.focus(); }, [addingSubIn]);

  const create = async (status: string) => { if (!newTitle.trim()) return; try { const r = await fetch("/api/ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle.trim(), status }) }); const d = await r.json(); if (r.ok) setTasks(p => [...p, d.data]); } catch {} setNewTitle(""); setAddingIn(null); };
  const createSub = async (parentId: string) => { if (!newTitle.trim()) return; try { const r = await fetch("/api/ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle.trim(), parentId, status: "Backlog" }) }); const d = await r.json(); if (r.ok) setTasks(p => p.map(t => t.id === parentId ? { ...t, children: [...(t.children || []), d.data] } : t)); } catch {} setNewTitle(""); setAddingSubIn(null); };
  const fullCreate = async (data: any) => { try { const r = await fetch("/api/ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); const d = await r.json(); if (r.ok) { setTasks(p => [...p, d.data]); setShowCreate(false); } } catch {} };
  const fullUpdate = async (data: any) => { if (!editTask) return; try { const r = await fetch(`/api/ops/${editTask.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); const d = await r.json(); if (r.ok) { setTasks(p => p.map(t => t.id === editTask.id ? d.data : t)); setEditTask(null); } } catch {} };
  const patch = async (id: string, p: any) => { setTasks(prev => prev.map(t => t.id === id ? { ...t, ...p } : t)); try { await fetch(`/api/ops/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) }); } catch { fetch_(); } };
  const del = async (id: string) => { if (!confirm("¿Eliminar?")) return; setTasks(p => p.filter(t => t.id !== id)); try { await fetch(`/api/ops/${id}`, { method: "DELETE" }); } catch { fetch_(); } };

  const cnt = (s: string) => tasks.filter(t => t.status === s).length;
  const overdue = tasks.filter(t => t.dueDate && t.status !== "Done" && new Date(t.dueDate) < new Date()).length;
  const done = cnt("Done"), total = tasks.length, pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const filtered = useMemo(() => { if (!search) return tasks; const q = search.toLowerCase(); return tasks.filter(t => t.title.toLowerCase().includes(q) || t.assignee?.toLowerCase().includes(q) || t.tags?.some(tg => tg.toLowerCase().includes(q))); }, [tasks, search]);
  const ch: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "rgba(148,163,184,0.5)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)" };

  return (
    <div className="space-y-6">
      <PageHeader title="Marketing Ops" description="Gestión de tareas, workflows y operaciones del equipo."
        icon={<Users className="w-6 h-6" style={{ color: "#ff2d55" }} />}
        action={<button className="btn-primary" onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}><Plus style={{ width: 14, height: 14 }} /> Nueva Tarea</button>} />

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
              <p style={{ fontSize: 9, color: "rgba(148,163,184,0.4)", fontFamily: "'Orbitron',sans-serif", letterSpacing: "0.12em", marginTop: 2 }}>{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "6px 12px", flex: 1, maxWidth: 320 }}>
          <Search style={{ width: 14, height: 14, color: "rgba(148,163,184,0.3)" }} />
          <input type="text" placeholder="Buscar tareas..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: 13, width: "100%" }} />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["table", "kanban", "calendar"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "6px 10px", background: view === v ? "rgba(0,212,255,0.1)" : "transparent", border: `1px solid ${view === v ? "rgba(0,212,255,0.25)" : "rgba(255,255,255,0.06)"}`, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: view === v ? "#00d4ff" : "rgba(148,163,184,0.4)", fontSize: 11, fontWeight: 600 }}>
              {v === "table" ? <List style={{ width: 13, height: 13 }} /> : v === "kanban" ? <LayoutGrid style={{ width: 13, height: 13 }} /> : <CalendarIcon style={{ width: 13, height: 13 }} />}
              {v === "table" ? "Tabla" : v === "kanban" ? "Kanban" : "Calendario"}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: "60px 0" }}><Loader2 style={{ width: 24, height: 24, color: "#00d4ff", animation: "spin 1s linear infinite", margin: "0 auto" }} /></div>}

      {/* TABLE VIEW */}
      {!loading && view === "table" && GROUPS.map(g => {
        const gt = filtered.filter(t => t.status === g.key);
        const coll = collapsed[g.key];
        const doneCount = gt.filter(t => t.status === "Done" || t.children?.every(c => c.status === "Done")).length;
        const progressPct = gt.length > 0 ? Math.round((doneCount / gt.length) * 100) : 0;
        return (
          <div key={g.key} style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, overflow: "hidden" }}>
            <div onClick={() => setCollapsed(p => ({ ...p, [g.key]: !p[g.key] }))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", borderLeft: `4px solid ${g.color}`, background: "rgba(255,255,255,0.02)" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}>
              {coll ? <ChevronRight style={{ width: 16, height: 16, color: g.color }} /> : <ChevronDown style={{ width: 16, height: 16, color: g.color }} />}
              <span style={{ fontSize: 14, fontWeight: 700, color: g.color }}>{g.label}</span>
              <span style={{ fontSize: 11, color: "rgba(148,163,184,0.4)", background: "rgba(255,255,255,0.04)", padding: "1px 8px", borderRadius: 10 }}>{gt.length}</span>
              {gt.length > 0 && <div style={{ flex: 1, maxWidth: 120, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden", marginLeft: 8 }}><div style={{ height: "100%", width: `${progressPct}%`, background: g.color, borderRadius: 2, transition: "width 0.3s" }} /></div>}
              {gt.length > 0 && <span style={{ fontSize: 9, color: "rgba(148,163,184,0.3)" }}>{progressPct}%</span>}
            </div>
            {!coll && <div style={{ borderLeft: `4px solid ${g.color}` }}>
              {gt.length > 0 && <div className="ops-table-header" style={{ display: "grid", gridTemplateColumns: "1fr 120px 110px 80px 90px 75px 36px", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={ch}>Tarea</div><div style={{ ...ch, textAlign: "center" }}>Persona</div><div style={{ ...ch, textAlign: "center" }}>Estado</div><div style={{ ...ch, textAlign: "center" }}>Prioridad</div><div style={{ ...ch, textAlign: "center" }}>SLA</div><div style={{ ...ch, textAlign: "center" }}>Fecha</div><div style={ch}></div>
              </div>}
              {gt.map(task => {
                const sl = sla(task.dueDate, task.status); const hasChildren = task.children?.length > 0; const isExpanded = expanded[task.id]; const childDone = task.children?.filter(c => c.status === "Done").length || 0;
                return (
                  <div key={task.id}>
                    <div className="ops-table-row" style={{ display: "grid", gridTemplateColumns: "1fr 120px 110px 80px 90px 75px 36px", gap: 0, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.025)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ padding: "6px 10px", minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
                        {hasChildren ? <button onClick={() => setExpanded(p => ({ ...p, [task.id]: !p[task.id] }))} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "rgba(148,163,184,0.4)", flexShrink: 0 }}>{isExpanded ? <ChevronDown style={{ width: 12, height: 12 }} /> : <ChevronRight style={{ width: 12, height: 12 }} />}</button> : <div style={{ width: 16 }} />}
                        <div style={{ minWidth: 0, flex: 1, cursor: "pointer" }} onClick={() => setEditTask(task)}>
                          <div style={{ padding: "4px 8px", fontSize: 13, color: "#e2e8f0" }}>{task.title}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 8px", flexWrap: "wrap" }}>
                            {task.tags?.map((t, j) => <span key={j} style={{ fontSize: 8, padding: "1px 5px", background: "rgba(123,97,255,0.08)", color: "rgba(123,97,255,0.5)", borderRadius: 2 }}>{t}</span>)}
                            {hasChildren && <span style={{ fontSize: 8, color: "rgba(148,163,184,0.3)" }}>{childDone}/{task.children.length} sub</span>}
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
                        <button onClick={() => del(task.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 3, color: "rgba(148,163,184,0.15)" }} onMouseEnter={e => e.currentTarget.style.color = "#e2445c"} onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,0.15)"}><Trash2 style={{ width: 12, height: 12 }} /></button>
                      </div>
                    </div>
                    {/* Subitems */}
                    {isExpanded && task.children?.map(sub => {
                      const ssl = sla(sub.dueDate, sub.status);
                      return (
                        <div key={sub.id} className="ops-table-row" style={{ display: "grid", gridTemplateColumns: "1fr 120px 110px 80px 90px 75px 36px", gap: 0, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.015)", background: "rgba(255,255,255,0.01)" }}>
                          <div style={{ padding: "4px 10px 4px 42px", minWidth: 0 }}><EditableCell value={sub.title} onSave={v => patch(sub.id, { title: v })} /></div>
                          <div style={{ padding: "4px", display: "flex", justifyContent: "center" }}><span style={{ fontSize: 11, color: "rgba(148,163,184,0.35)" }}>{sub.assignee || "—"}</span></div>
                          <div style={{ padding: "4px", display: "flex", justifyContent: "center" }}>
                            <Dropdown trigger={<Pill label={STATUS_CFG[sub.status]?.label || sub.status} bg={STATUS_CFG[sub.status]?.bg || "#c4c4c4"} color={STATUS_CFG[sub.status]?.c || "#fff"} />}>
                              {(close) => <>{STATUSES.map(s => <DropdownOption key={s} label={STATUS_CFG[s].label} color={STATUS_CFG[s].bg} active={sub.status === s} onClick={() => { patch(sub.id, { status: s }); close(); setTasks(p => p.map(t => t.id === task.id ? { ...t, children: t.children.map(c => c.id === sub.id ? { ...c, status: s } : c) } : t)); }} />)}</>}
                            </Dropdown>
                          </div>
                          <div /><div /><div />
                          <div style={{ padding: "4px", textAlign: "center" }}><button onClick={() => del(sub.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 3, color: "rgba(148,163,184,0.1)" }} onMouseEnter={e => e.currentTarget.style.color = "#e2445c"} onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,0.1)"}><Trash2 style={{ width: 11, height: 11 }} /></button></div>
                        </div>
                      );
                    })}
                    {isExpanded && (addingSubIn === task.id ? (
                      <div style={{ padding: "6px 10px 6px 42px", background: "rgba(255,255,255,0.01)" }}>
                        <input ref={subRef} value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") createSub(task.id); if (e.key === "Escape") { setAddingSubIn(null); setNewTitle(""); } }} onBlur={() => { if (newTitle.trim()) createSub(task.id); else { setAddingSubIn(null); setNewTitle(""); } }} placeholder="Agregar subtarea..." style={{ width: "60%", background: "transparent", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 3, padding: "4px 8px", color: "#e2e8f0", fontSize: 12, outline: "none" }} />
                      </div>
                    ) : (
                      <div onClick={() => { setAddingSubIn(task.id); setNewTitle(""); }} style={{ padding: "6px 10px 6px 42px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "rgba(148,163,184,0.2)", fontSize: 11 }} onMouseEnter={e => e.currentTarget.style.color = "#00d4ff"} onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,0.2)"}><Plus style={{ width: 11, height: 11 }} /> Subtarea</div>
                    ))}
                  </div>
                );
              })}
              {addingIn === g.key ? (
                <div style={{ padding: "8px 12px 8px 28px", borderTop: gt.length > 0 ? "1px solid rgba(255,255,255,0.025)" : "none", background: "rgba(255,255,255,0.02)" }}>
                  <input ref={newRef} value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") create(g.key); if (e.key === "Escape") { setAddingIn(null); setNewTitle(""); } }} onBlur={() => { if (newTitle.trim()) create(g.key); else { setAddingIn(null); setNewTitle(""); } }} placeholder="Nombre de la tarea..." style={{ width: "100%", background: "transparent", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 3, padding: "6px 10px", color: "#e2e8f0", fontSize: 13, outline: "none" }} />
                </div>
              ) : (
                <div onClick={() => { setAddingIn(g.key); setNewTitle(""); }} style={{ padding: "10px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "rgba(148,163,184,0.25)", fontSize: 12, borderTop: gt.length > 0 ? "1px solid rgba(255,255,255,0.02)" : "none" }}
                  onMouseEnter={e => { e.currentTarget.style.color = g.color; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }} onMouseLeave={e => { e.currentTarget.style.color = "rgba(148,163,184,0.25)"; e.currentTarget.style.background = "transparent"; }}>
                  <Plus style={{ width: 13, height: 13 }} /> Agregar tarea
                </div>
              )}
            </div>}
          </div>
        );
      })}

      {/* KANBAN VIEW */}
      {!loading && view === "kanban" && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${GROUPS.length}, 1fr)`, gap: 12, minHeight: 400 }}>
          {GROUPS.map(g => {
            const gt = filtered.filter(t => t.status === g.key);
            return (
              <div key={g.key} style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, borderTop: `3px solid ${g.color}`, display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 13, fontWeight: 700, color: g.color }}>{g.label}</span><span style={{ fontSize: 10, color: "rgba(148,163,184,0.4)", background: "rgba(255,255,255,0.04)", padding: "1px 6px", borderRadius: 8 }}>{gt.length}</span></div>
                  <button onClick={() => { setAddingIn(g.key); setNewTitle(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(148,163,184,0.25)", padding: 2 }} onMouseEnter={e => e.currentTarget.style.color = g.color} onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,0.25)"}><Plus style={{ width: 14, height: 14 }} /></button>
                </div>
                <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 8, flex: 1, overflowY: "auto" }}>
                  {gt.map(t => <KanbanCard key={t.id} task={t} onEdit={setEditTask} />)}
                  {addingIn === g.key && <input ref={newRef} value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") create(g.key); if (e.key === "Escape") { setAddingIn(null); setNewTitle(""); } }} onBlur={() => { if (newTitle.trim()) create(g.key); else { setAddingIn(null); setNewTitle(""); } }} placeholder="Nombre..." style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "8px 10px", color: "#e2e8f0", fontSize: 12, outline: "none" }} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CALENDAR VIEW */}
      {!loading && view === "calendar" && <CalendarView tasks={filtered} onEdit={setEditTask} />}

      {/* Modals */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSave={fullCreate} members={members} />}
      {editTask && <TaskDetailModal task={editTask} onClose={() => setEditTask(null)} onSave={fullUpdate} members={members} onRefresh={() => { fetch_(); }} />}
    </div>
  );
}
