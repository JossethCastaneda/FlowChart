import { useState, useRef, useEffect, useCallback } from "react";
import { Conversation, Message, Platform } from "../types";

export function useInboxData() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedIdRef = useRef(selectedId);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  
  const conversationsRef = useRef(conversations);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

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
      unread: c.unread || false, closed: c.status === "closed", assignedTo: c.assignedTo || null, tags: c.tags || [], messages: [],
      pageId: c.pageId, contactId: c.contactId, _pageId: c.pageId, _pageName: c.pageName, _postData: c._postData || null,
    }));
  }, []);

  const fetchConversations = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [convRes, commRes] = await Promise.allSettled([
        fetch(`/api/inbox/conversations?_t=${Date.now()}`).then(r => r.ok ? r.json() : null),
        fetch(`/api/inbox/comments?_t=${Date.now()}`).then(r => r.ok ? r.json() : null)
      ]);
      
      const allData = [];
      if (convRes.status === "fulfilled" && convRes.value?.conversations) {
        allData.push(...convRes.value.conversations);
      }
      if (commRes.status === "fulfilled" && commRes.value?.conversations) {
        allData.push(...commRes.value.conversations);
      }
      
      if (allData.length > 0) {
        const mapped = mapConversations(allData);
        mapped.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
          
          setConversations(prev => {
            const prevMap = new Map(prev.map(c => [c.id, c]));
            return mapped.map(c => ({ ...c, messages: prevMap.get(c.id)?.messages || [] }));
          });
          
          // Only auto-select if nothing is selected. Prevents jumping!
          if (!selectedIdRef.current) {
            setSelectedId(mapped[0]?.id || "");
          }
          
          const prefetchers = mapped.slice(0, 3).map(conv => {
            const pageId = (conv as any)._pageId;
            return fetch(`/api/inbox/messages?conversationId=${conv.id}&pageId=${pageId || ""}&_t=${Date.now()}`)
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

          // Fetch missing profiles for Meta conversations (where name is just a numeric ID)
          const profileFetchers = mapped.filter(c => 
            (c.platform === "fb_messenger" || c.platform === "instagram_dm" || c.platform === "ig_dm") && 
            /^\d+$/.test(c.contactName)
          ).map(conv => {
            const pageId = (conv as any)._pageId;
            return fetch(`/api/inbox/profile?userId=${conv.contactId}&pageId=${pageId || ""}`)
              .then(r => r.ok ? r.json() : null)
              .then(d => {
                if (d && d.name) {
                  return { id: conv.id, name: d.name, picture: d.picture };
                }
                return null;
              }).catch(() => null);
          });

          if (profileFetchers.length > 0) {
            Promise.all(profileFetchers).then(results => {
              const validProfiles = results.filter(Boolean);
              if (validProfiles.length > 0) {
                setConversations(prev => prev.map(c => {
                  const p = validProfiles.find((x: any) => x.id === c.id);
                  if (p) {
                    return { ...c, contactName: p.name, contactAvatar: p.picture || c.contactAvatar };
                  }
                  return c;
                }));
              }
            });
          }
        }
    } catch { /* silent */ }
    setInitialFetchDone(true);
    setIsRefreshing(false);
  }, [mapConversations]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const loadMessages = useCallback((id: string) => {
    const conv = conversationsRef.current.find(c => c.id === id);
    if (!conv) return;
    const pageId = (conv as any)?._pageId;
    fetch(`/api/inbox/messages?conversationId=${id}&pageId=${pageId || ""}&_t=${Date.now()}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.messages?.length) {
          const msgs: Message[] = data.messages.map((m: any) => ({ id: m.id, text: m.text, incoming: m.incoming, timestamp: new Date(m.timestamp) }));
          setConversations(prev => prev.map(c => c.id === id ? { ...c, messages: msgs } : c));
        }
      }).catch(() => {});
  }, []);

  // Server-Sent Events (SSE)
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let fallbackPoll: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    const startFallback = () => {
      if (!fallbackPoll) fallbackPoll = setInterval(() => fetchConversations(true), 30_000);
    };
    const stopFallback = () => {
      if (fallbackPoll) { clearInterval(fallbackPoll); fallbackPoll = null; }
    };

    const onChange = () => {
      fetchConversations(true);
      const id = selectedIdRef.current;
      if (id) loadMessages(id);
    };

    const connect = () => {
      if (stopped) return;
      try { es = new EventSource(`/api/inbox/stream?_t=${Date.now()}`); } catch { startFallback(); return; }
      es.addEventListener("ready", () => { stopFallback(); });
      es.addEventListener("change", onChange);
      es.onerror = () => {
        startFallback();
        if (es?.readyState === EventSource.CLOSED) {
          es.close();
          es = null;
          if (!retryTimer) retryTimer = setTimeout(() => { retryTimer = null; connect(); }, 15_000);
        }
      };
    };

    connect();
    startFallback();

    const onVisible = () => { if (document.visibilityState === "visible") fetchConversations(true); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
      stopFallback();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchConversations, loadMessages]);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: false } : c));
    loadMessages(id);
    
    fetch(`/api/inbox/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unread: false })
    }).catch(() => {});
  };

  const handleSendMessage = async (text: string, selected: Conversation) => {
    if (!text.trim() || !selected) return;
    
    const newMsgId = `${selected.id}_${Date.now()}`;
    const newMsg = { id: newMsgId, text: text.trim(), incoming: false, timestamp: new Date(), status: "sending" } as Message & { status?: string };
    
    setConversations(prev => {
      const updated = prev.map(c => c.id === selected.id ? { ...c, messages: [...c.messages, newMsg], lastMessage: text.trim(), lastMessageTime: new Date() } : c);
      return [...updated].sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
    });
    
    try {
      const pageId = (selected as any)._pageId || selected.pageId || "";
      const recipientId = selected.contactId || selected.id.replace("igc_", "").replace("fbc_", "");
      const res = await fetch("/api/inbox/messages", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ conversationId: selected.id, pageId, recipientId, message: text.trim(), platform: selected.platform }) 
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to send");
      }
      
      setConversations(prev => prev.map(c => {
        if (c.id !== selected.id) return c;
        return { ...c, messages: c.messages.map(m => m.id === newMsgId ? { ...m, status: "sent" } : m) };
      }));
    } catch (err: any) { 
      const errorMsg = err?.message || "Error al enviar";
      setConversations(prev => prev.map(c => {
        if (c.id !== selected.id) return c;
        return { ...c, messages: c.messages.map(m => m.id === newMsgId ? { ...m, status: "error", errorText: errorMsg } : m) };
      }));
    }
  };

  const handleCloseConversation = (selected: Conversation) => {
    if (!selected) return;
    const isClosed = !selected.closed;
    setConversations(prev => prev.map(c => c.id === selected.id ? { ...c, closed: isClosed } : c));
    
    fetch(`/api/inbox/conversations/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: isClosed ? "closed" : "open" })
    }).catch(() => {});
  };

  const handleAssign = (selected: Conversation, member: string) => {
    const assignedTo = member === "Sin asignar" ? null : member;
    setConversations(prev => prev.map(c => c.id === selected?.id ? { ...c, assignedTo } : c));
    fetch(`/api/inbox/conversations/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedTo })
    }).catch(() => {});
  };
    
  const handleAddTag = (selected: Conversation, tag: string) => {
    const newTags = [...selected.tags, tag.trim()];
    setConversations(prev => prev.map(c => c.id === selected?.id && !c.tags.includes(tag.trim()) ? { ...c, tags: newTags } : c));
    fetch(`/api/inbox/conversations/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags })
    }).catch(() => {});
  };
    
  const handleRemoveTag = (selected: Conversation, tag: string) => {
    const newTags = selected.tags.filter(t => t !== tag);
    setConversations(prev => prev.map(c => c.id === selected?.id ? { ...c, tags: newTags } : c));
    fetch(`/api/inbox/conversations/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags })
    }).catch(() => {});
  };

  return {
    conversations,
    selectedId,
    initialFetchDone,
    isRefreshing,
    fetchConversations,
    handleSelectConversation,
    handleSendMessage,
    handleCloseConversation,
    handleAssign,
    handleAddTag,
    handleRemoveTag,
  };
}
