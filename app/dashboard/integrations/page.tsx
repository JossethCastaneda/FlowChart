"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Settings, CheckCircle, XCircle, Loader2, Shield, User,
} from "lucide-react";

/* ─── Official Platform SVG Icons ─── */
const MetaIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

/* InstagramIcon removed — Instagram publishing is managed in /dashboard/publisher */

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const GoogleAdsIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.28 6.28 0 00-.79-.05 6.28 6.28 0 00-6.28 6.28 6.28 6.28 0 006.28 6.28 6.28 6.28 0 006.28-6.28V8.87a8.2 8.2 0 004.78 1.53V7a4.84 4.84 0 01-.96-.31z"/>
  </svg>
);

const GA4Icon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22">
    <path d="M22.84 2.998v17.004a3 3 0 01-2.998 2.998 3 3 0 01-2.998-2.998V2.998A3 3 0 0119.842 0a3 3 0 012.998 2.998z" fill="#F9AB00"/>
    <path d="M12.5 9.002v10.998A3 3 0 019.502 23a3 3 0 01-2.998-2.998V9.002A3 3 0 019.502 6.004a3 3 0 012.998 2.998z" fill="#E37400"/>
    <circle cx="3.498" cy="19.502" r="3.498" fill="#E37400"/>
  </svg>
);

const HubSpotIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
    <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.984v-.066A2.198 2.198 0 0017.235.838h-.066a2.198 2.198 0 00-2.196 2.196v.066c0 .867.51 1.615 1.244 1.97v2.862a5.85 5.85 0 00-2.692 1.308l-7.15-5.558a2.396 2.396 0 00.075-.575A2.41 2.41 0 004.04.697a2.41 2.41 0 00-2.41 2.41 2.41 2.41 0 002.41 2.41c.47 0 .905-.14 1.275-.374l7.03 5.467a5.876 5.876 0 00-.91 3.143c0 1.162.34 2.244.92 3.158l-2.17 2.17a1.932 1.932 0 00-.57-.094 1.974 1.974 0 00-1.974 1.974 1.974 1.974 0 001.974 1.974 1.974 1.974 0 001.974-1.974c0-.2-.032-.39-.087-.572l2.126-2.126a5.882 5.882 0 003.542 1.183c3.254 0 5.892-2.638 5.892-5.892a5.882 5.882 0 00-5.892-5.892 5.86 5.86 0 00-1.74.27zM17.2 17.606a2.82 2.82 0 01-2.823-2.823 2.82 2.82 0 012.823-2.823 2.82 2.82 0 012.823 2.823 2.82 2.82 0 01-2.823 2.823z"/>
  </svg>
);

const AIEngineIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
    <path d="M12 2L1 7l11 5 11-5-11-5zM1 17l11 5 11-5M1 12l11 5 11-5" stroke="white" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Platform config with metadata
// NOTE: meta_social (Facebook/Instagram publishing) is managed in /dashboard/publisher
const PLATFORMS = [
  { provider: "meta_ads", moduleUrl: "ads", name: "Meta Ads Manager", description: "Campaigns, Ad Sets, Pixel CAPI, Audiences", Icon: MetaIcon, gradient: "linear-gradient(135deg, #0064E0, #0081FB)" },
  { provider: "meta_analytics", moduleUrl: "analytics", name: "Meta Analytics Engine", description: "Insights, Organic & Paid Performance", Icon: MetaIcon, gradient: "linear-gradient(135deg, #0064E0, #0081FB)" },
  { provider: "meta_community", moduleUrl: "community", name: "Meta Community Management", description: "Inbox, Listening, Streams", Icon: MetaIcon, gradient: "linear-gradient(135deg, #0064E0, #0081FB)" },
  { provider: "whatsapp", name: "WhatsApp Business", description: "API Cloud, Templates, Webhooks", Icon: WhatsAppIcon, gradient: "linear-gradient(135deg, #075E54, #25D366)" },
  { provider: "google_ads", name: "Google Ads", description: "Search, Display, YouTube, PMax", Icon: GoogleAdsIcon, gradient: "linear-gradient(135deg, #185ABC, #4285F4)" },
  { provider: "tiktok", name: "TikTok Ads", description: "In-Feed, TopView, Spark Ads, Pixel", Icon: TikTokIcon, gradient: "linear-gradient(135deg, #1a1a2e, #000000)" },
  { provider: "ai_engine", name: "AI Engine", description: "Creative generation, Copy, Audience prediction", Icon: AIEngineIcon, gradient: "linear-gradient(135deg, #5B21B6, #7C3AED)" },
  { provider: "ga4", name: "GA4 Analytics", description: "Events, Conversions, Attribution, UTM tracking", Icon: GA4Icon, gradient: "linear-gradient(135deg, #E37400, #F9AB00)" },
  { provider: "hubspot", name: "HubSpot", description: "Email automation, Drip campaigns, CRM sync", Icon: HubSpotIcon, gradient: "linear-gradient(135deg, #FF5C35, #FF7A59)" },
];

