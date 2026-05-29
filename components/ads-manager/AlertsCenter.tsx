"use client";

import React, { useState } from "react";
import { AlertTriangle, AlertCircle, TrendingUp, ChevronDown, ChevronUp, X } from "lucide-react";
import type { Alert, AlertLevel } from "@/hooks/useAlerts";

interface AlertsCenterProps {
  alerts: Alert[];
}

const LEVEL_CONFIG: Record<AlertLevel, {
  icon: React.ReactNode;
  borderColor: string;
  bgColor: string;
  textColor: string;
  label: string;
}> = {
  critical: {
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    borderColor: "rgba(239,68,68,0.3)",
    bgColor: "rgba(239,68,68,0.06)",
    textColor: "#ef4444",
    label: "ALERTA CRÍTICA",
  },
  warning: {
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    borderColor: "rgba(251,191,36,0.3)",
    bgColor: "rgba(251,191,36,0.06)",
    textColor: "#fbbf24",
    label: "ADVERTENCIA",
  },
  positive: {
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    borderColor: "rgba(52,211,153,0.3)",
    bgColor: "rgba(52,211,153,0.06)",
    textColor: "#34d399",
    label: "POSITIVO",
  },
};

export function AlertsCenter({ alerts }: AlertsCenterProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (alerts.length === 0) return null;

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const criticalCount = visible.filter((a) => a.level === "critical").length;
  const warningCount = visible.filter((a) => a.level === "warning").length;
  const positiveCount = visible.filter((a) => a.level === "positive").length;

  const displayed = expanded ? visible : visible.slice(0, 3);

  return (
    <div style={{
      borderRadius: "8px",
      border: criticalCount > 0
        ? "1px solid rgba(239,68,68,0.15)"
        : warningCount > 0
        ? "1px solid rgba(251,191,36,0.12)"
        : "1px solid rgba(52,211,153,0.12)",
      background: "rgba(255,255,255,0.01)",
      overflow: "hidden",
    }}>
      {/* Summary header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 14px", cursor: "pointer",
          background: criticalCount > 0 ? "rgba(239,68,68,0.04)" : warningCount > 0 ? "rgba(251,191,36,0.03)" : "rgba(52,211,153,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "10px" }}>
          {criticalCount > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: "3px", color: "#ef4444", fontWeight: 700 }}>
              <AlertCircle className="w-3.5 h-3.5" /> {criticalCount} crítica{criticalCount !== 1 ? "s" : ""}
            </span>
          )}
          {warningCount > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: "3px", color: "#fbbf24", fontWeight: 700 }}>
              <AlertTriangle className="w-3.5 h-3.5" /> {warningCount} advertencia{warningCount !== 1 ? "s" : ""}
            </span>
          )}
          {positiveCount > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: "3px", color: "#34d399", fontWeight: 700 }}>
              <TrendingUp className="w-3.5 h-3.5" /> {positiveCount} positiva{positiveCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "rgba(148,163,184,0.4)", fontSize: "9px" }}>
          {expanded ? "Colapsar" : `Ver ${visible.length} alertas`}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </div>
      </div>

      {/* Alert list */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {displayed.map((alert) => {
          const cfg = LEVEL_CONFIG[alert.level];
          return (
            <div
              key={alert.id}
              style={{
                display: "flex", alignItems: "flex-start", gap: "8px",
                padding: "8px 14px",
                borderTop: `1px solid rgba(255,255,255,0.03)`,
                background: cfg.bgColor,
              }}
            >
              <div style={{ color: cfg.textColor, flexShrink: 0, marginTop: "1px" }}>
                {cfg.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: cfg.textColor, marginBottom: "2px" }}>
                  {alert.title}
                </div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", lineHeight: "1.4" }}>
                  {alert.message}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDismissed(prev => new Set(prev).add(alert.id));
                }}
                style={{
                  background: "none", border: "none", color: "rgba(148,163,184,0.3)",
                  cursor: "pointer", padding: 0, flexShrink: 0,
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Show more */}
      {!expanded && visible.length > 3 && (
        <div
          onClick={() => setExpanded(true)}
          style={{
            padding: "6px 14px", textAlign: "center",
            fontSize: "9px", color: "rgba(148,163,184,0.4)", cursor: "pointer",
            borderTop: "1px solid rgba(255,255,255,0.03)",
          }}
        >
          Ver {visible.length - 3} alertas más...
        </div>
      )}
    </div>
  );
}
