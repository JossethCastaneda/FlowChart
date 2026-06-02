"use client";

import { useState, useRef, useEffect } from "react";

import {
  Search, Send, X, ChevronRight, ChevronLeft, UserPlus, Tag, Clock,
  MessageCircle, MessageSquare, AtSign, MoreHorizontal, Bookmark,
  CheckCircle2, Circle, AlertCircle,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type Platform = "fb_messenger" | "ig_dm" | "ig_comment";

interface Message {
  id: string;
  text: string;
  incoming: boolean;
  timestamp: Date;
}

interface Conversation {
  id: string;
  contactName: string;
  platform: Platform;
  lastMessage: string;
  lastMessageTime: Date;
  unread: boolean;
  closed: boolean;
  assignedTo: string | null;
  tags: string[];
  messages: Message[];
}

// ═══════════════════════════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════════════════════════

const now = new Date();
const mins = (m: number) => new Date(now.getTime() - m * 60 * 1000);
const hours = (h: number) => new Date(now.getTime() - h * 3600 * 1000);

const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    contactName: "María García",
    platform: "fb_messenger",
    lastMessage: "¿Cuándo estará disponible el nuevo producto?",
    lastMessageTime: mins(5),
    unread: true,
    closed: false,
    assignedTo: null,
    tags: ["Prospecto", "Producto"],
    messages: [
      { id: "1a", text: "Hola! Vi su anuncio en Facebook sobre el nuevo producto 👋", incoming: true, timestamp: mins(45) },
      { id: "1b", text: "¡Hola María! Gracias por tu interés. ¿De cuál producto nos hablas?", incoming: false, timestamp: mins(30) },
      { id: "1c", text: "El de la línea premium que mencionaron en su último post", incoming: true, timestamp: mins(20) },
      { id: "1d", text: "Ah sí, ese producto está en pre-venta. Estará disponible la próxima semana. ¿Te gustaría que te avisemos?", incoming: false, timestamp: mins(12) },
      { id: "1e", text: "¿Cuándo estará disponible el nuevo producto?", incoming: true, timestamp: mins(5) },
    ],
  },
  {
    id: "2",
    contactName: "Carlos López",
    platform: "ig_dm",
    lastMessage: "Me encantó su último post! 🔥",
    lastMessageTime: hours(2),
    unread: true,
    closed: false,
    assignedTo: "Ana",
    tags: ["Fan", "Influencer"],
    messages: [
      { id: "2a", text: "Hola! Sigo su cuenta desde hace meses, excelente contenido 🙌", incoming: true, timestamp: hours(3) },
      { id: "2b", text: "¡Muchas gracias Carlos! Nos alegra que te guste nuestro contenido.", incoming: false, timestamp: hours(2.5) },
      { id: "2c", text: "Tengo una cuenta con 50k seguidores, ¿les interesaría una collab?", incoming: true, timestamp: hours(2.2) },
      { id: "2d", text: "Me encantó su último post! 🔥", incoming: true, timestamp: hours(2) },
    ],
  },
  {
    id: "3",
    contactName: "Ana Martínez",
    platform: "ig_comment",
    lastMessage: "¿Envían a todo México?",
    lastMessageTime: hours(4),
    unread: false,
    closed: false,
    assignedTo: null,
    tags: ["Consulta"],
    messages: [
      { id: "3a", text: "¿Envían a todo México?", incoming: true, timestamp: hours(4) },
      { id: "3b", text: "¡Hola Ana! Sí, hacemos envíos a toda la república. El envío es gratis en compras mayores a $500 MXN.", incoming: false, timestamp: hours(3.5) },
      { id: "3c", text: "Perfecto! ¿Y cuánto tarda en llegar a Monterrey?", incoming: true, timestamp: hours(3) },
      { id: "3d", text: "A Monterrey generalmente llega en 3-5 días hábiles 📦", incoming: false, timestamp: hours(2.8) },
      { id: "3e", text: "Gracias! Voy a hacer mi pedido entonces 😊", incoming: true, timestamp: hours(2.5) },
    ],
  },
  {
    id: "4",
    contactName: "Roberto Sánchez",
    platform: "fb_messenger",
    lastMessage: "Gracias por la info",
    lastMessageTime: hours(8),
    unread: false,
    closed: true,
    assignedTo: "Luis",
    tags: ["Soporte", "Resuelto"],
    messages: [
      { id: "4a", text: "Buenos días, tengo un problema con mi pedido #4521", incoming: true, timestamp: hours(10) },
      { id: "4b", text: "Buenos días Roberto. Déjame revisar tu pedido. ¿Podrías decirme cuál es el problema?", incoming: false, timestamp: hours(9.5) },
      { id: "4c", text: "Me llegó un producto diferente al que ordené", incoming: true, timestamp: hours(9) },
      { id: "4d", text: "Lamento mucho el inconveniente. Ya generé una guía de reenvío. Te llegará al correo registrado en los próximos minutos.", incoming: false, timestamp: hours(8.5) },
      { id: "4e", text: "Gracias por la info", incoming: true, timestamp: hours(8) },
    ],
  },
];

