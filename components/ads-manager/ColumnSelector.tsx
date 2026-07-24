import React, { useState, useRef, useCallback } from "react";
import { Columns, ChevronDown, GripVertical, ChevronRight, Eye, EyeOff } from "lucide-react";

interface ColumnSelectorProps {
  columns: { key: string; label: string }[];
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
}

// Column categories for organized display
const COLUMN_CATEGORIES: Record<string, string[]> = {
  "Configuración": ["name", "delivery", "budget", "objective", "bid_strategy", "optimization_goal", "last_edited"],
  "Rendimiento": ["roas", "results", "cpa", "cost_per_message", "cost_per_conversation", "conversations", "purchases", "cost_per_purchase", "leads", "cost_per_lead"],
  "Alcance": ["reach", "impressions", "cpm", "frequency"],
  "Clics": ["clicks", "ctr", "cpc", "landing_page_views", "outbound_clicks", "outbound_ctr", "unique_ctr"],
  "Video": ["hook_rate", "thruplay", "thruplay_rate", "cost_per_thruplay", "video_p25", "video_p50", "video_p75", "video_p100", "video_plays", "video_plays_100"],
  "E-commerce": ["add_to_cart", "cost_per_atc", "initiate_checkout", "cost_per_ic"],
  "Engagement": ["quality_ranking", "engagement_ranking", "conversion_ranking"],
  "Inversión": ["spend"],
};

