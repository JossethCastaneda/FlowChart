/* eslint-disable @next/next/no-img-element, react-hooks/static-components, @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect */
﻿"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  List,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  AlertCircle,
  FileText,
  Trash2,
  Send,
    Pencil,
  Loader2,
    Image as ImageIcon,
  Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Sheet } from "@/components/ui/Sheet";
import { Tag } from "@/components/ui/Tag";
import { BoostModal, type BoostResult } from "./BoostModal";
import { Copy, ArrowUpRight } from "lucide-react";

/* ── Social Icons (not in lucide-react) ───────────────── */
const FacebookIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="#1877f2" style={{ width: 11, height: 11, ...style }}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
const InstagramIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="#e1306c" style={{ width: 11, height: 11, ...style }}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);


/* ── Types ─────────────────────────────────────────────── */
interface Post {
  id: string;
  content: string;
  channels: string[];
  mediaUrls: string[];
  mediaUrl: string | null;
  status: string;
  type: string;
  hashtags: string[];
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  pageName: string | null;
  pageId: string | null;
  error: string | null;
  externalIds?: Record<string, string>;
  isExternal?: boolean;
}



/* ── Status config ────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  Draft: { label: "EN HANGAR", color: "var(--fc-text-secondary)", bg: "rgba(148,163,184,0.16)", border: "rgba(148,163,184,0.65)", icon: <FileText style={{ width: 12, height: 12 }} /> },
  Scheduled: { label: "SECUENCIA INICIADA", color: "var(--fc-warning)", bg: "rgba(253,171,61,0.08)", border: "rgba(253,171,61,0.2)", icon: <Clock style={{ width: 12, height: 12 }} /> },
  Published: { label: "TRANSMISIÓN ENVIADA", color: "var(--fc-success)", bg: "rgba(0,200,117,0.08)", border: "rgba(0,200,117,0.2)", icon: <Check style={{ width: 12, height: 12 }} /> },
  Failed: { label: "SEÑAL PERDIDA", color: "var(--fc-danger)", bg: "rgba(226,68,92,0.08)", border: "rgba(226,68,92,0.2)", icon: <AlertCircle style={{ width: 12, height: 12 }} /> },
};

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  facebook: <FacebookIcon />,
  instagram: <InstagramIcon />,
};

const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/* ── Helpers ───────────────────────────────────────────── */
const fmtDate = (d: Date) => new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" }).format(d);
const fmtTime = (d: Date) => new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true }).format(d);
const fmtMonthYear = (d: Date) => {
  const m = new Intl.DateTimeFormat("es-MX", { month: "long" }).format(d);
  return m.charAt(0).toUpperCase() + m.slice(1) + " " + d.getFullYear();
};
const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const toDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* ══════════════════════════════════════════════════════════
   SCHEDULED CALENDAR COMPONENT
   ══════════════════════════════════════════════════════════ */
