"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, Bell } from "lucide-react";

/* ─── Types ─── */
interface ModuleStatus {
  connected: boolean;
  connectedAt: string | null;
  pages: any[];
  tokenExpiresSoon?: boolean;
  daysUntilExpiry?: number;
}

/* ─── Module definitions ─── */
const META_MODULES = [
  {
    key: "publisher_facebook",
    label: "Facebook Pages",
    shortLabel: "FB",
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
    color: "#1877F2",
    glowColor: "rgba(24,119,242,0.25)",
    bgColor: "rgba(24,119,242,0.06)",
    description: "Publicar posts, fotos y videos en Páginas de Facebook",
    permissions: ["pages_manage_posts", "pages_read_engagement", "pages_manage_engagement"],
    usedBy: ["Redactor", "Calendario", "Historial"],
  },
  {
    key: "publisher_instagram",
    label: "Instagram Business",
    shortLabel: "IG",
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id="ig-grad2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#833ab4" />
            <stop offset="50%" stopColor="#fd1d1d" />
            <stop offset="100%" stopColor="#fcb045" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="url(#ig-grad2)" fill="none" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" stroke="url(#ig-grad2)" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="url(#ig-grad2)" />
      </svg>
    ),
    color: "#E4405F",
    glowColor: "rgba(228,64,95,0.25)",
    bgColor: "rgba(228,64,95,0.06)",
    description: "Publicar Reels, Stories e imágenes en Instagram Business",
    permissions: ["instagram_content_publish", "instagram_basic", "instagram_manage_insights"],
    usedBy: ["Redactor", "Calendario", "Historial"],
  },
  {
    key: "ads",
    label: "Meta Ads Manager",
    shortLabel: "ADS",
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7b61ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    color: "#7b61ff",
    glowColor: "rgba(123,97,255,0.25)",
    bgColor: "rgba(123,97,255,0.06)",
    description: "Campañas, conjuntos de anuncios, presupuestos y audiencias",
    permissions: ["ads_management", "ads_read", "leads_retrieval"],
    usedBy: ["Ads Manager"],
  },
  {
    key: "analytics",
    label: "Analytics Engine",
    shortLabel: "STATS",
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    color: "#f472b6",
    glowColor: "rgba(244,114,182,0.25)",
    bgColor: "rgba(244,114,182,0.06)",
    description: "Métricas de rendimiento, insights orgánicos y audiencia",
    permissions: ["read_insights", "instagram_manage_insights", "pages_read_engagement"],
    usedBy: ["Analytics"],
  },
  {
    key: "community",
    label: "Community Mgmt",
    shortLabel: "MSG",
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    color: "#a855f7",
    glowColor: "rgba(168,85,247,0.25)",
    bgColor: "rgba(168,85,247,0.06)",
    description: "Inbox, mensajes, comentarios, menciones y monitoreo",
    permissions: ["pages_messaging", "instagram_manage_messages", "read_page_mailboxes"],
    usedBy: ["Inbox", "Listening", "Streams"],
  },
];

/* ─── Animated connection dot ─── */
function ConnectionDot({ connected, color }: { connected: boolean; color: string }) {
  return (
    <div style={{ position: "relative", width: 10, height: 10, flexShrink: 0 }}>
      <div style={{
        width: 10, height: 10, borderRadius: "50%",
        background: connected ? color : "#1e293b",
        boxShadow: connected ? `0 0 10px ${color}80, 0 0 20px ${color}40` : "none",
        transition: "all 0.4s ease",
      }} />
      {connected && (
        <div style={{
          position: "absolute", inset: -3, borderRadius: "50%",
          border: `2px solid ${color}`, opacity: 0.3,
          animation: "dot-ripple 2s ease-out infinite",
        }} />
      )}
    </div>
  );
}

