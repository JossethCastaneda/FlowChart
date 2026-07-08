import { Search, Send, X, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, UserPlus, Tag, Clock, MessageCircle, MessageSquare, AtSign, MoreHorizontal, Bookmark, CheckCircle2, Circle, AlertCircle, Paperclip, Smile, Image, ThumbsUp, User, Globe, ExternalLink, Plus, Filter, Heart, Share2 } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Message, PostComment, PostData, Conversation, ConnectedPage, Platform, ChannelFilter, QueueFilter } from "./types";
import { useHeaderStore } from "@/lib/header-store";
import { relativeTime, formatTime, formatDate, getPlatformConfig, getInitials } from "./utils";
import { SAVED_REPLIES } from "./utils";
import { TEAM_MEMBERS } from "./utils";
import { PlatformIcon } from "./InboxLayout";

// Reusable Avatar component with error fallback
export function Avatar({
  src,
  name,
  size = 42,
  color = "var(--cyan)",
}: {
  src?: string | null;
  name: string;
  size?: number;
  color?: string;
}) {
  const [error, setError] = useState(false);
  
  useEffect(() => {
    setError(false);
  }, [src]);

  const initials = getInitials(name || "Usuario");

  if (src && !error) {
    return (
      <img
        src={src}
        alt={name || "Usuario"}
        role="presentation"
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: `var(--surface-hover)`,
      border: `1px solid var(--hairline)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: Math.max(10, Math.floor(size * 0.35)),
      fontWeight: 700,
      color: color,
    }}>
      {initials || "U"}
    </div>
  );
}

export function PageSelector({
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
          background: open ? "rgba(155,123,232,0.06)" : "var(--surface-hover)",
          border: `1px solid ${open ? "rgba(155,123,232,0.2)" : "var(--hairline)"}`,
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
              fontSize: 11, fontWeight: 700, color: "var(--foreground)", flexShrink: 0,
            }}>
              {selectedPage.name.charAt(0).toUpperCase()}
            </div>
          )
        ) : (
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "var(--surface)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Globe style={{ width: 14, height: 14, color: "var(--purple)" }} />
          </div>
        )}
        <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: "var(--foreground)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {selectedPage?.name || "Todas las páginas"}
          </div>
          {selectedPage && (
            <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "capitalize" }}>
              {selectedPage.platform}
            </div>
          )}
        </div>
        <ChevronDown style={{
          width: 14, height: 14, color: "var(--text-muted)",
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.2s", flexShrink: 0,
        }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "var(--panel-bg)", 
          border: "1px solid var(--glass-border)", borderRadius: 12,
          boxShadow: "var(--shadow-hard)",
          maxHeight: 360, display: "flex", flexDirection: "column",
          overflow: "hidden",
          zIndex: 9999,
        }}>
          {/* Search */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--hairline)" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 8px",
              background: "var(--surface-hover)",
              borderRadius: 6, border: "1px solid var(--hairline)",
            }}>
              <Search style={{ width: 12, height: 12, color: "var(--text-muted)", flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Buscar página..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                style={{
                  background: "transparent", border: "none", outline: "none",
                  color: "var(--foreground)", fontSize: 11, width: "100%", fontFamily: "inherit",
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
                padding: "8px 12px", background: !selectedPage ? "rgba(155,123,232,0.06)" : "transparent",
                border: "none", borderBottom: "1px solid var(--hairline)",
                cursor: "pointer", transition: "background 0.1s", fontFamily: "inherit",
                borderLeft: !selectedPage ? "3px solid var(--purple)" : "3px solid transparent",
              }}
              onMouseEnter={e => { if (selectedPage) e.currentTarget.style.background = "var(--row-hover)"; }}
              onMouseLeave={e => { if (selectedPage) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "var(--surface)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Globe style={{ width: 15, height: 15, color: "var(--purple)" }} />
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: !selectedPage ? "var(--purple)" : "white" }}>Todas las páginas</div>
                <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{pages.length} cuentas conectadas</div>
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
                    background: isActive ? "rgba(155,123,232,0.06)" : "transparent",
                    border: "none", borderBottom: "1px solid var(--hairline)",
                    cursor: "pointer", transition: "background 0.1s", fontFamily: "inherit",
                    borderLeft: isActive ? "3px solid var(--purple)" : "3px solid transparent",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--row-hover)"; }}
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
                        fontSize: 12, fontWeight: 700, color: "var(--foreground)",
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
                      border: "2px solid var(--background)",
                    }}>
                      {page.platform === "instagram" ? (
                        <MessageCircle style={{ width: 7, height: 7, color: "var(--foreground)" }} />
                      ) : (
                        <MessageSquare style={{ width: 7, height: 7, color: "var(--foreground)" }} />
                      )}
                    </div>
                  </div>

                  {/* Page info */}
                  <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: isActive ? 600 : 500,
                      color: isActive ? "var(--purple)" : "white",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {page.name}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "capitalize" }}>
                      {page.platform}
                    </div>
                  </div>

                  {/* Active dot */}
                  {isActive && (
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "var(--purple)", flexShrink: 0,
                    }} />
                  )}
                </button>
              );
            })}

            {filteredPages.length === 0 && (
              <div style={{ padding: 16, textAlign: "center", fontSize: 11, color: "var(--text-muted)" }}>
                Sin resultados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    );
}

export function PostView({ conversation, onBack }: { conversation: Conversation; onBack?: () => void }) {
    const postData = (conversation as any)?._postData as PostData | null;
    const pc = getPlatformConfig(conversation.platform);
    if (!postData) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 }}>
        <MessageSquare style={{ width: 32, height: 32, color: "var(--text-muted)" }} />
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Sin datos de publicación</p>
      </div>
    );
    }

    return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--hairline)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        {onBack && (
          <button onClick={onBack} className="md:hidden text-[var(--text-secondary)] hover:text-[var(--foreground)] mr-2">
            <ChevronLeft style={{ width: 20, height: 20 }} />
          </button>
        )}
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: pc.color, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <pc.icon style={{ width: 16, height: 16, color: "var(--foreground)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{(conversation as any)?._pageName || conversation.contactName}</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{pc.label} · {formatDate(conversation.lastMessageTime)}</div>
        </div>
        {postData.permalink && (
          <a href={postData.permalink} target="_blank" rel="noopener noreferrer"
            style={{
              padding: "5px 10px", borderRadius: 6,
              background: "var(--surface-hover)",
              border: "1px solid var(--hairline)",
              color: "var(--cyan)", fontSize: 10, fontWeight: 600,
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
            width: "100%",
            borderBottom: "1px solid var(--hairline)",
            background: "var(--panel-bg)", 
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img
              src={postData.mediaUrl}
              alt=""
              style={{
                width: "100%", maxHeight: 500,
                objectFit: "contain",
                display: "block",
              }}
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
            />
          </div>
        )}

        {/* Engagement metrics */}
        <div style={{
          display: "flex", gap: 20, padding: "12px 16px",
          borderBottom: "1px solid var(--hairline)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Heart style={{ width: 14, height: 14, color: "var(--red)" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{(postData.likeCount ?? 0).toLocaleString()}</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>likes</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <MessageCircle style={{ width: 14, height: 14, color: "var(--cyan)" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{(postData.commentsCount ?? 0).toLocaleString()}</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>comentarios</span>
          </div>
          {(postData.shareCount || 0) > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Share2 style={{ width: 14, height: 14, color: "var(--purple)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{(postData.shareCount || 0).toLocaleString()}</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>shares</span>
            </div>
          )}
        </div>

        {/* Caption */}
        {postData.caption && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--hairline)" }}>
            <p style={{
              fontSize: 13, color: "var(--foreground)", lineHeight: 1.6,
              margin: 0, whiteSpace: "pre-wrap",
            }}>
              {postData.caption.length > 300 ? postData.caption.slice(0, 300) + "..." : postData.caption}
            </p>
          </div>
        )}

        {/* Comments section */}
        <div style={{ padding: "12px 16px 6px" }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
            letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12,
          }}>
            Comentarios ({postData.commentsCount})
          </div>

          {postData.comments.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: 20 }}>
              Sin comentarios recientes
            </p>
          ) : (
            postData.comments.map((comment, i) => (
              <div key={comment.id || i} style={{
                display: "flex", gap: 10, padding: "10px 0",
                borderBottom: i < postData.comments.length - 1 ? "1px solid var(--hairline)" : "none",
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
                          d.style.cssText = "width:32px;height:32px;border-radius:50%;background:rgba(155,123,232,0.1);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--purple);";
                          d.textContent = comment.username.charAt(0).toUpperCase();
                          parent.insertBefore(d, e.target as Node);
                        }
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "var(--surface)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: "var(--purple)",
                    }}>
                      {comment.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Comment content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{comment.username}</span>
                    <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                      {new Date(comment.timestamp).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                    {comment.text}
                  </p>
                  {comment.likes > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}>
                      <Heart style={{ width: 10, height: 10, color: "var(--red)" }} />
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{comment.likes}</span>
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

export function ChatView({
      conversation,
      onSend,
      onClose,
      onToggleProfile,
      showProfile,
      onBack,
    }: {
          conversation: Conversation;
          onSend: (text: string) => void;
          onClose: () => void;
          onToggleProfile: () => void;
          showProfile: boolean;
          onBack?: () => void;
        }) {
    const [input, setInput] = useState("");
    const { setBreadcrumbs } = useHeaderStore();

    useEffect(() => {
      let displayName = conversation.contactName || conversation.id;
      if (/^\d+$/.test(displayName)) {
        displayName = "Usuario Anonimizado";
      }
      setBreadcrumbs([
        { label: "Conversaciones", onClick: onBack },
        { label: "Chats", onClick: onBack },
        { label: displayName }
      ]);
      return () => setBreadcrumbs([]);
    }, [conversation.id, conversation.contactName, onBack, setBreadcrumbs]);
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
      {/* --- Chat Header --- */}
      <div style={{
        padding: "16px",
        borderBottom: "1px solid var(--glass-border)",
        display: "flex", flexDirection: "column", gap: 10,
        flexShrink: 0, background: "transparent",
      }}>
        {/* Top Row: User Info */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "var(--text-muted)" }}>
            {onBack && (
              <button onClick={onBack} className="md:hidden text-[var(--text-secondary)] hover:text-[var(--foreground)] mr-1" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <ChevronLeft style={{ width: 18, height: 18 }} />
              </button>
            )}
            
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar src={conversation.contactAvatar} name={conversation.contactName && /^\d+$/.test(conversation.contactName) ? "Usuario Anonimizado" : (conversation.contactName || "Usuario")} size={36} color={pc.color} />
              <span style={{ color: "var(--foreground)", fontWeight: 600, fontSize: 16 }}>
                {conversation.contactName && /^\d+$/.test(conversation.contactName) ? "Usuario Anonimizado" : (conversation.contactName || "Usuario")}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button 
              onClick={onClose}
              style={{ background: "transparent", border: "1px solid var(--glass-border)", color: conversation.closed ? "var(--emerald)" : "var(--text-secondary)", cursor: "pointer", padding: "6px 12px", borderRadius: "16px", fontSize: "11px", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <CheckCircle2 style={{ width: 14, height: 14 }} />
              {conversation.closed ? "REABRIR" : "CERRAR"}
            </button>
            <button
              onClick={onToggleProfile}
              style={{ background: "none", border: "none", color: showProfile ? "var(--cyan)" : "var(--text-secondary)", cursor: "pointer", padding: 4 }}
            >
              <ChevronRight style={{ width: 16, height: 16, transform: showProfile ? "rotate(180deg)" : "none" }} />
            </button>
          </div>
        </div>
      </div>



      {/* --- Messages Area --- */}
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
              <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
              <span style={{
                fontSize: 10, color: "var(--text-muted)",
                fontWeight: 500, whiteSpace: "nowrap",
              }}>
                {group.date}
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
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
                      ? "var(--surface-hover)"
                      : "linear-gradient(135deg, #006AFF, #006AFF)",
                    border: msg.incoming ? "1px solid var(--hairline)" : "none",
                    borderRadius: msg.incoming ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                    boxShadow: msg.incoming ? "none" : "0 2px 8px rgba(0,106,255,0.3)",
                  }}>
                    <p style={{
                      fontSize: 13, color: msg.incoming ? "var(--foreground)" : "white",
                      margin: 0, lineHeight: 1.5, wordBreak: "break-word",
                    }}>
                      {msg.text}
                    </p>
                  </div>
                  {/* Message Status */}
                  {!msg.incoming && msg.status && (
                    <div style={{ fontSize: 9, color: msg.status === "error" ? "var(--red)" : "var(--text-muted)", marginTop: 4, textAlign: "right", fontWeight: 500 }}>
                      {msg.status === "sending" ? "Enviando..." : msg.status === "error" ? (msg.errorText || "Error al enviar") : ""}
                    </div>
                  )}
                  {/* Mock quick reply buttons under bot messages */}
                  {!msg.incoming && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
                      {["Más info.", "Quiero ser BAIT", "! Ya no tengo línea."].map((reply, i) => (
                        <button
                          key={i}
                          style={{
                            padding: "6px 12px", fontSize: 11, fontWeight: 500,
                            color: "var(--cyan)", background: "transparent",
                            border: "1px solid var(--cyan)", borderRadius: 16,
                            cursor: "pointer", fontFamily: "inherit"
                          }}
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                  <p style={{
                    fontSize: 9, margin: "3px 4px 0",
                    color: "var(--text-muted)",
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

      {/* --- Suggested Replies --- */}
      {showReplies && (
        <div style={{
          borderTop: "1px solid var(--hairline)",
          padding: "8px 16px",
          background: "var(--hairline)",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 6,
          }}>
            <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600 }}>
              Respuestas sugeridas
            </span>
            <button
              onClick={() => setShowReplies(false)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
            >
              <X style={{ width: 12, height: 12, color: "var(--text-muted)" }} />
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SAVED_REPLIES.map((reply, i) => (
              <button
                key={i}
                onClick={() => { setInput(reply); setShowReplies(false); }}
                style={{
                  padding: "5px 10px", fontSize: 11,
                  color: "var(--text-secondary)",
                  background: "var(--surface-hover)",
                  border: "1px solid var(--hairline)",
                  borderRadius: 16, cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap", fontFamily: "inherit",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(155,123,232,0.08)";
                  e.currentTarget.style.borderColor = "rgba(155,123,232,0.2)";
                  e.currentTarget.style.color = "var(--purple)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "var(--surface-hover)";
                  e.currentTarget.style.borderColor = "var(--hairline)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                }}
              >
                {reply.length > 50 ? reply.slice(0, 50) + "..." : reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- Input Bar (always visible at bottom) --- */}
      <div style={{
        padding: "10px 16px",
        borderTop: "1px solid var(--hairline)",
        flexShrink: 0,
        background: "var(--hairline)",
      }}>
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
                  background: btn.active ? "rgba(155,123,232,0.08)" : "transparent",
                  border: "none", borderRadius: 6, cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = btn.active ? "rgba(155,123,232,0.08)" : "transparent"}
              >
                <btn.icon style={{
                  width: 16, height: 16,
                  color: btn.active ? "var(--purple)" : "var(--text-secondary)",
                }} />
              </button>
            ))}
          </div>

          {/* Text input */}
          <div style={{
            flex: 1, display: "flex", alignItems: "flex-end", gap: 8,
            background: "var(--surface-hover)",
            border: "1px solid var(--hairline)",
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
              placeholder="Escribe un mensaje o '/' para acciones rapidas o respuestas predeterminadas"
              rows={1}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "var(--foreground)", fontSize: 13, resize: "none", fontFamily: "inherit",
                lineHeight: 1.5, minHeight: 28, maxHeight: 80,
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              style={{
                width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: input.trim() ? "linear-gradient(135deg, var(--purple), var(--purple))" : "var(--row-hover)",
                border: "none", borderRadius: 8,
                cursor: input.trim() ? "pointer" : "default",
                transition: "all 0.2s", flexShrink: 0,
                boxShadow: input.trim() ? "0 2px 8px rgba(155,123,232,0.3)" : "none",
              }}
            >
              <Send style={{
                width: 14, height: 14,
                color: input.trim() ? "white" : "var(--text-muted)",
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
            onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <ThumbsUp style={{ width: 18, height: 18, color: "var(--text-muted)" }} />
          </button>
        </div>
      </div>
    </>
    );
}

export function ProfileSection({ title, defaultOpen = true, children }: {
      title: string; defaultOpen?: boolean; children: React.ReactNode;
    }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
    <div style={{ borderBottom: "1px solid var(--hairline)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: "transparent", border: "none",
          cursor: "pointer", transition: "all 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <span style={{
          fontSize: 12, fontWeight: 600, color: "var(--foreground)",
        }}>
          {title}
        </span>
        {open ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", border: "1px solid var(--cyan)", color: "var(--cyan)" }}>
            <span style={{ fontSize: 14, lineHeight: 1, marginTop: -2 }}>-</span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", border: "1px solid var(--cyan)", color: "var(--cyan)" }}>
            <span style={{ fontSize: 12, lineHeight: 1 }}>+</span>
          </div>
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


export function ContactProfile({
      conversation, onAssign, onAddTag, onRemoveTag, onAddNote, onDeleteNote, onClose,
    }: {
          conversation: Conversation;
          onAssign: (member: string) => void;
          onAddTag: (tag: string) => void;
          onRemoveTag: (tag: string) => void;
          onAddNote: (content: string) => Promise<any>;
          onDeleteNote: (noteId: string) => void;
          onClose: () => void;
        }) {
    const [newTag, setNewTag] = useState("");
    const [showAssign, setShowAssign] = useState(false);
    const [noteText, setNoteText] = useState("");
    const [savingNote, setSavingNote] = useState(false);
    const assignRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (assignRef.current && !assignRef.current.contains(e.target as Node)) {
          setShowAssign(false);
        }
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    const pc = getPlatformConfig(conversation.platform);
    const incomingCount = conversation.messages.filter(m => m.incoming).length;
    const outgoingCount = conversation.messages.filter(m => !m.incoming).length;

    const displayName = conversation.contactName && /^\d+$/.test(conversation.contactName)
      ? "Usuario Anonimizado"
      : (conversation.contactName || "Usuario");

    const platformLabel: Record<string, string> = {
      fb_messenger: "Facebook Messenger",
      ig_dm: "Instagram DM",
      instagram_dm: "Instagram DM",
      ig_comment: "Comentario Instagram",
      instagram_comment: "Comentario Instagram",
      fb_comment: "Comentario Facebook",
      whatsapp: "WhatsApp",
    };

    const handleSaveNote = async () => {
      if (!noteText.trim()) return;
      setSavingNote(true);
      await onAddNote(noteText.trim());
      setNoteText("");
      setSavingNote(false);
    };

    const fmtDate = (iso: string) => {
      const d = new Date(iso);
      return d.toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Profile Header */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid var(--hairline)", flexShrink: 0, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--cyan)", cursor: "pointer", padding: 4 }}>
          <X style={{ width: 14, height: 14 }} />
        </button>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ margin: "0 auto 10px", position: "relative" }}>
            <Avatar src={conversation.contactAvatar} name={displayName} size={60} color={pc.color} />
            <div style={{ position: "absolute", bottom: 0, right: 0, background: "var(--surface)", borderRadius: "50%", padding: 2, border: "1px solid var(--hairline)" }}>
              <PlatformIcon platform={conversation.platform} size={12} />
            </div>
          </div>

          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 4px" }}>Datos del contacto</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 0 2px" }}>
            <User style={{ width: 12, height: 12, color: "var(--text-muted)" }} />
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{displayName}</h3>
          </div>

          <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 4px", display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
            <PlatformIcon platform={conversation.platform} size={10} />
            {platformLabel[conversation.platform] || conversation.platform}
            {conversation.pageName && <><span style={{ opacity: 0.4 }}>·</span><span style={{ color: "var(--text-secondary)" }}>{conversation.pageName}</span></>}
          </p>

          <span style={{
            fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10, marginBottom: 8,
            background: conversation.closed ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
            color: conversation.closed ? "#ef4444" : "#10b981",
            border: `1px solid ${conversation.closed ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`,
            letterSpacing: "0.08em",
          }}>
            {conversation.closed ? "CERRADO" : "ACTIVO"}
          </span>

          {/* Activity mini-stats */}
          {(incomingCount + outgoingCount) > 0 && (
            <div style={{ display: "flex", gap: 6, width: "100%" }}>
              {[
                { label: "Recibidos", value: incomingCount, color: "var(--cyan)" },
                { label: "Enviados", value: outgoingCount, color: "#8b5cf6" },
                ...(conversation.createdAt ? [{ label: "Inicio", value: new Date(conversation.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }), color: "#f59e0b" as string }] : []),
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, background: "var(--surface-hover)", borderRadius: 8, padding: "6px 4px", border: "1px solid var(--hairline)", textAlign: "center" }}>
                  <p style={{ fontSize: typeof s.value === "number" ? 16 : 10, fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: 8, color: "var(--text-muted)", margin: "2px 0 0", letterSpacing: "0.05em", textTransform: "uppercase" }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Assignment */}
          <div ref={assignRef} style={{ marginTop: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: "100%", position: "relative" }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: conversation.assignedTo ? "var(--green)" : "var(--yellow)" }} />
              <span>{conversation.assignedTo ? `Asignado: ${conversation.assignedTo}` : "Sin asignar"}</span>
            </div>
            <button onClick={() => setShowAssign(!showAssign)}
              style={{ background: "transparent", border: "1px solid var(--glass-border)", color: "var(--cyan)", fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontFamily: "inherit" }}>
              <span>Cambiar asignación</span>
              <ChevronDown style={{ width: 10, height: 10 }} />
            </button>
            {showAssign && (
              <div style={{ position: "absolute", top: "105%", left: "50%", transform: "translateX(-50%)", background: "var(--panel-bg)", border: "1px solid var(--glass-border)", borderRadius: 8, boxShadow: "var(--shadow-hard)", zIndex: 9999, minWidth: 140, overflow: "hidden" }}>
                {TEAM_MEMBERS.map(member => (
                  <button key={member} onClick={() => { onAssign(member); setShowAssign(false); }}
                    style={{ width: "100%", padding: "8px 12px", border: "none", borderBottom: "1px solid var(--hairline)", background: (conversation.assignedTo === member || (!conversation.assignedTo && member === "Sin asignar")) ? "var(--surface-hover)" : "transparent", color: "var(--text-secondary)", fontSize: 11, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                    {member}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Sections */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* NOTAS */}
        <ProfileSection title="Notas">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <textarea
              value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Nota interna (Ctrl+Enter para guardar)..."
              rows={2}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSaveNote(); }}
              style={{ width: "100%", background: "var(--surface-hover)", border: "1px solid var(--hairline)", borderRadius: 8, padding: "6px 8px", fontSize: 11, color: "var(--foreground)", fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
            />
            <button onClick={handleSaveNote} disabled={!noteText.trim() || savingNote}
              style={{ alignSelf: "flex-end", padding: "4px 12px", borderRadius: 8, background: "var(--cyan)", color: "#000", fontSize: 10, fontWeight: 700, border: "none", cursor: "pointer", opacity: (!noteText.trim() || savingNote) ? 0.5 : 1 }}>
              {savingNote ? "Guardando..." : "Guardar nota"}
            </button>
            {conversation.notes.length === 0
              ? <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Sin notas agregadas.</p>
              : conversation.notes.map(note => (
                <div key={note.id} style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--amber)" }}>{note.author.name}</span>
                      <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 6 }}>{fmtDate(note.createdAt)}</span>
                    </div>
                    <button onClick={() => onDeleteNote(note.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}>
                      <X style={{ width: 10, height: 10 }} />
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, whiteSpace: "pre-wrap" }}>{note.content}</p>
                </div>
              ))
            }
          </div>
        </ProfileSection>

        {/* ETIQUETAS */}
        <ProfileSection title="Etiquetas">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {conversation.tags.map(tag => (
              <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--cyan)", padding: "3px 8px", background: "var(--surface)", border: "1px solid rgba(0,178,255,0.15)", borderRadius: 12 }}>
                {tag}
                <X style={{ width: 10, height: 10, cursor: "pointer", opacity: 0.5 }} onClick={() => onRemoveTag(tag)} />
              </span>
            ))}
            {conversation.tags.length === 0 && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Sin etiquetas.</span>}
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nueva etiqueta..."
              style={{ flex: 1, background: "var(--surface-hover)", border: "1px solid var(--hairline)", borderRadius: 6, padding: "4px 8px", fontSize: 11, color: "var(--foreground)", fontFamily: "inherit", outline: "none" }}
              onKeyDown={e => { if (e.key === "Enter" && newTag.trim()) { onAddTag(newTag.trim()); setNewTag(""); }}}
            />
            <button onClick={() => { if (newTag.trim()) { onAddTag(newTag.trim()); setNewTag(""); }}}
              style={{ padding: "4px 10px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text-secondary)", fontSize: 10, cursor: "pointer" }}>+</button>
          </div>
        </ProfileSection>

        {/* CANAL (datos dinámicos) */}
        <ProfileSection title="Canal">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "Plataforma", value: platformLabel[conversation.platform] || conversation.platform, hasIcon: true },
              { label: "Página / Canal", value: conversation.pageName || conversation.pageId || "—" },
              { label: "ID de Contacto", value: conversation.contactId || "—" },
              { label: "Estado", value: conversation.closed ? "Cerrado" : "Abierto" },
              ...(conversation.createdAt ? [{ label: "Primer contacto", value: fmtDate(conversation.createdAt) }] : []),
              { label: "Último mensaje", value: fmtDate(conversation.lastMessageTime.toISOString()) },
            ].map((v, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--foreground)" }}>{v.label}</span>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                  {(v as any).hasIcon && <PlatformIcon platform={conversation.platform} size={12} />}
                  {v.value}
                </span>
              </div>
            ))}
          </div>
        </ProfileSection>

        {/* Mensajes destacados / Multimedia */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>Mensajes destacados</span>
          <ChevronRight style={{ width: 14, height: 14, color: "var(--text-muted)" }} />
        </div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>Multimedia y documentos</span>
          <ChevronRight style={{ width: 14, height: 14, color: "var(--text-muted)" }} />
        </div>

      </div>
    </div>
  );
}