interface IntegrationData {
  id: string;
  provider: string;
  connected: boolean;
  connectedAt: string | null;
  connectedBy: { id: string; name: string | null; image: string | null } | null;
  canDisconnect: boolean;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationData[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workspace/integrations")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setIntegrations(res.data);
        if (res.userRole) setUserRole(res.userRole);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleDisconnect(provider: string) {
    if (!confirm("¿Estás seguro de desconectar esta integración?")) return;
    setDisconnecting(provider);
    const res = await fetch("/api/workspace/integrations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    const data = await res.json();
    if (res.ok) {
      setIntegrations((prev) =>
        prev.map((i) =>
          i.provider === provider
            ? { ...i, connected: false, connectedBy: null, connectedAt: null, canDisconnect: false }
            : i
        )
      );
    } else {
      alert(data.error || "Error al desconectar");
    }
    setDisconnecting(null);
  }

  // Merge DB data with platform config
  function getPlatformState(provider: string) {
    return integrations.find((i) => i.provider === provider) || null;
  }

  const connectedCount = PLATFORMS.filter((p) => getPlatformState(p.provider)?.connected).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integraciones & APIs"
        description="Conecta tus ad platforms, CRM, analytics y herramientas de automation. Para publicación social en Facebook e Instagram, ve a Publisher → Integraciones."
        icon={<Settings className="w-6 h-6" style={{ color: "var(--cyan)" }} />}
      />

      {/* Social publishing notice */}
      <div className="glass-panel" style={{ padding: "14px 24px", display: "flex", alignItems: "center", gap: "12px", borderLeft: "2px solid #1877f2", cursor: "pointer" }}
        onClick={() => window.location.href = "/dashboard/publisher"}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        <div>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#60a5fa", margin: 0 }}>Publicación Social (Facebook &amp; Instagram)</p>
          <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.6)", margin: 0 }}>La conexión de canales de publicación se gestiona en <strong style={{ color: "#93c5fd" }}>Publisher → Integraciones</strong> → Haz clic aquí para ir</p>
        </div>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#60a5fa" strokeWidth="2" style={{ marginLeft: "auto", flexShrink: 0 }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>

      {/* Connected count */}
      <div className="glass-panel" style={{ padding: "14px 24px", display: "flex", alignItems: "center", gap: "10px", borderLeft: "2px solid var(--cyan)" }}>
        <CheckCircle className="w-4 h-4" style={{ color: "var(--cyan)" }} />
        <span style={{ fontSize: "12px", color: "#e2e8f0", fontWeight: 500 }}>
          {loading ? "..." : connectedCount} de {PLATFORMS.length} plataformas conectadas
        </span>
        {connectedCount < PLATFORMS.length && (
          <span className="badge badge-amber" style={{ marginLeft: "auto" }}>Setup requerido</span>
        )}
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLATFORMS.map((platform) => {
          const state = getPlatformState(platform.provider);
          const isConnected = state?.connected || false;
          const canDisconnect = state?.canDisconnect || false;
          const connectedByUser = state?.connectedBy;
          const isDisconnecting = disconnecting === platform.provider;

          return (
            <div key={platform.provider} className="glass-panel" style={{ overflow: "hidden" }}>
              {/* Header with brand gradient + official logo */}
              <div style={{
                background: platform.gradient,
                padding: "20px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: "36px", height: "36px",
                    background: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(8px)",
                    borderRadius: "8px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <platform.Icon />
                  </div>
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "white", letterSpacing: "0.05em" }}>{platform.name}</p>
                    <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.6)", letterSpacing: "0.03em", marginTop: "2px" }}>{platform.description}</p>
                  </div>
                </div>
                {isConnected ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#a7f3d0" }} />
                ) : (
                  <XCircle className="w-5 h-5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: "12px 16px" }}>
                {/* Connected by info */}
                {isConnected && connectedByUser && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    marginBottom: "10px", fontSize: "10px",
                    color: "rgba(148,163,184,0.5)",
                  }}>
                    <User style={{ width: 10, height: 10 }} />
                    <span>Conectado por {connectedByUser.name || "Usuario"}</span>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className={`badge ${isConnected ? "badge-emerald" : "badge-muted"}`}>
                    {isConnected ? "Live" : "Offline"}
                  </span>

                  {isConnected ? (
                    canDisconnect ? (
                      <button
                        className="btn-primary"
                        disabled={isDisconnecting}
                        onClick={() => handleDisconnect(platform.provider)}
                        style={{
                          fontSize: "9px", padding: "4px 12px",
                          borderColor: "rgba(255,45,85,0.3)",
                          color: "var(--red)",
                          opacity: isDisconnecting ? 0.5 : 1,
                        }}
                      >
                        {isDisconnecting ? (
                          <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                        ) : "Disconnect"}
                      </button>
                    ) : (
                      <div style={{
                        display: "flex", alignItems: "center", gap: "4px",
                        fontSize: "9px", color: "rgba(148,163,184,0.35)",
                        padding: "4px 8px",
                        border: "1px solid rgba(148,163,184,0.1)",
                      }}>
                        <Shield style={{ width: 10, height: 10 }} />
                        <span>Protegido</span>
                      </div>
                    )
                  ) : (
                    <button
                      className="btn-primary"
                      style={{ fontSize: "9px", padding: "4px 12px" }}
                      onClick={() => {
                        if ((platform as any).moduleUrl) {
                          window.location.href = `/api/connect/${(platform as any).moduleUrl}`;
                        } else {
                          alert("Integración no disponible aún");
                        }
                      }}
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Webhooks section */}
      <div className="glass-panel" style={{ padding: "20px 24px", borderLeft: "2px solid var(--purple)" }}>
        <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "10px", letterSpacing: "0.25em", color: "rgba(148,163,184,0.5)", textTransform: "uppercase", marginBottom: "6px" }}>
          API Keys, Webhooks & OAuth Tokens
        </p>
        <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.3)" }}>
          Gestión avanzada de tokens, callback URLs, CAPI server-side events y configuración de webhooks — próximamente.
        </p>
      </div>
    </div>
  );
}
