"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

import {
  Search, Send, X, ChevronRight, ChevronDown, ChevronUp, UserPlus, Tag, Clock,
  MessageCircle, MessageSquare, AtSign, MoreHorizontal, Bookmark,
  CheckCircle2, Circle, AlertCircle, Paperclip, Smile, Image, ThumbsUp,
  User, Globe, ExternalLink, Plus, Filter,
  Heart, Share2,
} from "lucide-react";
import { Message, PostComment, PostData, Conversation, ConnectedPage, Platform, ChannelFilter, QueueFilter } from "./types";
import { relativeTime, formatTime, formatDate, getPlatformConfig, getInitials } from "./utils";
import { PageSelector, PostView, ChatView, ProfileSection, ContactProfile } from "./InboxComponents";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
const CHANNEL_TABS: { key: ChannelFilter; label: string; color: string; platforms: Platform[] }[] = [
  { key: "all", label: "Todos los mensajes", color: "#00d4ff", platforms: [] },
  { key: "messenger", label: "Messenger", color: "#0084ff", platforms: ["fb_messenger"] },
  { key: "instagram", label: "Instagram", color: "#E1306C", platforms: ["ig_dm"] },
  { key: "fb_comment", label: "Comentarios de Facebook", color: "#1877F2", platforms: ["fb_comment"] },
  { key: "ig_comment", label: "Comentarios de Instagram", color: "#F77737", platforms: ["ig_comment", "instagram_comment"] },
];

const QUEUE_TABS: { key: QueueFilter; label: string; color: string }[] = [
  { key: "all", label: "Todo", color: "#00d4ff" },
  { key: "unassigned", label: "Sin asignar", color: "#fbbf24" },
  { key: "mine", label: "Mias", color: "#22c55e" },
  { key: "needs_reply", label: "Requiere respuesta", color: "#fb7185" },
  { key: "done", label: "Cerradas", color: "#94a3b8" },
];
// ═══════════════════════════════════════════════════════════════
// TYPES — Connected Pages
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// PAGE SELECTOR COMPONENT
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// POST VIEW — For comment-type conversations
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// MAIN LAYOUT
// ═══════════════════════════════════════════════════════════════

