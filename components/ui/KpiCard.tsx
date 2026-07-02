import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "cyan" | "red" | "amber" | "emerald" | "purple";
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  context?: string;
  /** 7 data points for the mini sparkline (optional) */
  sparkline?: number[];
}

const COLOR_MAP: Record<string, string> = {
  cyan:    "0,212,255",
  emerald: "6,214,160",
  amber:   "255,190,11",
  red:     "255,45,85",
  purple:  "123,97,255",
};

/**
 * Generates a tiny SVG polyline path from an array of 7 values.
 * Returns normalized points in a 64x28 viewBox.
 */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const rgb = COLOR_MAP[color] || COLOR_MAP.cyan;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 64;
  const h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline = pts.join(" ");
  // Area fill: close path below the line
  const area = `M${pts[0]} L${pts.join(" L")} L${w},${h} L0,${h} Z`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      style={{ overflow: "visible", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`rgb(${rgb})`} stopOpacity={0.25} />
          <stop offset="100%" stopColor={`rgb(${rgb})`} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={area} fill={`url(#sg-${color})`} />
      {/* Line */}
      <polyline
        points={polyline}
        stroke={`rgb(${rgb})`}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Last dot */}
      <circle
        cx={parseFloat(pts[pts.length - 1].split(",")[0])}
        cy={parseFloat(pts[pts.length - 1].split(",")[1])}
        r={2.5}
        fill={`rgb(${rgb})`}
      />
    </svg>
  );
}

export function KpiCard({
  label,
  value,
  icon,
  color = "cyan",
  trend,
  trendValue,
  context,
  sparkline,
}: KpiCardProps) {
  const c = `var(--${color})`;
  const rgb = COLOR_MAP[color] || COLOR_MAP.cyan;

  return (
    <div className={`kpi-card ${color}`}>
      {/* Header row: icon + sparkline */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            background: `rgba(${rgb}, 0.09)`,
            border: `1px solid rgba(${rgb}, 0.22)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: c,
            borderRadius: "10px",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        {sparkline && sparkline.length >= 2 && (
          <Sparkline data={sparkline} color={color} />
        )}
      </div>

      {/* Value + Label */}
      <p className="kpi-value" style={{ fontSize: "24px", color: "var(--foreground)", marginBottom: 4 }}>
        {value}
      </p>
      <p className="kpi-label">{label}</p>

      {/* Trend + Context */}
      {(trendValue || context) && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", flexWrap: "wrap" }}>
          {trend && trendValue && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
                padding: "2px 7px",
                borderRadius: "6px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                background:
                  trend === "up"
                    ? "rgba(6,214,160,0.12)"
                    : trend === "down"
                    ? "rgba(255,45,85,0.12)"
                    : "rgba(148,163,184,0.10)",
                color:
                  trend === "up"
                    ? "var(--emerald)"
                    : trend === "down"
                    ? "var(--red)"
                    : "var(--text-secondary)",
              }}
            >
              {trend === "up" ? (
                <ArrowUpRight style={{ width: 11, height: 11 }} />
              ) : trend === "down" ? (
                <ArrowDownRight style={{ width: 11, height: 11 }} />
              ) : (
                <Minus style={{ width: 11, height: 11 }} />
              )}
              {trendValue}
            </div>
          )}
          {context && (
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{context}</span>
          )}
        </div>
      )}
    </div>
  );
}
