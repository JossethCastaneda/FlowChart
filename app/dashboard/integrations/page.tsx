"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Settings, CheckCircle, XCircle, Loader2, ChevronRight, Zap, BarChart2, Users, Megaphone } from "lucide-react";
import { openConnectPopup } from "@/lib/connect-popup";

/* ─── Icons ─── */
const MetaIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.28 6.28 0 00-.79-.05 6.28 6.28 0 00-6.28 6.28 6.28 6.28 0 006.28 6.28 6.28 6.28 0 006.28-6.28V8.87a8.2 8.2 0 004.78 1.53V7a4.84 4.84 0 01-.96-.31z"/>
  </svg>
);
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
const HubSpotIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
    <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.984v-.066A2.198 2.198 0 0017.235.838h-.066a2.198 2.198 0 00-2.196 2.196v.066c0 .867.51 1.615 1.244 1.97v2.862a5.85 5.85 0 00-2.692 1.308l-7.15-5.558a2.396 2.396 0 00.075-.575A2.41 2.41 0 004.04.697a2.41 2.41 0 00-2.41 2.41 2.41 2.41 0 002.41 2.41c.47 0 .905-.14 1.275-.374l7.03 5.467a5.876 5.876 0 00-.91 3.143c0 1.162.34 2.244.92 3.158l-2.17 2.17a1.932 1.932 0 00-.57-.094 1.974 1.974 0 00-1.974 1.974 1.974 1.974 0 001.974 1.974 1.974 1.974 0 001.974-1.974c0-.2-.032-.39-.087-.572l2.126-2.126a5.882 5.882 0 003.542 1.183c3.254 0 5.892-2.638 5.892-5.892a5.882 5.882 0 00-5.892-5.892 5.86 5.86 0 00-1.74.27zM17.2 17.606a2.82 2.82 0 01-2.823-2.823 2.82 2.82 0 012.823-2.823 2.82 2.82 0 012.823 2.823 2.82 2.82 0 01-2.823 2.823z"/>
  </svg>
);
const GA4Icon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path d="M22.84 2.998v17.004a3 3 0 01-2.998 2.998 3 3 0 01-2.998-2.998V2.998A3 3 0 0119.842 0a3 3 0 012.998 2.998z" fill="#F9AB00"/>
    <path d="M12.5 9.002v10.998A3 3 0 019.502 23a3 3 0 01-2.998-2.998V9.002A3 3 0 019.502 6.004a3 3 0 012.998 2.998z" fill="#E37400"/>
    <circle cx="3.498" cy="19.502" r="3.498" fill="#E37400"/>
  </svg>
);

/* ─── Platform groups ─── */
const GROUPS = [
  {
    label: "Meta",
    icon: <Megaphone size={13} />,
    color: "#0081FB",
    platforms: [
      { provider: "meta_ads", moduleUrl: "ads", name: "Ads Manager", description: "Campañas, audiencias y presupuestos", Icon: MetaIcon, iconBg: "#0064E0" },
      { provider: "meta_analytics", moduleUrl: "analytics", name: "Analytics Engine", description: "Insights orgánicos y de pago", Icon: MetaIcon, iconBg: "#0064E0" },
      { provider: "meta_community", moduleUrl: "community", name: "Community Management", description: "Inbox, Listening y Streams", Icon: MetaIcon, iconBg: "#0064E0" },
    ],
  },
  {
    label: "Google",
    icon: <BarChart2 size={13} />,
    color: "#4285F4",
    platforms: [
      { provider: "google_ads", name: "Google Ads", description: "Search, Display, YouTube, PMax", Icon: GoogleIcon, iconBg: "#185ABC" },
      { provider: "ga4", name: "GA4 Analytics", description: "Eventos, conversiones y atribución", Icon: GA4Icon, iconBg: "#E37400" },
    ],
  },
  {
    label: "Canales",
    icon: <Zap size={13} />,
    color: "#A855F7",
    platforms: [
      { provider: "tiktok", name: "TikTok Ads", description: "In-Feed, TopView, Spark Ads", Icon: TikTokIcon, iconBg: "#161722" },
      { provider: "whatsapp", name: "WhatsApp Business", description: "API Cloud, plantillas y webhooks", Icon: WhatsAppIcon, iconBg: "#075E54" },
    ],
  },
  {
    label: "CRM & AI",
    icon: <Users size={13} />,
    color: "#10B981",
    platforms: [
      { provider: "hubspot", name: "HubSpot", description: "Email automation y CRM sync", Icon: HubSpotIcon, iconBg: "#FF5C35" },
      { provider: "ai_engine", name: "AI Engine", description: "Copy, creativos y predicción", Icon: () => <Zap size={18} />, iconBg: "#5B21B6" },
    ],
  },
];

