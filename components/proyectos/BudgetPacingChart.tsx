"use client";

import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { fmt$, fmtPct } from "@/lib/ads-metrics";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";

interface BudgetPacingChartProps {
  /** Daily spend data from Meta insights [{ date_start: "2024-01-15", spend: "450.00" }] */
  dailyData: { date_start: string; spend: string | number }[];
  /** Monthly budget target */
  budget: number;
  /** Budget period: "Mensual" | "Semanal" | "Diario" */
  period?: string;
}

export function BudgetPacingChart({ dailyData, budget, period = "Mensual" }: BudgetPacingChartProps) {
  const chartData = useMemo(() => {
    if (!dailyData.length || budget <= 0) return null;

    // Sort by date
    const sorted = [...dailyData].sort((a, b) => a.date_start.localeCompare(b.date_start));
    const firstDate = new Date(sorted[0].date_start);
    const lastDate = new Date(sorted[sorted.length - 1].date_start);

    // Determine total period days
    let totalDays: number;
    if (period === "Semanal") totalDays = 7;
    else if (period === "Diario") totalDays = 1;
    else {
      // Monthly: days in the month of the first data point
      const year = firstDate.getFullYear();
      const month = firstDate.getMonth();
      totalDays = new Date(year, month + 1, 0).getDate();
    }

    // Build chart points
    let cumulativeSpend = 0;
    const points: { day: number; label: string; ideal: number; real: number; projected?: number }[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const daySpend = parseFloat(String(sorted[i].spend || "0"));
      cumulativeSpend += daySpend;
      const dayNum = i + 1;
      const dateObj = new Date(sorted[i].date_start);
      const label = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;

      points.push({
        day: dayNum,
        label,
        ideal: (budget / totalDays) * dayNum,
        real: cumulativeSpend,
      });
    }

    // Add projection line to end of month
    const currentDay = points.length;
    if (currentDay > 0 && currentDay < totalDays) {
      const dailyRate = cumulativeSpend / currentDay;
      for (let d = currentDay + 1; d <= totalDays; d++) {
        const projected = dailyRate * d;
        const dateObj = new Date(firstDate);
        dateObj.setDate(firstDate.getDate() + d - 1);
        points.push({
          day: d,
          label: `${dateObj.getDate()}/${dateObj.getMonth() + 1}`,
          ideal: (budget / totalDays) * d,
          real: 0, // no real data for future
          projected,
        });
      }
      // Also add projected value to last real point for line continuity
      if (points[currentDay - 1]) {
        points[currentDay - 1].projected = points[currentDay - 1].real;
      }
    }

    // Calculate metrics
    const idealToday = (budget / totalDays) * currentDay;
    const pacePercent = idealToday > 0 ? (cumulativeSpend / idealToday) * 100 : 0;
    const projectedTotal = currentDay > 0 ? (cumulativeSpend / currentDay) * totalDays : 0;
    const projectedOverUnder = budget > 0 ? ((projectedTotal - budget) / budget) * 100 : 0;

    let paceStatus: "on-track" | "underspending" | "overspending";
    if (pacePercent >= 90 && pacePercent <= 110) paceStatus = "on-track";
    else if (pacePercent < 90) paceStatus = "underspending";
    else paceStatus = "overspending";

    return {
      points,
      totalSpend: cumulativeSpend,
      budget,
      totalDays,
      currentDay,
      pacePercent,
      projectedTotal,
      projectedOverUnder,
      paceStatus,
    };
  }, [dailyData, budget, period]);

  if (!chartData || chartData.points.length === 0) {
    return null;
  }

  const statusConfig = {
    "on-track": { color: "var(--emerald)", bg: "rgba(52,211,153,0.06)", label: "On Track", icon: <Minus className="w-3.5 h-3.5" /> },
    "underspending": { color: "var(--amber)", bg: "rgba(251,191,36,0.06)", label: "Sub-paceando", icon: <TrendingDown className="w-3.5 h-3.5" /> },
    "overspending": { color: "var(--red)", bg: "rgba(239,68,68,0.06)", label: "Sobre-paceando", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  };
  const status = statusConfig[chartData.paceStatus];

  return (
    <div style={{
      background: "rgba(255,255,255,0.015)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      padding: "16px 20px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#64748b" }}>
          Budget Pacing
        </span>
        <div style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "4px 10px", borderRadius: "4px",
          background: status.bg, color: status.color,
          fontSize: "10px", fontWeight: 700,
        }}>
          {status.icon}
          {status.label}
        </div>
      </div>

      {/* KPI Pills */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <PacingKPI label="Gastado" value={fmt$(chartData.totalSpend)} subtext={`de ${fmt$(chartData.budget)}`} />
        <PacingKPI
          label="Pace"
          value={`${chartData.pacePercent.toFixed(0)}%`}
          color={status.color}
          subtext={`Día ${chartData.currentDay} de ${chartData.totalDays}`}
        />
        <PacingKPI
          label="Proyección"
          value={fmt$(chartData.projectedTotal)}
          color={chartData.projectedOverUnder > 10 ? "var(--red)" : chartData.projectedOverUnder < -10 ? "var(--amber)" : "var(--emerald)"}
          subtext={`${chartData.projectedOverUnder > 0 ? "+" : ""}${chartData.projectedOverUnder.toFixed(0)}% vs budget`}
        />
      </div>

      {/* Chart */}
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData.points} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="realGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--cyan)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--cyan)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "#64748b" }}
              axisLine={{ stroke: "rgba(255,255,255,0.09)" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 9, fill: "rgba(148,163,184,0.65)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(5,8,18,0.95)",
                border: "1px solid var(--border-strong)",
                borderRadius: "6px",
                fontSize: "11px",
              }}
              labelStyle={{ color: "#94a3b8" }}
              formatter={(value: any, name: any) => [fmt$(Number(value || 0)), name === "ideal" ? "Ideal" : name === "real" ? "Real" : "Proyección"]}
            />
            {/* Budget line */}
            <ReferenceLine
              y={chartData.budget}
              stroke="rgba(239,68,68,0.3)"
              strokeDasharray="4 4"
              label={{ value: "Budget", position: "right", fill: "rgba(239,68,68,0.4)", fontSize: 9 }}
            />
            {/* Ideal pace */}
            <Area
              type="monotone"
              dataKey="ideal"
              stroke="rgba(148,163,184,0.65)"
              strokeDasharray="4 4"
              fill="none"
              strokeWidth={1.5}
            />
            {/* Real spend */}
            <Area
              type="monotone"
              dataKey="real"
              stroke="var(--cyan)"
              fill="url(#realGradient)"
              strokeWidth={2}
              connectNulls={false}
            />
            {/* Projected */}
            <Area
              type="monotone"
              dataKey="projected"
              stroke="var(--cyan)"
              strokeDasharray="6 3"
              fill="none"
              strokeWidth={1.5}
              strokeOpacity={0.5}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", marginTop: "8px", justifyContent: "center" }}>
        {[
          { label: "Ritmo ideal", color: "rgba(148,163,184,0.65)", dashed: true },
          { label: "Gasto real", color: "var(--cyan)", dashed: false },
          { label: "Proyección", color: "var(--cyan)", dashed: true },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{
              width: 20, height: 2, background: item.color,
              borderTop: item.dashed ? `2px dashed ${item.color}` : "none",
            }} />
            <span style={{ fontSize: "9px", color: "#64748b" }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Alert */}
      {chartData.paceStatus !== "on-track" && (
        <div style={{
          marginTop: "12px", padding: "10px 14px", borderRadius: "6px",
          background: chartData.paceStatus === "overspending" ? "rgba(239,68,68,0.05)" : "rgba(251,191,36,0.05)",
          border: `1px solid ${chartData.paceStatus === "overspending" ? "rgba(239,68,68,0.15)" : "rgba(251,191,36,0.15)"}`,
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <AlertTriangle className="w-4 h-4" style={{ color: status.color, flexShrink: 0 }} />
          <span style={{ fontSize: "11px", color: status.color }}>
            {chartData.paceStatus === "overspending"
              ? `Estás gastando ${(chartData.pacePercent - 100).toFixed(0)}% más rápido que el ritmo ideal. Reduce presupuesto diario para no exceder el budget.`
              : `Estás gastando ${(100 - chartData.pacePercent).toFixed(0)}% menos que el ritmo ideal. Incrementa presupuesto o revisa campañas pausadas.`
            }
          </span>
        </div>
      )}
    </div>
  );
}

function PacingKPI({ label, value, subtext, color }: { label: string; value: string; subtext?: string; color?: string }) {
  return (
    <div style={{
      padding: "8px 14px", borderRadius: "6px",
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
      flex: "1 1 120px", minWidth: "120px",
    }}>
      <div style={{ fontSize: "9px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </div>
      <div style={{ fontSize: "18px", fontWeight: 700, color: color || "var(--foreground)", fontFamily: "var(--font-display)", marginTop: "2px" }}>
        {value}
      </div>
      {subtext && (
        <div style={{ fontSize: "9px", color: "rgba(148,163,184,0.65)", marginTop: "2px" }}>
          {subtext}
        </div>
      )}
    </div>
  );
}
