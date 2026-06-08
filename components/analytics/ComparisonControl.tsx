"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Calendar, TrendingUp, ChevronDown } from "lucide-react";

export type CompareMode = "none" | "previous" | "prev_year";

export interface ComparisonState {
  days: number;          // period length sent to the API as ?days=
  compare: CompareMode;  // comparison window
}

interface Props {
  onChange: (state: ComparisonState) => void;
}

const PERIOD_OPTIONS: { days: number; label: string }[] = [
  { days: 7, label: "Últimos 7 días" },
  { days: 28, label: "Últimos 28 días" },
  { days: 90, label: "Últimos 90 días" },
];

const COMPARE_OPTIONS: { key: CompareMode; label: string }[] = [
  { key: "none", label: "Sin comparación" },
  { key: "previous", label: "Periodo anterior" },
  { key: "prev_year", label: "Año anterior" },
];

const STORE_KEY = "sodare:analytics-comparison";

/** Human label for an active comparison — reused by the KPI cards via export. */
export function compareLabel(mode: CompareMode): string {
  return mode === "previous" ? "vs periodo anterior" : mode === "prev_year" ? "vs año anterior" : "";
}

export function ComparisonControl({ onChange }: Props) {
  const [days, setDays] = useState(28);
  const [compare, setCompare] = useState<CompareMode>("none");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const periodRef = useRef<HTMLDivElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);

  const emit = useCallback((next: ComparisonState) => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    onChange(next);
  }, [onChange]);

  // Restore saved preference on mount.
  useEffect(() => {
    let restored: ComparisonState = { days: 28, compare: "none" };
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.days === "number") restored.days = p.days;
        if (["none", "previous", "prev_year"].includes(p.compare)) restored.compare = p.compare;
      }
    } catch { /* ignore */ }
    setDays(restored.days);
    setCompare(restored.compare);
    onChange(restored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdowns on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) setPeriodOpen(false);
      if (compareRef.current && !compareRef.current.contains(e.target as Node)) setCompareOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const periodLabel = PERIOD_OPTIONS.find((p) => p.days === days)?.label || `Últimos ${days} días`;
  const compareText = COMPARE_OPTIONS.find((c) => c.key === compare)?.label || "Sin comparación";
  const compareActive = compare !== "none";

  const menu = (children: React.ReactNode) => (
    <div style={{
      position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 200,
      background: "#0c1222", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10, overflow: "hidden", zIndex: 100,
      boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
    }}>{children}</div>
  );

  const item = (active: boolean, label: string, onClick: () => void, accent: string) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "10px 14px",
        background: active ? `${accent}10` : "transparent",
        border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)",
        borderLeft: active ? `3px solid ${accent}` : "3px solid transparent",
        color: active ? "#e2e8f0" : "#94a3b8",
        fontSize: 13, fontWeight: active ? 600 : 400,
        cursor: "pointer", textAlign: "left", fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      {/* Period */}
      <div ref={periodRef} style={{ position: "relative" }}>
        <button
          onClick={() => setPeriodOpen((o) => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 14px", borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${periodOpen ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.08)"}`,
            color: "#e2e8f0", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <Calendar style={{ width: 14, height: 14, color: "#00d4ff" }} />
          <span>{periodLabel}</span>
          <ChevronDown style={{ width: 14, height: 14, color: "#64748b" }} />
        </button>
        {periodOpen && menu(PERIOD_OPTIONS.map((p) =>
          item(p.days === days, p.label, () => {
            setDays(p.days); setPeriodOpen(false); emit({ days: p.days, compare });
          }, "#00d4ff")
        ))}
      </div>

      {/* Compare */}
      <div ref={compareRef} style={{ position: "relative" }}>
        <button
          onClick={() => setCompareOpen((o) => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 14px", borderRadius: 8,
            background: compareActive ? "rgba(244,114,182,0.1)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${compareOpen ? "rgba(244,114,182,0.35)" : compareActive ? "rgba(244,114,182,0.3)" : "rgba(255,255,255,0.08)"}`,
            color: compareActive ? "#f472b6" : "#94a3b8", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <TrendingUp style={{ width: 14, height: 14 }} />
          <span>{compareText}</span>
          <ChevronDown style={{ width: 14, height: 14, opacity: 0.7 }} />
        </button>
        {compareOpen && menu(COMPARE_OPTIONS.map((c) =>
          item(c.key === compare, c.label, () => {
            setCompare(c.key); setCompareOpen(false); emit({ days, compare: c.key });
          }, "#f472b6")
        ))}
      </div>
    </div>
  );
}
