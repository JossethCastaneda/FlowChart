"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { PieChart as PieChartIcon, TrendingUp, Database, Sliders, Settings2, ArrowLeft, RefreshCw, Plus, Trash2, Info, Zap, BarChart2, Activity, Target, CheckCircle2, AlertCircle, Download, Upload, Cpu, X, AlertTriangle, Layers, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ChannelConfig, WeeklyRow, MmmModel, MmmSavedConfig, MmmClient } from "@/lib/mmm/types";
import { runMmm, simulateBudget, optimizeBudget } from "@/lib/mmm/optimizer";
import { REAL_DEFAULT_CHANNELS, clientsFromProjects, verticalsFromClients, type ProjectLike } from "@/lib/mmm/channels";
import { adstockDecayCurve, adstockHalfLife } from "@/lib/mmm/adstock";
import { saturationCurve } from "@/lib/mmm/saturation";
import { calibrateAllChannels } from "@/lib/mmm/calibrate";
import { scenarioBudgetIncrease, scenarioInverseTarget } from "@/lib/mmm/scenarios";
import { generateCsvReport, generateSummaryText, downloadCsv, downloadText, copyToClipboard } from "@/lib/mmm/report";

type Tab = "resumen" | "datos" | "modelo" | "simulador" | "config";
type SimScenario = "A" | "B" | "C";
type SaveState = "idle" | "saving" | "saved" | "error";

const fmtCurrency = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtPct = (n: number) => (n * 100).toFixed(1) + "%";
const VIOLET = "#7c3aed"; const VIOLET_LIGHT = "rgba(124,58,237,0.12)"; const VIOLET_BORDER = "rgba(124,58,237,0.25)";
const SAVE_DEBOUNCE = 2500;


