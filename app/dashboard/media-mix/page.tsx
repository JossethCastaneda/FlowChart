"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { PieChart as PieChartIcon, TrendingUp, Database, Sliders, Settings2, ArrowLeft, RefreshCw, Plus, Trash2, Info, Zap, BarChart2, Activity, Target, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChannelConfig, WeeklyRow, MmmModel } from "@/lib/mmm/types";
import { runMmm, simulateBudget, optimizeBudget } from "@/lib/mmm/optimizer";
import { DEFAULT_CHANNELS, DEMO_ROWS } from "@/lib/mmm/demo-data";
import { adstockDecayCurve, adstockHalfLife } from "@/lib/mmm/adstock";
import { saturationCurve } from "@/lib/mmm/saturation";

type Tab = "resumen" | "datos" | "modelo" | "simulador" | "config";
const fmtCurrency = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtPct = (n: number) => (n * 100).toFixed(1) + "%";
const VIOLET = "#7c3aed"; const VIOLET_LIGHT = "rgba(124,58,237,0.12)"; const VIOLET_BORDER = "rgba(124,58,237,0.25)";


// ─── Mini Charts SVG ─────────────────────────────────────────────────────────
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, sg) => s + sg.value, 0);
  if (total <= 0) return <div style={{ width: 160, height: 160, borderRadius: "50%", background: "var(--surface-hover)" }} />;
  let angle = 0;
  const r = 60, cx = 80, cy = 80, sw = 22;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={160} height={160} viewBox="0 0 160 160">
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = pct * circ;
        const gap = circ - dash;
        const rot = angle; angle += pct * 360;
        return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={sw} strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-((rot / 360) * circ)} transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: "stroke-dasharray 0.5s" }} />;
      })}
      <circle cx={cx} cy={cy} r={r - sw / 2 - 4} fill="var(--surface)" />
    </svg>
  );
}

function SatCurveChart({ alpha, k, currentSpend, color }: { alpha: number; k: number; currentSpend: number; color: string }) {
  const maxS = Math.max(currentSpend * 2.5, k * 3, 5000);
  const pts = saturationCurve(alpha, k, maxS, currentSpend, 40);
  const w = 200, h = 80;
  const svgPts = pts.map(p => `${(p.spend / maxS) * w},${h - p.response * h}`).join(" ");
  const ci = pts.findIndex(p => p.isCurrent);
  const cx = ci >= 0 ? (pts[ci].spend / maxS) * w : -1;
  const cy = ci >= 0 ? h - pts[ci].response * h : -1;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={svgPts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <polyline points={`0,${h} ${svgPts} ${w},${h}`} fill={color} fillOpacity="0.08" stroke="none" />
      {ci >= 0 && <><line x1={cx} y1={0} x2={cx} y2={h} stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity="0.5" /><circle cx={cx} cy={cy} r={4} fill={color} /></>}
    </svg>
  );
}

