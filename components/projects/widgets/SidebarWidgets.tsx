"use client";

import React from "react";
import { Link, DollarSign, TrendingUp } from "lucide-react";

const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 5 };
const headingStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.03em", marginBottom: 4 };
const subStyle: React.CSSProperties = { fontSize: 11, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 };

interface CuentasWidgetProps {
  ch: any;
  accountNames: Record<string, string>;
}

export function CuentasWidget({ ch, accountNames }: CuentasWidgetProps) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div className="icon-container icon-container-sm icon-container-active">
          <Link style={{ width: 14, height: 14, color: "var(--cyan)" }} />
        </div>
        <div>
          <h3 style={headingStyle}>Cuentas Vinculadas</h3>
          <p style={subStyle}>{ch?.adAccounts?.length || 0} cuenta{(ch?.adAccounts?.length || 0) !== 1 ? "s" : ""} conectada{(ch?.adAccounts?.length || 0) !== 1 ? "s" : ""}</p>
        </div>
      </div>
      {ch?.adAccounts?.length ? ch.adAccounts.map((acc: string) => (
        <div key={acc} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", marginBottom: 6, borderRadius: 10,
          background: "var(--surface-hover)", border: "1px solid var(--border)",
          transition: "background 0.15s", cursor: "default",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
        >
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #1877F2, #0A4FBD)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: "var(--foreground)", fontFamily: "serif" }}>f</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, color: "var(--foreground)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{accountNames[acc] || "Ad Account"}</p>
            <p style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{acc}</p>
          </div>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--emerald)", boxShadow: "0 0 6px rgba(0,200,117,0.6)", flexShrink: 0 }} />
        </div>
      )) : (
        <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
          <p style={{ marginBottom: 4 }}>Sin cuentas vinculadas</p>
          <p style={{ fontSize: 10 }}>Ve a Configuración para conectar</p>
        </div>
      )}
    </div>
  );
}

interface PresupuestoWidgetProps {
  bk: { daily: number; weekly: number; monthly: number; label: string };
  budgetNum: number;
  spendPace: number;
  idealSpendToday: number;
  totalSpend: number;
  fmtMXN: (n: number) => string;
  fmtMXN0: (n: number) => string;
  pct: (n: number) => string;
}

export function PresupuestoWidget({ bk, budgetNum, spendPace, idealSpendToday, totalSpend, fmtMXN, fmtMXN0, pct }: PresupuestoWidgetProps) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div className="icon-container icon-container-sm" style={{ background: "var(--surface)", borderColor: "rgba(224,168,60,0.2)", color: "var(--amber)" }}>
          <DollarSign style={{ width: 14, height: 14, color: "var(--amber)" }} />
        </div>
        <div>
          <h3 style={headingStyle}>Presupuesto</h3>
          <p style={subStyle}>{bk.label}: {fmtMXN0(budgetNum)}</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div style={{ padding: "10px 12px", background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 10 }}>
          <p style={{ ...labelStyle, marginBottom: 4 }}>Diario ideal</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--cyan)", fontFamily: "var(--font-display)" }}>{fmtMXN(bk.daily)}</p>
        </div>
        <div style={{ padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10 }}>
          <p style={{ ...labelStyle, marginBottom: 4 }}>Semanal ideal</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", fontFamily: "var(--font-display)" }}>{fmtMXN(bk.weekly)}</p>
        </div>
      </div>
      {/* Ritmo de gasto */}
      <div style={{
        padding: "12px 14px", borderRadius: 10,
        background: spendPace > 10 ? "rgba(226,68,92,0.08)" : spendPace < -10 ? "rgba(253,171,61,0.08)" : "rgba(0,200,117,0.08)",
        border: `1px solid ${spendPace > 10 ? "rgba(226,68,92,0.2)" : spendPace < -10 ? "rgba(253,171,61,0.2)" : "rgba(0,200,117,0.2)"}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <TrendingUp style={{ width: 12, height: 12, color: spendPace > 10 ? "var(--red)" : spendPace < -10 ? "var(--amber)" : "var(--emerald)" }} />
          <p style={{ fontSize: 9, color: "var(--text-secondary)", fontWeight: 700, letterSpacing: "0.1em" }}>RITMO DE GASTO</p>
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, color: spendPace > 10 ? "var(--red)" : spendPace < -10 ? "var(--amber)" : "var(--emerald)" }}>
          {spendPace > 10 ? `Adelantado +${pct(spendPace)}` : spendPace < -10 ? `Atrasado ${pct(spendPace)}` : "Al ritmo"}
        </p>
        <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
          Ideal hoy: <strong style={{ color: "var(--text-secondary)" }}>{fmtMXN(idealSpendToday)}</strong> · Real: <strong style={{ color: "var(--text-secondary)" }}>{fmtMXN(totalSpend)}</strong>
        </p>
      </div>
    </div>
  );
}
