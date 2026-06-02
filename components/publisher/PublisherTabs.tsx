"use client";

import React, { useState, useEffect } from "react";
import { Composer } from "./Composer";
import { ScheduledCalendar } from "./ScheduledCalendar";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  Link2,
  Shield,
} from "lucide-react";

/* ── Connection Status ─────────────────────────────────── */
interface MetaStatus {
  connected: boolean;
  tokenValid: boolean;
  expiresAt: string | null;
  expiringWarning: string | null;
  scopes: string[];
  missingScopes?: string[];
  pages: number;
  igAccounts: number;
  connectedAt: string | null;
}

function ConnectionBanner() {
  const [status, setStatus] = useState<MetaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/meta/connection-status");
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch { /* silent */ }
      setLoading(false);
    };
    fetchStatus();
  }, []);

  if (loading) return null;
  if (!status) return null;

  // Determine banner state
  const isGood = status.connected && status.tokenValid && !status.missingScopes?.length;
  const isWarning = status.connected && status.tokenValid && (status.expiringWarning || status.missingScopes?.length);
  const isError = !status.connected || !status.tokenValid;

  const bannerColor = isError
    ? { bg: "rgba(226,68,92,0.08)", border: "rgba(226,68,92,0.2)", text: "#e2445c" }
    : isWarning
    ? { bg: "rgba(253,171,61,0.08)", border: "rgba(253,171,61,0.2)", text: "#fdab3d" }
    : { bg: "rgba(0,200,117,0.06)", border: "rgba(0,200,117,0.15)", text: "#00c875" };

  const Icon = isError ? XCircle : isWarning ? AlertTriangle : CheckCircle;

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: expanded ? 10 : 0,
        padding: "10px 16px",
        borderRadius: 8,
        background: bannerColor.bg,
        border: `1px solid ${bannerColor.border}`,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon style={{ width: 16, height: 16, color: bannerColor.text, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: bannerColor.text, flex: 1 }}>
          {isError
            ? "Meta no conectado — reconecta tu cuenta en Integraciones para publicar"
            : isWarning
            ? status.expiringWarning || `Faltan permisos: ${status.missingScopes?.join(", ")}`
            : `Meta conectado — ${status.pages} página(s), ${status.igAccounts} cuenta(s) IG`}
        </span>
        <span style={{ fontSize: 10, color: "#64748b" }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", paddingTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#94a3b8" }}>
            <Link2 style={{ width: 12, height: 12 }} />
            Token: {status.tokenValid ? (
              <span style={{ color: "#00c875" }}>Válido</span>
            ) : (
              <span style={{ color: "#e2445c" }}>Inválido</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#94a3b8" }}>
            <Shield style={{ width: 12, height: 12 }} />
            Permisos: {status.scopes?.length || 0} concedidos
          </div>
          {status.expiresAt && (
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              Expira: {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(status.expiresAt))}
            </div>
          )}
          {status.connectedAt && (
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              Conectado: {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(status.connectedAt))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PUBLISHER TABS
   ══════════════════════════════════════════════════════════ */
export function PublisherTabs() {
  const [activeTab, setActiveTab] = useState("composer");

  return (
    <div className="space-y-4">
      {/* Connection status banner */}
      <ConnectionBanner />

      {/* Tabs Navigation */}
      <div className="flex space-x-1 glass-panel p-1 w-fit">
        <button
          onClick={() => setActiveTab("composer")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
            activeTab === "composer"
              ? "bg-white/10 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          Redactor
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
            activeTab === "calendar"
              ? "bg-white/10 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          Calendario Programado
        </button>
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-300">
        {activeTab === "composer" ? <Composer /> : <ScheduledCalendar />}
      </div>
    </div>
  );
}
