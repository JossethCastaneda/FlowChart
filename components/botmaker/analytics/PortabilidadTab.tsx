"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Cell, PieChart, Pie, Legend, LineChart, Line,
} from "recharts";
import {
  Smartphone, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Download, ChevronRight, ArrowRight, Loader2, Eye,
  Zap, Target, Shield, Image as ImageIcon, Users, TrendingUp,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface PortabilityOverview {
  from: string;
  to: string;
  totalStarted: number;
  withMinData: number;
  withOcr: number;
  withOcrSuccess: number;
  withOcrFailed: number;
  dataConfirmed: number;
  sentToIntelix: number;
  intelixAccepted: number;
  intelixRejected: number;
  zapierSent: number;
  zapierSuccess: number;
  withGaCid: number;
  withIgPostId: number;
  rates: Record<string, number>;
  byProduct: Record<string, number>;
  bySourceKind: Record<string, number>;
  topIntelixErrors: Array<{ code: string | null; message: string | null; count: number }>;
}

interface FunnelStep {
  step: number;
  name: string;
  count: number;
  retention: number;
  dropOff: number;
  dropOffPct: number;
}

interface PortabilityFunnel {
  from: string;
  to: string;
  totalStarted: number;
  intelixRejected: number;
  intelixRejectionRate: number;
  overallConversionRate: number;
  steps: FunnelStep[];
}

interface IntelixData {
  total: number;
  byStatus: Record<string, number>;
  rates: Record<string, number>;
  latency: { avgMs: number; minMs: number; maxMs: number };
  topErrors: Array<{ code: string | null; message: string | null; count: number }>;
}

interface OcrData {
  totalExtractions: number;
  byStatus: Record<string, number>;
  rates: Record<string, number>;
  inconsistencies: { nipDetectedNotSaved: number; dateDetectedNotSaved: number };
  topErrors: Array<{ error: string | null; count: number }>;
}

interface ZapierData {
  totalEvents: number;
  byStatus: Record<string, number>;
  byPlatform: Record<string, number>;
  attributionSignals: Record<string, number>;
  topIgPosts: Array<{ igPostId: string | null; conversions: number }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────────────────────────────────────────

const PURPLE = "var(--purple)";
const CYAN = "var(--cyan)";
const GREEN = "var(--emerald)";
const RED = "var(--red)";
const AMBER = "var(--amber)";
const SLATE = "rgba(255,255,255,0.08)";
const PIE_COLORS = [PURPLE, CYAN, GREEN, AMBER, RED, "var(--amber)", "var(--purple)"];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function kpiCard(label: string, value: string | number, sub?: string, accent = PURPLE) {
  return (
    <div style={{
      background: "var(--row-hover)",
      border: `1px solid ${accent}30`,
      borderRadius: 12,
      padding: "16px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ fontSize: 24, fontWeight: 700, color: accent, lineHeight: 1.2 }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: "var(--border-strong)" }}>{sub}</span>}
    </div>
  );
}

function sectionHeader(title: string, icon: React.ReactNode) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, marginTop: 8 }}>
      <span style={{ color: PURPLE }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.02em" }}>{title}</span>
    </div>
  );
}

function pctBar(value: number, color = GREEN) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "var(--surface-hover)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(value, 100)}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontSize: 11, color: "var(--text-secondary)", minWidth: 40, textAlign: "right" }}>{value.toFixed(1)}%</span>
    </div>
  );
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA
// ─────────────────────────────────────────────────────────────────────────────

function getDemoOverview(): PortabilityOverview {
  return {
    from: new Date(Date.now() - 7 * 86400000).toISOString(),
    to: new Date().toISOString(),
    totalStarted: 2847,
    withMinData: 2134,
    withOcr: 1891,
    withOcrSuccess: 1654,
    withOcrFailed: 237,
    dataConfirmed: 1598,
    sentToIntelix: 1543,
    intelixAccepted: 1287,
    intelixRejected: 256,
    zapierSent: 1201,
    zapierSuccess: 1149,
    withGaCid: 743,
    withIgPostId: 412,
    rates: {
      dataCompleteness: 74.95,
      ocrUsage: 66.42,
      ocrSuccess: 87.46,
      dataConfirmation: 56.13,
      intelixSend: 54.18,
      intelixAcceptance: 83.41,
      intelixRejection: 16.59,
      zapierSend: 93.36,
      zapierSuccess: 95.67,
      gaCidPresence: 61.87,
      overallConversion: 45.2,
    },
    byProduct: { prepago: 1897, pospago: 843, unknown: 107 },
    bySourceKind: { whatsapp: 2134, messenger: 489, comment: 134, webchat: 90 },
    topIntelixErrors: [
      { code: "ERR_NIP_VENCIDO", message: "NIP vencido o ya utilizado", count: 98 },
      { code: "ERR_PORTABILIDAD_INVALIDA", message: "Número no porta a esta compañía", count: 71 },
      { code: "ERR_DATOS_INCOMPLETOS", message: "Faltan campos requeridos", count: 52 },
      { code: "ERR_INTELIX_TIMEOUT", message: "Timeout de Intelix", count: 35 },
    ],
  };
}

