import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Eye, Heart, Users, BarChart2, ArrowUpRight, ArrowDownRight, MessageCircle, Share2, Grid3X3, List, ChevronUp, ChevronDown, Camera, ThumbsUp, Clock, UserPlus, Activity, Info, Play, Bookmark, Film, Star, Loader2, Check } from "lucide-react";
import { seededRand, generateHeatmap, ChannelIcons, TABS, Tab, Kpi, EMPTY_KPI, AUDIENCE_DEVICE, DAYS, HOURS } from "./shared";

export function TabResumen({ kpis, posts }: { kpis: typeof EMPTY_KPI; posts: any[] }) {
    const topPosts = posts.slice(0, 3).map((p, i) => ({
            id: p.id,
            text: p.text,
            channel: p.channel,
            reach: p.reach,
            likes: p.likes,
            comments: p.comments,
            shares: p.shares,
            engagement: `${p.engagement}%`,
            date: p.date,
          }));
    const engRate = parseFloat(kpis[1].value) || 0;
    const engScore = Math.min(100, Math.round(engRate * 20));
    const postsPerWeek = posts.length / 4;
    const freqScore = Math.min(100, Math.round((postsPerWeek / 7) * 100));
    const responseScore = 75;
    const overall = Math.round((engScore + freqScore + responseScore) / 3);
    const scoreMsg = overall >= 80 ? "Señal de élite. La Fuerza está contigo."
            : overall >= 60 ? "Señal fuerte. Por encima del promedio galáctico."
            : overall >= 40 ? "Señal estable. Hay potencial sin explotar."
            : "Señal débil. El Imperio está ganando terreno.";
    const scoreColor = overall >= 80 ? "#06d6a0" : overall >= 60 ? "#00d4ff" : overall >= 40 ? "#f59e0b" : "#e2445c";
    return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ staggerChildren: 0.1, duration: 0.3 }}
      className="space-y-6"
    >
      {/* Social Performance Score */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="section-header">
          <span className="section-title">
            <Activity style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 8 }} />
            Rendimiento Social
          </span>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            {/* Score circle */}
            <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
              <svg width={80} height={80} viewBox="0 0 80 80">
                <circle cx={40} cy={40} r={34} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
                <circle cx={40} cy={40} r={34} fill="none" stroke={scoreColor} strokeWidth={6}
                  strokeDasharray={`${(overall / 100) * 213.6} 213.6`}
                  strokeLinecap="round" transform="rotate(-90 40 40)"
                  style={{ filter: `drop-shadow(0 0 6px ${scoreColor}60)`, transition: "all 0.8s ease" }}
                />
                <text x={40} y={36} textAnchor="middle" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, fontWeight: 900, fill: scoreColor }}>
                  {overall}
                </text>
                <text x={40} y={50} textAnchor="middle" style={{ fontSize: 8, fill: "#64748b", letterSpacing: "0.1em" }}>
                  / 100
                </text>
              </svg>
            </div>

            {/* Message + breakdown */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: scoreColor, margin: "0 0 8px" }}>{scoreMsg}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Engagement", value: engScore, color: "#f472b6" },
                  { label: "Frecuencia de Posts", value: freqScore, color: "#00d4ff" },
                  { label: "Respuesta", value: responseScore, color: "#7b61ff" },
                ].map((bar) => (
                  <div key={bar.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: "#94a3b8", width: 110, flexShrink: 0 }}>{bar.label}</span>
                    <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${bar.value}%`, height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${bar.color}, ${bar.color}60)`, transition: "width 0.8s ease", boxShadow: `0 0 6px ${bar.color}30` }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: bar.color, width: 30, textAlign: "right" }}>{bar.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Chart Placeholder */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="section-header">
          <span className="section-title">Alcance vs Engagement — Últimos 30 días</span>
        </div>
        <div
          style={{
            height: 320,
            background: "linear-gradient(180deg, rgba(244,114,182,0.04) 0%, rgba(0,212,255,0.02) 50%, transparent 100%)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: "40px 32px 32px",
            gap: 4,
            position: "relative",
          }}
        >
          {/* Y-axis labels */}
          <div
            style={{
              position: "absolute",
              left: 8,
              top: 40,
              bottom: 32,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {["50k", "40k", "30k", "20k", "10k", "0"].map((l) => (
              <span key={l} style={{ fontSize: 9, color: "rgba(148,163,184,0.65)", fontFamily: "'Orbitron', sans-serif" }}>
                {l}
              </span>
            ))}
          </div>

          {/* Bars simulating chart data */}
          {Array.from({ length: 30 }, (_, i) => {
            const pseudo = ((Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1; // deterministic 0-1
            const h = 20 + Math.sin(i * 0.3) * 30 + pseudo * 25 + (i > 20 ? 15 : 0);
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  minWidth: 4,
                  borderRadius: "3px 3px 0 0",
                  background: `linear-gradient(180deg, rgba(244,114,182,${0.4 + h / 200}) 0%, rgba(244,114,182,0.08) 100%)`,
                  transition: "height 0.5s ease",
                  position: "relative",
                }}
              >
                {/* Subtle glow on top */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "100%",
                    height: 2,
                    background: "#f472b6",
                    borderRadius: 2,
                    boxShadow: "0 0 6px rgba(244,114,182,0.5)",
                  }}
                />
              </div>
            );
          })}

          {/* Grid lines */}
          {[20, 40, 60, 80].map((pct) => (
            <div
              key={pct}
              style={{
                position: "absolute",
                left: 32,
                right: 32,
                bottom: `${32 + (pct / 100) * 256}px`,
                height: 1,
                background: "rgba(148,163,184,0.06)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Top Posts */}
      <div>
        <h3
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "rgba(148,163,184,0.7)",
            marginBottom: 16,
          }}
        >
          Top Posts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topPosts.map((post, i) => (
            <TopPostCard key={post.id} post={post} rank={i + 1} />
          ))}
        </div>
      </div>
    </motion.div>
    );
}

export function KpiCard({
      label,
      value,
      change,
      positive,
      icon: Icon,
      color,
      accent,
      compareValue,
    }: Kpi) {
    const kpiClass = `kpi-card ${accent}`;
    return (
    <div className={kpiClass}>
      <div className="flex items-center justify-between mb-3">
        <div
          style={{
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${color}10`,
            border: `1px solid ${color}25`,
            borderRadius: 8,
          }}
        >
          <Icon style={{ width: 18, height: 18, color }} />
        </div>
        <div
          className="flex items-center gap-1"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: positive ? "#06d6a0" : "#e2445c",
          }}
        >
          {positive ? (
            <ArrowUpRight style={{ width: 14, height: 14 }} />
          ) : (
            <ArrowDownRight style={{ width: 14, height: 14 }} />
          )}
          {change}
        </div>
      </div>
      <div className="kpi-value" style={{ color }}>
        {value}
      </div>
      <div className="kpi-label">{label}</div>
      {compareValue && (
        <div style={{ fontSize: 10, color: "rgba(148,163,184,0.7)", marginTop: 4 }}>
          {compareValue}
        </div>
      )}
    </div>
    );
}

export function TopPostCard({ post, rank }: { post: any; rank: number }) {
    const ChannelIcon = ChannelIcons[post.channel] || ThumbsUp;
    return (
    <div className="glass-panel" style={{ padding: 20 }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 18,
              fontWeight: 900,
              color: rank === 1 ? "#f472b6" : rank === 2 ? "#00d4ff" : "#7b61ff",
              opacity: 0.7,
            }}
          >
            #{rank}
          </span>
          <ChannelIcon
            style={{
              width: 14,
              height: 14,
              color: post.channel === "Instagram" ? "#E1306C" : "#1877F2",
            }}
          />
        </div>
        <span style={{ fontSize: 10, color: "#64748b" }}>{post.date}</span>
      </div>
      <p
        style={{
          fontSize: 12,
          color: "rgba(200,214,229,0.8)",
          lineHeight: 1.5,
          marginBottom: 16,
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {post.text}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <MiniStat icon={Eye} label="Alcance" value={post.reach.toLocaleString()} />
        <MiniStat icon={Heart} label="Likes" value={post.likes.toLocaleString()} />
        <MiniStat icon={MessageCircle} label="Comentarios" value={post.comments.toString()} />
        <MiniStat icon={Share2} label="Compartidos" value={post.shares.toString()} />
      </div>
      <div
        style={{
          marginTop: 12,
          padding: "6px 10px",
          borderRadius: 6,
          background: "rgba(244,114,182,0.06)",
          border: "1px solid rgba(244,114,182,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <Activity style={{ width: 12, height: 12, color: "#f472b6" }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#f472b6" }}>
          Engagement: {post.engagement}%
        </span>
      </div>
    </div>
    );
}

export function MiniStat({
      icon: Icon,
      label,
      value,
    }: {
          icon: React.ElementType;
          label: string;
          value: string;
        }) {
    return (
    <div className="flex items-center gap-2">
      <Icon style={{ width: 12, height: 12, color: "#64748b" }} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{value}</div>
        <div style={{ fontSize: 9, color: "#64748b" }}>{label}</div>
      </div>
    </div>
    );
}

export function formatBadge(mediaType: string): { icon: React.ElementType; label: string } {
    switch (mediaType) {
    case "video": return { icon: Play, label: "Video / Reel" };
    case "carousel": return { icon: Grid3X3, label: "Carrusel" };
    case "image": return { icon: Camera, label: "Imagen" };
    case "link": return { icon: ArrowUpRight, label: "Enlace" };
    default: return { icon: MessageCircle, label: "Texto" };
    }
}

/** Small square thumbnail with a format badge — used in the posts table. */
export function PostMediaThumb({ image, mediaType, channel, size = 44 }: { image: string | null; mediaType: string; channel: string; size?: number }) {
    const badge = formatBadge(mediaType);
    const Badge = badge.icon;
    const accent = channel === "Instagram" ? "#E1306C" : "#1877F2";
    return (
    <div title={badge.label} style={{ position: "relative", width: size, height: size, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {image ? (
        <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <Badge style={{ width: size * 0.4, height: size * 0.4, color: "#475569" }} />
      )}
      {mediaType === "video" && image && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.25)" }}>
          <Play style={{ width: size * 0.34, height: size * 0.34, color: "#fff" }} />
        </div>
      )}
      <div style={{ position: "absolute", bottom: 2, right: 2, width: 16, height: 16, borderRadius: 4, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${accent}55` }}>
        <Badge style={{ width: 9, height: 9, color: accent }} />
      </div>
    </div>
    );
}

/** Full-width media block for the card view — aspect ratio adapts to the format. */
export function PostMediaBlock({ image, mediaType, channel }: { image: string | null; mediaType: string; channel: string }) {
    const badge = formatBadge(mediaType);
    const Badge = badge.icon;
    const accent = channel === "Instagram" ? "#E1306C" : "#1877F2";
    const aspect = mediaType === "video" && channel === "Instagram" ? "9 / 16" : "16 / 10";
    return (
    <div style={{ position: "relative", width: "100%", aspectRatio: aspect, maxHeight: 200, borderRadius: 8, overflow: "hidden", marginBottom: 12, background: "linear-gradient(135deg, #0f172a, #1e293b)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {image ? (
        <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <Badge style={{ width: 28, height: 28, color: "#475569" }} />
      )}
      {mediaType === "video" && image && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.2)" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Play style={{ width: 18, height: 18, color: "#fff" }} />
          </div>
        </div>
      )}
      {/* Format pill */}
      <div style={{ position: "absolute", top: 8, left: 8, display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 20, background: "rgba(0,0,0,0.65)", border: `1px solid ${accent}55` }}>
        <Badge style={{ width: 11, height: 11, color: accent }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.04em" }}>{badge.label}</span>
      </div>
    </div>
    );
}

