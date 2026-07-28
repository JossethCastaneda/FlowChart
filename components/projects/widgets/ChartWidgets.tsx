"use client";

import React from "react";
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { CustomTooltip } from "@/components/ui/charts/CustomTooltip";

interface ChartWidgetProps {
  timeSeriesData: any[];
  isLoading: boolean;
  fmtMXN: (n: number) => string;
}

function NoData({ msg = "Sin datos disponibles" }: { msg?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", minHeight: 120, gap: 12, padding: 20 }}>
      <p style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>{msg}</p>
    </div>
  );
}

export function InversionChartWidget({ timeSeriesData, fmtMXN }: ChartWidgetProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      {/* Legend only — title is shown in the DashboardWidget header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--cyan)", display: "inline-block" }} /><span style={{ fontSize: 10, color: "var(--text-muted)" }}>Inversión</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--emerald)", display: "inline-block" }} /><span style={{ fontSize: 10, color: "var(--text-muted)" }}>Resultados</span></div>
      </div>
      <div style={{ flex: 1, width: "100%", minHeight: 0 }}>
        {timeSeriesData.length > 0 ? (
          <ResponsiveContainer><ComposedChart data={timeSeriesData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" tick={{ fontFamily: "var(--font-mono)" }} />
            <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} tick={{ fontFamily: "var(--font-mono)" }} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} tick={{ fontFamily: "var(--font-mono)" }} />
            <Tooltip content={<CustomTooltip formatter={(name, v) => name === "spend" || name === "Inversión" ? [fmtMXN(Number(v)), "Inversión"] : [String(v), "Resultados"]} />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
            <Area yAxisId="left" type="monotone" dataKey="spend" name="Inversión" stroke="var(--cyan)" strokeWidth={2} fillOpacity={1} fill="url(#colorCyanArea)" dot={false} />
            <Bar yAxisId="right" dataKey="results" name="Resultados" fill="url(#colorEmeraldBar)" radius={[4, 4, 0, 0]} barSize={7} />
          </ComposedChart></ResponsiveContainer>
        ) : <NoData />}
      </div>
    </div>
  );
}

export function CtrCpcChartWidget({ timeSeriesData, fmtMXN }: ChartWidgetProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      {/* Legend only — title is shown in the DashboardWidget header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--cyan)", display: "inline-block" }} /><span style={{ fontSize: 10, color: "var(--text-muted)" }}>CTR %</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--amber)", display: "inline-block" }} /><span style={{ fontSize: 10, color: "var(--text-muted)" }}>CPC $</span></div>
      </div>
      <div style={{ flex: 1, width: "100%", minHeight: 0 }}>
        {timeSeriesData.length > 0 ? (
          <ResponsiveContainer><ComposedChart data={timeSeriesData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" tick={{ fontFamily: "var(--font-mono)" }} />
            <YAxis yAxisId="l" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} tick={{ fontFamily: "var(--font-mono)" }} />
            <YAxis yAxisId="r" orientation="right" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} tick={{ fontFamily: "var(--font-mono)" }} />
            <Tooltip content={<CustomTooltip formatter={(name, v) => name === "ctr" || name === "CTR (%)" ? [`${Number(v).toFixed(2)}%`, "CTR"] : [fmtMXN(Number(v)), "CPC"]} />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
            <Area yAxisId="l" type="monotone" dataKey="ctr" name="CTR (%)" stroke="var(--cyan)" strokeWidth={2} fillOpacity={1} fill="url(#colorCyanArea)" dot={false} />
            <Line yAxisId="r" type="monotone" dataKey="cpc" name="CPC ($)" stroke="var(--amber)" strokeWidth={2} dot={{ r: 3, fill: "var(--surface)", stroke: "var(--amber)", strokeWidth: 2 }} activeDot={{ r: 5, fill: "var(--amber)" }} />
          </ComposedChart></ResponsiveContainer>
        ) : <NoData />}
      </div>
    </div>
  );
}