// ─── SVG Charts ───────────────────────────────────────────────────────────────
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, sg) => s + sg.value, 0);
  if (total <= 0) return <div style={{ width: 140, height: 140, borderRadius: "50%", background: "var(--surface-hover)" }} />;
  let angle = 0;
  const r = 55, cx = 70, cy = 70, sw = 20, circ = 2 * Math.PI * r;
  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      {segments.map((seg, i) => {
        const pct = seg.value / total, dash = pct * circ, gap = circ - dash, rot = angle;
        angle += pct * 360;
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

function KpiCard({ label, value, sub, color = VIOLET, icon: Icon, accent }: { label: string; value: string; sub?: string; color?: string; icon?: React.ElementType; accent?: boolean }) {
  return (
    <div style={{ background: "var(--surface)", border: `1px solid ${accent ? color + "40" : "var(--border)"}`, borderRadius: 14, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10, position: "relative", overflow: "hidden" }}>
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


// ─── Tab Resumen (v2) ─────────────────────────────────────────────────────────
function TabResumen({ model, channels, rows }: { model: MmmModel | null; channels: ChannelConfig[]; rows: WeeklyRow[] }) {
  const activeRows = rows.filter(r => !r.isOutlier);
  if (!model || activeRows.length < 3) return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-secondary)" }}>
      <Database size={40} color="var(--text-muted)" style={{ marginBottom: 16 }} />
      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: "0 0 8px" }}>Sin datos suficientes</p>
      <p style={{ fontSize: 13, margin: 0 }}>Ingresa al menos 3 semanas de datos en la pestana <strong>Datos</strong>.</p>
    </div>
  );
  const enabledCh = channels.filter(c => c.enabled);
  const totalSpend = activeRows.reduce((s, r) => s + enabledCh.reduce((ss, ch) => ss + (r.spend[ch.id] ?? 0), 0), 0);
  const totalRoas = totalSpend > 0 ? model.totalActual / totalSpend : 0;
  const bestCh = enabledCh.reduce((best, ch) => (model.channelRoas[ch.id] ?? 0) > (model.channelRoas[best?.id ?? ""] ?? -Infinity) ? ch : best, enabledCh[0]);
  const contribTotal = Object.values(model.contributions).reduce((s, v) => s + v, 0);
  const segments = enabledCh.map(ch => ({ label: ch.name, value: model.contributions[ch.id] ?? 0, color: ch.color }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* KPIs principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
        <KpiCard label="ROAS Total" value={`${totalRoas.toFixed(2)}x`} sub={`${fmtCurrency(totalSpend)} invertidos`} color={VIOLET} icon={Target} />
        <KpiCard label="Revenue Atribuido" value={fmtCurrency(model.totalActual)} sub={`Modelo: ${fmtCurrency(model.totalModeled)}`} color="#059669" icon={TrendingUp} />
        <KpiCard label="Ajuste R2" value={`${(model.rSquared * 100).toFixed(0)}%`} sub={`${model.weekCount} semanas en modelo`} color="#0ea5e9" icon={Activity} />
        <KpiCard label="Mejor Canal" value={bestCh?.name ?? "—"} sub={`${(model.channelRoas[bestCh?.id ?? ""] ?? 0).toFixed(2)}x ROAS`} color={bestCh?.color ?? VIOLET} icon={Zap} />
      </div>
      {/* Base vs Incremental */}
      <div style={{ background: "var(--surface)", border: `1px solid ${VIOLET_BORDER}`, borderRadius: 14, padding: "20px 24px" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: "0 0 16px" }}>Revenue: Base vs. Incremental</p>
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            {/* Stacked bar */}
            <div style={{ height: 28, borderRadius: 8, overflow: "hidden", display: "flex", marginBottom: 12 }}>
              <div style={{ width: `${(1 - model.incrementalShare) * 100}%`, background: "#64748b", transition: "width 0.5s", display: "flex", alignItems: "center", paddingLeft: 8 }}>
                <span style={{ fontSize: 10, color: "#fff", fontWeight: 700, whiteSpace: "nowrap" }}>Base {fmtPct(1 - model.incrementalShare)}</span>
              </div>
              <div style={{ flex: 1, background: VIOLET, transition: "width 0.5s", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8 }}>
                <span style={{ fontSize: 10, color: "#fff", fontWeight: 700, whiteSpace: "nowrap" }}>Publicidad {fmtPct(model.incrementalShare)}</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--surface-hover)", borderLeft: "3px solid #64748b" }}>
                <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 4px", textTransform: "uppercase" }}>Organico (base)</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: "var(--foreground)", margin: 0 }}>{fmtCurrency(model.baseRevenue)}</p>
              </div>
              <div style={{ padding: "12px 16px", borderRadius: 10, background: VIOLET_LIGHT, borderLeft: `3px solid ${VIOLET}` }}>
                <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 4px", textTransform: "uppercase" }}>Incremental (ads)</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: VIOLET, margin: 0 }}>{fmtCurrency(model.incrementalRevenue)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Donut + Model fit */}
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
          <ModelFitChart actual={activeRows.map(r => r.outcome)} modeled={model.modeledSeries} />
        </div>
      </div>
      {/* ROAS bars */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: "0 0 16px" }}>ROAS por Canal</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {enabledCh.map(ch => {
            const roas = model.channelRoas[ch.id] ?? 0;
            const spend = activeRows.reduce((s, r) => s + (r.spend[ch.id] ?? 0), 0);
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


// ─── Tab Datos (v2) ───────────────────────────────────────────────────────────
function TabDatos({ rows, setRows, channels, onImport }: { rows: WeeklyRow[]; setRows: (r: WeeklyRow[]) => void; channels: ChannelConfig[]; onImport: () => Promise<void> }) {
  const enabledCh = channels.filter(c => c.enabled);
  const [importing, setImporting] = React.useState(false);
  const [importMsg, setImportMsg] = React.useState("");
  const activeCount = rows.filter(r => !r.isOutlier).length;
  const addWeek = () => {
    const wn = rows.length + 1;
    setRows([...rows, { week: `2024-W${String(wn).padStart(2, "0")}`, label: `Sem ${wn}`, spend: Object.fromEntries(enabledCh.map(c => [c.id, 0])), outcome: 0, isOutlier: false, source: "manual" }]);
  };
  const upSpend = (ri: number, cid: string, v: string) => setRows(rows.map((r, i) => i === ri ? { ...r, spend: { ...r.spend, [cid]: parseFloat(v) || 0 } } : r));
  const upOutcome = (ri: number, v: string) => setRows(rows.map((r, i) => i === ri ? { ...r, outcome: parseFloat(v) || 0 } : r));
  const toggleOutlier = (ri: number) => setRows(rows.map((r, i) => i === ri ? { ...r, isOutlier: !r.isOutlier } : r));
  const upNote = (ri: number, v: string) => setRows(rows.map((r, i) => i === ri ? { ...r, note: v } : r));
  const handleImport = async () => {
    setImporting(true); setImportMsg("");
    try { await onImport(); setImportMsg("Importado correctamente"); }
    catch (e: any) { setImportMsg(e.message ?? "Error al importar"); }
    finally { setImporting(false); setTimeout(() => setImportMsg(""), 4000); }
  };
  const iStyle: React.CSSProperties = { width: "100%", background: "transparent", border: "none", color: "var(--foreground)", fontSize: 12, textAlign: "right", padding: "6px 8px", fontFamily: "inherit", outline: "none" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Quality banner */}
      {activeCount < 8 && activeCount >= 3 && (
        <div style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <AlertTriangle size={14} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}><strong style={{ color: "#F59E0B" }}>Datos limitados:</strong> {activeCount} semanas activas. Minimo recomendado: 8. Mas semanas = modelo mas preciso.</p>
        </div>
      )}
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Datos de entrada</p>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0" }}>{activeCount} semanas activas · {rows.filter(r => r.isOutlier).length} excluidas del modelo</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleImport} disabled={importing} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.2)", color: "#059669", cursor: "pointer", fontFamily: "inherit" }}>
            <Upload size={13} style={{ animation: importing ? "spin 0.8s linear infinite" : "none" }} />
            {importing ? "Importando..." : "Importar Meta Ads"}
          </button>
          {importMsg && <span style={{ fontSize: 12, color: importMsg.includes("Error") ? "var(--red)" : "#059669", alignSelf: "center" }}>{importMsg}</span>}
          <button onClick={addWeek} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--foreground)", cursor: "pointer", fontFamily: "inherit" }}><Plus size={13} /> Semana</button>
        </div>
      </div>
      {/* Table */}
      <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid var(--border)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--surface-hover)" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "var(--text-secondary)", fontSize: 10, whiteSpace: "nowrap" }}>SEMANA</th>
              {enabledCh.map(ch => <th key={ch.id} style={{ padding: "10px 10px", textAlign: "right" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}><div style={{ width: 7, height: 7, borderRadius: 2, background: ch.color }} /><span style={{ fontWeight: 700, color: "var(--text-secondary)", fontSize: 10 }}>{ch.name.toUpperCase().slice(0, 10)}</span></div></th>)}
              <th style={{ padding: "10px 10px", textAlign: "right", fontWeight: 700, color: "#059669", fontSize: 10 }}>RESULTADO</th>
              <th style={{ padding: "10px 10px", textAlign: "left", fontWeight: 700, color: "var(--text-secondary)", fontSize: 10 }}>NOTA</th>
              <th style={{ padding: "10px 8px", fontWeight: 700, color: "var(--text-secondary)", fontSize: 10 }}>EXCL.</th>
              <th style={{ width: 32 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.week} style={{ borderTop: "1px solid var(--border)", background: row.isOutlier ? "rgba(239,68,68,0.04)" : "transparent", opacity: row.isOutlier ? 0.6 : 1 }}>
                <td style={{ padding: "6px 12px", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {row.source === "api" && <span style={{ fontSize: 9, background: "rgba(5,150,105,0.1)", color: "#059669", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>API</span>}
                    {row.label}
                  </div>
                </td>
                {enabledCh.map(ch => <td key={ch.id} style={{ padding: "3px 3px" }}><input type="number" value={row.spend[ch.id] ?? 0} onChange={e => upSpend(ri, ch.id, e.target.value)} style={{ ...iStyle, color: ch.color }} /></td>)}
                <td style={{ padding: "3px 3px" }}><input type="number" value={row.outcome} onChange={e => upOutcome(ri, e.target.value)} style={{ ...iStyle, color: "#059669", fontWeight: 700 }} /></td>
                <td style={{ padding: "3px 3px" }}><input type="text" value={row.note ?? ""} onChange={e => upNote(ri, e.target.value)} placeholder="Nota..." style={{ ...iStyle, textAlign: "left", fontSize: 11, color: "var(--text-muted)", width: 90 }} /></td>
                <td style={{ padding: "3px 8px", textAlign: "center" }}>
                  <button onClick={() => toggleOutlier(ri)} title={row.isOutlier ? "Incluir en modelo" : "Excluir del modelo"} style={{ background: row.isOutlier ? "rgba(239,68,68,0.1)" : "transparent", border: row.isOutlier ? "1px solid rgba(239,68,68,0.3)" : "1px solid var(--border)", cursor: "pointer", borderRadius: 5, padding: "3px 6px", fontSize: 9, fontWeight: 700, color: row.isOutlier ? "#ef4444" : "var(--text-muted)" }}>
                    {row.isOutlier ? "EXCL" : "OK"}
                  </button>
                </td>
                <td style={{ padding: "3px 6px" }}><button onClick={() => setRows(rows.filter((_, i) => i !== ri))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 3, borderRadius: 5, display: "flex" }}><Trash2 size={11} /></button></td>
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid var(--border)", background: "var(--surface-hover)" }}>
              <td style={{ padding: "8px 12px", fontWeight: 700, fontSize: 12 }}>TOTAL</td>
              {enabledCh.map(ch => <td key={ch.id} style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: ch.color, fontSize: 12 }}>{fmtCurrency(rows.filter(r => !r.isOutlier).reduce((s, r) => s + (r.spend[ch.id] ?? 0), 0))}</td>)}
              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "#059669", fontSize: 12 }}>{fmtCurrency(rows.filter(r => !r.isOutlier).reduce((s, r) => s + r.outcome, 0))}</td>
              <td colSpan={3} />
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10, background: VIOLET_LIGHT, border: `1px solid ${VIOLET_BORDER}` }}>
        <Info size={13} color={VIOLET} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}><strong style={{ color: VIOLET }}>Tip:</strong> Marca semanas con prom, lanzamientos o Black Friday como "EXCL" para que no sesguen el modelo. El <strong>Resultado</strong> puede ser ventas, leads o cualquier KPI de negocio.</p>
      </div>
    </div>
  );
}