/** Render a single Posts-table cell by column key. */
export function renderPostCell(key: string, p: any): React.ReactNode {
    switch (key) {
    case "post": {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PostMediaThumb image={p.image} mediaType={p.mediaType} channel={p.channel} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {p.text || <span style={{ color: "#64748b", fontStyle: "italic" }}>{formatBadge(p.mediaType).label}</span>}
            </div>
            {p.permalink && (
              <a href={p.permalink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#00d4ff", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                Ver publicación <ArrowUpRight style={{ width: 10, height: 10 }} />
              </a>
            )}
          </div>
        </div>
      );
    }
    case "channel": {
      const ChannelIcon = ChannelIcons[p.channel] || ThumbsUp;
      return (
        <div className="flex items-center gap-2">
          <ChannelIcon style={{ width: 14, height: 14, color: p.channel === "Instagram" ? "#E1306C" : "#1877F2" }} />
          <span style={{ fontSize: 11, color: "#94a3b8" }}>{p.channel}</span>
        </div>
      );
    }
    case "format": {
      const b = formatBadge(p.mediaType);
      const Icon = b.icon;
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#94a3b8" }}>
          <Icon style={{ width: 12, height: 12 }} /> {b.label}
        </span>
      );
    }
    case "date":
      return <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>{p.date}</span>;
    case "reach":
      return <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{(p.reach || 0).toLocaleString()}</span>;
    case "likes":
      return <span style={{ fontSize: 12, color: "#e2e8f0" }}>{(p.likes || 0).toLocaleString()}</span>;
    case "comments":
      return <span style={{ fontSize: 12, color: "#e2e8f0" }}>{p.comments}</span>;
    case "shares":
      return <span style={{ fontSize: 12, color: "#e2e8f0" }}>{p.shares}</span>;
    case "engagement":
      return (
        <span style={{ fontSize: 11, fontWeight: 600, color: "#f472b6", padding: "3px 10px", borderRadius: 6, background: "rgba(244,114,182,0.08)", border: "1px solid rgba(244,114,182,0.15)" }}>
          {p.engagement}%
        </span>
      );
    default:
      return null;
    }
}

