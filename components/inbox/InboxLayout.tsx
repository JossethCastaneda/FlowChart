"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { openConnectPopup } from "@/lib/connect-popup";

import {
  Search, X, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Filter, Unplug, Wifi,
  RefreshCw, Plus,
} from "lucide-react";
import {
  Message, Conversation,
  ConnectedPage, Platform, ChannelFilter, QueueFilter,
} from "./types";
import { relativeTime, getPlatformConfig, getInitials } from "./utils";
import { PageSelector, PostView, ChatView, ContactProfile } from "./InboxComponents";

// ═══════════════════════════════════════════════════════════════
// OFFICIAL PLATFORM ICONS (Brand-accurate inline SVG)
// ═══════════════════════════════════════════════════════════════

function IconMessenger({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="msg-g" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00B2FF" />
          <stop offset="100%" stopColor="#006AFF" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill="url(#msg-g)" />
      <path d="M12 3C7.03 3 3 6.84 3 11.55c0 2.72 1.35 5.15 3.47 6.74V21l3.06-1.68c.82.23 1.68.35 2.47.35 4.97 0 9-3.84 9-8.45C21 6.84 16.97 3 12 3zm.94 11.38l-2.29-2.44-4.47 2.44 4.92-5.24 2.34 2.44 4.42-2.44-4.92 5.24z" fill="white" />
    </svg>
  );
}

function IconFacebook({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path d="M16.67 15.5l.48-3.1h-2.97v-2.01c0-.85.41-1.67 1.74-1.67h1.35V6.1s-1.22-.21-2.39-.21c-2.44 0-4.04 1.48-4.04 4.15V12.4H8v3.1h2.84V23h3.34v-7.5h2.49z" fill="white" />
    </svg>
  );
}

function IconInstagram({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <radialGradient id="ig-g" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#ffd676" />
          <stop offset="25%" stopColor="#f86f2b" />
          <stop offset="55%" stopColor="#d62976" />
          <stop offset="75%" stopColor="#962fbf" />
          <stop offset="100%" stopColor="#4f5bd5" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-g)" />
      <rect x="6.5" y="6.5" width="11" height="11" rx="3" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="2.7" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="16" cy="8" r="0.8" fill="white" />
    </svg>
  );
}

function IconWhatsApp({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#25D366" />
      <path d="M17.47 6.53A7.6 7.6 0 0012 4.4a7.62 7.62 0 00-6.6 11.44l-1.04 3.8 3.9-1.02A7.62 7.62 0 0012 19.6a7.62 7.62 0 007.62-7.62c0-2.04-.8-3.95-2.15-5.45zM12 18.36a6.35 6.35 0 01-3.23-.89l-.23-.14-2.39.63.64-2.33-.15-.24A6.36 6.36 0 1112 18.36zm3.49-4.75c-.19-.1-1.13-.56-1.3-.62-.18-.06-.3-.1-.43.1-.13.19-.5.62-.62.75-.11.13-.23.15-.42.05a5.26 5.26 0 01-1.55-.95 5.79 5.79 0 01-1.07-1.33c-.11-.2-.01-.3.08-.4.09-.08.19-.23.28-.34.1-.11.13-.19.2-.32.06-.13.03-.25-.02-.35-.05-.1-.43-1.03-.59-1.41-.15-.37-.31-.32-.43-.32h-.36c-.13 0-.33.05-.5.25-.17.2-.66.64-.66 1.57s.68 1.82.77 1.95c.1.12 1.33 2.04 3.23 2.86.45.19.8.31 1.08.4.45.14.87.12 1.19.07.36-.05 1.12-.46 1.28-.9.16-.45.16-.83.11-.91-.05-.08-.18-.13-.37-.23z" fill="white" />
    </svg>
  );
}

export function PlatformIcon({ platform, size = 16 }: { platform: Platform; size?: number }) {
  switch (platform) {
    case "fb_messenger": return <IconMessenger size={size} />;
    case "fb_comment":   return <IconFacebook size={size} />;
    case "ig_dm":
    case "instagram_dm":
    case "ig_comment":
    case "instagram_comment": return <IconInstagram size={size} />;
    case "whatsapp":     return <IconWhatsApp size={size} />;
    default:             return <IconMessenger size={size} />;
  }
}

