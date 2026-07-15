"use client";

import React, { useState, useEffect } from "react";
import { FileText, TrendingUp, TrendingDown, BarChart2, Eye, MousePointer, DollarSign, Target, Loader2, AlertCircle } from "lucide-react";
import type { ReportSnapshot, ReportSettings, ReportKPI, ReportTimeSeries, ReportCreative, ReportPacing } from "@/lib/reportes/generator";
import { useParams } from "next/navigation";

const fmtMXN = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtMXN0 = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return d; }
};

function PacingBar({ label, current, total, pct, color }: { label: string; current: string; total: string; pct: number; color: string }) {
  const barColor = pct >= 90 && pct <= 110 ? "var(--emerald)" : pct > 110 ? "var(--red)" : pct >= 60 ? "var(--amber)" : "var(--red)";
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground)" }}>
          {current} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>/ {total}</span>
        </span>
      </div>
      <div style={{ height: 6, background: "var(--surface-hover)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, borderRadius: 3, background: barColor, transition: "width 0.8s ease" }} />
      </div>
      <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4, textAlign: "right" }}>{pct.toFixed(1)}% del objetivo</p>
    </div>
  );
}

export default function PublicReportPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<{ title: string; dateFrom: string; dateTo: string; data: ReportSnapshot; settings: ReportSettings; project: any; createdAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/reportes/public/${slug}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError(json.error || "Reporte no disponible");
      })
      .catch(() => setError("Error al cargar el reporte"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", gap: 16 }}>
        <Loader2 style={{ width: 24, height: 24, color: "var(--cyan)", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}>CARGANDO REPORTE...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", gap: 16 }}>
        <AlertCircle style={{ width: 32, height: 32, color: "var(--red)" }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Reporte no disponible</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{error || "Este reporte no existe o ha expirado."}</p>
      </div>
    );
  }

  const snapshot = data.data;
  const settings = (data.settings || {}) as ReportSettings;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 16px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* ── Report Header ── */}
        <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid var(--hairline)" }}>
          {settings.logoUrl && (
            <img src={settings.logoUrl} alt="Logo" style={{ height: 36, marginBottom: 16, objectFit: "contain" }} />
          )}
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)", margin: "0 0 8px", lineHeight: 1.3 }}>
            {data.title}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: "var(--text-secondary)" }}>
            <span>{snapshot.projectAlias || snapshot.projectName}</span>
            {snapshot.client && <span>· {snapshot.client}</span>}
            <span>· {fmtDate(data.dateFrom)} — {fmtDate(data.dateTo)}</span>
          </div>
        </div>

        {/* ── KPIs Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 28 }}>
          {snapshot.kpis.map((kpi, i) => (
            <div key={i} style={{
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
              padding: "16px 14px", textAlign: "center",
            }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 8px" }}>
                {kpi.label}
              </p>
              <p style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground)", margin: 0, fontVariantNumeric: "tabular-nums" }}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Pacing ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 28 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 20px", display: "flex", alignItems: "center", gap: 8 }}>
            <Target style={{ width: 14, height: 14 }} /> Pacing del Mes
          </h2>
          <PacingBar
            label="Resultados"
            current={snapshot.pacing.resultsToDate.toLocaleString("es-MX")}
            total={Math.round(snapshot.pacing.goalToDate).toLocaleString("es-MX")}
            pct={snapshot.pacing.resultsPct}
            color="var(--cyan)"
          />
          <PacingBar
            label="Inversión"
            current={fmtMXN0(snapshot.pacing.spendToDate)}
            total={fmtMXN0(snapshot.pacing.budgetToDate)}
            pct={snapshot.pacing.spendPct}
            color="var(--purple)"
          />
        </div>

        {/* ── Time Series (simple table, no chart library needed) ── */}
        {snapshot.timeSeries.length > 0 && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 28, overflow: "auto" }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <BarChart2 style={{ width: 14, height: 14 }} /> Rendimiento Diario
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--hairline)" }}>
                  {["Fecha", "Inversión", "Resultados", "CPR", "Impresiones", "Clics"].map((h) => (
                    <th key={h} style={{ padding: "8px 6px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshot.timeSeries.slice(-14).map((d, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--hairline)" }}>
                    <td style={{ padding: "8px 6px", color: "var(--text-secondary)" }}>{d.date ? new Date(d.date).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "—"}</td>
                    <td style={{ padding: "8px 6px", color: "var(--foreground)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmtMXN(d.spend)}</td>
                    <td style={{ padding: "8px 6px", color: "var(--foreground)", fontWeight: 600 }}>{d.results.toLocaleString("es-MX")}</td>
                    <td style={{ padding: "8px 6px", color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}>{d.cpr > 0 ? fmtMXN(d.cpr) : "—"}</td>
                    <td style={{ padding: "8px 6px", color: "var(--text-secondary)" }}>{d.impressions.toLocaleString("es-MX")}</td>
                    <td style={{ padding: "8px 6px", color: "var(--text-secondary)" }}>{d.clicks.toLocaleString("es-MX")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Top Creatives ── */}
        {snapshot.topCreatives.length > 0 && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 28 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <Eye style={{ width: 14, height: 14 }} /> Top Creativos
            </h2>
            <div style={{ display: "grid", gap: 10 }}>
              {snapshot.topCreatives.map((c, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "12px 14px",
                  background: "var(--surface-hover)", border: "1px solid var(--hairline)", borderRadius: 10,
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--purple-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "var(--purple)" }}>{i + 1}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 8, color: "var(--text-muted)", margin: 0, textTransform: "uppercase" }}>Resultados</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{c.results.toLocaleString("es-MX")}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 8, color: "var(--text-muted)", margin: 0, textTransform: "uppercase" }}>CPR</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{c.cpr > 0 ? fmtMXN(c.cpr) : "—"}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 8, color: "var(--text-muted)", margin: 0, textTransform: "uppercase" }}>CTR</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{c.ctr > 0 ? `${c.ctr.toFixed(2)}%` : "—"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Insights ── */}
        {snapshot.insights && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 28 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, color: "var(--purple)", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 12px" }}>
              ✦ Insights IA
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
              {snapshot.insights}
            </p>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ textAlign: "center", padding: "24px 0 16px", borderTop: "1px solid var(--hairline)" }}>
          {settings.footerText && (
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 8px" }}>{settings.footerText}</p>
          )}
          <p style={{ fontSize: 9, color: "var(--text-muted)", margin: 0, opacity: 0.5 }}>
            Generado el {fmtDate(snapshot.generatedAt)}
            {!settings.hideWatermark && " · Powered by Zefirus"}
          </p>
        </div>
      </div>
    </div>
  );
}
