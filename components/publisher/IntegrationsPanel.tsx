"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, Bell, CheckCircle2, Circle, AlertTriangle, ChevronRight } from "lucide-react";

interface ModuleStatus {
  connected: boolean;
  connectedAt: string | null;
  pages: any[];
  tokenExpiresSoon?: boolean;
  daysUntilExpiry?: number;
}

const META_MODULES = [
  {
    key: "publisher_facebook",
    label: "Facebook Pages",
    icon: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
    color: "#1877F2",
    permissions: ["pages_manage_posts", "pages_read_engagement", "pages_manage_engagement"],
  },
  {
    key: "publisher_instagram",
    label: "Instagram Business",
    icon: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id="ig-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#833ab4" />
            <stop offset="50%" stopColor="#fd1d1d" />
            <stop offset="100%" stopColor="#fcb045" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-g)" fill="none" />
        <circle cx="12" cy="12" r="4" stroke="url(#ig-g)" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="#fcb045" />
      </svg>
    ),
    color: "#E4405F",
    permissions: ["instagram_content_publish", "instagram_basic", "instagram_manage_insights"],
  },
  {
    key: "ads",
    label: "Ads Manager",
    icon: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7b61ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    color: "#7b61ff",
    permissions: ["ads_management", "ads_read", "leads_retrieval"],
  },
  {
    key: "analytics",
    label: "Analytics",
    icon: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    color: "#f472b6",
    permissions: ["read_insights", "instagram_manage_insights", "pages_read_engagement"],
  },
  {
    key: "community",
    label: "Community",
    icon: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    color: "#a855f7",
    permissions: ["pages_messaging", "instagram_manage_messages", "read_page_mailboxes"],
  },
];

