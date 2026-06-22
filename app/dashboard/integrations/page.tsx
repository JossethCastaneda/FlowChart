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

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const MetaIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="white">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);
const MessengerIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="white">
    <path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.193 14.963l-3.056-3.259-5.963 3.259 6.559-6.963 3.13 3.259 5.889-3.259-6.559 6.963z"/>
  </svg>
);
const InstagramIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="white">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);
const WhatsAppIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
const GoogleIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);
const GA4Icon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size}>
    <path d="M22.84 2.998v17.004a3 3 0 01-2.998 2.998 3 3 0 01-2.998-2.998V2.998A3 3 0 0119.842 0a3 3 0 012.998 2.998z" fill="#F9AB00"/>
    <path d="M12.5 9.002v10.998A3 3 0 019.502 23a3 3 0 01-2.998-2.998V9.002A3 3 0 019.502 6.004a3 3 0 012.998 2.998z" fill="#E37400"/>
    <circle cx="3.498" cy="19.502" r="3.498" fill="#E37400"/>
  </svg>
);
const GTMIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size}>
    <path d="M12 0L1.608 6v12L12 24l10.392-6V6L12 0z" fill="#8AB4F8"/>
    <path d="M12 0L1.608 6l4.5 2.6L12 5.2l5.892 3.4 4.5-2.6L12 0z" fill="#4285F4"/>
    <path d="M6.108 8.6L1.608 6v12l4.5 2.6V8.6z" fill="#3367D6"/>
    <path d="M17.892 8.6V20.6l4.5-2.6V6l-4.5 2.6z" fill="#4285F4"/>
    <path d="M12 18.8l-5.892-3.4V8.6L12 12l5.892-3.4v6.8L12 18.8z" fill="white"/>
  </svg>
);
const TelegramIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="white">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);
const TikTokIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="white">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.28 6.28 0 00-.79-.05 6.28 6.28 0 00-6.28 6.28 6.28 6.28 0 006.28 6.28 6.28 6.28 0 006.28-6.28V8.87a8.2 8.2 0 004.78 1.53V7a4.84 4.84 0 01-.96-.31z"/>
  </svg>
);
const LinkedInIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="white">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);
const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="white">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
const HubSpotIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="white">
    <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.984v-.066A2.198 2.198 0 0017.235.838h-.066a2.198 2.198 0 00-2.196 2.196v.066c0 .867.51 1.615 1.244 1.97v2.862a5.85 5.85 0 00-2.692 1.308l-7.15-5.558a2.396 2.396 0 00.075-.575A2.41 2.41 0 004.04.697a2.41 2.41 0 00-2.41 2.41 2.41 2.41 0 002.41 2.41c.47 0 .905-.14 1.275-.374l7.03 5.467a5.876 5.876 0 00-.91 3.143c0 1.162.34 2.244.92 3.158l-2.17 2.17a1.932 1.932 0 00-.57-.094 1.974 1.974 0 00-1.974 1.974 1.974 1.974 0 001.974 1.974 1.974 1.974 0 001.974-1.974c0-.2-.032-.39-.087-.572l2.126-2.126a5.882 5.882 0 003.542 1.183c3.254 0 5.892-2.638 5.892-5.892a5.882 5.882 0 00-5.892-5.892 5.86 5.86 0 00-1.74.27zM17.2 17.606a2.82 2.82 0 01-2.823-2.823 2.82 2.82 0 012.823-2.823 2.82 2.82 0 012.823 2.823 2.82 2.82 0 01-2.823 2.823z"/>
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────
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
function TokenModal({ provider, label, onClose, onSuccess }: {
  provider: string; label: string; onClose: () => void; onSuccess: () => void;
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
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 400, borderRadius: 14, background: "#0d1626", border: "1px solid rgba(255,255,255,0.1)", padding: 24 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", margin: "0 0 6px" }}>Conectar {label}</p>
        <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 16px" }}>Ingresa el token de acceso de tu cuenta</p>
        <input
          value={token} onChange={(e) => setToken(e.target.value)}
          placeholder="Token de acceso..."
          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
        />
        {error && (
          <p style={{ fontSize: 11, color: "#f87171", margin: "10px 0 0", lineHeight: 1.4 }}>{error}</p>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 12, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          <button onClick={save} disabled={!token.trim() || saving} style={{ flex: 2, padding: "9px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.25)", color: "#00d4ff", cursor: !token.trim() || saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit", opacity: !token.trim() || saving ? 0.6 : 1 }}>
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
  Icon: (p: { size?: number }) => React.JSX.Element;
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
    badges: [{ label: "ADS", color: "#60a5fa" }],
    managePage: "/dashboard/integrations/meta-ads",
  },
  {
    provider: "meta_community",
    name: "Facebook Pages",
    description: "Gestiona páginas, publicaciones y comentarios de Facebook.",
    Icon: MetaIcon, iconBg: "#0064E0",
    badges: [{ label: "PÁGINAS", color: "#60a5fa" }],
    managePage: "/dashboard/integrations/facebook",
  },
  {
    provider: "instagram",
    name: "Instagram",
    description: "Automatiza conversaciones, responde mensajes y comentarios.",
    Icon: InstagramIcon, iconBg: "linear-gradient(135deg,#833AB4,#FD1D1D,#F77737)",
    badges: [{ label: "POSTS", color: "#f472b6" }, { label: "DMS", color: "#f472b6" }],
  },
  // WhatsApp
  {
    provider: "whatsapp_business",
    name: "WhatsApp Business",
    description: "Envía mensajes, plantillas y responde con la API Cloud oficial.",
    Icon: WhatsAppIcon, iconBg: "#075E54",
    badges: [{ label: "TEXTO", color: "#34d399" }],
    managePage: "/dashboard/integrations/whatsapp",
  },
  // Google
  {
    provider: "google_ads",
    name: "Google Ads",
    description: "Search, Display y Performance Max desde el panel.",
    Icon: GoogleIcon, iconBg: "#ffffff", iconLight: true,
    badges: [{ label: "ADS", color: "#4285F4" }],
  },
  {
    provider: "google_analytics",
    name: "Google Analytics 4",
    description: "Sesiones, conversiones y engagement en tiempo real.",
    Icon: GA4Icon, iconBg: "#ffffff", iconLight: true,
    badges: [{ label: "DATA", color: "#f59e0b" }],
  },
  {
    provider: "google_tag",
    name: "Tag Manager",
    description: "Contenedores, tags y triggers sin tocar el código.",
    Icon: GTMIcon, iconBg: "#ffffff", iconLight: true,
    badges: [{ label: "TAGS", color: "#34d399" }],
  },
  // Mensajería
  { provider: "telegram", name: "Telegram", description: "Bots, canales y mensajería directa con Telegram.", Icon: TelegramIcon, iconBg: "#229ED9", comingSoon: true },
  // Social Ads
  { provider: "tiktok_ads", name: "TikTok Ads", description: "In-Feed, TopView y Spark Ads desde el panel.", Icon: TikTokIcon, iconBg: "#1a1a2e", comingSoon: true },
  { provider: "linkedin_ads", name: "LinkedIn Ads", description: "Sponsored Content y Lead Gen Forms.", Icon: LinkedInIcon, iconBg: "#0A66C2", comingSoon: true },
  { provider: "x_ads", name: "X (Twitter)", description: "Promoted Tweets, Trends y audiencias.", Icon: XIcon, iconBg: "#14171A", comingSoon: true },
  // CRM
  {
    provider: "botmaker", name: "BotMaker",
    description: "Chatbots, WhatsApp API y analítica de conversaciones.",
    Icon: ({ size = 20 }) => <MessageSquare size={size} color="white" />, iconBg: "#1E40AF",
    badges: [{ label: "CRM", color: "#818cf8" }],
  },
  {
    provider: "cari", name: "Cari AI",
    description: "Report API: conversaciones y agentes en tiempo real.",
    Icon: ({ size = 20 }) => <Database size={size} color="white" />, iconBg: "#0B7A5C",
    badges: [{ label: "AI", color: "#34d399" }],
  },
  {
    provider: "custom_crm", name: "CRM Custom",
    description: "Conecta tu propio CRM vía API endpoint personalizado.",
    Icon: ({ size = 20 }) => <Database size={size} color="white" />, iconBg: "#10B981",
    badges: [{ label: "API", color: "#34d399" }],
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
  const [tokenModal, setTokenModal]       = useState<{ provider: string; label: string } | null>(null);
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
      case "botmaker":
        setTokenModal({ provider: "botmaker", label: "BotMaker" }); break;
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
        .int-card:hover:not([data-soon="true"]) { transform: translateY(-2px) !important; box-shadow: 0 10px 30px rgba(0,0,0,0.4) !important; border-color: rgba(255,255,255,0.12) !important; }
        .int-btn:hover { filter: brightness(1.1); }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeInUp 0.25s ease" }}>

        {/* ── Summary ─── */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px", borderRadius: "14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.02)" }}>
          {loading ? (
            <Loader2 size={16} style={{ color: "#475569", animation: "spin 1s linear infinite" }} />
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: uniqueConnected > 0 ? "#10b981" : "#334155", boxShadow: uniqueConnected > 0 ? "0 0 10px #10b981" : "none" }} />
                <span style={{ fontSize: "14px", color: "#94a3b8" }}>
                  <strong style={{ color: "white", fontWeight: 800 }}>{uniqueConnected}</strong> {lang === "es" ? `de ${totalActive} canales conectados` : `of ${totalActive} connected channels`}
                </span>
              </div>
              <div style={{ flex: 1, height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${totalActive > 0 ? (uniqueConnected / totalActive) * 100 : 0}%` }} transition={{ duration: 1, ease: "easeOut" }} style={{ height: "100%", borderRadius: "3px", background: "linear-gradient(90deg,#00d4ff,#4f46e5,#f472b6)", boxShadow: "0 0 10px rgba(0,212,255,0.5)" }} />
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={loadIntegrations} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", cursor: "pointer", color: "white", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, padding: "6px 12px", transition: "background 0.2s" }}>
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
                  background: connected ? "rgba(16, 185, 129, 0.05)" : "rgba(255, 255, 255, 0.02)",
                  border: connected ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(255, 255, 255, 0.08)",
                  opacity: ch.comingSoon ? 0.55 : 1,
                  position: "relative", overflow: "hidden",
                  boxShadow: connected ? "0 10px 30px rgba(16,185,129,0.1), inset 0 0 0 1px rgba(16,185,129,0.1)" : "0 4px 14px rgba(0,0,0,0.2)",
                  backdropFilter: "blur(12px)",
                }}
              >
                {/* top green accent when connected */}
                {connected && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#10b981,transparent)", borderRadius: "14px 14px 0 0" }} />
                )}

                {/* PRONTO badge */}
                {ch.comingSoon && (
                  <span style={{ position: "absolute", top: 10, right: 10, fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.2)", color: "#a855f7", letterSpacing: "0.08em" }}>
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
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "white", margin: "0 0 6px", letterSpacing: "-0.01em" }}>{ch.name}</h3>
                  <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>
                    {getTranslatedChannelDesc(ch.name, ch.description, lang)}
                  </p>
                </div>
 
                {/* Bottom: status + button */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {loading ? (
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
                    ) : connected ? (
                      <>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
                        <span style={{ fontSize: "12px", color: "#10b981", fontWeight: 700 }}>{lang === "es" ? "Conectado" : "Connected"}</span>
                      </>
                    ) : (
                      <>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#475569" }} />
                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>{lang === "es" ? "Sin conectar" : "Not connected"}</span>
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
                        background: connected ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #00d4ff, #4f46e5)",
                        border: connected ? "1px solid rgba(255,255,255,0.1)" : "none",
                        color: connected ? "white" : "white",
                        cursor: "pointer", fontFamily: "inherit",
                        boxShadow: connected ? "none" : "0 4px 14px rgba(0,212,255,0.4)",
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
          onClose={() => setTokenModal(null)}
          onSuccess={() => { loadIntegrations(); setTokenModal(null); }}
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

// ─── Default export — page wrapper with header ────────────────────────────────
export default function IntegrationsPage() {
  const { lang } = useLanguage();
  return (
    <div className="space-y-6">
      <PageHeader
        title={lang === "es" ? "Integraciones" : "Integrations"}
        description={lang === "es" 
          ? "Conecta plataformas, revisa permisos y valida que cada módulo pueda operar." 
          : "Connect platforms, review permissions and validate that each module is operational."}
        icon={<Settings size={20} style={{ color: "var(--cyan)" }} />}
      />
      <IntegrationsView />
    </div>
  );
}
