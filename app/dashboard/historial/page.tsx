/* eslint-disable jsx-a11y/alt-text, @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback } from "react";
import {
    CheckCircle2, XCircle, Clock, RefreshCw, Filter, Search,
  Globe, Play, Image, AlignLeft, ChevronDown,
    ExternalLink, Zap, Calendar, Activity, FileDown,
} from "lucide-react";
import { PublisherSubnav } from "@/components/publisher/PublisherTabs";

/* ─── Types ─── */
interface Post {
  id: string;
  content: string;
  channels: string[];
  mediaUrls?: string[];
  scheduledAt?: string | null;
  publishedAt?: string | null;
  status: "Draft" | "Scheduled" | "Published" | "Failed" | "Processing";
  type?: string;
  pageName?: string;
  pageId?: string;
  error?: string | null;
  externalIds?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

interface PostInsights {
  reach: number | null;
  interactions: number | null;
  engagementPct: number | null;
}

/* ─── Helpers ─── */
function relTime(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

function fmtDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

/* ─── Status Badge ─── */
function StatusBadge({ status, error }: { status: Post["status"]; error?: string | null }) {
  const cfg: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
    Published: {
      color: "var(--fc-success)", bg: "rgba(52,183,124,0.1)", border: "rgba(52,183,124,0.3)",
      icon: <CheckCircle2 size={11} />, label: "Publicado",
    },
    Failed: {
      color: "var(--fc-danger)", bg: "rgba(229,72,77,0.1)", border: "rgba(229,72,77,0.3)",
      icon: <XCircle size={11} />, label: "Error",
    },
    Scheduled: {
      color: "var(--fc-module-aria)", bg: "rgba(139,141,242,0.1)", border: "rgba(139,141,242,0.3)",
      icon: <Calendar size={11} />, label: "Programado",
    },
    Processing: {
      color: "var(--fc-warning)", bg: "rgba(224,168,60,0.1)", border: "rgba(224,168,60,0.3)",
      icon: <RefreshCw size={11} className="animate-spin" />, label: "Procesando",
    },
    Draft: {
      color: "var(--fc-text-muted)", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.3)",
      icon: <AlignLeft size={11} />, label: "Borrador",
    },
  };
  const c = cfg[status] || cfg.Draft;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
      padding: "3px 10px", borderRadius: 2,
      color: c.color, background: c.bg, border: `1px solid ${c.border}`,
      whiteSpace: "nowrap",
    }}>
      {c.icon} {c.label}
    </span>
  );
}

