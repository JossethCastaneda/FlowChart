"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, ChevronUp, Check, Search, X } from "lucide-react";

/* ── Types ─────────────────────────────────────────────── */
export interface SocialAccount {
  id: string;
  name: string;
  picture: string;
  platform: "facebook" | "instagram";
  igUsername?: string;
}

export type Platform = "all" | "facebook" | "instagram";

interface Props {
  onFilterChange: (platform: Platform, selectedIds: string[]) => void;
}

/* ── Platform definitions ─────────────────────────────── */
const PLATFORMS: { key: Platform; label: string; icon: React.ReactNode; color: string }[] = [
  {
    key: "all",
    label: "Todas las plataformas",
    color: "#00d4ff",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    key: "facebook",
    label: "Facebook Pages",
    color: "#1877F2",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    key: "instagram",
    label: "Instagram Business",
    color: "#E1306C",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#E1306C">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
];

/* ══════════════════════════════════════════════════════════
   ANALYTICS FILTERS
   ══════════════════════════════════════════════════════════ */
export function AnalyticsFilters({ onFilterChange }: Props) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Platform selector
  const [platform, setPlatform] = useState<Platform>("all");
  const [platformOpen, setPlatformOpen] = useState(false);
  const platformRef = useRef<HTMLDivElement>(null);

  // Account selector
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const accountRef = useRef<HTMLDivElement>(null);

  /* ── Fetch connected pages/accounts ─────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/meta/pages");
        if (res.ok) {
          const data = await res.json();
          const list: SocialAccount[] = [];
          for (const page of data.data || []) {
            list.push({
              id: `fb_${page.id}`,
              name: page.name,
              picture: page.picture || "",
              platform: "facebook",
            });
            if (page.instagram) {
              list.push({
                id: `ig_${page.instagram.id}`,
                name: page.instagram.username ? `@${page.instagram.username}` : page.name,
                picture: page.instagram.picture || page.picture || "",
                platform: "instagram",
                igUsername: page.instagram.username,
              });
            }
          }
          setAccounts(list);
          setSelectedIds(list.map((a) => a.id)); // select all by default
        }
      } catch { /* silent */ }
      setLoading(false);
    };
    load();
  }, []);

  /* ── Close dropdowns on outside click ───────────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (platformRef.current && !platformRef.current.contains(e.target as Node)) setPlatformOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Filtered accounts by platform ─────────────────── */
  const filteredByPlatform = platform === "all" ? accounts : accounts.filter((a) => a.platform === platform);
  const filteredBySearch = filteredByPlatform.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ── Handlers ──────────────────────────────────────── */
  const handlePlatformSelect = (key: Platform) => {
    setPlatform(key);
    setPlatformOpen(false);
    // Keep current selections — only filter the dropdown view
    // Apply immediately with the current selection intersected with the new platform
    const relevantIds = key === "all"
      ? selectedIds
      : selectedIds.filter((id) => {
          const acc = accounts.find((a) => a.id === id);
          return acc && acc.platform === key;
        });
    // If no accounts match the new platform, auto-select all of that platform
    if (relevantIds.length === 0) {
      const newAccounts = key === "all" ? accounts : accounts.filter((a) => a.platform === key);
      const newIds = newAccounts.map((a) => a.id);
      setSelectedIds(newIds);
      onFilterChange(key, newIds);
    } else {
      setSelectedIds(relevantIds);
      onFilterChange(key, relevantIds);
    }
  };

  const toggleAccount = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return next;
    });
  };

  const selectAll = () => {
    const allIds = filteredByPlatform.map((a) => a.id);
    setSelectedIds(allIds);
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const applySelection = () => {
    setAccountOpen(false);
    onFilterChange(platform, selectedIds);
  };

  const allSelected = filteredByPlatform.length > 0 && filteredByPlatform.every((a) => selectedIds.includes(a.id));

  const currentPlatform = PLATFORMS.find((p) => p.key === platform)!;
  const selectedAccounts = accounts.filter((a) => selectedIds.includes(a.id));

  // Notify parent on mount when data loads
  useEffect(() => {
    if (accounts.length > 0) {
      onFilterChange(platform, selectedIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>

      {/* ═══ PLATFORM SELECTOR ═══ */}
      <div ref={platformRef} style={{ position: "relative" }}>
        <button
          onClick={() => setPlatformOpen(!platformOpen)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 14px", borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${platformOpen ? `${currentPlatform.color}40` : "rgba(255,255,255,0.08)"}`,
            color: "#e2e8f0", fontSize: 13, fontWeight: 500,
            cursor: "pointer", transition: "all 0.2s",
            fontFamily: "inherit",
          }}
        >
          {currentPlatform.icon}
          <span>{currentPlatform.label}</span>
          {platformOpen
            ? <ChevronUp style={{ width: 14, height: 14, color: "#64748b" }} />
            : <ChevronDown style={{ width: 14, height: 14, color: "#64748b" }} />
          }
        </button>

        {platformOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 220,
            background: "#0c1222", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, overflow: "hidden", zIndex: 100,
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          }}>
            {PLATFORMS.map((p) => {
              const isActive = platform === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => handlePlatformSelect(p.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "11px 16px",
                    background: isActive ? `${p.color}10` : "transparent",
                    border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)",
                    borderLeft: isActive ? `3px solid ${p.color}` : "3px solid transparent",
                    color: isActive ? "#e2e8f0" : "#94a3b8",
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    cursor: "pointer", textAlign: "left",
                    transition: "all 0.15s", fontFamily: "inherit",
                  }}
                >
                  {p.icon}
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ ACCOUNT SELECTOR ═══ */}
      <div ref={accountRef} style={{ position: "relative" }}>
        <button
          onClick={() => setAccountOpen(!accountOpen)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 14px 6px 6px", borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${accountOpen ? "rgba(0,212,255,0.25)" : "rgba(255,255,255,0.08)"}`,
            cursor: "pointer", transition: "all 0.2s",
            fontFamily: "inherit",
          }}
        >
          {/* Avatar stack */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {selectedAccounts.slice(0, 5).map((acc, i) => (
              <div
                key={acc.id}
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  overflow: "hidden", border: "2px solid #0f172a",
                  marginLeft: i > 0 ? -8 : 0, zIndex: 5 - i,
                  flexShrink: 0,
                  background: acc.platform === "facebook" ? "#1877F215" : "#E1306C15",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {acc.picture ? (
                  <img src={acc.picture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 700, color: acc.platform === "facebook" ? "#1877F2" : "#E1306C" }}>
                    {acc.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Count badge */}
          <span style={{
            fontSize: 13, fontWeight: 600, color: "#e2e8f0",
            minWidth: 16, textAlign: "center",
          }}>
            {selectedIds.length}
          </span>

          <ChevronDown style={{ width: 14, height: 14, color: "#64748b" }} />
        </button>

        {accountOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 300,
            background: "#0c1222", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, overflow: "hidden", zIndex: 100,
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            display: "flex", flexDirection: "column",
          }}>
            {/* Search bar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <Search style={{ width: 14, height: 14, color: "#64748b", flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Buscar cuenta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: "#e2e8f0", fontSize: 13, fontFamily: "inherit",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 0, display: "flex" }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              )}
            </div>

            {/* Select all */}
            <button
              onClick={allSelected ? deselectAll : selectAll}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 14px",
                background: "rgba(255,255,255,0.02)",
                border: "none", borderBottom: "1px solid rgba(255,255,255,0.06)",
                color: "#e2e8f0", fontSize: 13, fontWeight: 600,
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4,
                border: allSelected ? "none" : "1.5px solid rgba(255,255,255,0.3)",
                background: allSelected ? "#00d4ff" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s", flexShrink: 0,
              }}>
                {allSelected && <Check style={{ width: 12, height: 12, color: "#0f172a" }} />}
              </div>
              Seleccionar todo ({filteredByPlatform.length})
            </button>

            {/* Account list */}
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: "20px 14px", textAlign: "center" }}>
                  <div style={{ width: 20, height: 20, border: "2px solid #00d4ff30", borderTopColor: "#00d4ff", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
                  <span style={{ fontSize: 12, color: "#64748b" }}>Cargando cuentas...</span>
                </div>
              ) : filteredBySearch.length === 0 ? (
                <div style={{ padding: "20px 14px", textAlign: "center", color: "#64748b", fontSize: 12 }}>
                  {searchQuery ? "Sin resultados" : "Sin cuentas conectadas"}
                </div>
              ) : (
                filteredBySearch.map((acc) => {
                  const isSelected = selectedIds.includes(acc.id);
                  const isFb = acc.platform === "facebook";
                  const accentColor = isFb ? "#1877F2" : "#E1306C";
                  return (
                    <button
                      key={acc.id}
                      onClick={() => toggleAccount(acc.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                        padding: "9px 14px",
                        background: isSelected ? `${accentColor}08` : "transparent",
                        border: "none", borderBottom: "1px solid rgba(255,255,255,0.03)",
                        color: "#e2e8f0", fontSize: 13,
                        cursor: "pointer", textAlign: "left",
                        transition: "background 0.15s", fontFamily: "inherit",
                      }}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                        border: isSelected ? "none" : "1.5px solid rgba(255,255,255,0.25)",
                        background: isSelected ? accentColor : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s",
                      }}>
                        {isSelected && <Check style={{ width: 12, height: 12, color: "#fff" }} />}
                      </div>

                      {/* Avatar */}
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%", overflow: "hidden",
                        flexShrink: 0, background: `${accentColor}12`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: isSelected ? `2px solid ${accentColor}` : "2px solid transparent",
                        transition: "border 0.15s",
                      }}>
                        {acc.picture ? (
                          <img src={acc.picture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 700, color: accentColor }}>
                            {acc.name.replace("@", "").charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {acc.name}
                        </div>
                        <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>
                          {isFb ? "Facebook Page" : "Instagram Business"}
                        </div>
                      </div>

                      {/* Platform icon */}
                      <div style={{ flexShrink: 0 }}>
                        {isFb ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill={isSelected ? "#1877F2" : "#334155"}>
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill={isSelected ? "#E1306C" : "#334155"}>
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Apply button */}
            <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button
                onClick={applySelection}
                style={{
                  width: "100%", padding: "9px 0", borderRadius: 8,
                  background: selectedIds.length > 0
                    ? "linear-gradient(135deg, #00b4d8, #0077b6)"
                    : "rgba(255,255,255,0.06)",
                  border: "none",
                  color: selectedIds.length > 0 ? "#fff" : "#64748b",
                  fontSize: 13, fontWeight: 600,
                  cursor: selectedIds.length > 0 ? "pointer" : "not-allowed",
                  transition: "all 0.2s", fontFamily: "inherit",
                  boxShadow: selectedIds.length > 0 ? "0 4px 12px rgba(0,180,216,0.2)" : "none",
                }}
              >
                Aplicar ({selectedIds.length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ ACTIVE FILTER INDICATOR ═══ */}
      {platform !== "all" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "4px 10px 4px 8px", borderRadius: 20,
          background: `${currentPlatform.color}12`,
          border: `1px solid ${currentPlatform.color}30`,
          fontSize: 11, fontWeight: 500, color: currentPlatform.color,
        }}>
          {currentPlatform.icon}
          <span>{filteredByPlatform.length} cuenta{filteredByPlatform.length !== 1 ? "s" : ""}</span>
          <button
            onClick={() => handlePlatformSelect("all")}
            style={{
              background: "none", border: "none", color: currentPlatform.color,
              cursor: "pointer", padding: 0, display: "flex", marginLeft: 2,
            }}
          >
            <X style={{ width: 12, height: 12 }} />
          </button>
        </div>
      )}
    </div>
  );
}