function AdstockDecayChart({ lambda, color }: { lambda: number; color: string }) {
  const pts = adstockDecayCurve(lambda, 12);
  const w = 200, h = 60;
  const svgPts = pts.map((v, i) => `${(i / 11) * w},${h - v * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={svgPts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`0,${h} ${svgPts} ${w},${h}`} fill={color} fillOpacity="0.08" stroke="none" />
    </svg>
  );
}

function ModelFitChart({ actual, modeled }: { actual: number[]; modeled: number[] }) {
  if (actual.length < 2) return null;
  const all = [...actual, ...modeled]; const min = Math.min(...all); const max = Math.max(...all); const range = max - min || 1;
  const w = 400, h = 100; const n = actual.length;
  const toY = (v: number) => h - ((v - min) / range) * (h - 10) - 5;
  const aP = actual.map((v, i) => `${(i / (n - 1)) * w},${toY(v)}`).join(" ");
  const mP = modeled.map((v, i) => `${(i / (n - 1)) * w},${toY(v)}`).join(" ");
  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ minWidth: w }}>
        <polyline points={aP} fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" />
        <polyline points={mP} fill="none" stroke={VIOLET} strokeWidth="2" strokeDasharray="5,3" strokeLinecap="round" />
      </svg>
      <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-secondary)" }}><div style={{ width: 20, height: 2, background: "var(--cyan)", borderRadius: 1 }} /> Real</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-secondary)" }}><div style={{ width: 20, height: 2, background: VIOLET, borderRadius: 1 }} /> Modelo</div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, color = VIOLET, icon: Icon }: { label: string; value: string; sub?: string; color?: string; icon?: React.ElementType }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, borderRadius: "0 14px 0 80px", background: color, opacity: 0.07 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        {Icon && <div style={{ width: 30, height: 30, borderRadius: 8, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={14} color={color} /></div>}
      </div>
      <div>
        <p style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)", margin: 0, fontVariantNumeric: "tabular-nums" }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "3px 0 0" }}>{sub}</p>}
      </div>
    </div>
  );
}


// ─── Tab Resumen ──────────────────────────────────────────────────────────────
function TabResumen({ model, channels, rows }: { model: MmmModel | null; channels: ChannelConfig[]; rows: WeeklyRow[] }) {
  if (!model || rows.length < 3) return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-secondary)" }}>
      <Database size={40} color="var(--text-muted)" style={{ marginBottom: 16 }} />
      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: "0 0 8px" }}>Sin datos suficientes</p>
      <p style={{ fontSize: 13, margin: 0 }}>Ingresa al menos 3 semanas de datos en la pestana <strong>Datos</strong>.</p>
    </div>
  );
  const enabledCh = channels.filter(c => c.enabled);
  const totalSpend = rows.reduce((s, r) => s + enabledCh.reduce((ss, ch) => ss + (r.spend[ch.id] ?? 0), 0), 0);
  const totalRoas = totalSpend > 0 ? model.totalActual / totalSpend : 0;
  const bestCh = enabledCh.reduce((best, ch) => (model.channelRoas[ch.id] ?? 0) > (model.channelRoas[best?.id ?? ""] ?? -Infinity) ? ch : best, enabledCh[0]);
  const contribTotal = Object.values(model.contributions).reduce((s, v) => s + v, 0);
  const segments = enabledCh.map(ch => ({ label: ch.name, value: model.contributions[ch.id] ?? 0, color: ch.color }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <KpiCard label="ROAS Total" value={`${totalRoas.toFixed(2)}x`} sub={`${fmtCurrency(totalSpend)} invertidos`} color={VIOLET} icon={Target} />
        <KpiCard label="Revenue Atribuido" value={fmtCurrency(model.totalActual)} sub={`Modelo: ${fmtCurrency(model.totalModeled)}`} color="#059669" icon={TrendingUp} />
        <KpiCard label="Ajuste R2" value={`${(model.rSquared * 100).toFixed(0)}%`} sub="Que porciento explica el modelo" color="#0ea5e9" icon={Activity} />
        <KpiCard label="Mejor Canal" value={bestCh?.name ?? "—"} sub={`${(model.channelRoas[bestCh?.id ?? ""] ?? 0).toFixed(2)}x ROAS`} color={bestCh?.color ?? VIOLET} icon={Zap} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: "0 0 20px" }}>Contribucion por Canal</p>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <DonutChart segments={segments} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              {segments.map(seg => (
                <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1 }}>{seg.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>{contribTotal > 0 ? fmtPct(seg.value / contribTotal) : "0%"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: "0 0 8px" }}>Ajuste del Modelo</p>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 16px" }}>R2 = {(model.rSquared * 100).toFixed(1)}%</p>
          <ModelFitChart actual={rows.map(r => r.outcome)} modeled={model.modeledSeries} />
        </div>
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: "0 0 16px" }}>ROAS por Canal</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {enabledCh.map(ch => {
            const roas = model.channelRoas[ch.id] ?? 0;
            const spend = rows.reduce((s, r) => s + (r.spend[ch.id] ?? 0), 0);
            const maxRoas = Math.max(...enabledCh.map(c => model.channelRoas[c.id] ?? 0), 1);
            return (
              <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: ch.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", width: 100, flexShrink: 0 }}>{ch.name}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--surface-hover)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(roas / maxRoas) * 100}%`, background: ch.color, borderRadius: 4, transition: "width 0.5s" }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", width: 48, textAlign: "right" }}>{roas.toFixed(2)}x</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", width: 80, textAlign: "right" }}>{fmtCurrency(spend)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ─── Tab Datos ────────────────────────────────────────────────────────────────
function TabDatos({ rows, setRows, channels }: { rows: WeeklyRow[]; setRows: (r: WeeklyRow[]) => void; channels: ChannelConfig[] }) {
  const enabledCh = channels.filter(c => c.enabled);
  const addWeek = () => {
    const wn = rows.length + 1;
    setRows([...rows, { week: `2024-W${String(wn).padStart(2,"0")}`, label: `Sem ${wn}`, spend: Object.fromEntries(enabledCh.map(c => [c.id, 0])), outcome: 0 }]);
  };
  const upSpend = (ri: number, cid: string, v: string) => setRows(rows.map((r, i) => i === ri ? { ...r, spend: { ...r.spend, [cid]: parseFloat(v) || 0 } } : r));
  const upOutcome = (ri: number, v: string) => setRows(rows.map((r, i) => i === ri ? { ...r, outcome: parseFloat(v) || 0 } : r));
  const iStyle: React.CSSProperties = { width: "100%", background: "transparent", border: "none", color: "var(--foreground)", fontSize: 12, textAlign: "right", padding: "6px 8px", fontFamily: "inherit", outline: "none" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Datos de entrada</p>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0" }}>Gasto semanal por canal + KPI de resultado</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setRows([...DEMO_ROWS])} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: VIOLET_LIGHT, border: `1px solid ${VIOLET_BORDER}`, color: VIOLET, cursor: "pointer", fontFamily: "inherit" }}><Database size={13} /> Datos demo</button>
          <button onClick={addWeek} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--foreground)", cursor: "pointer", fontFamily: "inherit" }}><Plus size={13} /> Semana</button>
        </div>
      </div>
      <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid var(--border)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--surface-hover)" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "var(--text-secondary)", fontSize: 11 }}>SEMANA</th>
              {enabledCh.map(ch => <th key={ch.id} style={{ padding: "12px 12px", textAlign: "right" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: ch.color }} /><span style={{ fontWeight: 700, color: "var(--text-secondary)", fontSize: 11 }}>{ch.name.toUpperCase()}</span></div></th>)}
              <th style={{ padding: "12px 12px", textAlign: "right", fontWeight: 700, color: "#059669", fontSize: 11 }}>RESULTADO</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.week} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "8px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>{row.label}</td>
                {enabledCh.map(ch => <td key={ch.id} style={{ padding: "4px 4px" }}><input type="number" value={row.spend[ch.id] ?? 0} onChange={e => upSpend(ri, ch.id, e.target.value)} style={{ ...iStyle, color: ch.color }} /></td>)}
                <td style={{ padding: "4px 4px" }}><input type="number" value={row.outcome} onChange={e => upOutcome(ri, e.target.value)} style={{ ...iStyle, color: "#059669", fontWeight: 700 }} /></td>
                <td style={{ padding: "4px 8px" }}><button onClick={() => setRows(rows.filter((_, i) => i !== ri))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6, display: "flex" }}><Trash2 size={12} /></button></td>
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid var(--border)", background: "var(--surface-hover)" }}>
              <td style={{ padding: "10px 16px", fontWeight: 700, fontSize: 12 }}>TOTAL</td>
              {enabledCh.map(ch => <td key={ch.id} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: ch.color }}>{fmtCurrency(rows.reduce((s, r) => s + (r.spend[ch.id] ?? 0), 0))}</td>)}
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#059669" }}>{fmtCurrency(rows.reduce((s, r) => s + r.outcome, 0))}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 12, padding: "12px 16px", borderRadius: 10, background: VIOLET_LIGHT, border: `1px solid ${VIOLET_BORDER}` }}>
        <Info size={14} color={VIOLET} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}><strong style={{ color: VIOLET }}>Consejo:</strong> Ingresa al menos 8-12 semanas para resultados confiables. El <strong>Resultado</strong> puede ser ventas, leads o cualquier KPI de negocio.</p>
      </div>
    </div>
  );
}


