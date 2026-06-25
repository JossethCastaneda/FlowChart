"use client";

import { useState } from "react";
import { BarChart2, Settings2 } from "lucide-react";
import { AdvancedAnalyticsDashboard } from "./AdvancedAnalyticsDashboard";
import { ProjectAnalyticsConfigPanel } from "./ProjectAnalyticsConfigPanel";

// Envoltura cliente que añade la pestaña "Configuración" (goal §10) junto al
// dashboard acotado al proyecto, sin duplicar el dashboard ni su motor de KPIs.

interface Props {
  projectId: string;
  clientId: string | null;
  availableChannels: string[];
  availableProviders: string[];
}

export function ProjectAnalyticsView({ projectId, clientId, availableChannels, availableProviders }: Props) {
  const [tab, setTab] = useState<"dashboard" | "config">("dashboard");

  const tabBtn = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    fontSize: 13,
    borderRadius: 8,
    cursor: "pointer",
    border: "1px solid",
    borderColor: active ? "rgba(0,212,255,0.5)" : "rgba(148,163,184,0.2)",
    background: active ? "rgba(0,212,255,0.1)" : "transparent",
    color: active ? "var(--cyan)" : "var(--text-secondary)",
  });

  return (
    <div className="space-y-4">
      <div style={{ display: "flex", gap: 8 }}>
        <button style={tabBtn(tab === "dashboard")} onClick={() => setTab("dashboard")}>
          <BarChart2 className="w-4 h-4" /> Dashboard
        </button>
        <button style={tabBtn(tab === "config")} onClick={() => setTab("config")}>
          <Settings2 className="w-4 h-4" /> Configuración
        </button>
      </div>

      {tab === "dashboard" ? (
        <AdvancedAnalyticsDashboard
          projectId={projectId}
          clientId={clientId}
          availableChannels={availableChannels}
          availableProviders={availableProviders}
        />
      ) : (
        <ProjectAnalyticsConfigPanel projectId={projectId} />
      )}
    </div>
  );
}
