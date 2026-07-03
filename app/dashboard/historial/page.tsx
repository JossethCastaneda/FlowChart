"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, XCircle, Clock, RefreshCw, Filter, Search,
  Globe, Play, Image, AlignLeft, ChevronDown,
  ExternalLink, Zap, Calendar, GitBranch, Activity,
} from "lucide-react";

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
      color: "var(--emerald)", bg: "rgba(52,183,124,0.1)", border: "rgba(52,183,124,0.3)",
      icon: <CheckCircle2 size={11} />, label: "Publicado",
    },
    Failed: {
      color: "var(--red)", bg: "rgba(229,72,77,0.1)", border: "rgba(229,72,77,0.3)",
      icon: <XCircle size={11} />, label: "Error",
    },
    Scheduled: {
      color: "var(--purple)", bg: "rgba(139,141,242,0.1)", border: "rgba(139,141,242,0.3)",
      icon: <Calendar size={11} />, label: "Programado",
    },
    Processing: {
      color: "var(--amber)", bg: "rgba(224,168,60,0.1)", border: "rgba(224,168,60,0.3)",
      icon: <RefreshCw size={11} className="animate-spin" />, label: "Procesando",
    },
    Draft: {
      color: "var(--text-muted)", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.3)",
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
            background: "rgba(0,129,251,0.15)", border: "1px solid rgba(0,129,251,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#0081FB"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          </span>
        );
        if (ch === "instagram") return (
          <span key="ig" title="Instagram" style={{
            width: 22, height: 22, borderRadius: 2,
            background: "rgba(228,64,95,0.12)", border: "1px solid rgba(228,64,95,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#E4405F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </span>
        );
        return (
          <span key={ch} title={ch} style={{
            width: 22, height: 22, borderRadius: 2,
            background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Globe size={11} color="var(--text-secondary)" />
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
  if (hasMedia) return <Image size={12} color="var(--cyan)" />;
  return <AlignLeft size={12} color="var(--text-secondary)" />;
}

/* ─── Main Page ─── */
export default function DeploymentHistoryPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [channelFilter, setChannelFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchPosts = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/publisher/posts?limit=200");
      const data = await res.json();
      setPosts(data.posts || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  /* ─── Derived ─── */
  const filtered = posts.filter(p => {
    const matchSearch = !search ||
      p.content.toLowerCase().includes(search.toLowerCase()) ||
      (p.pageName || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    const matchChannel = channelFilter === "All" || p.channels.includes(channelFilter);
    return matchSearch && matchStatus && matchChannel;
  });

  const stats = {
    total: posts.length,
    published: posts.filter(p => p.status === "Published").length,
    failed: posts.filter(p => p.status === "Failed").length,
    scheduled: posts.filter(p => p.status === "Scheduled").length,
    drafts: posts.filter(p => p.status === "Draft").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "100%" }}>

      {/* ── TOP BAR ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", borderBottom: "1px solid rgba(59,130,246,0.1)",
        background: "rgba(5,8,18,0.6)", backdropFilter: "blur(20px)",
        gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(224,168,60,0.1)", border: "1px solid rgba(224,168,60,0.3)",
          }}>
            <Activity size={16} color="var(--amber)" />
          </div>
          <div>
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700,
              letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--foreground)", margin: 0,
            }}>Historial de Publicaciones</h1>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, marginTop: 2 }}>
              {stats.total} publicaciones — {stats.published} exitosas
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search size={12} color="var(--text-muted)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Buscar publicación..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                paddingLeft: 28, paddingRight: 12, paddingTop: 6, paddingBottom: 6,
                fontSize: 11, color: "var(--text-secondary)", width: 200,
                background: "rgba(8,12,24,0.6)", border: "1px solid rgba(148,163,184,0.16)",
                borderRadius: 3,
              }}
            />
          </div>

          {/* Status filter */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Filter size={11} color="var(--text-muted)" style={{ position: "absolute", left: 9, pointerEvents: "none" }} />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                paddingLeft: 26, paddingRight: 22, paddingTop: 6, paddingBottom: 6,
                fontSize: 11, color: "var(--text-secondary)", cursor: "pointer",
                background: "rgba(8,12,24,0.6)", border: "1px solid rgba(148,163,184,0.16)",
                borderRadius: 3, appearance: "none",
              }}
            >
              {["All", "Published", "Failed", "Scheduled", "Processing", "Draft"].map(s => (
                <option key={s} value={s}>{s === "All" ? "All Status" : s}</option>
              ))}
            </select>
            <ChevronDown size={10} color="var(--text-muted)" style={{ position: "absolute", right: 7, pointerEvents: "none" }} />
          </div>

          {/* Channel filter */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Globe size={11} color="var(--text-muted)" style={{ position: "absolute", left: 9, pointerEvents: "none" }} />
            <select
              value={channelFilter}
              onChange={e => setChannelFilter(e.target.value)}
              style={{
                paddingLeft: 26, paddingRight: 22, paddingTop: 6, paddingBottom: 6,
                fontSize: 11, color: "var(--text-secondary)", cursor: "pointer",
                background: "rgba(8,12,24,0.6)", border: "1px solid rgba(148,163,184,0.16)",
                borderRadius: 3, appearance: "none",
              }}
            >
              {["All", "facebook", "instagram"].map(c => (
                <option key={c} value={c}>{c === "All" ? "All Channels" : c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
            <ChevronDown size={10} color="var(--text-muted)" style={{ position: "absolute", right: 7, pointerEvents: "none" }} />
          </div>

          {/* Status count pills */}
          <div style={{
            display: "flex", alignItems: "center", gap: 0,
            background: "rgba(8,12,24,0.6)", border: "1px solid rgba(148,163,184,0.16)",
            borderRadius: 3, overflow: "hidden", padding: "4px 10px",
            fontSize: 11, color: "var(--text-secondary)", fontWeight: 600,
          }}>
            <span style={{ color: "var(--emerald)", marginRight: 2 }}>●</span> {stats.published}&nbsp;
            <span style={{ color: "var(--red)", marginLeft: 6, marginRight: 2 }}>●</span> {stats.failed}
            <span style={{ fontSize: 10, color: "var(--text-secondary)", marginLeft: 6 }}>{stats.total}</span>
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchPosts(true)}
            style={{
              width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(8,12,24,0.6)", border: "1px solid rgba(148,163,184,0.16)",
              borderRadius: 3, cursor: "pointer",
            }}
          >
            <RefreshCw size={12} color="var(--text-muted)" style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          </button>
        </div>
      </div>

      {/* ── TABLE HEADER ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 90px 100px 130px 120px 110px 100px",
        gap: 0,
        padding: "8px 20px",
        borderBottom: "1px solid rgba(59,130,246,0.08)",
        background: "rgba(59,130,246,0.02)",
      }}>
        {["Contenido", "Canales", "Formato", "Estado", "Página", "Publicado", "ID"].map(h => (
          <span key={h} style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.18em",
            textTransform: "uppercase", color: "var(--text-secondary)",
          }}>{h}</span>
        ))}
      </div>

      {/* ── TABLE BODY ── */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{
                height: 48, background: "rgba(148,163,184,0.05)", borderRadius: 2,
                marginBottom: 1, animation: "pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.1}s`,
              }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Zap size={32} color="rgba(148,163,184,0.3)" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}>
              SIN PUBLICACIONES
            </p>
            <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>Crea tu primer post desde el Publisher</p>
          </div>
        ) : (
          filtered.map((post, i) => (
            <div key={post.id}>
              <div
                onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 90px 100px 130px 120px 110px 100px",
                  gap: 0,
                  padding: "12px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
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
                    fontSize: 12, color: "var(--foreground)", fontWeight: 500,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {post.content.slice(0, 80)}{post.content.length > 80 ? "…" : ""}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
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
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
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
                    fontSize: 11, color: "var(--text-secondary)", fontFamily: "monospace",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {post.pageName || "—"}
                  </span>
                </div>

                {/* Published At */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {post.publishedAt ? relTime(post.publishedAt) + " ago" : "—"}
                  </span>
                </div>

                {/* ID */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <GitBranch size={10} color="var(--text-secondary)" />
                  <span style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "monospace" }}>
                    {post.id.slice(0, 8)}
                  </span>
                </div>
              </div>

              {/* Expanded row */}
              {expandedId === post.id && (
                <div style={{
                  padding: "12px 20px 16px 22px",
                  borderBottom: "1px solid rgba(59,130,246,0.08)",
                  background: "rgba(0,0,0,0.25)",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 16,
                }}>
                  {/* Content full */}
                  <div>
                    <p style={{ fontSize: 9, color: "var(--text-secondary)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>CONTENIDO</p>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{post.content}</p>
                  </div>

                  {/* Meta */}
                  <div>
                    <p style={{ fontSize: 9, color: "var(--text-secondary)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>DETALLES</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {[
                        { label: "ID", value: post.id },
                        { label: "Creado", value: fmtDate(post.createdAt) },
                        { label: "Programado", value: fmtDate(post.scheduledAt) },
                        { label: "Publicado", value: fmtDate(post.publishedAt) },
                        { label: "Página ID", value: post.pageId || "—" },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ display: "flex", gap: 8 }}>
                          <span style={{ fontSize: 10, color: "var(--text-secondary)", width: 80, flexShrink: 0 }}>{label}</span>
                          <span style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "monospace", wordBreak: "break-all" }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* External IDs / Error */}
                  <div>
                    {post.error ? (
                      <>
                        <p style={{ fontSize: 9, color: "var(--red)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>ERROR</p>
                        <p style={{ fontSize: 11, color: "var(--red)", lineHeight: 1.5, background: "rgba(229,72,77,0.08)", padding: "8px 10px", borderRadius: 3, border: "1px solid rgba(229,72,77,0.2)" }}>
                          {post.error}
                        </p>
                      </>
                    ) : post.externalIds && Object.keys(post.externalIds).length > 0 ? (
                      <>
                        <p style={{ fontSize: 9, color: "var(--emerald)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>IDs EXTERNOS</p>
                        {Object.entries(post.externalIds).map(([platform, id]) => (
                          <div key={platform} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                            <span style={{ fontSize: 10, color: "var(--text-muted)", width: 70, flexShrink: 0, textTransform: "capitalize" }}>{platform}</span>
                            <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--cyan)" }}>{id}</span>
                            <ExternalLink size={10} color="var(--cyan)" style={{ cursor: "pointer" }} />
                          </div>
                        ))}
                      </>
                    ) : (
                      <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>Sin IDs externos</p>
                    )}

                    {/* Media preview */}
                    {post.mediaUrls && post.mediaUrls.length > 0 && (
                      <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {post.mediaUrls.slice(0, 4).map((url, i) => (
                          <div key={i} style={{
                            width: 48, height: 48, borderRadius: 3, overflow: "hidden",
                            border: "1px solid rgba(148,163,184,0.16)", background: "#000",
                          }}>
                            <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                        ))}
                        {post.mediaUrls.length > 4 && (
                          <div style={{
                            width: 48, height: 48, borderRadius: 3,
                            background: "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.16)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, color: "var(--text-muted)",
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
        background: "rgba(5,8,18,0.6)", backdropFilter: "blur(10px)",
        flexShrink: 0,
      }}>
        {[
          { label: "Total", value: stats.total, color: "var(--foreground)" },
          { label: "Publicados", value: stats.published, color: "var(--emerald)" },
          { label: "Fallidos", value: stats.failed, color: "var(--red)" },
          { label: "Programados", value: stats.scheduled, color: "var(--purple)" },
          { label: "Borradores", value: stats.drafts, color: "var(--text-muted)" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
            <span style={{
              fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color,
            }}>{value}</span>
          </div>
        ))}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--emerald)", boxShadow: "0 0 8px var(--emerald)" }} />
          <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
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