// ─── Tab Modelo ───────────────────────────────────────────────────────────────
function TabModelo({ model, channels, rows }: { model: MmmModel | null; channels: ChannelConfig[]; rows: WeeklyRow[] }) {
  if (!model || rows.length < 3) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <Activity size={40} color="var(--text-muted)" style={{ marginBottom: 16 }} />
      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: "0 0 8px" }}>Modelo no disponible</p>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>Ingresa datos primero.</p>
    </div>
  );
  const enabledCh = channels.filter(c => c.enabled);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderRadius: 12, background: model.rSquared >= 0.7 ? "rgba(5,150,105,0.08)" : "rgba(245,158,11,0.08)", border: `1px solid ${model.rSquared >= 0.7 ? "rgba(5,150,105,0.2)" : "rgba(245,158,11,0.2)"}` }}>
        {model.rSquared >= 0.7 ? <CheckCircle2 size={18} color="#059669" /> : <AlertCircle size={18} color="#F59E0B" />}
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>R2 = {(model.rSquared * 100).toFixed(1)}% — {model.rSquared >= 0.8 ? "Excelente ajuste" : model.rSquared >= 0.6 ? "Ajuste moderado" : "Bajo ajuste - agrega mas semanas"}</p>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0" }}>Intercepto B0 = {model.intercept.toFixed(0)} | Canales: {enabledCh.length}</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {enabledCh.map(ch => {
          const avgSpend = rows.reduce((s, r) => s + (r.spend[ch.id] ?? 0), 0) / rows.length;
          const hl = adstockHalfLife(ch.adstockDecay);
          const coeff = model.coefficients[ch.id] ?? 0;
          const contrib = model.contributions[ch.id] ?? 0;
          const roas = model.channelRoas[ch.id] ?? 0;
          return (
            <div key={ch.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: ch.color }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0, flex: 1 }}>{ch.name}</p>
                <span style={{ fontSize: 11, fontWeight: 600, color: ch.color, background: ch.color + "18", padding: "2px 8px", borderRadius: 6 }}>{roas.toFixed(2)}x ROAS</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface-hover)" }}>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 4px", textTransform: "uppercase" }}>Saturacion</p>
                  <SatCurveChart alpha={ch.saturationAlpha} k={ch.saturationK} currentSpend={avgSpend} color={ch.color} />
                  <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "6px 0 0" }}>K = {fmtCurrency(ch.saturationK)}</p>
                </div>
                <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface-hover)" }}>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 4px", textTransform: "uppercase" }}>Adstock</p>
                  <AdstockDecayChart lambda={ch.adstockDecay} color={ch.color} />
                  <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "6px 0 0" }}>Vida 1/2: {isFinite(hl) ? hl.toFixed(1) + " sem" : "infinite"}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "var(--surface-hover)", textAlign: "center" }}>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 2px" }}>Coeficiente B</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: ch.color, margin: 0 }}>{coeff.toFixed(3)}</p>
                </div>
                <div style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "var(--surface-hover)", textAlign: "center" }}>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 2px" }}>Contribucion</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: ch.color, margin: 0 }}>{fmtCurrency(contrib)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─── Tab Simulador ────────────────────────────────────────────────────────────