export function TabPosts({ posts }: { posts: any[] }) {
    const [viewMode, setViewMode] = useState<"table" | "card">("table");
    const [sortKey, setSortKey] = useState<SortKey>("reach");
    const [sortAsc, setSortAsc] = useState(false);
    const [visibleCols, setVisibleCols] = useState<string[]>(DEFAULT_POST_COLS);
    const [colMenuOpen, setColMenuOpen] = useState(false);
    const colMenuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
    try {
      const raw = localStorage.getItem(POST_COLS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved)) setVisibleCols(saved);
      }
    } catch { /* ignore */ }
    }, []);
    useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setColMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
    }, []);
    const toggleCol = (key: string) => {
            setVisibleCols((prev) => {
              const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
              try { localStorage.setItem(POST_COLS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
              return next;
            });
          };
    const cols = POST_COLUMNS.filter((c) => c.always || visibleCols.includes(c.key));
    const sorted = useMemo(() => {
            const copy = [...posts];
            copy.sort((a, b) => {
              const va = a[sortKey as keyof typeof a];
              const vb = b[sortKey as keyof typeof b];
              if (typeof va === "number" && typeof vb === "number")
                return sortAsc ? va - vb : vb - va;
              return 0;
            });
            return copy;
          }, [sortKey, sortAsc, posts]);
    const handleSort = (key: SortKey) => {
            if (sortKey === key) setSortAsc(!sortAsc);
            else {
              setSortKey(key);
              setSortAsc(false);
            }
          };
    const SortIcon = ({ col }: { col: SortKey }) =>
            sortKey === col ? (
              sortAsc ? (
                <ChevronUp style={{ width: 12, height: 12 }} />
              ) : (
                <ChevronDown style={{ width: 12, height: 12 }} />
              )
            ) : null;
    return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <span
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "rgba(148,163,184,0.7)",
          }}
        >
          Rendimiento de Posts
        </span>
        <div className="flex items-center gap-2">
          {/* Column selector (table view only) */}
          {viewMode === "table" && (
            <div ref={colMenuRef} style={{ position: "relative" }}>
              <button
                onClick={() => setColMenuOpen((o) => !o)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "7px 12px", borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${colMenuOpen ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.08)"}`,
                  color: "#94a3b8", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <List style={{ width: 14, height: 14 }} />
                Columnas
                <ChevronDown style={{ width: 13, height: 13, opacity: 0.7 }} />
              </button>
              {colMenuOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 200, zIndex: 100,
                  background: "#0c1222", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                  overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                }}>
                  <div style={{ padding: "8px 12px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748b", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    Mostrar columnas
                  </div>
                  {POST_COLUMNS.map((c) => {
                    const checked = c.always || visibleCols.includes(c.key);
                    return (
                      <button
                        key={c.key}
                        onClick={() => !c.always && toggleCol(c.key)}
                        disabled={c.always}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, width: "100%",
                          padding: "9px 12px", background: "transparent",
                          border: "none", borderBottom: "1px solid rgba(255,255,255,0.03)",
                          color: c.always ? "#64748b" : "#e2e8f0", fontSize: 12,
                          cursor: c.always ? "default" : "pointer", textAlign: "left", fontFamily: "inherit",
                        }}
                      >
                        <div style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                          border: checked ? "none" : "1.5px solid rgba(255,255,255,0.25)",
                          background: checked ? "#00d4ff" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {checked && <Check style={{ width: 11, height: 11, color: "#0a0f1e" }} />}
                        </div>
                        {c.label}{c.always && <span style={{ fontSize: 9, color: "#475569" }}>(fija)</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex space-x-1 glass-panel p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "table" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <List style={{ width: 16, height: 16 }} />
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "card" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Grid3X3 style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="glass-panel" style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {cols.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.sortable)}
                    style={{
                      padding: "14px 16px",
                      textAlign: "left",
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "#64748b",
                      borderBottom: "1px solid rgba(0,212,255,0.08)",
                      background: "rgba(0,212,255,0.02)",
                      cursor: col.sortable ? "pointer" : "default",
                      whiteSpace: "nowrap",
                      userSelect: "none",
                    }}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && <SortIcon col={col.sortable} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: "1px solid rgba(0,212,255,0.04)",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,212,255,0.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {cols.map((col) => (
                    <td
                      key={col.key}
                      style={{ padding: "12px 16px", ...(col.key === "post" ? { maxWidth: 300, color: "rgba(200,214,229,0.8)", fontSize: 12 } : {}) }}
                    >
                      {renderPostCell(col.key, p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map((p) => {
            const ChannelIcon = ChannelIcons[p.channel] || ThumbsUp;
            return (
              <div key={p.id} className="glass-panel" style={{ padding: 18 }}>
                <PostMediaBlock image={p.image} mediaType={p.mediaType} channel={p.channel} />
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ChannelIcon
                      style={{
                        width: 14,
                        height: 14,
                        color: p.channel === "Instagram" ? "#E1306C" : "#1877F2",
                      }}
                    />
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>{p.channel}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "#64748b" }}>{p.date}</span>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "rgba(200,214,229,0.8)",
                    lineHeight: 1.5,
                    marginBottom: 14,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {p.text}
                </p>
                <div className="grid grid-cols-2 gap-2" style={{ fontSize: 11 }}>
                  <div>
                    <span style={{ color: "#64748b" }}>Alcance</span>
                    <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{p.reach.toLocaleString()}</div>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Likes</span>
                    <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{p.likes.toLocaleString()}</div>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Comentarios</span>
                    <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{p.comments}</div>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Engagement</span>
                    <div style={{ fontWeight: 600, color: "#f472b6" }}>{p.engagement}%</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    );
}

export function TabAudiencia({ age, gender, location }: { age: any[]; gender: any[]; location: any[] }) {
    return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Edad */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="section-header">
          <span className="section-title">Distribución por Edad</span>
        </div>
        <div style={{ padding: 24 }}>
          <div className="space-y-3">
            {age.map((a) => (
              <div key={a.range} className="flex items-center gap-3">
                <span
                  style={{
                    fontSize: 11,
                    color: "#94a3b8",
                    width: 40,
                    textAlign: "right",
                    fontFamily: "'Orbitron', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {a.range}
                </span>
                <div style={{ flex: 1, height: 20, background: "rgba(255,255,255,0.03)", borderRadius: 4, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${a.pct}%`,
                      height: "100%",
                      background: `linear-gradient(90deg, #f472b6, rgba(244,114,182,0.3))`,
                      borderRadius: 4,
                      transition: "width 0.8s ease",
                      boxShadow: "0 0 8px rgba(244,114,182,0.2)",
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", width: 36 }}>{a.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Género - Donut */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="section-header">
          <span className="section-title">Género</span>
        </div>
        <div style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 32 }}>
          <DonutChart data={gender} size={140} />
          <div className="space-y-3">
            {gender.map((g) => (
              <div key={g.label} className="flex items-center gap-3">
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: g.color, boxShadow: `0 0 6px ${g.color}50` }} />
                <span style={{ fontSize: 12, color: "#e2e8f0" }}>{g.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: g.color, fontFamily: "'Orbitron', sans-serif" }}>{g.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ubicación */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="section-header">
          <span className="section-title">Ubicación</span>
        </div>
        <div style={{ padding: 0 }}>
          {location.map((loc, i) => (
            <div
              key={loc.city}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 24px",
                borderBottom: i < location.length - 1 ? "1px solid rgba(0,212,255,0.04)" : "none",
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "rgba(148,163,184,0.65)",
                    width: 20,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 12, color: "#e2e8f0" }}>{loc.city}</span>
              </div>
              <div className="flex items-center gap-3">
                <div style={{ width: 80, height: 6, background: "rgba(255,255,255,0.03)", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${(loc.pct / 24) * 100}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #00d4ff, rgba(0,212,255,0.3))",
                      borderRadius: 3,
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", width: 32, textAlign: "right" }}>{loc.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dispositivo - Pie */}
      {AUDIENCE_DEVICE.length > 0 && (
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="section-header">
          <span className="section-title">Dispositivo</span>
        </div>
        <div style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 32 }}>
          <DonutChart data={AUDIENCE_DEVICE} size={140} />
          <div className="space-y-3">
            {AUDIENCE_DEVICE.map((d) => (
              <div key={d.label} className="flex items-center gap-3">
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color, boxShadow: `0 0 6px ${d.color}50` }} />
                <span style={{ fontSize: 12, color: "#e2e8f0" }}>{d.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: d.color, fontFamily: "'Orbitron', sans-serif" }}>{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}
    </div>
    );
}

export function DonutChart({
      data,
      size,
    }: {
          data: { label: string; pct: number; color: string }[];
          size: number;
        }) {
    const radius = size / 2 - 12;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    if (data.length === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={16} />
        <text x={size / 2} y={size / 2 + 4} textAnchor="middle" style={{ fontSize: 10, fill: "#64748b" }}>Sin datos</text>
      </svg>
    );
    }

    return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((slice) => {
        const dashLength = (slice.pct / 100) * circumference;
        const dashOffset = -offset;
        offset += dashLength;
        return (
          <circle
            key={slice.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={slice.color}
            strokeWidth={16}
            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 4px ${slice.color}40)`,
              transition: "all 0.8s ease",
            }}
          />
        );
      })}
      {/* Center text */}
      <text
        x={size / 2}
        y={size / 2 - 4}
        textAnchor="middle"
        style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, fontWeight: 700, fill: "#e2e8f0" }}
      >
        {data[0].pct}%
      </text>
      <text
        x={size / 2}
        y={size / 2 + 14}
        textAnchor="middle"
        style={{ fontSize: 9, fill: "#64748b", textTransform: "uppercase", letterSpacing: "0.15em" }}
      >
        {data[0].label}
      </text>
    </svg>
    );
}

export function TabMejorHorario({ filterQuery }: { filterQuery: string }) {
    const [heatmapData, setHeatmapData] = useState<number[][]>(() => generateHeatmap());
    const [topSlots, setTopSlots] = useState<{ day: number; hour: number; avgImpressions: number; label: string }[]>([]);
    const [loadingBT, setLoadingBT] = useState(true);
    const [cachedAt, setCachedAt] = useState<string | null>(null);
    useEffect(() => {
    setLoadingBT(true);
    fetch(`/api/analytics/best-time${filterQuery}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.slots?.length) {
          const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
          data.slots.forEach((s: any) => { matrix[s.day][s.hour] = s.avgImpressions; });
          setHeatmapData(matrix);
        }
        if (data.topSlots?.length) setTopSlots(data.topSlots);
        if (data.generatedAt) setCachedAt(data.generatedAt);
      })
      .catch(() => {}) // fallback to fake data
      .finally(() => setLoadingBT(false));
    }, [filterQuery]);
    const maxVal = Math.max(...heatmapData.flat(), 1);
    const topSlotKeys = new Set(topSlots.map((s) => `${s.day}-${s.hour}`));
    return (
    <div className="space-y-4">
      {/* Top 5 Best Moments */}
      {topSlots.length > 0 && (
        <div className="glass-panel" style={{ padding: 0 }}>
          <div className="section-header">
            <span className="section-title">
              <Star style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 8, color: "#f59e0b" }} />
              Top 5 Mejores Momentos
            </span>
            {cachedAt && (
              <span style={{ fontSize: 10, color: "#475569" }}>
                Basado en los últimos 90 días · Actualizado {new Date(cachedAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
          <div style={{ padding: "16px 20px", display: "flex", gap: 10, flexWrap: "wrap" }}>
            {topSlots.slice(0, 5).map((slot, i) => {
              const rankColors = ["#00d4ff", "#00d4ff", "#06d6a0", "#94a3b8", "#94a3b8"];
              const rankLabels = ["ÓPTIMO", "RECOMENDADO", "RECOMENDADO", "BUENO", "BUENO"];
              const color = rankColors[i];
              return (
                <div key={i} style={{
                  flex: "1 1 140px", minWidth: 130, padding: "12px 14px", borderRadius: 8,
                  background: i === 0 ? "rgba(0,212,255,0.06)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${i < 2 ? "rgba(0,212,255,0.2)" : "rgba(255,255,255,0.06)"}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{
                      fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 900,
                      color, opacity: i < 2 ? 1 : 0.6,
                    }}>#{i + 1}</span>
                    <span style={{
                      fontSize: 8, fontWeight: 700, color, letterSpacing: "0.1em",
                      padding: "2px 6px", borderRadius: 4,
                      background: `${color}15`, border: `1px solid ${color}30`,
                    }}>{rankLabels[i]}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{slot.label}</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                    ~{slot.avgImpressions.toLocaleString()} impresiones
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Heatmap */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="section-header">
          <span className="section-title">
            <Clock style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 8 }} />
            Mejor horario para publicar
          </span>
          {loadingBT && <Loader2 style={{ width: 14, height: 14, color: "#64748b", animation: "spin 1s linear infinite" }} />}
        </div>
        <div style={{ padding: "24px 16px", overflowX: "auto" }}>
          {/* Hour labels */}
          <div className="flex" style={{ paddingLeft: 44, gap: 2, marginBottom: 4 }}>
            {HOURS.map((h) => (
              <div key={h} style={{ width: 32, minWidth: 32, textAlign: "center", fontSize: 9, fontFamily: "'Orbitron', sans-serif", fontWeight: 600, color: "rgba(148,163,184,0.65)" }}>
                {h.toString().padStart(2, "0")}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {DAYS.map((day, di) => (
            <div key={day} className="flex items-center" style={{ gap: 2, marginBottom: 2 }}>
              <span style={{ width: 40, fontSize: 10, fontFamily: "'Orbitron', sans-serif", fontWeight: 600, color: "#64748b", textAlign: "right", paddingRight: 4 }}>
                {day}
              </span>
              {heatmapData[di].map((val, hi) => {
                const intensity = val / maxVal;
                const isTop = topSlotKeys.has(`${di}-${hi}`);
                return (
                  <div
                    key={hi}
                    title={`${day} ${hi}:00 — Impresiones: ${val}`}
                    style={{
                      width: 32, minWidth: 32, height: 28, borderRadius: 4,
                      background: intensity > 0.7
                        ? `rgba(244,114,182,${0.3 + intensity * 0.55})`
                        : intensity > 0.4
                        ? `rgba(244,114,182,${0.08 + intensity * 0.25})`
                        : `rgba(244,114,182,${intensity * 0.1})`,
                      border: isTop ? "1px solid rgba(0,212,255,0.6)" : `1px solid rgba(244,114,182,${intensity * 0.15})`,
                      boxShadow: isTop ? "0 0 8px rgba(0,212,255,0.3)" : "none",
                      transition: "all 0.3s ease", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.zIndex = "10"; e.currentTarget.style.boxShadow = `0 0 12px rgba(244,114,182,${intensity * 0.5})`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.zIndex = "0"; e.currentTarget.style.boxShadow = isTop ? "0 0 8px rgba(0,212,255,0.3)" : "none"; }}
                  >
                    {isTop && (
                      <span style={{ position: "absolute", top: -2, right: -2, fontSize: 8, color: "#00d4ff" }}>★</span>
                    )}
                    {intensity > 0.75 && (
                      <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.8)", fontFamily: "'Orbitron', sans-serif" }}>
                        {val}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center justify-center gap-4" style={{ marginTop: 20, paddingLeft: 44 }}>
            <span style={{ fontSize: 10, color: "#64748b" }}>Bajo engagement</span>
            <div className="flex" style={{ gap: 2 }}>
              {[0.05, 0.12, 0.22, 0.35, 0.5, 0.65, 0.8].map((int, i) => (
                <div key={i} style={{ width: 24, height: 12, borderRadius: 2, background: `rgba(244,114,182,${int})`, border: `1px solid rgba(244,114,182,${int * 0.3})` }} />
              ))}
            </div>
            <span style={{ fontSize: 10, color: "#f472b6" }}>Alto engagement</span>
          </div>
        </div>
      </div>
    </div>
    );
}

export function TabHistorias({ filterQuery }: { filterQuery: string }) {
    const [stories, setStories] = useState<StoryData[]>([]);
    const [loadingS, setLoadingS] = useState(true);
    useEffect(() => {
    setLoadingS(true);
    fetch(`/api/analytics/stories${filterQuery}`)
      .then((r) => r.json())
      .then((data) => setStories(data.stories || []))
      .catch(() => {})
      .finally(() => setLoadingS(false));
    }, [filterQuery]);
    if (loadingS) return <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 style={{ width: 24, height: 24, color: "#64748b", animation: "spin 1s linear infinite" }} /></div>;
    if (stories.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, gap: 12, borderRadius: 12, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.09)" }}>
        <Camera style={{ width: 32, height: 32, color: "#334155" }} />
        <p style={{ fontSize: 13, color: "#64748b", textAlign: "center" }}>No hay historias en los últimos 30 días o conecta tu cuenta de <strong style={{ color: "#E1306C" }}>Instagram</strong></p>
      </div>
    );
    }

    const totalImpressions = stories.reduce((s, h) => s + h.impressions, 0);
    const avgReach = Math.round(stories.reduce((s, h) => s + h.reach, 0) / stories.length);
    const totalReplies = stories.reduce((s, h) => s + h.replies, 0);
    const avgCompletion = (stories.reduce((s, h) => s + h.completionRate, 0) / stories.length).toFixed(1);
    return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Impresiones" value={totalImpressions.toLocaleString()} change="Total" positive={true} icon={Eye} color="#7b61ff" accent="purple" />
        <KpiCard label="Alcance Prom." value={avgReach.toLocaleString()} change="Por historia" positive={true} icon={Users} color="#00d4ff" accent="cyan" />
        <KpiCard label="Respuestas" value={totalReplies.toString()} change="Total" positive={true} icon={MessageCircle} color="#f472b6" accent="pink" />
        <KpiCard label="Completion Rate" value={`${avgCompletion}%`} change="Promedio" positive={parseFloat(avgCompletion) >= 50} icon={Activity} color="#06d6a0" accent="emerald" />
      </div>

      {/* Stories Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: "auto" }}>
        <div className="section-header">
          <span className="section-title">
            <Camera style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 8 }} />
            Historias Recientes
          </span>
          <span style={{ fontSize: 10, color: "#64748b" }}>{stories.length} historias</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Fecha", "Impresiones", "Alcance", "Completion %", "Respuestas", "Taps →", "Taps ←", "Salidas"].map((col) => (
                <th key={col} style={{ padding: "14px 14px", textAlign: "left", fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#64748b", borderBottom: "1px solid rgba(6,214,160,0.08)", background: "rgba(6,214,160,0.02)", whiteSpace: "nowrap" }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stories.map((s) => {
              const completionColor = s.completionRate >= 80 ? "#06d6a0" : s.completionRate >= 50 ? "#f59e0b" : "#e2445c";
              return (
                <tr key={s.id} style={{ borderBottom: "1px solid rgba(6,214,160,0.04)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(6,214,160,0.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 14px", fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>
                    {new Date(s.timestamp).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{s.impressions.toLocaleString()}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#e2e8f0" }}>{s.reach.toLocaleString()}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 60, height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, s.completionRate)}%`, height: "100%", borderRadius: 3, background: completionColor, transition: "width 0.5s" }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: completionColor }}>{s.completionRate.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#e2e8f0" }}>{s.replies}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#94a3b8" }}>{s.tapsForward}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#94a3b8" }}>{s.tapsBack}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#e2445c" }}>{s.exits}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Completion Rate Chart */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="section-header">
          <span className="section-title">Completion Rate por Historia</span>
        </div>
        <div style={{ padding: "16px 24px" }}>
          <div className="space-y-2">
            {stories.slice(0, 15).map((s, i) => {
              const color = s.completionRate >= 80 ? "#06d6a0" : s.completionRate >= 50 ? "#f59e0b" : "#e2445c";
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 10, color: "#64748b", width: 80, flexShrink: 0, textAlign: "right" }}>
                    {new Date(s.timestamp).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                  </span>
                  <div style={{ flex: 1, height: 16, background: "rgba(255,255,255,0.03)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, s.completionRate)}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${color}, ${color}50)`, transition: "width 0.6s ease", boxShadow: `0 0 6px ${color}25` }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color, width: 36, textAlign: "right" }}>{s.completionRate.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    );
}

export function TabReels({ filterQuery }: { filterQuery: string }) {
    const [reels, setReels] = useState<ReelData[]>([]);
    const [loadingR, setLoadingR] = useState(true);
    const [sortBy, setSortBy] = useState<"plays" | "likes" | "shares" | "saved" | "engagementRate">("plays");
    useEffect(() => {
    setLoadingR(true);
    fetch(`/api/analytics/reels${filterQuery}`)
      .then((r) => r.json())
      .then((data) => setReels(data.reels || []))
      .catch(() => {})
      .finally(() => setLoadingR(false));
    }, [filterQuery]);
    if (loadingR) return <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 style={{ width: 24, height: 24, color: "#64748b", animation: "spin 1s linear infinite" }} /></div>;
    if (reels.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, gap: 12, borderRadius: 12, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.09)" }}>
        <Film style={{ width: 32, height: 32, color: "#334155" }} />
        <p style={{ fontSize: 13, color: "#64748b", textAlign: "center" }}>No hay Reels publicados o conecta tu cuenta de <strong style={{ color: "#E1306C" }}>Instagram</strong></p>
      </div>
    );
    }

    const totalPlays = reels.reduce((s, r) => s + r.plays, 0);
    const avgReach = Math.round(reels.reduce((s, r) => s + r.reach, 0) / reels.length);
    const totalSaved = reels.reduce((s, r) => s + r.saved, 0);
    const avgEngRate = (reels.reduce((s, r) => s + r.engagementRate, 0) / reels.length).toFixed(1);
    const topReels = [...reels].sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number)).slice(0, 5);
    const maxTopVal = Math.max(...topReels.map((r) => r[sortBy] as number), 1);
    const engBadgeColor = (rate: number) => rate >= 10 ? "#06d6a0" : rate >= 5 ? "#f59e0b" : "#94a3b8";
    return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Reproducciones" value={totalPlays.toLocaleString()} change="Total" positive={true} icon={Play} color="#f472b6" accent="pink" />
        <KpiCard label="Alcance Prom." value={avgReach.toLocaleString()} change="Por reel" positive={true} icon={Eye} color="#00d4ff" accent="cyan" />
        <KpiCard label="Guardados" value={totalSaved.toString()} change="Total" positive={true} icon={Bookmark} color="#f59e0b" accent="purple" />
        <KpiCard label="Eng. Rate" value={`${avgEngRate}%`} change="Promedio" positive={parseFloat(avgEngRate) >= 5} icon={Activity} color="#06d6a0" accent="emerald" />
      </div>

      {/* Reels Grid */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="section-header">
          <span className="section-title">
            <Film style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 8 }} />
            Reels
          </span>
          <span style={{ fontSize: 10, color: "#64748b" }}>{reels.length} reels</span>
        </div>
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {reels.map((reel) => {
            const ec = engBadgeColor(reel.engagementRate);
            return (
              <div key={reel.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden", transition: "border-color 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(244,114,182,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
              >
                {/* Thumbnail */}
                {reel.thumbnailUrl ? (
                  <div style={{ aspectRatio: "9/16", maxHeight: 200, overflow: "hidden", background: "#000" }}>
                    <img src={reel.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ) : (
                  <div style={{ aspectRatio: "9/16", maxHeight: 200, background: "linear-gradient(135deg, #0f172a, #1e293b)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Play style={{ width: 32, height: 32, color: "#f472b6", opacity: 0.5 }} />
                  </div>
                )}
                {/* Caption */}
                <div style={{ padding: "10px 12px" }}>
                  <p style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.4, margin: "0 0 8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {reel.caption || "Sin descripción"}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 10 }}>
                    <span style={{ color: "#94a3b8" }}>▶ {reel.plays.toLocaleString()}</span>
                    <span style={{ color: "#94a3b8" }}>♡ {reel.likes.toLocaleString()}</span>
                    <span style={{ color: "#94a3b8" }}>💬 {reel.comments}</span>
                    <span style={{ color: "#94a3b8" }}>🔖 {reel.saved}</span>
                  </div>
                  <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: ec, padding: "3px 10px", borderRadius: 10, background: `${ec}12`, border: `1px solid ${ec}30` }}>
                      {reel.engagementRate.toFixed(1)}% eng
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Reels by Metric */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="section-title">Top Reels</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", outline: "none", cursor: "pointer" }}
          >
            <option value="plays">Reproducciones</option>
            <option value="likes">Likes</option>
            <option value="shares">Compartidos</option>
            <option value="saved">Guardados</option>
            <option value="engagementRate">Engagement</option>
          </select>
        </div>
        <div style={{ padding: "16px 24px" }}>
          <div className="space-y-3">
            {topReels.map((r, i) => {
              const val = r[sortBy] as number;
              const pct = (val / maxTopVal) * 100;
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 900, color: i === 0 ? "#f472b6" : i === 1 ? "#00d4ff" : "#64748b", width: 20 }}>
                    #{i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, color: "#cbd5e1", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.caption || "Sin descripción"}
                    </p>
                    <div style={{ height: 8, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #f472b6, rgba(244,114,182,0.3))", boxShadow: "0 0 6px rgba(244,114,182,0.2)", transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", width: 60, textAlign: "right" }}>
                    {sortBy === "engagementRate" ? `${val.toFixed(1)}%` : val.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    );
}

export function TabCrecimiento({ filterQuery }: { filterQuery: string }) {
    const [series, setSeries] = useState<GrowthPoint[]>([]);
    const [current, setCurrent] = useState(0);
    const [apiTotalGained, setApiTotalGained] = useState(0);
    const [loadingG, setLoadingG] = useState(true);
    useEffect(() => {
    setLoadingG(true);
    fetch(`/api/analytics/growth${filterQuery}`)
      .then((r) => r.json())
      .then((data) => {
        setSeries(Array.isArray(data.series) ? data.series : []);
        setCurrent(data.current || 0);
        setApiTotalGained(data.totalGained || 0);
      })
      .catch(() => {})
      .finally(() => setLoadingG(false));
    }, [filterQuery]);
    if (loadingG) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 style={{ width: 24, height: 24, color: "#64748b", animation: "spin 1s linear infinite" }} /></div>;
    }

    if (series.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 60, gap: 12,
        borderRadius: 12, background: "rgba(255,255,255,0.015)",
        border: "1px solid rgba(255,255,255,0.09)",
      }}>
        <BarChart2 style={{ width: 32, height: 32, color: "#334155" }} />
        <p style={{ fontSize: 13, color: "#64748b", textAlign: "center" }}>
          Aún no hay datos de crecimiento de seguidores para este periodo. Meta expone
          los cambios diarios de seguidores solo de los últimos ~30 días.
        </p>
      </div>
    );
    }

    const GROWTH_DATA = series;
    const totalGained = apiTotalGained || GROWTH_DATA.reduce((s, d) => s + d.gained, 0);
    const firstFollowers = GROWTH_DATA[0].followers || 1;
    const growthRate = (((GROWTH_DATA[GROWTH_DATA.length - 1].followers - GROWTH_DATA[0].followers) / firstFollowers) * 100).toFixed(1);
    const maxFollowers = Math.max(...GROWTH_DATA.map((d) => d.followers));
    const minFollowers = Math.min(...GROWTH_DATA.map((d) => d.followers));
    const range = maxFollowers - minFollowers || 1;
    return (
    <div className="space-y-4">
      {/* Growth KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kpi-card cyan">
          <div className="flex items-center gap-2 mb-2">
            <Users style={{ width: 16, height: 16, color: "#00d4ff" }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#64748b" }}>
              Seguidores Actuales
            </span>
          </div>
          <div className="kpi-value" style={{ color: "#00d4ff" }}>
            {(current || GROWTH_DATA[GROWTH_DATA.length - 1].followers).toLocaleString()}
          </div>
        </div>
        <div className="kpi-card emerald">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus style={{ width: 16, height: 16, color: "#06d6a0" }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#64748b" }}>
              Ganados (periodo)
            </span>
          </div>
          <div className="kpi-value" style={{ color: "#06d6a0" }}>
            +{totalGained.toLocaleString()}
          </div>
        </div>
        <div className="kpi-card purple">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp style={{ width: 16, height: 16, color: "#7b61ff" }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#64748b" }}>
              Tasa de Crecimiento
            </span>
          </div>
          <div className="kpi-value" style={{ color: "#7b61ff" }}>
            {growthRate}%
          </div>
        </div>
      </div>

      {/* Line chart placeholder */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="section-header">
          <span className="section-title">Crecimiento de Seguidores</span>
        </div>
        <div style={{ padding: "32px 32px 24px", position: "relative" }}>
          {/* SVG line chart */}
          <svg
            viewBox="0 0 600 200"
            style={{ width: "100%", height: 220 }}
            preserveAspectRatio="none"
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
              <line
                key={pct}
                x1={0}
                y1={pct * 180 + 10}
                x2={600}
                y2={pct * 180 + 10}
                stroke="rgba(148,163,184,0.06)"
                strokeWidth={1}
              />
            ))}

            {/* Gradient fill area */}
            <defs>
              <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f472b6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="100%" stopColor="#00d4ff" />
              </linearGradient>
            </defs>

            {/* Area path */}
            <path
              d={`M ${GROWTH_DATA.map((d, i) => {
                const x = (i / (GROWTH_DATA.length - 1)) * 560 + 20;
                const y = 190 - ((d.followers - minFollowers) / range) * 170;
                return `${x},${y}`;
              }).join(" L ")} L ${580},${190} L ${20},${190} Z`}
              fill="url(#growthGrad)"
            />

            {/* Line path */}
            <polyline
              points={GROWTH_DATA.map((d, i) => {
                const x = (i / (GROWTH_DATA.length - 1)) * 560 + 20;
                const y = 190 - ((d.followers - minFollowers) / range) * 170;
                return `${x},${y}`;
              }).join(" ")}
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 0 6px rgba(244,114,182,0.4))" }}
            />

            {/* Data points */}
            {GROWTH_DATA.map((d, i) => {
              const x = (i / (GROWTH_DATA.length - 1)) * 560 + 20;
              const y = 190 - ((d.followers - minFollowers) / range) * 170;
              return (
                <g key={d.period}>
                  <circle cx={x} cy={y} r={5} fill="#030508" stroke="#f472b6" strokeWidth={2} />
                  <circle cx={x} cy={y} r={2} fill="#f472b6" />
                </g>
              );
            })}
          </svg>

          {/* X-axis labels */}
          <div className="flex justify-between" style={{ paddingLeft: 10, paddingRight: 10, marginTop: 8 }}>
            {GROWTH_DATA.map((d) => (
              <span
                key={d.period}
                style={{
                  fontSize: 10,
                  fontFamily: "'Orbitron', sans-serif",
                  fontWeight: 600,
                  color: "#64748b",
                }}
              >
                {d.period}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Net Followers Gained Per Period */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="section-header">
          <span className="section-title">Seguidores Ganados por Período</span>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {GROWTH_DATA.map((d) => {
              const maxGained = Math.max(...GROWTH_DATA.map((g) => g.gained), 1);
              const barH = Math.max(0, (d.gained / maxGained) * 80);
              return (
                <div key={d.period} className="flex flex-col items-center gap-2">
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#06d6a0",
                    }}
                  >
                    +{d.gained}
                  </span>
                  <div
                    style={{
                      width: "100%",
                      height: 80,
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "60%",
                        height: barH,
                        borderRadius: "4px 4px 0 0",
                        background: "linear-gradient(180deg, #06d6a0, rgba(6,214,160,0.15))",
                        boxShadow: "0 0 8px rgba(6,214,160,0.15)",
                        transition: "height 0.5s ease",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: "'Orbitron', sans-serif",
                      fontWeight: 600,
                      color: "#64748b",
                    }}
                  >
                    {d.period}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    );
}

const POST_COLUMNS: PostColumn[] = [
      { key: "post", label: "Post", always: true },
      { key: "channel", label: "Canal" },
      { key: "format", label: "Formato" },
      { key: "date", label: "Fecha", sortable: "date" },
      { key: "reach", label: "Alcance", sortable: "reach" },
      { key: "likes", label: "Likes", sortable: "likes" },
      { key: "comments", label: "Comentarios", sortable: "comments" },
      { key: "shares", label: "Compartidos", sortable: "shares" },
      { key: "engagement", label: "Eng. Rate", sortable: "engagement" },
    ];
const POST_COLS_KEY = "sodare:analytics-post-cols";
const DEFAULT_POST_COLS = POST_COLUMNS.filter((c) => c.key !== "format").map((c) => c.key);

type SortKey = "reach" | "likes" | "comments" | "shares" | "engagement" | "date";
type PostColumn = { key: string; label: string; sortable?: SortKey; always?: boolean };

export interface StoryData {
    id: string;
    timestamp: string;
    exits: number;
    impressions: number;
    reach: number;
    replies: number;
    tapsForward: number;
    tapsBack: number;
    completionRate: number;
}

export interface ReelData {
    id: string;
    timestamp: string;
    caption: string;
    thumbnailUrl?: string;
    comments: number;
    likes: number;
    plays: number;
    reach: number;
    saved: number;
    shares: number;
    engagementRate: number;
}

export interface GrowthPoint {
    period: string;
    followers: number;
    gained: number;
}
