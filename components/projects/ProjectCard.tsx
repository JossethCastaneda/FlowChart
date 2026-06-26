import React from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye } from "lucide-react";
import { PLATFORMS } from "@/lib/project-constants";
import type { Project } from "@/types/project";

interface ProjectCardProps {
  project: Project;
  menuOpen: string | null;
  setMenuOpen: (id: string | null) => void;
  setMenuPos: (pos: { top: number; right: number }) => void;
}

export function ProjectCard({ project: p, menuOpen, setMenuOpen, setMenuPos }: ProjectCardProps) {
  const router = useRouter();

  const isActive = p.status === "EN VUELO" || p.status === "Activo";
  const isOrbita = p.status === "EN ÓRBITA";
  const isComplete = p.status === "Completado";
  const statusColor = isActive ? "var(--emerald)" : isOrbita ? "var(--amber)" : isComplete ? "var(--cyan)" : "rgba(148,163,184,0.5)";
  const statusBg = isActive ? "rgba(6,214,160,0.07)" : isOrbita ? "rgba(255,190,11,0.07)" : isComplete ? "rgba(0,212,255,0.07)" : "rgba(148,163,184,0.04)";
  const accentBorder = isActive ? "rgba(6,214,160,0.25)" : isOrbita ? "rgba(255,190,11,0.22)" : isComplete ? "rgba(0,212,255,0.22)" : "var(--border)";

  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${accentBorder}`,
        borderRadius: 16,
        overflow: "hidden",
        transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
        cursor: "pointer",
        position: "relative",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px ${accentBorder}`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
      onClick={() => router.push(`/dashboard/proyectos/${p.id}`)}
    >
      {/* Top accent line */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${statusColor}, transparent)` }} />

      {/* Card body */}
      <div style={{ padding: "16px 18px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              {/* Live pulse */}
              {isActive && (
                <span style={{
                  display: "inline-block", width: 7, height: 7, borderRadius: "50%",
                  background: "var(--emerald)", boxShadow: "0 0 8px rgba(6,214,160,0.7)",
                  animation: "status-pulse 2s infinite", flexShrink: 0
                }} />
              )}
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.alias || "Sin nombre"}
              </h3>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
              {[p.client, p.vertical].filter(Boolean).join(" · ") || "Sin cliente"}
            </p>
          </div>

          {/* Status badge */}
          <div style={{
            padding: "4px 10px", borderRadius: 20, fontSize: 9, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            background: statusBg, color: statusColor,
            border: `1px solid ${accentBorder}`, whiteSpace: "nowrap", flexShrink: 0
          }}>
            {p.status}
          </div>
        </div>

        {/* Platform chips */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {p.channels.length === 0 ? (
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>Sin plataformas configuradas</span>
          ) : p.channels.slice(0, 4).map((c, i) => {
            const pl = PLATFORMS.find(x => x.id === c.platformId);
            return (
              <span key={`${c.platformId}-${i}`} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 10, padding: "3px 9px", fontWeight: 700, letterSpacing: "0.04em",
                borderRadius: 4, border: `1px solid ${pl?.color ? pl.color + "44" : "var(--border)"}`,
                color: pl?.color || "var(--text-secondary)",
                background: pl?.color ? pl.color + "11" : "transparent",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: pl?.color || "currentColor", flexShrink: 0 }} />
                {c.platformName}
              </span>
            );
          })}
          {p.channels.length > 4 && (
            <span style={{ fontSize: 9, color: "var(--text-muted)", padding: "3px 7px", border: "1px solid var(--hairline)", borderRadius: 4 }}>+{p.channels.length - 4}</span>
          )}
        </div>

        {/* Footer row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid var(--hairline)" }}>
          <div style={{ display: "flex", gap: 16 }}>
            {p.dateStart && (
              <div>
                <p style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 1 }}>Inicio</p>
                <p style={{ fontSize: 11, color: "var(--foreground)", fontWeight: 600 }}>{p.dateStart}</p>
              </div>
            )}
            {p.channels.length > 0 && p.channels[0].goal && (
              <div>
                <p style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 1 }}>Objetivo</p>
                <p style={{ fontSize: 11, color: "var(--foreground)", fontWeight: 600, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.channels[0].goal}</p>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              onClick={e => {
                e.stopPropagation();
                if (menuOpen === p.id) { setMenuOpen(null); return; }
                const rect = e.currentTarget.getBoundingClientRect();
                const menuHeight = 220;
                let topPos = rect.bottom + 4;
                if (topPos + menuHeight > window.innerHeight) {
                  topPos = Math.max(8, rect.top - menuHeight - 4);
                }
                setMenuPos({ top: topPos, right: window.innerWidth - rect.right });
                setMenuOpen(p.id);
              }}
              style={{
                background: "var(--surface-hover)", border: "1px solid var(--hairline)",
                cursor: "pointer", color: "var(--text-muted)", padding: "5px 7px",
                borderRadius: 6, display: "flex", alignItems: "center"
              }}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); router.push(`/dashboard/proyectos/${p.id}`); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                background: "var(--cyan-dim)", color: "var(--cyan)",
                border: "1px solid rgba(0,212,255,0.25)", cursor: "pointer",
                letterSpacing: "0.05em", transition: "all 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,212,255,0.18)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--cyan-dim)"; }}
            >
              <Eye className="w-3 h-3" />
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
