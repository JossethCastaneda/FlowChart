"use client";

import React, { useState, useEffect } from "react";
import { Plug, Check, Loader2, ExternalLink } from "lucide-react";

/**
 * Module connection configuration.
 * Each module maps to a Meta Login config_id with specific permissions.
 */
const MODULE_CONFIG: Record<string, { label: string; color: string; description: string; permissions: string[] }> = {
  social: {
    label: "Social Channels",
    color: "#06d6a0",
    description: "Publicar y gestionar contenido en Facebook e Instagram",
    permissions: ["instagram_content_publish", "pages_manage_posts", "instagram_manage_comments"],
  },
  ads: {
    label: "Meta Ads Manager",
    color: "#7b61ff",
    description: "Gestionar campañas publicitarias y presupuestos",
    permissions: ["ads_management", "ads_read", "leads_retrieval"],
  },
  analytics: {
    label: "Analytics Engine",
    color: "#f472b6",
    description: "Acceso a métricas, insights y datos de audiencia",
    permissions: ["read_insights", "instagram_manage_insights", "pages_read_engagement"],
  },
  community: {
    label: "Community Management",
    color: "#a855f7",
    description: "Inbox, mensajes, menciones y monitoreo social",
    permissions: ["pages_messaging", "instagram_manage_messages", "read_page_mailboxes", "instagram_manage_comments"],
  },
};

interface ConnectModuleBannerProps {
  module: "social" | "ads" | "analytics" | "community";
  onConnected?: () => void;
}

/**
 * Banner component that checks if a module is connected.
 * If not, shows a connect button that initiates the OAuth flow.
 * If connected, shows a green "Conectado" badge.
 */
export function ConnectModuleBanner({ module, onConnected }: ConnectModuleBannerProps) {
  const [status, setStatus] = useState<"loading" | "connected" | "disconnected">("loading");
  const [pages, setPages] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/connect/status")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.modules?.[module]?.connected) {
          setStatus("connected");
          setPages(data.modules[module].pages || []);
          onConnected?.();
        } else {
          setStatus("disconnected");
        }
      })
      .catch(() => setStatus("disconnected"));
  }, [module]);

  // Check URL params for recently connected
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === module) {
      setStatus("connected");
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      onConnected?.();
    }
  }, [module]);

  const config = MODULE_CONFIG[module];
  if (!config) return null;

  if (status === "loading") {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
        borderRadius: 8, background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <Loader2 style={{ width: 14, height: 14, color: "#64748b", animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 12, color: "#64748b" }}>Verificando conexión...</span>
      </div>
    );
  }

  if (status === "connected") {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
        borderRadius: 8, background: `${config.color}08`,
        border: `1px solid ${config.color}20`,
      }}>
        <Check style={{ width: 14, height: 14, color: config.color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: config.color, fontWeight: 500 }}>
          {config.label} conectado
        </span>
        {pages.length > 0 && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>
            · {pages.length} {pages.length === 1 ? "página" : "páginas"}
          </span>
        )}
        <button
          onClick={() => window.location.href = `/api/connect/${module}`}
          style={{
            marginLeft: "auto", padding: "4px 10px", borderRadius: 6,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#94a3b8", fontSize: 11, cursor: "pointer",
          }}
        >
          Reconectar
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
      borderRadius: 10, background: `${config.color}08`,
      border: `1px solid ${config.color}20`,
    }}>
      <Plug style={{ width: 18, height: 18, color: config.color, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "white", marginBottom: 2 }}>
          Conectar {config.label}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
          {config.description}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          {config.permissions.map(p => (
            <span key={p} style={{
              fontSize: 9, padding: "2px 6px", borderRadius: 4,
              background: "rgba(255,255,255,0.05)", color: "#94a3b8",
              fontFamily: "monospace",
            }}>
              {p}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={() => window.location.href = `/api/connect/${module}`}
        style={{
          padding: "10px 18px", borderRadius: 8,
          background: config.color, color: "#0a0a1a",
          fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          transition: "opacity 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
      >
        <ExternalLink style={{ width: 14, height: 14 }} />
        Conectar con Meta
      </button>
    </div>
  );
}
