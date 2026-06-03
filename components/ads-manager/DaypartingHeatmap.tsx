import React, { useState, useMemo } from "react";
import { Clock, ChevronDown } from "lucide-react";
import { fmt$, fmtPct, fmtNum } from "@/lib/ads-metrics";

interface DaypartingHeatmapProps {
  /** Raw hourly breakdown data from Meta API (breakdown=hourly_stats_aggregated_by_audience_time_zone) */
  data: any[];
}

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const TIME_SLOTS = [
  { label: "6-9am", hours: [6, 7, 8] },
  { label: "9-12pm", hours: [9, 10, 11] },
  { label: "12-3pm", hours: [12, 13, 14] },
  { label: "3-6pm", hours: [15, 16, 17] },
  { label: "6-9pm", hours: [18, 19, 20] },
  { label: "9-12am", hours: [21, 22, 23] },
  { label: "12-6am", hours: [0, 1, 2, 3, 4, 5] },
];

type MetricKey = "cpa" | "ctr" | "roas" | "cpc" | "cpm";

const METRIC_OPTIONS: { key: MetricKey; label: string; format: (v: number) => string; invert: boolean }[] = [
  { key: "cpa", label: "CPA", format: (v) => fmt$(v), invert: true },
  { key: "ctr", label: "CTR", format: (v) => fmtPct(v), invert: false },
  { key: "cpc", label: "CPC", format: (v) => fmt$(v), invert: true },
  { key: "cpm", label: "CPM", format: (v) => fmt$(v), invert: true },
];

function getCellColor(value: number, min: number, max: number, invert: boolean): string {
  if (max === min || value === 0) return "rgba(255,255,255,0.04)";
  
  // Normalize to 0-1 range
  let normalized = (value - min) / (max - min);
  if (invert) normalized = 1 - normalized; // For cost metrics: low = good

  if (normalized >= 0.75) return "rgba(52,211,153,0.25)"; // Green — best
  if (normalized >= 0.50) return "rgba(52,211,153,0.12)"; // Light green
  if (normalized >= 0.25) return "rgba(251,191,36,0.12)"; // Yellow
  return "rgba(239,68,68,0.15)"; // Red — worst
}

function getCellTextColor(value: number, min: number, max: number, invert: boolean): string {
  if (max === min || value === 0) return "rgba(148,163,184,0.65)";
  let normalized = (value - min) / (max - min);
  if (invert) normalized = 1 - normalized;
  if (normalized >= 0.75) return "var(--emerald)";
  if (normalized >= 0.50) return "rgba(148,163,184,0.7)";
  if (normalized >= 0.25) return "var(--amber)";
  return "var(--red)";
}

