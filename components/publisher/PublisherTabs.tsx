"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Composer } from "./Composer";
import { ScheduledCalendar } from "./ScheduledCalendar";
import { InboxLayout } from "@/components/inbox/InboxLayout";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { ListeningDashboard } from "@/components/listening/ListeningDashboard";
import { StreamsDashboard } from "@/components/streams/StreamsDashboard";
import {
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
  Search,
  Globe,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════ */

interface ChannelOption {
  id: string;
  name: string;
  type: "fanpage" | "instagram";
  picture: string | null;
}

interface FilterOption {
  value: string;
  count: number;
}

export interface PublisherFilters {
  channels: string[];   // selected channel IDs (multi-select)
  cliente: string;      // selected client name
  vertical: string;     // selected vertical name
}

/* ══════════════════════════════════════════════════════════
   MULTI-SELECT CHANNEL PICKER
   ══════════════════════════════════════════════════════════ */

function ChannelPicker({
  channels,
  selected,
  onChange,
}: {
  channels: ChannelOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const toggleAll = () => {
    if (selected.length === channels.length) onChange([]);
    else onChange(channels.map(c => c.id));
  };

  const label = selected.length === 0 || selected.length === channels.length
    ? "Todos los canales"
    : selected.length === 1
    ? channels.find(c => c.id === selected[0])?.name || "1 canal"
    : `${selected.length} canales`;

  if (channels.length === 0) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 12px", borderRadius: 8,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        color: "#475569", fontSize: 11,
      }}>
        <Globe style={{ width: 12, height: 12 }} />
        Sin canales conectados
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 12px", borderRadius: 8,
          background: selected.length > 0 && selected.length < channels.length
            ? "rgba(0,212,255,0.06)"
            : "rgba(255,255,255,0.02)",
          border: `1px solid ${
            selected.length > 0 && selected.length < channels.length
              ? "rgba(0,212,255,0.2)"
              : "rgba(255,255,255,0.06)"
          }`,
          color: "#e2e8f0", fontSize: 11, cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <Globe style={{ width: 12, height: 12, color: "#00d4ff" }} />
        <span style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </span>
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
            position: "absolute", top: "calc(100% + 6px)", left: 0,
            minWidth: 280, maxHeight: 340, overflowY: "auto",
            borderRadius: 10, background: "rgba(12,12,28,0.98)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
            zIndex: 99,
          }}>
            {/* Select all */}
            <button
              onClick={toggleAll}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "10px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                background: "none", border: "none", cursor: "pointer",
                color: "#94a3b8", fontSize: 11,
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                border: `1.5px solid ${selected.length === channels.length ? "#00d4ff" : "rgba(255,255,255,0.15)"}`,
                background: selected.length === channels.length ? "rgba(0,212,255,0.12)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {selected.length === channels.length && <Check style={{ width: 10, height: 10, color: "#00d4ff" }} />}
              </div>
              Todos los canales
            </button>

            {/* Fanpages group */}
            {channels.filter(c => c.type === "fanpage").length > 0 && (
              <div style={{
                padding: "6px 14px 4px", fontSize: 9, fontWeight: 700,
                color: "#475569", textTransform: "uppercase", letterSpacing: 1.2,
              }}>
                Facebook Pages
              </div>
            )}
            {channels.filter(c => c.type === "fanpage").map(ch => {
              const isSelected = selected.includes(ch.id);
              return (
                <button
                  key={ch.id}
                  onClick={() => toggle(ch.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "8px 14px",
                    background: isSelected ? "rgba(0,212,255,0.04)" : "transparent",
                    border: "none", cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSelected ? "rgba(0,212,255,0.04)" : "transparent"; }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    border: `1.5px solid ${isSelected ? "#1877F2" : "rgba(255,255,255,0.12)"}`,
                    background: isSelected ? "rgba(24,119,242,0.12)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isSelected && <Check style={{ width: 10, height: 10, color: "#1877F2" }} />}
                  </div>
                  {ch.picture ? (
                    <img src={ch.picture} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: "rgba(24,119,242,0.12)", color: "#1877F2",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 700,
                    }}>{ch.name.charAt(0)}</div>
                  )}
                  <span style={{ fontSize: 12, color: "white", flex: 1, textAlign: "left" }}>{ch.name}</span>
                  <span style={{
                    fontSize: 8, padding: "2px 5px", borderRadius: 3,
                    background: "rgba(24,119,242,0.1)", color: "#1877F2",
                  }}>FB</span>
                </button>
              );
            })}

            {/* Instagram group */}
            {channels.filter(c => c.type === "instagram").length > 0 && (
              <div style={{
                padding: "8px 14px 4px", fontSize: 9, fontWeight: 700,
                color: "#475569", textTransform: "uppercase", letterSpacing: 1.2,
                borderTop: "1px solid rgba(255,255,255,0.04)",
              }}>
                Instagram
              </div>
            )}
            {channels.filter(c => c.type === "instagram").map(ch => {
              const isSelected = selected.includes(ch.id);
              return (
                <button
                  key={ch.id}
                  onClick={() => toggle(ch.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "8px 14px",
                    background: isSelected ? "rgba(228,64,95,0.04)" : "transparent",
                    border: "none", cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSelected ? "rgba(228,64,95,0.04)" : "transparent"; }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    border: `1.5px solid ${isSelected ? "#E4405F" : "rgba(255,255,255,0.12)"}`,
                    background: isSelected ? "rgba(228,64,95,0.12)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isSelected && <Check style={{ width: 10, height: 10, color: "#E4405F" }} />}
                  </div>
                  {ch.picture ? (
                    <img src={ch.picture} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: "rgba(228,64,95,0.12)", color: "#E4405F",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 700,
                    }}>{ch.name.charAt(0)}</div>
                  )}
                  <span style={{ fontSize: 12, color: "white", flex: 1, textAlign: "left" }}>{ch.name}</span>
                  <span style={{
                    fontSize: 8, padding: "2px 5px", borderRadius: 3,
                    background: "rgba(228,64,95,0.1)", color: "#E4405F",
                  }}>IG</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SINGLE-SELECT FILTER DROPDOWN
   ══════════════════════════════════════════════════════════ */

function SelectFilter({
  label,
  value,
  options,
  onChange,
  color,
  searchable,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
  color: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const isActive = value !== "";

  const filtered = searchable && search
    ? options.filter(o => o.value.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 12px", borderRadius: 8,
          background: isActive ? `${color}08` : "rgba(255,255,255,0.02)",
          border: `1px solid ${isActive ? `${color}22` : "rgba(255,255,255,0.06)"}`,
          color: isActive ? color : "#94a3b8",
          fontSize: 11, cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <span style={{ fontSize: 10, color: "#475569", fontWeight: 500 }}>{label}</span>
        <span style={{
          fontWeight: isActive ? 600 : 400,
          color: isActive ? "white" : "#94a3b8",
          maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {value || "Todos"}
        </span>
        <ChevronDown style={{
          width: 10, height: 10, color: "#475569",
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.15s",
        }} />
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 98 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0,
            minWidth: 200, maxHeight: 300, overflowY: "auto",
            borderRadius: 10, background: "rgba(12,12,28,0.98)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
            zIndex: 99,
          }}>
            {searchable && (
              <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 8px", borderRadius: 6,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <Search style={{ width: 11, height: 11, color: "#475569" }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    autoFocus
                    style={{
                      background: "none", border: "none", outline: "none",
                      color: "white", fontSize: 11, width: "100%",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Todos option */}
            <button
              onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "8px 14px",
                background: value === "" ? `${color}06` : "transparent",
                border: "none", cursor: "pointer",
                fontSize: 11, color: value === "" ? color : "#e2e8f0",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <span>Todos</span>
              {value === "" && <Check style={{ width: 10, height: 10 }} />}
            </button>

            {filtered.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); setSearch(""); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "8px 14px",
                  background: value === opt.value ? `${color}06` : "transparent",
                  border: "none", cursor: "pointer",
                  fontSize: 11, color: value === opt.value ? color : "#e2e8f0",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (value !== opt.value) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={e => { if (value !== opt.value) e.currentTarget.style.background = "transparent"; }}
              >
                <span>{opt.value}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    fontSize: 9, padding: "1px 5px", borderRadius: 8,
                    background: "rgba(255,255,255,0.05)", color: "#64748b",
                  }}>{opt.count}</span>
                  {value === opt.value && <Check style={{ width: 10, height: 10, color }} />}
                </div>
              </button>
            ))}

            {filtered.length === 0 && (
              <div style={{ padding: "16px 14px", textAlign: "center", fontSize: 11, color: "#475569" }}>
                Sin resultados
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   FILTERS BAR (REAL DATA)
   ══════════════════════════════════════════════════════════ */

function FiltersBar({
  filters,
  onChange,
}: {
  filters: PublisherFilters;
  onChange: (f: PublisherFilters) => void;
}) {
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [clients, setClients] = useState<FilterOption[]>([]);
  const [verticals, setVerticals] = useState<FilterOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/publisher/filters")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setChannels(data.channels || []);
          setClients(data.clients || []);
          setVerticals(data.verticals || []);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const activeCount =
    (filters.channels.length > 0 && filters.channels.length < channels.length ? 1 : 0) +
    (filters.cliente ? 1 : 0) +
    (filters.vertical ? 1 : 0);

  const resetAll = () => onChange({ channels: [], cliente: "", vertical: "" });

  if (!loaded) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 8px",
      borderRadius: 10,
      background: "rgba(255,255,255,0.015)",
      border: "1px solid rgba(255,255,255,0.035)",
    }}>
      {/* Filter icon + label */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "4px 8px", borderRadius: 6,
        color: activeCount > 0 ? "#00d4ff" : "#3e4a5a",
        fontSize: 11, fontWeight: 600,
      }}>
        <Filter style={{ width: 12, height: 12 }} />
        {activeCount > 0 && (
          <span style={{
            padding: "0 5px", borderRadius: 10, fontSize: 9,
            background: "rgba(0,212,255,0.12)", color: "#00d4ff",
            fontWeight: 700, lineHeight: "16px",
          }}>
            {activeCount}
          </span>
        )}
      </div>

      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.04)" }} />

      {/* Channel multi-select */}
      <ChannelPicker
        channels={channels}
        selected={filters.channels}
        onChange={ids => onChange({ ...filters, channels: ids })}
      />

      {/* Client select */}
      {clients.length > 0 && (
        <SelectFilter
          label="Cliente"
          value={filters.cliente}
          options={clients}
          onChange={v => onChange({ ...filters, cliente: v })}
          color="#06d6a0"
          searchable
        />
      )}

      {/* Vertical select */}
      {verticals.length > 0 && (
        <SelectFilter
          label="Vertical"
          value={filters.vertical}
          options={verticals}
          onChange={v => onChange({ ...filters, vertical: v })}
          color="#f472b6"
        />
      )}

      {/* Reset */}
      {activeCount > 0 && (
        <button
          onClick={resetAll}
          style={{
            marginLeft: "auto", padding: "5px 10px", borderRadius: 6,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
            color: "#64748b", fontSize: 10, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}
        >
          <X style={{ width: 10, height: 10 }} /> Limpiar
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   INTEGRATIONS PANEL
   ══════════════════════════════════════════════════════════ */

const META_MODULES = [
  {
    key: "social", label: "Social Channels", icon: Share2, color: "#06d6a0",
    description: "Publicar y gestionar contenido en Facebook e Instagram",
    permissions: ["instagram_content_publish", "pages_manage_posts", "pages_manage_engagement"],
    usedBy: ["Redactor", "Calendario"],
  },
  {
    key: "ads", label: "Meta Ads Manager", icon: Megaphone, color: "#7b61ff",
    description: "Campañas publicitarias, presupuestos y audiencias",
    permissions: ["ads_management", "ads_read", "leads_retrieval"],
    usedBy: ["Ads — Campañas"],
  },
  {
    key: "analytics", label: "Analytics Engine", icon: BarChart3, color: "#f472b6",
    description: "Métricas de rendimiento, insights y audiencia",
    permissions: ["read_insights", "instagram_manage_insights", "pages_read_engagement"],
    usedBy: ["Analytics"],
  },
  {
    key: "community", label: "Community Management", icon: MessageSquare, color: "#a855f7",
    description: "Inbox, mensajes, menciones y monitoreo social",
    permissions: ["pages_messaging", "instagram_manage_messages", "read_page_mailboxes"],
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
      if (res.ok) { setStatuses((await res.json()).modules || {}); }
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) { window.history.replaceState({}, "", window.location.pathname); fetchStatus(); }
  }, []);

  const handleConnect = (moduleKey: string) => { setConnecting(moduleKey); window.location.href = `/api/connect/${moduleKey}`; };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Loader2 style={{ width: 24, height: 24, color: "#64748b", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const connectedCount = Object.values(statuses).filter(s => s.connected).length;
  const allPages = new Map<string, any>();
  Object.values(statuses).forEach(s => (s.pages || []).forEach((p: any) => allPages.set(p.id, p)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "16px 20px", borderRadius: 12,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: "rgba(0,212,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Plug style={{ width: 20, height: 20, color: "#00d4ff" }} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "white", margin: 0, fontFamily: "'Orbitron', sans-serif" }}>
            Integraciones Meta
          </h3>
          <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
            {connectedCount}/{META_MODULES.length} módulos · {allPages.size} páginas
          </p>
        </div>
        {/* Status dots */}
        <div style={{ display: "flex", gap: 6 }}>
          {META_MODULES.map(mod => (
            <div key={mod.key} title={mod.label} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: statuses[mod.key]?.connected ? mod.color : "#1e293b",
              boxShadow: statuses[mod.key]?.connected ? `0 0 8px ${mod.color}40` : "none",
              transition: "all 0.3s",
            }} />
          ))}
        </div>
      </div>

      {/* Module cards — 2 columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
        {META_MODULES.map(mod => {
          const st = statuses[mod.key];
          const connected = st?.connected;
          const Icon = mod.icon;
          const pages = st?.pages || [];
          return (
            <div key={mod.key} style={{
              borderRadius: 12, overflow: "hidden",
              background: "rgba(255,255,255,0.015)",
              border: `1px solid ${connected ? `${mod.color}18` : "rgba(255,255,255,0.04)"}`,
              transition: "border-color 0.3s",
            }}>
              {/* Card header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                background: connected ? `${mod.color}04` : "transparent",
                borderBottom: "1px solid rgba(255,255,255,0.03)",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${mod.color}10`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon style={{ width: 16, height: 16, color: mod.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "white" }}>{mod.label}</div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>{mod.description}</div>
                </div>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: connected ? mod.color : "#334155",
                  boxShadow: connected ? `0 0 6px ${mod.color}60` : "none",
                }} />
              </div>

              {/* Card body */}
              <div style={{ padding: "12px 16px" }}>
                {/* Permissions */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 10 }}>
                  {mod.permissions.map(p => (
                    <span key={p} style={{
                      fontSize: 8, padding: "2px 5px", borderRadius: 3, fontFamily: "monospace",
                      background: connected ? `${mod.color}06` : "rgba(255,255,255,0.02)",
                      color: connected ? `${mod.color}` : "#475569",
                      border: `1px solid ${connected ? `${mod.color}12` : "rgba(255,255,255,0.04)"}`,
                    }}>
                      {connected ? "✓ " : ""}{p}
                    </span>
                  ))}
                </div>

                {/* Pages */}
                {connected && pages.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                    {pages.map((page: any) => (
                      <div key={page.id} style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "3px 8px", borderRadius: 5,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.04)",
                      }}>
                        {page.picture ? (
                          <img src={page.picture} alt="" style={{ width: 14, height: 14, borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          <div style={{
                            width: 14, height: 14, borderRadius: "50%",
                            background: `${mod.color}12`, fontSize: 7, fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center", color: mod.color,
                          }}>{page.name?.charAt(0)}</div>
                        )}
                        <span style={{ fontSize: 10, color: "#cbd5e1" }}>{page.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Connect button */}
                <button
                  onClick={() => handleConnect(mod.key)}
                  disabled={connecting === mod.key}
                  style={{
                    width: "100%", padding: "8px", borderRadius: 8,
                    background: connected ? "rgba(255,255,255,0.03)" : `linear-gradient(135deg, ${mod.color}dd, ${mod.color}99)`,
                    border: connected ? "1px solid rgba(255,255,255,0.06)" : "none",
                    color: connected ? "#94a3b8" : "#0a0a1a",
                    fontWeight: 600, fontSize: 11, cursor: connecting === mod.key ? "wait" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    transition: "all 0.2s", opacity: connecting === mod.key ? 0.5 : 1,
                  }}
                >
                  {connecting === mod.key ? (
                    <><Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> Conectando...</>
                  ) : connected ? (
                    <><RefreshCw style={{ width: 11, height: 11 }} /> Reconectar</>
                  ) : (
                    <><ExternalLink style={{ width: 12, height: 12 }} /> Conectar con Meta</>
                  )}
                </button>
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
  { key: "composer",     label: "Redactor",      icon: Zap,           color: "#ffbe0b" },
  { key: "calendar",     label: "Calendario",    icon: Calendar,      color: "#06d6a0" },
  { key: "inbox",        label: "Inbox",         icon: MessageSquare, color: "#a855f7" },
  { key: "analytics",    label: "Analytics",     icon: BarChart3,     color: "#f472b6" },
  { key: "listening",    label: "Listening",     icon: Ear,           color: "#fb923c" },
  { key: "streams",      label: "Streams",       icon: Columns3,      color: "#22d3ee" },
  { key: "integrations", label: "Integraciones", icon: Plug,          color: "#00d4ff" },
];

/* ══════════════════════════════════════════════════════════
   PUBLISHER TABS (MAIN EXPORT)
   ══════════════════════════════════════════════════════════ */

export function PublisherTabs() {
  const [activeTab, setActiveTab] = useState("composer");
  const [filters, setFilters] = useState<PublisherFilters>({
    channels: [],
    cliente: "",
    vertical: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) setActiveTab("integrations");
  }, []);

  const showFilters = activeTab !== "integrations" && activeTab !== "composer";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* ── Tab Navigation ───────────────────────────────────── */}
      <div style={{
        display: "flex", gap: 1, overflowX: "auto",
        padding: 3, borderRadius: 10,
        background: "rgba(255,255,255,0.015)",
        border: "1px solid rgba(255,255,255,0.035)",
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                position: "relative",
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 16px", borderRadius: 8,
                background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                border: "none",
                color: isActive ? "white" : "#4a5568",
                fontSize: 12, fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                flex: "none",
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.025)";
                  e.currentTarget.style.color = "#94a3b8";
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#4a5568";
                }
              }}
            >
              <Icon style={{
                width: 14, height: 14,
                color: isActive ? tab.color : "inherit",
                transition: "color 0.2s",
              }} />
              {tab.label}
              {/* Active indicator line */}
              {isActive && (
                <div style={{
                  position: "absolute", bottom: 0, left: "20%", right: "20%",
                  height: 2, borderRadius: 1,
                  background: tab.color,
                  boxShadow: `0 0 8px ${tab.color}50`,
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Filters Bar ──────────────────────────────────────── */}
      {showFilters && <FiltersBar filters={filters} onChange={setFilters} />}

      {/* ── Tab Content ──────────────────────────────────────── */}
      <div>
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
