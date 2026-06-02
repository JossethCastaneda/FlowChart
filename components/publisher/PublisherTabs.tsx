"use client";

import React, { useState, useEffect } from "react";
import { Composer } from "./Composer";
import { ScheduledCalendar } from "./ScheduledCalendar";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  Link2,
  Shield,
  Plug,
  ExternalLink,
  Check,
  RefreshCw,
  Globe,
  MessageSquare,
  BarChart2,
  Megaphone,
  Share2,
} from "lucide-react";

/* ── Module Connection Config ─────────────────────────────── */
const MODULES = [
  {
    key: "social",
    label: "Social Channels",
    description: "Publicar y gestionar contenido en Facebook e Instagram",
    icon: Share2,
    color: "#06d6a0",
    permissions: [
      "instagram_content_publish",
      "instagram_manage_contents",
      "pages_manage_posts",
      "pages_manage_engagement",
    ],
    usedBy: ["Publisher — Redactor", "Publisher — Calendario"],
  },
  {
    key: "ads",
    label: "Meta Ads Manager",
    description: "Gestionar campañas publicitarias, presupuestos y audiencias",
    icon: Megaphone,
    color: "#7b61ff",
    permissions: [
      "ads_management",
      "ads_read",
      "leads_retrieval",
    ],
    usedBy: ["Ads — Campañas", "Ads — Audiencias"],
  },
  {
    key: "analytics",
    label: "Analytics Engine",
    description: "Acceso a métricas de rendimiento, insights y datos de audiencia",
    icon: BarChart2,
    color: "#f472b6",
    permissions: [
      "read_insights",
      "instagram_manage_insights",
      "pages_read_engagement",
      "pages_read_user_content",
    ],
    usedBy: ["Analytics — Resumen", "Analytics — Posts", "Analytics — Audiencia"],
  },
  {
    key: "community",
    label: "Community Management",
    description: "Bandeja de entrada, mensajes directos, menciones y monitoreo social",
    icon: MessageSquare,
    color: "#a855f7",
    permissions: [
      "pages_messaging",
      "instagram_manage_messages",
      "instagram_manage_comments",
      "read_page_mailboxes",
    ],
    usedBy: ["Inbox — Conversaciones", "Listening — Menciones", "Streams — Columnas"],
  },
];

