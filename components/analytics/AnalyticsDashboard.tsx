"use client";

import React, { useState, useMemo, useEffect } from "react";

import {
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  Users,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight,
  MessageCircle,
  Share2,
  Grid3X3,
  List,
  ChevronUp,
  ChevronDown,
  Camera,
  ThumbsUp,
  Clock,
  UserPlus,
  Activity,
  Info,
} from "lucide-react";

// Channel icon lookup (lucide-react has no brand icons)
const ChannelIcons: Record<string, React.ElementType> = {
  Instagram: Camera,
  Facebook: ThumbsUp,
};

/* Empty defaults — real data loaded from API */

const TABS = ["Resumen", "Posts", "Audiencia", "Mejor Horario", "Crecimiento"] as const;
type Tab = (typeof TABS)[number];

const EMPTY_KPI = [
  { label: "Alcance", value: "—", change: "—", positive: true, icon: Eye, color: "#00d4ff", accent: "cyan" },
  { label: "Engagement", value: "—", change: "—", positive: true, icon: Heart, color: "#f472b6", accent: "pink" },
  { label: "Seguidores", value: "—", change: "—", positive: true, icon: Users, color: "#06d6a0", accent: "emerald" },
  { label: "Impresiones", value: "—", change: "—", positive: true, icon: BarChart2, color: "#7b61ff", accent: "purple" },
];

/* These are rendered directly — empty arrays = empty charts */
const AUDIENCE_DEVICE: { label: string; pct: number; color: string }[] = [];
const GROWTH_DATA: { period: string; followers: number; gained: number }[] = [];

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Deterministic pseudo-random based on seed (no hydration mismatch)
function seededRand(seed: number): number {
  return ((Math.sin(seed * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1;
}

// Generate realistic heatmap: higher on weekdays 10-14 and 19-21
function generateHeatmap(): number[][] {
  const data: number[][] = [];
  let seed = 0;
  for (let d = 0; d < 7; d++) {
    const row: number[] = [];
    for (let h = 0; h < 24; h++) {
      let base = 10 + seededRand(seed++) * 15;
      const isWeekday = d < 5;
      if (isWeekday && h >= 10 && h <= 14) base += 40 + seededRand(seed++) * 30;
      else if (isWeekday && h >= 19 && h <= 21) base += 35 + seededRand(seed++) * 25;
      else if (isWeekday && h >= 8 && h <= 9) base += 15 + seededRand(seed++) * 10;
      else if (!isWeekday && h >= 11 && h <= 15) base += 20 + seededRand(seed++) * 15;
      else if (h >= 0 && h <= 5) base = 2 + seededRand(seed++) * 8;
      row.push(Math.round(base));
    }
    data.push(row);
  }
  return data;
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */

export function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("Resumen");
  const [kpis, setKpis] = useState(EMPTY_KPI);
  const [posts, setPosts] = useState<any[]>([]);
  const [audienceAge, setAudienceAge] = useState<any[]>([]);
  const [audienceGender, setAudienceGender] = useState<any[]>([]);
  const [audienceLocation, setAudienceLocation] = useState<any[]>([]);

  // Fetch real organic KPIs
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch KPIs
        const kpiRes = await fetch("/api/analytics/organic?days=30");
        if (kpiRes.ok) {
          const kpiData = await kpiRes.json();
          if (kpiData && !kpiData.error) {
            setKpis([
              { label: "Alcance", value: (kpiData.reach || 0).toLocaleString(), change: `${kpiData.reachTrend > 0 ? "+" : ""}${(kpiData.reachTrend || 0).toFixed(1)}%`, positive: (kpiData.reachTrend || 0) >= 0, icon: Eye, color: "#00d4ff", accent: "cyan" },
              { label: "Engagement", value: `${(kpiData.engagement || 0).toFixed(1)}%`, change: `${kpiData.engagementTrend > 0 ? "+" : ""}${(kpiData.engagementTrend || 0).toFixed(1)}%`, positive: (kpiData.engagementTrend || 0) >= 0, icon: Heart, color: "#f472b6", accent: "pink" },
              { label: "Seguidores", value: (kpiData.followers || 0).toLocaleString(), change: `${kpiData.followersTrend > 0 ? "+" : ""}${(kpiData.followersTrend || 0).toFixed(1)}%`, positive: (kpiData.followersTrend || 0) >= 0, icon: Users, color: "#06d6a0", accent: "emerald" },
              { label: "Impresiones", value: (kpiData.impressions || 0).toLocaleString(), change: `${kpiData.impressionsTrend > 0 ? "+" : ""}${(kpiData.impressionsTrend || 0).toFixed(1)}%`, positive: (kpiData.impressionsTrend || 0) >= 0, icon: BarChart2, color: "#7b61ff", accent: "purple" },
            ]);
            // Data loaded from API
          }
        }
      } catch { /* fallback to demo */ }

      try {
        // Fetch posts
        const postRes = await fetch("/api/analytics/posts?limit=25");
        if (postRes.ok) {
          const postData = await postRes.json();
          if (postData.posts?.length) {
            setPosts(postData.posts.map((p: any, i: number) => ({
              id: p.id || i + 1,
              text: p.text || "",
              channel: p.channel || "Facebook",
              date: p.date ? new Date(p.date).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "",
              reach: p.reach || 0,
              likes: p.likes || 0,
              comments: p.comments || 0,
              shares: p.shares || 0,
              engagement: p.engagement || 0,
            })));
          }
        }
      } catch { /* fallback to demo */ }

      try {
        // Fetch audience
        const audRes = await fetch("/api/analytics/audience");
        if (audRes.ok) {
          const audData = await audRes.json();
          if (audData.age?.length) setAudienceAge(audData.age);
          if (audData.gender?.length) {
            const colors = ["#f472b6", "#00d4ff", "#7b61ff"];
            setAudienceGender(audData.gender.map((g: any, i: number) => ({ ...g, color: colors[i] || "#94a3b8" })));
          }
          if (audData.location?.length) setAudienceLocation(audData.location);
        }
      } catch { /* fallback to demo */ }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-4 page-enter">



      {/* Tab Navigation */}
      <div className="flex space-x-1 glass-panel p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
              activeTab === tab
                ? "bg-white/10 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
            style={activeTab === tab ? { boxShadow: "0 0 12px rgba(244,114,182,0.15)" } : {}}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ animation: "page-fade-in 0.3s ease-out forwards" }}>
        {activeTab === "Resumen" && <TabResumen kpis={kpis} posts={posts} />}
        {activeTab === "Posts" && <TabPosts posts={posts} />}
        {activeTab === "Audiencia" && <TabAudiencia age={audienceAge} gender={audienceGender} location={audienceLocation} />}
        {activeTab === "Mejor Horario" && <TabMejorHorario />}
        {activeTab === "Crecimiento" && <TabCrecimiento />}
      </div>
    </div>
  );
}