export function IntegrationsPanel() {
  const [statuses, setStatuses] = useState<Record<string, ModuleStatus>>({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/connect/status");
      if (res.ok) setStatuses((await res.json()).modules || {});
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
    const p = new URLSearchParams(window.location.search);
    if (p.get("connected")) { window.history.replaceState({}, "", window.location.pathname); fetchStatus(); }
  }, [fetchStatus]);

  const handleConnect = (key: string) => {
    setConnecting(key);
    const popup = window.open(`/api/connect/${key}`, "meta_connect", "width=520,height=660,scrollbars=yes");
    const poll = setInterval(() => {
      if (popup?.closed) { clearInterval(poll); setConnecting(null); fetchStatus(); }
    }, 800);
  };

  const connectedCount = Object.values(statuses).filter(s => s.connected).length;

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            height: 52, borderRadius: 8,
            background: "rgba(148,163,184,0.04)",
            animation: "fade-pulse 1.4s ease-in-out infinite",
            animationDelay: `${i * 0.1}s`,
          }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Summary bar ─── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderRadius: 8,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          Meta Integrations
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            fontSize: 11, color: connectedCount === META_MODULES.length ? "#06d6a0" : "#64748b",
            fontWeight: 500,
          }}>
            {connectedCount} / {META_MODULES.length} conectados
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {META_MODULES.map(mod => {
              const connected = !!statuses[mod.key]?.connected;
              return (
                <div key={mod.key} title={mod.label} style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: connected ? mod.color : "#1e293b",
                  boxShadow: connected ? `0 0 6px ${mod.color}80` : "none",
                  transition: "all 0.3s",
                }} />
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Module list ─── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {META_MODULES.map(mod => {
          const st = statuses[mod.key];
          const connected = !!st?.connected;
          const pages = st?.pages || [];
          const isExpanded = expanded === mod.key;
          const isConnecting = connecting === mod.key;
          const expiring = st?.tokenExpiresSoon;
          const Icon = mod.icon;

          return (
            <div key={mod.key} style={{
              borderRadius: 8, overflow: "hidden",
              border: `1px solid ${connected ? `${mod.color}18` : "rgba(255,255,255,0.05)"}`,
              background: connected ? `${mod.color}04` : "transparent",
              transition: "all 0.2s",
            }}>
              {/* Row */}
              <div style={{
                display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
              }}>
                {/* Icon */}
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: connected ? `${mod.color}12` : "rgba(255,255,255,0.04)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon />
                </div>

                {/* Label */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: connected ? "#e2e8f0" : "#475569" }}>
                      {mod.label}
                    </span>
                    {expiring && (
                      <span style={{
                        fontSize: 8, padding: "1px 5px", borderRadius: 2,
                        background: "rgba(255,190,11,0.1)", color: "#ffbe0b",
                        border: "1px solid rgba(255,190,11,0.2)", fontWeight: 700,
                      }}>
                        ⚠ exp. {st?.daysUntilExpiry}d
                      </span>
                    )}
                  </div>
                  {connected && pages.length > 0 && (
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>
                      {pages.map((p: any) => p.name).join(", ")}
                    </div>
                  )}
                </div>

                {/* Status icon */}
                <div style={{ flexShrink: 0 }}>
                  {connected
                    ? <CheckCircle2 style={{ width: 14, height: 14, color: mod.color }} />
                    : <Circle style={{ width: 14, height: 14, color: "#1e293b" }} />
                  }
                </div>

                {/* Action button */}
                <button
                  onClick={() => handleConnect(mod.key)}
                  disabled={isConnecting}
                  style={{
                    padding: "5px 12px", borderRadius: 6, flexShrink: 0,
                    background: connected ? "rgba(255,255,255,0.04)" : `${mod.color}cc`,
                    border: connected ? "1px solid rgba(255,255,255,0.08)" : "none",
                    color: connected ? "#475569" : "#fff",
                    fontSize: 10, fontWeight: 600, cursor: isConnecting ? "wait" : "pointer",
                    display: "flex", alignItems: "center", gap: 5,
                    transition: "all 0.15s", fontFamily: "inherit",
                    opacity: isConnecting ? 0.6 : 1,
                  }}
                >
                  {isConnecting
                    ? <Loader2 style={{ width: 10, height: 10, animation: "int-spin 1s linear infinite" }} />
                    : connected
                    ? <><RefreshCw style={{ width: 10, height: 10 }} /> Reconectar</>
                    : "Conectar"
                  }
                </button>

                {/* Expand toggle (only when connected + has pages) */}
                {connected && pages.length > 0 && (
                  <button
                    onClick={() => setExpanded(isExpanded ? null : mod.key)}
                    style={{
                      padding: 4, borderRadius: 4, background: "none", border: "none",
                      cursor: "pointer", color: "#334155",
                      display: "flex", alignItems: "center",
                    }}
                  >
                    <ChevronRight style={{
                      width: 13, height: 13,
                      transform: isExpanded ? "rotate(90deg)" : "none",
                      transition: "transform 0.2s",
                    }} />
                  </button>
                )}
              </div>

              {/* Expanded pages */}
              {isExpanded && pages.length > 0 && (
                <div style={{
                  padding: "0 14px 12px 54px",
                  display: "flex", flexDirection: "column", gap: 4,
                }}>
                  {pages.map((page: any) => (
                    <div key={page.id} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "5px 10px", borderRadius: 6,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%", overflow: "hidden",
                        flexShrink: 0, background: `${mod.color}15`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 8, color: mod.color, fontWeight: 700,
                      }}>
                        {page.picture
                          ? <img src={page.picture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : page.name?.charAt(0)
                        }
                      </div>
                      <span style={{ fontSize: 11, color: "#94a3b8", flex: 1 }}>{page.name}</span>
                      {page.instagram?.username && (
                        <span style={{ fontSize: 10, color: "#64748b" }}>@{page.instagram.username}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Webhook row ─── */}
      <WebhookRow connectedCount={connectedCount} />

      <style>{`
        @keyframes fade-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes int-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

function WebhookRow({ connectedCount }: { connectedCount: number }) {
  const [status, setStatus] = useState<any>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (connectedCount > 0) {
      fetch("/api/webhooks/subscribe")
        .then(r => r.ok ? r.json() : null)
        .then(d => d && setStatus(d))
        .catch(() => {});
    }
  }, [connectedCount]);

  const allOk = status?.subscriptions?.every((s: any) => s.subscribedFields?.length >= 5);

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      await fetch("/api/webhooks/subscribe", { method: "POST" });
      setDone(true);
    } catch { /* silent */ }
    setSubscribing(false);
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
      borderRadius: 8, border: `1px solid ${allOk ? "rgba(6,214,160,0.15)" : "rgba(255,190,11,0.12)"}`,
      background: allOk ? "rgba(6,214,160,0.03)" : "transparent",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
        background: allOk ? "rgba(6,214,160,0.1)" : "rgba(255,190,11,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Bell style={{ width: 13, height: 13, color: allOk ? "#06d6a0" : "#ffbe0b" }} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: allOk ? "#e2e8f0" : "#475569" }}>
          Webhooks en tiempo real
        </div>
        <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>
          {allOk ? "Alertas activas — 14 eventos monitoreados" : connectedCount === 0 ? "Requiere al menos un módulo conectado" : "Pendiente de configurar"}
        </div>
      </div>

      {allOk
        ? <CheckCircle2 style={{ width: 14, height: 14, color: "#06d6a0", flexShrink: 0 }} />
        : <AlertTriangle style={{ width: 14, height: 14, color: "#ffbe0b", flexShrink: 0 }} />
      }

      {!allOk && (
        <button
          onClick={handleSubscribe}
          disabled={subscribing || connectedCount === 0}
          style={{
            padding: "5px 12px", borderRadius: 6, flexShrink: 0,
            background: connectedCount === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,190,11,0.15)",
            border: "1px solid rgba(255,190,11,0.2)",
            color: connectedCount === 0 ? "#334155" : "#ffbe0b",
            fontSize: 10, fontWeight: 600, cursor: subscribing ? "wait" : connectedCount === 0 ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 5,
            fontFamily: "inherit", transition: "all 0.15s",
            opacity: connectedCount === 0 ? 0.4 : 1,
          }}
        >
          {subscribing
            ? <Loader2 style={{ width: 10, height: 10, animation: "int-spin 1s linear infinite" }} />
            : done ? "✓ Listo" : "Activar"
          }
        </button>
      )}
    </div>
  );
}