const SAVED_REPLIES = [
  "¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte?",
  "Nuestro horario de atención es de Lunes a Viernes, 9:00 AM a 6:00 PM.",
  "Hacemos envíos a toda la República Mexicana. El envío es gratis en compras mayores a $500.",
  "Te comparto el enlace de nuestro catálogo: [enlace]",
  "Gracias por tu compra. ¡Esperamos verte pronto!",
];

const TEAM_MEMBERS = ["Sin asignar", "Ana", "Luis", "Martha", "Diego"];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function relativeTime(date: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  return `hace ${Math.floor(diffH / 24)}d`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function getPlatformConfig(platform: Platform) {
  switch (platform) {
    case "fb_messenger":
      return { label: "Messenger", color: "#0084ff", icon: MessageSquare, bgAlpha: "rgba(0,132,255,0.1)" };
    case "ig_dm":
      return { label: "IG Direct", color: "#E1306C", icon: MessageCircle, bgAlpha: "rgba(225,48,108,0.1)" };
    case "ig_comment":
      return { label: "IG Comentario", color: "#F77737", icon: AtSign, bgAlpha: "rgba(247,119,55,0.1)" };
  }
}

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ═══════════════════════════════════════════════════════════════
// MAIN LAYOUT
// ═══════════════════════════════════════════════════════════════

export function InboxLayout() {
  const [conversations, setConversations] = useState<Conversation[]>(DEMO_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<string>("1");
  const [showProfile, setShowProfile] = useState(true);
  const [filterTab, setFilterTab] = useState<"todos" | "unread" | "closed">("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(true);

  // Fetch real conversations from API
  useEffect(() => {
    const fetchReal = async () => {
      try {
        const res = await fetch("/api/inbox/conversations");
        if (res.ok) {
          const data = await res.json();
          if (data.conversations && data.conversations.length > 0) {
            const mapped: Conversation[] = data.conversations.map((c: any) => ({
              id: c.id,
              contactName: c.contactName || "Usuario",
              platform: c.platform === "facebook_messenger" ? "fb_messenger" as Platform :
                        c.platform === "instagram_dm" ? "ig_dm" as Platform : "ig_comment" as Platform,
              lastMessage: c.lastMessage || "",
              lastMessageTime: new Date(c.lastMessageAt || Date.now()),
              unread: c.unread || false,
              closed: false,
              assignedTo: null,
              tags: [],
              messages: [], // Messages are loaded on select
              _pageId: c.pageId, // Internal: for API calls
            }));
            setConversations(mapped);
            setSelectedId(mapped[0]?.id || "");
            setIsDemo(false);
          }
        }
      } catch { /* fallback to demo */ }
      setLoading(false);
    };
    fetchReal();
  }, []);

  // When selecting a conversation, fetch its messages from the API
  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    setConversations(prev =>
      prev.map(c => (c.id === id ? { ...c, unread: false } : c))
    );

    // Load real messages if not demo
    if (!isDemo) {
      const conv = conversations.find(c => c.id === id);
      const pageId = (conv as any)?._pageId;
      fetch(`/api/inbox/messages?conversationId=${id}&pageId=${pageId || ""}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.messages?.length) {
            const mapped: Message[] = data.messages.map((m: any) => ({
              id: m.id,
              text: m.text,
              incoming: m.incoming,
              timestamp: new Date(m.timestamp),
            }));
            setConversations(prev =>
              prev.map(c => c.id === id ? { ...c, messages: mapped } : c)
            );
          }
        })
        .catch(() => {});
    }
  };

  const selected = conversations.find(c => c.id === selectedId) || conversations[0];

  const filtered = conversations.filter(c => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.contactName.toLowerCase().includes(q) && !c.lastMessage.toLowerCase().includes(q)) return false;
    }
    if (filterTab === "unread") return c.unread;
    if (filterTab === "closed") return c.closed;
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
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

      {/* Demo Banner */}
      {isDemo && (
      <div style={{
        padding: "8px 16px",
        background: "rgba(168,85,247,0.08)",
        border: "1px solid rgba(168,85,247,0.2)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
      }}>
        <AlertCircle style={{ width: 14, height: 14, color: "#a855f7", flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: "rgba(168,85,247,0.8)" }}>
          Modo Demo — Conecta tu cuenta de Meta para ver mensajes reales
        </span>
      </div>
      )}

      {/* 3-Panel Layout */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, gap: 1 }}>
        {/* LEFT — Conversation List */}
        <div
          className="glass-panel"
          style={{
            width: 280,
            minWidth: 280,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: 0,
          }}
        >
          {/* Search */}
          <div style={{ padding: "12px 12px 8px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <Search style={{ width: 14, height: 14, color: "rgba(148,163,184,0.3)", flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Buscar conversación..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "white",
                  fontSize: 12,
                  width: "100%",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: "flex", padding: "0 12px 8px", gap: 0 }}>
            {([
              { key: "todos", label: "Todos" },
              { key: "unread", label: "Sin leer" },
              { key: "closed", label: "Cerrados" },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                style={{
                  flex: 1,
                  padding: "6px 0",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  color: filterTab === tab.key ? "#a855f7" : "rgba(148,163,184,0.4)",
                  background: filterTab === tab.key ? "rgba(168,85,247,0.08)" : "transparent",
                  border: "1px solid",
                  borderColor: filterTab === tab.key ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontFamily: "'Orbitron', sans-serif",
                }}
              >
                {tab.label}
              </button>
            ))}
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
                      padding: "12px",
                      cursor: "pointer",
                      background: isActive ? "rgba(168,85,247,0.06)" : "transparent",
                      borderLeft: isActive ? "2px solid #a855f7" : "2px solid transparent",
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      {/* Platform icon */}
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: pc.bgAlpha,
                        flexShrink: 0,
                        position: "relative",
                      }}>
                        <pc.icon style={{ width: 16, height: 16, color: pc.color }} />
                        {conv.unread && (
                          <div style={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#a855f7",
                            border: "2px solid rgba(10,10,20,1)",
                          }} />
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{
                            fontSize: 12,
                            fontWeight: conv.unread ? 700 : 500,
                            color: conv.unread ? "white" : "rgba(255,255,255,0.7)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}>
                            {conv.contactName}
                          </span>
                          <span style={{
                            fontSize: 9,
                            color: "rgba(148,163,184,0.35)",
                            whiteSpace: "nowrap",
                            marginLeft: 4,
                          }}>
                            {relativeTime(conv.lastMessageTime)}
                          </span>
                        </div>
                        <p style={{
                          fontSize: 11,
                          color: conv.unread ? "rgba(255,255,255,0.5)" : "rgba(148,163,184,0.35)",
                          margin: "3px 0 0",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontWeight: conv.unread ? 500 : 400,
                        }}>
                          {conv.lastMessage}
                        </p>
                        {conv.closed && (
                          <span style={{
                            display: "inline-block",
                            fontSize: 8,
                            fontWeight: 600,
                            padding: "1px 6px",
                            marginTop: 4,
                            color: "rgba(148,163,184,0.4)",
                            background: "rgba(148,163,184,0.06)",
                            border: "1px solid rgba(148,163,184,0.1)",
                            borderRadius: 3,
                            letterSpacing: "0.05em",
                          }}>
                            CERRADO
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CENTER — Chat View */}
        <div
          className="glass-panel"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: 0,
            minWidth: 0,
          }}
        >
          <ChatView
            conversation={selected}
            onSend={handleSendMessage}
            onClose={handleCloseConversation}
            onToggleProfile={() => setShowProfile(!showProfile)}
            showProfile={showProfile}
          />
        </div>

        {/* RIGHT — Contact Profile */}
        {showProfile && (
          <div
            className="glass-panel"
            style={{
              width: 260,
              minWidth: 260,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderRadius: 0,
            }}
          >
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

  return (
    <>
      {/* Chat Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Avatar */}
          <div style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(168,85,247,0.12)",
            border: "1px solid rgba(168,85,247,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: "#a855f7",
            fontFamily: "'Orbitron', sans-serif",
          }}>
            {getInitials(conversation.contactName)}
          </div>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>
              {conversation.contactName}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span style={{
                fontSize: 9,
                fontWeight: 600,
                padding: "1px 6px",
                color: pc.color,
                background: pc.bgAlpha,
                border: `1px solid ${pc.color}30`,
                borderRadius: 3,
                letterSpacing: "0.03em",
              }}>
                {pc.label}
              </span>
              {conversation.assignedTo && (
                <span style={{ fontSize: 9, color: "rgba(148,163,184,0.4)" }}>
                  → {conversation.assignedTo}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={onClose}
            title={conversation.closed ? "Reabrir" : "Cerrar conversación"}
            style={{
              padding: "6px 10px",
              fontSize: 9,
              fontWeight: 600,
              color: conversation.closed ? "#00c875" : "rgba(148,163,184,0.5)",
              background: conversation.closed ? "rgba(0,200,117,0.08)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${conversation.closed ? "rgba(0,200,117,0.2)" : "rgba(255,255,255,0.06)"}`,
              cursor: "pointer",
              letterSpacing: "0.04em",
              fontFamily: "'Orbitron', sans-serif",
              transition: "all 0.15s",
            }}
          >
            {conversation.closed ? "REABRIR" : "CERRAR"}
          </button>
          <button
            onClick={onToggleProfile}
            style={{
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: showProfile ? "rgba(168,85,247,0.08)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${showProfile ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.06)"}`,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {showProfile ? (
              <ChevronRight style={{ width: 14, height: 14, color: "#a855f7" }} />
            ) : (
              <ChevronLeft style={{ width: 14, height: 14, color: "rgba(148,163,184,0.4)" }} />
            )}
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        {conversation.messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              justifyContent: msg.incoming ? "flex-start" : "flex-end",
            }}
          >
            <div style={{
              maxWidth: "70%",
              padding: "10px 14px",
              background: msg.incoming ? "rgba(255,255,255,0.03)" : "rgba(168,85,247,0.85)",
              border: msg.incoming ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(168,85,247,0.4)",
              borderRadius: msg.incoming ? "2px 12px 12px 12px" : "12px 2px 12px 12px",
            }}>
              <p style={{
                fontSize: 12,
                color: msg.incoming ? "rgba(255,255,255,0.8)" : "white",
                margin: 0,
                lineHeight: 1.5,
              }}>
                {msg.text}
              </p>
              <p style={{
                fontSize: 9,
                color: msg.incoming ? "rgba(148,163,184,0.3)" : "rgba(255,255,255,0.5)",
                margin: "4px 0 0",
                textAlign: msg.incoming ? "left" : "right",
              }}>
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        flexShrink: 0,
      }}>
        {/* Saved Replies Dropdown */}
        {showReplies && (
          <div style={{
            marginBottom: 8,
            background: "rgba(10,10,20,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            maxHeight: 160,
            overflowY: "auto",
          }}>
            {SAVED_REPLIES.map((reply, i) => (
              <div
                key={i}
                onClick={() => {
                  setInput(reply);
                  setShowReplies(false);
                }}
                style={{
                  padding: "8px 12px",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(168,85,247,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {reply}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <button
            onClick={() => setShowReplies(!showReplies)}
            title="Respuestas guardadas"
            style={{
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: showReplies ? "rgba(168,85,247,0.08)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${showReplies ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.06)"}`,
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.15s",
            }}
          >
            <Bookmark style={{ width: 14, height: 14, color: showReplies ? "#a855f7" : "rgba(148,163,184,0.35)" }} />
          </button>

          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            padding: "4px 4px 4px 12px",
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
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "white",
                fontSize: 12,
                resize: "none",
                fontFamily: "inherit",
                lineHeight: 1.5,
                minHeight: 26,
                maxHeight: 80,
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              style={{
                width: 30,
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: input.trim() ? "#a855f7" : "rgba(255,255,255,0.03)",
                border: "none",
                cursor: input.trim() ? "pointer" : "default",
                transition: "all 0.15s",
                flexShrink: 0,
              }}
            >
              <Send style={{ width: 14, height: 14, color: input.trim() ? "white" : "rgba(148,163,184,0.2)" }} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONTACT PROFILE SIDEBAR
// ═══════════════════════════════════════════════════════════════

function ContactProfile({
  conversation,
  onAssign,
  onAddTag,
  onRemoveTag,
  onClose,
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
      {/* Header */}
      <div style={{
        padding: "12px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          color: "rgba(148,163,184,0.4)",
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: "0.1em",
        }}>
          CONTACTO
        </span>
        <button
          onClick={onClose}
          style={{
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <X style={{ width: 12, height: 12, color: "rgba(148,163,184,0.3)" }} />
        </button>
      </div>

      {/* Profile Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        {/* Avatar & Name */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(168,85,247,0.1)",
            border: "2px solid rgba(168,85,247,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
            fontSize: 20,
            fontWeight: 700,
            color: "#a855f7",
            fontFamily: "'Orbitron', sans-serif",
          }}>
            {getInitials(conversation.contactName)}
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "white", margin: "0 0 4px" }}>
            {conversation.contactName}
          </h3>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 10,
            color: pc.color,
            padding: "2px 8px",
            background: pc.bgAlpha,
            border: `1px solid ${pc.color}25`,
            borderRadius: 3,
          }}>
            <pc.icon style={{ width: 10, height: 10 }} />
            {pc.label}
          </div>
        </div>

        {/* Tags */}
        <div style={{ marginBottom: 20 }}>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            color: "rgba(148,163,184,0.35)",
            fontFamily: "'Orbitron', sans-serif",
            letterSpacing: "0.1em",
            display: "block",
            marginBottom: 8,
          }}>
            ETIQUETAS
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {conversation.tags.map(tag => (
              <span
                key={tag}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 10,
                  color: "#a855f7",
                  padding: "3px 8px",
                  background: "rgba(168,85,247,0.08)",
                  border: "1px solid rgba(168,85,247,0.15)",
                  borderRadius: 3,
                }}
              >
                {tag}
                <X
                  style={{ width: 10, height: 10, cursor: "pointer", opacity: 0.5 }}
                  onClick={() => onRemoveTag(tag)}
                />
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              type="text"
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  onAddTag(newTag);
                  setNewTag("");
                }
              }}
              placeholder="Agregar etiqueta..."
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: "4px 8px",
                fontSize: 10,
                color: "white",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={() => { onAddTag(newTag); setNewTag(""); }}
              style={{
                padding: "4px 8px",
                fontSize: 10,
                color: "#a855f7",
                background: "rgba(168,85,247,0.08)",
                border: "1px solid rgba(168,85,247,0.15)",
                cursor: "pointer",
              }}
            >
              <Tag style={{ width: 10, height: 10 }} />
            </button>
          </div>
        </div>

        {/* Conversation Summary */}
        <div style={{ marginBottom: 20 }}>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            color: "rgba(148,163,184,0.35)",
            fontFamily: "'Orbitron', sans-serif",
            letterSpacing: "0.1em",
            display: "block",
            marginBottom: 8,
          }}>
            RESUMEN
          </span>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}>
            <div style={{
              padding: "10px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.04)",
              textAlign: "center",
            }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#a855f7", margin: 0, fontFamily: "'Orbitron', sans-serif" }}>
                {conversation.messages.length}
              </p>
              <p style={{ fontSize: 8, color: "rgba(148,163,184,0.35)", margin: "4px 0 0", letterSpacing: "0.05em" }}>
                MENSAJES
              </p>
            </div>
            <div style={{
              padding: "10px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.04)",
              textAlign: "center",
            }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#00d4ff", margin: 0, fontFamily: "'Orbitron', sans-serif" }}>
                {relativeTime(conversation.messages[0]?.timestamp || new Date())}
              </p>
              <p style={{ fontSize: 8, color: "rgba(148,163,184,0.35)", margin: "4px 0 0", letterSpacing: "0.05em" }}>
                PRIMER MSG
              </p>
            </div>
          </div>
          <div style={{
            marginTop: 8,
            padding: "8px 10px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.04)",
            display: "flex",
            justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>
              📩 Recibidos: {incomingCount}
            </span>
            <span style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>
              📤 Enviados: {outgoingCount}
            </span>
          </div>
        </div>

        {/* Assigned To */}
        <div style={{ marginBottom: 20 }}>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            color: "rgba(148,163,184,0.35)",
            fontFamily: "'Orbitron', sans-serif",
            letterSpacing: "0.1em",
            display: "block",
            marginBottom: 8,
          }}>
            ASIGNADO A
          </span>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowAssign(!showAssign)}
              style={{
                width: "100%",
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                cursor: "pointer",
                color: conversation.assignedTo ? "white" : "rgba(148,163,184,0.4)",
                fontSize: 11,
                fontFamily: "inherit",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <UserPlus style={{ width: 12, height: 12, color: "rgba(148,163,184,0.3)" }} />
                {conversation.assignedTo || "Sin asignar"}
              </div>
              <ChevronRight style={{
                width: 10,
                height: 10,
                color: "rgba(148,163,184,0.2)",
                transform: showAssign ? "rotate(90deg)" : "none",
                transition: "transform 0.15s",
              }} />
            </button>

            {showAssign && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "rgba(10,10,20,0.97)",
                border: "1px solid rgba(255,255,255,0.08)",
                zIndex: 10,
              }}>
                {TEAM_MEMBERS.map(member => (
                  <div
                    key={member}
                    onClick={() => {
                      onAssign(member);
                      setShowAssign(false);
                    }}
                    style={{
                      padding: "8px 10px",
                      fontSize: 11,
                      color: (member === "Sin asignar" && !conversation.assignedTo) ||
                             member === conversation.assignedTo
                        ? "#a855f7"
                        : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(168,85,247,0.06)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {member}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            color: "rgba(148,163,184,0.35)",
            fontFamily: "'Orbitron', sans-serif",
            letterSpacing: "0.1em",
            display: "block",
            marginBottom: 8,
          }}>
            ESTADO
          </span>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 10px",
            background: conversation.closed ? "rgba(148,163,184,0.04)" : "rgba(0,200,117,0.04)",
            border: `1px solid ${conversation.closed ? "rgba(148,163,184,0.08)" : "rgba(0,200,117,0.12)"}`,
          }}>
            {conversation.closed ? (
              <CheckCircle2 style={{ width: 12, height: 12, color: "rgba(148,163,184,0.4)" }} />
            ) : (
              <Circle style={{ width: 12, height: 12, color: "#00c875" }} />
            )}
            <span style={{
              fontSize: 11,
              color: conversation.closed ? "rgba(148,163,184,0.4)" : "#00c875",
            }}>
              {conversation.closed ? "Cerrado" : "Abierto"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