export function InboxLayout() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  // Contact panel is collapsed by default for a cleaner, message-first view.
  // The preference is restored after mount to avoid a hydration mismatch.
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [connectedPages, setConnectedPages] = useState<ConnectedPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<ConnectedPage | null>(null);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [queueMenuOpen, setQueueMenuOpen] = useState(false);
  const queueRef = useRef<HTMLDivElement>(null);
  const currentAssignee = session?.user?.name || "Ana";

  // Restore the contact-panel preference (client-only).
  useEffect(() => {
    try { setShowProfile(localStorage.getItem("sodare:inbox-profile") === "1"); } catch { /* ignore */ }
  }, []);

  const toggleProfile = () => {
    setShowProfile((prev) => {
      const next = !prev;
      try { localStorage.setItem("sodare:inbox-profile", next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };

  // Close the queue-filter dropdown on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (queueRef.current && !queueRef.current.contains(e.target as Node)) setQueueMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
    if (queueFilter === "unassigned" && c.assignedTo) return false;
    if (queueFilter === "mine" && c.assignedTo !== currentAssignee) return false;
    if (queueFilter === "needs_reply" && (c.closed || !c.unread)) return false;
    if (queueFilter === "done" && !c.closed) return false;
    return true;
  });

  // Selected must be from filtered list — fallback to first filtered if not found (only on desktop)
  const isDesktop = typeof window !== "undefined" ? window.innerWidth >= 768 : true;
  const selected = filtered.find(c => c.id === selectedId) || (isDesktop ? filtered[0] : null) || null;

  // Auto-select first filtered conversation when channelFilter changes (only on desktop)
  useEffect(() => {
    if (isDesktop && filtered.length > 0 && !filtered.find(c => c.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelFilter, queueFilter]);

  const handleSendMessage = (text: string) => {
    if (!text.trim() || !selected) return;
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
    if (!selected) return;
    setConversations(prev =>
      prev.map(c => (c.id === selected.id ? { ...c, closed: !c.closed } : c))
    );
  };

  const handleAssign = (member: string) => {
    if (!selected) return;
    setConversations(prev =>
      prev.map(c =>
        c.id === selected.id
          ? { ...c, assignedTo: member === "Sin asignar" ? null : member }
          : c
      )
    );
  };

  const handleAddTag = (tag: string) => {
    if (!tag.trim() || !selected) return;
    setConversations(prev =>
      prev.map(c =>
        c.id === selected.id && !c.tags.includes(tag.trim())
          ? { ...c, tags: [...c.tags, tag.trim()] }
          : c
      )
    );
  };

  const handleRemoveTag = (tag: string) => {
    if (!selected) return;
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
                  background: "rgba(255,255,255,0.09)",
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 12, width: `${60 + (i % 3) * 15}%`, borderRadius: 4, marginBottom: 6, background: "rgba(255,255,255,0.09)" }} />
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
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.09)" }} />
              <div>
                <div style={{ height: 13, width: 120, borderRadius: 4, marginBottom: 4, background: "rgba(255,255,255,0.09)" }} />
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

      {/* ─── Filters: channels + queue in a single, compact row ─── */}
      {conversations.length > 0 && initialFetchDone && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 12px", flexShrink: 0,
        }}>
          {/* Channel tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", flex: 1 }}>
            {CHANNEL_TABS.map(tab => {
              const total = tab.key === "all"
                ? conversations.length
                : conversations.filter(c => tab.platforms.includes(c.platform)).length;
              const unreadCount = tab.key === "all"
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
                    color: isActive ? tab.color : "#64748b",
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
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "#64748b"; }}
                >
                  {tab.label}
                  {total > 0 && (
                    <span style={{
                      minWidth: 18, height: 18, borderRadius: 9,
                      background: unreadCount > 0
                        ? (tab.key === "all" ? "#ef4444" : tab.color)
                        : "rgba(148,163,184,0.22)",
                      color: unreadCount > 0 ? "white" : "#94a3b8",
                      fontSize: 10, fontWeight: 700,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      padding: "0 5px",
                    }}>
                      {unreadCount > 0 ? unreadCount : total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Queue filter — compact dropdown (was a full second row) */}
          <div ref={queueRef} style={{ position: "relative", flexShrink: 0 }}>
            {(() => {
              const active = QUEUE_TABS.find(t => t.key === queueFilter) || QUEUE_TABS[0];
              const filterActive = queueFilter !== "all";
              return (
                <button
                  onClick={() => setQueueMenuOpen(o => !o)}
                  title="Filtrar conversaciones"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "6px 10px", borderRadius: 8,
                    border: `1px solid ${filterActive ? `${active.color}55` : "rgba(255,255,255,0.08)"}`,
                    background: filterActive ? `${active.color}14` : "rgba(255,255,255,0.03)",
                    color: filterActive ? active.color : "#94a3b8",
                    fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Filter style={{ width: 12, height: 12 }} />
                  {active.label}
                  <ChevronDown style={{ width: 12, height: 12, opacity: 0.7 }} />
                </button>
              );
            })()}
            {queueMenuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", right: 0, minWidth: 200,
                background: "rgba(12,12,24,0.98)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, zIndex: 50, overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              }}>
                {QUEUE_TABS.map((tab) => {
                  const total = conversations.filter((c) => {
                    if (tab.key === "all") return true;
                    if (tab.key === "unassigned") return !c.assignedTo;
                    if (tab.key === "mine") return c.assignedTo === currentAssignee;
                    if (tab.key === "needs_reply") return !c.closed && c.unread;
                    if (tab.key === "done") return c.closed;
                    return true;
                  }).length;
                  const isActive = queueFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => { setQueueFilter(tab.key); setQueueMenuOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                        width: "100%", padding: "9px 14px",
                        background: isActive ? `${tab.color}12` : "transparent",
                        border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)",
                        borderLeft: isActive ? `3px solid ${tab.color}` : "3px solid transparent",
                        color: isActive ? tab.color : "#94a3b8",
                        fontSize: 12, fontWeight: isActive ? 600 : 400,
                        cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                      }}
                    >
                      <span>{tab.label}</span>
                      <span style={{
                        minWidth: 18, height: 18, borderRadius: 9, padding: "0 5px",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        background: isActive ? `${tab.color}2b` : "rgba(148,163,184,0.16)",
                        color: isActive ? tab.color : "#94a3b8", fontSize: 10, fontWeight: 700,
                      }}>{total}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {conversations.length > 0 && filtered.length === 0 && initialFetchDone && (
        <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
          No hay conversaciones en esta vista. Cambia el filtro de cola o canal para revisar otros mensajes.
        </div>
      )}

      {/* ─── 3-Panel Layout ─── */}
      {conversations.length > 0 && filtered.length > 0 && (
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

        {/* ═══ LEFT — Conversation List ═══ */}
        <div className={`w-full md:w-[300px] md:min-w-[300px] flex-col border-r border-white/5 bg-white/5 ${selected ? 'hidden md:flex' : 'flex'}`}>
          {/* Page Selector */}
          {connectedPages.length > 0 && (
            <div style={{ padding: "10px 12px 6px", borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
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
              background: "rgba(255,255,255,0.09)",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <Search style={{ width: 14, height: 14, color: "rgba(148,163,184,0.55)", flexShrink: 0 }} />
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
              <div style={{ padding: 24, textAlign: "center", color: "rgba(148,163,184,0.65)", fontSize: 11 }}>
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
                          fontSize: 10, color: conv.unread ? "#a855f7" : "rgba(148,163,184,0.65)",
                          whiteSpace: "nowrap", marginLeft: 8, fontWeight: conv.unread ? 600 : 400,
                        }}>
                          {relativeTime(conv.lastMessageTime)}
                        </span>
                      </div>
                      <p style={{
                        fontSize: 11,
                        color: conv.unread ? "rgba(255,255,255,0.75)" : "rgba(148,163,184,0.65)",
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
                          color: "rgba(148,163,184,0.65)",
                          background: "rgba(148,163,184,0.16)",
                          border: "1px solid rgba(148,163,184,0.22)",
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
        <div className={`flex-1 flex-col min-w-0 bg-[#05081280] ${selected ? 'flex' : 'hidden md:flex'}`}>
          <ErrorBoundary
            name="InboxConversation"
            fallback={
              <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40, textAlign: "center" }}>
                <AlertCircle style={{ width: 28, height: 28, color: "#ef4444" }} />
                <p style={{ fontSize: 13, color: "#94a3b8", maxWidth: 280 }}>
                  No se pudo mostrar esta conversación. Selecciona otra en la lista.
                </p>
              </div>
            }
          >
            {!selected ? (
              <div className="hidden md:flex flex-col flex-1 items-center justify-center gap-3 p-10 text-center">
                <MessageSquare className="w-8 h-8 text-slate-500" />
                <p className="text-sm text-slate-400">Selecciona una conversación para ver los detalles</p>
              </div>
            ) : selected.platform === "fb_comment" || selected.platform === "ig_comment" || selected.platform === "instagram_comment" ? (
              <PostView conversation={selected} onBack={() => setSelectedId("")} />
            ) : (
              <ChatView
                conversation={selected}
                onSend={handleSendMessage}
                onClose={handleCloseConversation}
                onToggleProfile={toggleProfile}
                showProfile={showProfile}
                onBack={() => setSelectedId("")}
              />
            )}
          </ErrorBoundary>
        </div>

        {/* ═══ RIGHT — Contact Profile ═══ */}
        {showProfile && selected && (
          <div className="absolute inset-y-0 right-0 z-20 w-[280px] md:static md:w-[280px] md:min-w-[280px] bg-[#0A0E17] md:bg-white/5 border-l border-white/5 shadow-2xl md:shadow-none flex flex-col" style={{ overflow: "hidden" }}>
            <ContactProfile
              conversation={selected}
              onAssign={handleAssign}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onClose={toggleProfile}
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
// ═══════════════════════════════════════════════════════════════
// CONTACT PROFILE SIDEBAR (Collapsible Sections)
// ═══════════════════════════════════════════════════════════════
