"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, TrendingUp, MessageCircle, ThumbsUp, ThumbsDown, Minus, Hash, Globe,
  Bell, Plus, X, AlertTriangle, Loader2, ExternalLink, Heart, Eye
} from "lucide-react";
import { useLanguage } from "@/components/layout/LanguageContext";

/* ── Sentiment helpers ─────────────────────────────────── */
const sentimentConfig = {
  positive: { color: "#00c875", icon: ThumbsUp, labelEs: "Positivo", labelEn: "Positive" },
  negative: { color: "#e2445c", icon: ThumbsDown, labelEs: "Negativo", labelEn: "Negative" },
  neutral: { color: "var(--text-secondary)", icon: Minus, labelEs: "Neutral", labelEn: "Neutral" },
};

const platformColors: Record<string, string> = {
  instagram: "#E4405F",
  facebook: "#1877F2",
  tiktok: "#000000",
  twitter: "#1DA1F2",
};

function relativeTime(dateStr: string, lang: "es" | "en"): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === "es" ? "Ahora" : "Just now";
  if (mins < 60) return lang === "es" ? `Hace ${mins}m` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return lang === "es" ? `Hace ${hrs}h` : `${hrs}h ago`;
  return lang === "es" ? `Hace ${Math.floor(hrs / 24)}d` : `${Math.floor(hrs / 24)}d ago`;
}

// Client-side rule-based sentiment classifier
function analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
  const lower = (text || "").toLowerCase();
  const positiveWords = [
    "excelente", "bueno", "buena", "gracias", "love", "genial", "increible", "súper", "super", 
    "maravilloso", "felicidades", "me encanta", "gusto", "exito", "great", "awesome", "perfect",
    "recomiendo", "recomendado", "top", "lindo", "bella", "hermoso", "crack", "feliz", "alegre"
  ];
  const negativeWords = [
    "malo", "pesimo", "pesima", "horrible", "error", "falla", "hate", "peor", "basura", "asco",
    "fallando", "lento", "roto", "estafa", "decepcion", "problema", "queja", "malisimo", "malisima",
    "inutil", "no funciona", "defecto", "duda", "tarde", "caro"
  ];

  let score = 0;
  for (const word of positiveWords) {
    if (lower.includes(word)) score++;
  }
  for (const word of negativeWords) {
    if (lower.includes(word)) score--;
  }

  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

const TRANSLATIONS = {
  es: {
    quickSearch: "Búsqueda Rápida",
    mentions: "Menciones",
    sentiment: "Sentimiento",
    trends: "Tendencias",
    searchPlaceholder: "Buscar menciones, hashtags o keywords...",
    searchBtn: "Buscar",
    monitoredKw: "Keywords Monitoreadas",
    kwPlaceholder: "#hashtag, keyword o @competidor",
    addBtn: "Agregar",
    emptyKw: "Agrega keywords, #hashtags o @competidores para monitorear",
    recentMentions: "Menciones Recientes",
    noMentionsTitle: "No se encontraron menciones",
    noMentionsDesc: "Las menciones de Facebook e Instagram aparecerán aquí automáticamente.",
    sentimentDistribution: "Distribución de Sentimiento",
    mentionsBySentiment: "Menciones por Sentimiento",
    monitoredHashtags: "Hashtags Monitoreados",
    trendsPrompt: "Agrega un hashtag en Búsqueda Rápida para monitorear tendencias",
    updateBtn: "Actualizar",
    viewPostsBtn: "Ver posts",
    noHashtagPosts: "Sin posts recientes para este hashtag",
    wordCloud: "Nube de Palabras",
    spikeAlertsTitle: "Alertas de Picos",
    spikeAlertsDesc: "Recibe notificaciones cuando haya un pico inusual de menciones",
    configureAlertsBtn: "Configurar Alertas",
    alertsConfiguredMsg: "✅ Alertas configuradas. Recibirás una notificación cuando haya un pico de menciones.",
  },
  en: {
    quickSearch: "Quick Search",
    mentions: "Mentions",
    sentiment: "Sentiment",
    trends: "Trends",
    searchPlaceholder: "Search mentions, hashtags or keywords...",
    searchBtn: "Search",
    monitoredKw: "Monitored Keywords",
    kwPlaceholder: "#hashtag, keyword or @competitor",
    addBtn: "Add",
    emptyKw: "Add keywords, #hashtags or @competitors to monitor",
    recentMentions: "Recent Mentions",
    noMentionsTitle: "No mentions found",
    noMentionsDesc: "Facebook and Instagram mentions will appear here automatically.",
    sentimentDistribution: "Sentiment Distribution",
    mentionsBySentiment: "Mentions by Sentiment",
    monitoredHashtags: "Monitored Hashtags",
    trendsPrompt: "Add a hashtag in Quick Search to monitor trends",
    updateBtn: "Update",
    viewPostsBtn: "View posts",
    noHashtagPosts: "No recent posts for this hashtag",
    wordCloud: "Word Cloud",
    spikeAlertsTitle: "Spike Alerts",
    spikeAlertsDesc: "Receive notifications when there is an unusual spike in mentions",
    configureAlertsBtn: "Configure Alerts",
    alertsConfiguredMsg: "✅ Alerts configured. You will receive a notification when a spike in mentions occurs.",
  }
};

