"use client";

import { useState, useRef, useEffect, useCallback } from "react";

import {
  Search, Send, X, ChevronRight, ChevronDown, ChevronUp, UserPlus, Tag, Clock,
  MessageCircle, MessageSquare, AtSign, MoreHorizontal, Bookmark,
  CheckCircle2, Circle, AlertCircle, Paperclip, Smile, Image, ThumbsUp,
  Star, Bell, User, Phone, Mail, Globe, ExternalLink, Plus, Filter,
  Archive, Inbox, Heart, Share2, Eye,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type Platform = "fb_messenger" | "ig_dm" | "ig_comment" | "fb_comment" | "instagram_comment";

interface Message {
  id: string;
  text: string;
  incoming: boolean;
  timestamp: Date;
}

interface PostComment {
  id: string;
  text: string;
  username: string;
  userId?: string | null;
  avatar?: string | null;
  timestamp: string;
  likes: number;
}

interface PostData {
  caption: string;
  mediaUrl: string | null;
  mediaType: string;
  permalink: string | null;
  likeCount: number;
  shareCount?: number;
  commentsCount: number;
  comments: PostComment[];
}

interface Conversation {
  id: string;
  contactName: string;
  contactAvatar?: string | null;
  platform: Platform;
  lastMessage: string;
  lastMessageTime: Date;
  unread: boolean;
  closed: boolean;
  assignedTo: string | null;
  tags: string[];
  messages: Message[];
  _postData?: PostData | null;
}

// ═══════════════════════════════════════════════════════════════

const SAVED_REPLIES = [
  "¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte?",
  "Nuestro horario de atención es de Lunes a Viernes, 9:00 AM a 6:00 PM.",
  "Hacemos envíos a toda la República Mexicana. Envío gratis en compras mayores a $500.",
  "Te comparto el enlace de nuestro catálogo: [enlace]",
  "Gracias por tu compra. ¡Esperamos verte pronto!",
];

const TEAM_MEMBERS = ["Sin asignar", "Ana", "Luis", "Martha", "Diego"];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}d`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date): string {
  const today = new Date();
  const d = new Date(date);
  if (d.toDateString() === today.toDateString()) return "Hoy";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

function getPlatformConfig(platform: Platform) {
  switch (platform) {
    case "fb_messenger":
      return { label: "Messenger", color: "#0084ff", icon: MessageSquare, bgAlpha: "rgba(0,132,255,0.12)" };
    case "ig_dm":
      return { label: "Instagram", color: "#E1306C", icon: MessageCircle, bgAlpha: "rgba(225,48,108,0.12)" };
    case "ig_comment":
    case "instagram_comment":
      return { label: "Comentario IG", color: "#F77737", icon: AtSign, bgAlpha: "rgba(247,119,55,0.12)" };
    case "fb_comment":
      return { label: "Comentario FB", color: "#1877F2", icon: MessageSquare, bgAlpha: "rgba(24,119,242,0.12)" };
  }
}

type ChannelFilter = "all" | "messenger" | "instagram" | "fb_comment" | "ig_comment";

const CHANNEL_TABS: { key: ChannelFilter; label: string; color: string; platforms: Platform[] }[] = [
  { key: "all", label: "Todos los mensajes", color: "#00d4ff", platforms: [] },
  { key: "messenger", label: "Messenger", color: "#0084ff", platforms: ["fb_messenger"] },
  { key: "instagram", label: "Instagram", color: "#E1306C", platforms: ["ig_dm"] },
  { key: "fb_comment", label: "Comentarios de Facebook", color: "#1877F2", platforms: ["fb_comment"] },
  { key: "ig_comment", label: "Comentarios de Instagram", color: "#F77737", platforms: ["ig_comment", "instagram_comment"] },
];

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}



// ═══════════════════════════════════════════════════════════════
// TYPES — Connected Pages
// ═══════════════════════════════════════════════════════════════

interface ConnectedPage {
  id: string;
  name: string;
  picture?: string;
  platform: "facebook" | "instagram";
  igId?: string;
}

// ═══════════════════════════════════════════════════════════════
// PAGE SELECTOR COMPONENT
// ═══════════════════════════════════════════════════════════════

function PageSelector({
  pages,
  selectedPage,
  onSelect,
}: {
  pages: ConnectedPage[];
  selectedPage: ConnectedPage | null;
  onSelect: (page: ConnectedPage | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredPages = pages.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Selected page button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "8px 12px",
          background: open ? "rgba(168,85,247,0.06)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${open ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.06)"}`,
          borderRadius: 10, cursor: "pointer",
          transition: "all 0.15s", fontFamily: "inherit",
        }}
      >
        {/* Avatar */}
        {selectedPage ? (
          selectedPage.picture ? (
            <img
              src={selectedPage.picture}
              alt=""
              style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: selectedPage.platform === "instagram" ? "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" : "linear-gradient(135deg, #1877F2, #0d6efd)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0,
            }}>
              {selectedPage.name.charAt(0).toUpperCase()}
            </div>
          )
        ) : (
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(168,85,247,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Globe style={{ width: 14, height: 14, color: "#a855f7" }} />
          </div>
        )}
        <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: "white",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {selectedPage?.name || "Todas las páginas"}
          </div>
          {selectedPage && (
            <div style={{ fontSize: 9, color: "rgba(148,163,184,0.4)", textTransform: "capitalize" }}>
              {selectedPage.platform}
            </div>
          )}
        </div>
        <ChevronDown style={{
          width: 14, height: 14, color: "rgba(148,163,184,0.35)",
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.2s", flexShrink: 0,
        }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "rgba(12,12,24,0.98)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, zIndex: 50,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          maxHeight: 360, display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Search */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 8px",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <Search style={{ width: 12, height: 12, color: "rgba(148,163,184,0.3)", flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Buscar página..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                style={{
                  background: "transparent", border: "none", outline: "none",
                  color: "white", fontSize: 11, width: "100%", fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          {/* Page list */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {/* All pages option */}
            <button
              onClick={() => { onSelect(null); setOpen(false); setSearch(""); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", background: !selectedPage ? "rgba(168,85,247,0.06)" : "transparent",
                border: "none", borderBottom: "1px solid rgba(255,255,255,0.03)",
                cursor: "pointer", transition: "background 0.1s", fontFamily: "inherit",
                borderLeft: !selectedPage ? "3px solid #a855f7" : "3px solid transparent",
              }}
              onMouseEnter={e => { if (selectedPage) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={e => { if (selectedPage) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(168,85,247,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Globe style={{ width: 15, height: 15, color: "#a855f7" }} />
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: !selectedPage ? "#a855f7" : "white" }}>Todas las páginas</div>
                <div style={{ fontSize: 9, color: "rgba(148,163,184,0.35)" }}>{pages.length} cuentas conectadas</div>
              </div>
            </button>

            {filteredPages.map(page => {
              const isActive = selectedPage?.id === page.id;
              return (
                <button
                  key={page.id}
                  onClick={() => { onSelect(page); setOpen(false); setSearch(""); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px",
                    background: isActive ? "rgba(168,85,247,0.06)" : "transparent",
                    border: "none", borderBottom: "1px solid rgba(255,255,255,0.03)",
                    cursor: "pointer", transition: "background 0.1s", fontFamily: "inherit",
                    borderLeft: isActive ? "3px solid #a855f7" : "3px solid transparent",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Page avatar */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    {page.picture ? (
                      <img
                        src={page.picture}
                        alt=""
                        style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: page.platform === "instagram"
                          ? "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)"
                          : "linear-gradient(135deg, #1877F2, #0d6efd)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, color: "white",
                      }}>
                        {page.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Platform badge */}
                    <div style={{
                      position: "absolute", bottom: -2, right: -2,
                      width: 14, height: 14, borderRadius: "50%",
                      background: page.platform === "instagram" ? "#E1306C" : "#1877F2",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "2px solid rgba(12,12,24,1)",
                    }}>
                      {page.platform === "instagram" ? (
                        <MessageCircle style={{ width: 7, height: 7, color: "white" }} />
                      ) : (
                        <MessageSquare style={{ width: 7, height: 7, color: "white" }} />
                      )}
                    </div>
                  </div>

                  {/* Page info */}
                  <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: isActive ? 600 : 500,
                      color: isActive ? "#a855f7" : "white",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {page.name}
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(148,163,184,0.35)", textTransform: "capitalize" }}>
                      {page.platform}
                    </div>
                  </div>

                  {/* Active dot */}
                  {isActive && (
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "#a855f7", flexShrink: 0,
                    }} />
                  )}
                </button>
              );
            })}

            {filteredPages.length === 0 && (
              <div style={{ padding: 16, textAlign: "center", fontSize: 11, color: "rgba(148,163,184,0.3)" }}>
                Sin resultados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// POST VIEW — For comment-type conversations
// ═══════════════════════════════════════════════════════════════

function PostView({ conversation }: { conversation: Conversation }) {
  const postData = (conversation as any)?._postData as PostData | null;
  const pc = getPlatformConfig(conversation.platform);

  if (!postData) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 }}>
        <MessageSquare style={{ width: 32, height: 32, color: "rgba(148,163,184,0.2)" }} />
        <p style={{ fontSize: 13, color: "rgba(148,163,184,0.4)" }}>Sin datos de publicación</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: pc.color, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <pc.icon style={{ width: 16, height: 16, color: "white" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{(conversation as any)?._pageName || conversation.contactName}</div>
          <div style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>{pc.label} · {formatDate(conversation.lastMessageTime)}</div>
        </div>
        {postData.permalink && (
          <a href={postData.permalink} target="_blank" rel="noopener noreferrer"
            style={{
              padding: "5px 10px", borderRadius: 6,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#00d4ff", fontSize: 10, fontWeight: 600,
              textDecoration: "none", display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <ExternalLink style={{ width: 10, height: 10 }} />
            Ver publicación
          </a>
        )}
      </div>

      {/* Post content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0" }}>
        {/* Post image */}
        {postData.mediaUrl && (
          <div style={{
            width: "100%", maxHeight: 340, overflow: "hidden",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.3)",
          }}>
            <img
              src={postData.mediaUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}

        {/* Engagement metrics */}
        <div style={{
          display: "flex", gap: 20, padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Heart style={{ width: 14, height: 14, color: "#ef4444" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{postData.likeCount.toLocaleString()}</span>
            <span style={{ fontSize: 10, color: "rgba(148,163,184,0.35)" }}>likes</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <MessageCircle style={{ width: 14, height: 14, color: "#00d4ff" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{postData.commentsCount.toLocaleString()}</span>
            <span style={{ fontSize: 10, color: "rgba(148,163,184,0.35)" }}>comentarios</span>
          </div>
          {(postData.shareCount || 0) > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Share2 style={{ width: 14, height: 14, color: "#a855f7" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{(postData.shareCount || 0).toLocaleString()}</span>
              <span style={{ fontSize: 10, color: "rgba(148,163,184,0.35)" }}>shares</span>
            </div>
          )}
        </div>

        {/* Caption */}
        {postData.caption && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <p style={{
              fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.6,
              margin: 0, whiteSpace: "pre-wrap",
            }}>
              {postData.caption.length > 300 ? postData.caption.slice(0, 300) + "..." : postData.caption}
            </p>
          </div>
        )}

        {/* Comments section */}
        <div style={{ padding: "12px 16px 6px" }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: "rgba(148,163,184,0.5)",
            letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12,
          }}>
            Comentarios ({postData.commentsCount})
          </div>

          {postData.comments.length === 0 ? (
            <p style={{ fontSize: 12, color: "rgba(148,163,184,0.3)", textAlign: "center", padding: 20 }}>
              Sin comentarios recientes
            </p>
          ) : (
            postData.comments.map((comment, i) => (
              <div key={comment.id || i} style={{
                display: "flex", gap: 10, padding: "10px 0",
                borderBottom: i < postData.comments.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
              }}>
                {/* Commenter avatar */}
                <div style={{ flexShrink: 0 }}>
                  {comment.avatar ? (
                    <img
                      src={comment.avatar}
                      alt=""
                      style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent && !parent.querySelector(".fb-avatar")) {
                          const d = document.createElement("div");
                          d.className = "fb-avatar";
                          d.style.cssText = "width:32px;height:32px;border-radius:50%;background:rgba(168,85,247,0.1);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#a855f7;";
                          d.textContent = comment.username.charAt(0).toUpperCase();
                          parent.insertBefore(d, e.target as Node);
                        }
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "rgba(168,85,247,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: "#a855f7",
                    }}>
                      {comment.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Comment content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "white" }}>{comment.username}</span>
                    <span style={{ fontSize: 9, color: "rgba(148,163,184,0.3)" }}>
                      {new Date(comment.timestamp).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.5 }}>
                    {comment.text}
                  </p>
                  {comment.likes > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}>
                      <Heart style={{ width: 10, height: 10, color: "#ef4444" }} />
                      <span style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>{comment.likes}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN LAYOUT
// ═══════════════════════════════════════════════════════════════

export function InboxLayout() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [showProfile, setShowProfile] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [connectedPages, setConnectedPages] = useState<ConnectedPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<ConnectedPage | null>(null);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");

  // Fetch connected pages
  useEffect(() => {
    fetch("/api/connect/status")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.modules) return;
        const allPages: ConnectedPage[] = [];
        const seen = new Set<string>();
        Object.values(data.modules).forEach((mod: any) => {
          (mod.pages || []).forEach((p: any) => {
            if (seen.has(p.id)) return;
            seen.add(p.id);
            allPages.push({
              id: p.id,
              name: p.name || "Página",
              picture: p.picture || null,
              platform: "facebook",
            });
            // If page has an IG account, add it too
            if (p.instagram_business_account?.id) {
              const igId = p.instagram_business_account.id;
              if (!seen.has(igId)) {
                seen.add(igId);
                allPages.push({
                  id: igId,
                  name: p.instagram_business_account.name || p.name,
                  picture: p.instagram_business_account.picture || p.picture,
                  platform: "instagram",
                  igId,
                });
              }
            }
          });
        });
        setConnectedPages(allPages);
      }).catch(() => {});
  }, []);

  // Fetch real conversations from API
  useEffect(() => {
    const fetchReal = async () => {
      try {
        const res = await fetch("/api/inbox/conversations");
        if (res.ok) {
          const data = await res.json();
          if (data.conversations && data.conversations.length > 0) {
            const mapped: Conversation[] = data.conversations.map((c: any) => {
              const platformMap: Record<string, Platform> = {
                facebook_messenger: "fb_messenger",
                instagram_dm: "ig_dm",
                ig_comment: "ig_comment",
                instagram_comment: "instagram_comment",
                facebook_comment: "fb_comment",
              };
              return {
                id: c.id,
                contactName: c.contactName || "Usuario",
                contactAvatar: c.contactAvatar || null,
                platform: (platformMap[c.platform] || "fb_messenger") as Platform,
                lastMessage: c.lastMessage || "",
                lastMessageTime: new Date(c.lastMessageAt || Date.now()),
                unread: c.unread || false,
                closed: false,
                assignedTo: null,
                tags: [],
                messages: [],
                _pageId: c.pageId,
                _pageName: c.pageName,
                _postData: c._postData || null,
              };
            });
            setConversations(mapped);
            setSelectedId(mapped[0]?.id || "");

            // Prefetch messages for first 3 conversations in parallel
            const prefetchCount = Math.min(3, mapped.length);
            const prefetchers = mapped.slice(0, prefetchCount).map(conv => {
              const pageId = (conv as any)?._pageId;
              return fetch(`/api/inbox/messages?conversationId=${conv.id}&pageId=${pageId || ""}`)
                .then(r => r.ok ? r.json() : null)
                .then(data => ({
                  id: conv.id,
                  messages: data?.messages?.length ? data.messages.map((m: any) => ({
                    id: m.id, text: m.text, incoming: m.incoming,
                    timestamp: new Date(m.timestamp),
                  })) : null,
                }))
                .catch(() => ({ id: conv.id, messages: null }));
            });

            Promise.all(prefetchers).then(results => {
              setConversations(prev =>
                prev.map(c => {
                  const result = results.find(r => r.id === c.id);
                  return result?.messages ? { ...c, messages: result.messages } : c;
                })
              );
            });
          }
        }
      } catch { /* fallback */ }
      setInitialFetchDone(true);
    };
    fetchReal();
  }, []);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    setConversations(prev =>
      prev.map(c => (c.id === id ? { ...c, unread: false } : c))
    );
    const conv = conversations.find(c => c.id === id);
    const pageId = (conv as any)?._pageId;
    fetch(`/api/inbox/messages?conversationId=${id}&pageId=${pageId || ""}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.messages?.length) {
          const mapped: Message[] = data.messages.map((m: any) => ({
            id: m.id, text: m.text, incoming: m.incoming,
            timestamp: new Date(m.timestamp),
          }));
          setConversations(prev =>
            prev.map(c => c.id === id ? { ...c, messages: mapped } : c)
          );
        }
      }).catch(() => {});
  };

  const selected = conversations.find(c => c.id === selectedId) || conversations[0];

  // Apply search + page + channel filter
  const filtered = conversations.filter(c => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.contactName.toLowerCase().includes(q) && !c.lastMessage.toLowerCase().includes(q)) return false;
    }
    // Filter by selected page
    if (selectedPage) {
      const convPageId = (c as any)?._pageId;
      if (convPageId && convPageId !== selectedPage.id) return false;
    }
    // Filter by channel
    if (channelFilter !== "all") {
      const tab = CHANNEL_TABS.find(t => t.key === channelFilter);
      if (tab && tab.platforms.length > 0 && !tab.platforms.includes(c.platform)) return false;
    }
    return true;
  });

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;
    const newMsg: Message = {
      id: `${selected.id}_${Date.now()}`,
      text: text.trim(),
      incoming: false,
      timestamp: new Date(),
    };
    setConversations(prev =>
      prev.map(c =>
        c.id === selected.id
          ? { ...c, messages: [...c.messages, newMsg], lastMessage: text.trim(), lastMessageTime: new Date() }
          : c
      )
    );
  };

  const handleCloseConversation = () => {
    setConversations(prev =>
      prev.map(c => (c.id === selected.id ? { ...c, closed: !c.closed } : c))
    );
  };

  const handleAssign = (member: string) => {
    setConversations(prev =>
      prev.map(c =>
        c.id === selected.id
          ? { ...c, assignedTo: member === "Sin asignar" ? null : member }
          : c
      )
    );
  };

  const handleAddTag = (tag: string) => {
    if (!tag.trim()) return;
    setConversations(prev =>
      prev.map(c =>
        c.id === selected.id && !c.tags.includes(tag.trim())
          ? { ...c, tags: [...c.tags, tag.trim()] }
          : c
      )
    );
  };

  const handleRemoveTag = (tag: string) => {
    setConversations(prev =>
      prev.map(c =>
        c.id === selected.id
          ? { ...c, tags: c.tags.filter(t => t !== tag) }
          : c
      )
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, height: "calc(100vh - 200px)" }}>

      {/* Skeleton loading state */}
      {!initialFetchDone && (
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* Left skeleton — conversation list */}
          <div style={{
            width: 300, minWidth: 300, borderRight: "1px solid rgba(255,255,255,0.06)",
            display: "flex", flexDirection: "column", padding: "12px",
          }}>
            {/* Page selector skeleton */}
            <div style={{
              height: 44, borderRadius: 10, marginBottom: 8,
              background: "rgba(255,255,255,0.03)",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
            {/* Search skeleton */}
            <div style={{
              height: 36, borderRadius: 8, marginBottom: 12,
              background: "rgba(255,255,255,0.03)",
              animation: "pulse 1.5s ease-in-out infinite",
              animationDelay: "0.1s",
            }} />
            {/* Conversation skeletons */}
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, padding: "10px 8px",
                borderBottom: "1px solid rgba(255,255,255,0.03)",
                animation: "pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.08}s`,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: "rgba(255,255,255,0.04)",
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 12, width: `${60 + (i % 3) * 15}%`, borderRadius: 4, marginBottom: 6, background: "rgba(255,255,255,0.04)" }} />
                  <div style={{ height: 10, width: `${40 + (i % 4) * 12}%`, borderRadius: 4, background: "rgba(255,255,255,0.03)" }} />
                </div>
                <div style={{ height: 10, width: 24, borderRadius: 4, background: "rgba(255,255,255,0.03)" }} />
              </div>
            ))}
          </div>

          {/* Center skeleton — chat area */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {/* Chat header skeleton */}
            <div style={{
              display: "flex", gap: 10, padding: "14px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
              <div>
                <div style={{ height: 13, width: 120, borderRadius: 4, marginBottom: 4, background: "rgba(255,255,255,0.04)" }} />
                <div style={{ height: 10, width: 80, borderRadius: 4, background: "rgba(255,255,255,0.03)" }} />
              </div>
            </div>
            {/* Messages skeleton */}
            <div style={{ flex: 1, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              {[true, true, false, true, false, true].map((incoming, i) => (
                <div key={i} style={{
                  alignSelf: incoming ? "flex-start" : "flex-end",
                  animation: "pulse 1.5s ease-in-out infinite",
                  animationDelay: `${i * 0.12}s`,
                }}>
                  <div style={{
                    height: 32 + (i % 3) * 10, width: 140 + (i % 4) * 40,
                    borderRadius: 14,
                    background: incoming ? "rgba(255,255,255,0.03)" : "rgba(168,85,247,0.06)",
                  }} />
                </div>
              ))}
            </div>
            {/* Input skeleton */}
            <div style={{
              padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}>
              <div style={{ height: 40, borderRadius: 20, background: "rgba(255,255,255,0.03)" }} />
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {conversations.length === 0 && initialFetchDone && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", flex: 1, padding: 60, gap: 14,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "rgba(168,85,247,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <MessageSquare style={{ width: 26, height: 26, color: "#a855f7" }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "white", margin: 0 }}>Sin conversaciones</h3>
          <p style={{ fontSize: 12, color: "#64748b", textAlign: "center", maxWidth: 320 }}>
            Conecta tu cuenta de Meta en <strong style={{ color: "#00d4ff" }}>Integraciones</strong> para
            recibir mensajes de Facebook Messenger e Instagram Direct.
          </p>
        </div>
      )}

      {/* ─── Channel Tabs ─── */}
      {conversations.length > 0 && initialFetchDone && (
        <div style={{
          display: "flex", alignItems: "center", gap: 0,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 12px",
          overflowX: "auto",
          flexShrink: 0,
        }}>
          {CHANNEL_TABS.map(tab => {
            const count = tab.key === "all"
              ? conversations.filter(c => c.unread).length
              : conversations.filter(c => tab.platforms.includes(c.platform) && c.unread).length;
            const isActive = channelFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setChannelFilter(tab.key)}
                style={{
                  padding: "10px 14px",
                  fontSize: 12, fontWeight: isActive ? 600 : 400,
                  color: isActive ? tab.color : "rgba(148,163,184,0.5)",
                  background: "transparent",
                  border: "none",
                  borderBottom: isActive ? `2px solid ${tab.color}` : "2px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 6,
                  position: "relative",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "rgba(148,163,184,0.5)"; }}
              >
                {tab.label}
                {count > 0 && (
                  <span style={{
                    minWidth: 18, height: 18, borderRadius: 9,
                    background: tab.key === "all" ? "#ef4444" : tab.color,
                    color: "white",
                    fontSize: 10, fontWeight: 700,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    padding: "0 5px",
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ─── 3-Panel Layout ─── */}
      {conversations.length > 0 && selected && (
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

        {/* ═══ LEFT — Conversation List ═══ */}
        <div style={{
          width: 300, minWidth: 300,
          display: "flex", flexDirection: "column",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.01)",
        }}>
          {/* Page Selector */}
          {connectedPages.length > 0 && (
            <div style={{ padding: "10px 12px 6px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <PageSelector
                pages={connectedPages}
                selectedPage={selectedPage}
                onSelect={setSelectedPage}
              />
            </div>
          )}

          {/* Search */}
          <div style={{ padding: "6px 12px 10px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 10px",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <Search style={{ width: 14, height: 14, color: "rgba(148,163,184,0.3)", flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Buscar conversación..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  background: "transparent", border: "none", outline: "none",
                  color: "white", fontSize: 12, width: "100%", fontFamily: "inherit",
                }}
              />
            </div>
          </div>



          {/* Conversation List */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "rgba(148,163,184,0.3)", fontSize: 11 }}>
                No hay conversaciones
              </div>
            ) : (
              filtered.map(conv => {
                const pc = getPlatformConfig(conv.platform);
                const isActive = conv.id === selectedId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    style={{
                      padding: "12px 14px",
                      cursor: "pointer",
                      background: isActive ? "rgba(168,85,247,0.06)" : "transparent",
                      borderLeft: isActive ? "3px solid #a855f7" : "3px solid transparent",
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      transition: "all 0.12s",
                      display: "flex", gap: 10, alignItems: "flex-start",
                    }}
                  >
                    {/* Avatar */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      {conv.contactAvatar ? (
                        <img
                          src={conv.contactAvatar}
                          alt=""
                          style={{
                            width: 42, height: 42, borderRadius: "50%",
                            objectFit: "cover",
                            border: `1.5px solid ${pc.color}30`,
                          }}
                          onError={(e) => {
                            // Fallback to initials on load error
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector(".fallback-avatar")) {
                              const fallback = document.createElement("div");
                              fallback.className = "fallback-avatar";
                              fallback.style.cssText = `width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,${pc.color}20,${pc.color}08);border:1.5px solid ${pc.color}30;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:${pc.color};`;
                              fallback.textContent = getInitials(conv.contactName);
                              parent.insertBefore(fallback, target);
                            }
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 42, height: 42, borderRadius: "50%",
                          background: `linear-gradient(135deg, ${pc.color}20, ${pc.color}08)`,
                          border: `1.5px solid ${pc.color}30`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 14, fontWeight: 700, color: pc.color,
                        }}>
                          {getInitials(conv.contactName)}
                        </div>
                      )}
                      {conv.unread && (
                        <div style={{
                          position: "absolute", top: -1, right: -1,
                          width: 10, height: 10, borderRadius: "50%",
                          background: "#a855f7",
                          border: "2px solid rgba(10,10,20,1)",
                        }} />
                      )}
                      {/* Platform indicator */}
                      <div style={{
                        position: "absolute", bottom: -2, right: -2,
                        width: 16, height: 16, borderRadius: "50%",
                        background: pc.color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "2px solid rgba(10,10,20,1)",
                      }}>
                        <pc.icon style={{ width: 8, height: 8, color: "white" }} />
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <span style={{
                          fontSize: 13, fontWeight: conv.unread ? 700 : 500,
                          color: conv.unread ? "white" : "rgba(255,255,255,0.75)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {conv.contactName}
                        </span>
                        <span style={{
                          fontSize: 10, color: conv.unread ? "#a855f7" : "rgba(148,163,184,0.35)",
                          whiteSpace: "nowrap", marginLeft: 8, fontWeight: conv.unread ? 600 : 400,
                        }}>
                          {relativeTime(conv.lastMessageTime)}
                        </span>
                      </div>
                      <p style={{
                        fontSize: 11,
                        color: conv.unread ? "rgba(255,255,255,0.5)" : "rgba(148,163,184,0.35)",
                        margin: 0,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        fontWeight: conv.unread ? 500 : 400,
                        lineHeight: 1.4,
                      }}>
                        {(conv.platform === "fb_comment" || conv.platform === "ig_comment" || conv.platform === "instagram_comment")
                          ? conv.lastMessage
                          : (conv.lastMessage.startsWith("Tú:") ? conv.lastMessage : `Tú: ${conv.lastMessage}`)
                        }
                      </p>
                      {conv.closed && (
                        <span style={{
                          display: "inline-block", fontSize: 8, fontWeight: 600,
                          padding: "1px 6px", marginTop: 4,
                          color: "rgba(148,163,184,0.4)",
                          background: "rgba(148,163,184,0.06)",
                          border: "1px solid rgba(148,163,184,0.1)",
                          borderRadius: 3,
                        }}>
                          CERRADO
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ═══ CENTER — Chat View / Post View ═══ */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          minWidth: 0, background: "rgba(5,8,18,0.5)",
        }}>
          {selected.platform === "fb_comment" || selected.platform === "ig_comment" || selected.platform === "instagram_comment" ? (
            <PostView conversation={selected} />
          ) : (
            <ChatView
              conversation={selected}
              onSend={handleSendMessage}
              onClose={handleCloseConversation}
              onToggleProfile={() => setShowProfile(!showProfile)}
              showProfile={showProfile}
            />
          )}
        </div>

        {/* ═══ RIGHT — Contact Profile ═══ */}
        {showProfile && (
          <div style={{
            width: 280, minWidth: 280,
            display: "flex", flexDirection: "column",
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.01)",
            overflow: "hidden",
          }}>
            <ContactProfile
              conversation={selected}
              onAssign={handleAssign}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onClose={() => setShowProfile(false)}
            />
          </div>
        )}
      </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHAT VIEW
// ═══════════════════════════════════════════════════════════════

function ChatView({
  conversation,
  onSend,
  onClose,
  onToggleProfile,
  showProfile,
}: {
  conversation: Conversation;
  onSend: (text: string) => void;
  onClose: () => void;
  onToggleProfile: () => void;
  showProfile: boolean;
}) {
  const [input, setInput] = useState("");
  const [showReplies, setShowReplies] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pc = getPlatformConfig(conversation.platform);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages.length]);

  const handleSubmit = () => {
    onSend(input);
    setInput("");
  };

  // Group messages by date
  const messagesByDate: { date: string; msgs: Message[] }[] = [];
  conversation.messages.forEach(msg => {
    const dateStr = formatDate(msg.timestamp);
    const last = messagesByDate[messagesByDate.length - 1];
    if (last && last.date === dateStr) {
      last.msgs.push(msg);
    } else {
      messagesByDate.push({ date: dateStr, msgs: [msg] });
    }
  });

  return (
    <>
      {/* ─── Chat Header ─── */}
      <div style={{
        padding: "10px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, background: "rgba(255,255,255,0.015)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Avatar */}
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: `linear-gradient(135deg, ${pc.color}20, ${pc.color}08)`,
            border: `1.5px solid ${pc.color}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: pc.color,
          }}>
            {getInitials(conversation.contactName)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "white" }}>
                {conversation.contactName}
              </span>
              {conversation.assignedTo && (
                <span style={{
                  fontSize: 9, color: "rgba(148,163,184,0.4)",
                  padding: "1px 6px", background: "rgba(255,255,255,0.03)",
                  borderRadius: 4, border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  → {conversation.assignedTo}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
              <span style={{
                fontSize: 10, fontWeight: 500,
                padding: "1px 6px", color: pc.color,
                background: pc.bgAlpha, borderRadius: 4,
                display: "inline-flex", alignItems: "center", gap: 3,
              }}>
                <pc.icon style={{ width: 9, height: 9 }} />
                {pc.label}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {/* Action buttons */}
          {[
            { icon: Bell, tip: "Notificaciones" },
            { icon: Star, tip: "Marcar" },
            { icon: Archive, tip: "Archivar" },
          ].map((btn, i) => (
            <button
              key={i}
              title={btn.tip}
              style={{
                width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "transparent", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <btn.icon style={{ width: 14, height: 14, color: "rgba(148,163,184,0.4)" }} />
            </button>
          ))}

          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)", margin: "0 4px" }} />

          <button
            onClick={onClose}
            style={{
              padding: "6px 12px", fontSize: 10, fontWeight: 600,
              color: conversation.closed ? "#00c875" : "rgba(148,163,184,0.5)",
              background: conversation.closed ? "rgba(0,200,117,0.08)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${conversation.closed ? "rgba(0,200,117,0.2)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 6, cursor: "pointer", transition: "all 0.15s",
              fontFamily: "inherit",
            }}
          >
            {conversation.closed ? "REABRIR" : "CERRAR"}
          </button>
          <button
            onClick={onToggleProfile}
            style={{
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: showProfile ? "rgba(168,85,247,0.08)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${showProfile ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <ChevronRight style={{
              width: 14, height: 14,
              color: showProfile ? "#a855f7" : "rgba(148,163,184,0.4)",
            }} />
          </button>
        </div>
      </div>

      {/* ─── Messages Area ─── */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "12px 20px",
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        {messagesByDate.map((group, gi) => (
          <div key={gi}>
            {/* Date separator */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              margin: "12px 0", padding: "0 20px",
            }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              <span style={{
                fontSize: 10, color: "rgba(148,163,184,0.35)",
                fontWeight: 500, whiteSpace: "nowrap",
              }}>
                {group.date}
              </span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            {group.msgs.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: msg.incoming ? "flex-start" : "flex-end",
                  marginBottom: 4,
                }}
              >
                {/* Incoming avatar */}
                {msg.incoming && (
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: `${pc.color}15`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700, color: pc.color,
                    marginRight: 8, marginTop: 4, flexShrink: 0,
                  }}>
                    {getInitials(conversation.contactName)}
                  </div>
                )}

                <div style={{ maxWidth: "65%" }}>
                  <div style={{
                    padding: "10px 14px",
                    background: msg.incoming
                      ? "rgba(255,255,255,0.05)"
                      : "linear-gradient(135deg, #a855f7, #7c3aed)",
                    border: msg.incoming ? "1px solid rgba(255,255,255,0.08)" : "none",
                    borderRadius: msg.incoming ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                    boxShadow: msg.incoming ? "none" : "0 2px 8px rgba(168,85,247,0.3)",
                  }}>
                    <p style={{
                      fontSize: 13, color: "white",
                      margin: 0, lineHeight: 1.5, wordBreak: "break-word",
                    }}>
                      {msg.text}
                    </p>
                  </div>
                  <p style={{
                    fontSize: 9, margin: "3px 4px 0",
                    color: "rgba(148,163,184,0.3)",
                    textAlign: msg.incoming ? "left" : "right",
                  }}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ─── Suggested Replies ─── */}
      {showReplies && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "8px 16px",
          background: "rgba(255,255,255,0.015)",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 6,
          }}>
            <span style={{ fontSize: 10, color: "rgba(148,163,184,0.4)", fontWeight: 600 }}>
              Respuestas sugeridas
            </span>
            <button
              onClick={() => setShowReplies(false)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
            >
              <X style={{ width: 12, height: 12, color: "rgba(148,163,184,0.3)" }} />
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SAVED_REPLIES.map((reply, i) => (
              <button
                key={i}
                onClick={() => { setInput(reply); setShowReplies(false); }}
                style={{
                  padding: "5px 10px", fontSize: 11,
                  color: "rgba(255,255,255,0.6)",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16, cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap", fontFamily: "inherit",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(168,85,247,0.08)";
                  e.currentTarget.style.borderColor = "rgba(168,85,247,0.2)";
                  e.currentTarget.style.color = "#a855f7";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                }}
              >
                {reply.length > 50 ? reply.slice(0, 50) + "..." : reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Input Bar (always visible at bottom) ─── */}
      <div style={{
        padding: "10px 16px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
        background: "rgba(255,255,255,0.015)",
      }}>
        {/* Responding indicator */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          marginBottom: 8, fontSize: 10, color: "rgba(148,163,184,0.35)",
        }}>
          <div style={{
            width: 14, height: 14, borderRadius: "50%",
            background: `${pc.color}15`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <pc.icon style={{ width: 8, height: 8, color: pc.color }} />
          </div>
          <span>Respondiendo en {pc.label}...</span>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          {/* Toolbar icons */}
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            {[
              { icon: Bookmark, action: () => setShowReplies(!showReplies), active: showReplies },
              { icon: Paperclip, action: () => {}, active: false },
              { icon: Image, action: () => {}, active: false },
              { icon: Smile, action: () => {}, active: false },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={btn.action}
                style={{
                  width: 32, height: 32,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: btn.active ? "rgba(168,85,247,0.08)" : "transparent",
                  border: "none", borderRadius: 6, cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                onMouseLeave={e => e.currentTarget.style.background = btn.active ? "rgba(168,85,247,0.08)" : "transparent"}
              >
                <btn.icon style={{
                  width: 16, height: 16,
                  color: btn.active ? "#a855f7" : "rgba(148,163,184,0.35)",
                }} />
              </button>
            ))}
          </div>

          {/* Text input */}
          <div style={{
            flex: 1, display: "flex", alignItems: "flex-end", gap: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, padding: "4px 4px 4px 14px",
          }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Escribe un mensaje..."
              rows={1}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "white", fontSize: 13, resize: "none", fontFamily: "inherit",
                lineHeight: 1.5, minHeight: 28, maxHeight: 80,
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              style={{
                width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: input.trim() ? "linear-gradient(135deg, #a855f7, #7c3aed)" : "rgba(255,255,255,0.03)",
                border: "none", borderRadius: 8,
                cursor: input.trim() ? "pointer" : "default",
                transition: "all 0.2s", flexShrink: 0,
                boxShadow: input.trim() ? "0 2px 8px rgba(168,85,247,0.3)" : "none",
              }}
            >
              <Send style={{
                width: 14, height: 14,
                color: input.trim() ? "white" : "rgba(148,163,184,0.2)",
              }} />
            </button>
          </div>

          {/* Quick like */}
          <button
            onClick={() => onSend("👍")}
            style={{
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: "none",
              borderRadius: 6, cursor: "pointer", flexShrink: 0,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <ThumbsUp style={{ width: 18, height: 18, color: "rgba(148,163,184,0.35)" }} />
          </button>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONTACT PROFILE SIDEBAR (Collapsible Sections)
// ═══════════════════════════════════════════════════════════════

function ProfileSection({ title, defaultOpen = true, children }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: "transparent", border: "none",
          cursor: "pointer", transition: "all 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <span style={{
          fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)",
          letterSpacing: "0.03em",
        }}>
          {title}
        </span>
        {open ? (
          <ChevronUp style={{ width: 12, height: 12, color: "rgba(148,163,184,0.3)" }} />
        ) : (
          <ChevronDown style={{ width: 12, height: 12, color: "rgba(148,163,184,0.3)" }} />
        )}
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function ContactProfile({
  conversation, onAssign, onAddTag, onRemoveTag, onClose,
}: {
  conversation: Conversation;
  onAssign: (member: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onClose: () => void;
}) {
  const [newTag, setNewTag] = useState("");
  const [showAssign, setShowAssign] = useState(false);
  const pc = getPlatformConfig(conversation.platform);
  const incomingCount = conversation.messages.filter(m => m.incoming).length;
  const outgoingCount = conversation.messages.filter(m => !m.incoming).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Profile Header — Avatar + Name */}
      <div style={{
        padding: "20px 16px 16px", textAlign: "center",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "4px 8px", fontSize: 10,
              background: "transparent", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 6, color: "rgba(148,163,184,0.4)", cursor: "pointer",
            }}
          >
            <MoreHorizontal style={{ width: 12, height: 12 }} />
          </button>
        </div>
        <div style={{
          width: 60, height: 60, borderRadius: "50%",
          background: `linear-gradient(135deg, ${pc.color}25, ${pc.color}08)`,
          border: `2px solid ${pc.color}35`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 10px", fontSize: 20, fontWeight: 700, color: pc.color,
        }}>
          {getInitials(conversation.contactName)}
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "white", margin: "0 0 4px" }}>
          {conversation.contactName}
        </h3>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 10, color: pc.color, padding: "2px 8px",
          background: pc.bgAlpha, borderRadius: 4,
        }}>
          <pc.icon style={{ width: 10, height: 10 }} />
          {pc.label}
        </div>
      </div>

      {/* Scrollable Sections */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Información de contacto */}
        <ProfileSection title="Información de contacto">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              <User style={{ width: 12, height: 12, color: "rgba(148,163,184,0.3)" }} />
              {conversation.contactName}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "rgba(148,163,184,0.4)" }}>
              <Globe style={{ width: 12, height: 12, color: "rgba(148,163,184,0.3)" }} />
              {pc.label}
            </div>
            <button style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 10, color: "#00d4ff", background: "transparent",
              border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit",
            }}>
              <Plus style={{ width: 10, height: 10 }} />
              Agregar detalles
            </button>
          </div>
        </ProfileSection>

        {/* Perfil de plataforma */}
        <ProfileSection title={`Perfil de ${pc.label}`}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            <pc.icon style={{ width: 14, height: 14, color: pc.color }} />
            <span>{conversation.contactName}</span>
            <ExternalLink style={{ width: 10, height: 10, color: "rgba(148,163,184,0.3)", cursor: "pointer" }} />
          </div>
        </ProfileSection>

        {/* Etiquetas */}
        <ProfileSection title="Etiquetas">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {conversation.tags.map(tag => (
              <span key={tag} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 10, color: "#a855f7", padding: "3px 8px",
                background: "rgba(168,85,247,0.08)",
                border: "1px solid rgba(168,85,247,0.15)", borderRadius: 12,
              }}>
                {tag}
                <X style={{ width: 10, height: 10, cursor: "pointer", opacity: 0.5 }}
                  onClick={() => onRemoveTag(tag)} />
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              type="text" value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { onAddTag(newTag); setNewTag(""); } }}
              placeholder="Agregar etiqueta..."
              style={{
                flex: 1, background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6,
                padding: "4px 8px", fontSize: 10, color: "white", outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={() => { onAddTag(newTag); setNewTag(""); }}
              style={{
                padding: "4px 8px", fontSize: 10, color: "#a855f7",
                background: "rgba(168,85,247,0.08)",
                border: "1px solid rgba(168,85,247,0.15)",
                borderRadius: 6, cursor: "pointer",
              }}
            >
              <Tag style={{ width: 10, height: 10 }} />
            </button>
          </div>
        </ProfileSection>

        {/* Actividad / Resumen */}
        <ProfileSection title="Actividad">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{
              padding: 10, textAlign: "center",
              background: "rgba(255,255,255,0.02)", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.04)",
            }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#a855f7", margin: 0 }}>
                {conversation.messages.length}
              </p>
              <p style={{ fontSize: 9, color: "rgba(148,163,184,0.35)", margin: "4px 0 0" }}>
                Mensajes
              </p>
            </div>
            <div style={{
              padding: 10, textAlign: "center",
              background: "rgba(255,255,255,0.02)", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.04)",
            }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#00d4ff", margin: 0 }}>
                {relativeTime(conversation.messages[0]?.timestamp || new Date())}
              </p>
              <p style={{ fontSize: 9, color: "rgba(148,163,184,0.35)", margin: "4px 0 0" }}>
                Primer msg
              </p>
            </div>
          </div>
          <div style={{
            marginTop: 8, padding: "8px 10px",
            background: "rgba(255,255,255,0.02)", borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.04)",
            display: "flex", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>
              📩 Recibidos: {incomingCount}
            </span>
            <span style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>
              📤 Enviados: {outgoingCount}
            </span>
          </div>
        </ProfileSection>

        {/* Asignado a */}
        <ProfileSection title="Asignado a">
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowAssign(!showAssign)}
              style={{
                width: "100%", padding: "8px 10px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 6, cursor: "pointer",
                color: conversation.assignedTo ? "white" : "rgba(148,163,184,0.4)",
                fontSize: 11, fontFamily: "inherit",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <UserPlus style={{ width: 12, height: 12, color: "rgba(148,163,184,0.3)" }} />
                {conversation.assignedTo || "Sin asignar"}
              </div>
              <ChevronDown style={{
                width: 10, height: 10, color: "rgba(148,163,184,0.2)",
                transform: showAssign ? "rotate(180deg)" : "none",
                transition: "transform 0.15s",
              }} />
            </button>
            {showAssign && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0,
                background: "rgba(10,10,20,0.97)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "0 0 6px 6px", zIndex: 10,
              }}>
                {TEAM_MEMBERS.map(member => (
                  <div
                    key={member}
                    onClick={() => { onAssign(member); setShowAssign(false); }}
                    style={{
                      padding: "8px 10px", fontSize: 11,
                      color: (member === "Sin asignar" && !conversation.assignedTo) ||
                             member === conversation.assignedTo ? "#a855f7" : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(168,85,247,0.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {member}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ProfileSection>

        {/* Estado */}
        <ProfileSection title="Estado">
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px", borderRadius: 6,
            background: conversation.closed ? "rgba(148,163,184,0.04)" : "rgba(0,200,117,0.04)",
            border: `1px solid ${conversation.closed ? "rgba(148,163,184,0.08)" : "rgba(0,200,117,0.12)"}`,
          }}>
            {conversation.closed ? (
              <CheckCircle2 style={{ width: 14, height: 14, color: "rgba(148,163,184,0.4)" }} />
            ) : (
              <Circle style={{ width: 14, height: 14, color: "#00c875" }} />
            )}
            <span style={{
              fontSize: 12, fontWeight: 500,
              color: conversation.closed ? "rgba(148,163,184,0.4)" : "#00c875",
            }}>
              {conversation.closed ? "Cerrado" : "Abierto"}
            </span>
          </div>
        </ProfileSection>

        {/* Etapa de cliente */}
        <ProfileSection title="Etapa de cliente potencial" defaultOpen={false}>
          <button style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 10, color: "#00d4ff", background: "transparent",
            border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit",
          }}>
            <Plus style={{ width: 10, height: 10 }} />
            Marcar como cliente potencial
          </button>
        </ProfileSection>
      </div>
    </div>
  );
}
