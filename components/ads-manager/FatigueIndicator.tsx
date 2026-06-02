import React, { useState } from "react";
import { quickFatigueCheck, getFatigueDisplay } from "@/lib/creative-fatigue";

interface FatigueIndicatorProps {
  /** Raw insight row data */
  insights: any;
}

export function FatigueIndicator({ insights }: FatigueIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const level = quickFatigueCheck(insights);
  const display = getFatigueDisplay(level);
  const frequency = parseFloat(insights.frequency || "0");
  const ctr = parseFloat(insights.ctr || "0");

  return (
    <div
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span style={{
        fontSize: "9px",
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: "3px",
        background: display.bg,
        border: `1px solid ${display.border}`,
        color: display.color,
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
        cursor: "default",
        transition: "all 0.15s",
      }}>
        {display.icon} {display.label}
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: "50%",
          transform: "translateX(-50%)",
          width: "220px",
          padding: "10px 12px",
          background: "rgba(5,8,18,0.98)",
          border: "1px solid var(--border-strong)",
          borderRadius: "8px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          zIndex: 100,
          pointerEvents: "none",
        }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: display.color, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {display.icon} {display.label}
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
              <span style={{ color: "rgba(148,163,184,0.5)" }}>Frecuencia</span>
              <span style={{ color: frequency >= 3 ? "var(--amber)" : "var(--foreground)", fontWeight: 600 }}>
                {frequency.toFixed(1)}x
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
              <span style={{ color: "rgba(148,163,184,0.5)" }}>CTR</span>
              <span style={{ color: ctr < 1.0 ? "var(--red)" : "var(--foreground)", fontWeight: 600 }}>
                {ctr.toFixed(2)}%
              </span>
            </div>
          </div>

          {level === "warning" && (
            <div style={{ fontSize: "9px", color: "var(--amber)", marginTop: "8px", lineHeight: 1.4 }}>
              💡 Prepara nuevos creativos antes de que el rendimiento caiga más.
            </div>
          )}
          {level === "critical" && (
            <div style={{ fontSize: "9px", color: "var(--red)", marginTop: "8px", lineHeight: 1.4 }}>
              ⚠️ Rota creativos inmediatamente. CTR y CPM muestran fatiga severa.
            </div>
          )}

          {/* Arrow */}
          <div style={{
            position: "absolute",
            bottom: "-5px",
            left: "50%",
            transform: "translateX(-50%) rotate(45deg)",
            width: "10px",
            height: "10px",
            background: "rgba(5,8,18,0.98)",
            borderRight: "1px solid var(--border-strong)",
            borderBottom: "1px solid var(--border-strong)",
          }} />
        </div>
      )}
    </div>
  );
}
