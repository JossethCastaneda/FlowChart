"use client";

import React from "react";
import { DollarSign, Activity, Target, TrendingDown } from "lucide-react";

const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 5 };

/* ═══ ALERTAS DE GASTO ═══ */
interface AlertasGastoProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  timeSeriesData: any[];
  bk: { daily: number; weekly: number; monthly: number; label: string };
  effectiveBudget: number;
  totalSpend: number;
  idealSpendToday: number;
  cprTarget: number;
  cpr: number;
  totalResults: number;
  daysElapsed: number;
  fmtMXN: (n: number) => string;
  fmtMXN0: (n: number) => string;
  pct: (n: number) => string;
}

export function AlertasGastoWidget({
  timeSeriesData, bk, effectiveBudget, totalSpend, idealSpendToday,
  cprTarget, cpr, totalResults, daysElapsed,
  fmtMXN, fmtMXN0, pct,
}: AlertasGastoProps) {
  const alerts: { type: "warning" | "danger" | "info"; msg: string }[] = [];
  const todayStr2 = new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const todayS = timeSeriesData.filter((d: any) => d.fullDate === todayStr2).reduce((s: number, d: any) => s + d.spend, 0);
  if (todayS > bk.daily * 1.5) alerts.push({ type: "danger", msg: `Sobregasto hoy: ${fmtMXN0(todayS)} gastado (${pct((todayS / bk.daily) * 100)} del diario ideal de ${fmtMXN(bk.daily)})` });
  if (totalSpend > idealSpendToday * 1.2 && idealSpendToday > 0) alerts.push({ type: "warning", msg: `El acumulado (${fmtMXN0(totalSpend)}) va ${pct(((totalSpend / idealSpendToday) - 1) * 100)} por encima de la curva ideal (${fmtMXN0(idealSpendToday)})` });
  if (cprTarget > 0 && cpr > cprTarget * 1.5 && totalResults > 0) alerts.push({ type: "danger", msg: `CPR elevado: ${fmtMXN(cpr)} vs meta de ${fmtMXN(cprTarget)} (+${pct(((cpr / cprTarget) - 1) * 100)})` });
  if (effectiveBudget > 0 && totalSpend < idealSpendToday * 0.5 && daysElapsed > 5) alerts.push({ type: "info", msg: `Sub-gasto: solo ${pct((totalSpend / idealSpendToday) * 100)} del ideal acumulado. La campana esta activa?` });
  if (alerts.length === 0) return null;
  const colorMap = { danger: { bg: "rgba(226,68,92,0.08)", border: "rgba(226,68,92,0.3)", text: "var(--red)" }, warning: { bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.3)", text: "var(--amber)" }, info: { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.3)", text: "var(--cyan)" } };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {alerts.map((a, i) => {
        const c = colorMap[a.type];
        return <div key={i} style={{ padding: "8px 14px", borderRadius: 8, background: c.bg, border: `1px solid ${c.border}`, fontSize: 11, color: c.text, fontWeight: 500 }}>{a.msg}</div>;
      })}
    </div>
  );
}

/* ═══ BUDGET SUMMARY CARDS ═══ */
interface BudgetCardsProps {
  bk: { daily: number; weekly: number; monthly: number; label: string };
  effectiveBudget: number;
  totalSpend: number;
  idealSpendToday: number;
  daysRemaining: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  timeSeriesData: any[];
  goalBreakdown: { daily: number; weekly: number; monthly: number };
  fmtMXN: (n: number) => string;
  fmtMXN0: (n: number) => string;
  pct: (n: number) => string;
  panelStyle: React.CSSProperties;
}