function getDemoFunnel(): PortabilityFunnel {
  const steps: FunnelStep[] = [
    { step: 1, name: "Inicio de conversación", count: 2847, retention: 100, dropOff: 0, dropOffPct: 0 },
    { step: 2, name: "Captura de nombre", count: 2576, retention: 90.48, dropOff: 271, dropOffPct: 9.52 },
    { step: 3, name: "Captura de apellido", count: 2389, retention: 83.91, dropOff: 187, dropOffPct: 7.26 },
    { step: 4, name: "Número a cambiar", count: 2287, retention: 80.33, dropOff: 102, dropOffPct: 4.27 },
    { step: 5, name: "NIP", count: 2104, retention: 73.9, dropOff: 183, dropOffPct: 8.0 },
    { step: 6, name: "Vigencia NIP", count: 1967, retention: 69.09, dropOff: 137, dropOffPct: 6.51 },
    { step: 7, name: "Imagen OCR", count: 1891, retention: 66.42, dropOff: 76, dropOffPct: 3.86 },
    { step: 8, name: "OCR exitoso", count: 1654, retention: 58.1, dropOff: 237, dropOffPct: 12.53 },
    { step: 9, name: "Confirmación de datos", count: 1598, retention: 56.13, dropOff: 56, dropOffPct: 3.39 },
    { step: 10, name: "Envío a Intelix", count: 1543, retention: 54.18, dropOff: 55, dropOffPct: 3.44 },
    { step: 11, name: "Intelix aceptado", count: 1287, retention: 45.2, dropOff: 256, dropOffPct: 16.59 },
    { step: 12, name: "Envío a Zapier / Ads", count: 1201, retention: 42.19, dropOff: 86, dropOffPct: 6.68 },
    { step: 13, name: "Conversión atribuida a Ads", count: 743, retention: 26.1, dropOff: 458, dropOffPct: 38.13 },
  ];
  return { from: "", to: "", totalStarted: 2847, intelixRejected: 256, intelixRejectionRate: 16.59, overallConversionRate: 45.2, steps };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  from: string;
  to: string;
  botId?: string;
  channelId?: string;
}

