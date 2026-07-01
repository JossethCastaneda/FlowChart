import React from "react";
import { TooltipProps } from "recharts";

export function CustomTooltip({ active, payload, label, formatter }: any) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "rgba(15, 23, 42, 0.85)", // Tailwind Slate 900
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "12px",
        padding: "12px 16px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        color: "white",
        minWidth: "150px"
      }}>
        <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "rgba(148, 163, 184, 0.9)", fontWeight: 600 }}>
          {label}
        </p>
        {payload.map((entry: any, index: number) => {
          let val = entry.value;
          if (formatter && typeof val === "number") {
            // @ts-ignore
            val = formatter(val, entry.name, entry, index, payload);
          }
          return (
            <div key={`item-${index}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px", fontSize: "13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ 
                  display: "inline-block", 
                  width: "8px", 
                  height: "8px", 
                  borderRadius: "50%", 
                  backgroundColor: entry.color || "#8B5CF6",
                  boxShadow: `0 0 8px ${entry.color || "#8B5CF6"}`
                }} />
                <span style={{ color: "rgba(255, 255, 255, 0.8)" }}>{entry.name}</span>
              </div>
              <span style={{ fontWeight: 700, fontFamily: "'Orbitron', sans-serif" }}>{val}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}
