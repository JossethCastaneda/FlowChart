"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Settings, Loader2, RefreshCw, Plug, MessageSquare, Database,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { openConnectPopup } from "@/lib/connect-popup";
import { CustomCrmModal } from "@/components/integrations/CustomCrmModal";
import { CariConnectModal } from "@/components/integrations/CariConnectModal";
import { useLanguage } from "@/components/layout/LanguageContext";
import {
  MetaIcon,
  MessengerIcon,
  InstagramIcon,
  WhatsAppIcon,
  GoogleAdsIcon,
  GA4Icon,
  GTMIcon,
  TelegramIcon,
  TikTokAdsIcon,
  LinkedInIcon,
  XIcon,
  HubSpotIcon,
  BotmakerIcon,
  CariAIIcon
} from "@/components/ui/AppIcons";
interface IntegrationData {
  id: string;
  provider: string;
  connected: boolean;
  connectedAt: string | null;
  connectedBy: { id: string; name: string | null } | null;
  canDisconnect: boolean;
  pages?: { id: string; name: string; picture?: string | null }[];
}

// ─── Token Modal (BotMaker / Cari token entry) ────────────────────────────────
function TokenModal({ provider, label, isConnected, onClose, onSuccess, onDisconnect }: {
  provider: string; label: string; isConnected?: boolean; onClose: () => void; onSuccess: () => void; onDisconnect?: () => void;
}) {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (!token.trim()) return;
    setSaving(true);
    setError(null);
    try {
      // El backend (ConnectSchema) espera { provider, token } — NO credentials.accessToken
      // (eso devolvía 422). Para Botmaker valida el token (channels>0) antes de guardar.
      const res = await fetch("/api/workspace/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, token: token.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        onSuccess();
      } else {
        setError(json.error || `No se pudo conectar (HTTP ${res.status}).`);
      }
    } catch {
      setError("Error de red al conectar.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--overlay-dark)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 400, borderRadius: 14, background: "var(--background)", border: "1px solid var(--hairline)", padding: 24 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: "0 0 6px" }}>Conectar {label}</p>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 16px" }}>Ingresa el token de acceso de tu cuenta</p>
        <input
          value={token} onChange={(e) => setToken(e.target.value)}
          placeholder="Token de acceso..."
          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 12, background: "var(--surface-hover)", border: "1px solid var(--hairline)", color: "var(--foreground)", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
        />
        {error && (
          <p style={{ fontSize: 11, color: "var(--red)", margin: "10px 0 0", lineHeight: 1.4 }}>{error}</p>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {isConnected && onDisconnect ? (
            <button onClick={onDisconnect} style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 12, background: "rgba(229,72,77,0.1)", border: "1px solid rgba(229,72,77,0.2)", color: "var(--red)", cursor: "pointer", fontFamily: "inherit" }}>Desconectar</button>
          ) : (
            <button onClick={onClose} style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 12, background: "transparent", border: "1px solid var(--hairline)", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          )}
          <button onClick={save} disabled={!token.trim() || saving} style={{ flex: 2, padding: "9px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", color: "var(--cyan)", cursor: !token.trim() || saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit", opacity: !token.trim() || saving ? 0.6 : 1 }}>
            {saving && <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />}
            Guardar y conectar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Channel definition ───────────────────────────────────────────────────────
interface ChannelDef {
  provider: string;
  name: string;
  description: string;
  Icon: any;
  iconBg: string;
  iconLight?: boolean;   // use dark shadow + white bg (for multicolor logos)
  badges?: { label: string; color: string }[];
  comingSoon?: boolean;
  managePage?: string;
}

// ─── ALL CHANNELS flat list ───────────────────────────────────────────────────
const ALL_CHANNELS: ChannelDef[] = [
  // Meta
  {
    provider: "meta_ads",
    name: "Meta Ads",
    description: "Campañas publicitarias, audiencias y presupuestos en Meta.",
    Icon: MetaIcon, iconBg: "#0081FB",
    badges: [{ label: "ADS", color: "var(--cyan)" }],
    managePage: "/dashboard/integrations/meta-ads",
  },
  {
    provider: "meta_community",
    name: "Facebook Pages",
    description: "Gestiona páginas, publicaciones y comentarios de Facebook.",
    Icon: MetaIcon, iconBg: "#2563eb",
    badges: [{ label: "PÁGINAS", color: "var(--cyan)" }],
    managePage: "/dashboard/integrations/facebook",
  },
  {
    provider: "instagram",
    name: "Instagram",
    description: "Automatiza conversaciones, responde mensajes y comentarios.",
    Icon: InstagramIcon, iconBg: "linear-gradient(135deg,#833AB4,#FD1D1D,#F77737)",
    badges: [{ label: "POSTS", color: "#bc5fb2" }, { label: "DMS", color: "#bc5fb2" }],
  },
  // WhatsApp
  {
    provider: "whatsapp_business",
    name: "WhatsApp Business",
    description: "Envía mensajes, plantillas y responde con la API Cloud oficial.",
    Icon: WhatsAppIcon, iconBg: "#075E54",
    badges: [{ label: "TEXTO", color: "var(--emerald)" }],
    managePage: "/dashboard/integrations/whatsapp",
  },
  // Google
  {
    provider: "google_ads",
    name: "Google Ads",
    description: "Search, Display y Performance Max desde el panel.",
    Icon: GoogleAdsIcon, iconBg: "#ffffff", iconLight: true,
    badges: [{ label: "ADS", color: "#4285F4" }],
  },
  {
    provider: "google_analytics",
    name: "Google Analytics 4",
    description: "Sesiones, conversiones y engagement en tiempo real.",
    Icon: GA4Icon, iconBg: "#ffffff", iconLight: true,
    badges: [{ label: "DATA", color: "var(--amber)" }],
  },
  {
    provider: "google_tag",
    name: "Tag Manager",
    description: "Contenedores, tags y triggers sin tocar el código.",
    Icon: GTMIcon, iconBg: "#ffffff", iconLight: true,
    badges: [{ label: "TAGS", color: "var(--emerald)" }],
  },
  // Mensajería
  { provider: "telegram", name: "Telegram", description: "Bots, canales y mensajería directa con Telegram.", Icon: TelegramIcon, iconBg: "#229ED9", comingSoon: true },
  // Social Ads
  {
    provider: "tiktok_ads", name: "TikTok",
    description: "Publica videos, gestiona contenido y analiza estadísticas desde el panel.",
    Icon: TikTokAdsIcon, iconBg: "linear-gradient(135deg,#010101,#69C9D0,#EE1D52)",
    managePage: "/dashboard/integrations/tiktok",
  },
  { provider: "linkedin_ads", name: "LinkedIn Ads", description: "Sponsored Content y Lead Gen Forms.", Icon: LinkedInIcon, iconBg: "#0A66C2", comingSoon: true },
  { provider: "x_ads", name: "X (Twitter)", description: "Promoted Tweets, Trends y audiencias.", Icon: XIcon, iconBg: "#14171A", comingSoon: true },
  // CRM
  {
    provider: "botmaker", name: "BotMaker",
    description: "Chatbots, WhatsApp API y analítica de conversaciones.",
    Icon: BotmakerIcon, iconBg: "#1E40AF",
    badges: [{ label: "CRM", color: "var(--purple)" }],
  },
  {
    provider: "cari", name: "Cari AI",
    description: "Report API: conversaciones y agentes en tiempo real.",
    Icon: CariAIIcon, iconBg: "#0B7A5C",
    badges: [{ label: "AI", color: "var(--emerald)" }],
  },
  {
    provider: "custom_crm", name: "CRM Custom",
    description: "Conecta tu propio CRM vía API endpoint personalizado.",
    Icon: ({ size = 20 }) => <Database size={size} color="white" />, iconBg: "#10B981",
    badges: [{ label: "API", color: "var(--emerald)" }],
  },
  { provider: "hubspot", name: "HubSpot", description: "Email automation y CRM sync.", Icon: HubSpotIcon, iconBg: "#FF5C35", comingSoon: true },
];

// ─── Channel translation helper ────────────────────────────────────────────────
const getTranslatedChannelDesc = (name: string, originalDesc: string, lang: 'es' | 'en') => {
  if (lang === 'es') return originalDesc;
  const map: Record<string, string> = {
    "Facebook Pages": "Manage Facebook pages, posts and comments.",
    "Facebook Messenger": "Respond to conversations and automate Messenger inbox.",
    "Instagram": "Automate conversations, respond to direct messages and comments.",
    "Meta Ads": "Ad campaigns, audiences and budgets in Meta.",
    "WhatsApp Business": "Send messages, templates and respond using official Cloud API.",
    "Google Ads": "Search, Display and Performance Max from the dashboard.",
    "Google Analytics 4": "Real-time sessions, conversions and engagement.",
    "Tag Manager": "Containers, tags and triggers without writing code.",
    "Telegram": "Bots, channels and direct messaging with Telegram.",
    "TikTok Ads": "In-Feed, TopView and Spark Ads from the dashboard.",
    "LinkedIn Ads": "Sponsored Content and Lead Gen Forms.",
    "X (Twitter)": "Promoted Tweets, Trends and audiences.",
    "BotMaker": "Chatbots, WhatsApp API and conversation analytics.",
    "Cari AI": "Report API: real-time conversations and agents.",
    "CRM Custom": "Connect your own CRM via custom API endpoint.",
    "HubSpot": "Email automation and CRM sync.",
  };
  return map[name] || originalDesc;
};

// ─── Shared view (used by /dashboard/integrations AND Admin > Settings) ────────
export function IntegrationsView() {
  const router = useRouter();
  const { lang } = useLanguage();

  const [integrations, setIntegrations]   = useState<IntegrationData[]>([]);
  const [loading, setLoading]             = useState(true);
  const [tokenModal, setTokenModal]       = useState<{ provider: string; label: string; isConnected?: boolean } | null>(null);
  const [showCrm, setShowCrm]             = useState(false);
  const [showCari, setShowCari]           = useState(false);

  const loadIntegrations = useCallback(() => {
    setLoading(true);
    fetch("/api/workspace/integrations")
      .then((r) => r.json())
      .then((res) => { if (Array.isArray(res.data?.data)) setIntegrations(res.data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  const getState = (provider: string) => integrations.find((i) => i.provider === provider) || null;

  const handleDisconnect = async (provider: string) => {
    try {
      const res = await fetch(`/api/workspace/integrations?provider=${provider}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadIntegrations();
        setTokenModal(null);
      } else {
        alert("Error al desconectar");
      }
    } catch (err) {
      alert("Error de red");
    }
  };

  const handleConnect = (channel: ChannelDef) => {
    if (channel.comingSoon) return;
    switch (channel.provider) {
      case "meta_community":
        openConnectPopup("community", loadIntegrations); break;
      case "instagram":
        openConnectPopup("/api/integrations/instagram/connect", loadIntegrations); break;
      case "meta_ads":
        openConnectPopup("ads", loadIntegrations); break;
      case "whatsapp_business":
        router.push("/dashboard/integrations/whatsapp"); break;
      case "google_ads":
        window.location.href = "/api/oauth/google/start?modules=google_ads"; break;
      case "google_analytics":
        window.location.href = "/api/oauth/google/start?modules=page_analytics"; break;
      case "google_tag":
        window.location.href = "/api/oauth/google/start?modules=tag_tracking"; break;
      case "tiktok_ads":
        openConnectPopup("/api/oauth/tiktok_ads/start?popup=1", loadIntegrations); break;
      case "botmaker":
        setTokenModal({ provider: "botmaker", label: "BotMaker", isConnected: !!getState("botmaker")?.connected }); break;
      case "cari":
        setShowCari(true); break;
      case "custom_crm":
        setShowCrm(true); break;
      default: break;
    }
  };

  const connectedProviders = new Set(integrations.filter(i => i.connected).map(i => i.provider));
  const uniqueConnected = ALL_CHANNELS.filter((c, i) => {
    const first = ALL_CHANNELS.findIndex(x => x.provider === c.provider);
    return first === i && !c.comingSoon && connectedProviders.has(c.provider);
  }).length;
  const totalActive = ALL_CHANNELS.filter(c => !c.comingSoon).length;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.4);} 50%{box-shadow:0 0 0 4px rgba(16,185,129,0);} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:none;} }
        .int-card { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease !important; }
        .int-card:hover:not([data-soon="true"]) { transform: translateY(-2px) !important; box-shadow: 0 10px 30px rgba(0,0,0,0.15) !important; border-color: var(--border-strong) !important; }
        .int-btn:hover { filter: brightness(1.1); }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeInUp 0.25s ease" }}>

        {/* ── Summary ─── */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px", borderRadius: "14px", background: "var(--row-hover)", border: "1px solid var(--hairline)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          {loading ? (
            <Loader2 size={16} style={{ color: "var(--text-secondary)", animation: "spin 1s linear infinite" }} />
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: uniqueConnected > 0 ? "var(--emerald)" : "var(--text-secondary)", boxShadow: uniqueConnected > 0 ? "0 0 10px var(--emerald)" : "none" }} />
                <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                  <strong style={{ color: "var(--foreground)", fontWeight: 800 }}>{uniqueConnected}</strong> {lang === "es" ? `de ${totalActive} canales conectados` : `of ${totalActive} connected channels`}
                </span>
              </div>
              <div style={{ flex: 1, height: "6px", borderRadius: "3px", background: "var(--surface-hover)", overflow: "hidden" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${totalActive > 0 ? (uniqueConnected / totalActive) * 100 : 0}%` }} transition={{ duration: 1, ease: "easeOut" }} style={{ height: "100%", borderRadius: "3px", background: "linear-gradient(90deg,var(--cyan),#2563eb,#bc5fb2)", boxShadow: "0 0 10px rgba(59,130,246,0.5)" }} />
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={loadIntegrations} style={{ background: "var(--surface-hover)", border: "1px solid var(--hairline)", borderRadius: "8px", cursor: "pointer", color: "var(--foreground)", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, padding: "6px 12px", transition: "background 0.2s" }}>
                <RefreshCw size={12} /> {lang === "es" ? "Refrescar" : "Refresh"}
              </motion.button>
            </>
          )}
        </div>

        {/* ── Card grid ─── */}
        <motion.div 
          initial="hidden" animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.05 }
            }
          }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "18px" }}
        >
          {ALL_CHANNELS.map((ch, idx) => {
            const state = getState(ch.provider);
            const connected = !loading && !!state?.connected;
            const isGradient = ch.iconBg.startsWith("linear");

            return (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
                }}
                key={`${ch.provider}-${idx}`}
                data-soon={ch.comingSoon ? "true" : "false"}
                style={{
                  display: "flex", flexDirection: "column",
                  padding: "24px 22px 20px", borderRadius: "18px",
                  background: connected ? "rgba(16, 185, 129, 0.05)" : "var(--bg-raised)",
                  border: connected ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid var(--border)",
                  opacity: ch.comingSoon ? 0.55 : 1,
                  position: "relative", overflow: "hidden",
                  boxShadow: connected ? "0 10px 30px rgba(16,185,129,0.1)" : "0 4px 14px rgba(0,0,0,0.06)",
                  backdropFilter: "blur(12px)",
                }}
              >
                {/* top green accent when connected */}
                {connected && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,var(--emerald),transparent)", borderRadius: "14px 14px 0 0" }} />
                )}

                {/* PRONTO badge */}
                {ch.comingSoon && (
                  <span style={{ position: "absolute", top: 10, right: 10, fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "rgba(155,123,232,0.12)", border: "1px solid rgba(155,123,232,0.2)", color: "var(--purple)", letterSpacing: "0.08em" }}>
                    {lang === "es" ? "PRONTO" : "SOON"}
                  </span>
                )}
 
                {/* Icon row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
                  <motion.div 
                    whileHover={{ scale: 1.05, rotate: [-2, 2, 0] }}
                    transition={{ duration: 0.3 }}
                    style={{
                    width: "52px", height: "52px", borderRadius: "14px", flexShrink: 0,
                    background: ch.iconBg,
                    border: ch.iconLight ? "1px solid rgba(0,0,0,0.08)" : "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: connected
                      ? ch.iconLight
                        ? "0 0 0 3px rgba(16,185,129,0.14), 0 8px 24px rgba(0,0,0,0.15)"
                        : `0 0 0 3px rgba(16,185,129,0.14), 0 8px 24px ${isGradient ? "rgba(0,100,224,0.3)" : ch.iconBg + "55"}`
                      : ch.iconLight
                        ? "0 8px 24px rgba(0,0,0,0.1)"
                        : `0 8px 24px ${isGradient ? "rgba(0,100,224,0.18)" : ch.iconBg + "33"}`,
                  }}>
                    <ch.Icon size={26} />
                  </motion.div>
 
                  {ch.badges && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
                      {ch.badges.map((b) => (
                        <span key={b.label} style={{ fontSize: "9px", fontWeight: 800, padding: "3px 8px", borderRadius: "6px", background: `${b.color}14`, border: `1px solid ${b.color}30`, color: b.color, letterSpacing: "0.08em" }}>
                          {b.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
 
                {/* Name + description */}
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--foreground)", margin: "0 0 6px", letterSpacing: "-0.01em" }}>{ch.name}</h3>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                    {getTranslatedChannelDesc(ch.name, ch.description, lang)}
                  </p>
                </div>
 
                {/* Bottom: status + button */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--hairline)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {loading ? (
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--surface-hover)" }} />
                    ) : connected ? (
                      <>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--emerald)", boxShadow: "0 0 10px var(--emerald)" }} />
                        <span style={{ fontSize: "12px", color: "var(--emerald)", fontWeight: 700 }}>{lang === "es" ? "Conectado" : "Connected"}</span>
                      </>
                    ) : (
                      <>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--text-secondary)" }} />
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>{lang === "es" ? "Sin conectar" : "Not connected"}</span>
                      </>
                    )}
                  </div>
 
                  {!ch.comingSoon && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (connected && ch.managePage) router.push(ch.managePage);
                        else handleConnect(ch);
                      }}
                      style={{
                        padding: "8px 18px", borderRadius: "8px",
                        fontSize: "12px", fontWeight: 700,
                        background: connected ? "var(--surface-hover)" : "linear-gradient(135deg, var(--cyan), #2563eb)",
                        border: connected ? "1px solid var(--hairline)" : "none",
                        color: connected ? "var(--foreground)" : "white",
                        cursor: "pointer", fontFamily: "inherit",
                        boxShadow: connected ? "none" : "0 4px 14px rgba(59,130,246,0.4)",
                      }}
                    >
                      {connected ? (lang === "es" ? "Configurar" : "Configure") : (lang === "es" ? "Conectar" : "Connect")}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* ── Modals ─── */}
      {tokenModal && (
        <TokenModal
          provider={tokenModal.provider}
          label={tokenModal.label}
          isConnected={tokenModal.isConnected}
          onClose={() => setTokenModal(null)}
          onSuccess={() => { loadIntegrations(); setTokenModal(null); }}
          onDisconnect={() => handleDisconnect(tokenModal.provider)}
        />
      )}
      {showCrm && (
        <CustomCrmModal
          onClose={() => setShowCrm(false)}
          onSuccess={() => { setShowCrm(false); loadIntegrations(); }}
        />
      )}
      {showCari && (
        <CariConnectModal
          onClose={() => setShowCari(false)}
          onSuccess={() => { setShowCari(false); loadIntegrations(); }}
        />
      )}
    </>
  );
}

