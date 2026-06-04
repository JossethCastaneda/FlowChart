"use client";

import React, { useState, useEffect } from "react";
import { Composer } from "./Composer";
import { ScheduledCalendar } from "./ScheduledCalendar";
import { InboxLayout } from "@/components/inbox/InboxLayout";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { ListeningDashboard } from "@/components/listening/ListeningDashboard";
import { StreamsDashboard } from "@/components/streams/StreamsDashboard";
import { IntegrationsPanel } from "./IntegrationsPanel";
import {
  Plug,
  MessageSquare,
  BarChart3,
  Zap,
  Calendar,
  Ear,
  Columns3,
} from "lucide-react";

const TABS = [
  { key: "composer",     label: "Redactor",      icon: Zap,           color: "#ffbe0b" },
  { key: "calendar",     label: "Calendario",    icon: Calendar,      color: "#06d6a0" },
  { key: "inbox",        label: "Inbox",         icon: MessageSquare, color: "#a855f7" },
  { key: "analytics",    label: "Analytics",     icon: BarChart3,     color: "#f472b6" },
  { key: "listening",    label: "Listening",     icon: Ear,           color: "#fb923c" },
  { key: "streams",      label: "Streams",       icon: Columns3,      color: "#22d3ee" },
  { key: "integrations", label: "Integraciones", icon: Plug,          color: "#00d4ff" },
];

/* ═══════════════════════════════════════════════════════════
   PUBLISHER TABS (MAIN EXPORT)
   ═══════════════════════════════════════════════════════════ */

export function PublisherTabs() {
  const [activeTab, setActiveTab] = useState("composer");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) setActiveTab("integrations");
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%", minHeight: 0 }}>
      {/* ── Tab Navigation ───────────────────────────────── */}
      <div style={{
        display: "flex", gap: 1, overflowX: "auto",
        padding: 3, borderRadius: 10,
        background: "rgba(255,255,255,0.015)",
        border: "1px solid rgba(255,255,255,0.035)",
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                position: "relative",
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 16px", borderRadius: 8,
                background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                border: "none",
                color: isActive ? "white" : "#4a5568",
                fontSize: 12, fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                flex: "none",
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.025)";
                  e.currentTarget.style.color = "#94a3b8";
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#4a5568";
                }
              }}
            >
              <Icon style={{
                width: 14, height: 14,
                color: isActive ? tab.color : "inherit",
                transition: "color 0.2s",
              }} />
              {tab.label}
              {/* Active indicator line */}
              {isActive && (
                <div style={{
                  position: "absolute", bottom: 0, left: "20%", right: "20%",
                  height: 2, borderRadius: 1,
                  background: tab.color,
                  boxShadow: `0 0 8px ${tab.color}50`,
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ──────────────────────────────────── */}
      {activeTab === "inbox" ? (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <InboxLayout />
        </div>
      ) : (
        <div>
          {activeTab === "composer" && <Composer />}
          {activeTab === "calendar" && <ScheduledCalendar />}
          {activeTab === "analytics" && <AnalyticsDashboard />}
          {activeTab === "listening" && <ListeningDashboard />}
          {activeTab === "streams" && <StreamsDashboard />}
          {activeTab === "integrations" && <IntegrationsPanel />}
        </div>
      )}
    </div>
  );
}