export function BudgetCardsWidget({
  bk, effectiveBudget, totalSpend, idealSpendToday, daysRemaining,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  timeSeriesData, goalBreakdown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  fmtMXN, fmtMXN0, pct, panelStyle,
}: BudgetCardsProps) {
  const pctUsed = effectiveBudget > 0 ? (totalSpend / effectiveBudget) * 100 : 0;
  const isOverBudget = totalSpend > idealSpendToday * 1.1;

  const todayStr = new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const todaySpend = timeSeriesData.filter((d: any) => d.fullDate === todayStr).reduce((sum: number, d: any) => sum + d.spend, 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const todayResults = timeSeriesData.filter((d: any) => d.fullDate === todayStr).reduce((sum: number, d: any) => sum + d.results, 0);
  const todayOverBudget = todaySpend > bk.daily * 1.1;
  const todayPct = bk.daily > 0 ? (todaySpend / bk.daily) * 100 : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Presupuesto del periodo */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', height: '100%', borderTop: "2px solid rgba(251,191,36,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <DollarSign style={{ width: 12, height: 12, color: "var(--amber)" }} />
          </div>
          <p style={labelStyle}>Presupuesto del Periodo</p>
        </div>
        <p style={{ fontSize: 22, fontWeight: 700, color: "var(--amber)", fontFamily: "var(--font-display)", lineHeight: 1 }}>{fmtMXN0(effectiveBudget)}</p>
        <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>Diario: {fmtMXN(bk.daily)}</p>
      </div>
      {/* Gastado acumulado */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', height: '100%', borderTop: `2px solid ${isOverBudget ? "rgba(226,68,92,0.5)" : "rgba(59,130,246,0.5)"}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: isOverBudget ? "rgba(226,68,92,0.1)" : "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity style={{ width: 12, height: 12, color: isOverBudget ? "var(--red)" : "var(--cyan)" }} />
          </div>
          <p style={labelStyle}>Gastado Acumulado</p>
        </div>
        <p style={{ fontSize: 22, fontWeight: 700, color: isOverBudget ? "var(--red)" : "var(--cyan)", fontFamily: "var(--font-display)", lineHeight: 1 }}>{fmtMXN0(totalSpend)}</p>
        <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>de {fmtMXN0(effectiveBudget)} ({pct(pctUsed)})</p>
        {effectiveBudget > 0 && (
          <div style={{ marginTop: 8, height: 3, background: "var(--surface-hover)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(pctUsed, 100)}%`, background: isOverBudget ? "var(--red)" : "var(--cyan)", borderRadius: 2 }} />
          </div>
        )}
      </div>
      {/* Gastado hoy */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', height: '100%', borderTop: `2px solid ${todayOverBudget ? "rgba(226,68,92,0.5)" : "rgba(0,200,117,0.5)"}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: todayOverBudget ? "rgba(226,68,92,0.1)" : "rgba(0,200,117,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Target style={{ width: 12, height: 12, color: todayOverBudget ? "var(--red)" : "var(--emerald)" }} />
          </div>
          <p style={labelStyle}>Gastado Hoy</p>
        </div>
        <p style={{ fontSize: 22, fontWeight: 700, color: todayOverBudget ? "var(--red)" : "var(--emerald)", fontFamily: "var(--font-display)", lineHeight: 1 }}>{fmtMXN0(todaySpend)}</p>
        <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>de {fmtMXN(bk.daily)} diario ideal{todayResults > 0 ? ` · ${todayResults} resultado${todayResults > 1 ? "s" : ""}` : ""}</p>
        {bk.daily > 0 && (
          <div style={{ marginTop: 8, height: 3, background: "var(--surface-hover)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(todayPct, 100)}%`, background: todayOverBudget ? "var(--red)" : "var(--emerald)", borderRadius: 2 }} />
          </div>
        )}
      </div>
      {/* Restante */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', height: '100%', borderTop: "2px solid rgba(139,141,242,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingDown style={{ width: 12, height: 12, color: "var(--purple)" }} />
          </div>
          <p style={labelStyle}>Restante</p>
        </div>
        <p style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-display)", lineHeight: 1 }}>{fmtMXN0(Math.max(effectiveBudget - totalSpend, 0))}</p>
        <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>{effectiveBudget > 0 ? `${pct(Math.min((totalSpend / effectiveBudget) * 100, 100))} utilizado · ${daysRemaining} días restantes` : "Sin presupuesto configurado"}</p>
      </div>
    </div>
  );
}