/* ─── Main IntegrationsPanel ─── */
export function IntegrationsPanel() {
  const [statuses, setStatuses] = useState<Record<string, ModuleStatus>>({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/connect/status");
      if (res.ok) {
        const json = await res.json();
        setStatuses(json.modules || {});
      }
    } catch {
      /* silent */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) {
      window.history.replaceState({}, "", window.location.pathname);
      fetchStatus();
    }
  }, [fetchStatus]);

  const handleConnect = (moduleKey: string) => {
    setConnecting(moduleKey);
    const popup = window.open(
      `/api/connect/${moduleKey}`,
      "meta_connect",
      "width=520,height=660,scrollbars=yes,resizable=yes"
    );
    const poll = setInterval(() => {
      if (popup?.closed) {
        clearInterval(poll);
        setConnecting(null);
        fetchStatus();
      }
    }, 800);
  };

  const connectedCount = Object.values(statuses).filter(s => s.connected).length;
  const allPages = new Map<string, any>();
  Object.values(statuses).forEach(s => (s.pages || []).forEach((p: any) => allPages.set(p.id, p)));

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{
            height: 72, borderRadius: 12,
            background: "rgba(148,163,184,0.04)",
            animation: "int-pulse 1.5s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
          }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── HERO STATUS STRIP ─────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "stretch", gap: 0,
        borderRadius: 12, overflow: "hidden",
        border: "1px solid rgba(0,212,255,0.12)",
        background: "linear-gradient(135deg, rgba(0,212,255,0.03), transparent)",
      }}>
        {/* Connected counter */}
        <div style={{
          padding: "16px 22px", borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column", justifyContent: "center", gap: 2,
        }}>
          <div style={{
            fontFamily: "Orbitron, sans-serif", fontSize: 30, fontWeight: 900, lineHeight: 1,
            color: connectedCount > 0 ? "#00d4ff" : "#1e293b",
            textShadow: connectedCount > 0 ? "0 0 24px rgba(0,212,255,0.5)" : "none",
            transition: "all 0.4s",
          }}>
            {connectedCount}
            <span style={{ fontSize: 16, color: "#334155", fontWeight: 600 }}>
              /{META_MODULES.length}
            </span>
          </div>
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600 }}>
            módulos activos
          </div>
        </div>

        {/* Module dots row */}
        <div style={{ flex: 1, padding: "12px 20px", display: "flex", alignItems: "center", gap: 16 }}>
          {META_MODULES.map(mod => {
            const st = statuses[mod.key];
            return (
              <div key={mod.key} title={`${mod.label}: ${st?.connected ? "Conectado" : "Sin conectar"}`}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <ConnectionDot connected={!!st?.connected} color={mod.color} />
                <span style={{ fontSize: 7, color: "#334155", letterSpacing: "0.1em", fontWeight: 700 }}>
                  {mod.shortLabel}
                </span>
              </div>
            );
          })}
        </div>

        {/* Pages counter */}
        <div style={{
          padding: "16px 22px", borderLeft: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end", gap: 2,
        }}>
          <div style={{
            fontFamily: "Orbitron, sans-serif", fontSize: 26, fontWeight: 900, lineHeight: 1,
            color: allPages.size > 0 ? "#06d6a0" : "#1e293b",
            textShadow: allPages.size > 0 ? "0 0 20px rgba(6,214,160,0.4)" : "none",
          }}>
            {allPages.size}
          </div>
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600 }}>
            páginas
          </div>
        </div>
      </div>

      {/* ── MODULE CARDS ─────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {META_MODULES.map(mod => {
          const st = statuses[mod.key];
          const connected = !!st?.connected;
          const pages = st?.pages || [];
          const expiring = st?.tokenExpiresSoon;
          const daysLeft = st?.daysUntilExpiry;
          const isExpanded = expandedKey === mod.key;
          const Icon = mod.icon;

          return (
            <div key={mod.key} style={{
              borderRadius: 10, overflow: "hidden",
              background: connected ? mod.bgColor : "rgba(255,255,255,0.01)",
              border: `1px solid ${connected ? `${mod.color}25` : "rgba(255,255,255,0.06)"}`,
              transition: "all 0.25s ease",
              boxShadow: connected ? `inset 0 0 60px ${mod.color}04` : "none",
            }}>
              {/* ── Card header row ── */}
              <div
                onClick={() => setExpandedKey(isExpanded ? null : mod.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "13px 16px", cursor: "pointer",
                  borderBottom: isExpanded ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 42, height: 42, borderRadius: 9, flexShrink: 0,
                  background: connected ? `${mod.color}15` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${connected ? `${mod.color}30` : "rgba(255,255,255,0.08)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: connected ? `0 0 20px ${mod.glowColor}` : "none",
                  transition: "all 0.25s",
                }}>
                  <Icon />
                </div>

                {/* Text block */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: connected ? "#e2e8f0" : "#64748b" }}>
                      {mod.label}
                    </span>
                    {connected && (
                      <span style={{
                        fontSize: 8, fontWeight: 700, letterSpacing: "0.14em",
                        padding: "2px 7px", borderRadius: 2, textTransform: "uppercase",
                        background: `${mod.color}18`, color: mod.color,
                        border: `1px solid ${mod.color}35`,
                      }}>ONLINE</span>
                    )}
                    {expiring && (
                      <span style={{
                        fontSize: 8, fontWeight: 700, letterSpacing: "0.12em",
                        padding: "2px 7px", borderRadius: 2, textTransform: "uppercase",
                        background: "rgba(255,190,11,0.12)", color: "#ffbe0b",
                        border: "1px solid rgba(255,190,11,0.28)",
                      }}>⚠ EXPIRA {daysLeft}d</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#475569" }}>{mod.description}</div>

                  {/* Permission badges (when connected) */}
                  {connected && (
                    <div style={{ display: "flex", gap: 3, marginTop: 5, flexWrap: "wrap" }}>
                      {mod.permissions.map(p => (
                        <span key={p} style={{
                          fontSize: 8, padding: "2px 5px", borderRadius: 2, fontFamily: "monospace",
                          background: `${mod.color}08`, color: `${mod.color}bb`,
                          border: `1px solid ${mod.color}18`,
                        }}>✓ {p}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: page avatars + dot + chevron */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {pages.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {pages.slice(0, 3).map((page: any, i: number) => (
                        <div key={page.id} title={page.name} style={{
                          width: 22, height: 22, borderRadius: "50%", overflow: "hidden",
                          border: `2px solid ${mod.color}40`,
                          marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i, position: "relative",
                          background: `${mod.color}18`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 8, color: mod.color, fontWeight: 700,
                        }}>
                          {page.picture
                            ? <img src={page.picture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : page.name?.charAt(0)
                          }
                        </div>
                      ))}
                      {pages.length > 3 && (
                        <div style={{
                          width: 22, height: 22, borderRadius: "50%",
                          marginLeft: -8, position: "relative", zIndex: 0,
                          background: "rgba(255,255,255,0.08)",
                          border: "2px solid rgba(255,255,255,0.15)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 8, color: "#64748b", fontWeight: 700,
                        }}>+{pages.length - 3}</div>
                      )}
                    </div>
                  )}

                  <ConnectionDot connected={connected} color={mod.color} />

                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2"
                    style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {/* ── Expanded panel ── */}
              {isExpanded && (
                <div style={{ padding: "14px 16px" }}>
                  {/* Pages list */}
                  {pages.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{
                        fontSize: 9, color: "#475569", letterSpacing: "0.15em",
                        textTransform: "uppercase", marginBottom: 8, fontWeight: 700,
                      }}>
                        PÁGINAS CONECTADAS ({pages.length})
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {pages.map((page: any) => (
                          <div key={page.id} style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "8px 12px", borderRadius: 7,
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: "50%", overflow: "hidden",
                              border: `1.5px solid ${mod.color}30`, flexShrink: 0,
                              background: `${mod.color}12`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 11, color: mod.color, fontWeight: 700,
                            }}>
                              {page.picture
                                ? <img src={page.picture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : page.name?.charAt(0)
                              }
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500 }}>{page.name}</div>
                              <div style={{ fontSize: 9, color: "#475569", fontFamily: "monospace" }}>
                                ID: {page.id}
                              </div>
                            </div>
                            {page.instagram && (
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#E4405F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                                </svg>
                                <span style={{ fontSize: 9, color: "#E4405F" }}>@{page.instagram.username}</span>
                              </div>
                            )}
                            <div style={{
                              width: 6, height: 6, borderRadius: "50%",
                              background: "#06d6a0",
                              boxShadow: "0 0 6px rgba(6,214,160,0.5)",
                            }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Required scopes (not connected) */}
                  {!connected && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{
                        fontSize: 9, color: "#475569", letterSpacing: "0.15em",
                        textTransform: "uppercase", marginBottom: 8, fontWeight: 700,
                      }}>PERMISOS REQUERIDOS</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {mod.permissions.map(p => (
                          <span key={p} style={{
                            fontSize: 9, padding: "3px 8px", borderRadius: 3, fontFamily: "monospace",
                            background: "rgba(255,255,255,0.03)", color: "#475569",
                            border: "1px solid rgba(255,255,255,0.07)",
                          }}>{p}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CTA row */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleConnect(mod.key)}
                      disabled={connecting === mod.key}
                      style={{
                        flex: 1, padding: "10px 14px", borderRadius: 8,
                        background: connected
                          ? "rgba(255,255,255,0.04)"
                          : `linear-gradient(135deg, ${mod.color}ee, ${mod.color}99)`,
                        border: connected ? "1px solid rgba(255,255,255,0.08)" : "none",
                        color: connected ? "#64748b" : "#050812",
                        fontSize: 11, fontWeight: 700, cursor: connecting === mod.key ? "wait" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                        fontFamily: "inherit", letterSpacing: "0.06em",
                        boxShadow: !connected ? `0 4px 20px ${mod.color}40` : "none",
                        transition: "all 0.2s",
                      }}
                    >
                      {connecting === mod.key ? (
                        <><Loader2 style={{ width: 13, height: 13, animation: "int-spin 1s linear infinite" }} /> Conectando...</>
                      ) : connected ? (
                        <><RefreshCw style={{ width: 12, height: 12 }} /> Reconectar</>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                          Conectar con Meta
                        </>
                      )}
                    </button>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "0 12px", borderRadius: 8, fontSize: 10, color: "#475569",
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      {mod.usedBy.join(", ")}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── WEBHOOK SECTION ─────────────────────────────── */}
      <WebhookSection connectedCount={connectedCount} />

      <style>{`
        @keyframes dot-ripple {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes int-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes int-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* ─── Webhook section ─── */
function WebhookSection({ connectedCount }: { connectedCount: number }) {
  const [status, setStatus] = useState<any>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/webhooks/subscribe");
      if (res.ok) setStatus(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => { if (connectedCount > 0) fetchStatus(); }, [connectedCount, fetchStatus]);

  const handleSubscribe = async () => {
    setSubscribing(true);
    setResult(null);
    try {
      const res = await fetch("/api/webhooks/subscribe", { method: "POST" });
      setResult(await res.json());
      fetchStatus();
    } catch (err: any) {
      setResult({ error: err.message });
    }
    setSubscribing(false);
  };

  const allOk = status?.subscriptions?.every((s: any) => s.subscribedFields?.length >= 5);

  const EVENTS = [
    { label: "Mensajes Messenger", color: "#0084ff" }, { label: "Instagram DMs", color: "#E1306C" },
    { label: "Comentarios FB", color: "#1877F2" }, { label: "Comentarios IG", color: "#F77737" },
    { label: "Menciones", color: "#06d6a0" }, { label: "Reacciones", color: "#fbbf24" },
    { label: "Leads", color: "#a855f7" }, { label: "Story Replies", color: "#E1306C" },
    { label: "Campañas Ads", color: "#7b61ff" }, { label: "Rechazados", color: "#ef4444" },
    { label: "Presupuesto", color: "#f97316" }, { label: "WhatsApp", color: "#25D366" },
    { label: "Reseñas", color: "#fbbf24" }, { label: "Postbacks", color: "#00d4ff" },
  ];

  const statusColor = allOk ? "#06d6a0" : "#ffbe0b";
  const statusBg = allOk ? "rgba(6,214,160," : "rgba(255,190,11,";

  return (
    <div style={{
      borderRadius: 10, overflow: "hidden",
      background: "rgba(255,255,255,0.01)",
      border: `1px solid ${allOk ? "rgba(6,214,160,0.2)" : "rgba(255,190,11,0.15)"}`,
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 14,
          padding: "13px 16px", background: "transparent", border: "none",
          cursor: "pointer", fontFamily: "inherit",
          borderBottom: expanded ? "1px solid rgba(255,255,255,0.04)" : "none",
        }}
      >
        <div style={{
          width: 42, height: 42, borderRadius: 9, flexShrink: 0,
          background: `${statusBg}0.1)`, border: `1px solid ${statusBg}0.25)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 16px ${statusBg}0.12)`,
        }}>
          <Bell style={{ width: 17, height: 17, color: statusColor }} />
        </div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 2 }}>
            Webhooks &amp; Alertas en Tiempo Real
          </div>
          <div style={{ fontSize: 10, color: "#475569" }}>
            {allOk
              ? `${EVENTS.length} eventos activos — recibiendo alertas de Meta`
              : connectedCount === 0 ? "Conecta al menos un módulo primero" : "Webhooks pendientes de configurar"
            }
          </div>
        </div>
        <div style={{
          padding: "4px 10px", borderRadius: 4, flexShrink: 0,
          background: `${statusBg}0.1)`, border: `1px solid ${statusBg}0.28)`,
          fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
          color: statusColor, display: "flex", alignItems: "center", gap: 5,
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: "50%", background: statusColor,
            boxShadow: `0 0 6px ${statusColor}`,
          }} />
          {allOk ? "ACTIVO" : "PENDIENTE"}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2"
          style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div style={{ padding: "16px" }}>
          {/* URL + Token */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { label: "CALLBACK URL", value: status?.callbackUrl || "https://sodare.xyz/api/webhooks/meta", color: "#00d4ff" },
              { label: "VERIFY TOKEN", value: status?.verifyToken || "sodare_webhook_verify_2026", color: "#a855f7" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>
                  {label}
                </div>
                <div style={{
                  padding: "7px 11px", borderRadius: 6, wordBreak: "break-all",
                  background: `${color}06`, border: `1px solid ${color}18`,
                  fontSize: 10, fontFamily: "monospace", color,
                }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Subscriptions */}
          {status?.subscriptions?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
                SUSCRIPCIONES POR PÁGINA
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {status.subscriptions.map((sub: any, i: number) => {
                  const ok = sub.subscribedFields?.length > 0;
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "7px 11px", borderRadius: 6,
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                        background: ok ? "#06d6a0" : "#ef4444",
                        boxShadow: `0 0 6px ${ok ? "#06d6a060" : "#ef444460"}`,
                      }} />
                      <span style={{ fontSize: 12, color: "#e2e8f0", flex: 1 }}>{sub.pageName}</span>
                      <span style={{
                        fontSize: 9, padding: "2px 7px", borderRadius: 3, fontWeight: 700,
                        background: ok ? "rgba(6,214,160,0.1)" : "rgba(239,68,68,0.1)",
                        color: ok ? "#06d6a0" : "#ef4444",
                        border: `1px solid ${ok ? "rgba(6,214,160,0.25)" : "rgba(239,68,68,0.25)"}`,
                      }}>
                        {sub.subscribedFields?.length || 0} campos
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Events */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
              EVENTOS MONITOREADOS ({EVENTS.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {EVENTS.map(e => (
                <span key={e.label} style={{
                  fontSize: 9, padding: "3px 8px", borderRadius: 3,
                  background: `${e.color}08`, color: e.color, border: `1px solid ${e.color}18`,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
                  {e.label}
                </span>
              ))}
            </div>
          </div>

          {/* Subscribe button */}
          <button
            onClick={handleSubscribe}
            disabled={subscribing || connectedCount === 0}
            style={{
              width: "100%", padding: "11px", borderRadius: 8, fontFamily: "inherit",
              background: subscribing || connectedCount === 0
                ? "rgba(255,255,255,0.03)"
                : "linear-gradient(135deg, #ffbe0bdd, #f97316bb)",
              border: subscribing || connectedCount === 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
              color: subscribing || connectedCount === 0 ? "#475569" : "#050812",
              fontWeight: 700, fontSize: 12, letterSpacing: "0.06em",
              cursor: subscribing ? "wait" : connectedCount === 0 ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              boxShadow: connectedCount > 0 && !subscribing ? "0 4px 20px rgba(255,190,11,0.3)" : "none",
              opacity: connectedCount === 0 ? 0.4 : 1,
            }}
          >
            {subscribing
              ? <><Loader2 style={{ width: 13, height: 13, animation: "int-spin 1s linear infinite" }} /> Configurando...</>
              : <><Bell style={{ width: 13, height: 13 }} /> Activar Todas las Alertas</>
            }
          </button>

          {result && (
            <div style={{
              marginTop: 10, padding: "10px 14px", borderRadius: 7,
              background: result.success ? "rgba(6,214,160,0.06)" : "rgba(239,68,68,0.06)",
              border: `1px solid ${result.success ? "rgba(6,214,160,0.2)" : "rgba(239,68,68,0.2)"}`,
              fontSize: 11, color: result.success ? "#06d6a0" : "#ef4444",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background: result.success ? "#06d6a0" : "#ef4444",
              }} />
              {result.success
                ? `Webhooks configurados — ${result.subscriptions?.filter((s: any) => s.success).length || 0} suscripciones activas`
                : `Error: ${result.error || "No se pudieron configurar los webhooks"}`
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}
