"use client";

import React from "react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const CPR_MAP: Record<string, string> = {
  "offsite_conversion.fb_pixel_lead": "CPL",
  "lead": "CPL",
  "link_click": "CPC",
  "landing_page_view": "CPLPV",
  "purchase": "CPA",
  "add_to_cart": "CPATC",
  "complete_registration": "CPCR",
  "initiate_checkout": "CPIC",
  "onsite_conversion.messaging_first_reply": "CPM1R",
  "onsite_conversion.messaging_conversation_started_7d": "CPCS",
  "page_engagement": "CPPE",
  "post_engagement": "CPPOST",
  "video_view": "CPV",
  "omni_purchase": "CPA",
  "omni_add_to_cart": "CPATC",
};

function TimeToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)" }}>
      {[
        { key: "day", label: "D" },
        { key: "week", label: "S" },
        { key: "month", label: "M" },
      ].map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          style={{
            padding: "4px 10px", fontSize: 10, fontWeight: 700,
            background: value === opt.key ? "var(--cyan)" : "transparent",
            color: value === opt.key ? "#000" : "var(--text-secondary)",
            border: "none", cursor: "pointer", transition: "all 0.15s",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function NoData({ msg = "Sin datos disponibles" }: { msg?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", gap: 12, padding: 20 }}>
      <p style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>{msg}</p>
    </div>
  );
}

const tooltipStyle: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.4)", fontSize: 11 };

interface GastoSpendTableInlineProps {
  panelStyle: React.CSSProperties;
  headingStyle: React.CSSProperties;
  subStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  timeSeriesData: any[];
  timeGranularity: string;
  setTimeGranularity: (v: string) => void;
  getSpendTable: () => any[];
  bk: { daily: number; weekly: number; monthly: number; label: string };
  totalSpend: number;
  totalResults: number;
  goalNum: number;
  goalBreakdown: { daily: number; weekly: number; monthly: number };
  cprTarget: number;
  ch: any;
  project: any;
  insights: any;
  daysElapsed: number;
  daysInMonth: number;
  fmtMXN: (n: number) => string;
  fmtMXN0: (n: number) => string;
  fmtNum: (n: number) => string;
  pct: (n: number) => string;
  goalLabel: (goal?: string) => string;
  findResultAction: (actions: any[] | undefined, goal?: string, objective?: string) => any;
}

export function GastoSpendTableInline({
  panelStyle, headingStyle, subStyle, labelStyle,
  timeSeriesData, timeGranularity, setTimeGranularity,
  getSpendTable, bk, totalSpend, totalResults,
  goalNum, goalBreakdown, cprTarget,
  ch, project,
  fmtMXN, fmtMXN0, fmtNum, pct,
  goalLabel,
}: GastoSpendTableInlineProps) {

  // Budget computed
  const budgetNum = bk.monthly;
  const projectedSpend = timeSeriesData.length > 0
    ? (totalSpend / (timeSeriesData.length || 1)) * 30
    : 0;
  const projectedResults = timeSeriesData.length > 0
    ? Math.round((totalResults / (timeSeriesData.length || 1)) * 30)
    : 0;

  return (
    <div className="space-y-3">
      {/* Spend Table */}
      <div style={panelStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div><h3 style={headingStyle}>Tabla de Gasto</h3><p style={subStyle}>Desglose de inversión y rendimiento</p></div>
          <TimeToggle value={timeGranularity} onChange={setTimeGranularity} />
        </div>
        <div style={{ overflowX: "auto" }}>
          {(() => {
            const tableData = getSpendTable();
            const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

            const cols = tableData.map((d: any) => {
              let dayName = "";
              if (d.fullDate) {
                const dt = new Date(d.fullDate + "T12:00:00");
                dayName = DAYS_ES[dt.getDay()] || "";
              }
              return { ...d, dayName };
            });

            const totPresupuesto = budgetNum;
            const totGastado = totalSpend;
            const pctGastado = budgetNum > 0 ? (totalSpend / budgetNum) * 100 : 0;
            const totLeads = totalResults;
            const totCPL = totalResults > 0 ? totalSpend / totalResults : 0;
            const totCumplimiento = goalNum > 0 ? (totalResults / goalNum) * 100 : 0;
            const desvioCPL = cprTarget > 0 ? ((totCPL / cprTarget) - 1) * 100 : 0;

            const cellStyle: React.CSSProperties = { padding: "6px 8px", textAlign: "right", fontSize: 11, color: "var(--foreground)", border: "1px solid var(--hairline)", whiteSpace: "nowrap" };
            const headerCellStyle: React.CSSProperties = { ...cellStyle, textAlign: "center", color: "var(--foreground)", fontWeight: 700, fontSize: 10, background: "var(--cyan)", borderBottom: "none" };
            const subHeaderStyle: React.CSSProperties = { ...cellStyle, textAlign: "center", color: "var(--foreground)", fontWeight: 600, fontSize: 9, background: "var(--surface)", borderBottom: "1px solid rgba(0,120,255,0.3)" };
            const labelCellStyle: React.CSSProperties = { ...cellStyle, textAlign: "left", fontWeight: 600, color: "var(--foreground)", fontSize: 11, paddingLeft: 12, position: "sticky" as const, left: 0, background: "var(--surface)", border: "1px solid var(--border)", zIndex: 2 };
            const totalCellStyle: React.CSSProperties = { ...cellStyle, fontWeight: 700, background: "var(--surface-hover)", border: "1px solid var(--hairline)", position: "sticky" as const, left: 0, zIndex: 2 };

            const todayFullDate = new Date().toISOString().slice(0, 10);

            const getCellColor = (rowLabel: string, value: string): string => {
              if (value === "—" || value === "$0.00" || value === "0") return "var(--text-muted)";
              if (rowLabel === "%Gastado") {
                const num = parseFloat(value.replace("%", ""));
                if (num > 120) return "var(--red)";
                if (num > 100) return "var(--amber)";
                if (num >= 60) return "var(--emerald)";
                return "var(--text-secondary)";
              }
              if (rowLabel === "Cumplimiento") {
                const num = parseFloat(value.replace("%", ""));
                if (num >= 100) return "var(--emerald)";
                if (num >= 50) return "var(--amber)";
                return "var(--red)";
              }
              if (rowLabel === "Desvío") {
                const num = parseFloat(value.replace("+", "").replace("%", ""));
                if (num <= 0) return "var(--emerald)";
                if (num > 30) return "var(--red)";
                return "var(--amber)";
              }
              return "inherit";
            };

            const metricRows = [
              { label: "Presupuesto", key: "presupuesto", total: fmtMXN0(totPresupuesto), values: cols.map(() => fmtMXN(bk.daily)), color: "var(--foreground)" },
              { label: "Importe Gastado", key: "gastado", total: fmtMXN0(totGastado), values: cols.map((c: any) => fmtMXN(c.spend)), color: "var(--amber)" },
              { label: "%Gastado", key: "pctGastado", total: pct(pctGastado), values: cols.map((c: any) => bk.daily > 0 ? pct((c.spend / bk.daily) * 100) : "—"), color: "var(--foreground)" },
              { label: goalLabel(ch?.goal), key: "leads", total: fmtNum(totLeads), values: cols.map((c: any) => String(c.results || 0)), color: "var(--emerald)" },
              { label: "Cumplimiento", key: "cumplimiento", total: goalNum > 0 ? pct(totCumplimiento) : "—", values: cols.map((c: any) => goalBreakdown.daily > 0 ? pct((c.results / goalBreakdown.daily) * 100) : "—"), color: "#c084fc" },
              { label: CPR_MAP[ch?.goal || ""] || "CPR", key: "cpr", total: fmtMXN(totCPL), values: cols.map((c: any) => c.results > 0 ? fmtMXN(c.spend / c.results) : "—"), color: "var(--cyan)" },
              { label: `${CPR_MAP[ch?.goal || ""] || "CPR"} Objetivo`, key: "cprObj", total: cprTarget > 0 ? fmtMXN(cprTarget) : "—", values: cols.map(() => cprTarget > 0 ? fmtMXN(cprTarget) : "—"), color: "var(--text-secondary)" },
              { label: "Desvío", key: "desvio", total: cprTarget > 0 ? `${desvioCPL > 0 ? "+" : ""}${desvioCPL.toFixed(1)}%` : "—", values: cols.map((c: any) => { if (!cprTarget || c.results === 0) return "—"; const d = ((c.spend / c.results) / cprTarget - 1) * 100; return `${d > 0 ? "+" : ""}${d.toFixed(1)}%`; }), color: "var(--text-secondary)" },
            ];

            const exportCSV = () => {
              const headers = ["Métrica", "Al Día", ...cols.map((c: any) => c.fullDate || c.date)];
              const rows = metricRows.map(row => [row.label, row.total, ...row.values]);
              const csvContent = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
              const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `gasto_${project.alias || "proyecto"}_${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            };

            return (
              <>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <button onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", background: "var(--surface-hover)", border: "1px solid var(--border)", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "var(--foreground)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                >
                  Exportar CSV
                </button>
              </div>
              <table style={{ borderCollapse: "collapse", fontSize: 11, minWidth: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ ...totalCellStyle, background: "var(--surface-hover)", borderBottom: "none", minWidth: 100, textAlign: "left", fontSize: 10, color: "var(--foreground)" }}>AL DÍA</th>
                    <th style={{ ...labelCellStyle, borderBottom: "none", minWidth: 120, fontSize: 10, color: "var(--foreground)" }}>FECHA</th>
                    {cols.map((c: any, i: number) => {
                      const isToday = c.fullDate === todayFullDate;
                      return <th key={i} style={{ ...headerCellStyle, ...(isToday ? { background: "var(--emerald)", fontWeight: 800 } : {}) }}>{c.dayName}{isToday ? " (Hoy)" : ""}</th>;
                    })}
                  </tr>
                  <tr>
                    <th style={{ ...totalCellStyle, borderBottom: "2px solid rgba(0,120,255,0.3)" }}></th>
                    <th style={{ ...labelCellStyle, borderBottom: "2px solid rgba(0,120,255,0.3)" }}></th>
                    {cols.map((c: any, i: number) => {
                      const isToday = c.fullDate === todayFullDate;
                      return <th key={i} style={{ ...subHeaderStyle, ...(isToday ? { background: "rgba(0,200,117,0.1)", borderBottom: "2px solid var(--emerald)" } : {}) }}>{c.date}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={2 + cols.length} style={{ padding: "8px 12px", fontWeight: 700, fontSize: 11, color: "var(--cyan)", background: "var(--cyan-dim)", borderBottom: "1px solid rgba(59,130,246,0.1)", letterSpacing: "0.05em" }}>
                      {project.alias?.toUpperCase() || "PROYECTO"}
                    </td>
                  </tr>
                  {metricRows.map((row, ri) => (
                    <tr key={ri} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.015)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ ...totalCellStyle, color: row.color, textAlign: "right", paddingRight: 12, minWidth: 100 }}>{row.total}</td>
                      <td style={labelCellStyle}>{row.label}</td>
                      {row.values.map((v: string, ci: number) => {
                        const isToday = cols[ci]?.fullDate === todayFullDate;
                        const smartColor = getCellColor(row.label, v);
                        const cellColor = smartColor !== "inherit" ? smartColor : (row.color === "var(--foreground)" ? "var(--text-muted)" : row.color);
                        return (
                          <td key={ci} style={{
                            ...cellStyle,
                            color: cellColor,
                            fontWeight: v !== "—" && v !== "$0.00" && v !== "0" ? 500 : 400,
                            ...(isToday ? { background: "rgba(0,200,117,0.04)", borderLeft: "1px solid rgba(0,200,117,0.2)", borderRight: "1px solid rgba(0,200,117,0.2)" } : {}),
                          }}>{v}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            );
          })()}
        </div>
      </div>

      {/* Spend Chart */}
      <div style={panelStyle}>
        <h3 style={headingStyle}>Curva de Gasto vs Presupuesto Ideal</h3>
        <div style={{ width: "100%", height: 280 }}>
          {timeSeriesData.length > 0 ? <ResponsiveContainer><ComposedChart data={timeSeriesData.map((d: any, i: number) => ({ ...d, idealAccum: bk.daily * (i + 1), spendAccum: timeSeriesData.slice(0, i + 1).reduce((a: number, b: any) => a + b.spend, 0) }))} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} /><XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" angle={0} textAnchor="middle" />
            <YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: any, n: any) => [fmtMXN(v as number), n]} /><Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="spendAccum" name="Gasto acumulado" stroke="var(--amber)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="idealAccum" name="Presupuesto ideal" stroke="rgba(148,163,184,0.65)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </ComposedChart></ResponsiveContainer> : <NoData />}
        </div>
      </div>
    </div>
  );
}
