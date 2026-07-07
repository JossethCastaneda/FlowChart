"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, TrendingUp, Eye, MousePointerClick, DollarSign, Zap, RefreshCw, ExternalLink, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useLanguage } from "@/components/layout/LanguageContext";

// TikTok brand colors
const TK_CYAN = "#69C9D0";
const TK_RED  = "#EE1D52";

const TikTokIcon = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="white">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.28 6.28 0 00-.79-.05 6.28 6.28 0 00-6.28 6.28 6.28 6.28 0 006.28 6.28 6.28 6.28 0 006.28-6.28V8.87a8.2 8.2 0 004.78 1.53V7a4.84 4.84 0 01-.96-.31z"/>
  </svg>
);

interface TikTokStatus {
  connected: boolean;
  connectedAt: string | null;
  connectedBy: { name: string | null } | null;
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: "20px 22px",
      borderRadius: 14,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${color}14`,
        border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 2px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
        <p style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground)", margin: 0, fontFamily: "var(--font-display)" }}>{value}</p>
      </div>
    </div>
  );
}

export default function TikTokIntegrationPage() {
  const { lang } = useLanguage();
  const [status, setStatus] = useState<TikTokStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/integrations");
      const json = await res.json();
      const integrations: Array<{ provider: string; connected: boolean; connectedAt: string | null; connectedBy: { name: string | null } | null }> = json?.data?.data ?? [];
      const tiktok = integrations.find(i => i.provider === "tiktok_ads");
      setStatus(tiktok ? { connected: tiktok.connected, connectedAt: tiktok.connectedAt, connectedBy: tiktok.connectedBy } : { connected: false, connectedAt: null, connectedBy: null });
    } catch {
      setStatus({ connected: false, connectedAt: null, connectedBy: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const handleDisconnect = async () => {
    if (!confirm(lang === "es" ? "¿Desconectar TikTok Ads?" : "Disconnect TikTok Ads?")) return;
    setDisconnecting(true);
    await fetch("/api/workspace/integrations?provider=tiktok_ads", { method: "DELETE" });
    await loadStatus();
    setDisconnecting(false);
  };

  const handleConnect = () => {
    window.location.href = "/api/oauth/tiktok_ads/start";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title="TikTok Ads"
        description={lang === "es" ? "Gestiona campañas In-Feed, TopView y Spark Ads directamente desde Sodare." : "Manage In-Feed, TopView and Spark Ads campaigns directly from Sodare."}
        icon={<TikTokIcon size={20} />}
      />

      {/* Back */}
      <Link href="/dashboard/integrations" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>
        <ArrowLeft size={14} />
        {lang === "es" ? "Volver a Integraciones" : "Back to Integrations"}
      </Link>

      {/* Status card */}
      <div style={{
        padding: "28px 32px",
        borderRadius: 18,
        background: "var(--surface)",
        border: `1px solid ${status?.connected ? "rgba(105,201,208,0.25)" : "rgba(255,255,255,0.08)"}`,
        
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Top gradient bar */}
        {status?.connected && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${TK_CYAN},${TK_RED},transparent)` }} />
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          {/* Left side: icon + info */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18, flexShrink: 0,
              background: "linear-gradient(135deg,#010101,#69C9D0,#EE1D52)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 30px rgba(105,201,208,0.3)`,
            }}>
              <TikTokIcon size={32} />
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: "0 0 4px" }}>
                TikTok Ads
              </h2>
              {loading ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                  {lang === "es" ? "Verificando estado..." : "Checking status..."}
                </p>
              ) : status?.connected ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: TK_CYAN, boxShadow: `0 0 8px ${TK_CYAN}` }} />
                  <p style={{ fontSize: 13, color: TK_CYAN, fontWeight: 700, margin: 0 }}>
                    {lang === "es" ? "Conectado" : "Connected"}
                    {status.connectedAt && (
                      <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: 6 }}>
                        · {new Date(status.connectedAt).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={14} style={{ color: "var(--text-muted)" }} />
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                    {lang === "es" ? "No conectado" : "Not connected"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={loadStatus}
              style={{ padding: "9px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--surface-hover)", border: "1px solid var(--hairline)", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}
            >
              <RefreshCw size={12} />
              {lang === "es" ? "Refrescar" : "Refresh"}
            </button>
            {status?.connected ? (
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                style={{ padding: "9px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "var(--red-dim)", border: "1px solid rgba(229,72,77,0.2)", color: "var(--red)", cursor: "pointer", fontFamily: "inherit", opacity: disconnecting ? 0.6 : 1 }}
              >
                {disconnecting ? "..." : (lang === "es" ? "Desconectar" : "Disconnect")}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                style={{ padding: "9px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: `linear-gradient(135deg,${TK_CYAN},${TK_RED})`, border: "none", color: "var(--foreground)", cursor: "pointer", fontFamily: "inherit", boxShadow: `0 4px 14px rgba(105,201,208,0.4)`, display: "flex", alignItems: "center", gap: 6 }}
              >
                <Zap size={12} />
                {lang === "es" ? "Conectar TikTok Ads" : "Connect TikTok Ads"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats preview (mock — will show real data once API is implemented) */}
      {status?.connected && (
        <>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "8px 0 0" }}>
            {lang === "es" ? "Resumen de rendimiento" : "Performance Summary"}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            <StatCard icon={DollarSign} label={lang === "es" ? "Gasto total" : "Total Spend"} value="—" color={TK_CYAN} />
            <StatCard icon={Eye} label={lang === "es" ? "Impresiones" : "Impressions"} value="—" color={TK_RED} />
            <StatCard icon={MousePointerClick} label="CTR" value="—" color="var(--amber)" />
            <StatCard icon={TrendingUp} label="ROAS" value="—" color="var(--emerald)" />
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
            <AlertCircle size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            {lang === "es"
              ? "Los datos de campañas estarán disponibles una vez que la integración sea aprobada por TikTok."
              : "Campaign data will be available once the integration is approved by TikTok."}
          </p>
        </>
      )}

      {/* How it works */}
      <div style={{
        padding: "24px 28px",
        borderRadius: 14,
        background: "var(--surface)",
        border: "1px solid var(--hairline)",
      }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, color: TK_CYAN, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 16px" }}>
          {lang === "es" ? "¿Cómo funciona?" : "How does it work?"}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { step: "01", text: lang === "es" ? "Haz clic en \"Conectar TikTok Ads\" para abrir la autorización oficial de TikTok for Business." : "Click \"Connect TikTok Ads\" to open TikTok for Business official authorization." },
            { step: "02", text: lang === "es" ? "Acepta los permisos de acceso a tu cuenta publicitaria." : "Accept the permissions to access your ad account." },
            { step: "03", text: lang === "es" ? "Serás redirigido de vuelta a Sodare con la integración activa." : "You'll be redirected back to Sodare with the integration active." },
            { step: "04", text: lang === "es" ? "Sodare sincronizará métricas de campañas In-Feed, TopView y Spark Ads." : "Sodare will sync metrics for In-Feed, TopView and Spark Ads campaigns." },
          ].map(({ step, text }) => (
            <div key={step} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 800, fontFamily: "var(--font-display)", color: TK_CYAN, background: `${TK_CYAN}14`, border: `1px solid ${TK_CYAN}25`, borderRadius: 6, padding: "3px 8px", flexShrink: 0 }}>
                {step}
              </span>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>{text}</p>
            </div>
          ))}
        </div>

        {/* TikTok docs link */}
        <a
          href="https://business-api.tiktok.com/portal/docs"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 20, fontSize: 12, color: TK_CYAN, textDecoration: "none" }}
        >
          <ExternalLink size={12} />
          {lang === "es" ? "Ver documentación de TikTok for Business" : "View TikTok for Business documentation"}
        </a>
      </div>
    </div>
  );
}
