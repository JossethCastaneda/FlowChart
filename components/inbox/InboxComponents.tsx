import { Search, Send, X, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, UserPlus, Tag, Clock, MessageCircle, MessageSquare, AtSign, MoreHorizontal, Bookmark, CheckCircle2, Circle, AlertCircle, Paperclip, Smile, Image, ThumbsUp, User, Globe, ExternalLink, Plus, Filter, Heart, Share2 } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Message, PostComment, PostData, Conversation, ConnectedPage, Platform, ChannelFilter, QueueFilter } from "./types";
import { relativeTime, formatTime, formatDate, getPlatformConfig, getInitials } from "./utils";
import { SAVED_REPLIES } from "./utils";
import { TEAM_MEMBERS } from "./utils";

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
          background: open ? "rgba(168,85,247,0.06)" : "rgba(255,255,255,0.04)",
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
            <div style={{ fontSize: 9, color: "#64748b", textTransform: "capitalize" }}>
              {selectedPage.platform}
            </div>
          )}
        </div>
        <ChevronDown style={{
          width: 14, height: 14, color: "rgba(148,163,184,0.65)",
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
              background: "rgba(255,255,255,0.09)",
              borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <Search style={{ width: 12, height: 12, color: "rgba(148,163,184,0.65)", flexShrink: 0 }} />
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
                <div style={{ fontSize: 9, color: "rgba(148,163,184,0.65)" }}>{pages.length} cuentas conectadas</div>
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
                    <div style={{ fontSize: 9, color: "rgba(148,163,184,0.65)", textTransform: "capitalize" }}>
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
              <div style={{ padding: 16, textAlign: "center", fontSize: 11, color: "rgba(148,163,184,0.65)" }}>
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
        <MessageSquare style={{ width: 32, height: 32, color: "rgba(148,163,184,0.65)" }} />
        <p style={{ fontSize: 13, color: "#64748b" }}>Sin datos de publicación</p>
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
        {onBack && (
          <button onClick={onBack} className="md:hidden text-slate-400 hover:text-white mr-2">
            <ChevronLeft style={{ width: 20, height: 20 }} />
          </button>
        )}
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: pc.color, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <pc.icon style={{ width: 16, height: 16, color: "white" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{(conversation as any)?._pageName || conversation.contactName}</div>
          <div style={{ fontSize: 10, color: "#64748b" }}>{pc.label} · {formatDate(conversation.lastMessageTime)}</div>
        </div>
        {postData.permalink && (
          <a href={postData.permalink} target="_blank" rel="noopener noreferrer"
            style={{
              padding: "5px 10px", borderRadius: 6,
              background: "rgba(255,255,255,0.09)",
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
            width: "100%",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.4)",
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
          borderBottom: "1px solid rgba(255,255,255,0.09)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Heart style={{ width: 14, height: 14, color: "#ef4444" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{(postData.likeCount ?? 0).toLocaleString()}</span>
            <span style={{ fontSize: 10, color: "rgba(148,163,184,0.65)" }}>likes</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <MessageCircle style={{ width: 14, height: 14, color: "#00d4ff" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{(postData.commentsCount ?? 0).toLocaleString()}</span>
            <span style={{ fontSize: 10, color: "rgba(148,163,184,0.65)" }}>comentarios</span>
          </div>
          {(postData.shareCount || 0) > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Share2 style={{ width: 14, height: 14, color: "#a855f7" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{(postData.shareCount || 0).toLocaleString()}</span>
              <span style={{ fontSize: 10, color: "rgba(148,163,184,0.65)" }}>shares</span>
            </div>
          )}
        </div>

        {/* Caption */}
        {postData.caption && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
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
            fontSize: 11, fontWeight: 700, color: "#64748b",
            letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12,
          }}>
            Comentarios ({postData.commentsCount})
          </div>

          {postData.comments.length === 0 ? (
            <p style={{ fontSize: 12, color: "rgba(148,163,184,0.65)", textAlign: "center", padding: 20 }}>
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
                    <span style={{ fontSize: 9, color: "rgba(148,163,184,0.65)" }}>
                      {new Date(comment.timestamp).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.5 }}>
                    {comment.text}
                  </p>
                  {comment.likes > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}>
                      <Heart style={{ width: 10, height: 10, color: "#ef4444" }} />
                      <span style={{ fontSize: 10, color: "#64748b" }}>{comment.likes}</span>
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
      {/* ─── Chat Header ─── */}
      <div style={{
        padding: "10px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, background: "rgba(255,255,255,0.015)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {onBack && (
            <button onClick={onBack} className="md:hidden text-slate-400 hover:text-white mr-1">
              <ChevronLeft style={{ width: 20, height: 20 }} />
            </button>
          )}
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
                  fontSize: 9, color: "rgba(148,163,184,0.65)",
                  padding: "1px 6px", background: "rgba(255,255,255,0.09)",
                  borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)",
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
          {/* (Removed non-functional Notificaciones/Marcar/Archivar buttons for a cleaner header) */}
          <button
            onClick={onClose}
            style={{
              padding: "6px 12px", fontSize: 10, fontWeight: 600,
              color: conversation.closed ? "#00c875" : "#94a3b8",
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
              color: showProfile ? "#a855f7" : "#94a3b8",
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
                fontSize: 10, color: "rgba(148,163,184,0.65)",
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
                      ? "rgba(255,255,255,0.1)"
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
                    color: "rgba(148,163,184,0.55)",
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
            <span style={{ fontSize: 10, color: "rgba(148,163,184,0.7)", fontWeight: 600 }}>
              Respuestas sugeridas
            </span>
            <button
              onClick={() => setShowReplies(false)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
            >
              <X style={{ width: 12, height: 12, color: "rgba(148,163,184,0.55)" }} />
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
                  background: "rgba(255,255,255,0.09)",
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
                  e.currentTarget.style.background = "rgba(255,255,255,0.09)";
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
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = btn.active ? "rgba(168,85,247,0.08)" : "transparent"}
              >
                <btn.icon style={{
                  width: 16, height: 16,
                  color: btn.active ? "#a855f7" : "#94a3b8",
                }} />
              </button>
            ))}
          </div>

          {/* Text input */}
          <div style={{
            flex: 1, display: "flex", alignItems: "flex-end", gap: 8,
            background: "rgba(255,255,255,0.09)",
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
                color: input.trim() ? "white" : "rgba(148,163,184,0.65)",
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
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <ThumbsUp style={{ width: 18, height: 18, color: "rgba(148,163,184,0.65)" }} />
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
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: "transparent", border: "none",
          cursor: "pointer", transition: "all 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <span style={{
          fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)",
          letterSpacing: "0.03em",
        }}>
          {title}
        </span>
        {open ? (
          <ChevronUp style={{ width: 12, height: 12, color: "rgba(148,163,184,0.65)" }} />
        ) : (
          <ChevronDown style={{ width: 12, height: 12, color: "rgba(148,163,184,0.65)" }} />
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
        borderBottom: "1px solid rgba(255,255,255,0.09)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "4px 8px", fontSize: 10,
              background: "transparent", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 6, color: "#64748b", cursor: "pointer",
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "rgba(255,255,255,0.75)" }}>
              <User style={{ width: 12, height: 12, color: "rgba(148,163,184,0.65)" }} />
              {conversation.contactName}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#64748b" }}>
              <Globe style={{ width: 12, height: 12, color: "rgba(148,163,184,0.65)" }} />
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "rgba(255,255,255,0.75)" }}>
            <pc.icon style={{ width: 14, height: 14, color: pc.color }} />
            <span>{conversation.contactName}</span>
            <ExternalLink style={{ width: 10, height: 10, color: "rgba(148,163,184,0.65)", cursor: "pointer" }} />
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
              background: "rgba(255,255,255,0.04)", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.09)",
            }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#a855f7", margin: 0 }}>
                {conversation.messages.length}
              </p>
              <p style={{ fontSize: 9, color: "rgba(148,163,184,0.65)", margin: "4px 0 0" }}>
                Mensajes
              </p>
            </div>
            <div style={{
              padding: 10, textAlign: "center",
              background: "rgba(255,255,255,0.04)", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.09)",
            }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#00d4ff", margin: 0 }}>
                {relativeTime(conversation.messages[0]?.timestamp || new Date())}
              </p>
              <p style={{ fontSize: 9, color: "rgba(148,163,184,0.65)", margin: "4px 0 0" }}>
                Primer msg
              </p>
            </div>
          </div>
          <div style={{
            marginTop: 8, padding: "8px 10px",
            background: "rgba(255,255,255,0.04)", borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.09)",
            display: "flex", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 10, color: "#64748b" }}>
              📩 Recibidos: {incomingCount}
            </span>
            <span style={{ fontSize: 10, color: "#64748b" }}>
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
                color: conversation.assignedTo ? "white" : "#64748b",
                fontSize: 11, fontFamily: "inherit",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <UserPlus style={{ width: 12, height: 12, color: "rgba(148,163,184,0.65)" }} />
                {conversation.assignedTo || "Sin asignar"}
              </div>
              <ChevronDown style={{
                width: 10, height: 10, color: "rgba(148,163,184,0.65)",
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
            border: `1px solid ${conversation.closed ? "rgba(148,163,184,0.16)" : "rgba(0,200,117,0.12)"}`,
          }}>
            {conversation.closed ? (
              <CheckCircle2 style={{ width: 14, height: 14, color: "#64748b" }} />
            ) : (
              <Circle style={{ width: 14, height: 14, color: "#00c875" }} />
            )}
            <span style={{
              fontSize: 12, fontWeight: 500,
              color: conversation.closed ? "#64748b" : "#00c875",
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
