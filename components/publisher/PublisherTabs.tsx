"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Calendar, CheckCircle2, Clock, Images, Zap, Users } from "lucide-react";
import { Composer } from "./Composer";
import { ScheduledCalendar } from "./ScheduledCalendar";
import { ApprovalsPanel } from "./ApprovalsPanel";
import { MediaLibrary } from "./MediaLibrary";
import { AssetGroupManager } from "./AssetGroupManager";

const TABS = [
  { key: "composer", label: "Redactor", icon: Zap, color: "var(--fc-warning)" },
  { key: "calendar", label: "Calendario", icon: Calendar, color: "var(--fc-success)" },
  { key: "approvals", label: "Aprobaciones", icon: CheckCircle2, color: "var(--fc-success)" },
  { key: "library", label: "Biblioteca", icon: Images, color: "#bc5fb2" },
  { key: "groups", label: "Grupos", icon: Users, color: "var(--fc-accent)" },
] as const;

export function PublisherTabs() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("composer");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%", minHeight: 0 }}>
      <div
        style={{
          display: "flex",
          gap: 1,
          overflowX: "auto",
          padding: 3,
          borderRadius: 10,
          background: "var(--surface-hover)",
          border: "1px solid var(--hairline)",
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 16px",
                borderRadius: 8,
                background: isActive ? "var(--surface-hover)" : "transparent",
                border: "none",
                color: isActive ? "var(--fc-text)" : "var(--fc-text-muted)",
                fontSize: 12,
                fontWeight: isActive ? 700 : 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                flex: "none",
              }}
            >
              <Icon style={{ width: 14, height: 14, color: isActive ? tab.color : "inherit" }} />
              {tab.label}
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: "20%",
                    right: "20%",
                    height: 2,
                    borderRadius: 1,
                    background: tab.color,
                    boxShadow: `0 0 8px ${tab.color}50`,
                  }}
                />
              )}
            </button>
          );
        })}

        {/* Historial vive en su propia ruta (/dashboard/historial) — enlace de pestaña */}
        <Link
          href="/dashboard/historial"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 16px",
            borderRadius: 8,
            background: "transparent",
            border: "none",
            color: "var(--fc-text-muted)",
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
            whiteSpace: "nowrap",
            flex: "none",
          }}
        >
          <Clock style={{ width: 14, height: 14 }} />
          Historial
        </Link>
      </div>

      <PlannerOverview />

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {activeTab === "composer" && <Composer />}
        {activeTab === "calendar" && <ScheduledCalendar />}
        {activeTab === "approvals" && <ApprovalsPanel />}
        {activeTab === "library" && <MediaLibrary />}
        {activeTab === "groups" && <AssetGroupManager />}
      </div>
    </div>
  );
}
function PlannerOverview() {
  return (
    <div
      className="glass-panel"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: 1,
        overflow: "hidden",
        background: "var(--surface-hover)",
      }}
    >
      {[
        ["Hoy", "Revisa posts listos, aprobaciones y huecos del calendario."],
        ["Mejor horario", "Usa Analytics para elegir ventanas antes de programar."],
        ["Estado Meta", "Valida permisos en Integraciones si falta algun canal."],
      ].map(([title, text]) => (
        <div key={title} style={{ padding: 14, background: "var(--bg-raised)" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--fc-text)" }}>{title}</div>
          <div style={{ marginTop: 5, fontSize: 11, lineHeight: 1.45, color: "var(--fc-text-secondary)" }}>{text}</div>
        </div>
      ))}
    </div>
  );
}
