"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bookmark, Plus, X, Check, ChevronDown } from "lucide-react";

interface ColumnPresetsProps {
  currentColumns: string[];
  onApply: (columns: string[]) => void;
}

interface Preset {
  id: string;
  name: string;
  columns: string[];
}

const BUILT_IN_PRESETS: Preset[] = [
  {
    id: "default",
    name: "?? Estándar",
    columns: ["name", "delivery", "budget", "objective", "roas", "reach", "impressions", "cpm", "frequency", "clicks", "ctr", "cpc", "results", "conversations", "cost_per_message", "cost_per_conversation", "cpa", "landing_page_views", "hook_rate", "spend", "quality_ranking"],
  },
  {
    id: "ecommerce",
    name: "?? E-Commerce",
    columns: ["name", "delivery", "budget", "roas", "results", "cpa", "spend", "impressions", "clicks", "ctr", "cpc", "landing_page_views", "quality_ranking"],
  },
  {
    id: "conversaciones",
    name: "?? Conversaciones",
    columns: ["name", "delivery", "budget", "conversations", "cost_per_message", "cost_per_conversation", "results", "spend", "reach", "impressions", "frequency"],
  },
  {
    id: "engagement",
    name: "?? Engagement",
    columns: ["name", "delivery", "budget", "reach", "impressions", "frequency", "clicks", "ctr", "cpc", "hook_rate", "quality_ranking", "spend"],
  },
  {
    id: "overview",
    name: "?? Vista Rápida",
    columns: ["name", "delivery", "budget", "results", "spend", "roas", "cpa"],
  },
];

const STORAGE_KEY = "zefirus-column-presets";

export function ColumnPresets({ currentColumns, onApply }: ColumnPresetsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [customPresets, setCustomPresets] = useState<Preset[]>([]);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Load custom presets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO: [React] Refactor de hooks anti-patrón
      if (stored) setCustomPresets(JSON.parse(stored));
    } catch {}
  }, []);

  // Click outside handler
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setSaving(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const savePreset = () => {
    if (!newName.trim()) return;
    const preset: Preset = {
      id: `custom-${Date.now()}`,
      name: `? ${newName.trim()}`,
      columns: [...currentColumns],
    };
    const updated = [...customPresets, preset];
    setCustomPresets(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setNewName("");
    setSaving(false);
  };

  const deletePreset = (id: string) => {
    const updated = customPresets.filter(p => p.id !== id);
    setCustomPresets(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const allPresets = [...BUILT_IN_PRESETS, ...customPresets];

  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          display: "flex", alignItems: "center", gap: "5px",
          padding: "6px 10px", fontSize: "11px", fontWeight: 600,
          background: "var(--row-hover)", border: "1px solid var(--hairline)",
          borderRadius: "6px", color: "var(--text-secondary)", cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cyan)"; e.currentTarget.style.color = "white"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(148,163,184,0.7)"; }}
      >
        <Bookmark className="w-3.5 h-3.5" /> Presets <ChevronDown className="w-3 h-3" />
      </button>

      {showMenu && (
        <div style={{
          position: "absolute", top: "100%", right: 0, marginTop: "6px",
          background: "var(--surface)", 
          border: "1px solid rgba(59,130,246,0.15)", borderRadius: "10px",
          padding: "6px", zIndex: 100, minWidth: "220px",
          boxShadow: "0 12px 40px -8px rgba(0,0,0,0.7)",
        }}>
          <div style={{ fontSize: "9px", color: "var(--text-muted)", padding: "6px 8px 3px", letterSpacing: "0.06em", fontWeight: 700 }}>
            PRESETS DE COLUMNAS
          </div>

          {allPresets.map(preset => (
            <div key={preset.id} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                onClick={() => { onApply(preset.columns); setShowMenu(false); }}
                style={{
                  flex: 1, textAlign: "left", padding: "7px 10px", fontSize: "11px",
                  color: "var(--text-secondary)", background: "transparent",
                  border: "none", cursor: "pointer", borderRadius: "5px",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,129,251,0.15)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {preset.name}
                <span style={{ display: "block", fontSize: "8px", color: "var(--text-muted)", marginTop: "1px" }}>
                  {preset.columns.length} columnas
                </span>
              </button>
              {preset.id.startsWith("custom-") && (
                <button
                  onClick={() => deletePreset(preset.id)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          <div style={{ borderTop: "1px solid var(--hairline)", marginTop: "4px", paddingTop: "4px" }}>
            {saving ? (
              <div style={{ display: "flex", gap: "4px", padding: "4px 6px" }}>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && savePreset()}
                  placeholder="Nombre del preset..."
                  autoFocus
                  style={{
                    flex: 1, background: "var(--surface-hover)", border: "1px solid var(--border)",
                    borderRadius: "4px", padding: "4px 8px", fontSize: "10px", color: "var(--foreground)", outline: "none",
                  }}
                />
                <button
                  onClick={savePreset}
                  style={{
                    background: "var(--surface)", border: "1px solid rgba(52,211,153,0.25)",
                    borderRadius: "4px", color: "var(--emerald)", cursor: "pointer", padding: "4px 6px",
                  }}
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSaving(true)}
                style={{
                  width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: "6px",
                  padding: "7px 10px", fontSize: "11px", color: "var(--cyan)",
                  background: "transparent", border: "none", cursor: "pointer", borderRadius: "5px",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,129,251,0.1)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <Plus className="w-3.5 h-3.5" /> Guardar preset actual
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
