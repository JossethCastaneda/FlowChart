"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { openConnectPopup } from "@/lib/connect-popup";
import {
  Search, X, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Filter, Wifi,
  RefreshCw, Plus,
} from "lucide-react";
import {
  Conversation,
  ConnectedPage, Platform, ChannelFilter, QueueFilter,
} from "./types";
import { relativeTime, getPlatformConfig } from "./utils";
import { PageSelector, PostView, ChatView, ContactProfile, Avatar } from "./InboxComponents";
import { MessengerIcon, FacebookIcon, InstagramIcon, WhatsAppIcon } from "@/components/ui/AppIcons";
import { useInboxData } from "./hooks/useInboxData";
import { useInboxFilters } from "./hooks/useInboxFilters";

// ═══════════════════════════════════════════════════════════════
// PLATFORM ICONS ROUTER
// ═══════════════════════════════════════════════════════════════
export function PlatformIcon({ platform, size = 16 }: { platform: Platform; size?: number }) {
  switch (platform) {
    case "fb_messenger": return <MessengerIcon size={size} />;
    case "fb_comment":   return <FacebookIcon size={size} />;
    case "ig_dm":
    case "instagram_dm":
    case "ig_comment":
    case "instagram_comment": return <InstagramIcon size={size} />;
    case "whatsapp":     return <WhatsAppIcon size={size} />;
    default:             return <MessengerIcon size={size} />;
  }
}

