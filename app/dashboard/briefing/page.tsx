import { PageHeader } from "@/components/ui/PageHeader";
import { Target } from "lucide-react";

export default function BriefingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaign Briefs"
        description="Define el scope, KPIs target, buyer persona, canales y budget de cada campaña."
        icon={<Target className="w-6 h-6" style={{ color: "#ff6b35" }} />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Briefs */}
        <div className="glass-panel">
          <div className="section-header">
            <span className="section-title">Briefs Activos</span>
            <span className="badge badge-cyan">3 Live</span>
          </div>
          <div>
            {[
              { name: "Q3 Product Launch — Paid + Organic", kpi: "Target: 5K MQLs, ROAS 3x", date: "28 May 2026", status: "Review" },
              { name: "Rebranding IG — Awareness Campaign", kpi: "Target: 1M Reach, CPM < $4", date: "25 May 2026", status: "Draft" },
              { name: "Black Friday — Full Funnel TOFU→BOFU", kpi: "Target: 200 SQLs, CAC < $20", date: "20 May 2026", status: "Approved" },
            ].map((brief, i) => (
              <div key={i} className="data-row">
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "#e2e8f0" }}>{brief.name}</p>
                  <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.4)", marginTop: "2px" }}>{brief.kpi}</p>
                  <p style={{ fontSize: "10px", color: "rgba(148,163,184,0.25)", marginTop: "2px" }}>{brief.date}</p>
                </div>
                <span className={`badge ${
                  brief.status === "Approved" ? "badge-emerald" :
                  brief.status === "Review" ? "badge-amber" : "badge-muted"
                }`}>{brief.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Create */}
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "48px 32px", minHeight: "240px" }}>
          <Target className="w-12 h-12 mb-4" style={{ color: "var(--cyan)", opacity: 0.4 }} />
          <p style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.2em",
            color: "white",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}>
            Nuevo Brief
          </p>
          <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.3)", maxWidth: "260px", lineHeight: 1.6, marginBottom: "20px" }}>
            Buyer persona, presupuesto, canales, CTAs, KPIs target y timeline del go-to-market.
          </p>
          <button className="btn-primary">+ Crear Brief</button>
        </div>
      </div>

      {/* Template Library */}
      <div className="glass-panel">
        <div className="section-header">
          <span className="section-title">Plantillas de Brief</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0">
          {[
            { name: "Performance Ads", desc: "Meta Ads, Google Ads — Objetivos ROAS y CPA" },
            { name: "Brand Awareness", desc: "Reach, Impressions, CPM — Branding top of mind" },
            { name: "Lead Gen Funnel", desc: "MQL→SQL→Opp — Nurturing + Retargeting" },
          ].map((tpl, i) => (
            <div key={i} className="data-row" style={{ borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>{tpl.name}</p>
                <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.35)", marginTop: "4px" }}>{tpl.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