/* ══════════════════════════════════════════════════════════
   TAB: RESUMEN
   ══════════════════════════════════════════════════════════ */
function TabResumen({ kpis, posts }: { kpis: typeof EMPTY_KPI; posts: any[] }) {
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

  return (
    <div className="space-y-6">
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
    </div>
  );
}

/* ── KPI Card ─────────────────────────────────────────── */
function KpiCard({
  label,
  value,
  change,
  positive,
  icon: Icon,
  color,
  accent,
}: (typeof EMPTY_KPI)[number]) {
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
    </div>
  );
}

/* ── Top Post Card ────────────────────────────────────── */
function TopPostCard({ post, rank }: { post: any; rank: number }) {
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
          Engagement: {post.engagement}
        </span>
      </div>
    </div>
  );
}

function MiniStat({
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

/* ══════════════════════════════════════════════════════════
   TAB: POSTS
   ══════════════════════════════════════════════════════════ */
type SortKey = "reach" | "likes" | "comments" | "shares" | "engagement" | "date";

function TabPosts({ posts }: { posts: any[] }) {
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [sortKey, setSortKey] = useState<SortKey>("reach");
  const [sortAsc, setSortAsc] = useState(false);

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

      {viewMode === "table" ? (
        <div className="glass-panel" style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  { key: null, label: "Post" },
                  { key: null, label: "Canal" },
                  { key: "date" as SortKey, label: "Fecha" },
                  { key: "reach" as SortKey, label: "Alcance" },
                  { key: "likes" as SortKey, label: "Likes" },
                  { key: "comments" as SortKey, label: "Comentarios" },
                  { key: "shares" as SortKey, label: "Compartidos" },
                  { key: "engagement" as SortKey, label: "Eng. Rate" },
                ].map((col) => (
                  <th
                    key={col.label}
                    onClick={() => col.key && handleSort(col.key)}
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
                      cursor: col.key ? "pointer" : "default",
                      whiteSpace: "nowrap",
                      userSelect: "none",
                    }}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.key && <SortIcon col={col.key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const ChannelIcon = ChannelIcons[p.channel] || ThumbsUp;
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: "1px solid rgba(0,212,255,0.04)",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,212,255,0.03)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "rgba(200,214,229,0.8)", maxWidth: 260 }}>
                      {p.text}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div className="flex items-center gap-2">
                        <ChannelIcon
                          style={{
                            width: 14,
                            height: 14,
                            color: p.channel === "Instagram" ? "#E1306C" : "#1877F2",
                          }}
                        />
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{p.channel}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>{p.date}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>
                      {p.reach.toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#e2e8f0" }}>{p.likes.toLocaleString()}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#e2e8f0" }}>{p.comments}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#e2e8f0" }}>{p.shares}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#f472b6",
                          padding: "3px 10px",
                          borderRadius: 6,
                          background: "rgba(244,114,182,0.08)",
                          border: "1px solid rgba(244,114,182,0.15)",
                        }}
                      >
                        {p.engagement}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map((p) => {
            const ChannelIcon = ChannelIcons[p.channel] || ThumbsUp;
            return (
              <div key={p.id} className="glass-panel" style={{ padding: 18 }}>
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

/* ══════════════════════════════════════════════════════════
   TAB: AUDIENCIA
   ══════════════════════════════════════════════════════════ */
function TabAudiencia({ age, gender, location }: { age: any[]; gender: any[]; location: any[] }) {
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
    </div>
  );
}

/* ── SVG Donut Chart ──────────────────────────────────── */
function DonutChart({
  data,
  size,
}: {
  data: { label: string; pct: number; color: string }[];
  size: number;
}) {
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

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

/* ══════════════════════════════════════════════════════════
   TAB: MEJOR HORARIO
   ══════════════════════════════════════════════════════════ */
function TabMejorHorario() {
  const heatmap = useMemo(() => generateHeatmap(), []);
  const maxVal = Math.max(...heatmap.flat());

  return (
    <div className="space-y-4">
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="section-header">
          <span className="section-title">
            <Clock style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 8 }} />
            Mejor horario para publicar
          </span>
        </div>
        <div style={{ padding: "24px 16px", overflowX: "auto" }}>
          {/* Hour labels */}
          <div className="flex" style={{ paddingLeft: 44, gap: 2, marginBottom: 4 }}>
            {HOURS.map((h) => (
              <div
                key={h}
                style={{
                  width: 32,
                  minWidth: 32,
                  textAlign: "center",
                  fontSize: 9,
                  fontFamily: "'Orbitron', sans-serif",
                  fontWeight: 600,
                  color: "rgba(148,163,184,0.65)",
                }}
              >
                {h.toString().padStart(2, "0")}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {DAYS.map((day, di) => (
            <div key={day} className="flex items-center" style={{ gap: 2, marginBottom: 2 }}>
              <span
                style={{
                  width: 40,
                  fontSize: 10,
                  fontFamily: "'Orbitron', sans-serif",
                  fontWeight: 600,
                  color: "#64748b",
                  textAlign: "right",
                  paddingRight: 4,
                }}
              >
                {day}
              </span>
              {heatmap[di].map((val, hi) => {
                const intensity = val / maxVal;
                return (
                  <div
                    key={hi}
                    title={`${day} ${hi}:00 — Engagement: ${val}`}
                    style={{
                      width: 32,
                      minWidth: 32,
                      height: 28,
                      borderRadius: 4,
                      background:
                        intensity > 0.7
                          ? `rgba(244,114,182,${0.3 + intensity * 0.55})`
                          : intensity > 0.4
                          ? `rgba(244,114,182,${0.08 + intensity * 0.25})`
                          : `rgba(244,114,182,${intensity * 0.1})`,
                      border: `1px solid rgba(244,114,182,${intensity * 0.15})`,
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.15)";
                      e.currentTarget.style.zIndex = "10";
                      e.currentTarget.style.boxShadow = `0 0 12px rgba(244,114,182,${intensity * 0.5})`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.zIndex = "0";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {intensity > 0.75 && (
                      <span
                        style={{
                          fontSize: 8,
                          fontWeight: 700,
                          color: "rgba(255,255,255,0.8)",
                          fontFamily: "'Orbitron', sans-serif",
                        }}
                      >
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
                <div
                  key={i}
                  style={{
                    width: 24,
                    height: 12,
                    borderRadius: 2,
                    background: `rgba(244,114,182,${int})`,
                    border: `1px solid rgba(244,114,182,${int * 0.3})`,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: 10, color: "#f472b6" }}>Alto engagement</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB: CRECIMIENTO
   ══════════════════════════════════════════════════════════ */
function TabCrecimiento() {
  if (GROWTH_DATA.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 60, gap: 12,
        borderRadius: 12, background: "rgba(255,255,255,0.015)",
        border: "1px solid rgba(255,255,255,0.09)",
      }}>
        <BarChart2 style={{ width: 32, height: 32, color: "#334155" }} />
        <p style={{ fontSize: 13, color: "#64748b", textAlign: "center" }}>
          Conecta tu cuenta en <strong style={{ color: "#00d4ff" }}>Integraciones</strong> para ver datos de crecimiento
        </p>
      </div>
    );
  }
  const totalGained = GROWTH_DATA.reduce((s, d) => s + d.gained, 0);
  const growthRate = ((GROWTH_DATA[GROWTH_DATA.length - 1].followers - GROWTH_DATA[0].followers) / GROWTH_DATA[0].followers * 100).toFixed(1);
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
            {GROWTH_DATA[GROWTH_DATA.length - 1].followers.toLocaleString()}
          </div>
        </div>
        <div className="kpi-card emerald">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus style={{ width: 16, height: 16, color: "#06d6a0" }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#64748b" }}>
              Ganados (6 meses)
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
              const maxGained = Math.max(...GROWTH_DATA.map((g) => g.gained));
              const barH = (d.gained / maxGained) * 80;
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
