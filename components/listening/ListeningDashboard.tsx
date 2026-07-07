"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  Search, TrendingUp, MessageCircle, ThumbsUp, ThumbsDown, Minus,
  Hash, Globe, Loader2, ExternalLink, Heart, Share2, BarChart2,
  Sparkles, Users, Clock, ChevronRight, RefreshCw
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { useLanguage } from "@/components/layout/LanguageContext";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
interface SearchResult {
  keyword: string;
  period: string;
  metrics: {
    mentions: number;
    interactions: number;
    reach: number;
    sentimentScore: number;
    positiveCount: number;
    negativeCount: number;
    neutralCount: number;
    uniqueAuthors: number;
  };
  timeseries: { date: string; count: number; positive: number; negative: number; neutral: number }[];
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
    positiveThemes: string[];
    negativeThemes: string[];
    neutralThemes: string[];
  };
  topics: { text: string; size: number; sentiment: "positive" | "negative" | "neutral" }[];
  posts: {
    id: string;
    platform: "facebook" | "instagram";
    text: string;
    author: string;
    url: string | null;
    publishedAt: string;
    likes: number;
    comments: number;
    shares: number;
    type: "post" | "comment" | "mention";
    sentiment: "positive" | "negative" | "neutral";
  }[];
  heatmap: { day: number; hour: number; count: number }[];
  authors: {
    name: string;
    platform: string;
    mentions: number;
    interactions: number;
    sentimentPositivePercent: number;
    sentimentNegativePercent: number;
    sentimentNeutralPercent: number;
  }[];
  sources: { facebook: number; instagram: number };
}

type SectionId = "metrics" | "sentiment" | "topics" | "results" | "heatmap" | "influencers";

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */
const SENTIMENT_COLORS = {
  positive: "#34b77c",
  negative: "#e5484d",
  neutral: "#e0a83c",
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "#1877F2",
  instagram: "#E4405F",
};

const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

/* ─────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────── */

function MetricCard({
  label, value, sub, color, icon: Icon
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div style={{
      background: "var(--surface-1)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ background: `${color}18`, borderRadius: 8, padding: 6 }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span>
      </div>
      <span style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{sub}</span>}
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: "positive" | "negative" | "neutral" }) {
  const cfg = {
    positive: { label: "Positivo", color: SENTIMENT_COLORS.positive, bg: "#34b77c15" },
    negative: { label: "Negativo", color: SENTIMENT_COLORS.negative, bg: "#e5484d15" },
    neutral: { label: "Neutral", color: SENTIMENT_COLORS.neutral, bg: "#e0a83c15" },
  }[sentiment];

  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      color: cfg.color, background: cfg.bg,
      padding: "2px 8px", borderRadius: 99,
    }}>{cfg.label}</span>
  );
}