// ─── Tab Modelo (unchanged, only filter outliers) ─────────────────────────────
function TabModelo({ model, channels, rows }: { model: MmmModel | null; channels: ChannelConfig[]; rows: WeeklyRow[] }) {
  const activeRows = rows.filter(r => !r.isOutlier);
  if (!model || activeRows.length < 3) return <div style={{ textAlign: "center", padding: "60px 20px" }}><Activity size={40} color="var(--text-muted)" style={{ marginBottom: 16 }} /><p style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: "0 0 8px" }}>Modelo no disponible</p><p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>Ingresa datos primero.</p></div>;
  const enabledCh = channels.filter(c => c.enabled);
  const r2Color = model.rSquared >= 0.7 ? "rgba(5,150,105,0.08)" : "rgba(245,158,11,0.08)";
  const r2Border = model.rSquared >= 0.7 ? "rgba(5,150,105,0.2)" : "rgba(245,158,11,0.2)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 12, background: r2Color, border: `1px solid ${r2Border}` }}>
        {model.rSquared >= 0.7 ? <CheckCircle2 size={16} color="#059669" /> : <AlertCircle size={16} color="#F59E0B" />}
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>R2 = {(model.rSquared * 100).toFixed(1)}% — {model.rSquared >= 0.8 ? "Excelente ajuste" : model.rSquared >= 0.6 ? "Ajuste moderado" : "Bajo ajuste"} | {model.weekCount} semanas activas</p>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0" }}>Intercepto B0 = {model.intercept.toFixed(0)} (revenue organico semanal) | Canales: {enabledCh.length}</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {enabledCh.map(ch => {
          const avgSpend = activeRows.reduce((s, r) => s + (r.spend[ch.id] ?? 0), 0) / activeRows.length;
          const hl = adstockHalfLife(ch.adstockDecay);
          const coeff = model.coefficients[ch.id] ?? 0;
          const contrib = model.contributions[ch.id] ?? 0;
          const roas = model.channelRoas[ch.id] ?? 0;
          return (
            <div key={ch.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: ch.color }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0, flex: 1 }}>{ch.name}</p>
                {ch.autoCalibratedAt && <span style={{ fontSize: 10, color: "#059669", background: "rgba(5,150,105,0.1)", padding: "2px 6px", borderRadius: 5, fontWeight: 600 }}>Auto</span>}
                <span style={{ fontSize: 11, fontWeight: 600, color: ch.color, background: ch.color + "18", padding: "2px 8px", borderRadius: 6 }}>{roas.toFixed(2)}x</span>
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
                  <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "6px 0 0" }}>Vida 1/2: {isFinite(hl) ? hl.toFixed(1) + " sem" : "infinita"}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "var(--surface-hover)", textAlign: "center" }}><p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 2px" }}>Coef. B</p><p style={{ fontSize: 13, fontWeight: 700, color: ch.color, margin: 0 }}>{coeff.toFixed(3)}</p></div>
                <div style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "var(--surface-hover)", textAlign: "center" }}><p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 2px" }}>Contribucion</p><p style={{ fontSize: 13, fontWeight: 700, color: ch.color, margin: 0 }}>{fmtCurrency(contrib)}</p></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─── Tab Simulador (v2) con 3 escenarios ────────────────────────────────────