function TabSimulador({ model, channels, rows }: { model: MmmModel | null; channels: ChannelConfig[]; rows: WeeklyRow[] }) {
  const enabledCh = channels.filter(c => c.enabled);
  const avgSpend = useMemo(() => {
    const r: Record<string, number> = {};
    enabledCh.forEach(ch => { r[ch.id] = rows.length > 0 ? rows.reduce((s, rw) => s + (rw.spend[ch.id] ?? 0), 0) / rows.length : 1000; });
    return r;
  }, [rows, channels]);
  const [simSpend, setSimSpend] = useState<Record<string, number>>(avgSpend);
  useEffect(() => { setSimSpend({ ...avgSpend }); }, [JSON.stringify(avgSpend)]);
  const totalBudget = Object.values(simSpend).reduce((s, v) => s + v, 0);
  const avgOutcome = rows.length > 0 ? rows.reduce((s, r) => s + r.outcome, 0) / rows.length : 0;
  const simResult = useMemo(() => !model || rows.length < 3 ? null : simulateBudget(simSpend, model, channels, avgOutcome), [model, simSpend, channels, avgOutcome]);
  const optResult = useMemo(() => !model || rows.length < 3 ? null : optimizeBudget(avgSpend, totalBudget, channels, model), [model, avgSpend, totalBudget, channels]);

  if (!model || rows.length < 3) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <Sliders size={40} color="var(--text-muted)" style={{ marginBottom: 16 }} />
      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: "0 0 8px" }}>Simulador no disponible</p>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>Ingresa datos primero.</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <KpiCard label="Outcome Proyectado" value={fmtCurrency(simResult?.projectedOutcome ?? 0)} sub={`Base: ${fmtCurrency(avgOutcome)}`} color={VIOLET} icon={Target} />
        <KpiCard label="Delta vs Base" value={`${simResult && simResult.deltaOutcome >= 0 ? "+" : ""}${fmtCurrency(simResult?.deltaOutcome ?? 0)}`} color={simResult && simResult.deltaOutcome >= 0 ? "#059669" : "#ef4444"} icon={TrendingUp} />
        <KpiCard label="Presupuesto Total" value={fmtCurrency(totalBudget)} color="#0ea5e9" icon={BarChart2} />
        {optResult && <KpiCard label="Mejora Potencial" value={`+${optResult.improvementPct.toFixed(1)}%`} sub="Con asignacion optima" color="#F59E0B" icon={Zap} />}
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: "0 0 20px" }}>Ajustar Presupuesto por Canal</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {enabledCh.map(ch => {
            const cur = simSpend[ch.id] ?? 0;
            const base = avgSpend[ch.id] ?? 1;
            const pct = base > 0 ? ((cur - base) / base) * 100 : 0;
            const maxS = Math.max(base * 3, 5000);
            return (
              <div key={ch.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: ch.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", flex: 1 }}>{ch.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: ch.color }}>{fmtCurrency(cur)}</span>
                  <span style={{ fontSize: 11, color: pct >= 0 ? "var(--emerald)" : "var(--red)", fontWeight: 600, width: 56, textAlign: "right" }}>{pct >= 0 ? "+" : ""}{pct.toFixed(0)}%</span>
                </div>
                <input type="range" min={0} max={maxS} step={100} value={cur} onChange={e => setSimSpend(p => ({ ...p, [ch.id]: parseFloat(e.target.value) }))} style={{ width: "100%", accentColor: ch.color }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)" }}>
                  <span>$0</span><span>{fmtCurrency(maxS)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {optResult && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Asignacion Optima</p>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0" }}>Mejora potencial: +{optResult.improvementPct.toFixed(1)}%</p>
            </div>
            <button onClick={() => setSimSpend({ ...optResult.recommended })} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: VIOLET_LIGHT, border: `1px solid ${VIOLET_BORDER}`, color: VIOLET, cursor: "pointer", fontFamily: "inherit" }}><Zap size={13} /> Aplicar optimo</button>
          </div>
          {enabledCh.map(ch => {
            const opt = optResult.recommended[ch.id] ?? 0;
            const base = avgSpend[ch.id] ?? 0;
            const delta = opt - base;
            const totO = Object.values(optResult.recommended).reduce((s, v) => s + v, 0);
            return (
              <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: ch.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", width: 100 }}>{ch.name}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--surface-hover)", overflow: "hidden" }}><div style={{ height: "100%", width: `${totO > 0 ? (opt / totO) * 100 : 0}%`, background: ch.color, borderRadius: 4, transition: "width 0.5s" }} /></div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", width: 70, textAlign: "right" }}>{fmtCurrency(opt)}</span>
                <span style={{ fontSize: 11, width: 56, textAlign: "right", color: delta >= 0 ? "var(--emerald)" : "var(--red)", fontWeight: 600 }}>{delta >= 0 ? "+" : ""}{fmtCurrency(delta)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ─── Tab Config ───────────────────────────────────────────────────────────────
function TabConfig({ channels, setChannels }: { channels: ChannelConfig[]; setChannels: (c: ChannelConfig[]) => void }) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const upCh = (id: string, u: Partial<ChannelConfig>) => setChannels(channels.map(c => c.id === id ? { ...c, ...u } : c));
  const addCh = () => {
    if (!newName.trim()) return;
    setChannels([...channels, { id: newName.toLowerCase().replace(/\s+/g, "_"), name: newName.trim(), color: newColor, adstockDecay: 0.4, saturationAlpha: 0.8, saturationK: 5000, enabled: true }]);
    setNewName("");
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: "0 0 4px" }}>Parametros del Modelo</p>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>Ajusta adstock y saturacion por canal. Los cambios aplican al instante.</p>
      </div>
      {channels.map(ch => (
        <div key={ch.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", background: "var(--surface-hover)", borderBottom: "1px solid var(--border)" }}>
            <input type="color" value={ch.color} onChange={e => upCh(ch.id, { color: e.target.value })} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer", padding: 2, background: "transparent" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", flex: 1 }}>{ch.name}</span>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={ch.enabled} onChange={e => upCh(ch.id, { enabled: e.target.checked })} style={{ accentColor: ch.color }} />
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Activo</span>
            </label>
            <button onClick={() => setChannels(channels.filter(c => c.id !== ch.id))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, display: "flex", borderRadius: 6 }}><Trash2 size={14} /></button>
          </div>
          <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>Adstock (lambda)</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{ch.adstockDecay.toFixed(2)}</span>
              </div>
              <input type="range" min={0} max={0.99} step={0.01} value={ch.adstockDecay} onChange={e => upCh(ch.id, { adstockDecay: parseFloat(e.target.value) })} style={{ width: "100%", accentColor: ch.color }} />
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Vida 1/2: {isFinite(adstockHalfLife(ch.adstockDecay)) ? adstockHalfLife(ch.adstockDecay).toFixed(1) + " sem" : "infinita"}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>Alpha (forma)</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{ch.saturationAlpha.toFixed(2)}</span>
              </div>
              <input type="range" min={0.1} max={3} step={0.1} value={ch.saturationAlpha} onChange={e => upCh(ch.id, { saturationAlpha: parseFloat(e.target.value) })} style={{ width: "100%", accentColor: ch.color }} />
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{"< 1 concava | > 1 S-curve"}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>K Half-saturation</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{fmtCurrency(ch.saturationK)}</span>
              </div>
              <input type="number" value={ch.saturationK} min={100} step={100} onChange={e => upCh(ch.id, { saturationK: parseFloat(e.target.value) || 1000 })} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-hover)", color: "var(--foreground)", fontSize: 12, fontFamily: "inherit" }} />
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Gasto al 50% del efecto maximo</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid var(--border)" }}>
            <div style={{ padding: "12px 20px", borderRight: "1px solid var(--border)" }}>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 6px", textTransform: "uppercase" }}>Adstock Decay</p>
              <AdstockDecayChart lambda={ch.adstockDecay} color={ch.color} />
            </div>
            <div style={{ padding: "12px 20px" }}>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 6px", textTransform: "uppercase" }}>Curva Saturacion</p>
              <SatCurveChart alpha={ch.saturationAlpha} k={ch.saturationK} currentSpend={ch.saturationK} color={ch.color} />
            </div>
          </div>
        </div>
      ))}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: "0 0 12px" }}>Agregar Canal</p>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--border)", cursor: "pointer", padding: 2, background: "transparent", flexShrink: 0 }} />
          <input type="text" placeholder="Nombre del canal (ej. LinkedIn Ads)" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addCh()} style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-hover)", color: "var(--foreground)", fontSize: 13, fontFamily: "inherit" }} />
          <button onClick={addCh} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: VIOLET_LIGHT, border: `1px solid ${VIOLET_BORDER}`, color: VIOLET, cursor: "pointer", fontFamily: "inherit" }}><Plus size={14} /> Agregar</button>
        </div>
      </div>
    </div>
  );
}


// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MediaMixPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("resumen");
  const [channels, setChannels] = useState<ChannelConfig[]>(DEFAULT_CHANNELS);
  const [rows, setRows] = useState<WeeklyRow[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [model, setModel] = useState<MmmModel | null>(null);

  const runModel = useCallback(() => {
    if (rows.length < 3) { setModel(null); return; }
    setIsRunning(true);
    setTimeout(() => { setModel(runMmm(rows, channels)); setIsRunning(false); }, 50);
  }, [rows, channels]);

  useEffect(() => { runModel(); }, [runModel]);
  useEffect(() => { setRows([...DEMO_ROWS]); }, []);

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "resumen", label: "Resumen", icon: PieChartIcon },
    { key: "datos", label: "Datos", icon: Database },
    { key: "modelo", label: "Modelo", icon: Activity },
    { key: "simulador", label: "Simulador", icon: Sliders },
    { key: "config", label: "Configuracion", icon: Settings2 },
  ];

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        .mmm-tab:hover { background: rgba(124,58,237,0.08) !important; }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", animation: "fadeInUp 0.3s ease" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px 0", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => router.back()} style={{ width: 34, height: 34, borderRadius: 8, background: "var(--surface-hover)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-secondary)" }}><ArrowLeft size={16} /></button>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#4c1d95,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(124,58,237,0.3)" }}><PieChartIcon size={22} color="#fff" /></div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground)", margin: 0 }}>Media Mix</h1>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                {model ? `R\u00b2 ${(model.rSquared * 100).toFixed(0)}% \u00b7 ${rows.length} semanas \u00b7 ${channels.filter(c => c.enabled).length} canales` : "Convergencia \u00b7 El peso real de cada canal"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {model && <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.2)", fontSize: 11, fontWeight: 600, color: "#059669" }}><CheckCircle2 size={12} /> Modelo activo</div>}
            <button onClick={runModel} disabled={isRunning} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: VIOLET_LIGHT, border: `1px solid ${VIOLET_BORDER}`, color: VIOLET, cursor: "pointer", fontFamily: "inherit" }}>
              <RefreshCw size={13} style={{ animation: isRunning ? "spin 0.8s linear infinite" : "none" }} />
              {isRunning ? "Calculando..." : "Recalcular"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "16px 28px 0", borderBottom: "1px solid var(--border)" }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className="mmm-tab" style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: "8px 8px 0 0", fontSize: 13, fontWeight: isActive ? 700 : 500, background: isActive ? VIOLET_LIGHT : "transparent", border: isActive ? `1px solid ${VIOLET_BORDER}` : "1px solid transparent", borderBottom: isActive ? `1px solid ${VIOLET_LIGHT}` : "1px solid transparent", color: isActive ? VIOLET : "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit", marginBottom: isActive ? -1 : 0, transition: "all 0.18s" }}>
                <Icon size={14} />{tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px", scrollbarWidth: "none" }}>
          {activeTab === "resumen"   && <TabResumen   model={model} channels={channels} rows={rows} />}
          {activeTab === "datos"     && <TabDatos     rows={rows} setRows={setRows} channels={channels} />}
          {activeTab === "modelo"    && <TabModelo    model={model} channels={channels} rows={rows} />}
          {activeTab === "simulador" && <TabSimulador model={model} channels={channels} rows={rows} />}
          {activeTab === "config"    && <TabConfig    channels={channels} setChannels={setChannels} />}
        </div>

      </div>
    </>
  );
}
