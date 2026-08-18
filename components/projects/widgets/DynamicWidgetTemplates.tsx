"use client";

import React from "react";
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CustomTooltip } from "@/components/ui/charts/CustomTooltip";

export interface DynamicChartSeries {
  dataKey: string;
  label: string;
  type: "line" | "bar" | "area";
  color: string;
  yAxisId: "left" | "right";
  isCurrency?: boolean;
  isPercentage?: boolean;
}

export interface DynamicChartConfig {
  title: string;
  series: DynamicChartSeries[];
}

interface DynamicChartProps {
  config?: DynamicChartConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  timeSeriesData: any[];
  isLoading: boolean;
  fmtMXN: (n: number) => string;
}

function NoData({ msg = "Sin datos disponibles" }: { msg?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", minHeight: 120, gap: 12, padding: 20 }}>
      <p style={{ fontSize: 11, color: "var(--fc-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>{msg}</p>
    </div>
  );
}

export function DynamicComposedChartWidget({ config, timeSeriesData, fmtMXN }: DynamicChartProps) {
  if (!config || !config.series || config.series.length === 0) {
    return <NoData msg="Widget sin configurar" />;
  }

  const { series } = config;

  const hasLeft = series.some((s) => s.yAxisId === "left");
  const hasRight = series.some((s) => s.yAxisId === "right");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const formatValue = (val: any, s?: DynamicChartSeries) => {
    if (!s) return String(val);
    if (s.isCurrency) return fmtMXN(Number(val));
    if (s.isPercentage) return `${Number(val).toFixed(2)}%`;
    return String(val);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      {/* Legend only — title is shown in the DashboardWidget header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap", flexShrink: 0 }}>
        {series.map((s, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block" }} />
            <span style={{ fontSize: 10, color: "var(--fc-text-muted)" }}>{s.label}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, width: "100%", minHeight: 0 }}>
        {timeSeriesData.length > 0 ? (
          <ResponsiveContainer>
            <ComposedChart data={timeSeriesData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--fc-text-muted)" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" tick={{ fontFamily: "var(--font-mono)" }} />
              
              {hasLeft && (
                <YAxis 
                  yAxisId="left" 
                  stroke="var(--fc-text-muted)" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(v) => {
                    const leftSeries = series.find(s => s.yAxisId === "left");
                    return formatValue(v, leftSeries);
                  }}
                  tick={{ fontFamily: "var(--font-mono)" }} 
                />
              )}

              {hasRight && (
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="var(--fc-text-muted)" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(v) => {
                    const rightSeries = series.find(s => s.yAxisId === "right");
                    return formatValue(v, rightSeries);
                  }}
                  tick={{ fontFamily: "var(--font-mono)" }} 
                />
              )}

              <Tooltip 
                content={<CustomTooltip formatter={(name, v) => {
                  const s = series.find(sr => sr.label === name);
                  return [formatValue(v, s), name as string];
                }} />} 
                cursor={{ fill: "rgba(255,255,255,0.02)" }} 
              />
              
              {series.map((s, idx) => {
                if (s.type === "area") {
                  return <Area key={idx} yAxisId={s.yAxisId} type="monotone" dataKey={s.dataKey} name={s.label} stroke={s.color} strokeWidth={2} fillOpacity={0.1} fill={s.color} dot={false} />;
                }
                if (s.type === "bar") {
                  return <Bar key={idx} yAxisId={s.yAxisId} dataKey={s.dataKey} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} barSize={7} />;
                }
                if (s.type === "line") {
                  return <Line key={idx} yAxisId={s.yAxisId} type="monotone" dataKey={s.dataKey} name={s.label} stroke={s.color} strokeWidth={2} dot={{ r: 3, fill: "var(--fc-surface)", stroke: s.color, strokeWidth: 2 }} activeDot={{ r: 5, fill: s.color }} />;
                }
                return null;
              })}
            </ComposedChart>
          </ResponsiveContainer>
        ) : <NoData />}
      </div>
    </div>
  );
}

export interface DynamicKpiConfig {
  title: string;
  dataKey: string;
  isCurrency?: boolean;
  isPercentage?: boolean;
}

interface DynamicKpiProps {
  config?: DynamicKpiConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  totalData: Record<string, any>;
  fmtMXN: (n: number) => string;
}

export function DynamicKpiCardWidget({ config, totalData, fmtMXN }: DynamicKpiProps) {
  if (!config || !config.dataKey) {
    return <NoData msg="Widget sin configurar" />;
  }

  const { title, dataKey, isCurrency, isPercentage } = config;
  const value = totalData?.[dataKey] || 0;

  let displayValue = String(value);
  if (isCurrency) {
    displayValue = fmtMXN(Number(value));
  } else if (isPercentage) {
    displayValue = `${Number(value).toFixed(2)}%`;
  } else {
    displayValue = Number(value).toLocaleString("es-MX");
  }

  return (
    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ fontSize: 13, color: "var(--fc-text-muted)", fontWeight: 500, marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--fc-text)", letterSpacing: "-0.03em" }}>
        {displayValue}
      </div>
    </div>
  );
}