function TabSimulador({ model, channels, rows }: { model: MmmModel | null; channels: ChannelConfig[]; rows: WeeklyRow[] }) {
  const enabledCh = channels.filter(c => c.enabled);
  const activeRows = rows.filter(r => !r.isOutlier);
  const [scenario, setScenario] = React.useState<SimScenario>("A");
  const [increasePct, setIncreasePct] = React.useState(20);
  const [targetOutcome, setTargetOutcome] = React.useState(0);
  const avgSpend = useMemo(() => {
    const r: Record<string, number> = {};
    enabledCh.forEach(ch => { r[ch.id] = activeRows.length > 0 ? activeRows.reduce((s, rw) => s + (rw.spend[ch.id] ?? 0), 0) / activeRows.length : 1000; });
    return r;
  }, [activeRows, channels]);
  const [simSpend, setSimSpend] = React.useState<Record<string, number>>(avgSpend);
  useEffect(() => { setSimSpend({ ...avgSpend }); }, [JSON.stringify(avgSpend)]);
  const totalBudget = Object.values(simSpend).reduce((s, v) => s + v, 0);
  const avgOutcome = activeRows.length > 0 ? activeRows.reduce((s, r) => s + r.outcome, 0) / activeRows.length : 0;
  useEffect(() => { setTargetOutcome(Math.round(avgOutcome * 1.2)); }, [avgOutcome]);

  const simResult = useMemo(() => !model || activeRows.length < 3 ? null : simulateBudget(simSpend, model, channels, avgOutcome), [model, simSpend, channels, avgOutcome]);
  const optResult = useMemo(() => !model || activeRows.length < 3 ? null : optimizeBudget(avgSpend, totalBudget, channels, model), [model, avgSpend, totalBudget, channels]);
  const scenBResult = useMemo(() => !model || activeRows.length < 3 ? null : scenarioBudgetIncrease(avgSpend, increasePct, model, channels, avgOutcome), [model, avgSpend, increasePct, channels, avgOutcome]);
  const scenCResult = useMemo(() => !model || activeRows.length < 3 || targetOutcome <= 0 ? null : scenarioInverseTarget(targetOutcome, avgSpend, model, channels), [model, avgSpend, targetOutcome, channels]);

  if (!model || activeRows.length < 3) return <div style={{ textAlign: "center", padding: "60px 20px" }}><Sliders size={40} color="var(--text-muted)" style={{ marginBottom: 16 }} /><p style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: "0 0 8px" }}>Simulador no disponible</p><p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>Ingresa datos primero.</p></div>;

  const scenTabs: { key: SimScenario; label: string; desc: string }[] = [
    { key: "A", label: "A — Redistribuir", desc: "Budget fijo, optimizar distribucion" },
    { key: "B", label: "B — Subir Budget", desc: "Simular incremento de inversion" },
    { key: "C", label: "C — Objetivo Inverso", desc: "Cuanto necesito para mi meta?" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Scenario tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {scenTabs.map(st => (
          <button key={st.key} onClick={() => setScenario(st.key)} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "12px 16px", borderRadius: 10, fontSize: 12, fontWeight: scenario === st.key ? 700 : 500, background: scenario === st.key ? VIOLET_LIGHT : "var(--surface-hover)", border: `1px solid ${scenario === st.key ? VIOLET_BORDER : "var(--border)"}`, color: scenario === st.key ? VIOLET : "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
            <span>{st.label}</span><span style={{ fontSize: 10, opacity: 0.7 }}>{st.desc}</span>
          </button>
        ))}
      </div>

      {/* Scenario A */}
      {scenario === "A" && <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <KpiCard label="Outcome Proyectado" value={fmtCurrency(simResult?.projectedOutcome ?? 0)} sub={`Base: ${fmtCurrency(avgOutcome)}`} color={VIOLET} icon={Target} />
          <KpiCard label="Delta vs Base" value={`${simResult && simResult.deltaOutcome >= 0 ? "+" : ""}${fmtCurrency(simResult?.deltaOutcome ?? 0)}`} color={simResult && simResult.deltaOutcome >= 0 ? "#059669" : "#ef4444"} icon={TrendingUp} />
          <KpiCard label="Presupuesto Total" value={fmtCurrency(totalBudget)} color="#0ea5e9" icon={BarChart2} />
          {optResult && <KpiCard label="Mejora Potencial" value={`+${optResult.improvementPct.toFixed(1)}%`} sub="Con asignacion optima" color="#F59E0B" icon={Zap} />}
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: "0 0 20px" }}>Ajustar Presupuesto por Canal</p>
          {enabledCh.map(ch => {
            const cur = simSpend[ch.id] ?? 0; const base = avgSpend[ch.id] ?? 1; const pct = base > 0 ? ((cur - base) / base) * 100 : 0; const maxS = Math.max(base * 3, ch.maxSpend ?? 5000, 5000);
            return (<div key={ch.id} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: ch.color }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", flex: 1 }}>{ch.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: ch.color }}>{fmtCurrency(cur)}</span>
                <span style={{ fontSize: 11, color: pct >= 0 ? "#059669" : "#ef4444", fontWeight: 600, width: 52, textAlign: "right" }}>{pct >= 0 ? "+" : ""}{pct.toFixed(0)}%</span>
              </div>
              <input type="range" min={ch.minSpend ?? 0} max={maxS} step={100} value={cur} onChange={e => setSimSpend(p => ({ ...p, [ch.id]: parseFloat(e.target.value) }))} style={{ width: "100%", accentColor: ch.color }} />
            </div>);
          })}
        </div>
        {optResult && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div><p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Asignacion Optima</p><p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0" }}>Mejora: +{optResult.improvementPct.toFixed(1)}%</p></div>
              <button onClick={() => setSimSpend({ ...optResult.recommended })} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: VIOLET_LIGHT, border: `1px solid ${VIOLET_BORDER}`, color: VIOLET, cursor: "pointer", fontFamily: "inherit" }}><Zap size={12} /> Aplicar</button>
            </div>
            {enabledCh.map(ch => { const opt = optResult.recommended[ch.id] ?? 0; const base = avgSpend[ch.id] ?? 0; const delta = opt - base; const totO = Object.values(optResult.recommended).reduce((s, v) => s + v, 0);
              return (<div key={ch.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: ch.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, width: 90 }}>{ch.name}</span>
                <div style={{ flex: 1, height: 7, borderRadius: 4, background: "var(--surface-hover)", overflow: "hidden" }}><div style={{ height: "100%", width: `${totO > 0 ? (opt / totO) * 100 : 0}%`, background: ch.color, borderRadius: 4, transition: "width 0.5s" }} /></div>
                <span style={{ fontSize: 12, fontWeight: 700, width: 68, textAlign: "right" }}>{fmtCurrency(opt)}</span>
                <span style={{ fontSize: 11, width: 54, textAlign: "right", color: delta >= 0 ? "#059669" : "#ef4444", fontWeight: 600 }}>{delta >= 0 ? "+" : ""}{fmtCurrency(delta)}</span>
              </div>);
            })}
          </div>
        )}
      </>}

      {/* Scenario B */}
      {scenario === "B" && <>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: "0 0 20px" }}>Simular Incremento de Budget</p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Aumento:</span>
            <input type="range" min={5} max={200} step={5} value={increasePct} onChange={e => setIncreasePct(parseInt(e.target.value))} style={{ flex: 1, accentColor: VIOLET }} />
            <span style={{ fontSize: 18, fontWeight: 800, color: VIOLET, minWidth: 60 }}>+{increasePct}%</span>
          </div>
          {scenBResult && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              <KpiCard label="Budget Actual" value={fmtCurrency(Object.values(avgSpend).reduce((s, v) => s + v, 0))} color="#64748b" icon={BarChart2} />
              <KpiCard label="Budget Nuevo" value={fmtCurrency(Object.values(scenBResult.allocation.recommended).reduce((s, v) => s + v, 0))} color="#0ea5e9" icon={BarChart2} />
              <KpiCard label="Outcome Esperado" value={fmtCurrency(scenBResult.result.projectedOutcome)} sub={`+${fmtPct(scenBResult.allocation.improvementPct / 100)}`} color={VIOLET} icon={TrendingUp} accent />
              <KpiCard label="ROI del Incremento" value={`${((scenBResult.result.deltaOutcome) / (Object.values(scenBResult.allocation.recommended).reduce((s, v) => s + v, 0) - Object.values(avgSpend).reduce((s, v) => s + v, 0))).toFixed(2)}x`} sub="Por cada $ adicional" color="#059669" icon={Zap} />
            </div>
          )}
        </div>
      </>}

      {/* Scenario C */}
      {scenario === "C" && <>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: "0 0 20px" }}>Objetivo Inverso — Cuanto necesito gastar?</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Quiero lograr:</span>
            <input type="number" value={targetOutcome} onChange={e => setTargetOutcome(parseFloat(e.target.value) || 0)} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-hover)", color: "var(--foreground)", fontSize: 16, fontWeight: 700, fontFamily: "inherit", width: 160 }} />
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>en ventas/leads</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>(base actual: {fmtCurrency(avgOutcome)})</span>
          </div>
          {scenCResult && (
            <>
              {!scenCResult.achievable && (
                <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: "#ef4444", margin: 0, fontWeight: 600 }}>Objetivo no alcanzable con el modelo actual. El maximo posible es ~{fmtCurrency(scenCResult.allocation.projectedOutcome)}.</p>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
                <KpiCard label="Budget Necesario" value={fmtCurrency(scenCResult.totalBudget)} color={scenCResult.achievable ? VIOLET : "#ef4444"} icon={BarChart2} accent />
                <KpiCard label="Outcome Proyectado" value={fmtCurrency(scenCResult.allocation.projectedOutcome)} color="#059669" icon={Target} />
                <KpiCard label="vs. Budget Actual" value={`${fmtCurrency(scenCResult.totalBudget - Object.values(avgSpend).reduce((s, v) => s + v, 0))}`} sub="Incremento necesario" color="#F59E0B" icon={TrendingUp} />
              </div>
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: "0 0 12px" }}>Distribucion recomendada</p>
                {enabledCh.map(ch => { const opt = scenCResult.allocation.recommended[ch.id] ?? 0; const totO = Object.values(scenCResult.allocation.recommended).reduce((s, v) => s + v, 0);
                  return (<div key={ch.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: ch.color }} />
                    <span style={{ fontSize: 12, fontWeight: 600, width: 100 }}>{ch.name}</span>
                    <div style={{ flex: 1, height: 7, borderRadius: 4, background: "var(--surface-hover)", overflow: "hidden" }}><div style={{ height: "100%", width: `${totO > 0 ? (opt / totO) * 100 : 0}%`, background: ch.color, borderRadius: 4 }} /></div>
                    <span style={{ fontSize: 12, fontWeight: 700, width: 70, textAlign: "right" }}>{fmtCurrency(opt)}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", width: 40, textAlign: "right" }}>{totO > 0 ? fmtPct(opt / totO) : "0%"}</span>
                  </div>);
                })}
              </div>
            </>
          )}
        </div>
      </>}
    </div>
  );
}