export function DaypartingHeatmap({ data }: DaypartingHeatmapProps) {
  const [metric, setMetric] = useState<MetricKey>("cpa");
  const [showDropdown, setShowDropdown] = useState(false);

  const currentMetric = METRIC_OPTIONS.find(m => m.key === metric)!;

  // Build the 7×7 grid (days × time slots)
  const grid = useMemo(() => {
    // Aggregate data by day-of-week and hour
    const buckets: Record<string, { spend: number; actions: number; impressions: number; clicks: number }> = {};

    for (const row of data) {
      const date = new Date(row.date_start || "");
      const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon...
      const dayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Mon=0
      const hour = parseInt(row.hourly_stats_aggregated_by_audience_time_zone || "0");

      const key = `${dayIdx}-${hour}`;
      if (!buckets[key]) buckets[key] = { spend: 0, actions: 0, impressions: 0, clicks: 0 };
      buckets[key].spend += parseFloat(row.spend || "0");
      buckets[key].impressions += parseFloat(row.impressions || "0");
      buckets[key].clicks += parseFloat(row.clicks || "0");
      
      // Count primary action
      if (row.actions && Array.isArray(row.actions)) {
        for (const a of row.actions) {
          if (["lead", "purchase", "omni_purchase", "onsite_conversion.messaging_conversation_started_7d", "complete_registration"].includes(a.action_type)) {
            buckets[key].actions += parseFloat(a.value || "0");
          }
        }
      }
    }

    // Build grid cells
    const cells: { day: number; slot: number; value: number; spend: number; hasData: boolean }[] = [];
    let minVal = Infinity, maxVal = -Infinity;

    for (let day = 0; day < 7; day++) {
      for (let slotIdx = 0; slotIdx < TIME_SLOTS.length; slotIdx++) {
        const slot = TIME_SLOTS[slotIdx];
        let spend = 0, actions = 0, impressions = 0, clicks = 0;

        for (const hour of slot.hours) {
          const key = `${day}-${hour}`;
          if (buckets[key]) {
            spend += buckets[key].spend;
            actions += buckets[key].actions;
            impressions += buckets[key].impressions;
            clicks += buckets[key].clicks;
          }
        }

        let value = 0;
        const hasData = spend > 0;
        
        switch (metric) {
          case "cpa": value = actions > 0 ? spend / actions : 0; break;
          case "ctr": value = impressions > 0 ? (clicks / impressions) * 100 : 0; break;
          case "cpc": value = clicks > 0 ? spend / clicks : 0; break;
          case "cpm": value = impressions > 0 ? (spend / impressions) * 1000 : 0; break;
        }

        if (hasData && value > 0) {
          minVal = Math.min(minVal, value);
          maxVal = Math.max(maxVal, value);
        }

        cells.push({ day, slot: slotIdx, value, spend, hasData });
      }
    }

    return { cells, minVal: minVal === Infinity ? 0 : minVal, maxVal: maxVal === -Infinity ? 0 : maxVal };
  }, [data, metric]);

  // Find recommendation
  const recommendation = useMemo(() => {
    if (grid.cells.filter(c => c.hasData).length < 5) return null;
    
    const worstSlots = grid.cells
      .filter(c => c.hasData && c.value > 0)
      .sort((a, b) => {
        if (currentMetric.invert) return b.value - a.value; // highest cost = worst
        return a.value - b.value; // lowest rate = worst
      })
      .slice(0, 3);

    if (worstSlots.length === 0) return null;

    const slotLabels = [...new Set(worstSlots.map(s => TIME_SLOTS[s.slot].label))].join(", ");
    const totalWastedSpend = worstSlots.reduce((a, c) => a + c.spend, 0);

    return {
      text: `Considera pausar delivery en ${slotLabels} para optimizar ${currentMetric.label}.`,
      spend: totalWastedSpend,
    };
  }, [grid, currentMetric]);

  if (data.length === 0) {
    return (
      <div style={{
        padding: "24px", textAlign: "center",
        background: "rgba(255,255,255,0.015)", border: "1px solid var(--border)", borderRadius: "8px",
      }}>
        <Clock className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(148,163,184,0.65)" }} />
        <p style={{ fontSize: "11px", color: "#64748b" }}>
          Selecciona breakdown "Hora del día" para ver el heatmap
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.015)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      padding: "16px 20px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#64748b" }}>
          Rendimiento por Horario
        </span>

        {/* Metric selector */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px",
              background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.1)", borderRadius: "4px",
              color: "var(--cyan)", fontSize: "10px", fontWeight: 600, cursor: "pointer",
            }}
          >
            {currentMetric.label} <ChevronDown className="w-3 h-3" />
          </button>
          {showDropdown && (
            <>
              <div onClick={() => setShowDropdown(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div style={{
                position: "absolute", top: "100%", right: 0, marginTop: "4px", zIndex: 50,
                background: "rgba(5,8,18,0.98)", border: "1px solid var(--border-strong)", borderRadius: "6px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)", padding: "4px 0", minWidth: "100px",
              }}>
                {METRIC_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => { setMetric(opt.key); setShowDropdown(false); }}
                    style={{
                      display: "block", width: "100%", padding: "6px 12px", fontSize: "11px",
                      background: opt.key === metric ? "rgba(0,212,255,0.06)" : "transparent",
                      border: "none", color: opt.key === metric ? "var(--cyan)" : "rgba(200,214,229,0.7)",
                      cursor: "pointer", textAlign: "left",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(0,212,255,0.05)"}
                    onMouseLeave={e => e.currentTarget.style.background = opt.key === metric ? "rgba(0,212,255,0.06)" : "transparent"}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", gap: "2px" }}>
        {/* Header row */}
        <div /> {/* Empty corner */}
        {DAYS.map(day => (
          <div key={day} style={{
            textAlign: "center", fontSize: "9px", fontWeight: 700, color: "#64748b",
            padding: "4px 0", textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            {day}
          </div>
        ))}

        {/* Data rows */}
        {TIME_SLOTS.map((slot, slotIdx) => (
          <React.Fragment key={slot.label}>
            {/* Row label */}
            <div style={{
              display: "flex", alignItems: "center", fontSize: "9px", color: "#64748b",
              fontWeight: 600, paddingRight: "8px", justifyContent: "flex-end",
            }}>
              {slot.label}
            </div>
            {/* Cells */}
            {DAYS.map((_, dayIdx) => {
              const cell = grid.cells.find(c => c.day === dayIdx && c.slot === slotIdx);
              if (!cell || !cell.hasData) {
                return (
                  <div key={dayIdx} style={{
                    background: "rgba(255,255,255,0.04)", borderRadius: "3px",
                    padding: "8px 4px", textAlign: "center",
                  }}>
                    <span style={{ fontSize: "9px", color: "rgba(148,163,184,0.22)" }}>—</span>
                  </div>
                );
              }
              return (
                <div key={dayIdx} style={{
                  background: getCellColor(cell.value, grid.minVal, grid.maxVal, currentMetric.invert),
                  borderRadius: "3px",
                  padding: "8px 4px",
                  textAlign: "center",
                  transition: "all 0.2s",
                  cursor: "default",
                }}
                  title={`${DAYS[dayIdx]} ${slot.label}: ${currentMetric.format(cell.value)} | Gasto: ${fmt$(cell.spend)}`}
                >
                  <span style={{
                    fontSize: "10px", fontWeight: 700,
                    color: getCellTextColor(cell.value, grid.minVal, grid.maxVal, currentMetric.invert),
                  }}>
                    {cell.value > 0 ? currentMetric.format(cell.value) : "—"}
                  </span>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "12px", justifyContent: "center" }}>
        {[
          { label: "Mejor", color: "rgba(52,211,153,0.25)", text: "var(--emerald)" },
          { label: "Bueno", color: "rgba(52,211,153,0.12)", text: "#64748b" },
          { label: "Regular", color: "rgba(251,191,36,0.12)", text: "var(--amber)" },
          { label: "Peor", color: "rgba(239,68,68,0.15)", text: "var(--red)" },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: 12, height: 12, borderRadius: "2px", background: item.color }} />
            <span style={{ fontSize: "9px", color: "#64748b" }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      {recommendation && (
        <div style={{
          marginTop: "12px", padding: "10px 14px", borderRadius: "6px",
          background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <span style={{ fontSize: "14px" }}>💡</span>
          <div>
            <span style={{ fontSize: "11px", color: "var(--amber)" }}>{recommendation.text}</span>
            <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "8px" }}>
              Potencial ahorro: {fmt$(recommendation.spend)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
