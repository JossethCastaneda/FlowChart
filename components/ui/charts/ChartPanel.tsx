/**
 * ChartPanel — FlowChart standard chart wrapper
 * Encapsulates header (title + actions), body, loading and empty states.
 *
 * Usage:
 *   <ChartPanel title="INVERSIÓN VS RESULTADOS" action={<DateRangePicker />}>
 *     <ResponsiveContainer>...</ResponsiveContainer>
 *   </ChartPanel>
 */
"use client";

import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

interface ChartPanelProps {
  title: string;
  /** Optional element placed to the right of the title (e.g. DateRangePicker, badge) */
  action?: React.ReactNode;
  /** Legend items shown below the title */
  legend?: Array<{ label: string; color: string }>;
  children: React.ReactNode;
  loading?: boolean;
  /** Height of the chart area skeleton when loading. Default: 220px */
  loadingHeight?: number;
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
  style?: React.CSSProperties;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span
        style={{
          width: 8, height: 8, borderRadius: "50%",
          background: color, flexShrink: 0,
          boxShadow: `0 0 5px ${color}60`,
        }}
      />
      <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
    </div>
  );
}

export function ChartPanel({
  title,
  action,
  legend,
  children,
  loading = false,
  loadingHeight = 220,
  empty = false,
  emptyMessage = "Sin datos para el período seleccionado",
  className,
  style,
}: ChartPanelProps) {
  return (
    <div className={`chart-panel${className ? ` ${className}` : ""}`} style={style}>
      {/* Header */}
      <div className="chart-panel-header">
        <div>
          <span className="chart-panel-title">{title}</span>
          {legend && legend.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
              {legend.map((l) => (
                <LegendDot key={l.label} color={l.color} label={l.label} />
              ))}
            </div>
          )}
        </div>
        {action && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {action}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="chart-panel-body">
        {loading ? (
          <Skeleton
            style={{ height: loadingHeight, width: "100%", borderRadius: 8 }}
          />
        ) : empty ? (
          <div
            style={{
              height: loadingHeight,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <svg
              width={28}
              height={28}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth={1.5}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              {emptyMessage}
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