// ─── Tab Config (v2) con auto-calibracion y restricciones ────────────────────
function TabConfig({ channels, setChannels, rows }: { channels: ChannelConfig[]; setChannels: (c: ChannelConfig[]) => void; rows: WeeklyRow[] }) {
  const [newName, setNewName] = React.useState(""); const [newColor, setNewColor] = React.useState("#6366f1");
  const [calibrating, setCalibrating] = React.useState<string | null>(null);
  const upCh = (id: string, u: Partial<ChannelConfig>) => setChannels(channels.map(c => c.id === id ? { ...c, ...u } : c));
  const addCh = () => {
    if (!newName.trim()) return;
    setChannels([...channels, { id: newName.toLowerCase().replace(/\s+/g, "_"), name: newName.trim(), color: newColor, adstockDecay: 0.4, saturationAlpha: 0.8, saturationK: 5000, enabled: true }]);
    setNewName("");
  };
  const autoCalibrateAll = async () => {
    setCalibrating("all");
    const results = await calibrateAllChannels(rows, channels);
    setChannels(channels.map(ch => {
      const res = results.get(ch.id);
      if (!res || !res.improved) return ch;
      return { ...ch, adstockDecay: res.adstockDecay, saturationAlpha: res.saturationAlpha, saturationK: res.saturationK, autoCalibratedAt: new Date().toISOString() };
    }));
    setCalibrating(null);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div><p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Parametros del Modelo</p><p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0" }}>Calibra adstock y saturacion. Auto-calibrar maximiza R^2.</p></div>
        <button onClick={autoCalibrateAll} disabled={calibrating === "all" || rows.filter(r => !r.isOutlier).length < 4} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.2)", color: "#059669", cursor: "pointer", fontFamily: "inherit" }}>
          <Cpu size={13} style={{ animation: calibrating === "all" ? "spin 0.8s linear infinite" : "none" }} />
          {calibrating === "all" ? "Calibrando..." : "Auto-calibrar todo"}
        </button>
      </div>
      {channels.map(ch => (
        <div key={ch.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", background: "var(--surface-hover)", borderBottom: "1px solid var(--border)" }}>
            <input type="color" value={ch.color} onChange={e => upCh(ch.id, { color: e.target.value })} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer", padding: 2, background: "transparent" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", flex: 1 }}>{ch.name}</span>
            {ch.autoCalibratedAt && <span style={{ fontSize: 10, color: "#059669", background: "rgba(5,150,105,0.1)", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>Auto {new Date(ch.autoCalibratedAt).toLocaleDateString("es-MX", { month: "short", day: "numeric" })}</span>}
            <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}><input type="checkbox" checked={ch.enabled} onChange={e => upCh(ch.id, { enabled: e.target.checked })} style={{ accentColor: ch.color }} /><span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Activo</span></label>
            <button onClick={() => setChannels(channels.filter(c => c.id !== ch.id))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 3, display: "flex", borderRadius: 5 }}><Trash2 size={13} /></button>
          </div>
          <div style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
            <div><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>Adstock (lambda)</span><span style={{ fontSize: 11, fontWeight: 700 }}>{ch.adstockDecay.toFixed(2)}</span></div><input type="range" min={0} max={0.99} step={0.01} value={ch.adstockDecay} onChange={e => upCh(ch.id, { adstockDecay: parseFloat(e.target.value), autoCalibratedAt: undefined })} style={{ width: "100%", accentColor: ch.color }} /><span style={{ fontSize: 10, color: "var(--text-muted)" }}>Vida 1/2: {isFinite(adstockHalfLife(ch.adstockDecay)) ? adstockHalfLife(ch.adstockDecay).toFixed(1) + " sem" : "infinita"}</span></div>
            <div><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>Alpha (forma)</span><span style={{ fontSize: 11, fontWeight: 700 }}>{ch.saturationAlpha.toFixed(2)}</span></div><input type="range" min={0.1} max={3} step={0.1} value={ch.saturationAlpha} onChange={e => upCh(ch.id, { saturationAlpha: parseFloat(e.target.value), autoCalibratedAt: undefined })} style={{ width: "100%", accentColor: ch.color }} /><span style={{ fontSize: 10, color: "var(--text-muted)" }}>{"< 1 concava | > 1 S-curve"}</span></div>
            <div><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>K Half-sat.</span><span style={{ fontSize: 11, fontWeight: 700 }}>{fmtCurrency(ch.saturationK)}</span></div><input type="number" value={ch.saturationK} min={100} step={100} onChange={e => upCh(ch.id, { saturationK: parseFloat(e.target.value) || 1000, autoCalibratedAt: undefined })} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-hover)", color: "var(--foreground)", fontSize: 12, fontFamily: "inherit", width: "100%" }} /></div>
          </div>
          {/* Restricciones */}
          <div style={{ padding: "0 18px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>Gasto minimo / sem</span><input type="number" value={ch.minSpend ?? ""} placeholder="Sin limite" min={0} step={100} onChange={e => upCh(ch.id, { minSpend: e.target.value ? parseFloat(e.target.value) : undefined })} style={{ display: "block", marginTop: 4, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-hover)", color: "var(--foreground)", fontSize: 12, fontFamily: "inherit", width: "100%" }} /></div>
            <div><span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>Gasto maximo / sem</span><input type="number" value={ch.maxSpend ?? ""} placeholder="Sin limite" min={0} step={100} onChange={e => upCh(ch.id, { maxSpend: e.target.value ? parseFloat(e.target.value) : undefined })} style={{ display: "block", marginTop: 4, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-hover)", color: "var(--foreground)", fontSize: 12, fontFamily: "inherit", width: "100%" }} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid var(--border)" }}>
            <div style={{ padding: "10px 18px", borderRight: "1px solid var(--border)" }}><p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 4px", textTransform: "uppercase" }}>Adstock</p><AdstockDecayChart lambda={ch.adstockDecay} color={ch.color} /></div>
            <div style={{ padding: "10px 18px" }}><p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 4px", textTransform: "uppercase" }}>Saturacion</p><SatCurveChart alpha={ch.saturationAlpha} k={ch.saturationK} currentSpend={ch.saturationK} color={ch.color} /></div>
          </div>
        </div>
      ))}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 18 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: "0 0 10px" }}>Agregar Canal</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--border)", cursor: "pointer", padding: 2, background: "transparent", flexShrink: 0 }} />
          <input type="text" placeholder="Nombre del canal (ej. LinkedIn Ads)" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addCh()} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-hover)", color: "var(--foreground)", fontSize: 13, fontFamily: "inherit" }} />
          <button onClick={addCh} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: VIOLET_LIGHT, border: `1px solid ${VIOLET_BORDER}`, color: VIOLET, cursor: "pointer", fontFamily: "inherit" }}><Plus size={13} /> Agregar</button>
        </div>
      </div>
    </div>
  );
}


