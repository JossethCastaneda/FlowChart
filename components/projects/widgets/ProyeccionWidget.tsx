"use client";

import React from "react";
import type { ProjectWidgetProps } from "./types";

const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 5 };
const headingStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.03em", marginBottom: 4 };
const subStyle: React.CSSProperties = { fontSize: 11, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 };

export function ProyeccionWidget({
  daysElapsed, daysInMonth, goalNum, trackStatus,
  projectedResults, projectedSpend, goalBreakdown,
  dailyNeeded, goalCompletion, daysRemaining,
  bk, cprTarget, fmtNum, fmtMXN, fmtMXN0, pct,
}: ProjectWidgetProps) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h3 style={headingStyle}>Proyección al Cierre</h3>
          <p style={subStyle}>Día {daysElapsed} de {daysInMonth} del mes{goalNum > 0 ? ` · Meta: ${fmtNum(goalNum)} resultados (${fmtMXN0(bk.monthly)} ÷ ${fmtMXN(cprTarget)})` : ""}</p>
        </div>
        <div style={{
          padding: "5px 14px", borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
          background: trackStatus === "on-track" ? "rgba(0,200,117,0.12)" : trackStatus === "at-risk" ? "rgba(253,171,61,0.12)" : "rgba(226,68,92,0.12)",
          color: trackStatus === "on-track" ? "var(--emerald)" : trackStatus === "at-risk" ? "var(--amber)" : "var(--red)",
          border: `1px solid ${trackStatus === "on-track" ? "rgba(0,200,117,0.25)" : trackStatus === "at-risk" ? "rgba(253,171,61,0.25)" : "rgba(226,68,92,0.25)"}`,
          boxShadow: trackStatus === "on-track" ? "0 0 12px rgba(0,200,117,0.15)" : trackStatus === "at-risk" ? "0 0 12px rgba(253,171,61,0.15)" : "0 0 12px rgba(226,68,92,0.15)",
        }}>
          {trackStatus === "on-track" ? "EN TRACK" : trackStatus === "at-risk" ? "EN RIESGO" : trackStatus === "off-track" ? "FUERA DE TRACK" : cprTarget <= 0 ? "FALTA CPR META" : "SIN OBJETIVO"}
        </div>
      </div>
      {/* Sub-KPI mini-cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Res. proyectados", value: fmtNum(projectedResults), sub: goalNum > 0 ? `de ${fmtNum(goalNum)} objetivo` : "sin meta", color: "var(--emerald)", accentColor: "rgba(0,200,117,0.35)" },
          { label: "Gasto proyectado", value: fmtMXN0(projectedSpend), sub: `de ${fmtMXN0(bk.monthly)} mensual`, color: "var(--amber)", accentColor: "rgba(253,171,61,0.35)" },
          { label: "Meta diaria ideal", value: goalBreakdown.daily > 0 ? goalBreakdown.daily.toFixed(1) : "—", sub: "resultados/día", color: "var(--cyan)", accentColor: "rgba(59,130,246,0.35)" },
          { label: "Ritmo necesario", value: dailyNeeded > 0 ? fmtNum(dailyNeeded) : "—", sub: "res/día restantes", color: dailyNeeded > 0 ? "var(--amber)" : "var(--text-muted)", accentColor: dailyNeeded > 0 ? "rgba(253,171,61,0.35)" : "rgba(255,255,255,0.1)" },
          { label: "Cumplimiento", value: goalNum > 0 ? pct(goalCompletion) : "—", sub: `${daysRemaining} días restantes`, color: goalCompletion >= 100 ? "var(--emerald)" : "white", accentColor: goalCompletion >= 100 ? "rgba(0,200,117,0.35)" : "rgba(255,255,255,0.1)" },
        ].map((item, i) => (
          <div key={i} style={{
            background: "var(--surface-hover)", borderRadius: 10,
            border: "1px solid var(--border)", padding: "12px 14px",
            borderTop: `2px solid ${item.accentColor}`, position: "relative", overflow: "hidden",
          }}>
            <p style={{ ...labelStyle, marginBottom: 6 }}>{item.label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: item.color, fontFamily: "var(--font-display)", lineHeight: 1 }}>{item.value}</p>
            <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>{item.sub}</p>
          </div>
        ))}
      </div>
      {goalNum > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.1em" }}>PROGRESO DEL MES</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: trackStatus === "on-track" ? "var(--emerald)" : trackStatus === "at-risk" ? "var(--amber)" : "var(--red)" }}>{pct(Math.min(goalCompletion, 100))}</span>
          </div>
          <div style={{ height: 6, background: "var(--surface-hover)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(goalCompletion, 100)}%`, background: trackStatus === "on-track" ? "var(--emerald)" : trackStatus === "at-risk" ? "var(--amber)" : "var(--red)", borderRadius: 3, transition: "width 0.5s", boxShadow: `0 0 8px ${trackStatus === "on-track" ? "rgba(0,200,117,0.5)" : "rgba(253,171,61,0.5)"}` }} />
          </div>
        </div>
      )}
    </div>
  );
}
