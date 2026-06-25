import React, { useState } from "react";
import { Info } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
  formulaDef?: string; // Definición y fórmula para el tooltip
  trafficLight?: {
    value: number;
    thresholds: { good: number, warning: number }; // ej. { good: 80, warning: 50 } (mayor es mejor) o { good: 10, warning: 30 } (menor es mejor)
    isHigherBetter: boolean;
  };
}

export function KpiTooltipCard({ title, value, sub, icon: Icon, color, formulaDef, trafficLight }: KpiCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Semáforo
  let lightColor = "transparent";
  if (trafficLight) {
    const { value: tv, thresholds, isHigherBetter } = trafficLight;
    if (isHigherBetter) {
      if (tv >= thresholds.good) lightColor = "var(--emerald)"; // Verde
      else if (tv >= thresholds.warning) lightColor = "var(--amber)"; // Amarillo
      else lightColor = "var(--red)"; // Rojo
    } else {
      if (tv <= thresholds.good) lightColor = "var(--emerald)"; // Verde
      else if (tv <= thresholds.warning) lightColor = "var(--amber)"; // Amarillo
      else lightColor = "var(--red)"; // Rojo
    }
  }

  return (
    <div style={{ background: "var(--row-hover)", border: "1px solid var(--hairline)", padding: "20px", borderRadius: "12px", position: "relative" }}>
      
      {/* Tooltip Icon */}
      {formulaDef && (
        <div 
          style={{ position: "absolute", top: "16px", right: "16px", cursor: "help" }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <Info className="w-4 h-4 text-slate-500 hover:text-slate-300" />
          
          {showTooltip && (
            <div style={{
              position: "absolute", right: "0", top: "24px", width: "240px", zIndex: 50,
              background: "var(--foreground)", border: "1px solid var(--surface)", padding: "12px", borderRadius: "8px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)", fontSize: "12px", color: "var(--foreground)"
            }}>
              <p style={{ margin: 0, fontWeight: 600, color: "var(--foreground)", marginBottom: "4px" }}>Fórmula:</p>
              {formulaDef}
            </div>
          )}
        </div>
      )}

      {/* Traffic Light */}
      {trafficLight && (
        <div style={{ position: "absolute", top: "16px", right: formulaDef ? "40px" : "16px", width: "12px", height: "12px", borderRadius: "50%", background: lightColor, boxShadow: `0 0 10px ${lightColor}` }} />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ background: `${color}1A`, padding: "12px", borderRadius: "12px", color }}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: 600, margin: "0 0 4px" }}>{title}</p>
          <h4 style={{ color: "var(--foreground)", fontSize: "24px", fontWeight: 700, margin: 0 }}>{value}</h4>
          {sub && <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginTop: "4px" }}>{sub}</span>}
        </div>
      </div>
    </div>
  );
}
