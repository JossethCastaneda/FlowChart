"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Settings, CheckCircle, XCircle, Loader2, ChevronRight, Zap, BarChart2, Users, Megaphone, Eye, Pencil, MessageSquare, Key, Database, Grid, Activity, Globe } from "lucide-react";
import { openConnectPopup } from "@/lib/connect-popup";
import { MetaConnectionHealthCenter } from "@/components/meta/MetaConnectionHealthCenter";
import { GoogleHubCenter } from "@/components/integrations/GoogleHubCenter";
import { CustomCrmModal } from "@/components/integrations/CustomCrmModal";
import { CariConnectModal } from "@/components/integrations/CariConnectModal";
import { WhatsAppConnectCard } from "@/components/settings/WhatsAppConnectCard";

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
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);
const PinterestIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
  </svg>
);
const SnapchatIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.976-.27a.075.075 0 01.035-.008c.09 0 .18.03.251.09.105.075.165.195.165.315 0 .135-.06.24-.195.345a2.505 2.505 0 01-1.29.45c-.15.015-.3.045-.435.06-.045.015-.09.015-.105.045-.075.09-.06.225-.06.345 0 .015 0 .03.015.045.24.57.54 1.11.9 1.605.555.765 1.26 1.39 2.07 1.845.48.285.93.435 1.32.525.105.03.21.045.24.135.03.12-.105.24-.18.315-.3.3-.675.45-1.08.54-.21.045-.405.075-.585.135a.76.76 0 00-.33.225c-.12.165-.09.375-.06.555l.015.06c.045.18.09.375.075.585-.015.24-.15.42-.405.525-.3.12-.645.165-1.02.195-.405.03-.855.045-1.365.165-.375.09-.72.285-1.095.51-.69.36-1.47.78-2.88.78s-2.19-.42-2.88-.78c-.375-.225-.72-.42-1.095-.51-.51-.12-.96-.135-1.365-.165-.375-.03-.72-.075-1.02-.195-.24-.105-.39-.285-.405-.525-.015-.21.03-.405.075-.585l.015-.06c.03-.18.06-.39-.06-.555a.76.76 0 00-.33-.225c-.18-.06-.375-.09-.585-.135-.405-.09-.78-.24-1.08-.54-.075-.075-.21-.195-.18-.315.03-.09.135-.105.24-.135.39-.09.84-.24 1.32-.525.81-.45 1.515-1.08 2.07-1.845.36-.495.66-1.035.9-1.605a.08.08 0 01.015-.045c0-.12.015-.255-.06-.345-.015-.03-.06-.03-.105-.045-.135-.015-.285-.045-.435-.06a2.505 2.505 0 01-1.29-.45C2.34 10.965 2.28 10.86 2.28 10.725c0-.12.06-.24.165-.315a.353.353 0 01.251-.09.075.075 0 01.035.008c.317.15.676.254.976.27.198 0 .326-.045.401-.09a48.58 48.58 0 00-.03-.51l-.003-.06c-.104-1.628-.23-3.654.299-4.847C5.859 1.069 9.216.793 10.206.793h2z"/>
  </svg>
);
const XIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
const BigQueryIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path d="M6 2L2 6v12l4 4h12l4-4V6l-4-4H6z" fill="#4386FA"/>
    <path d="M13.5 15.5l3 3M9 8v5.5c0 1.38 1.12 2.5 2.5 2.5h1c1.38 0 2.5-1.12 2.5-2.5V8" stroke="white" strokeWidth="1.5" fill="none"/>
  </svg>
);

/* ─── Capability badge component ─── */
function CapabilityBadge({ capabilities }: { capabilities?: ("read" | "manage")[] }) {
  if (!capabilities || capabilities.length === 0) return null;
  const hasManage = capabilities.includes("manage");
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600,
      letterSpacing: "0.05em", textTransform: "uppercase",
      background: hasManage ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.08)",
      border: `1px solid ${hasManage ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.15)"}`,
      color: hasManage ? "#f59e0b" : "#10b981",
    }}>
      {hasManage ? <Pencil size={8} /> : <Eye size={8} />}
      {hasManage ? "Lectura + Gestión" : "Lectura"}
    </div>
  );
}

