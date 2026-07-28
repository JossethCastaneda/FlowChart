"use client";

import React, { useState } from "react";

const headingStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.03em", marginBottom: 4 };
const subStyle: React.CSSProperties = { fontSize: 11, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 };

interface HeatmapWidgetProps {
  breakdownData: Record<string, any[]>;
  ch: any;
  insights: any;
  heatmapTimezone: "advertiser" | "audience";
  setHeatmapTimezone: (v: "advertiser" | "audience") => void;
  /** Result action finder function */
  findResultAction: (actions: any[] | undefined, goal?: string, objective?: string) => any;
  /** Objective getter */
  getObjective: (entity: any, insights: any) => string | null;
  /** Goal label helper */
  goalLabel: (goal?: string) => string;
  fmtMXN: (n: number) => string;
  fmtNum: (n: number) => string;
}

export function HeatmapWidget({
  breakdownData, ch, insights,
  heatmapTimezone, setHeatmapTimezone,
  findResultAction, getObjective, goalLabel,
  fmtMXN, fmtNum,
}: HeatmapWidgetProps) {
  const [heatMetric, setHeatMetric] = useState<"results" | "impressions" | "spend">("results");

  const hourlyData = breakdownData["hourly_daily"] || [];
  if (hourlyData.length === 0) return null;

  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const DOW_LABELS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  // Build date × hour matrix
  const dateMap: Record<string, Record<number, { impressions: number; spend: number; clicks: number; results: number }>> = {};

  hourlyData.forEach((row: any) => {
    const hourRaw =
      row.hour ??
      row.hourly_stats_aggregated_by_audience_time_zone ??
      row.hourly_stats_aggregated_by_advertiser_time_zone;
    if (hourRaw === null || hourRaw === undefined) return;
    const hour = parseInt(String(hourRaw), 10);
    if (isNaN(hour) || hour < 0 || hour > 23) return;

    const dateStr = row.date_start;
    if (!dateStr) return;
    if (!dateMap[dateStr]) {
      dateMap[dateStr] = {};
      for (let h = 0; h < 24; h++) dateMap[dateStr][h] = { impressions: 0, spend: 0, clicks: 0, results: 0 };
    }
    dateMap[dateStr][hour].impressions += row.impressions || 0;
    dateMap[dateStr][hour].spend += row.spend || 0;
    dateMap[dateStr][hour].clicks += row.clicks || 0;

    const ra = findResultAction(row.actions, ch?.goal, getObjective(row, insights) ?? undefined);
    dateMap[dateStr][hour].results += ra ? parseInt(ra.value, 10) : 0;
  });

  const sortedDates = Object.keys(dateMap).sort();

  const formatDateLabel = (dateStr: string) => {
    const dt = new Date(dateStr + "T12:00:00");
    const dow = DOW_LABELS_SHORT[dt.getDay()];
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    return `${dow} ${dd}/${mm}`;
  };

  const heatMetrics = [
    { key: "results" as const, label: goalLabel(ch?.goal) || "Resultados" },
    { key: "impressions" as const, label: "Impresiones" },
    { key: "spend" as const, label: "Gasto" },
  ];

  const getVal = (cell: { impressions: number; spend: number; clicks: number; results: number }) => {
    if (heatMetric === "impressions") return cell.impressions;
    if (heatMetric === "spend") return cell.spend;
    return cell.results;
  };

  const fmtVal = (cell: { impressions: number; spend: number; clicks: number; results: number }) => {
    const v = getVal(cell);
    if (heatMetric === "spend") return v > 0 ? fmtMXN(v) : "";
    return v > 0 ? (v > 999 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))) : "";
  };

  let maxVal = 0;
  sortedDates.forEach(date => {
    for (let h = 0; h < 24; h++) {
      const v = getVal(dateMap[date][h]);
      if (v > maxVal) maxVal = v;
    }
  });

  const getColor = (val: number) => {
    if (maxVal === 0 || val === 0) return "var(--row-hover)";
    const intensity = val / maxVal;
    if (intensity > 0.75) return heatMetric === "spend" ? "rgba(251,191,36,0.7)" : "rgba(0,200,117,0.6)";
    if (intensity > 0.5) return heatMetric === "spend" ? "rgba(251,191,36,0.45)" : "rgba(0,200,117,0.35)";
    if (intensity > 0.25) return heatMetric === "spend" ? "rgba(251,191,36,0.25)" : "rgba(59,130,246,0.25)";
    if (intensity > 0.1) return heatMetric === "spend" ? "rgba(251,191,36,0.12)" : "rgba(59,130,246,0.12)";
    return "var(--border-neutral)";
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12, flexShrink: 0 }}>
        <div>
          <h3 style={headingStyle}>Distribución por Hora y Día</h3>
          <p style={subStyle}>Hover para ver detalle · Horas en zona horaria de la {heatmapTimezone === "advertiser" ? "cuenta publicitaria" : "audiencia"}</p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          {/* Timezone switcher */}
          <div style={{ display: "flex", gap: 3, background: "var(--surface-hover)", borderRadius: 8, padding: "3px" }}>
            {[
              { key: "advertiser", label: "Cuenta" },
              { key: "audience", label: "Audiencia" }
            ].map(tz => (
              <button
                key={tz.key}
                onClick={() => setHeatmapTimezone(tz.key as "advertiser" | "audience")}
                style={{
                  padding: "5px 12px", fontSize: 10, fontWeight: 700, border: "none",
                  borderRadius: 6, cursor: "pointer", transition: "all 0.15s",
                  background: heatmapTimezone === tz.key ? "var(--cyan)" : "transparent",
                  color: heatmapTimezone === tz.key ? "#000" : "var(--text-secondary)",
                  letterSpacing: "0.04em",
                }}
              >
                {tz.label}
              </button>
            ))}
          </div>
          {/* Metric switcher */}
          <div style={{ display: "flex", gap: 3, background: "var(--surface-hover)", borderRadius: 8, padding: "3px" }}>
            {heatMetrics.map(m => (
              <button
                key={m.key}
                onClick={() => setHeatMetric(m.key)}
                style={{
                  padding: "5px 12px", fontSize: 10, fontWeight: 700, border: "none",
                  borderRadius: 6, cursor: "pointer", transition: "all 0.15s",
                  background: heatMetric === m.key ? "var(--cyan)" : "transparent",
                  color: heatMetric === m.key ? "#000" : "var(--text-secondary)",
                  letterSpacing: "0.04em",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ overflowX: "auto", overflowY: "auto", flex: 1, minHeight: 0 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 740 }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
            <tr>
              <th style={{ padding: "5px 10px", fontSize: 9, color: "var(--text-muted)", textAlign: "left", fontWeight: 700, width: 76, background: "var(--surface)", letterSpacing: "0.06em" }}>FECHA</th>
              {HOURS.map(h => (
                <th key={h} style={{ padding: "5px 2px", fontSize: 9, color: "var(--text-muted)", textAlign: "center", fontWeight: 600, minWidth: 28, background: "var(--surface)" }}>
                  {h.toString().padStart(2, "0")}
                </th>
              ))}
              <th style={{ padding: "5px 8px", fontSize: 9, color: "rgba(59,130,246,0.6)", textAlign: "right", fontWeight: 700, minWidth: 52, background: "var(--surface)", letterSpacing: "0.06em" }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {sortedDates.map((dateStr) => {
              const dateLabel = formatDateLabel(dateStr);
              const dt = new Date(dateStr + "T12:00:00");
              const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
              const isToday = dateStr === todayStr;
              const rowTotal = HOURS.reduce((sum, h) => sum + getVal(dateMap[dateStr][h]), 0);
              return (
                <tr key={dateStr} style={{ background: isToday ? "rgba(59,130,246,0.04)" : "transparent" }}>
                  <td style={{
                    padding: "3px 10px", fontSize: 10,
                    color: isToday ? "var(--cyan)" : isWeekend ? "rgba(59,130,246,0.45)" : "var(--text-secondary)",
                    fontWeight: isToday ? 800 : 600, whiteSpace: "nowrap",
                    borderRight: isToday ? "2px solid rgba(59,130,246,0.35)" : "1px solid var(--hairline)",
                  }}>
                    {isToday ? "● " : ""}{dateLabel}
                  </td>
                  {HOURS.map(h => {
                    const cell = dateMap[dateStr][h];
                    const val = getVal(cell);
                    return (
                      <td
                        key={h}
                        title={`${dateLabel} ${h.toString().padStart(2, "0")}:00\nResultados: ${fmtNum(cell.results)}\nGasto: ${fmtMXN(cell.spend)}\nImpresiones: ${fmtNum(cell.impressions)}`}
                        style={{ padding: "1px", textAlign: "center" }}
                      >
                        <div style={{
                          width: "100%", height: 26,
                          background: getColor(val),
                          borderRadius: 3,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, color: val > 0 ? "var(--foreground)" : "transparent",
                          fontWeight: 700,
                          cursor: "default",
                          transition: "transform 0.1s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.4)"; e.currentTarget.style.zIndex = "10"; e.currentTarget.style.position = "relative"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.zIndex = "auto"; e.currentTarget.style.position = "static"; e.currentTarget.style.boxShadow = "none"; }}
                        >
                          {fmtVal(cell)}
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ padding: "3px 8px", textAlign: "right" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: rowTotal > 0 ? "rgba(59,130,246,0.8)" : "rgba(108,124,147,0.5)" }}>
                      {rowTotal > 0 ? (heatMetric === "spend" ? fmtMXN(rowTotal) : fmtNum(Math.round(rowTotal))) : "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot style={{ position: "sticky", bottom: 0 }}>
            <tr style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
              <td style={{ padding: "5px 10px", fontSize: 9, color: "rgba(59,130,246,0.6)", fontWeight: 700, letterSpacing: "0.08em" }}>TOTAL</td>
              {HOURS.map(h => {
                const colTotal = sortedDates.reduce((sum, dateStr) => sum + getVal(dateMap[dateStr][h]), 0);
                return (
                  <td key={h} style={{ padding: "3px 1px", textAlign: "center" }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: colTotal > 0 ? "rgba(59,130,246,0.7)" : "var(--hairline)" }}>
                      {colTotal > 0 ? (colTotal > 999 ? `${(colTotal / 1000).toFixed(1)}k` : Math.round(colTotal)) : ""}
                    </span>
                  </td>
                );
              })}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, justifyContent: "flex-end", flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600 }}>Menor actividad</span>
        {["var(--row-hover)", "var(--border-neutral)", "rgba(59,130,246,0.12)", "rgba(59,130,246,0.25)", "rgba(0,200,117,0.35)", "rgba(0,200,117,0.6)"].map((c, i) => (
          <div key={i} style={{ width: 16, height: 12, borderRadius: 3, background: c }} />
        ))}
        <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600 }}>Mayor actividad</span>
      </div>
    </div>
  );
}