// ═══════════════════════════════════════════════════════════════
// TABS CONFIG
// ═══════════════════════════════════════════════════════════════

const CHANNEL_TABS: { key: ChannelFilter; label: string; color: string; platforms: Platform[] }[] = [
  { key: "all",        label: "Todo",              color: "#9b7be8", platforms: [] },
  { key: "messenger",  label: "Messenger",         color: "#006AFF", platforms: ["fb_messenger"] },
  { key: "instagram",  label: "Instagram DM",      color: "#d62976", platforms: ["ig_dm", "instagram_dm"] },
  { key: "fb_comment", label: "FB Comentarios",    color: "#1877F2", platforms: ["fb_comment"] },
  { key: "ig_comment", label: "IG Comentarios",    color: "#f86f2b", platforms: ["ig_comment", "instagram_comment"] },
  { key: "whatsapp",   label: "WhatsApp",          color: "#25D366", platforms: ["whatsapp"] },
];

const QUEUE_TABS: { key: QueueFilter; label: string; color: string }[] = [
  { key: "all",         label: "Todos",             color: "#9b7be8" },
  { key: "unassigned",  label: "Sin asignar",        color: "#f59e0b" },
  { key: "mine",        label: "Mías",               color: "#10b981" },
  { key: "needs_reply", label: "Requiere respuesta", color: "#ef4444" },
  { key: "done",        label: "Cerradas",           color: "#6b7280" },
];

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
        padding: "10px 14px",
        cursor: "pointer",
        background: isActive ? "rgba(155,123,232,0.07)" : "transparent",
        borderLeft: isActive ? "3px solid #9b7be8" : "3px solid transparent",
        borderBottom: "1px solid var(--hairline)",
        display: "flex", gap: 10, alignItems: "flex-start",
        transition: "background 0.1s, border-left-color 0.1s",
        outline: "none",
      }}
      onMouseOver={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
      onMouseOut={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
      onFocus={e => { e.currentTarget.style.boxShadow = "inset 0 0 0 2px #9b7be8"; }}
      onBlur={e => { e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Avatar + Platform badge */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        {conv.contactAvatar ? (
          <img src={conv.contactAvatar} alt="" role="presentation"
            style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            background: `linear-gradient(135deg, ${pc.color}20, ${pc.color}08)`,
            border: `1.5px solid ${pc.color}28`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: pc.color,
          }}>
            {getInitials(conv.contactName)}
          </div>
        )}
        {/* Official platform badge */}
        <div style={{
          position: "absolute", bottom: -3, right: -3,
          width: 19, height: 19, borderRadius: "50%",
          background: "var(--background)", border: "2px solid var(--background)",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          <PlatformIcon platform={conv.platform} size={17} />
        </div>
        {/* Unread indicator */}
        {conv.unread && (
          <div style={{
            position: "absolute", top: 0, left: 0,
            width: 9, height: 9, borderRadius: "50%",
            background: "#9b7be8", border: "2px solid var(--background)",
          }} aria-hidden="true" />
        )}
      </div>

      {/* Text content */}
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
              color: conv.unread ? "#9b7be8" : "var(--text-muted)",
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
        {/* Bot Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "2px 6px", marginTop: 4,
          background: "var(--surface-hover)", border: "1px solid var(--hairline)",
          borderRadius: 4, fontSize: 9, color: "var(--text-secondary)", fontWeight: 500
        }}>
          <PlatformIcon platform={conv.platform} size={10} />
          Bot Prepago OCR
        </div>
        {conv.closed && (
          <span style={{
            display: "inline-block", fontSize: 8, fontWeight: 700,
            padding: "1px 5px", marginTop: 3, marginLeft: 4,
            background: "rgba(107,114,128,0.1)", color: "#6b7280",
            border: "1px solid rgba(107,114,128,0.2)", borderRadius: 3,
            letterSpacing: "0.04em",
          }}>CERRADO</span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONNECTED BANNER
// ═══════════════════════════════════════════════════════════════

function ConnectedBanner({ connectedPages, onDisconnect, disconnecting }: {
  connectedPages: ConnectedPage[];
  onDisconnect: () => void;
  disconnecting: boolean;
}) {
  const page = connectedPages[0];

  return (
    <div role="status" aria-label="Cuenta conectada" style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 24px",
      background: "var(--background)",
      borderBottom: "1px solid var(--hairline)",
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {page ? (
          <>
            <img 
              src={page.picture || `https://ui-avatars.com/api/?name=${page.name}&background=1877F2&color=fff`} 
              alt={page.name} 
              style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--hairline)" }} 
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)" }}>{page.name}</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>@{page.name.toLowerCase().replace(/\s+/g, '')}</span>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)" }}>Bandeja de Entrada</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Ninguna cuenta conectada</span>
          </div>
        )}
      </div>

      <button style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 16px", borderRadius: 24,
        background: "transparent",
        border: "1px solid rgba(0, 106, 255, 0.4)",
        color: "#006AFF",
        fontSize: 13, fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background 0.2s"
      }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(0, 106, 255, 0.05)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z" />
        </svg>
        Conectar Facebook
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EMPTY CHAT PANEL
// ═══════════════════════════════════════════════════════════════

function EmptyChat({ hasAnyConnection, onConnect }: { hasAnyConnection: boolean; onConnect: () => void }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 48, textAlign: "center" }} role="status">
      <div style={{ width: 60, height: 60, borderRadius: 14, background: hasAnyConnection ? "rgba(155,123,232,0.06)" : "rgba(239,68,68,0.05)", border: `1px solid ${hasAnyConnection ? "rgba(155,123,232,0.12)" : "rgba(239,68,68,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {hasAnyConnection
          ? <Wifi style={{ width: 26, height: 26, color: "rgba(155,123,232,0.45)" }} />
          : <AlertCircle style={{ width: 26, height: 26, color: "rgba(239,68,68,0.4)" }} />
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
        <button onClick={onConnect} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, background: "#1877F2", color: "white", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>
          <Plus style={{ width: 14, height: 14 }} />
          Conectar cuenta
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN INBOX LAYOUT
// ═══════════════════════════════════════════════════════════════

export function InboxLayout() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [connectedPages, setConnectedPages] = useState<ConnectedPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<ConnectedPage | null>(null);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [channelFilterOpen, setChannelFilterOpen] = useState(true);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [queueMenuOpen, setQueueMenuOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, { connected: boolean; connectedAt: string | null; pages: any[] }>>({});
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectToast, setConnectToast] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queueRef = useRef<HTMLDivElement>(null);
  const currentAssignee = session?.user?.name || "Ana";

  useEffect(() => {
    try { setShowProfile(localStorage.getItem("sodare:inbox-profile") === "1"); } catch { /* ignore */ }
  }, []);

  const toggleProfile = () => setShowProfile(prev => {
    const next = !prev;
    try { localStorage.setItem("sodare:inbox-profile", next ? "1" : "0"); } catch { /* ignore */ }
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
        const pages: ConnectedPage[] = [];
        const seen = new Set<string>();
        Object.values(data.modules).forEach((mod: any) => {
          (mod.pages || []).forEach((p: any) => {
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
        });
        setConnectedPages(pages);
      }).catch(() => {});
  }, []);

  useEffect(() => { fetchConnectionStatus(); }, [fetchConnectionStatus]);

  const mapConversations = useCallback((raw: any[]): Conversation[] => {
    const pm: Record<string, Platform> = {
      facebook_messenger: "fb_messenger", instagram_dm: "instagram_dm", ig_dm: "ig_dm",
      ig_comment: "ig_comment", instagram_comment: "instagram_comment",
      facebook_comment: "fb_comment", whatsapp: "whatsapp",
    };
    return raw.map(c => ({
      id: c.id, contactName: c.contactName || "Usuario", contactAvatar: c.contactAvatar || null,
      platform: (pm[c.platform] || "fb_messenger") as Platform,
      lastMessage: c.lastMessage || "", lastMessageTime: new Date(c.lastMessageAt || Date.now()),
      unread: c.unread || false, closed: false, assignedTo: null, tags: [], messages: [],
      pageId: c.pageId, contactId: c.contactId, _pageId: c.pageId, _pageName: c.pageName, _postData: c._postData || null,
    }));
  }, []);

  const fetchConversations = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch("/api/inbox/conversations");
      if (res.ok) {
        const data = await res.json();
        if (data.conversations?.length > 0) {
          const mapped = mapConversations(data.conversations);
          // Sort by lastMessageTime descending — most recent at top
          mapped.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
          setConversations(prev => {
            const prevMap = new Map(prev.map(c => [c.id, c]));
            return mapped.map(c => ({ ...c, messages: prevMap.get(c.id)?.messages || [] }));
          });
          setSelectedId(prev => prev || mapped[0]?.id || "");
          // Prefetch first 3 conversations' messages
          const prefetchers = mapped.slice(0, 3).map(conv => {
            const pageId = (conv as any)._pageId;
            return fetch(`/api/inbox/messages?conversationId=${conv.id}&pageId=${pageId || ""}`)
              .then(r => r.ok ? r.json() : null)
              .then(d => ({ id: conv.id, messages: d?.messages?.map((m: any) => ({ id: m.id, text: m.text, incoming: m.incoming, timestamp: new Date(m.timestamp) })) || null }))
              .catch(() => ({ id: conv.id, messages: null }));
          });
          Promise.all(prefetchers).then(results => {
            setConversations(prev => prev.map(c => {
              const r = results.find(x => x.id === c.id);
              return r?.messages ? { ...c, messages: r.messages } : c;
            }));
          });
        }
      }
    } catch { /* silent */ }
    setInitialFetchDone(true);
    setIsRefreshing(false);
  }, [mapConversations]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Poll every 30 seconds
  useEffect(() => {
    const id = setInterval(() => fetchConversations(true), 30_000);
    return () => clearInterval(id);
  }, [fetchConversations]);

  const handleDisconnect = async () => {
    if (disconnecting) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/connect/disconnect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ module: "community" }) });
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

  const hasAnyConnection = Object.values(connectionStatus).some(m => m?.connected);

  const filtered = useMemo(() => conversations.filter(c => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.contactName.toLowerCase().includes(q) && !c.lastMessage.toLowerCase().includes(q)) return false;
    }
    if (selectedPage) {
      const pid = (c as any)?._pageId;
      if (pid && pid !== selectedPage.id) return false;
    }
    if (channelFilter !== "all") {
      const tab = CHANNEL_TABS.find(t => t.key === channelFilter);
      if (tab && tab.platforms.length > 0 && !tab.platforms.includes(c.platform)) return false;
    }
    if (queueFilter === "unassigned" && c.assignedTo) return false;
    if (queueFilter === "mine" && c.assignedTo !== currentAssignee) return false;
    if (queueFilter === "needs_reply" && (c.closed || !c.unread)) return false;
    if (queueFilter === "done" && !c.closed) return false;
    return true;
  }), [conversations, searchQuery, selectedPage, channelFilter, queueFilter, currentAssignee]);

  const isDesktop = typeof window !== "undefined" ? window.innerWidth >= 768 : true;
  const selected = filtered.find(c => c.id === selectedId) || (isDesktop ? filtered[0] : null) || null;

  const platformCounts = useMemo(() => conversations.reduce((acc, c) => {
    CHANNEL_TABS.forEach(tab => {
      if (tab.key !== "all" && tab.platforms.includes(c.platform))
        acc[tab.key] = (acc[tab.key] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>), [conversations]);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: false } : c));
    const conv = conversations.find(c => c.id === id);
    const pageId = (conv as any)?._pageId;
    fetch(`/api/inbox/messages?conversationId=${id}&pageId=${pageId || ""}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.messages?.length) {
          const msgs: Message[] = data.messages.map((m: any) => ({ id: m.id, text: m.text, incoming: m.incoming, timestamp: new Date(m.timestamp) }));
          setConversations(prev => prev.map(c => c.id === id ? { ...c, messages: msgs } : c));
        }
      }).catch(() => {});
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !selected) return;
    const newMsg: Message = { id: `${selected.id}_${Date.now()}`, text: text.trim(), incoming: false, timestamp: new Date() };
    setConversations(prev => {
      const updated = prev.map(c => c.id === selected.id ? { ...c, messages: [...c.messages, newMsg], lastMessage: text.trim(), lastMessageTime: new Date() } : c);
      return [...updated].sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
    });
    try {
      const pageId = (selected as any)._pageId || selected.pageId || "";
      const recipientId = selected.contactId || selected.id.replace("igc_", "").replace("fbc_", "");
      await fetch("/api/inbox/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: selected.id, pageId, recipientId, message: text.trim(), platform: selected.platform }) });
    } catch { /* ignore */ }
  };

  const handleCloseConversation = () => {
    if (!selected) return;
    setConversations(prev => prev.map(c => c.id === selected.id ? { ...c, closed: !c.closed } : c));
  };

  const handleAssign = (member: string) =>
    setConversations(prev => prev.map(c => c.id === selected?.id ? { ...c, assignedTo: member === "Sin asignar" ? null : member } : c));
  const handleAddTag = (tag: string) =>
    setConversations(prev => prev.map(c => c.id === selected?.id && !c.tags.includes(tag.trim()) ? { ...c, tags: [...c.tags, tag.trim()] } : c));
  const handleRemoveTag = (tag: string) =>
    setConversations(prev => prev.map(c => c.id === selected?.id ? { ...c, tags: c.tags.filter(t => t !== tag) } : c));

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, height: "calc(100vh - 200px)" }}>

      {/* CONNECTED BANNER */}
      <ConnectedBanner connectedPages={connectedPages} onDisconnect={handleDisconnect} disconnecting={disconnecting} />

      {/* 3-PANEL LAYOUT — always visible */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

        {/* LEFT: Conversation List */}
        <div
          className={`w-full md:w-[300px] md:min-w-[300px] flex-col ${selected ? "hidden md:flex" : "flex"}`}
          style={{ borderRight: "1px solid var(--hairline)", background: "var(--surface)", overflow: "hidden" }}
          role="navigation" aria-label="Conversaciones"
        >
          {/* Page selector */}
          {connectedPages.length > 0 && (
            <div style={{ padding: "8px 12px 6px", borderBottom: "1px solid var(--hairline)", flexShrink: 0 }}>
              <PageSelector pages={connectedPages} selectedPage={selectedPage} onSelect={setSelectedPage} />
            </div>
          )}

          {/* Platform filter (collapsible) */}
          <div style={{ borderBottom: "1px solid var(--hairline)", flexShrink: 0 }}>
            <button
              onClick={() => setChannelFilterOpen(o => !o)}
              aria-expanded={channelFilterOpen}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "7px 12px", background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Filter style={{ width: 9, height: 9 }} />
                Plataforma
                {channelFilter !== "all" && <span style={{ width: 5, height: 5, borderRadius: "50%", background: CHANNEL_TABS.find(t => t.key === channelFilter)?.color || "#9b7be8", display: "inline-block" }} />}
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
                      onClick={() => setChannelFilter(tab.key)}
                      aria-pressed={isActive}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6,
                        border: `1px solid ${isActive ? `${tab.color}66` : "var(--hairline)"}`,
                        background: isActive ? `${tab.color}16` : "transparent",
                        color: isActive ? tab.color : "var(--text-muted)",
                        fontSize: 10, fontWeight: isActive ? 700 : 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                      }}
                    >
                      {tab.key !== "all" && <PlatformIcon platform={tab.platforms[0]} size={12} />}
                      {tab.label}
                      <span style={{ minWidth: 14, height: 14, borderRadius: 7, padding: "0 3px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: isActive ? `${tab.color}28` : "var(--surface-hover)", color: isActive ? tab.color : "var(--text-secondary)", fontSize: 9, fontWeight: 700 }}>{count}</span>
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
                type="search" placeholder="Escriba aquí para filtrar la..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                aria-label="Buscar conversaciones"
                style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 12, width: "100%", fontFamily: "inherit" }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} aria-label="Limpiar" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                  <X style={{ width: 11, height: 11 }} />
                </button>
              )}
            </div>
            {/* Queue filter */}
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
                <div role="listbox" style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, minWidth: 195, background: "var(--panel-bg)", border: "1px solid var(--hairline)", borderRadius: 10, zIndex: 50, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
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
                      <button key={tab.key} role="option" aria-selected={isA} onClick={() => { setQueueFilter(tab.key); setQueueMenuOpen(false); }}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%", padding: "8px 14px", background: isA ? `${tab.color}10` : "transparent", border: "none", borderBottom: "1px solid var(--hairline)", borderLeft: isA ? `3px solid ${tab.color}` : "3px solid transparent", color: isA ? tab.color : "var(--text-secondary)", fontSize: 12, fontWeight: isA ? 600 : 400, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                        {tab.label}
                        <span style={{ minWidth: 18, height: 18, borderRadius: 9, padding: "0 5px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: isA ? `${tab.color}25` : "var(--surface-hover)", color: isA ? tab.color : "var(--text-secondary)", fontSize: 10, fontWeight: 700 }}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Refresh */}
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
                  {searchQuery ? "Sin resultados para tu búsqueda" : channelFilter !== "all" ? "Sin mensajes en este canal" : "Sin conversaciones aún"}
                </p>
                {searchQuery && <button onClick={() => setSearchQuery("")} style={{ fontSize: 11, color: "#9b7be8", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Limpiar búsqueda</button>}
                {!hasAnyConnection && !searchQuery && (
                  <button onClick={() => openConnectPopup("community", handleConnectSuccess)}
                    style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 7, background: "#1877F2", color: "white", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>
                    <Plus style={{ width: 11, height: 11 }} />
                    Conectar cuenta
                  </button>
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
          className={`flex-1 flex-col min-w-0 ${selected ? "flex" : "hidden md:flex"}`}
          style={{ background: "var(--background)" }}
          role="main" aria-label="Conversación activa"
        >
          <ErrorBoundary name="InboxConversation" fallback={
            <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40, textAlign: "center" }}>
              <AlertCircle style={{ width: 28, height: 28, color: "var(--red)" }} />
              <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 280 }}>No se pudo mostrar esta conversación. Selecciona otra en la lista.</p>
            </div>
          }>
            {!selected ? (
              <EmptyChat hasAnyConnection={hasAnyConnection} onConnect={() => openConnectPopup("community", handleConnectSuccess)} />
            ) : selected.platform === "fb_comment" || selected.platform === "ig_comment" || selected.platform === "instagram_comment" ? (
              <PostView conversation={selected} onBack={() => setSelectedId("")} />
            ) : (
              <ChatView conversation={selected} onSend={handleSendMessage} onClose={handleCloseConversation} onToggleProfile={toggleProfile} showProfile={showProfile} onBack={() => setSelectedId("")} />
            )}
          </ErrorBoundary>
        </div>

        {/* RIGHT: Contact profile */}
        {showProfile && selected && (
          <div
            className="absolute inset-y-0 right-0 z-20 w-[280px] md:static md:w-[280px] md:min-w-[280px] shadow-2xl md:shadow-none flex flex-col"
            style={{ background: "var(--surface)", borderLeft: "1px solid var(--hairline)", overflow: "hidden" }}
            role="complementary" aria-label="Perfil del contacto"
          >
            <ContactProfile conversation={selected} onAssign={handleAssign} onAddTag={handleAddTag} onRemoveTag={handleRemoveTag} onClose={toggleProfile} />
          </div>
        )}
      </div>

      {/* TOAST */}
      {connectToast && (
        <div role="alert" aria-live="polite" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#10b981", color: "white", padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 999, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 style={{ width: 15, height: 15 }} />
          {connectToast}
          <button onClick={() => setConnectToast(null)} aria-label="Cerrar" style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: 2, display: "flex" }}>
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