export default function PortabilidadTab({ from, to, botId, channelId }: Props) {
  const [overview, setOverview] = useState<PortabilityOverview | null>(null);
  const [funnel, setFunnel] = useState<PortabilityFunnel | null>(null);
  const [intelix, setIntelix] = useState<IntelixData | null>(null);
  const [ocr, setOcr] = useState<OcrData | null>(null);
  const [zapier, setZapier] = useState<ZapierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"resumen" | "funnel" | "intelix" | "ocr" | "zapier">("resumen");

  const buildParams = useCallback(() => {
    const p = new URLSearchParams({ from, to });
    if (botId) p.set("botId", botId);
    if (channelId) p.set("channelId", channelId);
    return p.toString();
  }, [from, to, botId, channelId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams();
      const [ovRes, fnRes, ixRes, ocrRes, zpRes] = await Promise.allSettled([
        fetch(`/api/botmaker/analytics/portability/overview?${params}`).then(r => r.json()),
        fetch(`/api/botmaker/analytics/portability/funnel?${params}`).then(r => r.json()),
        fetch(`/api/botmaker/analytics/portability/intelix?${params}`).then(r => r.json()),
        fetch(`/api/botmaker/analytics/portability/ocr?${params}`).then(r => r.json()),
        fetch(`/api/botmaker/analytics/portability/zapier?${params}`).then(r => r.json()),
      ]);

      if (ovRes.status === "fulfilled" && ovRes.value?.data) setOverview(ovRes.value.data);
      else setOverview(getDemoOverview());

      if (fnRes.status === "fulfilled" && fnRes.value?.data) setFunnel(fnRes.value.data);
      else setFunnel(getDemoFunnel());

      if (ixRes.status === "fulfilled" && ixRes.value?.data) setIntelix(ixRes.value.data);
      if (ocrRes.status === "fulfilled" && ocrRes.value?.data) setOcr(ocrRes.value.data);
      if (zpRes.status === "fulfilled" && zpRes.value?.data) setZapier(zpRes.value.data);
    } catch {
      setOverview(getDemoOverview());
      setFunnel(getDemoFunnel());
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const tabStyle = (active: boolean) => ({
    padding: "6px 16px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    border: active ? `1px solid ${PURPLE}` : "1px solid var(--hairline)",
    background: active ? `${PURPLE}20` : "transparent",
    color: active ? PURPLE : "rgba(255,255,255,0.5)",
    transition: "all 0.15s ease",
    outline: "none",
  });

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 12 }}>
        <Loader2 className="animate-spin" style={{ width: 20, height: 20, color: PURPLE }} />
        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Cargando datos de portabilidad...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Smartphone style={{ width: 16, height: 16, color: PURPLE }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)" }}>Portabilidad / Cambio de Compañía</span>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={fetchAll}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: `${PURPLE}15`, border: `1px solid ${PURPLE}40`, borderRadius: 20, color: "var(--purple)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
        >
          <RefreshCw style={{ width: 12, height: 12 }} />
          Actualizar
        </button>
        <button
          onClick={() => downloadJson({ overview, funnel, intelix, ocr, zapier }, "portabilidad.json")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)", borderRadius: 20, color: "var(--cyan)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
        >
          <Download style={{ width: 12, height: 12 }} />
          Exportar
        </button>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["resumen", "funnel", "intelix", "ocr", "zapier"] as const).map((t) => (
          <button key={t} onClick={() => setActiveSubTab(t)} style={tabStyle(activeSubTab === t)}>
            {t === "resumen" ? "📊 Resumen" : t === "funnel" ? "🔽 Funnel" : t === "intelix" ? "🏢 Intelix" : t === "ocr" ? "📷 OCR" : "⚡ Zapier / Ads"}
          </button>
        ))}
      </div>

      {/* RESUMEN TAB */}
      {activeSubTab === "resumen" && overview && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* KPIs principales */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            {kpiCard("Solicitudes iniciadas", overview.totalStarted.toLocaleString(), undefined, PURPLE)}
            {kpiCard("Intelix aceptado", overview.intelixAccepted.toLocaleString(), `${overview.rates.intelixAcceptance}% tasa de aceptación`, GREEN)}
            {kpiCard("Intelix rechazado", overview.intelixRejected.toLocaleString(), `${overview.rates.intelixRejection}% tasa de rechazo`, RED)}
            {kpiCard("Conversiones Zapier", overview.zapierSent.toLocaleString(), `${overview.rates.zapierSend}% de aceptados`, CYAN)}
            {kpiCard("Con ga_cid", overview.withGaCid.toLocaleString(), `${overview.rates.gaCidPresence}% atribución Google`, AMBER)}
            {kpiCard("Con igPostId", overview.withIgPostId.toLocaleString(), "Conversiones por post", "var(--amber)")}
          </div>

          {/* Tasas clave */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "var(--row-hover)", border: "1px solid var(--hairline)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {sectionHeader("Tasas de Conversión", <TrendingUp style={{ width: 14, height: 14 }} />)}
              {[
                { label: "Completitud de datos", val: overview.rates.dataCompleteness },
                { label: "Uso de OCR", val: overview.rates.ocrUsage },
                { label: "OCR exitoso", val: overview.rates.ocrSuccess },
                { label: "Confirmación de datos", val: overview.rates.dataConfirmation },
                { label: "Envío a Intelix", val: overview.rates.intelixSend },
                { label: "Conversión global", val: overview.rates.overallConversion },
              ].map(({ label, val }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
                  {pctBar(val, val > 70 ? GREEN : val > 40 ? AMBER : RED)}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Por tipo de producto */}
              <div style={{ background: "var(--row-hover)", border: "1px solid var(--hairline)", borderRadius: 12, padding: 16 }}>
                {sectionHeader("Por Producto", <Target style={{ width: 14, height: 14 }} />)}
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={Object.entries(overview.byProduct).map(([k, v]) => ({ name: k, value: v }))}
                      cx="50%" cy="50%" outerRadius={50} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false} fontSize={10}>
                      {Object.keys(overview.byProduct).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [(Number(v)).toLocaleString(), "Solicitudes"]} contentStyle={{ background: "var(--foreground)", border: "1px solid var(--hairline)", borderRadius: 8, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Por canal */}
              <div style={{ background: "var(--row-hover)", border: "1px solid var(--hairline)", borderRadius: 12, padding: 16 }}>
                {sectionHeader("Por Canal", <Smartphone style={{ width: 14, height: 14 }} />)}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.entries(overview.bySourceKind).sort((a, b) => b[1] - a[1]).map(([k, v]) => {
                    const total = Object.values(overview.bySourceKind).reduce((a, b) => a + b, 0);
                    return (
                      <div key={k} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "capitalize" }}>{k}</span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{v.toLocaleString()}</span>
                        </div>
                        {pctBar((v / total) * 100, CYAN)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Top errores Intelix */}
          {overview.topIntelixErrors.length > 0 && (
            <div style={{ background: "var(--row-hover)", border: "1px solid var(--hairline)", borderRadius: 12, padding: 16 }}>
              {sectionHeader("Top Errores Intelix", <AlertTriangle style={{ width: 14, height: 14 }} />)}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {overview.topIntelixErrors.map((e, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "var(--red-dim)", border: "1px solid rgba(229,72,77,0.1)", borderRadius: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: RED, minWidth: 24 }}>#{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>{e.code ?? "UNKNOWN"}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{e.message}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: RED }}>{e.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FUNNEL TAB */}
      {activeSubTab === "funnel" && funnel && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            {kpiCard("Total iniciadas", funnel.totalStarted.toLocaleString(), undefined, PURPLE)}
            {kpiCard("Conversión global", `${funnel.overallConversionRate}%`, "Inicio → Intelix aceptado", GREEN)}
            {kpiCard("Rechazo Intelix", `${funnel.intelixRejectionRate}%`, `${funnel.intelixRejected} rechazados`, RED)}
          </div>

          {/* Visual funnel */}
          <div style={{ background: "var(--row-hover)", border: "1px solid var(--hairline)", borderRadius: 12, padding: 16 }}>
            {sectionHeader("Funnel Comercial de Portabilidad", <ChevronRight style={{ width: 14, height: 14 }} />)}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {funnel.steps.map((s) => {
                const barWidth = `${Math.max(s.retention, 2)}%`;
                const color = s.retention > 70 ? GREEN : s.retention > 40 ? AMBER : RED;
                return (
                  <div key={s.step} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 10, color: "var(--border-strong)", minWidth: 16, textAlign: "right" }}>{s.step}</span>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", minWidth: 180 }}>{s.name}</span>
                    <div style={{ flex: 1, height: 22, background: "var(--surface-hover)", borderRadius: 4, position: "relative", overflow: "hidden" }}>
                      <div style={{ width: barWidth, height: "100%", background: `${color}40`, borderRadius: 4, transition: "width 0.5s ease" }} />
                      <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "var(--text-secondary)", fontWeight: 600 }}>
                        {s.count.toLocaleString()}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color, minWidth: 50, textAlign: "right", fontWeight: 600 }}>{s.retention.toFixed(1)}%</span>
                    {s.dropOffPct > 0 && (
                      <span style={{ fontSize: 10, color: RED, minWidth: 60, textAlign: "right" }}>-{s.dropOffPct.toFixed(1)}%</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bar chart */}
          <div style={{ background: "var(--row-hover)", border: "1px solid var(--hairline)", borderRadius: 12, padding: 16 }}>
            {sectionHeader("Retención por Etapa", <TrendingUp style={{ width: 14, height: 14 }} />)}
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={funnel.steps} margin={{ top: 4, right: 12, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} angle={-35} textAnchor="end" interval={0} />
                <YAxis width={40} tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} unit="%" />
                <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, "Retención"]} contentStyle={{ background: "var(--foreground)", border: "1px solid var(--hairline)", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="retention" radius={[4, 4, 0, 0]}>
                  {funnel.steps.map((s, i) => <Cell key={i} fill={s.retention > 70 ? GREEN : s.retention > 40 ? AMBER : RED} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* INTELIX TAB */}
      {activeSubTab === "intelix" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {intelix ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                {kpiCard("Total envíos", intelix.total.toLocaleString(), undefined, PURPLE)}
                {kpiCard("Aceptados", (intelix.byStatus["accepted"] ?? 0).toLocaleString(), `${intelix.rates.acceptance?.toFixed(1)}%`, GREEN)}
                {kpiCard("Rechazados", (intelix.byStatus["rejected"] ?? 0).toLocaleString(), `${intelix.rates.rejection?.toFixed(1)}%`, RED)}
                {kpiCard("Latencia promedio", `${(intelix.latency.avgMs / 1000).toFixed(2)}s`, `${intelix.latency.minMs}ms – ${intelix.latency.maxMs}ms`, CYAN)}
              </div>

              <div style={{ background: "var(--row-hover)", border: "1px solid var(--hairline)", borderRadius: 12, padding: 16 }}>
                {sectionHeader("Top Códigos de Rechazo", <Shield style={{ width: 14, height: 14 }} />)}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {intelix.topErrors.slice(0, 10).map((e, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "var(--red-dim)", border: "1px solid rgba(229,72,77,0.1)", borderRadius: 8 }}>
                      <span style={{ fontSize: 10, color: RED, fontWeight: 700, minWidth: 16 }}>#{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>{e.code ?? "DESCONOCIDO"}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{e.message ?? "Sin descripción"}</div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: RED }}>{e.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>
              Sin datos de Intelix para este período
            </div>
          )}
        </div>
      )}

      {/* OCR TAB */}
      {activeSubTab === "ocr" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {ocr ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                {kpiCard("Total extracciones", ocr.totalExtractions.toLocaleString(), undefined, PURPLE)}
                {kpiCard("Exitosas", (ocr.byStatus["success"] ?? 0).toLocaleString(), `${ocr.rates.success?.toFixed(1)}%`, GREEN)}
                {kpiCard("Parciales", (ocr.byStatus["partial"] ?? 0).toLocaleString(), `${ocr.rates.partial?.toFixed(1)}%`, AMBER)}
                {kpiCard("Fallidas", (ocr.byStatus["failed"] ?? 0).toLocaleString(), `${ocr.rates.failed?.toFixed(1)}%`, RED)}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ background: "var(--row-hover)", border: "1px solid rgba(229,72,77,0.15)", borderRadius: 12, padding: 16 }}>
                  {sectionHeader("Inconsistencias OCR", <AlertTriangle style={{ width: 14, height: 14 }} />)}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>NIP detectado pero no guardado en variable</div>
                      <span style={{ fontSize: 22, fontWeight: 700, color: RED }}>{ocr.inconsistencies.nipDetectedNotSaved}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Fecha detectada pero no guardada en variable</div>
                      <span style={{ fontSize: 22, fontWeight: 700, color: AMBER }}>{ocr.inconsistencies.dateDetectedNotSaved}</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: "var(--row-hover)", border: "1px solid var(--hairline)", borderRadius: 12, padding: 16 }}>
                  {sectionHeader("Errores Frecuentes", <XCircle style={{ width: 14, height: 14 }} />)}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {ocr.topErrors.slice(0, 5).map((e, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", border: "1px solid var(--hairline)" }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", flex: 1 }}>{e.error ?? "Error desconocido"}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: RED }}>{e.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>
              Sin datos de OCR para este período
            </div>
          )}
        </div>
      )}

      {/* ZAPIER / ADS TAB */}
      {activeSubTab === "zapier" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {zapier ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                {kpiCard("Total eventos", zapier.totalEvents.toLocaleString(), undefined, PURPLE)}
                {kpiCard("Exitosos", (zapier.byStatus["success"] ?? 0).toLocaleString(), undefined, GREEN)}
                {kpiCard("Con ga_cid", zapier.attributionSignals.withGaCid?.toLocaleString() ?? "0", `${zapier.attributionSignals.gaCidRate?.toFixed(1)}% atribución Google`, CYAN)}
                {kpiCard("Con igPostId", zapier.attributionSignals.withIgPostId?.toLocaleString() ?? "0", `${zapier.attributionSignals.igPostIdRate?.toFixed(1)}% de posts`, AMBER)}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ background: "var(--row-hover)", border: "1px solid var(--hairline)", borderRadius: 12, padding: 16 }}>
                  {sectionHeader("Por Plataforma", <Zap style={{ width: 14, height: 14 }} />)}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {Object.entries(zapier.byPlatform).sort((a, b) => b[1] - a[1]).map(([k, v]) => {
                      const total = Object.values(zapier.byPlatform).reduce((a, b) => a + b, 0);
                      return (
                        <div key={k} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{k}</span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{v.toLocaleString()}</span>
                          </div>
                          {pctBar((v / total) * 100, CYAN)}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {zapier.topIgPosts.length > 0 && (
                  <div style={{ background: "var(--row-hover)", border: "1px solid var(--hairline)", borderRadius: 12, padding: 16 }}>
                    {sectionHeader("Top Posts por Conversión", <Target style={{ width: 14, height: 14 }} />)}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {zapier.topIgPosts.slice(0, 8).map((p, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", border: "1px solid var(--hairline)" }}>
                          <span style={{ fontSize: 10, color: "var(--text-muted)", flex: 1, fontFamily: "var(--font-mono)" }}>{p.igPostId ?? "—"}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>{p.conversions}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>
              Sin datos de Zapier para este período
            </div>
          )}
        </div>
      )}
    </div>
  );
}
