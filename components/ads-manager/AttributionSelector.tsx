import React, { useState } from "react";
import { Eye, ChevronDown } from "lucide-react";

const ATTRIBUTION_OPTIONS = [
  { value: "default", label: "Default (7d click, 1d view)", short: "Default" },
  { value: "1d_click", label: "1 día click", short: "1d Click" },
  { value: "7d_click", label: "7 días click", short: "7d Click" },
  { value: "1d_view_1d_click", label: "1 día click + 1 día view", short: "1d C+V" },
  { value: "7d_click_1d_view", label: "7 días click + 1 día view", short: "7d C, 1d V" },
  { value: "28d_click_1d_view", label: "28 días click + 1 día view", short: "28d C, 1d V" },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function AttributionSelector({ value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const current = ATTRIBUTION_OPTIONS.find(o => o.value === value) || ATTRIBUTION_OPTIONS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px",
          background: "rgba(10, 15, 30, 0.6)", border: "1px solid var(--border)", borderRadius: "6px",
          color: "rgba(148,163,184,0.8)", fontSize: "11px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "white"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "rgba(148,163,184,0.8)"; }}
      >
        <Eye className="w-3.5 h-3.5" />
        <span>Atribución: {current.short}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{
            position: "absolute", top: "100%", right: 0, marginTop: "4px",
            background: "rgba(5, 8, 18, 0.98)", backdropFilter: "blur(20px)",
            border: "1px solid var(--border-strong)", borderRadius: "8px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)", zIndex: 50,
            width: "260px", padding: "4px 0",
          }}>
            <div style={{ padding: "6px 12px 4px", fontSize: "9px", fontWeight: 700, color: "rgba(148,163,184,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Ventana de Atribución
            </div>
            {ATTRIBUTION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: "8px", width: "100%",
                  padding: "7px 12px", fontSize: "11px", border: "none", cursor: "pointer", textAlign: "left",
                  background: opt.value === value ? "rgba(0,212,255,0.06)" : "transparent",
                  color: opt.value === value ? "var(--cyan)" : "rgba(200,214,229,0.7)",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(0,212,255,0.05)"}
                onMouseLeave={e => e.currentTarget.style.background = opt.value === value ? "rgba(0,212,255,0.06)" : "transparent"}
              >
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: opt.value === value ? "var(--cyan)" : "rgba(148,163,184,0.2)",
                  boxShadow: opt.value === value ? "0 0 6px var(--cyan)" : "none",
                }} />
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
