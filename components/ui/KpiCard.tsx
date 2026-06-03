import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "cyan" | "red" | "amber" | "emerald" | "purple";
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  context?: string;
}

export function KpiCard({
  label,
  value,
  icon,
  color = "cyan",
  trend,
  trendValue,
  context,
}: KpiCardProps) {
  const c = `var(--${color})`;

  return (
    <div className={`kpi-card ${color}`}>
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 36,
            height: 36,
            background: `rgba(0,0,0,0.2)`,
            border: `1px solid ${c}40`, // Fallback for border color
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: c,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <p className="kpi-value" style={{ color: "white" }}>
            {value}
          </p>
          <p className="kpi-label">{label}</p>
          
          {/* Trend & Context Layer */}
          {(trendValue || context) && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
              {trend && trendValue && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "2px",
                    padding: "2px 6px",
                    borderRadius: "2px",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    background: trend === "up" ? "rgba(6,214,160,0.1)" : trend === "down" ? "rgba(255,45,85,0.1)" : "rgba(148,163,184,0.1)",
                    color: trend === "up" ? "var(--emerald)" : trend === "down" ? "var(--red)" : "var(--foreground)",
                  }}
                >
                  {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : trend === "down" ? <ArrowDownRight className="w-3 h-3" /> : null}
                  {trendValue}
                </div>
              )}
              {context && (
                <span style={{ fontSize: "10px", color: "rgba(148,163,184,0.5)" }}>
                  {context}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
