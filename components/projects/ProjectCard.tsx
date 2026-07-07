import React from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, ExternalLink, Calendar } from "lucide-react";
import { PLATFORMS } from "@/lib/project-constants";
import type { Project } from "@/types/project";
import { useInsightsStore } from "@/stores/insightsStore";
import { getPlatformIcon } from "@/components/ui/AppIcons";

interface ProjectCardProps {
  project: Project;
  menuOpen: string | null;
  setMenuOpen: (id: string | null) => void;
  setMenuPos: (pos: { top: number; right: number }) => void;
}

const parseBudget = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
}

export function ProjectCard({ project: p, menuOpen, setMenuOpen, setMenuPos }: ProjectCardProps) {
  const router = useRouter();
  const store = useInsightsStore();

  /* ── Status styles ── */
  const isActive   = p.status === "EN VUELO" || p.status === "Activo";
  const isOrbita   = p.status === "EN ÓRBITA";
  const isComplete = p.status === "Completado";
  const accentColor = isActive ? "var(--emerald)" : isOrbita ? "var(--amber)" : isComplete ? "var(--cyan)" : "rgba(148,163,184,0.4)";
  const statusDotClass = isActive ? "status-dot-emerald" : isOrbita ? "status-dot-amber" : isComplete ? "status-dot-cyan" : "status-dot-muted";

  /* ── Budget ── */
  const totalBudget = p.channels.reduce((acc, c) => acc + parseBudget(c.budget), 0);

  /* ── Cached insights ── */
  const metaCh = p.channels.find(c => c.platformId === "meta" || c.platformId === "facebook");
  const cached = metaCh?.adAccounts?.length ? store.getCached(p.id, "this_month") : null;

  /* Sum spend + results across timeSeries */
  let spend: number | null = null;
  let results: number | null = null;
  if (cached?.timeSeries?.length) {
    spend = 0;
    results = 0;
    for (const day of cached.timeSeries) {
      spend += parseFloat(day.spend || "0");
      if (day.actions?.length) {
        // Sum first action value found (same goal-aware logic as project detail page)
        const a = day.actions?.[0];
        if (a) results += parseInt(a.value || "0", 10);
      }
    }
  }
  const cpr = (spend != null && spend > 0 && results != null && results > 0) ? spend / results : null;

  /* ── Budget progress (spend vs total) ── */
  const spendPct = (spend != null && totalBudget > 0) ? Math.min((spend / totalBudget) * 100, 100) : null;
  const isOver   = spend != null && totalBudget > 0 && spend > totalBudget;

  /* ── Date range ── */
  const dateStr = [p.dateStart, p.dateEnd].filter(Boolean).join(" – ");

  return (
    <div
      className="project-card"
      onClick={() => router.push(`/dashboard/proyectos/${p.id}`)}
    >
      {/* Left accent bar (status color) */}
      <div
        className="project-card-accent"
        style={{ background: accentColor }}
      />

      {/* Top gradient line */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accentColor}88, transparent)`, marginLeft: 3 }} />

      {/* Card body */}
      <div className="project-card-body">
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
              {isActive && (
                <span
                  className={`status-dot ${statusDotClass}`}
                  style={{ animation: "status-pulse 2s infinite" }}
                />
              )}
              <h3 style={{
                fontSize: 14, fontWeight: 700, color: "var(--foreground)",
                lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                letterSpacing: "-0.01em",
              }}>
                {p.alias || "Sin nombre"}
              </h3>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {[p.client, p.vertical].filter(Boolean).join(" · ") || "Sin cliente"}
            </p>
          </div>

          {/* Status badge */}
          <div style={{
            padding: "3px 9px", borderRadius: 6, fontSize: 9, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            background: isActive ? "rgba(52,183,124,0.09)" : isOrbita ? "rgba(224,168,60,0.09)" : isComplete ? "rgba(59,130,246,0.09)" : "rgba(148,163,184,0.06)",
            color: accentColor,
            border: `1px solid ${accentColor}44`,
            whiteSpace: "nowrap", flexShrink: 0,
          }}>
            {p.status}
          </div>
        </div>

        {/* Platform chips */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 0 }}>
          {p.channels.length === 0 ? (
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>Sin plataformas</span>
          ) : p.channels.slice(0, 3).map((c, i) => {
            const pl = PLATFORMS.find(x => x.id === c.platformId);
            const isMeta = c.platformId === "meta" || c.platformId === "facebook";
            const isExpired = isMeta && cached?._error === "expired_token";
            const IconComponent = getPlatformIcon(c.platformId);
            
            return (
              <span key={`${c.platformId}-${i}`} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 10, padding: "2px 8px", fontWeight: 600, letterSpacing: "0.03em",
                borderRadius: 5, 
                border: `1px solid ${isExpired ? "rgba(224,168,60,0.3)" : (pl?.color ? pl.color + "33" : "var(--hairline)")}`,
                color: isExpired ? "var(--amber)" : (pl?.color || "var(--text-secondary)"),
                background: isExpired ? "rgba(224,168,60,0.06)" : (pl?.color ? pl.color + "0d" : "transparent"),
              }} title={isExpired ? "El token de acceso ha expirado o ha sido invalidado por Facebook. Reconecta la cuenta en Integraciones." : undefined}>
                {IconComponent ? (
                  <IconComponent size={10} style={{ flexShrink: 0, color: isExpired ? "var(--amber)" : "currentColor" }} />
                ) : (
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: isExpired ? "var(--amber)" : (pl?.color || "currentColor"), flexShrink: 0 }} />
                )}
                {c.platformName}
                {isExpired && <span style={{ fontSize: 9, marginLeft: 2 }} role="img" aria-label="warning">⚠️</span>}
              </span>
            );
          })}

          {p.channels.length > 3 && (
            <span style={{ fontSize: 9, color: "var(--text-muted)", padding: "2px 6px", border: "1px solid var(--hairline)", borderRadius: 4 }}>
              +{p.channels.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Metrics row */}
      <div className="project-card-metrics">
        <div className="project-card-metric">
          <div className="project-card-metric-value">
            {spend != null ? fmtCurrency(spend) : totalBudget > 0 ? fmtCurrency(totalBudget) : "—"}
          </div>
          <div className="project-card-metric-label">{spend != null ? "Inversión" : "Presupuesto"}</div>
        </div>
        <div className="project-card-metric">
          <div className="project-card-metric-value">
            {cpr != null ? fmtCurrency(cpr) : "—"}
          </div>
          <div className="project-card-metric-label">{p.channels[0]?.goal ? (p.channels[0].goal.includes("Lead") ? "CPL" : p.channels[0].goal.includes("Conv") ? "CPR" : "CPA") : "CPR"}</div>
        </div>
        <div className="project-card-metric">
          <div className="project-card-metric-value">
            {results != null ? results.toLocaleString("es-MX") : "—"}
          </div>
          <div className="project-card-metric-label">Resultados</div>
        </div>
      </div>

      {/* Footer: budget bar + date + actions */}
      <div className="project-card-footer">
        {/* Budget progress bar */}
        {totalBudget > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Presupuesto
              </span>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10, color: isOver ? "var(--amber)" : "var(--text-secondary)",
              }}>
                {spendPct != null ? `${spendPct.toFixed(0)}%` : `${fmtCurrency(totalBudget)}`}
              </span>
            </div>
            <div className="progress-track">
              <div
                className={`progress-bar${isOver ? " over-budget" : ""}`}
                style={{ width: `${spendPct ?? 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Date + actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          {dateStr ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, overflow: "hidden" }}>
              <Calendar style={{ width: 11, height: 11, color: "var(--text-muted)", flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {dateStr}
              </span>
            </div>
          ) : <div />}

          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            {/* More options */}
            <button
              onClick={e => {
                e.stopPropagation();
                if (menuOpen === p.id) { setMenuOpen(null); return; }
                const rect = e.currentTarget.getBoundingClientRect();
                const menuHeight = 220;
                let topPos = rect.bottom + 4;
                if (topPos + menuHeight > window.innerHeight) topPos = Math.max(8, rect.top - menuHeight - 4);
                setMenuPos({ top: topPos, right: window.innerWidth - rect.right });
                setMenuOpen(p.id);
              }}
              style={{
                background: "var(--surface)", border: "1px solid var(--hairline)",
                cursor: "pointer", color: "var(--text-muted)", padding: "5px 7px",
                borderRadius: 7, display: "flex", alignItems: "center",
              }}
            >
              <MoreHorizontal style={{ width: 14, height: 14 }} />
            </button>

            {/* Dashboard CTA */}
            <button
              onClick={e => { e.stopPropagation(); router.push(`/dashboard/proyectos/${p.id}`); }}
              className="btn-ghost"
              style={{ fontSize: 11, padding: "5px 12px", borderRadius: 7, fontWeight: 700 }}
            >
              <ExternalLink style={{ width: 11, height: 11 }} />
              Ver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