/* ─── Channel Icons ─── */
function ChannelIcons({ channels }: { channels: string[] }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {channels.map(ch => {
        if (ch === "facebook") return (
          <span key="fb" title="Facebook" style={{
            width: 22, height: 22, borderRadius: 2,
            background: "var(--fc-surface)", border: "1px solid rgba(0,129,251,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#0081FB"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          </span>
        );
        if (ch === "instagram") return (
          <span key="ig" title="Instagram" style={{
            width: 22, height: 22, borderRadius: 2,
            background: "var(--fc-surface)", border: "1px solid rgba(228,64,95,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#E4405F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </span>
        );
        return (
          <span key={ch} title={ch} style={{
            width: 22, height: 22, borderRadius: 2,
            background: "var(--fc-border-subtle)", border: "1px solid var(--fc-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Globe size={11} color="var(--fc-text-secondary)" />
          </span>
        );
      })}
    </div>
  );
}

/* ─── Format Icon ─── */
function FormatIcon({ post }: { post: Post }) {
  const hasMedia = post.mediaUrls && post.mediaUrls.length > 0;
  const hasVideo = post.type === "video";
  if (hasVideo) return <Play size={12} color="#9b7be8" />;
  if (hasMedia) return <Image size={12} color="var(--fc-accent)" />;
  return <AlignLeft size={12} color="var(--fc-text-secondary)" />;
}

/* ─── Main Page ─── */
export default function DeploymentHistoryPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [channelFilter, setChannelFilter] = useState("All");
  const [formatFilter, setFormatFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Métricas reales (Alcance/Interacciones/Engagement) visibles en cada fila,
  // como en el diseño. Se piden en UN solo lote tras cargar las publicaciones:
  // el endpoint resuelve la caché de una sola vez, reutiliza el token por
  // plataforma y acota la concurrencia contra la Graph API.
  const [insights, setInsights] = useState<Record<string, PostInsights | null>>({});
  const [insightsUnavailable, setInsightsUnavailable] = useState<Record<string, string>>({});
  const [insightsLoadingAll, setInsightsLoadingAll] = useState(false);

  const loadInsightsBatch = useCallback(async (postIds: string[]) => {
    if (postIds.length === 0) return;
    setInsightsLoadingAll(true);
    try {
      const res = await fetch("/api/publisher/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds: postIds.slice(0, 200) }),
      });
      const payload = await res.json();
      const results: Record<string, { available: boolean; insights?: PostInsights; reason?: string }> =
        payload.data?.results || {};
      const ok: Record<string, PostInsights | null> = {};
      const bad: Record<string, string> = {};
      for (const [id, r] of Object.entries(results)) {
        if (r.available && r.insights) ok[id] = r.insights;
        else bad[id] = r.reason || "No disponible.";
      }
      setInsights((prev) => ({ ...prev, ...ok }));
      setInsightsUnavailable((prev) => ({ ...prev, ...bad }));
    } catch {
      /* la tabla sigue siendo utilizable sin métricas */
    } finally {
      setInsightsLoadingAll(false);
    }
  }, []);

  function toggleExpand(postId: string) {
    setExpandedId(expandedId === postId ? null : postId);
  }

  // Engagement promedio sobre las publicaciones que sí devolvieron métricas.
  const reviewedEngagements = Object.values(insights)
    .filter((i): i is PostInsights => !!i && i.engagementPct !== null)
    .map((i) => i.engagementPct as number);
  const avgEngagement = reviewedEngagements.length
    ? reviewedEngagements.reduce((a, b) => a + b, 0) / reviewedEngagements.length
    : null;

  const fetchPosts = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/publisher/posts?limit=200");
      const data = await res.json();
      // La API responde { success, data: { posts, approvalCounts } } — este fetch
      // leía data.posts (siempre undefined) en vez de data.data.posts, así que la
      // tabla nunca mostraba nada real.
      const loaded: Post[] = data.data?.posts || [];
      setPosts(loaded);
      // Solo tiene sentido pedir métricas de lo ya publicado.
      void loadInsightsBatch(loaded.filter((p) => p.status === "Published").map((p) => p.id));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadInsightsBatch]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchPosts(); }, [fetchPosts]);

  /* ─── Derived ─── */
  const filtered = posts.filter(p => {
    const matchSearch = !search ||
      p.content.toLowerCase().includes(search.toLowerCase()) ||
      (p.pageName || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    const matchChannel = channelFilter === "All" || p.channels.includes(channelFilter);
    const matchFormat = formatFilter === "All" || (p.type || "post") === formatFilter;
    return matchSearch && matchStatus && matchChannel && matchFormat;
  });

  function exportCsv() {
    const headers = [
      "id", "contenido", "canales", "formato", "estado", "pagina",
      "programado", "publicado", "alcance", "interacciones", "engagement_pct",
    ];
    const rows = filtered.map((p) => {
      const m = insights[p.id];
      return [
        p.id,
        p.content.replace(/\r?\n/g, " ").replace(/"/g, '""'),
        p.channels.join("|"),
        p.type || "post",
        p.status,
        p.pageName || "",
        p.scheduledAt || "",
        p.publishedAt || "",
        // Vacío (no cero) cuando no hay dato: un 0 en la hoja de cálculo se
        // leería como "alcance cero", que es una afirmación distinta.
        m?.reach ?? "",
        m?.interactions ?? "",
        m?.engagementPct != null ? m.engagementPct.toFixed(2) : "",
      ];
    });
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell)}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "historial-publicacion.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const stats = {
    total: posts.length,
    published: posts.filter(p => p.status === "Published").length,
    failed: posts.filter(p => p.status === "Failed").length,
    scheduled: posts.filter(p => p.status === "Scheduled").length,
    drafts: posts.filter(p => p.status === "Draft").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "100%" }}>

      {/* Subnav del módulo: Historial es ruta propia, pero en el diseño es una
          pestaña más de Publicación, así que la barra no debe desaparecer. */}
      <PublisherSubnav />

      {/* ── TOP BAR ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        padding: "14px 20px", borderBottom: "1px solid rgba(59,130,246,0.1)",
        background: "var(--fc-surface)", 
        gap: 16,
      }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search size={12} color="var(--fc-text-muted)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Buscar publicación..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                paddingLeft: 28, paddingRight: 12, paddingTop: 6, paddingBottom: 6,
                fontSize: 11, color: "var(--fc-text-secondary)", width: 200,
                background: "var(--fc-surface)", border: "1px solid var(--fc-border)",
                borderRadius: 3,
              }}
            />
          </div>

          {/* Status filter */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Filter size={11} color="var(--fc-text-muted)" style={{ position: "absolute", left: 9, pointerEvents: "none" }} />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                paddingLeft: 26, paddingRight: 22, paddingTop: 6, paddingBottom: 6,
                fontSize: 11, color: "var(--fc-text-secondary)", cursor: "pointer",
                background: "var(--fc-surface)", border: "1px solid var(--fc-border)",
                borderRadius: 3, appearance: "none",
              }}
            >
              {["All", "Published", "Failed", "Scheduled", "Processing", "Draft"].map(s => (
                <option key={s} value={s}>{s === "All" ? "All Status" : s}</option>
              ))}
            </select>
            <ChevronDown size={10} color="var(--fc-text-muted)" style={{ position: "absolute", right: 7, pointerEvents: "none" }} />
          </div>

          {/* Channel filter */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Globe size={11} color="var(--fc-text-muted)" style={{ position: "absolute", left: 9, pointerEvents: "none" }} />
            <select
              value={channelFilter}
              onChange={e => setChannelFilter(e.target.value)}
              style={{
                paddingLeft: 26, paddingRight: 22, paddingTop: 6, paddingBottom: 6,
                fontSize: 11, color: "var(--fc-text-secondary)", cursor: "pointer",
                background: "var(--fc-surface)", border: "1px solid var(--fc-border)",
                borderRadius: 3, appearance: "none",
              }}
            >
              {["All", "facebook", "instagram"].map(c => (
                <option key={c} value={c}>{c === "All" ? "All Channels" : c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
            <ChevronDown size={10} color="var(--fc-text-muted)" style={{ position: "absolute", right: 7, pointerEvents: "none" }} />
          </div>

          {/* Format filter */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <AlignLeft size={11} color="var(--fc-text-muted)" style={{ position: "absolute", left: 9, pointerEvents: "none" }} />
            <select
              value={formatFilter}
              onChange={e => setFormatFilter(e.target.value)}
              style={{
                paddingLeft: 26, paddingRight: 22, paddingTop: 6, paddingBottom: 6,
                fontSize: 11, color: "var(--fc-text-secondary)", cursor: "pointer",
                background: "var(--fc-surface)", border: "1px solid var(--fc-border)",
                borderRadius: 3, appearance: "none",
              }}
            >
              {["All", "post", "reel", "story", "carousel"].map(f => (
                <option key={f} value={f}>{f === "All" ? "All Formats" : f.charAt(0).toUpperCase() + f.slice(1)}</option>
              ))}
            </select>
            <ChevronDown size={10} color="var(--fc-text-muted)" style={{ position: "absolute", right: 7, pointerEvents: "none" }} />
          </div>

          {/* Export CSV */}
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            title="Exportar CSV"
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
              fontSize: 11, fontWeight: 600, color: "var(--fc-text-secondary)",
              background: "var(--fc-surface)", border: "1px solid var(--fc-border)",
              borderRadius: 3, cursor: filtered.length === 0 ? "not-allowed" : "pointer",
              opacity: filtered.length === 0 ? 0.5 : 1,
            }}
          >
            <FileDown size={12} /> Exportar CSV
          </button>

          {/* Engagement promedio — solo de las publicaciones cuya fila ya se
              expandió (fetch perezoso); nunca fuerza consultar todas de golpe. */}
          {avgEngagement !== null && (
            <div
              title={`Promedio de ${reviewedEngagements.length} publicación${reviewedEngagements.length === 1 ? "" : "es"} revisada${reviewedEngagements.length === 1 ? "" : "s"}`}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
                background: "var(--fc-surface)", border: "1px solid var(--fc-border)",
                borderRadius: 3, fontSize: 11, fontWeight: 600, color: "var(--fc-success)",
              }}
            >
              <Activity size={11} /> Engagement {avgEngagement.toFixed(1)}%
            </div>
          )}

          {/* Status count pills */}
          <div style={{
            display: "flex", alignItems: "center", gap: 0,
            background: "var(--fc-surface)", border: "1px solid var(--fc-border)",
            borderRadius: 3, overflow: "hidden", padding: "4px 10px",
            fontSize: 11, color: "var(--fc-text-secondary)", fontWeight: 600,
          }}>
            <span style={{ color: "var(--fc-success)", marginRight: 2 }}>●</span> {stats.published}&nbsp;
            <span style={{ color: "var(--fc-danger)", marginLeft: 6, marginRight: 2 }}>●</span> {stats.failed}
            <span style={{ fontSize: 10, color: "var(--fc-text-secondary)", marginLeft: 6 }}>{stats.total}</span>
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchPosts(true)}
            style={{
              width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--fc-surface)", border: "1px solid var(--fc-border)",
              borderRadius: 3, cursor: "pointer",
            }}
          >
            <RefreshCw size={12} color="var(--fc-text-muted)" style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          </button>
      </div>

      {/* ── TABLE HEADER ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 82px 90px 118px 96px 88px 88px 96px 92px",
        gap: 0,
        padding: "8px 20px",
        borderBottom: "1px solid rgba(59,130,246,0.08)",
        background: "rgba(0, 212, 255, 0.1)",
      }}>
        {["Contenido", "Canales", "Formato", "Estado", "Página", "Alcance", "Interac.", "Engagement", "Publicado"].map(h => (
          <span key={h} style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.18em",
            textTransform: "uppercase", color: "var(--fc-text-secondary)",
          }}>{h}</span>
        ))}
      </div>

      {/* ── TABLE BODY ── */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{
                height: 48, background: "var(--fc-border-subtle)", borderRadius: 2,
                marginBottom: 1, animation: "pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.1}s`,
              }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Zap size={32} color="rgba(148,163,184,0.3)" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 13, color: "var(--fc-text-secondary)", fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}>
              SIN PUBLICACIONES
            </p>
            <p style={{ fontSize: 11, color: "var(--fc-text-secondary)", marginTop: 4 }}>Crea tu primer post desde el Publisher</p>
          </div>
        ) : (
          filtered.map((post, i) => (
            <div key={post.id}>
              <div
                onClick={() => toggleExpand(post.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 82px 90px 118px 96px 88px 88px 96px 92px",
                  gap: 0,
                  padding: "12px 20px",
                  border: "1px solid var(--fc-border-subtle)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  background: expandedId === post.id
                    ? "rgba(59,130,246,0.04)"
                    : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  borderLeft: `2px solid ${
                    post.status === "Published" ? "rgba(52,183,124,0.4)" :
                    post.status === "Failed" ? "rgba(229,72,77,0.4)" :
                    post.status === "Scheduled" ? "rgba(139,141,242,0.4)" :
                    post.status === "Processing" ? "rgba(224,168,60,0.4)" :
                    "transparent"
                  }`,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.04)"; }}
                onMouseLeave={e => {
                  if (expandedId !== post.id) {
                    (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)";
                  }
                }}
              >
                {/* Content */}
                <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                  <span style={{
                    fontSize: 12, color: "var(--fc-text)", fontWeight: 500,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {post.content.slice(0, 80)}{post.content.length > 80 ? "…" : ""}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--fc-text-secondary)" }}>
                    {fmtDate(post.scheduledAt || post.createdAt)}
                  </span>
                </div>

                {/* Channels */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <ChannelIcons channels={post.channels} />
                </div>

                {/* Format */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <FormatIcon post={post} />
                  <span style={{ fontSize: 10, color: "var(--fc-text-muted)" }}>
                    {post.type === "video" ? "Video" : (post.mediaUrls?.length ? "Imagen" : "Texto")}
                  </span>
                </div>

                {/* Status */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <StatusBadge status={post.status} error={post.error} />
                </div>

                {/* Page */}
                <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
                  <span style={{
                    fontSize: 11, color: "var(--fc-text-secondary)", fontFamily: "var(--font-mono)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {post.pageName || "—"}
                  </span>
                </div>

                {/* Métricas reales (Alcance / Interacciones / Engagement) */}
                {(() => {
                  const m = insights[post.id];
                  const pending = insightsLoadingAll && !m && !insightsUnavailable[post.id];
                  const cell = (value: React.ReactNode, color?: string) => (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)",
                        color: color || "var(--fc-text-secondary)",
                      }}>
                        {value}
                      </span>
                    </div>
                  );
                  const dash = pending
                    ? <span style={{ color: "var(--fc-text-muted)", opacity: 0.5 }}>···</span>
                    : "—";
                  if (!m) {
                    return (
                      <>
                        {cell(dash)}
                        {cell(dash)}
                        {cell(dash)}
                      </>
                    );
                  }
                  const pct = m.engagementPct;
                  const pctColor = pct === null ? undefined
                    : pct >= 3.6 ? "var(--fc-success)"
                    : pct >= 2.5 ? "var(--fc-text)"
                    : "var(--fc-warning)";
                  return (
                    <>
                      {cell(m.reach === null ? "—" : m.reach.toLocaleString())}
                      {cell(m.interactions === null ? "—" : m.interactions.toLocaleString())}
                      {cell(pct === null ? "—" : `${pct.toFixed(1)}%`, pctColor)}
                    </>
                  );
                })()}

                {/* Published At */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--fc-text-muted)" }}>
                    {post.publishedAt ? relTime(post.publishedAt) + " ago" : "—"}
                  </span>
                </div>

              </div>

              {/* Expanded row */}
              {expandedId === post.id && (
                <div style={{
                  padding: "12px 20px 16px 22px",
                  borderBottom: "1px solid rgba(59,130,246,0.08)",
                  background: "var(--fc-surface-hover)",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: 16,
                }}>
                  {/* Content full */}
                  <div>
                    <p style={{ fontSize: 9, color: "var(--fc-text-secondary)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>CONTENIDO</p>
                    <p style={{ fontSize: 12, color: "var(--fc-text-secondary)", lineHeight: 1.6 }}>{post.content}</p>
                  </div>

                  {/* Métricas: los valores viven en la fila; aquí solo se
                      explica POR QUÉ faltan cuando no se pudieron obtener. */}
                  <div>
                    <p style={{ fontSize: 9, color: "var(--fc-text-secondary)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>MÉTRICAS</p>
                    {insights[post.id] ? (
                      <p style={{ fontSize: 10.5, color: "var(--fc-text-muted)", lineHeight: 1.5 }}>
                        Alcance, interacciones y engagement se muestran en la fila.
                      </p>
                    ) : insightsLoadingAll ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fc-text-muted)" }}>
                        <RefreshCw size={11} className="animate-spin" /> Consultando Meta…
                      </div>
                    ) : (
                      <p style={{ fontSize: 10.5, color: "var(--fc-text-muted)", lineHeight: 1.5 }}>
                        {insightsUnavailable[post.id] || "Métricas no disponibles."}
                      </p>
                    )}
                  </div>

                  {/* Meta */}
                  <div>
                    <p style={{ fontSize: 9, color: "var(--fc-text-secondary)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>DETALLES</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {[
                        { label: "ID", value: post.id },
                        { label: "Creado", value: fmtDate(post.createdAt) },
                        { label: "Programado", value: fmtDate(post.scheduledAt) },
                        { label: "Publicado", value: fmtDate(post.publishedAt) },
                        { label: "Página ID", value: post.pageId || "—" },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ display: "flex", gap: 8 }}>
                          <span style={{ fontSize: 10, color: "var(--fc-text-secondary)", width: 80, flexShrink: 0 }}>{label}</span>
                          <span style={{ fontSize: 10, color: "var(--fc-text-secondary)", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* External IDs / Error */}
                  <div>
                    {post.error ? (
                      <>
                        <p style={{ fontSize: 9, color: "var(--fc-danger)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>ERROR</p>
                        <p style={{ fontSize: 11, color: "var(--fc-danger)", lineHeight: 1.5, background: "var(--fc-danger-wash)", padding: "8px 10px", borderRadius: 3, border: "1px solid rgba(229,72,77,0.2)" }}>
                          {post.error}
                        </p>
                      </>
                    ) : post.externalIds && Object.keys(post.externalIds).length > 0 ? (
                      <>
                        <p style={{ fontSize: 9, color: "var(--fc-success)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>IDs EXTERNOS</p>
                        {Object.entries(post.externalIds).map(([platform, id]) => (
                          <div key={platform} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                            <span style={{ fontSize: 10, color: "var(--fc-text-muted)", width: 70, flexShrink: 0, textTransform: "capitalize" }}>{platform}</span>
                            <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--fc-accent)" }}>{id}</span>
                            <ExternalLink size={10} color="var(--fc-accent)" style={{ cursor: "pointer" }} />
                          </div>
                        ))}
                      </>
                    ) : (
                      <p style={{ fontSize: 11, color: "var(--fc-text-secondary)" }}>Sin IDs externos</p>
                    )}

                    {/* Media preview */}
                    {post.mediaUrls && post.mediaUrls.length > 0 && (
                      <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {post.mediaUrls.slice(0, 4).map((url, i) => (
                          <div key={i} style={{
                            width: 48, height: 48, borderRadius: 3, overflow: "hidden",
                            border: "1px solid var(--fc-border)", background: "var(--fc-bg)",
                          }}>
                                                        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                        ))}
                        {post.mediaUrls.length > 4 && (
                          <div style={{
                            width: 48, height: 48, borderRadius: 3,
                            background: "var(--fc-border-subtle)", border: "1px solid var(--fc-border)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, color: "var(--fc-text-muted)",
                          }}>
                            +{post.mediaUrls.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── FOOTER STATS ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 20, padding: "10px 20px",
        borderTop: "1px solid rgba(59,130,246,0.08)",
        background: "var(--fc-surface)", 
        flexShrink: 0,
      }}>
        {[
          { label: "Total", value: stats.total, color: "var(--fc-text)" },
          { label: "Publicados", value: stats.published, color: "var(--fc-success)" },
          { label: "Fallidos", value: stats.failed, color: "var(--fc-danger)" },
          { label: "Programados", value: stats.scheduled, color: "var(--fc-module-aria)" },
          { label: "Borradores", value: stats.drafts, color: "var(--fc-text-muted)" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "var(--fc-text-secondary)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
            <span style={{
              fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color,
            }}>{value}</span>
          </div>
        ))}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--fc-success)", boxShadow: "0 0 8px var(--fc-success)" }} />
          <span style={{ fontSize: 10, color: "var(--fc-text-secondary)" }}>
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