function TopicBubble({ topic }: { topic: SearchResult["topics"][0] }) {
  const [hovered, setHovered] = useState(false);
  const baseSize = Math.max(40, Math.min(140, (topic.size / 100) * 130));
  const color = SENTIMENT_COLORS[topic.sentiment];
  const opacity = 0.65 + (topic.size / 100) * 0.35;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: baseSize,
        height: baseSize,
        borderRadius: "50%",
        background: `${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "default",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        transform: hovered ? "scale(1.1)" : "scale(1)",
        boxShadow: hovered ? `0 4px 20px ${color}40` : "none",
        flexShrink: 0,
        fontSize: Math.max(10, Math.min(18, baseSize / 6)),
        fontWeight: 700,
        color: "var(--foreground)",
        textAlign: "center",
        padding: "0 6px",
        wordBreak: "break-word",
        lineHeight: 1.2,
      }}
      title={`${topic.text} — ${topic.sentiment}`}
    >
      {topic.text.slice(0, 14)}
    </div>
  );
}

function ActivityHeatmap({
  heatmap,
  days
}: {
  heatmap: SearchResult["heatmap"];
  days: string[];
}) {
  const maxVal = Math.max(...heatmap.map(h => h.count), 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 4, minWidth: 800 }}>
        {/* Day labels */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, justifyContent: "flex-end" }}>
          <div style={{ height: 24 }} /> {/* hour header spacer */}
          {days.map((d, di) => (
            <div key={d} style={{
              height: 28,
              fontSize: 12,
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              paddingRight: 8,
              whiteSpace: "nowrap",
            }}>{d}</div>
          ))}
        </div>

        {/* Hours × Days grid */}
        <div style={{ flex: 1 }}>
          {/* Hour headers */}
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            {hours.map(h => (
              <div key={h} style={{
                width: 28, fontSize: 10,
                color: "var(--text-secondary)",
                textAlign: "center",
              }}>{h}h</div>
            ))}
          </div>

          {/* Rows */}
          {days.map((_, di) => (
            <div key={di} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              {hours.map(h => {
                const cell = heatmap.find(c => c.day === di && c.hour === h);
                const val = cell?.count || 0;
                const intensity = val / maxVal;
                return (
                  <div
                    key={h}
                    title={`${days[di]} ${h}:00 — ${val} menciones`}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 4,
                      background: val === 0
                        ? "var(--border)"
                        : `rgba(139, 92, 246, ${0.2 + intensity * 0.8})`,
                      cursor: "default",
                      transition: "transform 0.15s",
                      fontSize: val > 0 ? 9 : undefined,
                      color: "var(--foreground)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {val > 0 && val}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export function ListeningDashboard() {
  const { lang } = useLanguage();
  const days = lang === "es" ? DAYS_ES : DAYS_EN;

  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("metrics");
  const [postSort, setPostSort] = useState<"date" | "engagement" | "sentiment">("date");
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Search handler ─────────────────────────────────────── */
  const search = useCallback(async (q: string, p: typeof period) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/listening/search?q=${encodeURIComponent(trimmed)}&period=${p}`
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
      setActiveSection("metrics");
    } catch (err: any) {
      setError(err.message || "Error fetching data");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => search(query, period);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  /* ── Sorted posts ───────────────────────────────────────── */
  const sortedPosts = result ? [...result.posts].sort((a, b) => {
    if (postSort === "engagement") return (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares);
    if (postSort === "sentiment") return a.sentiment.localeCompare(b.sentiment);
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  }) : [];

  /* ── Nav sections ───────────────────────────────────────── */
  const sections: { id: SectionId; label: string; icon: React.ElementType }[] = [
    { id: "metrics", label: lang === "es" ? "Métricas Clave" : "Key Metrics", icon: BarChart2 },
    { id: "sentiment", label: lang === "es" ? "Sentimiento" : "Sentiment", icon: ThumbsUp },
    { id: "topics", label: lang === "es" ? "Principales Temáticas" : "Main Topics", icon: Hash },
    { id: "results", label: lang === "es" ? "Resultados" : "Results", icon: MessageCircle },
    { id: "heatmap", label: lang === "es" ? "Actividad" : "Activity", icon: Clock },
    { id: "influencers", label: lang === "es" ? "Autores" : "Authors", icon: Users },
  ];

  /* ── Custom tooltip for recharts ─────────────────────────── */
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
      }}>
        <p style={{ color: "var(--text-secondary)", marginBottom: 4 }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color, margin: "2px 0" }}>
            {p.name}: <strong>{p.value}</strong>
          </p>
        ))}
      </div>
    );
  };

  /* ── Pie chart data ─────────────────────────────────────── */
  const pieData = result ? [
    { name: "Positivo", value: result.sentiment.positive, color: SENTIMENT_COLORS.positive },
    { name: "Neutro", value: result.sentiment.neutral, color: SENTIMENT_COLORS.neutral },
    { name: "Negativo", value: result.sentiment.negative, color: SENTIMENT_COLORS.negative },
  ] : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Search bar ─────────────────────────────────────── */}
      <div style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "24px 28px",
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>
          🔍 {lang === "es" ? "Búsqueda de Keywords" : "Keyword Search"}
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
          {lang === "es"
            ? "Analiza el impacto de una palabra clave en tu ecosistema de redes sociales con inteligencia artificial."
            : "Analyze a keyword's impact in your social media ecosystem with AI intelligence."}
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {/* Period selector */}
          <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 8, padding: 4 }}>
            {(["7d", "30d", "90d"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: period === p ? "var(--accent)" : "transparent",
                  color: period === p ? "#fff" : "var(--text-secondary)",
                  transition: "all 0.2s",
                }}
              >{p.toUpperCase()}</button>
            ))}
          </div>

          {/* Search input */}
          <div style={{ flex: 1, minWidth: 260, position: "relative" }}>
            <Search size={16} style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              color: "var(--text-secondary)",
            }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={lang === "es" ? "#hashtag, keyword, @cuenta..." : "#hashtag, keyword, @account..."}
              style={{
                width: "100%",
                padding: "10px 14px 10px 38px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                color: "var(--text-primary)",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Search button */}
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              background: "linear-gradient(135deg, #7c6bd6, #9b7be8)",
              color: "var(--foreground)",
              fontWeight: 600,
              fontSize: 14,
              border: "none",
              cursor: loading || !query.trim() ? "not-allowed" : "pointer",
              opacity: loading || !query.trim() ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "opacity 0.2s",
            }}
          >
            {loading
              ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> {lang === "es" ? "Analizando..." : "Analyzing..."}</>
              : <><Sparkles size={16} /> {lang === "es" ? "Analizar" : "Analyze"}</>
            }
          </button>
        </div>

        {/* Suggestions */}
        {!result && !loading && (
          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{lang === "es" ? "Prueba con:" : "Try:"}</span>
            {["tu marca", "producto", "#hashtag", "@competidor"].map(s => (
              <button
                key={s}
                onClick={() => { setQuery(s); search(s, period); }}
                style={{
                  fontSize: 12,
                  padding: "4px 10px",
                  borderRadius: 99,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >{s}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── Error state ─────────────────────────────────────── */}
      {error && (
        <div style={{
          background: "#e5484d15",
          border: "1px solid #e5484d40",
          borderRadius: 12,
          padding: "16px 20px",
          color: "var(--c-danger)",
          fontSize: 14,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              height: 120,
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          ))}
        </div>
      )}

      {/* ── Results area ─────────────────────────────────────── */}
      {result && !loading && (
        <div style={{ display: "flex", gap: 20 }}>

          {/* Sidebar navigation */}
          <div style={{
            width: 200,
            flexShrink: 0,
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "12px 8px",
            height: "fit-content",
            position: "sticky",
            top: 80,
          }}>
            <div style={{ padding: "4px 8px 12px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
                {lang === "es" ? "BUSCANDO" : "SEARCHING"}
              </p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                {result.keyword}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                {result.metrics.mentions} {lang === "es" ? "menciones" : "mentions"}
              </p>
            </div>

            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: activeSection === s.id ? "var(--accent)18" : "transparent",
                  color: activeSection === s.id ? "var(--accent)" : "var(--text-secondary)",
                  fontWeight: activeSection === s.id ? 600 : 400,
                  fontSize: 13,
                  textAlign: "left",
                  transition: "all 0.15s",
                  marginBottom: 2,
                }}
              >
                <s.icon size={15} />
                {s.label}
              </button>
            ))}

            <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 8, padding: "8px 12px 4px" }}>
              <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                📘 {result.sources.facebook} Facebook<br />
                📸 {result.sources.instagram} Instagram
              </p>
            </div>
          </div>

          {/* Main content */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── SECTION: Key Metrics ─────────────────────────── */}
            {activeSection === "metrics" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Metric cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                  <MetricCard
                    label={lang === "es" ? "Menciones" : "Mentions"}
                    value={formatNum(result.metrics.mentions)}
                    sub={`${result.sources.facebook} FB + ${result.sources.instagram} IG`}
                    color="#7c6bd6"
                    icon={MessageCircle}
                  />
                  <MetricCard
                    label={lang === "es" ? "Interacciones" : "Interactions"}
                    value={formatNum(result.metrics.interactions)}
                    sub={lang === "es" ? "likes + comentarios + compartidos" : "likes + comments + shares"}
                    color="#3b82f6"
                    icon={Heart}
                  />
                  <MetricCard
                    label={lang === "es" ? "Sentimiento Positivo" : "Positive Sentiment"}
                    value={`${result.metrics.positiveCount}`}
                    sub={`${result.sentiment.positive}% positivo`}
                    color="#34b77c"
                    icon={ThumbsUp}
                  />
                  <MetricCard
                    label={lang === "es" ? "Alcance Estimado" : "Estimated Reach"}
                    value={formatNum(result.metrics.reach)}
                    sub={lang === "es" ? "personas potenciales" : "potential people"}
                    color="#e0a83c"
                    icon={Globe}
                  />
                </div>

                {/* Volume over time */}
                <div style={{
                  background: "var(--surface-1)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 24,
                }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: "var(--text-primary)" }}>
                    📈 {lang === "es" ? "Menciones en el tiempo" : "Mentions over time"}
                  </h3>
                  {result.timeseries.some(t => t.count > 0) ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={result.timeseries.map(t => ({ ...t, fecha: formatDate(t.date) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
                        <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="count"
                          name={lang === "es" ? "Menciones" : "Mentions"}
                          stroke="#7c6bd6"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState
                      icon="📊"
                      message={lang === "es"
                        ? "No hay suficientes datos para mostrar la tendencia en el tiempo."
                        : "Not enough data to show the trend over time."}
                    />
                  )}
                </div>
              </div>
            )}

            {/* ── SECTION: Sentiment ───────────────────────────── */}
            {activeSection === "sentiment" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {/* Themes */}
                  <div style={{
                    background: "var(--surface-1)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 24,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                      <Sparkles size={16} color="#34b77c" />
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--c-success)" }}>
                        {lang === "es" ? "Temas con sentimiento positivo" : "Positive sentiment topics"}
                      </h3>
                    </div>
                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                      {result.sentiment.positiveThemes.map((t, i) => (
                        <li key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--c-success)", flexShrink: 0 }} />
                          <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{
                    background: "var(--surface-1)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 24,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                      <Sparkles size={16} color="#e5484d" />
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--c-danger)" }}>
                        {lang === "es" ? "Temas con sentimiento negativo" : "Negative sentiment topics"}
                      </h3>
                    </div>
                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                      {result.sentiment.negativeThemes.map((t, i) => (
                        <li key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--c-danger)", flexShrink: 0 }} />
                          <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Sentiment donut + timeseries */}
                <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
                  {/* Donut */}
                  <div style={{
                    background: "var(--surface-1)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 24,
                  }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "var(--text-primary)" }}>
                      {lang === "es" ? "Cuota de Sentimiento" : "Sentiment Share"}
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val) => `${Number(val)}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                      {pieData.map(p => (
                        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>{p.name}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: p.color }}>{p.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sentiment over time */}
                  <div style={{
                    background: "var(--surface-1)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 24,
                  }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "var(--text-primary)" }}>
                      {lang === "es" ? "Sentimiento en el tiempo" : "Sentiment over time"}
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={result.timeseries.map(t => ({ ...t, fecha: formatDate(t.date) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} />
                        <YAxis tick={{ fontSize: 10, fill: "var(--text-secondary)" }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="positive" name="Positivo" stroke="#34b77c" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="neutral" name="Neutral" stroke="#e0a83c" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="negative" name="Negativo" stroke="#e5484d" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* ── SECTION: Topics ──────────────────────────────── */}
            {activeSection === "topics" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{
                  background: "var(--surface-1)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 24,
                }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>
                    💭 {lang === "es" ? "Mapa de Temas" : "Topic Map"}
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
                    {lang === "es"
                      ? "Términos relacionados con tu keyword. El tamaño indica frecuencia; el color indica sentimiento."
                      : "Terms related to your keyword. Size = frequency, color = sentiment."}
                  </p>
                  {result.topics.length > 0 ? (
                    <div style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 300,
                      padding: "20px 0",
                    }}>
                      {result.topics.map((topic, i) => (
                        <TopicBubble key={i} topic={topic} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon="💭"
                      message={lang === "es"
                        ? "Agrega más contenido relacionado con esta keyword para ver el mapa de temas."
                        : "Add more content related to this keyword to see the topic map."}
                    />
                  )}
                </div>

                {/* Legend */}
                <div style={{
                  display: "flex",
                  gap: 20,
                  padding: "12px 20px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                }}>
                  {Object.entries(SENTIMENT_COLORS).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: v }} />
                      <span style={{ fontSize: 13, color: "var(--text-secondary)", textTransform: "capitalize" }}>
                        {k === "positive" ? "Positivo" : k === "negative" ? "Negativo" : "Neutral"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SECTION: Results ─────────────────────────────── */}
            {activeSection === "results" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Sort bar */}
                <div style={{
                  background: "var(--surface-1)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    {result.posts.length} {lang === "es" ? "resultados" : "results"}
                  </span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    {lang === "es" ? "Ordenar:" : "Sort:"}
                  </span>
                  {(["date", "engagement", "sentiment"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setPostSort(s)}
                      style={{
                        fontSize: 12, padding: "5px 12px", borderRadius: 6, border: "none",
                        cursor: "pointer",
                        background: postSort === s ? "var(--accent)" : "var(--surface-2)",
                        color: postSort === s ? "#fff" : "var(--text-secondary)",
                        fontWeight: postSort === s ? 600 : 400,
                      }}
                    >
                      {s === "date" ? (lang === "es" ? "Fecha" : "Date")
                        : s === "engagement" ? "Engagement"
                          : lang === "es" ? "Sentimiento" : "Sentiment"}
                    </button>
                  ))}
                </div>

                {sortedPosts.length === 0 ? (
                  <EmptyState
                    icon="🔍"
                    message={lang === "es"
                      ? "No se encontraron menciones de esta keyword en tus redes conectadas. Intenta con otra keyword o conecta más integraciones."
                      : "No mentions of this keyword found in your connected networks. Try a different keyword or connect more integrations."}
                  />
                ) : (
                  sortedPosts.map(post => (
                    <PostCard key={post.id} post={post} />
                  ))
                )}
              </div>
            )}

            {/* ── SECTION: Activity Heatmap ─────────────────────── */}
            {activeSection === "heatmap" && (
              <div style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 24,
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>
                  🕐 {lang === "es" ? "Pico de Actividad" : "Activity Peak"}
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
                  {lang === "es"
                    ? "Distribución de menciones por día de la semana y hora del día."
                    : "Distribution of mentions by day of week and hour of day."}
                </p>
                {result.heatmap.length > 0 ? (
                  <ActivityHeatmap heatmap={result.heatmap} days={days} />
                ) : (
                  <EmptyState
                    icon="🕐"
                    message={lang === "es"
                      ? "No hay datos de actividad para mostrar. Necesitas más menciones con fechas recientes."
                      : "No activity data to display. You need more mentions with recent dates."}
                  />
                )}
              </div>
            )}

            {/* ── SECTION: Influencers / Authors ────────────────── */}
            {activeSection === "influencers" && (
              <div style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 24,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <Users size={18} color="var(--accent)" />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                    {lang === "es" ? "Autores Principales" : "Top Authors"}
                  </h3>
                  <span style={{
                    marginLeft: "auto",
                    fontSize: 12, color: "var(--text-secondary)",
                    background: "var(--surface-2)",
                    padding: "3px 10px",
                    borderRadius: 99,
                  }}>
                    {result.metrics.uniqueAuthors} {lang === "es" ? "autores únicos" : "unique authors"}
                  </span>
                </div>

                {result.authors.length === 0 ? (
                  <EmptyState
                    icon="👥"
                    message={lang === "es"
                      ? "No se encontraron autores para esta keyword."
                      : "No authors found for this keyword."}
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {/* Table header */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 80px 100px 1fr 80px",
                      gap: 12,
                      padding: "8px 12px",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}>
                      <span>{lang === "es" ? "Autor" : "Author"}</span>
                      <span style={{ textAlign: "center" }}>Red</span>
                      <span style={{ textAlign: "center" }}>{lang === "es" ? "Menciones" : "Mentions"}</span>
                      <span style={{ textAlign: "center" }}>{lang === "es" ? "Sentimiento" : "Sentiment"}</span>
                      <span style={{ textAlign: "center" }}>{lang === "es" ? "Alcance" : "Reach"}</span>
                    </div>

                    {result.authors.map((author, i) => (
                      <div
                        key={i}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 80px 100px 1fr 80px",
                          gap: 12,
                          padding: "14px 12px",
                          borderBottom: "1px solid var(--border)",
                          alignItems: "center",
                        }}
                      >
                        {/* Author name */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: `${PLATFORM_COLORS[author.platform]}20`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 16, flexShrink: 0,
                          }}>
                            {author.platform === "instagram" ? "📸" : "📘"}
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                            {author.name}
                          </span>
                        </div>

                        {/* Platform */}
                        <span style={{
                          fontSize: 11,
                          padding: "3px 8px",
                          borderRadius: 99,
                          background: `${PLATFORM_COLORS[author.platform]}15`,
                          color: PLATFORM_COLORS[author.platform],
                          fontWeight: 600,
                          textAlign: "center",
                          textTransform: "capitalize",
                        }}>
                          {author.platform === "instagram" ? "IG" : "FB"}
                        </span>

                        {/* Mentions count */}
                        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>
                          {author.mentions}
                        </span>

                        {/* Sentiment bar */}
                        <div style={{ display: "flex", height: 8, borderRadius: 99, overflow: "hidden", gap: 1 }}>
                          {author.sentimentPositivePercent > 0 && (
                            <div style={{ flex: author.sentimentPositivePercent, background: SENTIMENT_COLORS.positive, borderRadius: 99 }} />
                          )}
                          {author.sentimentNeutralPercent > 0 && (
                            <div style={{ flex: author.sentimentNeutralPercent, background: SENTIMENT_COLORS.neutral }} />
                          )}
                          {author.sentimentNegativePercent > 0 && (
                            <div style={{ flex: author.sentimentNegativePercent, background: SENTIMENT_COLORS.negative, borderRadius: 99 }} />
                          )}
                        </div>

                        {/* Interactions */}
                        <span style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center" }}>
                          {formatNum(author.interactions)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state when no search yet */}
      {!result && !loading && !error && (
        <div style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "60px 24px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            {lang === "es" ? "Busca tu primera keyword" : "Search your first keyword"}
          </h3>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 440, margin: "0 auto" }}>
            {lang === "es"
              ? "Escribe una palabra clave, #hashtag o @cuenta y obtén análisis de sentimiento, volumen de menciones y temas principales generados con IA."
              : "Type a keyword, #hashtag or @account and get AI-powered sentiment analysis, mention volume, and main topics."}
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 40, flexWrap: "wrap" }}>
            {[
              { icon: "📊", label: lang === "es" ? "Volumen en el tiempo" : "Volume over time" },
              { icon: "😊", label: lang === "es" ? "Análisis de sentimiento" : "Sentiment analysis" },
              { icon: "💭", label: lang === "es" ? "Mapa de temas" : "Topic map" },
              { icon: "🔥", label: lang === "es" ? "Pico de actividad" : "Activity peak" },
            ].map(f => (
              <div key={f.icon} style={{ textAlign: "center", maxWidth: 120 }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{f.icon}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{f.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PostCard sub-component
───────────────────────────────────────────────────────────── */
function PostCard({ post }: { post: SearchResult["posts"][0] }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = post.text.length > 200;

  return (
    <div style={{
      background: "var(--surface-1)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: 20,
      transition: "border-color 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: PLATFORM_COLORS[post.platform] + "20",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, flexShrink: 0,
          }}>
            {post.platform === "instagram" ? "📸" : "📘"}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{post.author}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                fontSize: 11, padding: "1px 7px", borderRadius: 99,
                background: PLATFORM_COLORS[post.platform] + "20",
                color: PLATFORM_COLORS[post.platform],
                fontWeight: 600,
              }}>
                {post.platform}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>·</span>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{relativeTime(post.publishedAt)}</span>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>·</span>
              <span style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "capitalize" }}>
                {post.type}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SentimentBadge sentiment={post.sentiment} />
          {post.url && (
            <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-secondary)" }}>
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {/* Content */}
      <p style={{
        fontSize: 14,
        color: "var(--text-primary)",
        lineHeight: 1.6,
        marginBottom: 12,
      }}>
        {isLong && !expanded ? `${post.text.slice(0, 200)}...` : post.text}
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--accent)", fontSize: 13, marginLeft: 4,
            }}
          >
            {expanded ? " Ver menos" : " Ver más"}
          </button>
        )}
      </p>

      {/* Engagement */}
      {(post.likes > 0 || post.comments > 0 || post.shares > 0) && (
        <div style={{ display: "flex", gap: 16 }}>
          {post.likes > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-secondary)" }}>
              <Heart size={13} /> {formatNum(post.likes)}
            </span>
          )}
          {post.comments > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-secondary)" }}>
              <MessageCircle size={13} /> {formatNum(post.comments)}
            </span>
          )}
          {post.shares > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-secondary)" }}>
              <Share2 size={13} /> {formatNum(post.shares)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   EmptyState helper
───────────────────────────────────────────────────────────── */
function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      textAlign: "center",
      color: "var(--text-secondary)",
      gap: 12,
    }}>
      <span style={{ fontSize: 36 }}>{icon}</span>
      <p style={{ fontSize: 14, maxWidth: 380, lineHeight: 1.6 }}>{message}</p>
    </div>
  );
}
