"use client";

import React, { useState, useEffect } from "react";
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  ArrowLeft, Calendar, DollarSign, Target, Eye, TrendingUp, TrendingDown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  BarChart2, Activity, Filter, Zap, Link, MapPin, Users, CheckCircle, RefreshCw
} from "lucide-react";
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  ComposedChart, Line, PieChart, Pie, Cell, Legend, BarChart, Bar, ReferenceLine
} from "recharts";
import { ChartTheme } from "@/components/ui/charts/ChartTheme";

const panelStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 18,
};
const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 5 };
const headingStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.03em", marginBottom: 4 };
const subStyle: React.CSSProperties = { fontSize: 11, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 };

const fmtMXN = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat('es-MX').format(n);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
function KpiBox({ title, value, sub, icon, color, progress }: any) {
  const c = color.startsWith("#") ? color : `var(--${color})`;
  return (
    <div
      className={`kpi-card ${color.startsWith("#") ? "" : color}`}
      style={{ paddingBottom: progress !== undefined ? 18 : 20, position: "relative" }}
    >
      <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: 100, background: `radial-gradient(circle, ${c}10 0%, transparent 70%)`, transform: "translate(30%, -30%)", pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <div style={{ padding: "6px", background: `${c}14`, border: `1px solid ${c}28`, borderRadius: 9, color: c, display: "flex" }}>{icon}</div>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>{title}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", marginBottom: 3, fontFamily: "var(--font-display)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{sub}</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function GoogleAdsDashboard({ project, dateStart, dateEnd, preset }: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Placeholder endpoints that we'll implement later
        const [adsRes, ga4Res] = await Promise.all([
          fetch(`/api/projects/${project.id}/google/ads?preset=${preset}&start=${dateStart}&end=${dateEnd}`).then(r => r.json()).catch(() => ({ data: null })),
          fetch(`/api/projects/${project.id}/google/analytics?preset=${preset}&start=${dateStart}&end=${dateEnd}`).then(r => r.json()).catch(() => ({ data: null }))
        ]);

        setData({
          ads: adsRes?.data || { spend: 0, impressions: 0, clicks: 0, cpc: 0 },
          ga4: ga4Res?.data || { sessions: 0, bounceRate: 0, conversions: 0 }
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (project?.id) {
      fetchData();
    }
  }, [project, dateStart, dateEnd, preset]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.04)", borderTopColor: "var(--cyan)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" }}>Sincronizando Google Ecosystem...</span>
      </div>
    );
  }

  const ads = data?.ads || { spend: 0, impressions: 0, clicks: 0, cpc: 0 };
  const ga4 = data?.ga4 || { sessions: 0, bounceRate: 0, conversions: 0 };
  
  const cpl = ga4.conversions > 0 ? ads.spend / ga4.conversions : 0;

  return (
    <div className="space-y-4 page-enter">
      <svg style={{ width: 0, height: 0, position: "absolute" }}><ChartTheme /></svg>
      
      {/* ── KPI HEADER ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiBox title="Inversión Ads" value={fmtMXN(ads.spend)} sub="Total invertido" icon={<DollarSign size={16} />} color="var(--amber)" />
        <KpiBox title="Tráfico (GA4)" value={fmtNum(ga4.sessions)} sub={`Clics Ads: ${fmtNum(ads.clicks)}`} icon={<Eye size={16} />} color="var(--cyan)" />
        <KpiBox title="Conversiones" value={fmtNum(ga4.conversions)} sub={`Tasa: ${(ga4.sessions > 0 ? (ga4.conversions / ga4.sessions) * 100 : 0).toFixed(2)}%`} icon={<Target size={16} />} color="var(--emerald)" />
        <KpiBox title="Costo x Conv." value={fmtMXN(cpl)} sub={`CPC: ${fmtMXN(ads.cpc)}`} icon={<TrendingUp size={16} />} color="var(--purple)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── FUNNEL ── */}
        <div className="lg:col-span-1" style={panelStyle}>
          <h3 style={headingStyle}>Funnel de Conversión</h3>
          <p style={subStyle}>De Google Ads a Google Analytics 4</p>
          
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Step 1: Ads */}
            <div style={{ background: "var(--surface)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 8, padding: 16, position: "relative" }}>
              <p style={{ ...labelStyle, color: "var(--amber)" }}>Google Ads</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: "var(--foreground)" }}>{fmtNum(ads.impressions)}</span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Impresiones</span>
              </div>
            </div>
            
            <div style={{ width: 2, height: 20, background: "var(--surface-hover)", margin: "0 auto" }} />
            
            {/* Step 2: Clicks */}
            <div style={{ background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 8, padding: 16, position: "relative" }}>
              <p style={{ ...labelStyle, color: "var(--cyan)" }}>Tráfico Pagado</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: "var(--foreground)" }}>{fmtNum(ads.clicks)}</span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Clics (CTR: {ads.impressions > 0 ? ((ads.clicks / ads.impressions) * 100).toFixed(1) : 0}%)</span>
              </div>
            </div>
            
            <div style={{ width: 2, height: 20, background: "var(--surface-hover)", margin: "0 auto" }} />
            
            {/* Step 3: Landing (GA4) */}
            <div style={{ background: "var(--surface)", border: "1px solid rgba(0,200,117,0.15)", borderRadius: 8, padding: 16, position: "relative" }}>
              <p style={{ ...labelStyle, color: "var(--emerald)" }}>Google Analytics 4</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: "var(--foreground)" }}>{fmtNum(ga4.sessions)}</span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Sesiones CPC</span>
              </div>
            </div>
            
            <div style={{ width: 2, height: 20, background: "var(--surface-hover)", margin: "0 auto" }} />
            
            {/* Step 4: Conversions (GA4) */}
            <div style={{ background: "var(--surface)", border: "1px solid rgba(188,95,178,0.15)", borderRadius: 8, padding: 16, position: "relative" }}>
              <p style={{ ...labelStyle, color: "var(--purple)" }}>Resultados</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: "var(--foreground)" }}>{fmtNum(ga4.conversions)}</span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Eventos clave (GA4)</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* ── TIME SERIES ── */}
        <div className="lg:col-span-2" style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h3 style={headingStyle}>Rendimiento en el tiempo</h3>
              <p style={subStyle}>Clics vs Conversiones vs Gasto</p>
            </div>
          </div>
          <div style={{ height: 350, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border)", borderRadius: 8 }}>
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Gráfica en construcción (Pendiente de endpoints de API)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
