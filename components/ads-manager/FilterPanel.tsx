"use client";

import React, { useState, useRef, useEffect } from "react";
import { Filter, X, Plus, ChevronDown, Search } from "lucide-react";
import { OBJECTIVE_MAP } from "@/lib/ads-metrics";

export interface FilterItem {
  field: string;
  operator: string;
  value: string;
  label: string;
}

interface FilterPanelProps {
  activeFilters: FilterItem[];
  onFiltersChange: (filters: FilterItem[]) => void;
  level: "campaigns" | "adsets" | "ads";
}

const FILTER_GROUPS = [
  {
    group: "Entrega",
    filters: [
      { field: "status", operator: "=", value: "ACTIVE", label: "Estado: Activa" },
      { field: "status", operator: "=", value: "PAUSED", label: "Estado: Pausada" },
      { field: "status", operator: "=", value: "ARCHIVED", label: "Estado: Archivada" },
    ],
  },
  {
    group: "Objetivo",
    filters: Object.entries(OBJECTIVE_MAP)
      .filter(([key]) => key.startsWith("OUTCOME_"))
      .map(([key, val]) => ({
        field: "objective",
        operator: "=",
        value: key,
        label: `Objetivo: ${val.icon} ${val.label}`,
      })),
  },
  {
    group: "Rendimiento",
    filters: [
      { field: "results", operator: ">", value: "0", label: "Con Resultados" },
      { field: "spend", operator: ">", value: "0", label: "Con Inversión" },
      { field: "roas", operator: ">", value: "1", label: "ROAS > 1x" },
      { field: "roas", operator: ">", value: "3", label: "ROAS > 3x" },
      { field: "roas", operator: "<", value: "1", label: "ROAS < 1x (pérdida)" },
    ],
  },
  {
    group: "Frecuencia",
    filters: [
      { field: "frequency", operator: ">", value: "3", label: "Frecuencia > 3 (advertencia)" },
      { field: "frequency", operator: ">", value: "5", label: "Frecuencia > 5 (crítica)" },
    ],
  },
  {
    group: "Advantage+",
    filters: [
      { field: "advantage_plus", operator: "=", value: "true", label: "Advantage+ activo" },
      { field: "advantage_plus", operator: "=", value: "false", label: "Sin Advantage+" },
    ],
  },
];

export function FilterPanel({ activeFilters, onFiltersChange, level }: FilterPanelProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const addFilter = (filter: FilterItem) => {
    // Avoid exact duplicates
    const exists = activeFilters.some(
      (f) => f.field === filter.field && f.operator === filter.operator && f.value === filter.value
    );
    if (!exists) {
      onFiltersChange([...activeFilters, filter]);
    }
    setShowMenu(false);
    setSearchTerm("");
  };

  const removeFilter = (idx: number) => {
    onFiltersChange(activeFilters.filter((_, i) => i !== idx));
  };

  const clearAll = () => onFiltersChange([]);

  // Filter the menu options by search term
  const filteredGroups = FILTER_GROUPS.map((g) => ({
    ...g,
    filters: g.filters.filter((f) =>
      f.label.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter((g) => g.filters.length > 0);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      <div style={{ position: "relative" }} ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 12px", background: "transparent",
            border: "1px dashed var(--text-muted)", borderRadius: "20px",
            color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--cyan)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--text-muted)")}
        >
          <Filter className="w-3.5 h-3.5" /> Filtrar por... <Plus className="w-3.5 h-3.5" />
        </button>

        {showMenu && (
          <div
            style={{
              position: "absolute", top: "100%", left: 0, marginTop: "8px",
              background: "var(--surface)", 
              border: "1px solid rgba(59,130,246,0.15)", borderRadius: "10px",
              padding: "8px", zIndex: 100, minWidth: "260px", maxHeight: "360px",
              overflowY: "auto",
              boxShadow: "0 12px 40px -8px rgba(0,0,0,0.7), 0 0 20px rgba(59,130,246,0.05)",
            }}
            className="custom-scrollbar"
          >
            {/* Search */}
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "6px 8px", marginBottom: "6px",
              background: "var(--surface-hover)", borderRadius: "6px",
              border: "1px solid var(--border)",
            }}>
              <Search className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar filtro..."
                autoFocus
                style={{
                  background: "none", border: "none", color: "var(--foreground)",
                  fontSize: "11px", outline: "none", width: "100%",
                }}
              />
            </div>

            {filteredGroups.map((group) => (
              <div key={group.group}>
                <div style={{
                  fontSize: "9px", color: "var(--text-muted)",
                  textTransform: "uppercase", padding: "6px 8px 3px",
                  letterSpacing: "0.08em", fontWeight: 700,
                }}>
                  {group.group}
                </div>
                {group.filters.map((filter, idx) => (
                  <button
                    key={idx}
                    onClick={() => addFilter(filter)}
                    style={{
                      width: "100%", textAlign: "left", padding: "7px 10px",
                      fontSize: "11.5px", color: "var(--text-secondary)",
                      background: "transparent", border: "none", cursor: "pointer",
                      borderRadius: "5px", transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,129,251,0.15)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            ))}

            {filteredGroups.length === 0 && (
              <div style={{ padding: "12px", textAlign: "center", color: "var(--text-muted)", fontSize: "11px" }}>
                No se encontraron filtros
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilters.map((filter, idx) => (
        <div
          key={idx}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "4px 10px", background: "var(--surface)",
            border: "1px solid rgba(0,129,251,0.25)", borderRadius: "20px",
            color: "var(--foreground)", fontSize: "11px",
          }}
        >
          <span>{filter.label}</span>
          <button
            onClick={() => removeFilter(idx)}
            style={{
              background: "none", border: "none",
              color: "var(--text-secondary)", cursor: "pointer",
              display: "flex", alignItems: "center", padding: 0,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {activeFilters.length > 0 && (
        <button
          onClick={clearAll}
          style={{
            fontSize: "11px", color: "var(--text-muted)",
            background: "none", border: "none", cursor: "pointer",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          Borrar todo
        </button>
      )}
    </div>
  );
}
