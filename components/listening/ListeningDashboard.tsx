"use client";

import React, { useState, useEffect } from "react";

import {
  Search,
  TrendingUp,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Hash,
  Globe,
  Bell,
  Plus,
  X,
  AlertTriangle,
} from "lucide-react";

/* No demo data — real data loaded from API */

/* ── Sentiment helpers ─────────────────────────────────── */
const sentimentConfig = {
  positive: { color: "#00c875", icon: ThumbsUp, label: "Positivo" },
  negative: { color: "#e2445c", icon: ThumbsDown, label: "Negativo" },
  neutral: { color: "#94a3b8", icon: Minus, label: "Neutral" },
};

const platformColors: Record<string, string> = {
  instagram: "#E4405F",
  facebook: "#1877F2",
  tiktok: "#000000",
  twitter: "#1DA1F2",
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

/* ═══════════════════════════════════════════════════════
   LISTENING DASHBOARD
   ═══════════════════════════════════════════════════════ */
export function ListeningDashboard() {
  const [activeTab, setActiveTab] = useState<"search" | "mentions" | "sentiment" | "trends">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [trackedKeywords, setTrackedKeywords] = useState<any[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [mentions, setMentions] = useState<any[]>([]);

  // Fetch real mentions from API
  useEffect(() => {
    fetch("/api/listening/mentions")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.mentions?.length) {
          const mapped = data.mentions.map((m: any) => ({
            id: m.id,
            platform: m.platform,
            author: m.author,
            content: m.content,
            sentiment: m.sentiment || "neutral",
            time: relativeTime(m.publishedAt),
            avatar: null,
          }));
          setMentions(mapped);

        }
      })
      .catch(() => {});
  }, []);

  const tabs = [
    { key: "search", label: "Quick Search", icon: Search },
    { key: "mentions", label: "Menciones", icon: MessageCircle },
    { key: "sentiment", label: "Sentimiento", icon: ThumbsUp },
    { key: "trends", label: "Tendencias", icon: TrendingUp },
  ] as const;

  const filteredMentions = searchQuery
    ? mentions.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : mentions;

  // Sentiment counts
  const sentimentCounts = {
    positive: mentions.filter((m) => m.sentiment === "positive").length,
    negative: mentions.filter((m) => m.sentiment === "negative").length,
    neutral: mentions.filter((m) => m.sentiment === "neutral").length,
  };
  const totalMentions = mentions.length;

  return (
    <div className="space-y-4" style={{ paddingBottom: 40 }}>



      {/* Tabs */}
      <div className="flex space-x-1 glass-panel p-1 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.key
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <Icon style={{ width: 14, height: 14 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Quick Search ──────────────────────────── */}
      {activeTab === "search" && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="glass-panel p-4">
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#64748b" }} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar menciones, hashtags o keywords..."
                  style={{
                    width: "100%", padding: "10px 12px 10px 38px", borderRadius: 8,
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "white", fontSize: 14, outline: "none",
                  }}
                />
              </div>
              <button style={{
                padding: "10px 20px", borderRadius: 8, background: "#fb923c", color: "white",
                fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer",
              }}>
                Buscar
              </button>
            </div>
          </div>

          {/* Tracked Keywords */}
          <div className="glass-panel p-4">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "white" }}>Keywords Monitoreadas</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Agregar keyword..."
                  style={{
                    padding: "6px 10px", borderRadius: 6, background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)", color: "white", fontSize: 12, outline: "none",
                  }}
                />
                <button
                  onClick={() => {
                    if (newKeyword.trim()) {
                      setTrackedKeywords([...trackedKeywords, {
                        id: Date.now().toString(),
                        query: newKeyword.trim(),
                        type: newKeyword.startsWith("#") ? "hashtag" : "keyword",
                        mentions: 0,
                        sentiment: 50,
                      }]);
                      setNewKeyword("");
                    }
                  }}
                  style={{
                    padding: "6px 12px", borderRadius: 6, background: "rgba(251,146,60,0.15)",
                    border: "1px solid rgba(251,146,60,0.3)", color: "#fb923c", fontSize: 12,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  <Plus style={{ width: 12, height: 12 }} /> Agregar
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {trackedKeywords.map((kw) => (
                <div key={kw.id} style={{
                  padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)", position: "relative",
                }}>
                  <button
                    onClick={() => setTrackedKeywords(trackedKeywords.filter((k) => k.id !== kw.id))}
                    style={{
                      position: "absolute", top: 8, right: 8, background: "none", border: "none",
                      color: "#64748b", cursor: "pointer", padding: 2,
                    }}
                  >
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    {kw.type === "hashtag" ? (
                      <Hash style={{ width: 14, height: 14, color: "#fb923c" }} />
                    ) : kw.type === "competitor" ? (
                      <Globe style={{ width: 14, height: 14, color: "#e2445c" }} />
                    ) : (
                      <Search style={{ width: 14, height: 14, color: "#00d4ff" }} />
                    )}
                    <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{kw.query}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
                    <span>{kw.mentions.toLocaleString()} menciones</span>
                    <span style={{ color: kw.sentiment > 60 ? "#00c875" : kw.sentiment < 40 ? "#e2445c" : "#94a3b8" }}>
                      {kw.sentiment}% positivo
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent mentions */}
          <div className="glass-panel p-4">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 16 }}>Menciones Recientes</h3>
            <div className="space-y-2">
              {filteredMentions.slice(0, 5).map((m) => (
                <MentionCard key={m.id} mention={m} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Mentions ──────────────────────────────── */}
      {activeTab === "mentions" && (
        <div className="space-y-3">
          {mentions.map((m) => (
            <MentionCard key={m.id} mention={m} />
          ))}
        </div>
      )}

      {/* ── Tab: Sentiment ─────────────────────────────── */}
      {activeTab === "sentiment" && (
        <div className="space-y-4">
          {/* Sentiment Overview */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {(["positive", "negative", "neutral"] as const).map((key) => {
              const config = sentimentConfig[key];
              const Icon = config.icon;
              const count = sentimentCounts[key];
              const pct = Math.round((count / totalMentions) * 100);
              return (
                <div key={key} className="glass-panel" style={{ padding: 20, textAlign: "center" }}>
                  <Icon style={{ width: 28, height: 28, color: config.color, margin: "0 auto 8px" }} />
                  <div style={{ fontSize: 28, fontWeight: 700, color: config.color }}>{pct}%</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                    {config.label} · {count} menciones
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sentiment bar */}
          <div className="glass-panel p-4">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 12 }}>Distribución de Sentimiento</h3>
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 32 }}>
              <div style={{ width: `${(sentimentCounts.positive / totalMentions) * 100}%`, background: "#00c875", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white", fontWeight: 600 }}>
                {Math.round((sentimentCounts.positive / totalMentions) * 100)}%
              </div>
              <div style={{ width: `${(sentimentCounts.neutral / totalMentions) * 100}%`, background: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white", fontWeight: 600 }}>
                {Math.round((sentimentCounts.neutral / totalMentions) * 100)}%
              </div>
              <div style={{ width: `${(sentimentCounts.negative / totalMentions) * 100}%`, background: "#e2445c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white", fontWeight: 600 }}>
                {Math.round((sentimentCounts.negative / totalMentions) * 100)}%
              </div>
            </div>
          </div>

          {/* Mentions by sentiment */}
          <div className="glass-panel p-4">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 12 }}>Menciones por Sentimiento</h3>
            <div className="space-y-2">
              {mentions.map((m) => (
                <MentionCard key={m.id} mention={m} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Trends ────────────────────────────────── */}
      {activeTab === "trends" && (
        <div className="space-y-4">
          <div className="glass-panel p-4">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 16 }}>Tendencias Emergentes</h3>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: 40, gap: 10,
            }}>
              <TrendingUp style={{ width: 28, height: 28, color: "#334155" }} />
              <p style={{ fontSize: 12, color: "#64748b", textAlign: "center" }}>
                Las tendencias aparecerán cuando se conecten datos de monitoreo social
              </p>
            </div>
          </div>

          {/* Word Cloud placeholder */}
          <div className="glass-panel p-6" style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 16 }}>Nube de Palabras</h3>
            <div style={{
              display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 16px",
              padding: 20,
            }}>
              {["marketing", "digital", "social media", "contenido", "estrategia", "engagement", "redes", "publicidad", "marca", "audiencia", "crecimiento", "analytics", "influencer", "viral", "tendencia", "orgánico"].map((word, i) => {
                const s1 = ((Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1;
                const s2 = ((Math.sin(i * 269.5 + 183.3) * 43758.5453) % 1 + 1) % 1;
                const s3 = ((Math.sin(i * 419.2 + 71.9) * 43758.5453) % 1 + 1) % 1;
                return (
                <span key={word} style={{
                  fontSize: 12 + s1 * 20,
                  fontWeight: s2 > 0.5 ? 700 : 400,
                  color: `hsl(${25 + i * 8}, 80%, ${55 + s3 * 20}%)`,
                  opacity: 0.6 + s1 * 0.4,
                }}>
                  {word}
                </span>
                );
              })}
            </div>
          </div>

          {/* Alert setup */}
          <div className="glass-panel p-4">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "white" }}>Alertas de Picos</h3>
                <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Recibe notificaciones cuando haya un pico inusual de menciones</p>
              </div>
              <button style={{
                padding: "8px 16px", borderRadius: 8, background: "rgba(251,146,60,0.15)",
                border: "1px solid rgba(251,146,60,0.3)", color: "#fb923c", fontSize: 12,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              }}>
                <Bell style={{ width: 14, height: 14 }} /> Configurar Alertas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Mention Card ──────────────────────────────────────── */
function MentionCard({ mention }: { mention: any }) {
  const config = sentimentConfig[mention.sentiment as keyof typeof sentimentConfig];
  const SentIcon = config.icon;
  const platformColor = platformColors[mention.platform] || "#64748b";

  return (
    <div style={{
      display: "flex", gap: 12, padding: "12px 14px", borderRadius: 10,
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
      transition: "background 0.2s",
    }}>
      {/* Avatar with initials */}
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: `${platformColor}20`, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 13, fontWeight: 600, color: platformColor,
      }}>
        {mention.author.charAt(0).toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>@{mention.author}</span>
          <span style={{
            fontSize: 10, padding: "2px 6px", borderRadius: 4,
            background: `${platformColor}20`, color: platformColor,
          }}>
            {mention.platform}
          </span>
          <span style={{ fontSize: 11, color: "#64748b", marginLeft: "auto" }}>{mention.time}</span>
        </div>
        <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5 }}>{mention.content}</p>
      </div>

      {/* Sentiment badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4, padding: "4px 8px",
        borderRadius: 6, background: `${config.color}10`, alignSelf: "center", flexShrink: 0,
      }}>
        <SentIcon style={{ width: 12, height: 12, color: config.color }} />
        <span style={{ fontSize: 10, color: config.color }}>{config.label}</span>
      </div>
    </div>
  );
}