export function ScheduledCalendar({ onOpenInComposer }: { onOpenInComposer?: (postId: string) => void } = {}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "list">("month");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [rescheduleDraft, setRescheduleDraft] = useState("");

  // Boost state
  const [boostTarget, setBoostTarget] = useState<Post | null>(null);
  const [boostResults, setBoostResults] = useState<Record<string, BoostResult>>({});

  /* ── Fetch posts & channels ──────────────────────────────────────── */
  const [channels, setChannels] = useState<{ id: string; picture: string | null }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resPosts, resFilters] = await Promise.all([
        fetch("/api/publisher/posts"),
        fetch("/api/publisher/filters")
      ]);
      if (resPosts.ok) {
        const data = await resPosts.json();
        setPosts(data.data?.posts || []);
      }
      if (resFilters.ok) {
        const data = await resFilters.json();
        setChannels(data.data?.channels || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

   
    useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  /* ── Filter posts ─────────────────────────────────────── */
  const channelCounts = posts.reduce<Record<string, number>>((acc, p) => {
    for (const ch of p.channels) acc[ch] = (acc[ch] || 0) + 1;
    return acc;
  }, {});
  const availableChannels = Object.keys(channelCounts).sort();

  const filtered = posts.filter((p) => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterChannel !== "all" && !p.channels.includes(filterChannel)) return false;
    return true;
  });

  /* ── Calendar grid ────────────────────────────────────── */
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = lastDay.getDate();

  const calendarDays: { date: Date; isCurrentMonth: boolean }[] = [];
  // Fill leading days from prev month
  for (let i = startDow - 1; i >= 0; i--) {
    calendarDays.push({ date: new Date(year, month, -i), isCurrentMonth: false });
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  // Fill trailing days
  while (calendarDays.length % 7 !== 0) {
    const last = calendarDays[calendarDays.length - 1].date;
    calendarDays.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), isCurrentMonth: false });
  }

  const today = new Date();

  // Group posts by date
  const postsByDate: Record<string, Post[]> = {};
  filtered.forEach((p) => {
    const d = p.scheduledAt || p.createdAt;
    if (!d) return;
    const key = toDateKey(new Date(d));
    if (!postsByDate[key]) postsByDate[key] = [];
    postsByDate[key].push(p);
  });

  /* ── Actions ──────────────────────────────────────────── */
  const deletePost = async (id: string) => {
    const post = posts.find(p => p.id === id);
    if (post?.isExternal) {
      setBanner({ type: "error", message: "No puedes eliminar una publicación programada externamente en Meta." });
      return;
    }
    if (!confirm("¿Eliminar esta publicación?")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/publisher/posts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
        setBanner({ type: "success", message: "Publicación eliminada" });
      } else {
        const data = await res.json();
        setBanner({ type: "error", message: data.error || "Error" });
      }
    } catch { setBanner({ type: "error", message: "Error de red" }); }
    setActionLoading(null);
  };

  const publishNow = async (id: string) => {
    const post = posts.find(p => p.id === id);
    if (post?.isExternal) {
      setBanner({ type: "error", message: "No puedes publicar ahora un post gestionado por Meta." });
      return;
    }
    if (!confirm("¿Publicar ahora?")) return;
    setActionLoading(id);
    try {
      const res = await fetch("/api/publisher/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        setBanner({ type: "success", message: "¡Publicado exitosamente!" });
        fetchData();
      } else {
        setBanner({ type: "error", message: data.error || "Error al publicar" });
      }
    } catch { setBanner({ type: "error", message: "Error de red" }); }
    setActionLoading(null);
  };

  const handleReschedule = async (postId: string, targetDate: Date) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    if (post.isExternal) {
      setBanner({ type: "error", message: "No puedes reprogramar publicaciones externas." });
      return;
    }

    const currentRefDate = post.scheduledAt ? new Date(post.scheduledAt) : new Date(post.createdAt);
    const newScheduledAt = new Date(targetDate);
    newScheduledAt.setHours(currentRefDate.getHours());
    newScheduledAt.setMinutes(currentRefDate.getMinutes());
    newScheduledAt.setSeconds(0);
    newScheduledAt.setMilliseconds(0);

    let newStatus = post.status;
    const now = new Date();
    const diffMinutes = (newScheduledAt.getTime() - now.getTime()) / (1000 * 60);

    if (newStatus === "Scheduled") {
      if (diffMinutes < 11) {
        if (isSameDay(newScheduledAt, now)) {
          const adjustedTime = new Date(now.getTime() + 15 * 60 * 1000);
          newScheduledAt.setTime(adjustedTime.getTime());
          setBanner({
            type: "success",
            message: `Horario ajustado a las ${fmtTime(newScheduledAt)} para cumplir con los 11 minutos mínimos de Meta.`
          });
        } else {
          newStatus = "Draft";
          setBanner({
            type: "success",
            message: "La publicación se movió al pasado y se guardó como Borrador (En Hangar)."
          });
        }
      }
    }

    const updatedPost = {
      ...post,
      scheduledAt: newScheduledAt.toISOString(),
      status: newStatus,
    };
    setPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)));

    try {
      const res = await fetch(`/api/publisher/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: newScheduledAt.toISOString(),
          status: newStatus,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data?.post) {
          setPosts((prev) => prev.map((p) => (p.id === postId ? data.data.post : p)));
        }
        if (!banner) {
          setBanner({
            type: "success",
            message: `Publicación reprogramada para el ${fmtDate(newScheduledAt)}.`
          });
        }
      } else {
        const errData = await res.json();
        setBanner({
          type: "error",
          message: errData.error || "Error al reprogramar la publicación."
        });
        fetchData();
      }
    } catch {
      setBanner({ type: "error", message: "Error de red al reprogramar." });
      fetchData();
    }
  };

  const duplicatePost = async (post: Post) => {
    setActionLoading(post.id);
    try {
      const res = await fetch("/api/publisher/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: post.content,
          channels: post.channels,
          mediaUrls: post.mediaUrls,
          type: post.type,
          hashtags: post.hashtags,
          pageName: post.pageName || undefined,
          pageId: post.pageId || undefined,
          status: "Draft",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBanner({ type: "success", message: "Duplicado como borrador." });
        setDetailPost(null);
        fetchData();
      } else {
        setBanner({ type: "error", message: data.error || "No se pudo duplicar." });
      }
    } catch {
      setBanner({ type: "error", message: "Error de red al duplicar." });
    }
    setActionLoading(null);
  };

  const reschedulePost = async (post: Post, newIso: string) => {
    if (!newIso) return;
    setActionLoading(post.id);
    try {
      const res = await fetch(`/api/publisher/posts/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: newIso, status: "Scheduled" }),
      });
      const data = await res.json();
      if (res.ok) {
        setPosts((prev) => prev.map((p) => (p.id === post.id ? data.data?.post || p : p)));
        setDetailPost(data.data?.post || null);
        setBanner({ type: "success", message: `Reprogramada para el ${fmtDate(new Date(newIso))}.` });
      } else {
        setBanner({ type: "error", message: data.error || "No se pudo reprogramar." });
      }
    } catch {
      setBanner({ type: "error", message: "Error de red al reprogramar." });
    }
    setActionLoading(null);
  };

  const openDetail = (post: Post) => {
    setDetailPost(post);
    setRescheduleDraft(post.scheduledAt ? post.scheduledAt.slice(0, 16) : "");
  };

  /* ── Status badge ─────────────────────────────────────── */
  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Draft;
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px",
        borderRadius: 4, fontSize: 10, fontWeight: 600, color: cfg.color,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
      }}>
        {cfg.icon} {cfg.label}
      </span>
    );
  };

  /* ── Boost helpers ─────────────────────────────────── */
  const openBoostModal = (post: Post) => setBoostTarget(post);
  const closeBoostModal = () => setBoostTarget(null);
  const handleBoostSuccess = (result: BoostResult) => {
    if (boostTarget) {
      setBoostResults((prev) => ({ ...prev, [boostTarget.id]: result }));
    }
    setBoostTarget(null);
    setBanner({ type: "success", message: "Boost creado EN PAUSA. Actívalo desde el Ads Manager cuando estés listo — no gasta hasta entonces." });
  };

  /* ── Post card (list view + day detail) ────────────────── */
  const PostCard = ({ post }: { post: Post }) => {
    const date = post.scheduledAt || post.createdAt;
    const d = date ? new Date(date) : null;
    const isEditable = ["Draft", "Scheduled"].includes(post.status);
    const media = post.mediaUrls?.[0] || post.mediaUrl;
    const pageChannel = post.pageId ? channels.find(c => c.id === post.pageId) : null;
    const avatarUrl = pageChannel?.picture;

    return (
      <div
        draggable={isEditable && !post.isExternal}
        onClick={() => openDetail(post)}
        onDragStart={(e) => {
          if (isEditable && !post.isExternal) {
            e.stopPropagation();
            e.dataTransfer.setData("text/plain", post.id);
            e.dataTransfer.effectAllowed = "move";
          }
        }}
        style={{
          display: "flex", gap: 12, padding: "12px 14px",
          background: post.isExternal ? "linear-gradient(to right, rgba(24,119,242,0.03), rgba(225,48,108,0.03))" : "var(--surface-hover)",
          border: post.isExternal ? "1px solid rgba(24,119,242,0.2)" : "1px solid var(--hairline)",
          borderRadius: 8, marginBottom: 8, transition: "border-color 0.2s",
          cursor: (isEditable && !post.isExternal) ? "grab" : "pointer",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
      >
        {/* Media thumb */}
        {media && (
          <div style={{ width: 56, height: 56, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "var(--fc-bg)" }}>
                        <img src={media} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <StatusBadge status={post.status} />
            {boostResults[post.id] && (
              <span style={{
                fontSize: 9, fontWeight: 600, color: "var(--fc-warning)",
                background: "var(--fc-surface)",
                border: "1px solid rgba(224,168,60,0.3)",
                borderRadius: 4, padding: "2px 6px",
                display: "inline-flex", alignItems: "center", gap: 3,
              }}>
                <Zap style={{ width: 9, height: 9 }} /> BOOST ACTIVO
              </span>
            )}
            <div style={{ display: "flex", gap: 4 }}>
              {post.channels.map((ch) => <span key={ch}>{CHANNEL_ICON[ch]}</span>)}
            </div>
            {post.pageName && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 6px", borderRadius: 4, background: "var(--row-hover)" }}>
                {avatarUrl ? (
                                    <img src={avatarUrl} alt="" style={{ width: 14, height: 14, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "var(--fc-text)" }}>
                    {post.pageName.charAt(0)}
                  </div>
                )}
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--fc-text)" }}>{post.pageName}</span>
              </div>
            )}
            {post.isExternal && (
              <span style={{
                fontSize: 9, fontWeight: 600, color: "#1877f2",
                background: "rgba(24,119,242,0.1)",
                border: "1px solid rgba(24,119,242,0.3)",
                borderRadius: 4, padding: "2px 6px",
              }}>
                SYNC META
              </span>
            )}
            {d && <span style={{ fontSize: 10, color: "var(--fc-text-muted)" }}>{fmtDate(d)} · {fmtTime(d)}</span>}
          </div>
          <p style={{ fontSize: 12, color: "var(--fc-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {post.content.length > 100 ? post.content.slice(0, 100) + "..." : post.content}
          </p>
          {post.error && (
            <p style={{ fontSize: 10, color: "var(--fc-danger)", margin: "4px 0 0" }}>{post.error}</p>
          )}
        </div>

        {/* Actions */}
        <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 4, alignItems: "flex-start", flexShrink: 0 }}>
          {isEditable && !post.isExternal && (
            <>
              {/* El botón "Editar" se retiró: era un console.log sin flujo de edición
                  cableado (afordancia falsa). Editar un post se hace desde el Composer. */}
              <button
                onClick={() => publishNow(post.id)}
                title="Publicar Ahora"
                disabled={actionLoading === post.id}
                style={{ ...actionBtnStyle, color: "var(--fc-success)" }}
              >
                {actionLoading === post.id ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 13, height: 13 }} />}
              </button>
            </>
          )}
          {post.status === "Published" && post.pageId && !boostResults[post.id] && (
            <button
              onClick={() => openBoostModal(post)}
              title="Boost este post"
              style={{ ...actionBtnStyle, color: "var(--fc-warning)" }}
            >
              <Zap style={{ width: 13, height: 13 }} />
            </button>
          )}
          {boostResults[post.id] && (
            <button
              disabled
              title="Boost activo"
              style={{ ...actionBtnStyle, color: "var(--fc-success)", cursor: "default", opacity: 0.8 }}
            >
              <Zap style={{ width: 13, height: 13, fill: "var(--fc-success)" }} />
            </button>
          )}
          {!post.isExternal && (
            <button onClick={() => deletePost(post.id)} title="Eliminar" disabled={actionLoading === post.id} style={{ ...actionBtnStyle, color: "var(--fc-danger)" }}>
              <Trash2 style={{ width: 13, height: 13 }} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const actionBtnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28, borderRadius: 4, border: "1px solid var(--hairline)",
    background: "var(--row-hover)", color: "var(--fc-text-secondary)", cursor: "pointer", transition: "all 0.15s",
  };

  /* ── Filter pill button ────────────────────────────────── */
  const FilterPill = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button onClick={onClick} style={{
      padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: "pointer",
      border: active ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.06)",
      background: active ? "rgba(59,130,246,0.1)" : "var(--surface-hover)",
      color: active ? "var(--fc-accent)" : "var(--fc-text-muted)", transition: "all 0.15s",
    }}>{label}</button>
  );

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>

      {/* Banner */}
      {banner && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8,
          fontSize: 13, fontWeight: 500,
          background: banner.type === "success" ? "rgba(0,200,117,0.12)" : "rgba(226,68,92,0.12)",
          border: `1px solid ${banner.type === "success" ? "rgba(0,200,117,0.3)" : "rgba(226,68,92,0.3)"}`,
          color: banner.type === "success" ? "var(--fc-success)" : "var(--fc-danger)",
        }}>
          {banner.type === "success" ? <Check style={{ width: 14, height: 14 }} /> : <AlertCircle style={{ width: 14, height: 14 }} />}
          {banner.message}
        </div>
      )}

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--fc-text)", margin: 0 }}>Calendario de Publicaciones</h3>
          <p style={{ fontSize: 13, color: "var(--fc-text-secondary)", margin: "4px 0 0" }}>{posts.length} publicaciones en total</p>
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", gap: 4, background: "var(--row-hover)", borderRadius: 8, padding: 3, border: "1px solid var(--hairline)" }}>
          <button onClick={() => setView("month")} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6,
            border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500,
            background: view === "month" ? "rgba(59,130,246,0.1)" : "transparent",
            color: view === "month" ? "var(--fc-accent)" : "var(--fc-text-muted)",
          }}><CalendarIcon style={{ width: 14, height: 14 }} /> Mes</button>
          <button onClick={() => setView("list")} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6,
            border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500,
            background: view === "list" ? "rgba(59,130,246,0.1)" : "transparent",
            color: view === "list" ? "var(--fc-accent)" : "var(--fc-text-muted)",
          }}><List style={{ width: 14, height: 14 }} /> Lista</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--fc-text-muted)", fontWeight: 500 }}>Estado:</span>
                <FilterPill label="Todos" active={filterStatus === "all"} onClick={() => setFilterStatus("all")} />
                <FilterPill label="Borrador" active={filterStatus === "Draft"} onClick={() => setFilterStatus("Draft")} />
                <FilterPill label="Programado" active={filterStatus === "Scheduled"} onClick={() => setFilterStatus("Scheduled")} />
                <FilterPill label="Publicado" active={filterStatus === "Published"} onClick={() => setFilterStatus("Published")} />
                <FilterPill label="Fallido" active={filterStatus === "Failed"} onClick={() => setFilterStatus("Failed")} />
      </div>

      {availableChannels.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--fc-text-muted)", fontWeight: 500 }}>Canal:</span>
          <FilterPill label={`Todos (${posts.length})`} active={filterChannel === "all"} onClick={() => setFilterChannel("all")} />
          {availableChannels.map((ch) => (
            <FilterPill key={ch} label={`${ch} (${channelCounts[ch]})`} active={filterChannel === ch} onClick={() => setFilterChannel(ch)} />
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton style={{ height: 80 }} />
          <Skeleton style={{ height: 80 }} />
          <Skeleton style={{ height: 80 }} />
        </div>
      )}

      {/* ── MONTH VIEW ────────────────────────────────────── */}
      {!loading && view === "month" && (
        <div style={{ background: "var(--surface-hover)", border: "1px solid var(--hairline)", borderRadius: 10, overflow: "hidden" }}>
          {/* Month nav */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", border: "1px solid var(--hairline)" }}>
            <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fc-text-secondary)", display: "flex", padding: 4 }}>
              <ChevronLeft style={{ width: 18, height: 18 }} />
            </button>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: "var(--fc-text)", margin: 0 }}>{fmtMonthYear(currentMonth)}</h4>
            <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fc-text-secondary)", display: "flex", padding: 4 }}>
              <ChevronRight style={{ width: 18, height: 18 }} />
            </button>
          </div>

          {/* DOW header */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {DOW.map((d) => (
              <div key={d} style={{ padding: "8px 4px", textAlign: "center", fontSize: 10, fontWeight: 600, color: "var(--fc-text-muted)", borderBottom: "1px solid var(--hairline)" }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {calendarDays.map(({ date, isCurrentMonth }, idx) => {
              const key = toDateKey(date);
              const dayPosts = postsByDate[key] || [];
              const isToday = isSameDay(date, today);
              const isSelected = selectedDay === key;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDay(isSelected ? null : key)}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragOverDay(key);
                  }}
                  onDragLeave={() => {
                    setDragOverDay(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverDay(null);
                    const postId = e.dataTransfer.getData("text/plain");
                    if (postId) {
                      handleReschedule(postId, date);
                    }
                  }}
                  style={{
                    minHeight: 80, padding: "4px 6px", cursor: "pointer",
                    border: "1px solid var(--hairline)",
                    borderRight: (idx + 1) % 7 !== 0 ? "1px solid rgba(255,255,255,0.03)" : "none",
                    background: dragOverDay === key ? "rgba(59,130,246,0.08)" : isSelected ? "rgba(59,130,246,0.04)" : isToday ? "rgba(59,130,246,0.02)" : "transparent",
                    outline: dragOverDay === key ? "2px dashed rgba(59,130,246,0.6)" : "none",
                    outlineOffset: "-2px",
                    opacity: isCurrentMonth ? 1 : 0.3,
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{
                    fontSize: 11, fontWeight: isToday ? 700 : 400,
                    color: isToday ? "var(--fc-accent)" : "var(--fc-text-secondary)",
                    width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: "50%",
                    background: isToday ? "rgba(59,130,246,0.15)" : "none",
                    marginBottom: 4,
                  }}>
                    {date.getDate()}
                  </div>

                  {/* Post pills */}
                  {dayPosts.slice(0, 3).map((p) => {
                    const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.Draft;
                    const t = p.scheduledAt ? new Date(p.scheduledAt) : null;
                    return (
                      <div
                        key={p.id}
                        draggable={["Draft", "Scheduled"].includes(p.status) && !p.isExternal}
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(p);
                        }}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData("text/plain", p.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 3, padding: "2px 5px", marginBottom: 2,
                          borderRadius: 3, fontSize: 8, fontWeight: 500, color: cfg.color,
                          background: p.isExternal ? "rgba(24,119,242,0.1)" : cfg.bg,
                          border: p.isExternal ? "1px solid rgba(24,119,242,0.4)" : `1px solid ${cfg.border}`,
                          overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                          cursor: (["Draft", "Scheduled"].includes(p.status) && !p.isExternal) ? "grab" : "pointer",
                        }}
                      >
                        {p.channels.map((ch) => <span key={ch}>{CHANNEL_ICON[ch]}</span>)}
                        {t && <span>{fmtTime(t)}</span>}
                      </div>
                    );
                  })}
                  {dayPosts.length > 3 && (
                    <div style={{ fontSize: 8, color: "var(--fc-text-muted)", fontWeight: 500, padding: "1px 5px" }}>+{dayPosts.length - 3} más</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected day detail */}
          {selectedDay && postsByDate[selectedDay] && (
            <div style={{ padding: "12px 16px", border: "1px solid var(--hairline)", background: "var(--fc-accent-wash)" }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--fc-text)", marginBottom: 10 }}>
                Publicaciones del {fmtDate(new Date(selectedDay + "T12:00:00"))}
              </h4>
              {postsByDate[selectedDay].map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          )}
          {selectedDay && !postsByDate[selectedDay] && (
            <div style={{ padding: "20px 16px", border: "1px solid var(--hairline)", textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "var(--fc-text-muted)" }}>Sin publicaciones para este día</p>
            </div>
          )}
        </div>
      )}

      {/* ── LIST VIEW ─────────────────────────────────────── */}
      {!loading && view === "list" && (
        <div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon style={{ width: 32, height: 32, color: "var(--fc-accent)" }} />}
              title="RADAR DESPEJADO"
              description="No hay transmisiones programadas ni en historial."
              actionLabel="IR AL REDACTOR"
              onAction={() => window.scrollTo(0, 0)}
            />
          ) : (
            (() => {
              // Group by date
              const groups: Record<string, Post[]> = {};
              filtered.forEach((p) => {
                const d = p.scheduledAt || p.createdAt;
                const key = d ? toDateKey(new Date(d)) : "sin-fecha";
                if (!groups[key]) groups[key] = [];
                groups[key].push(p);
              });

              const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

              return sortedKeys.map((key) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fc-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, paddingLeft: 4 }}>
                    {key === "sin-fecha" ? "Sin fecha" : fmtDate(new Date(key + "T12:00:00"))}
                  </div>
                  {groups[key].map((p) => <PostCard key={p.id} post={p} />)}
                </div>
              ));
            })()
          )}
        </div>
      )}

      {/* ── BOOST MODAL ── */}
      {boostTarget && (
        <BoostModal
          post={boostTarget}
          onClose={closeBoostModal}
          onSuccess={handleBoostSuccess}
        />
      )}

      {/* ── DETAIL SHEET ── */}
      <Sheet isOpen={!!detailPost} onClose={() => setDetailPost(null)} title="Detalle de la publicación" position="right">
        {detailPost && (() => {
          const post = detailPost;
          const d = post.scheduledAt ? new Date(post.scheduledAt) : post.publishedAt ? new Date(post.publishedAt) : null;
          const media = post.mediaUrls?.[0] || post.mediaUrl;
          const isEditable = ["Draft", "Scheduled"].includes(post.status) && !post.isExternal;
          const rows: [string, string][] = [
            ["Canal", post.channels.join(", ") || "—"],
            ["Destino", post.pageName || "—"],
            ["Formato", post.type],
            ["Fecha", d ? `${fmtDate(d)} · ${fmtTime(d)}` : "Sin fecha"],
            ["Caracteres", String(post.content.length)],
          ];
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 320 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {post.channels.map((ch) => <span key={ch}>{CHANNEL_ICON[ch]}</span>)}
                </div>
                <StatusBadge status={post.status} />
              </div>

              {media && (
                <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: 10, overflow: "hidden", background: "var(--fc-bg)" }}>
                  <img src={media} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}

              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--fc-text)", whiteSpace: "pre-wrap" }}>{post.content}</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid var(--hairline)", paddingTop: 10 }}>
                {rows.map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11.5 }}>
                    <span style={{ color: "var(--fc-text-muted)" }}>{label}</span>
                    <span style={{ color: "var(--fc-text)", fontWeight: 600, textAlign: "right" }}>{value}</span>
                  </div>
                ))}
              </div>

              {post.error && <Tag variant="danger">{post.error}</Tag>}

              {isEditable && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--hairline)", paddingTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="datetime-local"
                      value={rescheduleDraft}
                      onChange={(e) => setRescheduleDraft(e.target.value)}
                      style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--hairline)", background: "var(--fc-bg)", color: "var(--fc-text)", fontSize: 12, colorScheme: "dark" }}
                    />
                    <button
                      onClick={() => rescheduleDraft && reschedulePost(post, new Date(rescheduleDraft).toISOString())}
                      disabled={!rescheduleDraft || actionLoading === post.id}
                      style={{ padding: "7px 12px", borderRadius: 8, background: "var(--fc-accent)", color: "var(--fc-bg)", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      Reprogramar
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    setDetailPost(null);
                    onOpenInComposer?.(post.id);
                  }}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 14px", borderRadius: 10, background: "var(--fc-accent)", color: "var(--fc-bg)", border: "none", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
                >
                  <ArrowUpRight size={14} /> Abrir en Redactor
                </button>
                <button
                  onClick={() => duplicatePost(post)}
                  disabled={actionLoading === post.id}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, background: "transparent", color: "var(--fc-text)", border: "1px solid var(--hairline)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                >
                  <Copy size={14} /> Duplicar
                </button>
              </div>
            </div>
          );
        })()}
      </Sheet>
    </div>
  );
}
