import { PageHeader } from "@/components/ui/PageHeader";
import { LayoutDashboard } from "lucide-react";

export default function ResumenPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard KPIs"
        description="Métricas clave de rendimiento de tus campañas, canales y audiencias."
        icon={<LayoutDashboard className="w-6 h-6" style={{ color: "var(--cyan)" }} />}
      />

      {/* Row 1: Core Marketing KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card cyan">
          <div className="flex items-center gap-3">
            <div style={{
              width: "36px", height: "36px",
              background: "rgba(0,212,255,0.08)",
              border: "1px solid rgba(0,212,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <div>
              <p className="kpi-value" style={{ color: "var(--cyan)" }}>1,248</p>
              <p className="kpi-label">MQLs Captados Hoy</p>
            </div>
          </div>
        </div>

        <div className="kpi-card emerald">
          <div className="flex items-center gap-3">
            <div style={{
              width: "36px", height: "36px",
              background: "rgba(6,214,160,0.08)",
              border: "1px solid rgba(6,214,160,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06d6a0" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <div>
              <p className="kpi-value" style={{ color: "var(--emerald)" }}>4.2x</p>
              <p className="kpi-label">ROAS Global</p>
            </div>
          </div>
        </div>

        <div className="kpi-card amber">
          <div className="flex items-center gap-3">
            <div style={{
              width: "36px", height: "36px",
              background: "rgba(255,190,11,0.08)",
              border: "1px solid rgba(255,190,11,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffbe0b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8"/><path d="M12 18V6"/></svg>
            </div>
            <div>
              <p className="kpi-value" style={{ color: "var(--amber)" }}>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(0.83)}</p>
              <p className="kpi-label">CPC Promedio</p>
            </div>
          </div>
        </div>

        <div className="kpi-card purple">
          <div className="flex items-center gap-3">
            <div style={{
              width: "36px", height: "36px",
              background: "rgba(123,97,255,0.08)",
              border: "1px solid rgba(123,97,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7b61ff" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <div>
              <p className="kpi-value" style={{ color: "var(--purple)" }}>3.7%</p>
              <p className="kpi-label">CTR Campañas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Secondary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="kpi-card red">
          <div className="flex items-center gap-3">
            <div style={{
              width: "36px", height: "36px",
              background: "rgba(255,45,85,0.08)",
              border: "1px solid rgba(255,45,85,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
            </div>
            <div>
              <p className="kpi-value" style={{ color: "var(--red)" }}>12</p>
              <p className="kpi-label">Campañas Activas</p>
            </div>
          </div>
        </div>

        <div className="kpi-card cyan">
          <div className="flex items-center gap-3">
            <div style={{
              width: "36px", height: "36px",
              background: "rgba(0,212,255,0.08)",
              border: "1px solid rgba(0,212,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
            </div>
            <div>
              <p className="kpi-value" style={{ color: "var(--cyan)" }}>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(12.40)}</p>
              <p className="kpi-label">CAC Promedio</p>
            </div>
          </div>
        </div>

        <div className="kpi-card emerald">
          <div className="flex items-center gap-3">
            <div style={{
              width: "36px", height: "36px",
              background: "rgba(6,214,160,0.08)",
              border: "1px solid rgba(6,214,160,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06d6a0" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div>
              <p className="kpi-value" style={{ color: "var(--emerald)" }}>89.2%</p>
              <p className="kpi-label">Tasa de Conversión</p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics placeholder */}
      <div className="glass-panel" style={{ minHeight: "360px" }}>
        <div className="section-header">
          <span className="section-title">Funnel de Conversión & Attribution</span>
          <span className="badge badge-amber">Próximamente</span>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "280px",
          flexDirection: "column",
          gap: "16px",
        }}>
          <div style={{
            width: "60px", height: "60px",
            border: "1px solid rgba(0,212,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(0,212,255,0.3)" strokeWidth="1.5">
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            <span style={{ position: "absolute", inset: "-6px", border: "1px solid rgba(0,212,255,0.06)" }} />
          </div>
          <p style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "10px",
            letterSpacing: "0.3em",
            color: "rgba(148,163,184,0.3)",
            textTransform: "uppercase",
          }}>
            Módulo en Construcción
          </p>
          <p style={{
            fontSize: "11px",
            color: "rgba(148,163,184,0.2)",
            maxWidth: "380px",
            textAlign: "center",
            lineHeight: 1.6,
          }}>
            Embudos TOFU → MOFU → BOFU, atribución multi-touch, LTV/CAC ratio, y reportes de rendimiento por canal.
          </p>
        </div>
      </div>
    </div>
  );
}
