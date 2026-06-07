"use client";

import React, { useState } from "react";
import { Calendar, CheckCircle2, Images, Plug, Zap } from "lucide-react";
import { Composer } from "./Composer";
import { ScheduledCalendar } from "./ScheduledCalendar";
import { IntegrationsPanel } from "./IntegrationsPanel";

const TABS = [
  { key: "composer", label: "Redactor", icon: Zap, color: "#ffbe0b" },
  { key: "calendar", label: "Calendario", icon: Calendar, color: "#06d6a0" },
  { key: "approvals", label: "Aprobaciones", icon: CheckCircle2, color: "#22c55e" },
  { key: "library", label: "Biblioteca", icon: Images, color: "#f472b6" },
  { key: "integrations", label: "Integraciones", icon: Plug, color: "#00d4ff" },
] as const;

export function PublisherTabs() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>(() => {
    if (typeof window === "undefined") return "composer";
    const params = new URLSearchParams(window.location.search);
    return params.get("connected") ? "integrations" : "composer";
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%", minHeight: 0 }}>
      <div
        style={{
          display: "flex",
          gap: 1,
          overflowX: "auto",
          padding: 3,
          borderRadius: 10,
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.06)",
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
                background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                border: "none",
                color: isActive ? "white" : "#64748b",
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
      </div>

      <PlannerOverview />

      <div>
        {activeTab === "composer" && <Composer />}
        {activeTab === "calendar" && <ScheduledCalendar />}
        {activeTab === "approvals" && (
          <PlannerPlaceholder
            title="Aprobaciones editoriales"
            description="Centraliza drafts, revisiones de cliente y aprobaciones internas antes de publicar."
            items={["Pendientes de cliente", "Cambios solicitados", "Listos para programar"]}
          />
        )}
        {activeTab === "library" && (
          <PlannerPlaceholder
            title="Biblioteca de medios"
            description="Organiza assets por cliente, formato, campana y canal para reutilizar contenido sin buscar archivos sueltos."
            items={["Imagenes y videos", "Hashtags y captions guardados", "Formatos por canal"]}
          />
        )}
        {activeTab === "integrations" && <IntegrationsPanel />}
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
        background: "rgba(255,255,255,0.06)",
      }}
    >
      {[
        ["Hoy", "Revisa posts listos, aprobaciones y huecos del calendario."],
        ["Mejor horario", "Usa Analytics para elegir ventanas antes de programar."],
        ["Estado Meta", "Valida permisos en Integraciones si falta algun canal."],
      ].map(([title, text]) => (
        <div key={title} style={{ padding: 14, background: "rgba(5,8,18,0.96)" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#f8fafc" }}>{title}</div>
          <div style={{ marginTop: 5, fontSize: 11, lineHeight: 1.45, color: "#94a3b8" }}>{text}</div>
        </div>
      ))}
    </div>
  );
}

function PlannerPlaceholder({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="glass-panel" style={{ padding: 28 }}>
      <h2 style={{ margin: 0, color: "#f8fafc", fontSize: 18, fontWeight: 800 }}>{title}</h2>
      <p style={{ margin: "8px 0 18px", color: "#94a3b8", fontSize: 13, lineHeight: 1.55, maxWidth: 680 }}>
        {description}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {items.map((item) => (
          <div
            key={item}
            style={{
              padding: 12,
              borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#cbd5e1",
              fontSize: 12,
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