/* ── Integrations Tab ─────────────────────────────────────── */
function IntegrationsPanel() {
  const [statuses, setStatuses] = useState<Record<string, { connected: boolean; connectedAt: string | null; pages: any[] }>>({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/connect/status");
      if (res.ok) {
        const data = await res.json();
        setStatuses(data.modules || {});
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
    // Check if we just returned from OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) {
      window.history.replaceState({}, "", window.location.pathname);
      fetchStatus();
    }
  }, []);

  const handleConnect = (moduleKey: string) => {
    setConnecting(moduleKey);
    window.location.href = `/api/connect/${moduleKey}`;
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Loader2 style={{ width: 24, height: 24, color: "#64748b", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const totalPages = new Set(
    Object.values(statuses).flatMap(s => (s.pages || []).map((p: any) => p.id))
  );

  return (
    <div className="space-y-5">
      {/* Header summary */}
      <div className="glass-panel" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Plug style={{ width: 20, height: 20, color: "#00d4ff" }} />
          <div>
            <h3 style={{
              fontSize: 15, fontWeight: 700, color: "white", margin: 0,
              fontFamily: "'Orbitron', sans-serif",
            }}>
              Integraciones Meta
            </h3>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
              Conecta cada módulo con sus permisos específicos de Facebook
            </p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 16, fontSize: 11 }}>
            <span style={{ color: "#94a3b8" }}>
              <strong style={{ color: "#00d4ff" }}>{Object.values(statuses).filter(s => s.connected).length}</strong>
              /{MODULES.length} módulos
            </span>
            <span style={{ color: "#94a3b8" }}>
              <strong style={{ color: "#00d4ff" }}>{totalPages.size}</strong> páginas
            </span>
          </div>
        </div>

        {/* Quick status row */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {MODULES.map(mod => {
            const status = statuses[mod.key];
            const connected = status?.connected;
            return (
              <div
                key={mod.key}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 10px", borderRadius: 6,
                  background: connected ? `${mod.color}10` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${connected ? `${mod.color}25` : "rgba(255,255,255,0.06)"}`,
                }}
              >
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: connected ? mod.color : "#475569",
                  boxShadow: connected ? `0 0 6px ${mod.color}50` : "none",
                }} />
                <span style={{ fontSize: 11, color: connected ? mod.color : "#64748b", fontWeight: 500 }}>
                  {mod.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {MODULES.map(mod => {
          const status = statuses[mod.key];
          const connected = status?.connected;
          const Icon = mod.icon;
          const pages = status?.pages || [];

          return (
            <div
              key={mod.key}
              className="glass-panel"
              style={{
                padding: 0, overflow: "hidden",
                borderColor: connected ? `${mod.color}20` : undefined,
              }}
            >
              {/* Card header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "14px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                background: `${mod.color}06`,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: `${mod.color}12`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon style={{ width: 18, height: 18, color: mod.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "white" }}>
                    {mod.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {mod.description}
                  </div>
                </div>
                {connected ? (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "4px 8px", borderRadius: 6,
                    background: `${mod.color}12`,
                  }}>
                    <Check style={{ width: 12, height: 12, color: mod.color }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: mod.color }}>CONECTADO</span>
                  </div>
                ) : (
                  <div style={{
                    padding: "4px 8px", borderRadius: 6,
                    background: "rgba(255,255,255,0.04)",
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b" }}>PENDIENTE</span>
                  </div>
                )}
              </div>

              {/* Card body */}
              <div style={{ padding: "14px 18px" }}>
                {/* Permissions */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                    Permisos requeridos
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {mod.permissions.map(p => (
                      <span key={p} style={{
                        fontSize: 9, padding: "2px 6px", borderRadius: 4,
                        background: connected ? `${mod.color}08` : "rgba(255,255,255,0.04)",
                        color: connected ? mod.color : "#64748b",
                        fontFamily: "monospace",
                        border: `1px solid ${connected ? `${mod.color}15` : "rgba(255,255,255,0.06)"}`,
                      }}>
                        {connected && <span style={{ marginRight: 3 }}>✓</span>}
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Used by */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                    Usado por
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {mod.usedBy.map(u => (
                      <span key={u} style={{
                        fontSize: 10, padding: "3px 8px", borderRadius: 4,
                        background: "rgba(255,255,255,0.04)",
                        color: "#e2e8f0",
                      }}>
                        {u}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Connected pages */}
                {connected && pages.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                      Páginas conectadas ({pages.length})
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {pages.map((page: any) => (
                        <div key={page.id} style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "4px 10px", borderRadius: 6,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}>
                          {page.picture ? (
                            <img src={page.picture} alt="" style={{
                              width: 18, height: 18, borderRadius: "50%", objectFit: "cover",
                            }} />
                          ) : (
                            <div style={{
                              width: 18, height: 18, borderRadius: "50%",
                              background: `${mod.color}15`, fontSize: 8, fontWeight: 700,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: mod.color,
                            }}>
                              {page.name?.charAt(0) || "?"}
                            </div>
                          )}
                          <span style={{ fontSize: 11, color: "#e2e8f0" }}>{page.name}</span>
                          {page.instagramId && (
                            <span style={{ fontSize: 9, color: "#E4405F", fontWeight: 600 }}>+IG</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connect / Reconnect button */}
                <button
                  onClick={() => handleConnect(mod.key)}
                  disabled={connecting === mod.key}
                  style={{
                    width: "100%", padding: "10px 0", borderRadius: 8,
                    background: connected
                      ? "rgba(255,255,255,0.04)"
                      : `linear-gradient(135deg, ${mod.color}, ${mod.color}cc)`,
                    border: connected
                      ? "1px solid rgba(255,255,255,0.08)"
                      : "none",
                    color: connected ? "#94a3b8" : "#0a0a1a",
                    fontWeight: 600, fontSize: 12,
                    cursor: connecting === mod.key ? "wait" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    transition: "all 0.2s",
                    opacity: connecting === mod.key ? 0.6 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!connected) e.currentTarget.style.opacity = "0.9";
                    else e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.opacity = "1";
                    if (connected) e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  }}
                >
                  {connecting === mod.key ? (
                    <><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Conectando...</>
                  ) : connected ? (
                    <><RefreshCw style={{ width: 12, height: 12 }} /> Reconectar</>
                  ) : (
                    <><ExternalLink style={{ width: 14, height: 14 }} /> Conectar con Meta</>
                  )}
                </button>

                {/* Connected timestamp */}
                {connected && status?.connectedAt && (
                  <div style={{ textAlign: "center", fontSize: 10, color: "#475569", marginTop: 6 }}>
                    Conectado {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(status.connectedAt))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PUBLISHER TABS
   ══════════════════════════════════════════════════════════ */
const TABS = [
  { key: "composer", label: "Redactor" },
  { key: "calendar", label: "Calendario" },
  { key: "integrations", label: "Integraciones" },
];

export function PublisherTabs() {
  const [activeTab, setActiveTab] = useState("composer");

  // Auto-switch to integrations if redirected from OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) {
      setActiveTab("integrations");
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Tabs Navigation */}
      <div className="flex space-x-1 glass-panel p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-white/10 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
            style={activeTab === tab.key ? { boxShadow: "0 0 12px rgba(0,212,255,0.12)" } : {}}
          >
            {tab.key === "integrations" && (
              <Plug style={{ width: 13, height: 13, display: "inline", marginRight: 5, verticalAlign: "middle" }} />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-300">
        {activeTab === "composer" && <Composer />}
        {activeTab === "calendar" && <ScheduledCalendar />}
        {activeTab === "integrations" && <IntegrationsPanel />}
      </div>
    </div>
  );
}