/* ═══════════════════════════════════════════════════════
   LISTENING DASHBOARD
   ═══════════════════════════════════════════════════════ */
export function ListeningDashboard() {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];

  const [activeTab, setActiveTab] = useState<"search" | "mentions" | "sentiment" | "trends">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [trackedKeywords, setTrackedKeywords] = useState<any[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [mentions, setMentions] = useState<any[]>([]);
  const [loadingKw, setLoadingKw] = useState(true);
  const [addingKw, setAddingKw] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [hashtagPosts, setHashtagPosts] = useState<Record<string, any[]>>({});
  const [loadingHashtag, setLoadingHashtag] = useState<string | null>(null);

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

  // Fetch mentions from API
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
            sentiment: m.sentiment || analyzeSentiment(m.content),
            time: relativeTime(m.publishedAt, lang),
            avatar: null,
          }));
          setMentions(mapped);
        } else {
          setMentions([]);
        }
      })
      .catch(() => {
        setMentions([]);
      });
  }, [lang]);

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
    { key: "search" as const, label: t.quickSearch, icon: Search },
    { key: "mentions" as const, label: t.mentions, icon: MessageCircle },
    { key: "sentiment" as const, label: t.sentiment, icon: ThumbsUp },
    { key: "trends" as const, label: t.trends, icon: TrendingUp },
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
  const totalMentions = mentions.length || 1;

  // Hashtag keywords
  const hashtagKeywords = trackedKeywords.filter((k) => k.type === "hashtag");

  return (
    <div className="space-y-4" style={{ paddingBottom: 40 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "10px 18px",
          borderRadius: 8, background: "var(--cyan-dim)", border: "1px solid var(--border-strong)",
          color: "var(--cyan)", fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          animation: "page-fade-in 0.2s ease-out",
        }}>
          {toast}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "var(--surface)", border: "1px solid var(--border)", padding: 4, borderRadius: 12, width: "fit-content" }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
                border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                background: activeTab === tab.key ? "var(--surface-hover)" : "transparent",
                color: activeTab === tab.key ? "var(--cyan)" : "var(--text-secondary)",
                transition: "all 0.15s"
              }}
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
          <div className="glass-panel" style={{ padding: 16 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--text-muted)" }} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  style={{
                    width: "100%", padding: "10px 12px 10px 38px", borderRadius: 8,
                    background: "var(--surface-hover)", border: "1px solid var(--border)",
                    color: "var(--foreground)", fontSize: 14, outline: "none",
                  }}
                />
              </div>
              <button className="btn-primary" style={{ padding: "10px 24px" }}>
                {t.searchBtn}
              </button>
            </div>
          </div>

          {/* Tracked Keywords */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", fontFamily: "'Orbitron',sans-serif" }}>
                {t.monitoredKw}
                {loadingKw && <Loader2 style={{ width: 12, height: 12, display: "inline-block", marginLeft: 8, animation: "spin 1s linear infinite", color: "var(--text-muted)" }} />}
              </h3>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                  placeholder={t.kwPlaceholder}
                  style={{
                    padding: "6px 10px", borderRadius: 6, background: "var(--surface-hover)",
                    border: "1px solid var(--border)", color: "var(--foreground)", fontSize: 12, outline: "none",
                    width: 220,
                  }}
                />
                <button
                  onClick={addKeyword}
                  disabled={addingKw}
                  style={{
                    padding: "6px 14px", borderRadius: 6, background: "var(--cyan-dim)",
                    border: "1px solid var(--border-strong)", color: "var(--cyan)", fontSize: 12, fontWeight: 700,
                    cursor: addingKw ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 4,
                    opacity: addingKw ? 0.6 : 1,
                  }}
                >
                  {addingKw ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Plus style={{ width: 12, height: 12 }} />}
                  {t.addBtn}
                </button>
              </div>
            </div>

            {trackedKeywords.length === 0 && !loadingKw && (
              <div style={{ padding: "24px 16px", textAlign: "center" }}>
                <Hash style={{ width: 24, height: 24, color: "var(--text-muted)", margin: "0 auto 8px" }} />
                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {t.emptyKw}
                </p>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {trackedKeywords.map((kw) => (
                <div key={kw.id} style={{
                  padding: 14, borderRadius: 10, background: "var(--surface-hover)",
                  border: "1px solid var(--border)", position: "relative",
                }}>
                  <button
                    onClick={() => removeKeyword(kw.id)}
                    style={{
                      position: "absolute", top: 8, right: 8, background: "none", border: "none",
                      color: "var(--text-secondary)", cursor: "pointer", padding: 2,
                    }}
                  >
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    {kw.type === "hashtag" ? (
                      <Hash style={{ width: 14, height: 14, color: "var(--amber)" }} />
                    ) : kw.type === "competitor" ? (
                      <Globe style={{ width: 14, height: 14, color: "var(--red)" }} />
                    ) : (
                      <Search style={{ width: 14, height: 14, color: "var(--cyan)" }} />
                    )}
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{kw.query}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)" }}>
                    <span style={{ textTransform: "capitalize" }}>{kw.type}</span>
                    <span>{new Date(kw.createdAt).toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { day: "numeric", month: "short" })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent mentions */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 16, fontFamily: "'Orbitron',sans-serif" }}>
              {t.recentMentions}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredMentions.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center" }}>
                  <MessageCircle style={{ width: 32, height: 32, color: "var(--text-muted)", margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 13, color: "var(--foreground)", margin: 0, fontWeight: 600 }}>
                    {t.noMentionsTitle}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                    {t.noMentionsDesc}
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
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mentions.length === 0 ? (
            <div className="glass-panel" style={{ padding: "48px 16px", textAlign: "center" }}>
              <MessageCircle style={{ width: 36, height: 36, color: "var(--text-muted)", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{t.noMentionsTitle}</p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>
                {t.noMentionsDesc}
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {(["positive", "negative", "neutral"] as const).map((key) => {
              const config = sentimentConfig[key];
              const Icon = config.icon;
              const count = sentimentCounts[key];
              const pct = mentions.length > 0 ? Math.round((count / mentions.length) * 100) : 0;
              const label = lang === "es" ? config.labelEs : config.labelEn;
              return (
                <div key={key} className="glass-panel" style={{ padding: 20, textAlign: "center" }}>
                  <Icon style={{ width: 28, height: 28, color: config.color, margin: "0 auto 8px" }} />
                  <div style={{ fontSize: 28, fontWeight: 800, color: config.color, fontFamily: "'Orbitron',sans-serif" }}>{pct}%</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                    {label} · {count} {lang === "es" ? "menciones" : "mentions"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sentiment bar */}
          {mentions.length > 0 && (
            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 12, fontFamily: "'Orbitron',sans-serif" }}>
                {t.sentimentDistribution}
              </h3>
              <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 32 }}>
                <div style={{ width: `${(sentimentCounts.positive / mentions.length) * 100}%`, background: "#00c875", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white", fontWeight: 700 }}>
                  {Math.round((sentimentCounts.positive / mentions.length) * 100)}%
                </div>
                <div style={{ width: `${(sentimentCounts.neutral / mentions.length) * 100}%`, background: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white", fontWeight: 700 }}>
                  {Math.round((sentimentCounts.neutral / mentions.length) * 100)}%
                </div>
                <div style={{ width: `${(sentimentCounts.negative / mentions.length) * 100}%`, background: "#e2445c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white", fontWeight: 700 }}>
                  {Math.round((sentimentCounts.negative / mentions.length) * 100)}%
                </div>
              </div>
            </div>
          )}

          {/* Mentions by sentiment */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 16, fontFamily: "'Orbitron',sans-serif" }}>
              {t.mentionsBySentiment}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {mentions.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center" }}>
                  <MessageCircle style={{ width: 32, height: 32, color: "var(--text-muted)", margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 13, color: "var(--foreground)", margin: 0, fontWeight: 600 }}>{t.noMentionsTitle}</p>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>{t.noMentionsDesc}</p>
                </div>
              ) : (
                mentions.map((m) => (
                  <MentionCard key={m.id} mention={m} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Trends ────────────────────────────────── */}
      {activeTab === "trends" && (
        <div className="space-y-4">
          {/* Monitored Hashtags */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 16, fontFamily: "'Orbitron',sans-serif" }}>
              <Hash style={{ width: 14, height: 14, display: "inline-block", marginRight: 6, color: "var(--amber)" }} />
              {t.monitoredHashtags}
            </h3>

            {hashtagKeywords.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center" }}>
                <Hash style={{ width: 28, height: 28, color: "var(--text-muted)", margin: "0 auto 8px" }} />
                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {t.trendsPrompt}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {hashtagKeywords.map((kw) => {
                  const q = kw.query.replace(/^#/, "");
                  const posts = hashtagPosts[q];
                  const isLoading = loadingHashtag === q;
                  return (
                    <div key={kw.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                      {/* Hashtag header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--amber)" }}>{kw.query}</span>
                        <button
                          onClick={() => fetchHashtagPosts(kw.query)}
                          disabled={isLoading}
                          style={{
                            padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                            background: "var(--cyan-dim)", border: "1px solid var(--border-strong)",
                            color: "var(--cyan)", cursor: isLoading ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit"
                          }}
                        >
                          {isLoading ? <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} /> : <Eye style={{ width: 11, height: 11 }} />}
                          {posts ? t.updateBtn : t.viewPostsBtn}
                        </button>
                      </div>

                      {/* Hashtag posts grid */}
                      {posts && posts.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                          {posts.slice(0, 8).map((p: any) => (
                            <div key={p.id} style={{
                              padding: 12, borderRadius: 8, background: "var(--surface-hover)",
                              border: "1px solid var(--border)", fontSize: 12, display: "flex", flexDirection: "column", gap: 8
                            }}>
                              <p style={{ color: "var(--foreground)", lineHeight: 1.4, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {p.caption || "(sin texto)"}
                              </p>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-secondary)", fontSize: 10, marginTop: "auto" }}>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                    <Heart style={{ width: 10, height: 10 }} /> {p.likes}
                                  </span>
                                  <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                    <MessageCircle style={{ width: 10, height: 10 }} /> {p.comments}
                                  </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <span>{relativeTime(p.timestamp, lang)}</span>
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
                        <p style={{ fontSize: 11, color: "var(--text-secondary)", padding: "8px 0" }}>{t.noHashtagPosts}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Word Cloud from mention content */}
          <div className="glass-panel" style={{ padding: 20, textAlign: "center" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 16, fontFamily: "'Orbitron',sans-serif" }}>
              {t.wordCloud}
            </h3>
            <div style={{
              display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 16px",
              padding: 10,
            }}>
              {(() => {
                const stopWords = new Set(["de","la","el","en","y","a","los","las","del","un","una","por","con","para","que","es","se","with","the","and","for","your"]);
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
                  return (
                    <div style={{ padding: "24px 16px", textAlign: "center", width: "100%" }}>
                      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        {lang === "es" ? "No hay suficientes datos para generar la nube de palabras." : "Not enough data to generate the word cloud."}
                      </p>
                    </div>
                  );
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
          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", fontFamily: "'Orbitron',sans-serif" }}>{t.spikeAlertsTitle}</h3>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{t.spikeAlertsDesc}</p>
              </div>
              <button
                onClick={() => {
                  localStorage.setItem("sodare_spike_alerts", "true");
                  showToast(t.alertsConfiguredMsg);
                }}
                style={{
                  padding: "8px 16px", borderRadius: 8, background: "var(--cyan-dim)",
                  border: "1px solid var(--border-strong)", color: "var(--cyan)", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit"
                }}
              >
                <Bell style={{ width: 14, height: 14 }} /> {t.configureAlertsBtn}
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
  const { lang } = useLanguage();
  const config = sentimentConfig[mention.sentiment as keyof typeof sentimentConfig] || sentimentConfig.neutral;
  const SentIcon = config.icon;
  const platformColor = platformColors[mention.platform] || "#64748b";
  const label = lang === "es" ? config.labelEs : config.labelEn;

  return (
    <div style={{
      display: "flex", gap: 12, padding: "12px 14px", borderRadius: 10,
      background: "var(--surface)", border: "1px solid var(--border)",
      transition: "background 0.2s",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: `${platformColor}15`, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 13, fontWeight: 700, color: platformColor,
      }}>
        {mention.author.charAt(0).toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>@{mention.author}</span>
          <span style={{
            fontSize: 10, padding: "2px 6px", borderRadius: 4,
            background: "var(--cyan-dim)", color: "var(--cyan)", fontWeight: 700
          }}>
            {mention.platform}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>{mention.time}</span>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>{mention.content}</p>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 4, padding: "4px 8px",
        borderRadius: 6, background: `${config.color}15`, alignSelf: "center", flexShrink: 0,
      }}>
        <SentIcon style={{ width: 12, height: 12, color: config.color }} />
        <span style={{ fontSize: 10, color: config.color, fontWeight: 700 }}>{label}</span>
      </div>
    </div>
  );
}
