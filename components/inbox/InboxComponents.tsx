/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect, react-hooks/refs */
import { Search, Send, X, ChevronRight, ChevronLeft, ChevronDown, MessageCircle, MessageSquare, Bookmark, CheckCircle2, Paperclip, Smile, Image, ThumbsUp, User, Globe, ExternalLink, Heart, Share2, Check, CheckCheck } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { Message, PostData, Conversation, ConnectedPage } from "./types";
import { useHeaderStore } from "@/lib/header-store";
import { formatTime, formatDate, getPlatformConfig, getInitials, resolveContactAvatar } from "./utils";
import { SAVED_REPLIES } from "./utils";
import { TEAM_MEMBERS } from "./utils";
import { PlatformIcon } from "./InboxLayout";

// Reusable Avatar component with error fallback
export function Avatar({
  src,
  name,
  size = 42,
  color = "var(--fc-accent)",
  style,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
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
        className={className}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", ...style }}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div className={className} style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: `var(--fc-surface-hover)`,
      border: `1px solid var(--fc-border)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: Math.max(10, Math.floor(size * 0.35)),
      fontWeight: 700,
      color: color,
      ...style
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
          background: open ? "var(--fc-surface-hover)" : "var(--fc-surface-hover)",
          border: `1px solid ${open ? "var(--fc-border)" : "var(--fc-border)"}`,
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
              fontSize: 11, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--fc-text)", letterSpacing: "-0.01em", flexShrink: 0,
            }}>
              {selectedPage.name.charAt(0).toUpperCase()}
            </div>
          )
        ) : (
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "var(--fc-surface)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Globe style={{ width: 14, height: 14, color: "var(--fc-module-aria)" }} />
          </div>
        )}
        <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: "var(--fc-text)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {selectedPage?.name || "Todas las páginas"}
          </div>
          {selectedPage && (
            <div style={{ fontSize: 9, color: "var(--fc-text-muted)", textTransform: "capitalize" }}>
              {selectedPage.platform}
            </div>
          )}
        </div>
        <ChevronDown style={{
          width: 14, height: 14, color: "var(--fc-text-muted)",
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.2s", flexShrink: 0,
        }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "var(--fc-surface)", 
          border: "1px solid var(--fc-glass-border)", borderRadius: 12,
          boxShadow: "var(--fc-shadow-hard)",
          maxHeight: 360, display: "flex", flexDirection: "column",
          overflow: "hidden",
          zIndex: 9999,
        }}>
          {/* Search */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--fc-border)" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 8px",
              background: "var(--fc-surface-hover)",
              borderRadius: 6, border: "1px solid var(--fc-border)",
            }}>
              <Search style={{ width: 12, height: 12, color: "var(--fc-text-muted)", flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Buscar página..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                style={{
                  background: "transparent", border: "none", outline: "none",
                  color: "var(--fc-text)", fontSize: 11, width: "100%", fontFamily: "inherit",
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
                padding: "8px 12px", background: !selectedPage ? "var(--fc-surface-hover)" : "transparent",
                border: "none", borderBottom: "1px solid var(--fc-border)",
                cursor: "pointer", transition: "background 0.1s", fontFamily: "inherit",
                borderLeft: !selectedPage ? "3px solid var(--fc-module-aria)" : "3px solid transparent",
              }}
              onMouseEnter={e => { if (selectedPage) e.currentTarget.style.background = "var(--fc-row-hover)"; }}
              onMouseLeave={e => { if (selectedPage) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "var(--fc-surface)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Globe style={{ width: 15, height: 15, color: "var(--fc-module-aria)" }} />
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: !selectedPage ? "var(--fc-module-aria)" : "white" }}>Todas las páginas</div>
                <div style={{ fontSize: 9, color: "var(--fc-text-muted)" }}>{pages.length} cuentas conectadas</div>
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
                    background: isActive ? "var(--fc-surface-hover)" : "transparent",
                    border: "none", borderBottom: "1px solid var(--fc-border)",
                    cursor: "pointer", transition: "background 0.1s", fontFamily: "inherit",
                    borderLeft: isActive ? "3px solid var(--fc-module-aria)" : "3px solid transparent",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--fc-row-hover)"; }}
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
                        fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--fc-text)", letterSpacing: "-0.01em",
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
                      border: "2px solid var(--fc-bg)",
                    }}>
                      {page.platform === "instagram" ? (
                        <MessageCircle style={{ width: 7, height: 7, color: "var(--fc-text)" }} />
                      ) : (
                        <MessageSquare style={{ width: 7, height: 7, color: "var(--fc-text)" }} />
                      )}
                    </div>
                  </div>

                  {/* Page info */}
                  <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: isActive ? 600 : 500,
                      color: isActive ? "var(--fc-module-aria)" : "white",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {page.name}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--fc-text-muted)", textTransform: "capitalize" }}>
                      {page.platform}
                    </div>
                  </div>

                  {/* Active dot */}
                  {isActive && (
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "var(--fc-module-aria)", flexShrink: 0,
                    }} />
                  )}
                </button>
              );
            })}

            {filteredPages.length === 0 && (
              <div style={{ padding: 16, textAlign: "center", fontSize: 11, color: "var(--fc-text-muted)" }}>
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
        const [postData, setPostData] = useState<PostData | null>((conversation as any)?._postData ?? null);
    const [loadingPost, setLoadingPost] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [replyTarget, setReplyTarget] = useState<{ id: string; username: string } | null>(null);
    const [sendingReply, setSendingReply] = useState(false);
    const pc = getPlatformConfig(conversation.platform);

        const pageId: string = (conversation as any)?._pageId || (conversation as any)?.pageId || "";
        const pageName: string = (conversation as any)?._pageName || conversation.contactName || "Página";
    const pageAvatar: string | null = pageId ? `/api/inbox/avatar?userId=${encodeURIComponent(pageId)}&pageId=${encodeURIComponent(pageId)}` : null;

    // Auto-cargar el post si no viene incluido (comentario llegado por webhook)
    useEffect(() => {
      if (postData) return;
            const rawExternalId: string = (conversation as any)?.externalId || conversation.id || "";
      const postId = rawExternalId.replace(/^fbc_|^igc_/, "");
      if (!postId || !pageId) return;
   
            setLoadingPost(true);
      setLoadError(false);
      fetch(`/api/inbox/post?postId=${encodeURIComponent(postId)}&pageId=${encodeURIComponent(pageId)}`)
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
        .then(data => { if (data?.postData) setPostData(data.postData); else setLoadError(true); })
        .catch(() => setLoadError(true))
        .finally(() => setLoadingPost(false));
    }, [conversation.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSendReply = async () => {
      const text = replyText.trim();
      if (!text || sendingReply) return;
      setSendingReply(true);
      try {
                const commentId = replyTarget?.id || (conversation as any)?.externalId?.replace(/^fbc_|^igc_/, "");
        await fetch("/api/inbox/reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: conversation.id, text, commentId, pageId }),
        });
        setReplyText("");
        setReplyTarget(null);
      } catch { /* ignore */ }
      setSendingReply(false);
    };

    if (loadingPost) {
      return (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 }}>
          <div style={{ width: 28, height: 28, border: "3px solid var(--fc-border)", borderTopColor: "var(--fc-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 13, color: "var(--fc-text-muted)" }}>Cargando publicación...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      );
    }

    if (!postData) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 }}>
        <MessageSquare style={{ width: 32, height: 32, color: "var(--fc-text-muted)" }} />
        <p style={{ fontSize: 13, color: "var(--fc-text-muted)" }}>{loadError ? "No se pudo cargar la publicación" : "Sin datos de publicación"}</p>
      </div>
    );
    }

    return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* ── Top bar: back + "Ver publicación" ───────────────────────────────── */}
      <div style={{
        padding: "10px 16px",
        borderBottom: "1px solid var(--fc-border)",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        {onBack && (
          <button onClick={onBack} className="md:hidden text-[var(--fc-text-secondary)] hover:text-[var(--fc-text)] mr-2" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <ChevronLeft style={{ width: 20, height: 20 }} />
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
          <pc.icon style={{ width: 12, height: 12, color: pc.color }} />
          <span style={{ fontSize: 10, color: "var(--fc-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {pc.label}
          </span>
          <span style={{ fontSize: 10, color: "var(--fc-border)" }}>Â·</span>
          <span style={{ fontSize: 10, color: "var(--fc-text-muted)" }}>{formatDate(conversation.lastMessageTime)}</span>
        </div>
        {postData.permalink && (
          <a href={postData.permalink} target="_blank" rel="noopener noreferrer"
            style={{
              padding: "5px 10px", borderRadius: 6,
              background: "var(--fc-surface-hover)",
              border: "1px solid var(--fc-border)",
              color: "var(--fc-accent)", fontSize: 10, fontWeight: 600,
              textDecoration: "none", display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <ExternalLink style={{ width: 10, height: 10 }} />
            Ver publicación
          </a>
        )}
      </div>

      {/* ── Scrollable area ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* ── Post card (Meta Business Suite style) ────────────────────────── */}
        <div style={{
          margin: "12px 16px",
          background: "var(--fc-surface)",
          border: "1px solid var(--fc-glass-border)",
          borderRadius: 10,
          overflow: "hidden",
        }}>

          {/* Page header inside post card */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
            {/* Page avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              {pageAvatar ? (
                                <img
                  src={pageAvatar}
                  alt={pageName}
                  style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--fc-glass-border)" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent && !parent.querySelector(".pg-fb")) {
                      const d = document.createElement("div");
                      d.className = "pg-fb";
                      d.style.cssText = `width:40px;height:40px;border-radius:50%;background:${pc.color};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;`;
                      d.textContent = pageName.charAt(0).toUpperCase();
                      parent.insertBefore(d, e.target as Node);
                    }
                  }}
                />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: pc.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff" }}>
                  {pageName.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Platform badge */}
              <div style={{
                position: "absolute", bottom: -2, right: -2,
                width: 16, height: 16, borderRadius: "50%",
                background: pc.color, border: "2px solid var(--fc-surface)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <pc.icon style={{ width: 8, height: 8, color: "#fff" }} />
              </div>
            </div>

            {/* Page name + date */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--fc-text)", letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 4 }}>
                {pageName}
              </div>
              <div style={{ fontSize: 11, color: "var(--fc-text-muted)" }}>
                {formatDate(conversation.lastMessageTime)}
              </div>
            </div>
          </div>

          {/* Caption above image (Meta style) */}
          {postData.caption && (
            <div style={{ padding: "0 14px 10px" }}>
              <p style={{ fontSize: 13, color: "var(--fc-text)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
                {postData.caption.length > 280 ? postData.caption.slice(0, 280) + "..." : postData.caption}
              </p>
            </div>
          )}

          {/* Post image */}
          {postData.mediaUrl && (
            <div style={{ width: "100%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <img
                src={postData.mediaUrl}
                alt=""
                style={{ width: "100%", maxHeight: 420, objectFit: "contain", display: "block" }}
                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
              />
            </div>
          )}

          {/* Engagement metrics (Meta style: N likes  N comentarios) */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 14px",
            borderTop: "1px solid var(--fc-border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 15 }}></span>
              <span style={{ fontSize: 13, color: "var(--fc-text-secondary)" }}>{(postData.likeCount ?? 0).toLocaleString()} likes</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "var(--fc-text-muted)" }}>
                {(postData.commentsCount ?? 0).toLocaleString()} comentarios
              </span>
              {(postData.shareCount || 0) > 0 && (
                <span style={{ fontSize: 12, color: "var(--fc-text-muted)" }}>
                  · {(postData.shareCount || 0).toLocaleString()} compartidos
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Comments section ──────────────────────────────────────────────── */}
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fc-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            Comentarios ({postData.commentsCount})
          </div>

          {postData.comments.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--fc-text-muted)", textAlign: "center", padding: "20px 0" }}>
              Sin comentarios recientes
            </p>
          ) : (
            postData.comments.map((comment, i) => (
              <div key={comment.id || i} style={{
                display: "flex", gap: 10, padding: "10px 0",
                borderBottom: i < postData.comments.length - 1 ? "1px solid var(--fc-border)" : "none",
              }}>
                {/* Commenter avatar */}
                <div style={{ flexShrink: 0 }}>
                  {comment.avatar ? (
                                        <img
                      src={comment.avatar}
                      alt=""
                      style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent && !parent.querySelector(".cm-av")) {
                          const d = document.createElement("div");
                          d.className = "cm-av";
                          d.style.cssText = "width:34px;height:34px;border-radius:50%;background:rgba(155,123,232,0.15);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--fc-module-aria);";
                          d.textContent = comment.username.charAt(0).toUpperCase();
                          parent.insertBefore(d, e.target as Node);
                        }
                      }}
                    />
                  ) : (
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(155,123,232,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--fc-module-aria)" }}>
                      {comment.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Comment bubble (Meta Business Suite style) */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    background: "var(--fc-surface-hover)",
                    borderRadius: "0 12px 12px 12px",
                    padding: "8px 12px",
                    display: "inline-block",
                    maxWidth: "100%",
                  }}>
                    <div style={{ fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--fc-text)", letterSpacing: "-0.01em", marginBottom: 2 }}>{comment.username}</div>
                    <p style={{ fontSize: 13, color: "var(--fc-text-secondary)", margin: 0, lineHeight: 1.5, wordBreak: "break-word" }}>{comment.text}</p>
                  </div>

                  {/* Meta: timestamp + likes + Responder */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, paddingLeft: 4 }}>
                    <span style={{ fontSize: 10, color: "var(--fc-text-muted)" }}>
                      {new Date(comment.timestamp).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {comment.likes > 0 && (
                      <span style={{ fontSize: 10, color: "var(--fc-text-muted)", display: "flex", alignItems: "center", gap: 2 }}>
                        <span></span>{comment.likes}
                      </span>
                    )}
                    <button
                      onClick={() => setReplyTarget({ id: comment.id, username: comment.username })}
                      style={{ fontSize: 10, fontWeight: 700, color: "var(--fc-text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                    >
                      Responder
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Reply box (Meta: "Comentar como [Página]") ─────────────────────── */}
      <div style={{
        borderTop: "1px solid var(--fc-border)",
        padding: "10px 14px",
        background: "var(--fc-bg)",
        flexShrink: 0,
      }}>
        {replyTarget && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, padding: "4px 8px", background: "var(--fc-surface-hover)", borderRadius: 6 }}>
            <span style={{ fontSize: 11, color: "var(--fc-text-muted)" }}>Respondiendo a</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--fc-accent)" }}>@{replyTarget.username}</span>
            <button onClick={() => setReplyTarget(null)} style={{ marginLeft: "auto", fontSize: 10, color: "var(--fc-text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>âœ</button>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Page avatar en el reply box */}
          {pageAvatar ? (
                        <img src={pageAvatar} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: pc.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
              {pageName.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, display: "flex", alignItems: "center", background: "var(--fc-surface-hover)", borderRadius: 20, border: "1px solid var(--fc-border)", padding: "0 12px", gap: 8 }}>
            <span style={{ fontSize: 10, color: "var(--fc-text-muted)", whiteSpace: "nowrap" }}>como {pageName}</span>
            <input
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
              placeholder="Escribe un comentario..."
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                fontSize: 13, color: "var(--fc-text)", fontFamily: "inherit",
                padding: "9px 0",
              }}
            />
            <button
              onClick={handleSendReply}
              disabled={!replyText.trim() || sendingReply}
              style={{
                background: "none", border: "none", cursor: replyText.trim() ? "pointer" : "default",
                padding: 0, color: replyText.trim() ? "var(--fc-accent)" : "var(--fc-text-muted)",
                display: "flex", alignItems: "center",
              }}
            >
              <Send style={{ width: 16, height: 16 }} />
            </button>
          </div>
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
    const isSendingRef = useRef(false);
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
    const [showEmojis, setShowEmojis] = useState(false);
    const EMOJIS = ["ðŸ˜€","ðŸ˜‚","ðŸ˜","ðŸ","ðŸ”¥","ðŸ‘","â¤ï¸","ðŸŽ‰","ðŸ˜Ž","ðŸ¤”","ðŸ˜­","âœ¨","ðŸ’¯","ðŸŒ","ðŸ‘€","ðŸ‘","ðŸ˜Š","ðŸ¥°","ðŸ¤Œ","ðŸ’”"];
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pc = getPlatformConfig(conversation.platform);
    useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [conversation.messages.length]);
    const handleSubmit = () => {
      const trimmed = input.trim();
      if (!trimmed || isSendingRef.current) return;
      isSendingRef.current = true;
      setInput("");
      onSend(trimmed);
      // Reset lock after a short delay to allow re-sends
      setTimeout(() => { isSendingRef.current = false; }, 800);
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
      <div className="flex flex-col gap-2 md:gap-3 p-3 md:p-4 shrink-0 bg-transparent border-b border-[var(--fc-glass-border)]">
        {/* Top Row: User Info */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 text-[11px] text-[var(--fc-text-muted)]">
            {onBack && (
              <button onClick={onBack} className="md:hidden text-[var(--fc-text-secondary)] hover:text-[var(--fc-text)] mr-1" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <ChevronLeft style={{ width: 18, height: 18 }} />
              </button>
            )}
            
            <div className="flex items-center gap-2 md:gap-3">
                            <Avatar src={resolveContactAvatar(conversation.contactAvatar, conversation.contactId, (conversation as any)?._pageId, conversation.platform)} name={conversation.contactName && /^\d+$/.test(conversation.contactName) ? "Usuario Anonimizado" : (conversation.contactName || "Usuario")} size={36} color={pc.color} />
              <span className="text-[var(--fc-text)] font-semibold text-[14px] md:text-[16px]">
                {conversation.contactName && /^\d+$/.test(conversation.contactName) ? "Usuario Anonimizado" : (conversation.contactName || "Usuario")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="flex items-center gap-1 md:gap-1.5 px-2 py-1.5 md:px-3 md:py-1.5 rounded-2xl font-semibold text-[10px] md:text-[11px] bg-transparent border border-[var(--fc-glass-border)] transition-colors hover:bg-[var(--fc-surface-hover)]"
              style={{ color: conversation.closed ? "var(--fc-success)" : "var(--fc-text-secondary)" }}
            >
              <CheckCircle2 style={{ width: 14, height: 14 }} />
              {conversation.closed ? "REABRIR" : "CERRAR"}
            </button>
            <button
              onClick={onToggleProfile}
              style={{ background: "none", border: "none", color: showProfile ? "var(--fc-accent)" : "var(--fc-text-secondary)", cursor: "pointer", padding: 4 }}
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
              <div style={{ flex: 1, height: 1, background: "var(--fc-border)" }} />
              <span style={{
                fontSize: 10, color: "var(--fc-text-muted)",
                fontWeight: 500, whiteSpace: "nowrap",
              }}>
                {group.date}
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--fc-border)" }} />
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
                  <Avatar
                                        src={resolveContactAvatar(conversation.contactAvatar, conversation.contactId, (conversation as any)?._pageId, conversation.platform)} 
                    name={conversation.contactName || "Usuario"} 
                    size={28} 
                    color={pc.color} 
                    style={{ marginRight: 8, marginTop: 4, flexShrink: 0 }} 
                  />
                )}

                <div style={{ maxWidth: "65%" }}>
                  <div style={{
                    position: "relative",
                    padding: "10px 14px",
                    background: msg.incoming
                      ? "var(--fc-surface-hover)"
                      : "linear-gradient(135deg, #006AFF, #006AFF)",
                    border: msg.incoming ? "1px solid var(--fc-border)" : "none",
                    borderRadius: msg.incoming ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                    boxShadow: msg.incoming ? "none" : "var(--fc-shadow-hard)",
                  }}>
                    {msg.text && (
                      <p style={{
                        fontSize: 13, color: msg.incoming ? "var(--fc-text)" : "white",
                        margin: 0, lineHeight: 1.5, wordBreak: "break-word",
                      }}>
                        {msg.text}
                      </p>
                    )}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: msg.text && msg.text !== "ðŸ“Ž Adjunto" ? 8 : 0 }}>
                                                {msg.attachments.map((att: any, i: number) => {
                          if (att.type === "image" || att.type === "sticker" || att.payload?.url || att.image_data?.url) {
                            return (
                                                            <img 
                                key={i} 
                                src={att.payload?.url || att.image_data?.url || att.url} 
                                alt="Adjunto" 
                                style={{ maxWidth: "100%", borderRadius: 8, maxHeight: 250, objectFit: "contain" }}
                              />
                            );
                          }
                          if (att.video_data?.url) {
                            return (
                              <video 
                                key={i}
                                src={att.video_data.url}
                                controls
                                style={{ maxWidth: "100%", borderRadius: 8, maxHeight: 250 }}
                              />
                            );
                          }
                          return (
                            <a 
                              key={i} 
                              href={att.payload?.url || att.image_data?.url || att.video_data?.url || att.file_url || att.url} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{ color: msg.incoming ? "var(--fc-accent)" : "white", textDecoration: "underline", fontSize: 13 }}
                            >
                              Archivo adjunto
                            </a>
                          );
                        })}
                      </div>
                    )}
                    {msg.reaction && (
                      <div style={{
                        position: "absolute",
                        bottom: -10,
                        right: msg.incoming ? -10 : "auto",
                        left: !msg.incoming ? -10 : "auto",
                        background: "var(--fc-bg)",
                        border: "1px solid var(--fc-border)",
                        borderRadius: "50%",
                        padding: "2px 4px",
                        fontSize: 12,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        zIndex: 10,
                      }}>
                        {msg.reaction}
                      </div>
                    )}
                  </div>
                  {/* Message Status — ticks and read receipts for outgoing messages */}
                  {!msg.incoming && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 3 }}>
                      {msg.status === "error" ? (
                        <span style={{ fontSize: 9, color: "var(--fc-danger)", fontWeight: 500 }}>
                          {msg.errorText || "Error al enviar"}
                        </span>
                      ) : msg.status === "sending" ? (
                        /* Sending: single grey tick with opacity pulse */
                        <span style={{ display: "flex", alignItems: "center", color: "var(--fc-text-muted)", opacity: 0.6 }}>
                          <Check size={12} strokeWidth={3} />
                        </span>
                      ) : msg.readAt ? (
                        /* Read: double cyan/blue tick + "Visto" */
                        <span style={{ fontSize: 9, color: "var(--fc-accent)", fontWeight: 500, display: "flex", alignItems: "center", gap: 2 }}>
                          <CheckCheck size={14} strokeWidth={2.5} />
                          <span>Visto</span>
                        </span>
                      ) : msg.deliveredAt ? (
                        /* Delivered: double grey tick */
                        <span style={{ fontSize: 9, color: "var(--fc-text-muted)", display: "flex", alignItems: "center", gap: 2 }}>
                          <CheckCheck size={14} strokeWidth={2.5} />
                          <span>Entregado</span>
                        </span>
                      ) : (
                        /* Sent (persisted, awaiting delivery confirmation): single grey tick */
                        <span style={{ display: "flex", alignItems: "center", color: "var(--fc-text-muted)" }}>
                          <Check size={12} strokeWidth={3} />
                        </span>
                      )}
                      <span style={{ fontSize: 9, color: "var(--fc-text-muted)" }}>{formatTime(msg.timestamp)}</span>
                    </div>
                  )}
                  {msg.incoming && (
                    <p style={{ fontSize: 9, margin: "3px 4px 0", color: "var(--fc-text-muted)", textAlign: "left" }}>
                      {formatTime(msg.timestamp)}
                    </p>
                  )}
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
          borderTop: "1px solid var(--fc-border)",
          padding: "8px 16px",
          background: "var(--fc-border)",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 6,
          }}>
            <span style={{ fontSize: 10, color: "var(--fc-text-secondary)", fontWeight: 600 }}>
              Respuestas sugeridas
            </span>
            <button
              onClick={() => setShowReplies(false)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
            >
              <X style={{ width: 12, height: 12, color: "var(--fc-text-muted)" }} />
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SAVED_REPLIES.map((reply, i) => (
              <button
                key={i}
                onClick={() => { setInput(reply); setShowReplies(false); }}
                style={{
                  padding: "5px 10px", fontSize: 11,
                  color: "var(--fc-text-secondary)",
                  background: "var(--fc-surface-hover)",
                  border: "1px solid var(--fc-border)",
                  borderRadius: 16, cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap", fontFamily: "inherit",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(155,123,232,0.08)";
                  e.currentTarget.style.borderColor = "var(--fc-border)";
                  e.currentTarget.style.color = "var(--fc-module-aria)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "var(--fc-surface-hover)";
                  e.currentTarget.style.borderColor = "var(--fc-border)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                }}
              >
                {reply.length > 50 ? reply.slice(0, 50) + "..." : reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- Emojis --- */}
      {showEmojis && (
        <div style={{
          borderTop: "1px solid var(--fc-border)",
          padding: "8px 16px",
          background: "var(--fc-border)",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 6,
          }}>
            <span style={{ fontSize: 10, color: "var(--fc-text-secondary)", fontWeight: 600 }}>
              Emojis
            </span>
            <button
              onClick={() => setShowEmojis(false)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
            >
              <X style={{ width: 12, height: 12, color: "var(--fc-text-muted)" }} />
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {EMOJIS.map((emoji, i) => (
              <button
                key={i}
                onClick={() => { setInput(input + emoji); }}
                style={{
                  padding: "5px", fontSize: 20,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "transform 0.15s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "scale(1.2)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- Input Bar (always visible at bottom) --- */}
      <div style={{
        padding: "10px 16px",
        borderTop: "1px solid var(--fc-border)",
        flexShrink: 0,
        background: "var(--fc-border)",
      }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          {/* Toolbar icons */}
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            {[
              { icon: Bookmark, action: () => setShowReplies(!showReplies), active: showReplies },
              { icon: Paperclip, action: () => alert("Para adjuntar archivos, primero configura Vercel Blob en las variables de entorno."), active: false },
              { icon: Image, action: () => alert("Para enviar imágenes, primero configura Vercel Blob en las variables de entorno."), active: false },
              { icon: Smile, action: () => setShowEmojis(!showEmojis), active: showEmojis },
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
                onMouseEnter={e => e.currentTarget.style.background = "var(--fc-surface-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = btn.active ? "rgba(155,123,232,0.08)" : "transparent"}
              >
                <btn.icon style={{
                  width: 16, height: 16,
                  color: btn.active ? "var(--fc-module-aria)" : "var(--fc-text-secondary)",
                }} />
              </button>
            ))}
          </div>

          {/* Text input */}
          <div style={{
            flex: 1, display: "flex", alignItems: "flex-end", gap: 8,
            background: "var(--fc-surface-hover)",
            border: "1px solid var(--fc-border)",
            borderRadius: 10, padding: "4px 4px 4px 14px",
          }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSubmit();
                }
              }}
              placeholder="Escribe un mensaje o '/' para acciones rapidas o respuestas predeterminadas"
              rows={1}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "var(--fc-text)", fontSize: 13, resize: "none", fontFamily: "inherit",
                lineHeight: 1.5, minHeight: 28, maxHeight: 80,
              }}
            />
            <button
              onClick={e => { e.preventDefault(); handleSubmit(); }}
                            disabled={!input.trim() || isSendingRef.current}
              style={{
                width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: input.trim() ? "linear-gradient(135deg, var(--fc-module-aria), var(--fc-module-aria))" : "var(--fc-row-hover)",
                border: "none", borderRadius: 8,
                cursor: input.trim() ? "pointer" : "default",
                transition: "all 0.2s", flexShrink: 0,
                boxShadow: "none",
              }}
            >
              <Send style={{
                width: 14, height: 14,
                color: input.trim() ? "white" : "var(--fc-text-muted)",
              }} />
            </button>
          </div>

          {/* Quick like */}
          <button
            onClick={() => onSend("ðŸ‘")}
            style={{
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: "none",
              borderRadius: 6, cursor: "pointer", flexShrink: 0,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--fc-surface-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <ThumbsUp style={{ width: 18, height: 18, color: "var(--fc-text-muted)" }} />
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
    <div style={{ borderBottom: "1px solid var(--fc-border)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: "transparent", border: "none",
          cursor: "pointer", transition: "all 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--fc-surface-hover)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <span style={{
          fontSize: 12, fontWeight: 600, color: "var(--fc-text)",
        }}>
          {title}
        </span>
        {open ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", border: "1px solid var(--fc-accent)", color: "var(--fc-accent)" }}>
            <span style={{ fontSize: 14, lineHeight: 1, marginTop: -2 }}>-</span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", border: "1px solid var(--fc-accent)", color: "var(--fc-accent)" }}>
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
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid var(--fc-border)", flexShrink: 0, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--fc-accent)", cursor: "pointer", padding: 4 }}>
          <X style={{ width: 14, height: 14 }} />
        </button>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ margin: "0 auto 10px", position: "relative" }}>
                        <Avatar src={resolveContactAvatar(conversation.contactAvatar, conversation.contactId, (conversation as any)?._pageId, conversation.platform)} name={displayName} size={60} color={pc.color} />
            <div style={{ position: "absolute", bottom: 0, right: 0, background: "var(--fc-surface)", borderRadius: "50%", padding: 2, border: "1px solid var(--fc-border)" }}>
              <PlatformIcon platform={conversation.platform} size={12} />
            </div>
          </div>

          <p style={{ fontSize: 11, color: "var(--fc-text-muted)", margin: "0 0 4px" }}>Datos del contacto</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 0 2px" }}>
            <User style={{ width: 12, height: 12, color: "var(--fc-text-muted)" }} />
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fc-text)", margin: 0 }}>{displayName}</h3>
          </div>

          <p style={{ fontSize: 10, color: "var(--fc-text-muted)", margin: "0 0 4px", display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
            <PlatformIcon platform={conversation.platform} size={10} />
            {platformLabel[conversation.platform] || conversation.platform}
            {conversation.pageName && <><span style={{ opacity: 0.4 }}>Â·</span><span style={{ color: "var(--fc-text-secondary)" }}>{conversation.pageName}</span></>}
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

          {conversation.priority && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10, marginBottom: 8, marginLeft: 4,
              background: "rgba(251,191,36,0.1)", color: "#f59e0b", border: "1px solid rgba(251,191,36,0.2)",
              letterSpacing: "0.08em",
            }}>
              â­ PRIORIDAD
            </span>
          )}

          {/* Activity mini-stats */}
          {(incomingCount + outgoingCount) > 0 && (
            <div style={{ display: "flex", gap: 6, width: "100%" }}>
              {[
                { label: "Recibidos", value: incomingCount, color: "var(--fc-accent)" },
                { label: "Enviados", value: outgoingCount, color: "#8b5cf6" },
                ...(conversation.createdAt ? [{ label: "Inicio", value: new Date(conversation.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }), color: "#f59e0b" as string }] : []),
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, background: "var(--fc-surface-hover)", borderRadius: 8, padding: "6px 4px", border: "1px solid var(--fc-border)", textAlign: "center" }}>
                  <p style={{ fontSize: typeof s.value === "number" ? 16 : 10, fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: 8, color: "var(--fc-text-muted)", margin: "2px 0 0", letterSpacing: "0.05em", textTransform: "uppercase" }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Assignment */}
          <div ref={assignRef} style={{ marginTop: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: "100%", position: "relative" }}>
            <div style={{ fontSize: 11, color: "var(--fc-text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: conversation.assignedTo ? "var(--fc-success)" : "var(--yellow)" }} />
              <span>{conversation.assignedTo ? `Asignado: ${conversation.assignedTo}` : "Sin asignar"}</span>
            </div>
            <button onClick={() => setShowAssign(!showAssign)}
              style={{ background: "transparent", border: "1px solid var(--fc-glass-border)", color: "var(--fc-accent)", fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontFamily: "inherit" }}>
              <span>Cambiar asignación</span>
              <ChevronDown style={{ width: 10, height: 10 }} />
            </button>
            {showAssign && (
              <div style={{ position: "absolute", top: "105%", left: "50%", transform: "translateX(-50%)", background: "var(--fc-surface)", border: "1px solid var(--fc-glass-border)", borderRadius: 8, boxShadow: "var(--fc-shadow-hard)", zIndex: 9999, minWidth: 140, overflow: "hidden" }}>
                {TEAM_MEMBERS.map(member => (
                  <button key={member} onClick={() => { onAssign(member); setShowAssign(false); }}
                    style={{ width: "100%", padding: "8px 12px", border: "none", borderBottom: "1px solid var(--fc-border)", background: (conversation.assignedTo === member || (!conversation.assignedTo && member === "Sin asignar")) ? "var(--fc-surface-hover)" : "transparent", color: "var(--fc-text-secondary)", fontSize: 11, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
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
              style={{ width: "100%", background: "var(--fc-surface-hover)", border: "1px solid var(--fc-border)", borderRadius: 8, padding: "6px 8px", fontSize: 11, color: "var(--fc-text)", fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
            />
            <button onClick={handleSaveNote} disabled={!noteText.trim() || savingNote}
              style={{ alignSelf: "flex-end", padding: "4px 12px", borderRadius: 8, background: "var(--fc-accent)", color: "#000", fontSize: 10, fontWeight: 700, border: "none", cursor: "pointer", opacity: (!noteText.trim() || savingNote) ? 0.5 : 1 }}>
              {savingNote ? "Guardando..." : "Guardar nota"}
            </button>
            {conversation.notes.length === 0
              ? <p style={{ fontSize: 11, color: "var(--fc-text-muted)", margin: 0 }}>Sin notas agregadas.</p>
              : conversation.notes.map(note => (
                <div key={note.id} style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--fc-warning)" }}>{note.author.name}</span>
                      <span style={{ fontSize: 9, color: "var(--fc-text-muted)", marginLeft: 6 }}>{fmtDate(note.createdAt)}</span>
                    </div>
                    <button onClick={() => onDeleteNote(note.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fc-text-muted)", padding: 0 }}>
                      <X style={{ width: 10, height: 10 }} />
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--fc-text-secondary)", margin: 0, whiteSpace: "pre-wrap" }}>{note.content}</p>
                </div>
              ))
            }
          </div>
        </ProfileSection>

        {/* ETIQUETAS */}
        <ProfileSection title="Etiquetas">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {conversation.tags.map(tag => (
              <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--fc-accent)", padding: "3px 8px", background: "var(--fc-surface)", border: "1px solid rgba(0,178,255,0.15)", borderRadius: 12 }}>
                {tag}
                <X style={{ width: 10, height: 10, cursor: "pointer", opacity: 0.5 }} onClick={() => onRemoveTag(tag)} />
              </span>
            ))}
            {conversation.tags.length === 0 && <span style={{ fontSize: 11, color: "var(--fc-text-muted)" }}>Sin etiquetas.</span>}
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nueva etiqueta..."
              style={{ flex: 1, background: "var(--fc-surface-hover)", border: "1px solid var(--fc-border)", borderRadius: 6, padding: "4px 8px", fontSize: 11, color: "var(--fc-text)", fontFamily: "inherit", outline: "none" }}
              onKeyDown={e => { if (e.key === "Enter" && newTag.trim()) { onAddTag(newTag.trim()); setNewTag(""); }}}
            />
            <button onClick={() => { if (newTag.trim()) { onAddTag(newTag.trim()); setNewTag(""); }}}
              style={{ padding: "4px 10px", borderRadius: 6, background: "var(--fc-surface)", border: "1px solid var(--fc-border)", color: "var(--fc-text-secondary)", fontSize: 10, cursor: "pointer" }}>+</button>
          </div>
        </ProfileSection>

        {/* CANAL (datos dinámicos) */}
        <ProfileSection title="Información de Messenger">
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
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--fc-text)" }}>{v.label}</span>
                <span style={{ fontSize: 11, color: "var(--fc-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                                    {(v as any).hasIcon && <PlatformIcon platform={conversation.platform} size={12} />}
                  {v.value}
                </span>
              </div>
            ))}
          </div>
        </ProfileSection>

        {/* INFO SOBRE TI */}
        <ProfileSection title="Información sobre ti">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
             <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--fc-text)" }}>Ubicación</span>
                <span style={{ fontSize: 11, color: "var(--fc-text-secondary)" }}>
                  {conversation.customFields?.locale || "Desconocida (Sin permiso)"}
                </span>
             </div>
             <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--fc-text)" }}>Zona Horaria</span>
                <span style={{ fontSize: 11, color: "var(--fc-text-secondary)" }}>
                  {conversation.customFields?.timezone ? `UTC ${conversation.customFields.timezone}` : "No disponible"}
                </span>
             </div>
             <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--fc-text)" }}>Género</span>
                <span style={{ fontSize: 11, color: "var(--fc-text-secondary)" }}>
                  {conversation.customFields?.gender || "No disponible"}
                </span>
             </div>
          </div>
        </ProfileSection>

        {/* PEDIDOS */}
        <ProfileSection title="Pedidos">
           <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", textAlign: "center", padding: "10px 0" }}>
              <span style={{ fontSize: 11, color: "var(--fc-text-muted)" }}>No hay pedidos recientes.</span>
              <button style={{ padding: "6px 12px", borderRadius: 8, background: "var(--fc-surface-hover)", border: "1px solid var(--fc-border)", color: "var(--fc-accent)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                + Crear pedido
              </button>
           </div>
        </ProfileSection>

        {/* CITAS */}
        <ProfileSection title="Citas">
           <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", textAlign: "center", padding: "10px 0" }}>
              <span style={{ fontSize: 11, color: "var(--fc-text-muted)" }}>No hay citas próximas.</span>
              <button style={{ padding: "6px 12px", borderRadius: 8, background: "var(--fc-surface-hover)", border: "1px solid var(--fc-border)", color: "var(--fc-accent)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                + Programar cita
              </button>
           </div>
        </ProfileSection>

        {/* Mensajes destacados / Multimedia */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--fc-border)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fc-text)" }}>Mensajes destacados</span>
          <ChevronRight style={{ width: 14, height: 14, color: "var(--fc-text-muted)" }} />
        </div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--fc-border)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fc-text)" }}>Multimedia y documentos</span>
          <ChevronRight style={{ width: 14, height: 14, color: "var(--fc-text-muted)" }} />
        </div>

      </div>
    </div>
  );
}