interface IntegrationData {
  id: string;
  provider: string;
  connected: boolean;
  connectedAt: string | null;
  connectedBy: { id: string; name: string | null } | null;
  canDisconnect: boolean;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const loadIntegrations = useCallback(() => {
    setLoading(true);
    fetch("/api/workspace/integrations")
      .then(r => r.json())
      .then(res => {
        if (res.data) setIntegrations(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  const getState = (provider: string) =>
    integrations.find(i => i.provider === provider) || null;

  const totalConnected = GROUPS.flatMap(g => g.platforms).filter(p => getState(p.provider)?.connected).length;
  const totalPlatforms = GROUPS.flatMap(g => g.platforms).length;

  async function handleDisconnect(provider: string) {
    if (!confirm("¿Desconectar esta integración?")) return;
    setDisconnecting(provider);
    await fetch("/api/workspace/integrations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    setIntegrations(prev =>
      prev.map(i => i.provider === provider
        ? { ...i, connected: false, connectedBy: null, connectedAt: null, canDisconnect: false }
        : i
      )
    );
    setDisconnecting(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title="Integraciones"
        description="Conecta tus plataformas de publicidad, analytics y automatización."
        icon={<Settings size={20} style={{ color: "var(--cyan)" }} />}
      />

      {/* Publisher notice */}
      <button
        onClick={() => window.location.href = "/dashboard/publisher"}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 20px", borderRadius: 10, border: "1px solid rgba(24,119,242,0.2)",
          background: "rgba(24,119,242,0.06)", cursor: "pointer", textAlign: "left",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(24,119,242,0.1)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(24,119,242,0.06)")}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#1877f2" style={{ flexShrink: 0 }}>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#60a5fa", margin: 0 }}>Publicación social (Facebook e Instagram)</p>
          <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Se gestiona desde Publisher → Ir ahora</p>
        </div>
        <ChevronRight size={14} style={{ color: "#60a5fa", flexShrink: 0 }} />
      </button>

      {/* Summary bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "10px 20px", borderRadius: 8,
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
      }}>
        {loading ? (
          <Loader2 size={14} style={{ color: "#64748b", animation: "spin 1s linear infinite" }} />
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: totalConnected > 0 ? "#10b981" : "#475569",
                boxShadow: totalConnected > 0 ? "0 0 6px #10b98160" : "none",
              }} />
              <span style={{ fontSize: 12, color: "#94a3b8" }}>
                <strong style={{ color: "#e2e8f0" }}>{totalConnected}</strong> de {totalPlatforms} conectadas
              </span>
            </div>
            <div style={{ height: 16, width: 1, background: "rgba(255,255,255,0.08)" }} />
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{
                width: `${(totalConnected / totalPlatforms) * 100}%`,
                height: "100%", borderRadius: 2,
                background: "linear-gradient(90deg, #0081FB, #00d4ff)",
                transition: "width 0.5s ease",
              }} />
            </div>
          </>
        )}
      </div>

      {/* Integration groups */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {GROUPS.map(group => (
          <div key={group.label} className="glass-panel" style={{ overflow: "hidden" }}>
            {/* Group header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.09)",
              background: "rgba(255,255,255,0.03)",
            }}>
              <span style={{ color: group.color }}>{group.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {group.label}
              </span>
              <span style={{ fontSize: 10, color: "#475569", marginLeft: "auto" }}>
                {group.platforms.filter(p => getState(p.provider)?.connected).length}/{group.platforms.length} activas
              </span>
            </div>

            {/* Platform rows */}
            {group.platforms.map((platform, idx) => {
              const state = getState(platform.provider);
              const isConnected = state?.connected || false;
              const canDisconnect = state?.canDisconnect || false;
              const isDisconnecting = disconnecting === platform.provider;
              const connectedAt = state?.connectedAt
                ? new Date(state.connectedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
                : null;

              return (
                <div
                  key={platform.provider}
                  style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "14px 20px",
                    borderBottom: idx < group.platforms.length - 1 ? "1px solid rgba(255,255,255,0.09)" : "none",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Platform icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: platform.iconBg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white",
                  }}>
                    <platform.Icon />
                  </div>

                  {/* Name + description */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", margin: 0 }}>{platform.name}</p>
                    <p style={{ fontSize: 11, color: "#475569", margin: 0, marginTop: 1 }}>{platform.description}</p>
                  </div>

                  {/* Connected date */}
                  {isConnected && connectedAt && (
                    <span style={{ fontSize: 10, color: "#334155", whiteSpace: "nowrap", flexShrink: 0 }}>
                      Desde {connectedAt}
                    </span>
                  )}

                  {/* Status dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: loading ? "#334155" : isConnected ? "#10b981" : "#334155",
                    boxShadow: isConnected ? "0 0 6px #10b98160" : "none",
                  }} />

                  {/* Action */}
                  {loading ? (
                    <div style={{ width: 70, height: 28 }} />
                  ) : isConnected ? (
                    canDisconnect ? (
                      <button
                        disabled={isDisconnecting}
                        onClick={() => handleDisconnect(platform.provider)}
                        style={{
                          padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                          color: "#f87171", cursor: isDisconnecting ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                          transition: "all 0.15s",
                        }}
                      >
                        {isDisconnecting
                          ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                          : <XCircle size={11} />
                        }
                        Desconectar
                      </button>
                    ) : (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                        padding: "5px 12px", borderRadius: 6, fontSize: 11,
                        background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)",
                        color: "#10b981",
                      }}>
                        <CheckCircle size={11} />
                        Activo
                      </div>
                    )
                  ) : (
                    <button
                      onClick={() => {
                        if ((platform as any).moduleUrl) {
                          openConnectPopup((platform as any).moduleUrl, () => loadIntegrations());
                        } else {
                          alert("Próximamente");
                        }
                      }}
                      style={{
                        padding: "5px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)",
                        color: "#00d4ff", cursor: "pointer", flexShrink: 0,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,212,255,0.15)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,212,255,0.08)")}
                    >
                      Conectar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p style={{ fontSize: 11, color: "#334155", textAlign: "center", paddingBottom: 8 }}>
        API Keys, webhooks y configuración avanzada — próximamente
      </p>
    </div>
  );
}
