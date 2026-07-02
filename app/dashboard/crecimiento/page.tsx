"use client";
import { useState, useEffect } from "react";
import { BrainCircuit, Target, TrendingUp, Users, Sparkles, AlertTriangle } from "lucide-react";
import Link from "next/link";

/* ── KPI Card inline — sin dependencia de componente shadcn ── */
function KpiRow({ label, value, icon, context }: { label: string; value: string; icon: React.ReactNode; context: string }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
      padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, borderRadius: "0 12px 0 60px", background: "var(--purple-dim)", opacity: 0.8 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--purple-dim)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--purple)" }}>
          {icon}
        </div>
      </div>
      <p style={{ fontSize: 24, fontWeight: 800, color: "var(--foreground)", margin: 0, fontVariantNumeric: "tabular-nums" }}>{value}</p>
      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{context}</p>
    </div>
  );
}

export default function CrecimientoInsights() {
  const [stats, setStats] = useState({
    modelsCount: 0,
    totalLeadsAnalizados: 0,
    highIntentLeads: 0,
    lift: "0x"
  });
  const [insights, setInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    fetch("/api/crecimiento/summary")
      .then(res => res.json())
      .then(data => {
        if (data?.success && data.data) {
          setStats(data.data);
          if (data.data.modelsCount > 0) {
            setLoadingInsights(true);
            fetch("/api/crecimiento/insights")
              .then(res => res.json())
              .then(resData => {
                if (resData?.success) setInsights(resData.data);
              })
              .catch(console.error)
              .finally(() => setLoadingInsights(false));
          }
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }} className="page-enter">

      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 16, borderBottom: "1px solid var(--hairline)" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--purple-dim)", border: "1px solid rgba(123,97,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BrainCircuit style={{ width: 18, height: 18, color: "var(--purple)" }} />
        </div>
        <div>
          <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.08em", margin: 0 }}>
            Aria <span style={{ color: "var(--purple)" }}>IA</span>
          </h1>
          <p style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.06em", margin: 0, marginTop: 2, textTransform: "uppercase" }}>Métricas globales · Modelos predictivos</p>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KpiRow label="Leads Analizados"    value={stats.totalLeadsAnalizados.toString()} icon={<Users style={{ width: 14, height: 14 }} />}        context="+0% esta semana" />
        <KpiRow label="Modelos Entrenados"  value={stats.modelsCount.toString()}           icon={<BrainCircuit style={{ width: 14, height: 14 }} />}  context="MVP Version" />
        <KpiRow label="Alta Intención"      value={stats.highIntentLeads.toString()}       icon={<Target style={{ width: 14, height: 14 }} />}        context="0% conversión est." />
        <KpiRow label="Lift Predictivo"     value={stats.lift}                             icon={<TrendingUp style={{ width: 14, height: 14 }} />}    context="Mejora vs manual" />
      </div>

      {/* ── Main Content ── */}
      {stats.modelsCount === 0 ? (
        /* Empty State */
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "52px 24px", gap: 16, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--purple-dim)", border: "1px solid rgba(123,97,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BrainCircuit style={{ width: 26, height: 26, color: "var(--purple)" }} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: "0 0 8px" }}>Bienvenido a Aria Predictive IA</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 420, margin: "0 auto 20px", lineHeight: 1.6 }}>
              No tienes modelos entrenados. Dirígete a <strong style={{ color: "var(--foreground)" }}>Data Hub</strong> para subir tu primer CSV con leads históricos, o crea un <strong style={{ color: "var(--foreground)" }}>Proyecto nuevo</strong> para auto-generar modelos.
            </p>
          </div>
        </div>
      ) : (
        /* Active State */
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--purple)", animation: "pulse 2s ease-in-out infinite" }} />
            <Target style={{ width: 18, height: 18, color: "var(--purple)" }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>¡Aria está optimizando tu embudo!</h3>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px", lineHeight: 1.6 }}>
            Tienes <strong style={{ color: "var(--foreground)" }}>{stats.modelsCount}</strong> modelos predictivos en operación analizando <strong style={{ color: "var(--foreground)" }}>{stats.totalLeadsAnalizados}</strong> prospectos.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link href="/dashboard/crecimiento/scores" style={{
              padding: "9px 20px", background: "var(--purple-dim)", border: "1px solid rgba(123,97,255,0.3)",
              color: "var(--purple)", borderRadius: 10, fontWeight: 700, fontSize: 12,
              letterSpacing: "0.06em", textTransform: "uppercase", textDecoration: "none",
            }}>
              Ver Leads Priorizados
            </Link>
            <Link href="/dashboard/crecimiento/studio" style={{
              padding: "9px 20px", background: "var(--surface-hover)", border: "1px solid var(--border)",
              color: "var(--foreground)", borderRadius: 10, fontWeight: 600, fontSize: 12,
              textDecoration: "none",
            }}>
              Predictive Studio
            </Link>
          </div>

          {/* Loading insights */}
          {loadingInsights && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--hairline)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--purple)", display: "inline-block", animation: "pulse 1.5s ease-in-out infinite" }} />
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Generando insights accionables con Aria IA...</p>
            </div>
          )}

          {/* Insights panel */}
          {insights && !loadingInsights && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--hairline)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Sparkles style={{ width: 15, height: 15, color: "var(--purple)" }} />
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Recomendaciones de Aria Copilot</h4>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "var(--surface-hover)", padding: 16, borderRadius: 10, border: "1px solid var(--border)" }}>
                  <h5 style={{ fontWeight: 700, fontSize: 11, marginBottom: 8, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Análisis Actual</h5>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.6 }}>{insights.analysis}</p>
                </div>
                <div style={{ background: "var(--surface-hover)", padding: 16, borderRadius: 10, border: "1px solid var(--border)" }}>
                  <h5 style={{ fontWeight: 700, fontSize: 11, marginBottom: 8, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Recomendación Estratégica</h5>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.6 }}>{insights.recommendation}</p>
                </div>
              </div>
              {insights.anomalies && insights.anomalies.length > 0 && (
                <div style={{ marginTop: 12, background: "var(--amber-dim)", padding: 14, borderRadius: 10, border: "1px solid rgba(255,190,11,0.25)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <AlertTriangle style={{ width: 13, height: 13, color: "var(--amber)" }} />
                    <h5 style={{ fontWeight: 700, fontSize: 11, color: "var(--amber)", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Anomalías Detectadas</h5>
                  </div>
                  <ul style={{ paddingLeft: 16, margin: 0 }}>
                    {insights.anomalies.map((a: string, i: number) => (
                      <li key={i} style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, lineHeight: 1.5 }}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