/* ─── Platform groups ─── */
interface PlatformDef {
  provider: string;
  name: string;
  description: string;
  Icon: () => React.JSX.Element;
  iconBg: string;
  moduleUrl?: string;
  oauthProvider?: string;
  /** For token-based integrations (like BotMaker) — shows a token input modal */
  tokenProvider?: string;
  customCrmProvider?: boolean;
  /** Cari AI — modal propio con una credencial por grupo de reportes */
  cariProvider?: boolean;
  capabilities?: ("read" | "manage")[];
}

const GROUPS: Array<{ label: string; icon: React.ReactNode; color: string; platforms: PlatformDef[] }> = [
  {
    label: "Meta",
    icon: <Megaphone size={13} />,
    color: "#0081FB",
    platforms: [
      { provider: "meta_ads", moduleUrl: "ads", name: "Ads Manager", description: "Campañas, audiencias y presupuestos", Icon: MetaIcon, iconBg: "#0064E0", capabilities: ["read", "manage"] as ("read" | "manage")[] },
      { provider: "meta_analytics", moduleUrl: "analytics", name: "Analytics Engine", description: "Insights orgánicos y de pago", Icon: MetaIcon, iconBg: "#0064E0", capabilities: ["read"] as ("read" | "manage")[] },
      { provider: "meta_community", moduleUrl: "community", name: "Community Management", description: "Inbox, Listening y Streams", Icon: MetaIcon, iconBg: "#0064E0", capabilities: ["read", "manage"] as ("read" | "manage")[] },
    ],
  },
  {
    label: "Canales",
    icon: <Zap size={13} />,
    color: "#A855F7",
    platforms: [
      // { provider: "tiktok_ads", oauthProvider: "tiktok_ads", name: "TikTok Ads", description: "In-Feed, TopView, Spark Ads", Icon: TikTokIcon, iconBg: "#161722", capabilities: ["read", "manage"] as ("read" | "manage")[] },
      // { provider: "linkedin_ads", oauthProvider: "linkedin_ads", name: "LinkedIn Ads", description: "Sponsored Content y Lead Gen", Icon: LinkedInIcon, iconBg: "#0A66C2", capabilities: ["read"] as ("read" | "manage")[] },
      // { provider: "pinterest_ads", oauthProvider: "pinterest_ads", name: "Pinterest Ads", description: "Promoted Pins y Shopping", Icon: PinterestIcon, iconBg: "#E60023", capabilities: ["read"] as ("read" | "manage")[] },
      // { provider: "snapchat_ads", oauthProvider: "snapchat_ads", name: "Snapchat Ads", description: "Snap Ads, Stories y AR Lenses", Icon: SnapchatIcon, iconBg: "#FFFC00", capabilities: ["read"] as ("read" | "manage")[] },
      // { provider: "x_ads", oauthProvider: "x_ads", name: "X (Twitter) Ads", description: "Promoted Tweets y Trends", Icon: XIcon, iconBg: "#000000", capabilities: ["read"] as ("read" | "manage")[] },
      { provider: "whatsapp", name: "WhatsApp Business", description: "API Cloud, plantillas y webhooks", Icon: WhatsAppIcon, iconBg: "#075E54" },
    ],
  },
  {
    label: "CRM & AI",
    icon: <Users size={13} />,
    color: "#10B981",
    platforms: [
      { provider: "botmaker", tokenProvider: "botmaker", name: "BotMaker", description: "Chatbots, WhatsApp API y analítica conversacional", Icon: () => <MessageSquare size={18} />, iconBg: "#1E40AF", capabilities: ["read"] as ("read" | "manage")[] },
      { provider: "cari", cariProvider: true, name: "Cari AI", description: "Report API: conversaciones, servicio, agentes y clientes", Icon: () => <Database size={18} />, iconBg: "#0B7A5C", capabilities: ["read"] as ("read" | "manage")[] },
      { provider: "custom_crm", customCrmProvider: true, name: "CRM Custom (vía API)", description: "Conecta tu propio CRM o Endpoint para tracking de bots", Icon: () => <Database size={18} />, iconBg: "#10B981", capabilities: ["read", "manage"] as ("read" | "manage")[] },
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
  const [activeTab, setActiveTab] = useState<"general" | "google" | "meta">("general");
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [tokenModal, setTokenModal] = useState<{ provider: string; label: string } | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [connBaseUrl, setConnBaseUrl] = useState("");
  const [connRefresh, setConnRefresh] = useState("");
  const [tokenSaving, setTokenSaving] = useState(false);
  const [crmModalOpen, setCrmModalOpen] = useState(false);
  const [cariModalOpen, setCariModalOpen] = useState(false);
  const [waModalOpen, setWaModalOpen] = useState(false);

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

  function handleConnect(platform: PlatformDef) {
    if (platform.moduleUrl) {
      // Meta flow — existing popup connect
      openConnectPopup(platform.moduleUrl, () => loadIntegrations());
    } else if (platform.oauthProvider) {
      // Generic OAuth flow — redirect to /api/oauth/[provider]/start
      window.location.href = `/api/oauth/${platform.oauthProvider}/start`;
    } else if (platform.tokenProvider) {
      // Token-based flow — show modal (URL + access token + refresh token)
      setTokenInput("");
      setConnBaseUrl("");
      setConnRefresh("");
      setTokenModal({ provider: platform.tokenProvider, label: platform.name });
    } else if (platform.customCrmProvider) {
      setCrmModalOpen(true);
    } else if (platform.cariProvider) {
      setCariModalOpen(true);
    } else if (platform.provider === "whatsapp") {
      setWaModalOpen(true);
    } else {
      alert("Próximamente");
    }
  }

  async function handleTokenSave() {
    if (!tokenModal || !tokenInput.trim()) return;
    setTokenSaving(true);
    try {
      const res = await fetch("/api/workspace/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: tokenModal.provider,
          token: tokenInput.trim(),
          baseUrl: connBaseUrl.trim() || undefined,
          refreshToken: connRefresh.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTokenModal(null);
        setTokenInput("");
        loadIntegrations();
      } else {
        alert(data.error || "Error al guardar token");
      }
    } catch {
      alert("Error de red");
    } finally {
      setTokenSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title="Integraciones"
        description="Conecta plataformas, revisa permisos y valida que cada modulo pueda operar."
        icon={<Settings size={20} style={{ color: "var(--cyan)" }} />}
      />

      {/* Selector de pestañas de alta estética */}
      <div style={{
        display: "inline-flex",
        alignSelf: "flex-start",
        padding: "4px",
        borderRadius: "10px",
        background: "rgba(15, 23, 42, 0.4)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        gap: 4,
        marginBottom: 8
      }}>
        <button
          onClick={() => setActiveTab("general")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 600,
            borderRadius: "8px",
            color: activeTab === "general" ? "var(--cyan)" : "#94a3b8",
            background: activeTab === "general" ? "rgba(255, 255, 255, 0.05)" : "transparent",
            border: activeTab === "general" ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid transparent",
            cursor: "pointer",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <Grid size={14} style={{ color: activeTab === "general" ? "var(--cyan)" : "#64748b" }} />
          Canales e Integraciones
        </button>
        <button
          onClick={() => setActiveTab("google")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 600,
            borderRadius: "8px",
            color: activeTab === "google" ? "#60a5fa" : "#94a3b8",
            background: activeTab === "google" ? "rgba(66, 133, 244, 0.08)" : "transparent",
            border: activeTab === "google" ? "1px solid rgba(66, 133, 244, 0.2)" : "1px solid transparent",
            cursor: "pointer",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <Globe size={14} style={{ color: activeTab === "google" ? "#60a5fa" : "#64748b" }} />
          Google Hub (Módulos)
        </button>
        <button
          onClick={() => setActiveTab("meta")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 600,
            borderRadius: "8px",
            color: activeTab === "meta" ? "#3b82f6" : "#94a3b8",
            background: activeTab === "meta" ? "rgba(0, 129, 251, 0.08)" : "transparent",
            border: activeTab === "meta" ? "1px solid rgba(0, 129, 251, 0.2)" : "1px solid transparent",
            cursor: "pointer",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <Activity size={14} style={{ color: activeTab === "meta" ? "#3b82f6" : "#64748b" }} />
          Salud de Meta (Detalles)
        </button>
      </div>

      {activeTab === "meta" && <MetaConnectionHealthCenter />}
      {activeTab === "google" && <GoogleHubCenter />}

      {activeTab === "general" && (
        <>
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
              const caps = platform.capabilities;

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

                  {/* Capability badge */}
                  <CapabilityBadge capabilities={caps} />

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
                      onClick={() => handleConnect(platform)}
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
    </>
  )}

  {/* Token Modal */}
      {tokenModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setTokenModal(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 460, padding: 24, borderRadius: 12,
              background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)",
              display: "flex", flexDirection: "column", gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Key size={16} style={{ color: "#00d4ff" }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
                Conectar {tokenModal.label}
              </h3>
            </div>
            <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
              Conecta tu cuenta de {tokenModal.label}. Los tokens se cifran con AES-256 antes de guardarse.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                URL del API <span style={{ color: "#475569", fontWeight: 400 }}>· opcional</span>
              </label>
              <input
                value={connBaseUrl}
                onChange={e => setConnBaseUrl(e.target.value)}
                placeholder="https://api.botmaker.com/v2.0"
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 12,
                  fontFamily: "monospace", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0",
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Access token</label>
              <textarea
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                placeholder="Pega el access token aquí..."
                autoFocus
                rows={2}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 12,
                  fontFamily: "monospace", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0",
                  resize: "none", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                Refresh token <span style={{ color: "#475569", fontWeight: 400 }}>· opcional</span>
              </label>
              <textarea
                value={connRefresh}
                onChange={e => setConnRefresh(e.target.value)}
                placeholder="Pega el refresh token aquí..."
                rows={2}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 12,
                  fontFamily: "monospace", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0",
                  resize: "none", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setTokenModal(null)}
                style={{
                  padding: "8px 16px", borderRadius: 6, fontSize: 12,
                  background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#94a3b8", cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                disabled={!tokenInput.trim() || tokenSaving}
                onClick={handleTokenSave}
                style={{
                  padding: "8px 20px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: tokenInput.trim() ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${tokenInput.trim() ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.06)"}`,
                  color: tokenInput.trim() ? "#00d4ff" : "#334155",
                  cursor: tokenInput.trim() && !tokenSaving ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {tokenSaving && <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />}
                Guardar y conectar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom CRM Modal */}
      {crmModalOpen && (
        <CustomCrmModal
          onClose={() => setCrmModalOpen(false)}
          onSuccess={() => {
            setCrmModalOpen(false);
            loadIntegrations();
          }}
        />
      )}

      {/* WhatsApp Business Modal */}
      {waModalOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 16px",
          }}
          onClick={() => setWaModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 480, padding: 24, borderRadius: 14,
              background: "#0f172a", border: "1px solid rgba(37,211,102,0.15)",
              display: "flex", flexDirection: "column", gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
                WhatsApp Business
              </span>
              <button
                onClick={() => setWaModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4 }}
              >
                ✕
              </button>
            </div>
            <WhatsAppConnectCard />
          </div>
        </div>
      )}

      {/* Cari AI Modal */}
      {cariModalOpen && (
        <CariConnectModal
          onClose={() => setCariModalOpen(false)}
          onSuccess={() => {
            setCariModalOpen(false);
            loadIntegrations();
          }}
        />
      )}
    </div>
  );
}
