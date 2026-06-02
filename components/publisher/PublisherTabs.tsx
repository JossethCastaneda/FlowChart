"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Composer } from "./Composer";
import { ScheduledCalendar } from "./ScheduledCalendar";
import { InboxLayout } from "@/components/inbox/InboxLayout";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { ListeningDashboard } from "@/components/listening/ListeningDashboard";
import { StreamsDashboard } from "@/components/streams/StreamsDashboard";
import {
  CheckCircle,
  Loader2,
  Plug,
  ExternalLink,
  Check,
  RefreshCw,
  MessageSquare,
  BarChart3,
  Megaphone,
  Share2,
  Zap,
  Calendar,
  Ear,
  Columns3,
  Filter,
  ChevronDown,
  X,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════ */

export interface PublisherFilters {
  canal: string;
  cliente: string;
  vertical: string;
}

/* ══════════════════════════════════════════════════════════
   FILTER OPTIONS
   ══════════════════════════════════════════════════════════ */

const CANALES = ["Todos", "Facebook", "Instagram", "TikTok", "LinkedIn", "X (Twitter)", "Email"];
const VERTICALES = [
  "Todos", "E-commerce", "Salud", "Educación", "Finanzas",
  "Tecnología", "Moda", "Alimentos", "Entretenimiento", "Deportes", "Servicios",
];

/* ══════════════════════════════════════════════════════════
   FILTER DROPDOWN
   ══════════════════════════════════════════════════════════ */

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  color,
  isTextInput,
}: {
  label: string;
  value: string;
  options?: string[];
  onChange: (v: string) => void;
  color: string;
  isTextInput?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isActive = value !== "Todos" && value !== "";

  if (isTextInput) {
    return (
      <div style={{ position: "relative" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 10px", borderRadius: 6,
          background: isActive ? `${color}10` : "rgba(255,255,255,0.03)",
          border: `1px solid ${isActive ? `${color}30` : "rgba(255,255,255,0.06)"}`,
        }}>
          <span style={{ fontSize: 10, color: "#64748b", whiteSpace: "nowrap" }}>{label}:</span>
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Buscar..."
            style={{
              background: "none", border: "none", outline: "none",
              color: "white", fontSize: 11, width: 100,
            }}
          />
          {isActive && (
            <button onClick={() => onChange("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <X style={{ width: 10, height: 10, color: "#64748b" }} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 10px", borderRadius: 6,
          background: isActive ? `${color}10` : "rgba(255,255,255,0.03)",
          border: `1px solid ${isActive ? `${color}30` : "rgba(255,255,255,0.06)"}`,
          cursor: "pointer", fontSize: 11, color: isActive ? color : "#e2e8f0",
          transition: "all 0.15s",
        }}
      >
        <span style={{ fontSize: 10, color: "#64748b" }}>{label}:</span>
        <span style={{ fontWeight: isActive ? 600 : 400 }}>{value}</span>
        <ChevronDown style={{
          width: 10, height: 10, color: "#64748b",
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.15s",
        }} />
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 98 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0,
            minWidth: 160, borderRadius: 8, overflow: "hidden",
            background: "rgba(15,15,30,0.98)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            zIndex: 99,
          }}>
            {(options || []).map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", padding: "8px 12px",
                  background: value === opt ? `${color}08` : "transparent",
                  border: "none", cursor: "pointer",
                  fontSize: 11, color: value === opt ? color : "#e2e8f0",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (value !== opt) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (value !== opt) e.currentTarget.style.background = "transparent"; }}
              >
                {value === opt && <Check style={{ width: 10, height: 10 }} />}
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   FILTERS BAR
   ══════════════════════════════════════════════════════════ */

function FiltersBar({
  filters,
  onChange,
}: {
  filters: PublisherFilters;
  onChange: (f: PublisherFilters) => void;
}) {
  const activeCount = [
    filters.canal !== "Todos" ? 1 : 0,
    filters.cliente !== "" ? 1 : 0,
    filters.vertical !== "Todos" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const resetAll = () => onChange({ canal: "Todos", cliente: "", vertical: "Todos" });

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 12px", borderRadius: 8,
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.04)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        color: activeCount > 0 ? "#00d4ff" : "#475569",
        fontSize: 11, fontWeight: 600,
      }}>
        <Filter style={{ width: 12, height: 12 }} />
        Filtros
        {activeCount > 0 && (
          <span style={{
            padding: "1px 5px", borderRadius: 10, fontSize: 9,
            background: "rgba(0,212,255,0.15)", color: "#00d4ff", fontWeight: 700,
          }}>
            {activeCount}
          </span>
        )}
      </div>

      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />

      <FilterDropdown
        label="Canal" value={filters.canal} options={CANALES}
        onChange={v => onChange({ ...filters, canal: v })} color="#00d4ff"
      />
      <FilterDropdown
        label="Cliente" value={filters.cliente || "Todos"}
        onChange={v => onChange({ ...filters, cliente: v === "Todos" ? "" : v })}
        color="#06d6a0" isTextInput
      />
      <FilterDropdown
        label="Vertical" value={filters.vertical} options={VERTICALES}
        onChange={v => onChange({ ...filters, vertical: v })} color="#f472b6"
      />

      {activeCount > 0 && (
        <button
          onClick={resetAll}
          style={{
            marginLeft: "auto", padding: "4px 8px", borderRadius: 4,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "#94a3b8", fontSize: 10, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          <X style={{ width: 10, height: 10 }} /> Limpiar
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   INTEGRATIONS PANEL  (Meta module connection cards)
   ══════════════════════════════════════════════════════════ */

const META_MODULES = [
  {
    key: "social", label: "Social Channels", icon: Share2, color: "#06d6a0",
    description: "Publicar y gestionar contenido en Facebook e Instagram",
    permissions: ["instagram_content_publish", "instagram_manage_contents", "pages_manage_posts", "pages_manage_engagement"],
    usedBy: ["Redactor", "Calendario"],
  },
  {
    key: "ads", label: "Meta Ads Manager", icon: Megaphone, color: "#7b61ff",
    description: "Gestionar campañas publicitarias, presupuestos y audiencias",
    permissions: ["ads_management", "ads_read", "leads_retrieval"],
    usedBy: ["Ads — Campañas"],
  },
  {
    key: "analytics", label: "Analytics Engine", icon: BarChart3, color: "#f472b6",
    description: "Acceso a métricas de rendimiento, insights y datos de audiencia",
    permissions: ["read_insights", "instagram_manage_insights", "pages_read_engagement"],
    usedBy: ["Analytics — Resumen", "Analytics — Posts", "Analytics — Audiencia"],
  },
  {
    key: "community", label: "Community Management", icon: MessageSquare, color: "#a855f7",
    description: "Bandeja de entrada, mensajes directos, menciones y monitoreo social",
    permissions: ["pages_messaging", "instagram_manage_messages", "instagram_manage_comments", "read_page_mailboxes"],
    usedBy: ["Inbox", "Listening", "Streams"],
  },
];

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

  const connectedCount = Object.values(statuses).filter(s => s.connected).length;
  const totalPages = new Set(Object.values(statuses).flatMap(s => (s.pages || []).map((p: any) => p.id)));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass-panel" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Plug style={{ width: 20, height: 20, color: "#00d4ff" }} />
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "white", margin: 0, fontFamily: "'Orbitron', sans-serif" }}>
              Integraciones Meta
            </h3>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Conecta cada módulo con sus permisos específicos</p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 16, fontSize: 11 }}>
            <span style={{ color: "#94a3b8" }}><strong style={{ color: "#00d4ff" }}>{connectedCount}</strong>/{META_MODULES.length} módulos</span>
            <span style={{ color: "#94a3b8" }}><strong style={{ color: "#00d4ff" }}>{totalPages.size}</strong> páginas</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {META_MODULES.map(mod => {
            const connected = statuses[mod.key]?.connected;
            return (
              <div key={mod.key} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 10px", borderRadius: 6,
                background: connected ? `${mod.color}10` : "rgba(255,255,255,0.03)",
                border: `1px solid ${connected ? `${mod.color}25` : "rgba(255,255,255,0.06)"}`,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: connected ? mod.color : "#475569",
                  boxShadow: connected ? `0 0 6px ${mod.color}50` : "none",
                }} />
                <span style={{ fontSize: 11, color: connected ? mod.color : "#64748b", fontWeight: 500 }}>{mod.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {META_MODULES.map(mod => {
          const status = statuses[mod.key];
          const connected = status?.connected;
          const Icon = mod.icon;
          const pages = status?.pages || [];
          return (
            <div key={mod.key} className="glass-panel" style={{ padding: 0, overflow: "hidden", borderColor: connected ? `${mod.color}20` : undefined }}>
              {/* Header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.04)", background: `${mod.color}06`,
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${mod.color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon style={{ width: 18, height: 18, color: mod.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{mod.label}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{mod.description}</div>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "4px 8px", borderRadius: 6,
                  background: connected ? `${mod.color}12` : "rgba(255,255,255,0.04)",
                }}>
                  {connected && <Check style={{ width: 12, height: 12, color: mod.color }} />}
                  <span style={{ fontSize: 10, fontWeight: 600, color: connected ? mod.color : "#64748b" }}>
                    {connected ? "CONECTADO" : "PENDIENTE"}
                  </span>
                </div>
              </div>
              {/* Body */}
              <div style={{ padding: "14px 18px" }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>Permisos</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {mod.permissions.map(p => (
                      <span key={p} style={{
                        fontSize: 9, padding: "2px 6px", borderRadius: 4, fontFamily: "monospace",
                        background: connected ? `${mod.color}08` : "rgba(255,255,255,0.04)",
                        color: connected ? mod.color : "#64748b",
                        border: `1px solid ${connected ? `${mod.color}15` : "rgba(255,255,255,0.06)"}`,
                      }}>
                        {connected && "✓ "}{p}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>Usado por</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {mod.usedBy.map(u => (
                      <span key={u} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "rgba(255,255,255,0.04)", color: "#e2e8f0" }}>{u}</span>
                    ))}
                  </div>
                </div>
                {connected && pages.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>Páginas ({pages.length})</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {pages.map((page: any) => (
                        <div key={page.id} style={{
                          display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6,
                          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                        }}>
                          {page.picture ? (
                            <img src={page.picture} alt="" style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover" }} />
                          ) : (
                            <div style={{
                              width: 18, height: 18, borderRadius: "50%", background: `${mod.color}15`,
                              fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", color: mod.color,
                            }}>{page.name?.charAt(0) || "?"}</div>
                          )}
                          <span style={{ fontSize: 11, color: "#e2e8f0" }}>{page.name}</span>
                          {page.instagramId && <span style={{ fontSize: 9, color: "#E4405F", fontWeight: 600 }}>+IG</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => handleConnect(mod.key)}
                  disabled={connecting === mod.key}
                  style={{
                    width: "100%", padding: "10px 0", borderRadius: 8,
                    background: connected ? "rgba(255,255,255,0.04)" : `linear-gradient(135deg, ${mod.color}, ${mod.color}cc)`,
                    border: connected ? "1px solid rgba(255,255,255,0.08)" : "none",
                    color: connected ? "#94a3b8" : "#0a0a1a",
                    fontWeight: 600, fontSize: 12, cursor: connecting === mod.key ? "wait" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    transition: "all 0.2s", opacity: connecting === mod.key ? 0.6 : 1,
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
   TAB CONFIGURATION
   ══════════════════════════════════════════════════════════ */

const TABS = [
  { key: "composer",       label: "Redactor",       icon: Zap,           color: "#ffbe0b" },
  { key: "calendar",       label: "Calendario",     icon: Calendar,      color: "#06d6a0" },
  { key: "inbox",          label: "Inbox",          icon: MessageSquare, color: "#a855f7" },
  { key: "analytics",      label: "Analytics",      icon: BarChart3,     color: "#f472b6" },
  { key: "listening",      label: "Listening",      icon: Ear,           color: "#fb923c" },
  { key: "streams",        label: "Streams",        icon: Columns3,      color: "#22d3ee" },
  { key: "integrations",   label: "Integraciones",  icon: Plug,          color: "#00d4ff" },
];

/* ══════════════════════════════════════════════════════════
   PUBLISHER TABS (MAIN EXPORT)
   ══════════════════════════════════════════════════════════ */

export function PublisherTabs() {
  const [activeTab, setActiveTab] = useState("composer");
  const [filters, setFilters] = useState<PublisherFilters>({
    canal: "Todos",
    cliente: "",
    vertical: "Todos",
  });

  // Auto-switch to integrations if redirected from OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) {
      setActiveTab("integrations");
    }
  }, []);

  const activeTabConfig = TABS.find(t => t.key === activeTab);
  const showFilters = activeTab !== "integrations";

  return (
    <div className="space-y-3">
      {/* ── Tab Navigation ─────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: 2, overflowX: "auto",
        padding: "4px", borderRadius: 12,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.04)",
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8,
                background: isActive ? `${tab.color}12` : "transparent",
                border: "none",
                borderBottom: isActive ? `2px solid ${tab.color}` : "2px solid transparent",
                color: isActive ? "white" : "#64748b",
                fontSize: 12, fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
                flex: "none",
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.color = "#e2e8f0";
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#64748b";
                }
              }}
            >
              <Icon style={{ width: 14, height: 14, color: isActive ? tab.color : "inherit" }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Filters Bar (hidden on Integraciones) ──────────────── */}
      {showFilters && (
        <FiltersBar filters={filters} onChange={setFilters} />
      )}

      {/* ── Tab Content ────────────────────────────────────────── */}
      <div className="transition-all duration-300">
        {activeTab === "composer" && <Composer />}
        {activeTab === "calendar" && <ScheduledCalendar />}
        {activeTab === "inbox" && <InboxLayout />}
        {activeTab === "analytics" && <AnalyticsDashboard />}
        {activeTab === "listening" && <ListeningDashboard />}
        {activeTab === "streams" && <StreamsDashboard />}
        {activeTab === "integrations" && <IntegrationsPanel />}
      </div>
    </div>
  );
}