// ─── Main Page (v2) ───────────────────────────────────────────────────────────
export default function MediaMixPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = React.useState<Tab>("resumen");
  const [channels, setChannels] = React.useState<ChannelConfig[]>(REAL_DEFAULT_CHANNELS);
  const [rows, setRows] = React.useState<WeeklyRow[]>([]);
  const [isRunning, setIsRunning] = React.useState(false);
  const [model, setModel] = React.useState<MmmModel | null>(null);
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const [exportOpen, setExportOpen] = React.useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Evita que el auto-save dispare mientras cargamos la config de otro cliente.
  const loadingClientRef = useRef(false);

  // Workspace ID from session
  const workspaceId = (session?.user as any)?.activeWorkspaceId ?? "local";

  // ── Clientes y verticales reales (de los proyectos del workspace) ─────────
  const [projects, setProjects] = React.useState<ProjectLike[]>([]);
  const [projectsLoaded, setProjectsLoaded] = React.useState(false);
  const [selectedVertical, setSelectedVertical] = React.useState<string>(""); // "" = todas
  const [selectedClient, setSelectedClient] = React.useState<string>("");

  const clients = useMemo<MmmClient[]>(() => clientsFromProjects(projects), [projects]);
  const verticals = useMemo<string[]>(() => verticalsFromClients(clients), [clients]);
  const filteredClients = useMemo<MmmClient[]>(
    () => (selectedVertical ? clients.filter(c => c.vertical === selectedVertical) : clients),
    [clients, selectedVertical]
  );
  const selectedClientObj = useMemo(() => clients.find(c => c.name === selectedClient) ?? null, [clients, selectedClient]);

  const localKey = selectedClient ? `mmm_v2_${workspaceId}_${selectedClient}` : "";

  // Cargar proyectos reales una vez.
  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(d => { setProjects(Array.isArray(d) ? d : (d?.data ?? [])); })
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoaded(true));
  }, []);

  // Autoseleccionar el primer cliente disponible; reajustar si el filtro de
  // vertical deja fuera al cliente activo.
  useEffect(() => {
    if (filteredClients.length === 0) { if (selectedClient) setSelectedClient(""); return; }
    if (!selectedClient || !filteredClients.some(c => c.name === selectedClient)) {
      setSelectedClient(filteredClients[0].name);
    }
  }, [filteredClients, selectedClient]);

  // ── Load config DEL CLIENTE seleccionado (sin datos demo) ─────────────────
  useEffect(() => {
    // Cancela cualquier guardado pendiente del cliente anterior.
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (!selectedClient) {
      setChannels(REAL_DEFAULT_CHANNELS); setRows([]); setModel(null);
      return;
    }
    loadingClientRef.current = true;
    let cancelled = false;
    const apply = (cfg: MmmSavedConfig | null) => {
      if (cancelled) return;
      setChannels(cfg?.channels?.length ? cfg.channels : REAL_DEFAULT_CHANNELS);
      setRows(cfg?.rows ?? []);
      loadingClientRef.current = false;
    };
    // 1. localStorage inmediato
    const cached = localKey ? localStorage.getItem(localKey) : null;
    if (cached) {
      try { apply(JSON.parse(cached) as MmmSavedConfig); return () => { cancelled = true; }; } catch {}
    }
    // 2. DB fetch — si no hay config guardada, arrancamos VACÍO (no demo).
    fetch(`/api/mmm/config?client=${encodeURIComponent(selectedClient)}`)
      .then(r => r.json())
      .then(d => apply((d?.data?.config as MmmSavedConfig | null) ?? null))
      .catch(() => apply(null));
    return () => { cancelled = true; };
  }, [selectedClient, localKey]);

  // ── Auto-save con debounce (scopeado por cliente) ─────────────────────────
  useEffect(() => {
    if (!selectedClient || loadingClientRef.current) return;
    if (!rows.length && !channels.length) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    const clientAtSave = selectedClient;
    const verticalAtSave = selectedClientObj?.vertical ?? undefined;
    saveTimer.current = setTimeout(async () => {
      const cfg: MmmSavedConfig = { channels, rows, savedAt: new Date().toISOString(), client: clientAtSave, ...(verticalAtSave ? { vertical: verticalAtSave } : {}) };
      // localStorage (instantaneo)
      try { if (localKey) localStorage.setItem(localKey, JSON.stringify(cfg)); } catch {}
      // DB
      try {
        await fetch("/api/mmm/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client: clientAtSave, vertical: verticalAtSave, channels, rows }) });
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch { setSaveState("error"); }
    }, SAVE_DEBOUNCE);
  }, [JSON.stringify(channels), JSON.stringify(rows), selectedClient]);

  // ── Modelo ────────────────────────────────────────────────────────────────
  const runModel = useCallback(() => {
    if (rows.filter(r => !r.isOutlier).length < 3) { setModel(null); return; }
    setIsRunning(true);
    setTimeout(() => { setModel(runMmm(rows, channels)); setIsRunning(false); }, 50);
  }, [rows, channels]);
  useEffect(() => { runModel(); }, [runModel]);

  // ── Import desde Meta Ads ─────────────────────────────────────────────────
  const handleImport = useCallback(async () => {
    const res = await fetch("/api/mmm/spend?weeks=12");
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? "Error al conectar con Meta Ads");
    const imported: WeeklyRow[] = data.data?.weeks ?? [];
    if (!imported.length) throw new Error("No se encontraron semanas con gasto. Verifica que hay una cuenta Meta Ads conectada.");
    // Merge: conservar outcome existente si la semana ya existe
    const existingByWeek = Object.fromEntries(rows.map(r => [r.week, r]));
    const merged = imported.map((r: WeeklyRow) => ({
      ...r,
      outcome: existingByWeek[r.week]?.outcome ?? 0,
      note: existingByWeek[r.week]?.note ?? "",
    }));
    setRows(merged);
  }, [rows]);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = (type: "csv" | "text" | "copy") => {
    setExportOpen(false);
    if (!model) return;
    if (type === "csv") downloadCsv(generateCsvReport(rows, channels, model));
    if (type === "text") downloadText(generateSummaryText(model, channels));
    if (type === "copy") { copyToClipboard(generateSummaryText(model, channels)).then(() => alert("Copiado al portapapeles")).catch(() => {}); }
  };

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "resumen", label: "Resumen", icon: PieChartIcon },
    { key: "datos", label: "Datos", icon: Database },
    { key: "modelo", label: "Modelo", icon: Activity },
    { key: "simulador", label: "Simulador", icon: Sliders },
    { key: "config", label: "Configuracion", icon: Settings2 },
  ];

  const saveBadge = saveState === "saving" ? { text: "Guardando...", color: "var(--text-muted)" } : saveState === "saved" ? { text: "Guardado", color: "#059669" } : saveState === "error" ? { text: "Error al guardar", color: "#ef4444" } : null;

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeInUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } } .mmm-tab:hover { background: rgba(124,58,237,0.08) !important; } .mmm-export-item:hover { background: var(--surface-hover) !important; }`}</style>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", animation: "fadeInUp 0.3s ease" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 26px 0", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface-hover)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-secondary)" }}><ArrowLeft size={15} /></button>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#4c1d95,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 18px rgba(124,58,237,0.3)" }}><PieChartIcon size={20} color="#fff" /></div>
            <div>
              <h1 style={{ fontSize: 19, fontWeight: 800, color: "var(--foreground)", margin: 0 }}>Media Mix</h1>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                {model ? `R\u00b2 ${(model.rSquared * 100).toFixed(0)}% \u00b7 ${model.weekCount} sem \u00b7 ${channels.filter(c => c.enabled).length} canales` : "Convergencia \u00b7 El peso real de cada canal"}
                {saveBadge && <span style={{ color: saveBadge.color, marginLeft: 8 }}>· {saveBadge.text}</span>}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Selector de Vertical (filtro) + Cliente — datos reales del workspace */}
            {verticals.length > 0 && (
              <select
                value={selectedVertical}
                onChange={e => setSelectedVertical(e.target.value)}
                title="Filtrar clientes por vertical"
                style={{ padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "inherit", cursor: "pointer", maxWidth: 170 }}
              >
                <option value="">Todas las verticales</option>
                {verticals.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            )}
            {filteredClients.length > 0 && (
              <select
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value)}
                title="Cliente cuyo media mix se está modelando"
                style={{ padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: VIOLET_LIGHT, border: `1px solid ${VIOLET_BORDER}`, color: VIOLET, fontFamily: "inherit", cursor: "pointer", maxWidth: 200 }}
              >
                {filteredClients.map(c => <option key={c.name} value={c.name}>{c.name}{c.vertical ? ` · ${c.vertical}` : ""}</option>)}
              </select>
            )}
            {model && <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.2)", fontSize: 11, fontWeight: 600, color: "#059669" }}><CheckCircle2 size={11} /> Modelo activo</div>}
            {/* Export dropdown */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setExportOpen(o => !o)} disabled={!model} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--surface-hover)", border: "1px solid var(--border)", color: model ? "var(--foreground)" : "var(--text-muted)", cursor: model ? "pointer" : "not-allowed", fontFamily: "inherit" }}><Download size={12} /> Exportar</button>
              {exportOpen && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, zIndex: 100, minWidth: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", overflow: "hidden" }}>
                  {[{ k: "csv" as const, label: "CSV de datos" }, { k: "text" as const, label: "Resumen (.txt)" }, { k: "copy" as const, label: "Copiar resumen" }].map(item => (
                    <button key={item.k} className="mmm-export-item" onClick={() => handleExport(item.k)} style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", fontSize: 13, fontWeight: 500, background: "transparent", border: "none", color: "var(--foreground)", cursor: "pointer", fontFamily: "inherit" }}>{item.label}</button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={runModel} disabled={isRunning} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: VIOLET_LIGHT, border: `1px solid ${VIOLET_BORDER}`, color: VIOLET, cursor: "pointer", fontFamily: "inherit" }}>
              <RefreshCw size={12} style={{ animation: isRunning ? "spin 0.8s linear infinite" : "none" }} />
              {isRunning ? "Calculando..." : "Recalcular"}
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 3, padding: "14px 26px 0", borderBottom: "1px solid var(--border)" }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key; const Icon = tab.icon;
            return (<button key={tab.key} onClick={() => setActiveTab(tab.key)} className="mmm-tab" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "8px 8px 0 0", fontSize: 13, fontWeight: isActive ? 700 : 500, background: isActive ? VIOLET_LIGHT : "transparent", border: isActive ? `1px solid ${VIOLET_BORDER}` : "1px solid transparent", borderBottom: isActive ? `1px solid ${VIOLET_LIGHT}` : "1px solid transparent", color: isActive ? VIOLET : "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit", marginBottom: isActive ? -1 : 0, transition: "all 0.18s" }}><Icon size={13} />{tab.label}</button>);
          })}
        </div>
        {/* Content */}
        {exportOpen && <div onClick={() => setExportOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />}
        <div style={{ flex: 1, overflowY: "auto", padding: "26px", scrollbarWidth: "none" }}>
          {projectsLoaded && clients.length === 0 ? (
            <div style={{ textAlign: "center", padding: "70px 20px", color: "var(--text-secondary)" }}>
              <Layers size={42} color="var(--text-muted)" style={{ marginBottom: 16 }} />
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: "0 0 8px" }}>No hay clientes para modelar</p>
              <p style={{ fontSize: 13, margin: "0 0 20px", maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
                El Media Mix se construye sobre tus <strong>clientes y verticales reales</strong>. Crea al menos un proyecto con cliente asignado en Proyectos para empezar.
              </p>
              <button onClick={() => router.push("/dashboard/proyectos")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: VIOLET_LIGHT, border: `1px solid ${VIOLET_BORDER}`, color: VIOLET, cursor: "pointer", fontFamily: "inherit" }}>
                <Plus size={14} /> Ir a Proyectos
              </button>
            </div>
          ) : !selectedClient ? (
            <div style={{ textAlign: "center", padding: "70px 20px", color: "var(--text-secondary)" }}>
              <PieChartIcon size={42} color="var(--text-muted)" style={{ marginBottom: 16 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: "0 0 8px" }}>Selecciona un cliente</p>
              <p style={{ fontSize: 13, margin: 0 }}>Elige un cliente en el selector superior para ver y configurar su media mix.</p>
            </div>
          ) : (
            <>
              {activeTab === "resumen"   && <TabResumen   model={model} channels={channels} rows={rows} />}
              {activeTab === "datos"     && <TabDatos     rows={rows} setRows={setRows} channels={channels} onImport={handleImport} />}
              {activeTab === "modelo"    && <TabModelo    model={model} channels={channels} rows={rows} />}
              {activeTab === "simulador" && <TabSimulador model={model} channels={channels} rows={rows} />}
              {activeTab === "config"    && <TabConfig    channels={channels} setChannels={setChannels} rows={rows} />}
            </>
          )}
        </div>
      </div>
    </>
  );
}
