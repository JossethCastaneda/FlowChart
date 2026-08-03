import { useState, useRef, useEffect, useCallback } from "react";
import { Conversation, Message, Note, Platform } from "../types";

export function useInboxData() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const initialFetchDoneRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedIdRef = useRef(selectedId);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  
  const conversationsRef = useRef(conversations);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const lastNotifiedAtRef = useRef<number>(0);
  useEffect(() => {
    const requestPerm = () => {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
      document.removeEventListener("click", requestPerm);
    };
    document.addEventListener("click", requestPerm);
    return () => document.removeEventListener("click", requestPerm);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const mapConversations = useCallback((raw: any[]): Conversation[] => {
    const pm: Record<string, Platform> = {
      facebook_messenger: "fb_messenger", instagram_dm: "instagram_dm", ig_dm: "ig_dm",
      ig_comment: "ig_comment", instagram_comment: "instagram_comment",
      facebook_comment: "fb_comment", whatsapp: "whatsapp",
    };
    return raw.map(c => ({
      id: c.id, contactName: c.contactName || "Usuario", contactAvatar: c.contactAvatar || null,
      contactId: c.contactId || null,
      platform: (pm[c.platform] || "fb_messenger") as Platform,
      lastMessage: c.lastMessage || "", lastMessageTime: new Date(c.lastMessageAt || Date.now()),
      unread: c.unread || false, closed: c.status === "closed", assignedTo: c.assignedTo || null,
      tags: c.tags || [], messages: [], notes: [],
      pageId: c.pageId, pageName: c.pageName || null,
      createdAt: c.createdAt || null,
      _pageId: c.pageId, _pageName: c.pageName, _postData: c._postData || null,
      externalId: c.externalId || null,
    }));
  }, []);

  // Último dato conocido por fuente: DMs (DB) y comentarios FB/IG (Graph en vivo).
  // Separados para que la fuente lenta no bloquee a la rápida y un fallo transitorio
  // de una no borre de la lista lo que la otra ya trajo.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const dmCacheRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const commentsCacheRef = useRef<any[]>([]);

  const fetchConversations = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);

    const rebuild = (): Conversation[] => {
      const all = [...dmCacheRef.current, ...commentsCacheRef.current];
      if (all.length === 0) return [];
      const mapped = mapConversations(all);
      mapped.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());

      setConversations(prev => {
        const prevMap = new Map(prev.map(c => [c.id, c]));
        return mapped.map(c => ({ ...c, messages: prevMap.get(c.id)?.messages || [] }));
      });

      // Only auto-select if nothing is selected. Prevents jumping!
      if (!selectedIdRef.current) {
        setSelectedId(mapped[0]?.id || "");
      }
      return mapped;
    };

    const dmFetch = fetch(`/api/inbox/conversations?_t=${Date.now()}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.conversations?.length) return;

        let shouldNotify = false;
        let notifyTitle = "Nuevo Mensaje";
        let notifyBody = "Tienes un nuevo mensaje en FlowChart.";
        const currentMax = lastNotifiedAtRef.current;
        let newMax = currentMax;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
        data.conversations.forEach((c: any) => {
          const msgTime = new Date(c.lastMessageAt || 0).getTime();
          if (c.unread && msgTime > currentMax) {
            shouldNotify = true;
            notifyTitle = c.contactName || "Nuevo Mensaje";
            notifyBody = c.lastMessage || "Mensaje entrante...";
            if (msgTime > newMax) newMax = msgTime;
          }
        });

        lastNotifiedAtRef.current = newMax;

        if (shouldNotify && initialFetchDoneRef.current) {
          try {
            const audio = new Audio("/sounds/notification.mp3");
            audio.play().catch(() => {});
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              new Notification(notifyTitle, { body: notifyBody, icon: "/icon.svg" });
            }
          } catch (e) {
            console.warn("Notification error", e);
          }
        }

        dmCacheRef.current = data.conversations;
        const mapped = rebuild();

        const prefetchers = mapped.slice(0, 3).map(conv => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
          const pageId = (conv as any)._pageId;
          return fetch(`/api/inbox/messages?conversationId=${conv.id}&pageId=${pageId || ""}&_t=${Date.now()}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => ({
              id: conv.id,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
              messages: d?.messages?.map((m: any) => ({
                id: m.id,
                text: m.text,
                incoming: m.incoming,
                timestamp: new Date(m.timestamp),
                attachments: m.attachments || undefined,
                reaction: m.reaction || undefined,
                deliveredAt: m.deliveredAt ? new Date(m.deliveredAt) : undefined,
                readAt: m.readAt ? new Date(m.readAt) : undefined,
              })) || null,
            }))
            .catch(() => ({ id: conv.id, messages: null }));
        });
        Promise.all(prefetchers).then(results => {
          setConversations(prev => prev.map(c => {
            const r = results.find(x => x.id === c.id);
            return r?.messages ? { ...c, messages: r.messages } : c;
          }));
        });

        // Refetch de perfiles: solo cuando el contactName ES un PSID numérico puro (no resuelto).
        // Con el fix de decryptToken en el webhook, los mensajes nuevos ya llegan con nombre/avatar,
        // así que esta lista converge a 0. Limitamos a 5 por ciclo para no saturar Graph.
        const profileFetchers = mapped
          .filter(c =>
            (c.platform === "fb_messenger" || c.platform === "instagram_dm" || c.platform === "ig_dm") &&
            /^\d+$/.test(c.contactName)  // solo PSIDs numéricos — "Usuario" y nombres reales no entran
          )
          .slice(0, 5)  // máximo 5 por ciclo
          .map(conv => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
                const p = validProfiles.find((x: any) => x.id === c.id);
                if (p) {
                  return { ...c, contactName: p.name, contactAvatar: p.picture || c.contactAvatar };
                }
                return c;
              }));
            }
          });
        }
      })
      .catch(() => { /* silent */ });

    const commentsFetch = fetch(`/api/inbox/comments?_t=${Date.now()}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.conversations) return;
        commentsCacheRef.current = data.conversations;
        rebuild();
      })
      .catch(() => { /* silent */ });

    // Los DMs marcan el fin del "cargando"; los comentarios se integran al llegar.
    await dmFetch;
    setInitialFetchDone(true);
    initialFetchDoneRef.current = true;
    setIsRefreshing(false);
    await commentsFetch;
  }, [mapConversations]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO: [React] Refactor de hooks anti-patrón
  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const loadMessages = useCallback((id: string) => {
    const conv = conversationsRef.current.find(c => c.id === id);
    if (!conv) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const pageId = (conv as any)?._pageId;
    fetch(`/api/inbox/messages?conversationId=${id}&pageId=${pageId || ""}&_t=${Date.now()}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.messages?.length) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
          const msgs: Message[] = data.messages.map((m: any) => ({
            id: m.id,
            text: m.text,
            incoming: m.incoming,
            timestamp: new Date(m.timestamp),
            attachments: m.attachments || undefined,
            reaction: m.reaction || undefined,
            deliveredAt: m.deliveredAt ? new Date(m.deliveredAt) : undefined,
            readAt: m.readAt ? new Date(m.readAt) : undefined,
          }));
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

  const loadNotes = useCallback((id: string) => {
    fetch(`/api/inbox/notes?conversationId=${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.notes) {
          setConversations(prev => prev.map(c => c.id === id ? { ...c, notes: data.notes } : c));
        }
      }).catch(() => {});
  }, []);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: false } : c));
    loadMessages(id);
    loadNotes(id);
    
    fetch(`/api/inbox/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unread: false })
    }).catch(() => {});
  };

  const handleAddNote = async (selected: Conversation, content: string): Promise<Note | null> => {
    try {
      const res = await fetch("/api/inbox/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selected.id, content }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.note) {
        setConversations(prev => prev.map(c =>
          c.id === selected.id ? { ...c, notes: [...c.notes, data.note] } : c
        ));
        return data.note;
      }
      return null;
    } catch { return null; }
  };

  const handleDeleteNote = async (selected: Conversation, noteId: string) => {
    try {
      await fetch(`/api/inbox/notes?noteId=${noteId}`, { method: "DELETE" });
      setConversations(prev => prev.map(c =>
        c.id === selected.id ? { ...c, notes: c.notes.filter(n => n.id !== noteId) } : c
      ));
    } catch { /* silent */ }
  };

  const handleSendMessage = async (text: string, selected: Conversation) => {
    if (!text.trim() || !selected) return;
    
    const newMsgId = `optimistic_${selected.id}_${Date.now()}`;
    const newMsg = { id: newMsgId, text: text.trim(), incoming: false, timestamp: new Date(), status: "sending" } as Message & { status?: string };
    
    setConversations(prev => {
      const updated = prev.map(c => c.id === selected.id ? { ...c, messages: [...c.messages, newMsg], lastMessage: text.trim(), lastMessageTime: new Date() } : c);
      return [...updated].sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
    });
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      const pageId = (selected as any)._pageId || selected.pageId || "";
      const recipientId = selected.contactId || selected.id.replace("igc_", "").replace("fbc_", "");
      const isWhatsApp = selected.platform === "whatsapp";

      // WhatsApp uses /api/inbox/messages (Cloud API path).
      // Messenger & Instagram DM use /api/inbox/reply which enforces
      // IDOR checks (conversationId owned by workspace) and resolves
      // the page token server-side from Integration credentials.
      const endpoint = isWhatsApp ? "/api/inbox/messages" : "/api/inbox/reply";
      const body = isWhatsApp
        ? { conversationId: selected.id, pageId, recipientId, message: text.trim(), platform: selected.platform }
        : { conversationId: selected.id, pageId, recipientId, text: text.trim() };

      const res = await fetch(endpoint, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to send");
      }
      
      // Remove the optimistic message and reload from DB to avoid duplicates
      // when the SSE/polling also brings the message from DB.
      setConversations(prev => prev.map(c => {
        if (c.id !== selected.id) return c;
        return { ...c, messages: c.messages.filter(m => m.id !== newMsgId) };
      }));
      // Reload messages from DB to get the canonical version
      loadMessages(selected.id);
    } catch (err: unknown) { 
      const errorMsg = err instanceof Error ? err.message : "Error al enviar";
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
    handleAddNote,
    handleDeleteNote,
  };
}
