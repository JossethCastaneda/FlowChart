"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Composer } from "./Composer";
import { ScheduledCalendar } from "./ScheduledCalendar";
import { InboxLayout } from "@/components/inbox/InboxLayout";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { ListeningDashboard } from "@/components/listening/ListeningDashboard";
import { StreamsDashboard } from "@/components/streams/StreamsDashboard";
import { IntegrationsPanel } from "./IntegrationsPanel";
import {
  Loader2,
  Plug,
  Check,
  RefreshCw,
  MessageSquare,
  BarChart3,
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
import { Skeleton } from "@/components/ui/Skeleton";


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TYPES
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MULTI-SELECT CHANNEL PICKER
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
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
            : "rgba(255,255,255,0.04)",
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
                borderBottom: "1px solid rgba(255,255,255,0.1)",
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
                borderTop: "1px solid rgba(255,255,255,0.09)",
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SINGLE-SELECT FILTER DROPDOWN
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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
          background: isActive ? `${color}08` : "rgba(255,255,255,0.04)",
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
              <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 8px", borderRadius: 6,
                  background: "rgba(255,255,255,0.09)",
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
                borderBottom: "1px solid rgba(255,255,255,0.09)",
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
                    background: "rgba(255,255,255,0.1)", color: "#64748b",
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   FILTERS BAR (REAL DATA)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function FiltersBar({
  filters,
  onChange,
}: {
  filters: PublisherFilters;
  onChange: (f: PublisherFilters) => void;
}) {
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/publisher/filters")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setChannels(data.channels || []);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const activeCount =
    (filters.channels.length > 0 && filters.channels.length < channels.length ? 1 : 0);

  const resetAll = () => onChange({ channels: [] });

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

      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.09)" }} />

      {/* Channel multi-select */}
      <ChannelPicker
        channels={channels}
        selected={filters.channels}
        onChange={ids => onChange({ ...filters, channels: ids })}
      />

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
const TABS = [
  { key: "composer",     label: "Redactor",      icon: Zap,           color: "#ffbe0b" },
  { key: "calendar",     label: "Calendario",    icon: Calendar,      color: "#06d6a0" },
  { key: "inbox",        label: "Inbox",         icon: MessageSquare, color: "#a855f7" },
  { key: "analytics",    label: "Analytics",     icon: BarChart3,     color: "#f472b6" },
  { key: "listening",    label: "Listening",     icon: Ear,           color: "#fb923c" },
  { key: "streams",      label: "Streams",       icon: Columns3,      color: "#22d3ee" },
  { key: "integrations", label: "Integraciones", icon: Plug,          color: "#00d4ff" },
];

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PUBLISHER TABS (MAIN EXPORT)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export function PublisherTabs() {
  const [activeTab, setActiveTab] = useState("composer");
  const [filters, setFilters] = useState<PublisherFilters>({
    channels: [],
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) setActiveTab("integrations");
  }, []);

  const showFilters = activeTab !== "integrations" && activeTab !== "composer" && activeTab !== "inbox";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%", minHeight: 0 }}>
      {/* â”€â”€ Tab Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
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

      {/* â”€â”€ Filters Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showFilters && <FiltersBar filters={filters} onChange={setFilters} />}

      {/* â”€â”€ Tab Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === "inbox" ? (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <InboxLayout />
        </div>
      ) : (
        <div>
          {activeTab === "composer" && <Composer />}
          {activeTab === "calendar" && <ScheduledCalendar filters={filters} />}
          {activeTab === "analytics" && <AnalyticsDashboard />}
          {activeTab === "listening" && <ListeningDashboard />}
          {activeTab === "streams" && <StreamsDashboard />}
          {activeTab === "integrations" && <IntegrationsPanel />}
        </div>
      )}
    </div>
  );
}