// ═══════════════════════════════════════════════════════════════
// CONVERSATION SKELETON
// ═══════════════════════════════════════════════════════════════
function ConversationSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando conversaciones">
      {[...Array(9)].map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--hairline)", opacity: 1 - i * 0.09 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0, background: "var(--surface-hover)", animation: `shimmer 1.6s ease-in-out ${i * 0.06}s infinite` }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7, justifyContent: "center" }}>
            <div style={{ height: 11, width: `${48 + (i % 4) * 13}%`, borderRadius: 4, background: "var(--surface-hover)", animation: `shimmer 1.6s ease-in-out ${i * 0.06 + 0.1}s infinite` }} />
            <div style={{ height: 9,  width: `${34 + (i % 5) * 11}%`, borderRadius: 4, background: "var(--row-hover)",    animation: `shimmer 1.6s ease-in-out ${i * 0.06 + 0.2}s infinite` }} />
          </div>
          <div style={{ height: 9, width: 24, borderRadius: 4, alignSelf: "flex-start", marginTop: 4, background: "var(--row-hover)", animation: `shimmer 1.6s ease-in-out ${i * 0.06 + 0.15}s infinite` }} />
        </div>
      ))}
      <style>{`@keyframes shimmer{0%,100%{opacity:.4}50%{opacity:.85}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONVERSATION ROW
// ═══════════════════════════════════════════════════════════════
function ConversationRow({ conv, isActive, onClick }: { conv: Conversation; isActive: boolean; onClick: () => void }) {
  const pc = getPlatformConfig(conv.platform);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-selected={isActive}
      aria-label={`${conv.contactName} — ${pc.label}`}
      onClick={onClick}
      onKeyDown={e => (e.key === "Enter" || e.key === " ") && onClick()}
      style={{
        padding: "12px 16px",
        cursor: "pointer",
        background: isActive ? "var(--cyan-dim, rgba(0,212,255,0.08))" : "transparent",
        borderLeft: isActive ? "3px solid var(--cyan)" : "3px solid transparent",
        borderBottom: "1px solid var(--glass-border)",
        display: "flex", gap: 12, alignItems: "flex-start",
        transition: "all 0.2s ease-in-out",
        outline: "none",
      }}
      onMouseOver={e => { if (!isActive) e.currentTarget.style.background = "var(--surface-hover)"; }}
      onMouseOut={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
      onFocus={e => { e.currentTarget.style.outline = "2px solid var(--glass-border)"; e.currentTarget.style.outlineOffset = "2px"; }}
      onBlur={e => { e.currentTarget.style.outline = "none"; }}
    >
      {/* Avatar + Platform badge */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar src={conv.contactAvatar} name={conv.contactName} size={42} color={pc.color} />
        <div style={{
          position: "absolute", bottom: -3, right: -3,
          width: 19, height: 19, borderRadius: "50%",
          background: "var(--background)", border: "2px solid var(--background)",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          <PlatformIcon platform={conv.platform} size={17} />
        </div>
        {conv.unread && (
          <div style={{
            position: "absolute", top: 0, left: 0,
            width: 10, height: 10, borderRadius: "50%",
            background: "var(--cyan)", border: "2px solid var(--background)",
          }} aria-hidden="true" />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
          <span style={{
            fontSize: 13, fontWeight: conv.unread ? 700 : 500,
            color: conv.unread ? "var(--foreground)" : "var(--text-secondary)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            maxWidth: "calc(100% - 38px)",
          }}>
            {conv.contactName}
          </span>
          <time
            dateTime={conv.lastMessageTime.toISOString()}
            style={{
              fontSize: 10, flexShrink: 0, marginLeft: 4,
              color: conv.unread ? "var(--cyan)" : "var(--text-muted)",
              fontWeight: conv.unread ? 600 : 400,
            }}
          >
            {relativeTime(conv.lastMessageTime)}
          </time>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <p style={{
            fontSize: 11, margin: 0, flex: 1,
            color: conv.unread ? "var(--text-secondary)" : "var(--text-muted)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontWeight: conv.unread ? 500 : 400, lineHeight: 1.4,
          }}>
            {conv.lastMessage || "…"}
          </p>
        </div>
        {conv.closed && (
          <span style={{
            display: "inline-block", fontSize: 8, fontWeight: 700,
            padding: "1px 5px", marginTop: 3,
            background: "var(--surface-hover)", color: "var(--text-muted)",
            border: "1px solid var(--hairline)", borderRadius: 3,
            letterSpacing: "0.04em",
          }}>CERRADO</span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONNECT DROPDOWN
// ═══════════════════════════════════════════════════════════════
function ConnectDropdown({
  onConnectMeta,
  onConnectInstagram,
  onConnectWhatsApp,
  buttonStyle,
  buttonText = "Conectar cuenta",
  showPlusIcon = false,
  showMetaIcon = false,
}: {
  onConnectMeta: () => void;
  onConnectInstagram: () => void;
  onConnectWhatsApp: () => void;
  buttonStyle?: React.CSSProperties;
  buttonText?: string;
  showPlusIcon?: boolean;
  showMetaIcon?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "all 0.2s ease-in-out",
          ...buttonStyle,
        }}
        onMouseEnter={(e) => {
          if (buttonStyle?.background === "transparent") {
            e.currentTarget.style.background = "var(--surface-hover)";
          } else {
            e.currentTarget.style.filter = "brightness(1.15)";
          }
        }}
        onMouseLeave={(e) => {
          if (buttonStyle?.background === "transparent") {
            e.currentTarget.style.background = "transparent";
          } else {
            e.currentTarget.style.filter = "none";
          }
        }}
      >
        {showPlusIcon && <Plus style={{ width: 14, height: 14 }} />}
        {showMetaIcon && <FacebookIcon size={20} />}
        <span>{buttonText}</span>
        <ChevronDown style={{ width: 12, height: 12, opacity: 0.7, transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 260,
            background: "var(--panel-bg)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--glass-border)",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            padding: "8px 0",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "6px 14px 4px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
            Selecciona plataforma
          </div>
          {/* Facebook: Messenger DMs + FB Comments */}
          <button
            onClick={() => { onConnectMeta(); setIsOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", color: "var(--foreground)", fontFamily: "inherit", fontSize: 13, textAlign: "left", transition: "background 0.2s", width: "100%" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <FacebookIcon size={20} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 600 }}>Facebook</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Messenger DMs + Comentarios</span>
            </div>
          </button>

          {/* Instagram: IG DMs + IG Comments (publisher_instagram) */}
          <button
            onClick={() => { onConnectInstagram(); setIsOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", color: "var(--foreground)", fontFamily: "inherit", fontSize: 13, textAlign: "left", transition: "background 0.2s", width: "100%" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <InstagramIcon size={20} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 600 }}>Instagram</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>IG DMs + Comentarios (múltiples cuentas)</span>
            </div>
          </button>

          <div style={{ height: 1, background: "var(--hairline)", margin: "4px 14px" }} />

          {/* WhatsApp Business */}
          <button
            onClick={() => { onConnectWhatsApp(); setIsOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", color: "var(--foreground)", fontFamily: "inherit", fontSize: 13, textAlign: "left", transition: "background 0.2s", width: "100%" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <WhatsAppIcon size={18} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 600 }}>WhatsApp Business</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Mensajería directa oficial</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
function ConnectedBanner({
  onDisconnect,
  disconnecting,
  onConnectMeta,
  onConnectInstagram,
  onConnectWhatsApp,
  isMetaConnected,
  isIgConnected,
  isWaConnected,
  userProfile,
  waNumber,
}: {
  onDisconnect: () => void;
  disconnecting: boolean;
  onConnectMeta: () => void;
  onConnectInstagram: () => void;
  onConnectWhatsApp: () => void;
  isMetaConnected: boolean;
  isIgConnected: boolean;
  isWaConnected: boolean;
  userProfile?: { id: string; name: string | null; picture: string | null } | null;
  waNumber?: string | null;
}) {
  return (
    <div role="status" aria-label="Cuenta conectada" style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px",
      padding: "12px 16px",
      background: "var(--background)",
      borderBottom: "1px solid var(--hairline)",
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", lineHeight: 1.2 }}>Bandeja de Entrada</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {isMetaConnected ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.25)", color: "#3b82f6", padding: "3px 10px", borderRadius: 12, fontWeight: 600 }}>
                <FacebookIcon size={12} /> Facebook Conectado
              </span>
            ) : null}
            {isIgConnected ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, background: "rgba(225,48,108,0.12)", border: "1px solid rgba(225,48,108,0.3)", color: "#e1306c", padding: "3px 10px", borderRadius: 12, fontWeight: 600 }}>
                <InstagramIcon size={12} /> Instagram Conectado
              </span>
            ) : null}
            {isWaConnected ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, background: "rgba(52,183,124,0.12)", border: "1px solid rgba(52,183,124,0.25)", color: "#10b981", padding: "3px 10px", borderRadius: 12, fontWeight: 600 }}>
                <WhatsAppIcon size={12} /> WhatsApp Conectado {waNumber ? `(${waNumber})` : ""}
              </span>
            ) : null}
            {!isMetaConnected && !isIgConnected && !isWaConnected ? (
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Ninguna cuenta conectada
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {isMetaConnected && userProfile && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 16, borderRight: "1px solid var(--hairline)" }}>
            <Avatar src={userProfile.picture} name={userProfile.name || "Usuario"} size={32} color="var(--purple)" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{userProfile.name || "Usuario"}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Perfil Meta</span>
            </div>
          </div>
        )}
        
        {(isMetaConnected || isIgConnected || isWaConnected) ? (
          <div style={{ display: "flex", gap: 8 }}>
            <ConnectDropdown
              onConnectMeta={onConnectMeta}
              onConnectInstagram={onConnectInstagram}
              onConnectWhatsApp={onConnectWhatsApp}
              buttonText="Conectar más"
              buttonStyle={{
                padding: "8px 16px", borderRadius: 24,
                background: "transparent",
                border: "1px solid var(--primary)",
                color: "var(--primary)",
                fontSize: 13, fontWeight: 600,
              }}
              showPlusIcon={true}
            />
            {isMetaConnected && (
              <button style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: 24,
                background: "transparent",
                border: "1px solid var(--red)",
                color: "var(--red)",
                fontSize: 13, fontWeight: 600,
                cursor: disconnecting ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                transition: "background 0.2s",
                opacity: disconnecting ? 0.5 : 1
              }}
              onMouseEnter={e => !disconnecting && (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
              onMouseLeave={e => !disconnecting && (e.currentTarget.style.background = "transparent")}
              onClick={onDisconnect}
              disabled={disconnecting}
              >
                {disconnecting ? "Cerrando sesión..." : "Cerrar sesión Meta"}
              </button>
            )}
          </div>
        ) : (
          <ConnectDropdown
            onConnectMeta={onConnectMeta}
            onConnectInstagram={onConnectInstagram}
            onConnectWhatsApp={onConnectWhatsApp}
            buttonText="Conectar cuenta"
            buttonStyle={{
              padding: "8px 16px", borderRadius: 24,
              background: "transparent",
              border: "1px solid var(--primary)",
              color: "var(--primary)",
              fontSize: 13, fontWeight: 600,
            }}
          />
        )}
      </div>
    </div>
  );
}

function EmptyChat({
  hasAnyConnection,
  onConnectMeta,
  onConnectInstagram,
  onConnectWhatsApp,
}: {
  hasAnyConnection: boolean;
  onConnectMeta: () => void;
  onConnectInstagram: () => void;
  onConnectWhatsApp: () => void;
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 48, textAlign: "center" }} role="status">
      <div style={{ width: 60, height: 60, borderRadius: 14, background: "var(--surface-hover)", border: `1px solid var(--hairline)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {hasAnyConnection
          ? <Wifi style={{ width: 26, height: 26, color: "var(--text-muted)" }} />
          : <AlertCircle style={{ width: 26, height: 26, color: "var(--red)" }} />
        }
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: "0 0 5px" }}>
          {hasAnyConnection ? "Esperando mensajes" : "Sin cuentas conectadas"}
        </p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, maxWidth: 260, lineHeight: 1.6 }}>
          {hasAnyConnection
            ? "Los mensajes nuevos aparecerán en la lista izquierda automáticamente."
            : "Conecta Facebook, Instagram o WhatsApp para recibir mensajes."
          }
        </p>
      </div>
      {!hasAnyConnection && (
        <ConnectDropdown
          onConnectMeta={onConnectMeta}
          onConnectInstagram={onConnectInstagram}
          onConnectWhatsApp={onConnectWhatsApp}
          buttonText="Conectar cuenta"
          showPlusIcon={true}
          buttonStyle={{
            padding: "9px 18px", borderRadius: 8,
            background: "var(--primary)",
            color: "var(--foreground)",
            border: "none",
            fontSize: 13, fontWeight: 600,
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN INBOX LAYOUT
// ═══════════════════════════════════════════════════════════════
export function InboxLayout() {
  const { data: session } = useSession();
  const currentAssignee = session?.user?.name || "Ana";
  
  const [showProfile, setShowProfile] = useState(false);
  const [connectedPages, setConnectedPages] = useState<ConnectedPage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, { connected: boolean; connectedAt: string | null; pages: any[]; phoneNumber?: string | null }>>({});
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectToast, setConnectToast] = useState<string | null>(null);
  
  const [isDesktop, setIsDesktop] = useState(true);
  const queueRef = useRef<HTMLDivElement>(null);
  const [userProfile, setUserProfile] = useState<{ id: string; name: string | null; picture: string | null } | null>(null);

  const {
    conversations, selectedId, initialFetchDone, isRefreshing,
    fetchConversations, handleSelectConversation, handleSendMessage,
    handleCloseConversation, handleAssign, handleAddTag, handleRemoveTag,
    handleAddNote, handleDeleteNote
  } = useInboxData();

  const {
    searchQuery, setSearchQuery, selectedPage, setSelectedPage,
    channelFilter, setChannelFilter, channelFilterOpen, setChannelFilterOpen,
    queueFilter, setQueueFilter, queueMenuOpen, setQueueMenuOpen,
    filteredConversations: filtered, platformCounts, CHANNEL_TABS, QUEUE_TABS
  } = useInboxFilters(conversations, currentAssignee);

  useEffect(() => {
    try { setShowProfile(localStorage.getItem("zefirus:inbox-profile") === "1"); } catch { /* ignore */ }
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const toggleProfile = () => setShowProfile(prev => {
    const next = !prev;
    try { localStorage.setItem("zefirus:inbox-profile", next ? "1" : "0"); } catch { /* ignore */ }
    return next;
  });

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (queueRef.current && !queueRef.current.contains(e.target as Node)) setQueueMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fetchConnectionStatus = useCallback(() => {
    fetch("/api/connect/status")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.modules) return;
        setConnectionStatus(data.modules);
        if (data.userProfile) setUserProfile(data.userProfile);
        else if (data.modules.community?.userProfile) setUserProfile(data.modules.community.userProfile);
        const pages: ConnectedPage[] = [];
        const seen = new Set<string>();

        // Facebook Pages (community module)
        const communityMod = data.modules.community;
        if (communityMod && communityMod.connected) {
          (communityMod.pages || []).forEach((p: any) => {
            if (seen.has(p.id)) return;
            seen.add(p.id);
            pages.push({ id: p.id, name: p.name || "Página", picture: p.picture || null, platform: "facebook" });
            if (p.instagram_business_account?.id) {
              const igId = p.instagram_business_account.id;
              if (!seen.has(igId)) {
                seen.add(igId);
                pages.push({ id: igId, name: p.instagram_business_account.name || p.name, picture: p.instagram_business_account.picture || p.picture, platform: "instagram", igId });
              }
            }
          });
        }

        // Instagram accounts (publisher_instagram module — multiple IG accounts)
        const igMod = data.modules.publisher_instagram;
        if (igMod && igMod.connected) {
          (igMod.pages || []).forEach((p: any) => {
            // Agregar la página FB si no está ya (necesaria para el page token)
            if (!seen.has(p.id)) {
              seen.add(p.id);
              pages.push({ id: p.id, name: p.name || "Página", picture: p.picture || null, platform: "facebook" });
            }
            // Agregar la cuenta de IG vinculada
            const igId: string | null = p.instagramId || p.instagram_business_account?.id || null;
            const igName: string = p.instagram_business_account?.name || p.instagramUsername || p.name;
            if (igId && !seen.has(igId)) {
              seen.add(igId);
              pages.push({ id: igId, name: igName, picture: p.instagram_business_account?.picture || p.picture || null, platform: "instagram", igId });
            }
          });
        }

        setConnectedPages(pages);
      }).catch(() => {});
  }, []);

  useEffect(() => { fetchConnectionStatus(); }, [fetchConnectionStatus]);

  const handleDisconnect = async () => {
    if (disconnecting) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/connect/disconnect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: "community" }) });
      if (res.ok) fetchConnectionStatus();
    } catch { /* ignore */ }
    setDisconnecting(false);
  };

  const handleConnectSuccess = useCallback(() => {
    setConnectToast("¡Conectado! Ahora puedes recibir mensajes.");
    fetchConnectionStatus();
    fetchConversations();
    setTimeout(() => setConnectToast(null), 5000);
  }, [fetchConnectionStatus, fetchConversations]);

  const handleConnectInstagram = useCallback(() => {
    openConnectPopup("publisher_instagram", handleConnectSuccess);
  }, [handleConnectSuccess]);

  const hasAnyConnection = Object.values(connectionStatus).some(m => m?.connected);
  const selected = filtered.find(c => c.id === selectedId) || (isDesktop ? filtered[0] : null) || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, height: "calc(100vh - 200px)" }}>
      {/* CONNECTED BANNER */}
      <ConnectedBanner
        onDisconnect={handleDisconnect}
        disconnecting={disconnecting} 
        onConnectMeta={() => openConnectPopup("community", handleConnectSuccess)} 
        onConnectInstagram={handleConnectInstagram}
        onConnectWhatsApp={() => window.location.href = "/dashboard/integrations/whatsapp"} 
        isMetaConnected={connectionStatus["community"]?.connected || false}
        isIgConnected={connectionStatus["publisher_instagram"]?.connected || false}
        isWaConnected={connectionStatus["whatsapp_business"]?.connected || false}
        userProfile={userProfile}
        waNumber={connectionStatus["whatsapp_business"]?.phoneNumber}
      />

      {/* 3-PANEL LAYOUT — always visible */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* LEFT: Conversation List */}
        <div
          className={`w-full md:w-[300px] md:min-w-[300px] flex-col ${selected && !isDesktop ? "hidden" : "flex"}`}
          style={{ borderRight: "1px solid var(--hairline)", background: "transparent", overflow: "visible", position: "relative" }}
          role="navigation" aria-label="Conversaciones"
        >
          {/* Page selector */}
          {connectedPages.length > 0 && (
            <div style={{ padding: "8px 12px 6px", borderBottom: "1px solid var(--hairline)", flexShrink: 0, position: "relative", zIndex: 100 }}>
              <PageSelector pages={connectedPages} selectedPage={selectedPage} onSelect={setSelectedPage} />
            </div>
          )}

          {/* Platform filter */}
          <div style={{ borderBottom: "1px solid var(--hairline)", flexShrink: 0 }}>
            <button
              onClick={() => setChannelFilterOpen(o => !o)}
              aria-expanded={channelFilterOpen}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "7px 12px", background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Filter style={{ width: 9, height: 9 }} />
                Plataforma
                {channelFilter !== "all" && <span style={{ width: 5, height: 5, borderRadius: "50%", background: CHANNEL_TABS.find(t => t.key === channelFilter)?.color || "var(--primary)", display: "inline-block" }} />}
              </span>
              {channelFilterOpen ? <ChevronUp style={{ width: 10, height: 10 }} /> : <ChevronDown style={{ width: 10, height: 10 }} />}
            </button>
            {channelFilterOpen && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "0 10px 8px" }} role="group" aria-label="Filtrar por plataforma">
                {CHANNEL_TABS.map(tab => {
                  const count = tab.key === "all" ? conversations.length : (platformCounts[tab.key] || 0);
                  const isActive = channelFilter === tab.key;
                  if (tab.key !== "all" && count === 0) return null;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setChannelFilter(tab.key as ChannelFilter)}
                      aria-pressed={isActive}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6,
                        border: `1px solid ${isActive ? `${tab.color}66` : "var(--hairline)"}`,
                        background: isActive ? `${tab.color}16` : "transparent",
                        color: isActive ? tab.color : "var(--text-muted)",
                        fontSize: 10, fontWeight: isActive ? 700 : 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                      }}
                    >
                      {tab.key !== "all" && <PlatformIcon platform={tab.platforms[0] as Platform} size={12} />}
                      {tab.label}
                      {isActive && <span style={{ minWidth: 14, height: 14, borderRadius: 7, padding: "0 3px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: `${tab.color}28`, color: tab.color, fontSize: 9, fontWeight: 700 }}>{count}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search + Queue + Refresh */}
          <div style={{ padding: "6px 10px 8px", display: "flex", gap: 5, alignItems: "center", borderBottom: "1px solid var(--hairline)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", flex: 1, background: "var(--surface-hover)", borderRadius: 7, border: "1px solid var(--hairline)" }}>
              <Search style={{ width: 13, height: 13, color: "var(--text-muted)", flexShrink: 0 }} />
              <input
                type="search" placeholder="Buscar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                aria-label="Buscar conversaciones"
                style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 12, width: "100%", fontFamily: "inherit" }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} aria-label="Limpiar" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                  <X style={{ width: 11, height: 11 }} />
                </button>
              )}
            </div>
            
            <div ref={queueRef} style={{ position: "relative", flexShrink: 0 }}>
              {(() => {
                const active = QUEUE_TABS.find(t => t.key === queueFilter) || QUEUE_TABS[0];
                const isF = queueFilter !== "all";
                return (
                  <button onClick={() => setQueueMenuOpen(o => !o)} aria-haspopup="listbox" aria-expanded={queueMenuOpen} title={active.label}
                    style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "7px 7px", borderRadius: 7, border: `1px solid ${isF ? `${active.color}55` : "var(--hairline)"}`, background: isF ? `${active.color}10` : "var(--surface-hover)", color: isF ? active.color : "var(--text-muted)", cursor: "pointer", fontFamily: "inherit" }}>
                    <Filter style={{ width: 12, height: 12 }} />
                    {isF && <div style={{ width: 5, height: 5, borderRadius: "50%", background: active.color }} />}
                    <ChevronDown style={{ width: 9, height: 9, opacity: 0.7 }} />
                  </button>
                );
              })()}
              {queueMenuOpen && (
                <div role="listbox" style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, minWidth: 195, background: "var(--panel-bg)",  border: "1px solid var(--glass-border)", borderRadius: 10, zIndex: 9999, overflow: "hidden", boxShadow: "var(--shadow-hard)" }}>
                  {QUEUE_TABS.map(tab => {
                    const count = conversations.filter(c => {
                      if (tab.key === "all") return true;
                      if (tab.key === "unassigned") return !c.assignedTo;
                      if (tab.key === "mine") return c.assignedTo === currentAssignee;
                      if (tab.key === "needs_reply") return !c.closed && c.unread;
                      if (tab.key === "done") return c.closed;
                      return true;
                    }).length;
                    const isA = queueFilter === tab.key;
                    return (
                      <button key={tab.key} role="option" aria-selected={isA} onClick={() => { setQueueFilter(tab.key as QueueFilter); setQueueMenuOpen(false); }}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%", padding: "8px 14px", background: isA ? `${tab.color}10` : "transparent", border: "none", borderBottom: "1px solid var(--hairline)", borderLeft: isA ? `3px solid ${tab.color}` : "3px solid transparent", color: isA ? tab.color : "var(--text-secondary)", fontSize: 12, fontWeight: isA ? 600 : 400, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                        {tab.label}
                        <span style={{ minWidth: 18, height: 18, borderRadius: 9, padding: "0 5px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: isA ? `${tab.color}25` : "var(--surface-hover)", color: isA ? tab.color : "var(--text-secondary)", fontSize: 10, fontWeight: 700 }}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            <button onClick={() => fetchConversations()} disabled={isRefreshing} title="Actualizar" aria-label="Actualizar conversaciones"
              style={{ padding: 7, borderRadius: 7, border: "1px solid var(--hairline)", background: "var(--surface-hover)", cursor: "pointer", color: "var(--text-muted)", display: "flex", opacity: isRefreshing ? 0.5 : 1 }}>
              <RefreshCw style={{ width: 12, height: 12, animation: isRefreshing ? "spin 0.6s linear infinite" : "none" }} />
            </button>
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }} role="list">
            {!initialFetchDone ? (
              <ConversationSkeleton />
            ) : filtered.length === 0 ? (
              <div style={{ padding: "28px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 6px" }}>
                  {searchQuery ? "Sin resultados" : channelFilter !== "all" ? "Sin mensajes en este canal" : "Sin conversaciones aún"}
                </p>
                {searchQuery && <button onClick={() => setSearchQuery("")} style={{ fontSize: 11, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Limpiar búsqueda</button>}
                {!hasAnyConnection && !searchQuery && (
                  <div style={{ marginTop: 10 }}>
                    <ConnectDropdown
                      onConnectMeta={() => openConnectPopup("community", handleConnectSuccess)}
                      onConnectInstagram={handleConnectInstagram}
                      onConnectWhatsApp={() => window.location.href = "/dashboard/integrations/whatsapp"}
                      buttonText="Conectar cuenta"
                      showPlusIcon={true}
                      buttonStyle={{
                        padding: "7px 14px", borderRadius: 7,
                        background: "var(--primary)",
                        color: "var(--foreground)",
                        border: "none",
                        fontSize: 11, fontWeight: 600,
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              filtered.map(conv => (
                <div key={conv.id} role="listitem">
                  <ConversationRow conv={conv} isActive={conv.id === selectedId} onClick={() => handleSelectConversation(conv.id)} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* CENTER: Chat / Post view */}
        <div
          className={`flex-1 flex-col min-w-0 ${selected || isDesktop ? "flex" : "hidden"}`}
          style={{ background: "var(--background)" }}
          role="main" aria-label="Conversación activa"
        >
          <ErrorBoundary name="InboxConversation" fallback={
            <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40, textAlign: "center" }}>
              <AlertCircle style={{ width: 28, height: 28, color: "var(--red)" }} />
              <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 280 }}>No se pudo mostrar esta conversación.</p>
            </div>
          }>
            {!selected ? (
              <EmptyChat
                hasAnyConnection={hasAnyConnection}
                onConnectMeta={() => openConnectPopup("community", handleConnectSuccess)}
                onConnectInstagram={handleConnectInstagram}
                onConnectWhatsApp={() => window.location.href = "/dashboard/integrations/whatsapp"}
              />
            ) : selected.platform === "fb_comment" || selected.platform === "ig_comment" || selected.platform === "instagram_comment" ? (
              <PostView conversation={selected} onBack={() => handleSelectConversation("")} />
            ) : (
              <ChatView conversation={selected} onSend={(text) => handleSendMessage(text, selected)} onClose={() => handleCloseConversation(selected)} onToggleProfile={toggleProfile} showProfile={showProfile} onBack={() => handleSelectConversation("")} />
            )}
          </ErrorBoundary>
        </div>

        {/* RIGHT: Contact profile */}
        {showProfile && selected && (
          <div
            className="absolute inset-y-0 right-0 z-20 w-[280px] md:static md:w-[280px] md:min-w-[280px] shadow-2xl md:shadow-none flex flex-col"
            style={{ background: "var(--background)", borderLeft: "1px solid var(--glass-border)", overflow: "hidden" }}
            role="complementary" aria-label="Perfil del contacto"
          >
            <ContactProfile conversation={selected} onAssign={(member) => handleAssign(selected, member)} onAddTag={(tag) => handleAddTag(selected, tag)} onRemoveTag={(tag) => handleRemoveTag(selected, tag)} onAddNote={(content) => handleAddNote(selected, content)} onDeleteNote={(noteId) => handleDeleteNote(selected, noteId)} onClose={toggleProfile} />
          </div>
        )}
      </div>

      {connectToast && (
        <div role="alert" aria-live="polite" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--green)", color: "var(--foreground)", padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 999, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 style={{ width: 15, height: 15 }} />
          {connectToast}
          <button onClick={() => setConnectToast(null)} aria-label="Cerrar" style={{ background: "none", border: "none", color: "var(--foreground)", cursor: "pointer", padding: 2, display: "flex" }}>
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