export function ColumnSelector({ columns, selectedKeys, onChange }: ColumnSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(Object.keys(COLUMN_CATEGORIES)));
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [showOrder, setShowOrder] = useState(false);

  const toggleColumn = (key: string) => {
    if (selectedKeys.includes(key)) {
      if (selectedKeys.length > 1) {
        onChange(selectedKeys.filter((k) => k !== key));
      }
    } else {
      onChange([...selectedKeys, key]);
    }
  };

  const toggleCategory = (cat: string) => {
    const next = new Set(expandedCats);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setExpandedCats(next);
  };

  const selectAll = () => onChange(columns.map((c) => c.key));
  const selectNone = () => onChange(["name"]);

  // Drag-and-drop reorder
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const next = [...selectedKeys];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    onChange(next);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  // Get column label by key
  const getLabel = (key: string) => columns.find((c) => c.key === key)?.label || key;

  // Uncategorized columns
  const categorizedKeys = new Set(Object.values(COLUMN_CATEGORIES).flat());
  const uncategorized = columns.filter((c) => !categorizedKeys.has(c.key));

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px",
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px",
          color: "var(--text-secondary)", fontSize: "11px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "white"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
      >
        <Columns className="w-3.5 h-3.5" />
        <span>Columnas</span>
        <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 5px", borderRadius: "6px", background: "var(--cyan-dim)", color: "var(--cyan)" }}>
          {selectedKeys.length}
        </span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{
            position: "absolute", top: "100%", right: 0, marginTop: "4px",
            background: "var(--surface)", 
            border: "1px solid var(--border-strong)", borderRadius: "8px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)", zIndex: 50,
            width: "260px",
          }}>
            {/* Header tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "6px" }}>
              <button onClick={() => setShowOrder(false)} style={{
                flex: 1, padding: "4px", fontSize: "10px", fontWeight: 600, borderRadius: "4px", cursor: "pointer",
                background: !showOrder ? "rgba(59,130,246,0.08)" : "transparent",
                border: "none", color: !showOrder ? "var(--cyan)" : "var(--text-muted)",
              }}>
                Seleccionar
              </button>
              <button onClick={() => setShowOrder(true)} style={{
                flex: 1, padding: "4px", fontSize: "10px", fontWeight: 600, borderRadius: "4px", cursor: "pointer",
                background: showOrder ? "rgba(59,130,246,0.08)" : "transparent",
                border: "none", color: showOrder ? "var(--cyan)" : "var(--text-muted)",
              }}>
                Ordenar
              </button>
            </div>

            {!showOrder ? (
              /* -- SELECT TAB -- */
              <div style={{ maxHeight: "320px", overflowY: "auto", padding: "4px 0" }} className="custom-scrollbar">
                {/* Quick actions */}
                <div style={{ display: "flex", gap: "4px", padding: "4px 8px 8px" }}>
                  <button onClick={selectAll} style={{ flex: 1, padding: "3px", fontSize: "9px", fontWeight: 600, background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: "3px", color: "var(--cyan)", cursor: "pointer" }}>
                    Todas
                  </button>
                  <button onClick={selectNone} style={{ flex: 1, padding: "3px", fontSize: "9px", fontWeight: 600, background: "var(--surface-hover)", border: "1px solid var(--hairline)", borderRadius: "3px", color: "var(--text-muted)", cursor: "pointer" }}>
                    Solo nombre
                  </button>
                </div>

                {/* Categories */}
                {Object.entries(COLUMN_CATEGORIES).map(([cat, keys]) => (
                  <div key={cat}>
                    <button
                      onClick={() => toggleCategory(cat)}
                      style={{
                        display: "flex", alignItems: "center", gap: "4px", width: "100%",
                        padding: "5px 10px", fontSize: "9px", fontWeight: 700, color: "var(--text-secondary)",
                        background: "none", border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em",
                      }}
                    >
                      <ChevronRight className="w-3 h-3" style={{ transition: "transform 0.2s", transform: expandedCats.has(cat) ? "rotate(90deg)" : "rotate(0)" }} />
                      {cat}
                      <span style={{ fontSize: "8px", color: "var(--text-muted)", marginLeft: "auto" }}>
                        {keys.filter((k) => selectedKeys.includes(k)).length}/{keys.length}
                      </span>
                    </button>
                    {expandedCats.has(cat) && keys.map((key) => {
                      const col = columns.find((c) => c.key === key);
                      if (!col) return null;
                      const isChecked = selectedKeys.includes(key);
                      return (
                        <label key={key} style={{
                          display: "flex", alignItems: "center", gap: "6px",
                          padding: "4px 10px 4px 24px", cursor: "pointer",
                          fontSize: "11px", color: isChecked ? "white" : "var(--text-muted)",
                        }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <input type="checkbox" checked={isChecked} onChange={() => toggleColumn(key)} style={{ accentColor: "var(--cyan)", cursor: "pointer", width: "11px", height: "11px" }} />
                          <span>{col.label}</span>
                        </label>
                      );
                    })}
                  </div>
                ))}

                {/* Uncategorized */}
                {uncategorized.length > 0 && (
                  <div>
                    <div style={{ padding: "5px 10px", fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Otros
                    </div>
                    {uncategorized.map((col) => {
                      const isChecked = selectedKeys.includes(col.key);
                      return (
                        <label key={col.key} style={{
                          display: "flex", alignItems: "center", gap: "6px",
                          padding: "4px 10px 4px 24px", cursor: "pointer",
                          fontSize: "11px", color: isChecked ? "white" : "var(--text-muted)",
                        }}>
                          <input type="checkbox" checked={isChecked} onChange={() => toggleColumn(col.key)} style={{ accentColor: "var(--cyan)", cursor: "pointer", width: "11px", height: "11px" }} />
                          <span>{col.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* -- ORDER TAB (drag & drop) -- */
              <div style={{ maxHeight: "320px", overflowY: "auto", padding: "4px 0" }} className="custom-scrollbar">
                <div style={{ padding: "4px 10px 8px", fontSize: "9px", color: "var(--text-muted)" }}>
                  Arrastra para reordenar las columnas visibles
                </div>
                {selectedKeys.map((key, idx) => (
                  <div
                    key={key}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px", padding: "5px 10px",
                      cursor: "grab", fontSize: "11px", color: "var(--foreground)",
                      background: dragOverIdx === idx ? "rgba(59,130,246,0.06)" : "transparent",
                      borderTop: dragOverIdx === idx ? "2px solid var(--cyan)" : "2px solid transparent",
                      opacity: dragIdx === idx ? 0.4 : 1,
                    }}
                  >
                    <GripVertical className="w-3 h-3" style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    <span style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: 700, width: "16px" }}>{idx + 1}</span>
                    <span style={{ flex: 1 }}>{getLabel(key)}</span>
                    <button
                      onClick={() => toggleColumn(key)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }}
                    >
                      <EyeOff className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
