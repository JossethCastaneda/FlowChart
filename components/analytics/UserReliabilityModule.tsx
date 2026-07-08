"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend, ComposedChart, Line,
} from "recharts";
import {
  Loader2, ShieldCheck, MapPin, Smartphone, Users, AlertTriangle,
  TrendingDown, Globe, Crosshair, ArrowRight, Layers,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   MÓDULO DE CONFIABILIDAD DEL USUARIO
   
   Analiza el embudo Clic → Resultado por segmento demográfico, geográfico,
   dispositivo y ubicación. El "goal" se adapta dinámicamente al objetivo
   configurado en la campaña del proyecto.
   ═══════════════════════════════════════════════════════════════════════════ */

interface ReliabilityModuleProps {
  adAccountId: string;
  dateStart?: string;
  dateEnd?: string;
  goal?: string;       // e.g. "Conversaciones", "Leads", "Ventas (Purchase)"
  cprTarget?: number;  // CPR meta del proyecto
}

const LABEL_COLORS: Record<string, string> = {
  emerald: "#10b981",
  amber: "#f59e0b",
  orange: "#f97316",
  red: "#ef4444",
  gray: "#6b7280",
};

const GENDER_LABELS: Record<string, string> = {
  female: "Mujeres",
  male: "Hombres",
  unknown: "Desconocido",
};

const fmtMXN = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat("es-MX").format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

export function UserReliabilityModule({
  adAccountId,
  dateStart,
  dateEnd,
  goal = "Conversaciones",
  cprTarget = 0,
}: ReliabilityModuleProps) {
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adAccountId) return;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ adAccountId, goal });
        if (cprTarget > 0) params.append("cprTarget", String(cprTarget));
        if (dateStart) params.append("dateStart", dateStart);
        if (dateEnd) params.append("dateEnd", dateEnd);

        const res = await fetch(`/api/meta/audience-reliability?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch reliability data");
        const json = await res.json();
        setResponse(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [adAccountId, dateStart, dateEnd, goal, cprTarget]);

  if (loading) {
    return (
      <div style={{
        display: "flex", height: 256, alignItems: "center", justifyContent: "center",
        background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)",
        borderRadius: 16, border: "1px solid var(--border)",
      }}>
        <Loader2 style={{ width: 32, height: 32, animation: "spin 1s linear infinite", color: "var(--cyan)" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: 24, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
        borderRadius: 16, color: "#f87171", textAlign: "center", fontSize: 13,
      }}>
        Error cargando módulo de confiabilidad: {error}
      </div>
    );
  }

  if (!response?.data) return null;

  const { config, summary, data, leakZones } = response;
  const topDemo = data.demographics?.[0];
  const topRegion = data.regions?.[0];
  const topDevice = data.devices?.[0];

  // ── Tooltip Component ──────────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const m = d.metrics || d;
    return (
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        padding: 12, borderRadius: 10, fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        maxWidth: 240, zIndex: 9999,
      }}>
        <p style={{ fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>{label}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ color: "var(--cyan)" }}>🎯 Score: {m.reliabilityScore}</span>
          <span style={{ color: "#10b981" }}>📊 CVR: {m.cvr}%</span>
          <span style={{ color: "var(--text-secondary)" }}>🔗 Link Clicks: {fmtNum(m.linkClicks)}</span>
          <span style={{ color: "var(--text-secondary)" }}>✅ {config.goalLabel}: {fmtNum(m.goalResults)}</span>
          <span style={{ color: "var(--text-secondary)" }}>💰 CPA: {fmtMXN(m.cpa)}</span>
          <span style={{ color: "var(--amber)" }}>🎯 Intención: {m.intentionRate}%</span>
        </div>
      </div>
    );
  };

  const panelStyle: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 16, padding: 20, position: "relative", overflow: "hidden",
  };

  const headStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 700, color: "var(--foreground)",
    display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const,
    color: "var(--text-muted)",
  };

  const COLORS_CHART = ["#6366f1", "#8b5cf6", "#d946ef", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ═══ HEADER: Global Funnel Summary ═══ */}
      <div style={{
        background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))",
        backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20, padding: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ padding: 10, background: "rgba(99,102,241,0.15)", borderRadius: 14 }}>
              <ShieldCheck style={{ width: 24, height: 24, color: "#818cf8" }} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--foreground)", fontFamily: "var(--font-display)", letterSpacing: "0.03em" }}>
                Confiabilidad del Usuario
              </h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                Embudo: <strong style={{ color: "var(--cyan)" }}>Clic en Anuncio</strong>
                <ArrowRight style={{ width: 12, height: 12, display: "inline", margin: "0 4px", verticalAlign: "middle" }} />
                <strong style={{ color: "#10b981" }}>{config.goalLabel}</strong>
              </p>
            </div>
          </div>
          {/* Global score badge */}
          <div style={{
            padding: "8px 18px", borderRadius: 24, fontSize: 11, fontWeight: 800,
            letterSpacing: "0.08em",
            background: `${LABEL_COLORS[summary.globalColor] || "#6b7280"}18`,
            color: LABEL_COLORS[summary.globalColor] || "#6b7280",
            border: `1px solid ${LABEL_COLORS[summary.globalColor] || "#6b7280"}40`,
          }}>
            {summary.globalLabel} — {summary.globalScore}/100
          </div>
        </div>

        {/* Funnel Numbers Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          {[
            { label: "Impresiones", value: fmtNum(summary.impressions), icon: <Globe style={{ width: 14, height: 14 }} />, color: "var(--text-muted)" },
            { label: "Clics Totales", value: fmtNum(summary.totalClicks), icon: <Crosshair style={{ width: 14, height: 14 }} />, color: "var(--cyan)" },
            { label: "Clics en Enlace", value: fmtNum(summary.linkClicks), icon: <Crosshair style={{ width: 14, height: 14 }} />, color: "#3b82f6" },
            { label: config.goalLabel, value: fmtNum(summary.goalResults), icon: <ShieldCheck style={{ width: 14, height: 14 }} />, color: "#10b981" },
            { label: "Clics Desperdiciados", value: `${pct(summary.wastedClicksPct)}`, icon: <TrendingDown style={{ width: 14, height: 14 }} />, color: "#ef4444" },
            { label: "CPA Global", value: fmtMXN(summary.globalCPA), icon: <TrendingDown style={{ width: 14, height: 14 }} />, color: "var(--amber)" },
          ].map((item, i) => (
            <div key={i} style={{
              background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: "12px 14px",
              border: "1px solid rgba(255,255,255,0.04)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ color: item.color }}>{item.icon}</span>
                <span style={labelStyle}>{item.label}</span>
              </div>
              <p style={{ fontSize: 20, fontWeight: 800, color: item.color, fontFamily: "var(--font-display)", lineHeight: 1 }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Funnel progress bar */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4, letterSpacing: "0.1em" }}>
            <span>EMBUDO DE CONFIANZA</span>
            <span>CVR Global: {summary.globalCVR}%</span>
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden", display: "flex" }}>
            <div style={{
              height: "100%", width: `${Math.min(summary.globalCVR, 100)}%`,
              background: `linear-gradient(90deg, #10b981, ${LABEL_COLORS[summary.globalColor] || "#10b981"})`,
              borderRadius: 4, transition: "width 0.8s ease",
              boxShadow: `0 0 12px ${LABEL_COLORS[summary.globalColor] || "#10b981"}60`,
            }} />
          </div>
        </div>
      </div>

      {/* ═══ TOP PERFORMERS ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
        {[
          {
            title: "Top Perfil",
            value: topDemo ? `${GENDER_LABELS[topDemo.gender] || topDemo.gender} ${topDemo.age}` : "N/A",
            sub: topDemo ? `CVR ${topDemo.metrics.cvr}% · Score ${topDemo.metrics.reliabilityScore}` : "",
            icon: <Users style={{ width: 18, height: 18 }} />,
            iconBg: "rgba(59,130,246,0.1)", iconColor: "#3b82f6",
          },
          {
            title: "Top Región",
            value: topRegion?.region || "N/A",
            sub: topRegion ? `CVR ${topRegion.metrics.cvr}% · Score ${topRegion.metrics.reliabilityScore}` : "",
            icon: <MapPin style={{ width: 18, height: 18 }} />,
            iconBg: "rgba(139,92,246,0.1)", iconColor: "#8b5cf6",
          },
          {
            title: "Top Dispositivo",
            value: topDevice?.impression_device || "N/A",
            sub: topDevice ? `CVR ${topDevice.metrics.cvr}% · Score ${topDevice.metrics.reliabilityScore}` : "",
            icon: <Smartphone style={{ width: 18, height: 18 }} />,
            iconBg: "rgba(236,72,153,0.1)", iconColor: "#ec4899",
          },
        ].map((card, i) => (
          <div key={i} style={{
            ...panelStyle,
            display: "flex", alignItems: "center", gap: 14,
            transition: "border-color 0.2s",
          }}>
            <div style={{ padding: 12, background: card.iconBg, borderRadius: 14, color: card.iconColor, flexShrink: 0 }}>
              {card.icon}
            </div>
            <div style={{ overflow: "hidden" }}>
              <p style={labelStyle}>{card.title}</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: "var(--foreground)", textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {card.value}
              </p>
              <p style={{ fontSize: 11, color: "#10b981", fontWeight: 600, marginTop: 2 }}>{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ CHARTS GRID ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Demographics Bar Chart */}
        <div style={panelStyle}>
          <div style={headStyle}>
            <Users style={{ width: 15, height: 15, color: "#6366f1" }} />
            Confiabilidad por Edad y Género
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data.demographics.slice(0, 10).map((d: any) => ({
                  name: `${GENDER_LABELS[d.gender] || d.gender} ${d.age}`,
                  ...d,
                }))}
                margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name" type="category" width={90}
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={false} tickLine={false}
                />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="metrics.reliabilityScore" radius={[0, 6, 6, 0]} barSize={14}>
                  {data.demographics.slice(0, 10).map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.gender === "female" ? "#ec4899" : entry.gender === "male" ? "#3b82f6" : "#8b5cf6"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Pie Chart */}
        <div style={panelStyle}>
          <div style={headStyle}>
            <Smartphone style={{ width: 15, height: 15, color: "#ec4899" }} />
            Confiabilidad por Dispositivo
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.devices.slice(0, 6).map((d: any) => ({ name: d.impression_device, value: d.metrics.reliabilityScore, ...d }))}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={4} dataKey="value" nameKey="name"
                  stroke="none"
                >
                  {data.devices.slice(0, 6).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS_CHART[index % COLORS_CHART.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value: any, name: any, props: any) => {
                    const m = props.payload?.metrics;
                    return [`Score: ${value} · CVR: ${m?.cvr || 0}%`, name];
                  }}
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                />
                <Legend
                  verticalAlign="bottom" height={36}
                  wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ═══ LEAK ZONES (Zonas de Fuga) ═══ */}
      {leakZones?.length > 0 && (
        <div style={{
          ...panelStyle,
          borderColor: "rgba(239,68,68,0.2)",
          background: "linear-gradient(135deg, rgba(239,68,68,0.04), var(--surface))",
        }}>
          <div style={headStyle}>
            <AlertTriangle style={{ width: 15, height: 15, color: "#ef4444" }} />
            <span>Zonas de Fuga</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500, marginLeft: 4 }}>
              — Segmentos con alto clic pero baja conversión
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {leakZones.map((zone: any, i: number) => (
              <div key={i} style={{
                padding: "12px 14px", borderRadius: 10,
                background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>{zone.segment}</p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)" }}>{zone.type}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#ef4444" }}>{zone.cvr}% CVR</p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {fmtNum(zone.linkClicks)} clics → {fmtNum(zone.goalResults)} resultados
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ REGIONS TABLE ═══ */}
      <div style={panelStyle}>
        <div style={headStyle}>
          <MapPin style={{ width: 15, height: 15, color: "#8b5cf6" }} />
          Ranking Regional
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["#", "Región", "Link Clicks", config.goalLabel, "CVR", "Intención", "CPA", "Score", "Confiabilidad"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", color: "var(--text-muted)", fontWeight: 600, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.regions.slice(0, 15).map((r: any, i: number) => {
                const c = LABEL_COLORS[r.metrics.reliabilityColor] || "#6b7280";
                return (
                  <tr key={i} style={{ borderBottom: "1px solid var(--hairline)", transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: i < 3 ? "#6366f1" : "var(--text-muted)" }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--foreground)" }}>{r.region}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{fmtNum(r.metrics.linkClicks)}</td>
                    <td style={{ padding: "10px 12px", color: "#10b981", fontWeight: 600 }}>{fmtNum(r.metrics.goalResults)}</td>
                    <td style={{ padding: "10px 12px", color: r.metrics.cvr >= 15 ? "#10b981" : r.metrics.cvr >= 5 ? "var(--amber)" : "#ef4444", fontWeight: 700 }}>
                      {r.metrics.cvr}%
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{r.metrics.intentionRate}%</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{fmtMXN(r.metrics.cpa)}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 800, color: c }}>{r.metrics.reliabilityScore}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                        background: `${c}15`, color: c, border: `1px solid ${c}30`,
                      }}>
                        {r.metrics.reliabilityLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ PLACEMENTS TABLE ═══ */}
      <div style={panelStyle}>
        <div style={headStyle}>
          <Layers style={{ width: 15, height: 15, color: "#f59e0b" }} />
          Ubicaciones (Placements)
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500, marginLeft: 4 }}>
            — Meta no permite desglose de conversiones por ubicación
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Plataforma", "Ubicación", "Impresiones", "Clics", "CTR", "CPM", "Inversión"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", color: "var(--text-muted)", fontWeight: 600, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.placements.slice(0, 15).map((p: any, i: number) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--hairline)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--foreground)", textTransform: "capitalize" }}>{p.publisher_platform}</td>
                  <td style={{ padding: "10px 12px", color: "var(--text-secondary)", textTransform: "capitalize" }}>{p.platform_position?.replace(/_/g, " ")}</td>
                  <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{fmtNum(p.metrics.impressions)}</td>
                  <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{fmtNum(p.metrics.totalClicks)}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: p.metrics.ctr > 2 ? "#10b981" : p.metrics.ctr > 0.8 ? "var(--amber)" : "#ef4444" }}>
                    {p.metrics.ctr}%
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{fmtMXN(p.metrics.cpm)}</td>
                  <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{fmtMXN(p.metrics.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
