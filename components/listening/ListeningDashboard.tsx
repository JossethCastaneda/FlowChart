"use client";

import React, { useState, useEffect, useCallback } from "react";

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
  Loader2,
  ExternalLink,
  Heart,
  Eye,
} from "lucide-react";

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
  const [loadingKw, setLoadingKw] = useState(true);
  const [addingKw, setAddingKw] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Hashtag monitoring state
  const [hashtagPosts, setHashtagPosts] = useState<Record<string, any[]>>({});
  const [loadingHashtag, setLoadingHashtag] = useState<string | null>(null);

  // Show toast for 3 seconds
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Fetch tracked keywords from DB
  useEffect(() => {
    fetch("/api/listening/keywords")
      .then((r) => r.json())
      .then((data) => setTrackedKeywords(data.keywords || []))
      .catch(() => {})
      .finally(() => setLoadingKw(false));
  }, []);

  // Fetch real mentions from API
  useEffect(() => {
    fetch("/api/listening/mentions")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
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

  /* ── Keyword CRUD ── */
  const addKeyword = async () => {
    const q = newKeyword.trim();
    if (!q || addingKw) return;
    const type = q.startsWith("#") ? "hashtag" : q.startsWith("@") ? "competitor" : "keyword";
    setAddingKw(true);
    try {
      const res = await fetch("/api/listening/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, type }),
      });
      const data = await res.json();
      if (data.keyword) {
        setTrackedKeywords((prev) => [...prev, data.keyword]);
        setNewKeyword("");
      }
    } catch {}
    setAddingKw(false);
  };

  const removeKeyword = async (id: string) => {
    setTrackedKeywords((prev) => prev.filter((k) => k.id !== id));
    await fetch(`/api/listening/keywords/${id}`, { method: "DELETE" }).catch(() => {});
  };

  /* ── Hashtag fetch ── */
  const fetchHashtagPosts = async (hashtag: string) => {
    const q = hashtag.replace(/^#/, "");
    setLoadingHashtag(q);
    try {
      const res = await fetch(`/api/listening/hashtags?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setHashtagPosts((prev) => ({ ...prev, [q]: data.posts || [] }));
      if (data.error) showToast(data.error);
    } catch {}
    setLoadingHashtag(null);
  };

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
  const totalMentions = mentions.length || 1; // avoid /0

  // Hashtag keywords
  const hashtagKeywords = trackedKeywords.filter((k) => k.type === "hashtag");

  return (
    <div className="space-y-4" style={{ paddingBottom: 40 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "10px 18px",
          borderRadius: 8, background: "rgba(0,200,117,0.15)", border: "1px solid rgba(0,200,117,0.3)",
          color: "#00c875", fontSize: 13, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          animation: "page-fade-in 0.2s ease-out",
        }}>
          {toast}
        </div>
      )}

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
                    background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.08)",
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
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "white" }}>
                Keywords Monitoreadas
                {loadingKw && <Loader2 style={{ width: 12, height: 12, display: "inline", marginLeft: 8, animation: "spin 1s linear infinite", color: "#64748b" }} />}
              </h3>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                  placeholder="#hashtag, keyword o @competidor"
                  style={{
                    padding: "6px 10px", borderRadius: 6, background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.08)", color: "white", fontSize: 12, outline: "none",
                    width: 220,
                  }}
                />
                <button
                  onClick={addKeyword}
                  disabled={addingKw}
                  style={{
                    padding: "6px 12px", borderRadius: 6, background: "rgba(251,146,60,0.15)",
                    border: "1px solid rgba(251,146,60,0.3)", color: "#fb923c", fontSize: 12,
                    cursor: addingKw ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 4,
                    opacity: addingKw ? 0.6 : 1,
                  }}
                >
                  {addingKw ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Plus style={{ width: 12, height: 12 }} />}
                  Agregar
                </button>
              </div>
            </div>

            {trackedKeywords.length === 0 && !loadingKw && (
              <div style={{ padding: "24px 16px", textAlign: "center" }}>
                <Hash style={{ width: 24, height: 24, color: "#334155", margin: "0 auto 8px" }} />
                <p style={{ fontSize: 12, color: "#64748b" }}>
                  Agrega keywords, #hashtags o @competidores para monitorear
                </p>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {trackedKeywords.map((kw) => (
                <div key={kw.id} style={{
                  padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)", position: "relative",
                }}>
                  <button
                    onClick={() => removeKeyword(kw.id)}
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
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b" }}>
                    <span style={{ textTransform: "capitalize" }}>{kw.type}</span>
                    <span>{new Date(kw.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent mentions */}
          <div className="glass-panel p-4">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 16 }}>Menciones Recientes</h3>
            <div className="space-y-2">
              {filteredMentions.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center" }}>
                  <MessageCircle style={{ width: 32, height: 32, color: "rgba(148,163,184,0.65)", margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                    No se encontraron menciones.
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(148,163,184,0.65)", marginTop: 4 }}>
                    Las menciones de Facebook e Instagram aparecerán aquí automáticamente.
                  </p>
                </div>
              ) : (
                filteredMentions.slice(0, 5).map((m) => (
                  <MentionCard key={m.id} mention={m} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Mentions ──────────────────────────────── */}
      {activeTab === "mentions" && (
        <div className="space-y-3">
          {mentions.length === 0 ? (
            <div className="glass-panel" style={{ padding: "48px 16px", textAlign: "center" }}>
              <MessageCircle style={{ width: 36, height: 36, color: "rgba(148,163,184,0.22)", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.6)", margin: 0 }}>Sin menciones aún</p>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                Cuando alguien te mencione o te etiquete en Facebook o Instagram, aparecerá aquí.
              </p>
            </div>
          ) : (
            mentions.map((m) => (
              <MentionCard key={m.id} mention={m} />
            ))
          )}
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
              const pct = mentions.length > 0 ? Math.round((count / mentions.length) * 100) : 0;
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
          {mentions.length > 0 && (
            <div className="glass-panel p-4">
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 12 }}>Distribución de Sentimiento</h3>
              <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 32 }}>
                <div style={{ width: `${(sentimentCounts.positive / mentions.length) * 100}%`, background: "#00c875", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white", fontWeight: 600 }}>
                  {Math.round((sentimentCounts.positive / mentions.length) * 100)}%
                </div>
                <div style={{ width: `${(sentimentCounts.neutral / mentions.length) * 100}%`, background: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white", fontWeight: 600 }}>
                  {Math.round((sentimentCounts.neutral / mentions.length) * 100)}%
                </div>
                <div style={{ width: `${(sentimentCounts.negative / mentions.length) * 100}%`, background: "#e2445c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white", fontWeight: 600 }}>
                  {Math.round((sentimentCounts.negative / mentions.length) * 100)}%
                </div>
              </div>
            </div>
          )}

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
          {/* Monitored Hashtags */}
          <div className="glass-panel p-4">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 16 }}>
              <Hash style={{ width: 14, height: 14, display: "inline", marginRight: 6, color: "#fb923c" }} />
              Hashtags Monitoreados
            </h3>

            {hashtagKeywords.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center" }}>
                <Hash style={{ width: 28, height: 28, color: "#334155", margin: "0 auto 8px" }} />
                <p style={{ fontSize: 12, color: "#64748b" }}>
                  Agrega un hashtag en <button onClick={() => setActiveTab("search")} style={{ background: "none", border: "none", color: "#fb923c", cursor: "pointer", fontWeight: 600 }}>Quick Search</button> para monitorear tendencias
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {hashtagKeywords.map((kw) => {
                  const q = kw.query.replace(/^#/, "");
                  const posts = hashtagPosts[q];
                  const isLoading = loadingHashtag === q;
                  return (
                    <div key={kw.id}>
                      {/* Hashtag header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#fb923c" }}>{kw.query}</span>
                        <button
                          onClick={() => fetchHashtagPosts(kw.query)}
                          disabled={isLoading}
                          style={{
                            padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                            background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.2)",
                            color: "#fb923c", cursor: isLoading ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", gap: 4,
                          }}
                        >
                          {isLoading ? <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} /> : <Eye style={{ width: 11, height: 11 }} />}
                          {posts ? "Actualizar" : "Ver posts"}
                        </button>
                      </div>

                      {/* Hashtag posts grid */}
                      {posts && posts.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                          {posts.slice(0, 8).map((p: any) => (
                            <div key={p.id} style={{
                              padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.06)", fontSize: 11,
                            }}>
                              <p style={{ color: "#cbd5e1", lineHeight: 1.4, marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {p.caption || "(sin texto)"}
                              </p>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748b", fontSize: 10 }}>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                    <Heart style={{ width: 10, height: 10 }} /> {p.likes}
                                  </span>
                                  <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                    <MessageCircle style={{ width: 10, height: 10 }} /> {p.comments}
                                  </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <span>{relativeTime(p.timestamp)}</span>
                                  {p.permalink && (
                                    <a href={p.permalink} target="_blank" rel="noopener noreferrer" style={{ color: "#E4405F" }}>
                                      <ExternalLink style={{ width: 10, height: 10 }} />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {posts && posts.length === 0 && !isLoading && (
                        <p style={{ fontSize: 11, color: "#475569", padding: "8px 0" }}>Sin posts recientes para este hashtag</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Word Cloud from mention content */}
          <div className="glass-panel p-6" style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 16 }}>Nube de Palabras</h3>
            <div style={{
              display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 16px",
              padding: 20,
            }}>
              {(() => {
                // Extract words from real mentions
                const stopWords = new Set(["de","la","el","en","y","a","los","las","del","un","una","por","con","para","que","es","se"]);
                const words: Record<string, number> = {};
                mentions.forEach((m) => {
                  m.content.toLowerCase().split(/\s+/).forEach((w: string) => {
                    const clean = w.replace(/[^a-záéíóúñü#@]/g, "");
                    if (clean.length > 2 && !stopWords.has(clean)) {
                      words[clean] = (words[clean] || 0) + 1;
                    }
                  });
                });
                const sorted = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 20);
                const maxCount = sorted[0]?.[1] || 1;

                if (sorted.length === 0) {
                  // Fallback static words
                  return ["marketing", "digital", "social media", "contenido", "estrategia", "engagement", "redes", "publicidad", "marca", "audiencia"].map((word, i) => {
                    const s1 = ((Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1;
                    return (
                      <span key={word} style={{
                        fontSize: 12 + s1 * 16, fontWeight: s1 > 0.5 ? 700 : 400,
                        color: `hsl(25, 80%, ${55 + s1 * 20}%)`, opacity: 0.5 + s1 * 0.5,
                      }}>
                        {word}
                      </span>
                    );
                  });
                }

                return sorted.map(([word, count], i) => {
                  const size = 12 + (count / maxCount) * 20;
                  const hue = 25 + i * 12;
                  return (
                    <span key={word} style={{
                      fontSize: size, fontWeight: count > maxCount * 0.5 ? 700 : 400,
                      color: `hsl(${hue}, 80%, ${55 + (count / maxCount) * 15}%)`,
                      opacity: 0.6 + (count / maxCount) * 0.4,
                    }}>
                      {word}
                    </span>
                  );
                });
              })()}
            </div>
          </div>

          {/* Alert setup */}
          <div className="glass-panel p-4">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "white" }}>Alertas de Picos</h3>
                <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Recibe notificaciones cuando haya un pico inusual de menciones</p>
              </div>
              <button
                onClick={() => {
                  localStorage.setItem("sodare_spike_alerts", "true");
                  showToast("✅ Alertas configuradas. Recibirás una notificación cuando haya un pico de menciones.");
                }}
                style={{
                  padding: "8px 16px", borderRadius: 8, background: "rgba(251,146,60,0.15)",
                  border: "1px solid rgba(251,146,60,0.3)", color: "#fb923c", fontSize: 12,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                }}
              >
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
  const config = sentimentConfig[mention.sentiment as keyof typeof sentimentConfig] || sentimentConfig.neutral;
  const SentIcon = config.icon;
  const platformColor = platformColors[mention.platform] || "#64748b";

  return (
    <div style={{
      display: "flex", gap: 12, padding: "12px 14px", borderRadius: 10,
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
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
