import { useState, useMemo } from "react";
import { Conversation, ChannelFilter, QueueFilter, ConnectedPage } from "../types";

export function useInboxFilters(
  conversations: Conversation[],
  currentAssignee: string | null
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPage, setSelectedPage] = useState<ConnectedPage | null>(null);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [channelFilterOpen, setChannelFilterOpen] = useState(true);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [queueMenuOpen, setQueueMenuOpen] = useState(false);

  // Constants for tabs — los valores en `platforms[]` deben coincidir con el tipo Platform
  // (los valores que useInboxData.mapConversations produce, NO los valores de la DB).
  // DB: facebook_messenger → frontend: fb_messenger
  // DB: instagram_dm       → frontend: instagram_dm | ig_dm
  // DB: instagram_comment  → frontend: instagram_comment | ig_comment
  const CHANNEL_TABS = [
    { key: "all",        label: "Todo",           color: "#9b7be8", platforms: [] as string[] },
    { key: "messenger",  label: "Messenger",      color: "#006AFF", platforms: ["fb_messenger"] },
    { key: "instagram",  label: "Instagram DM",   color: "#d62976", platforms: ["instagram_dm", "ig_dm"] },
    { key: "fb_comment", label: "FB Comentarios", color: "#1877F2", platforms: ["fb_comment"] },
    { key: "ig_comment", label: "IG Comentarios", color: "#f86f2b", platforms: ["ig_comment", "instagram_comment"] },
    { key: "whatsapp",   label: "WhatsApp",       color: "#25D366", platforms: ["whatsapp"] },
  ];

  const QUEUE_TABS = [
    { key: "all",         label: "Todos",             color: "#9b7be8" },
    { key: "unassigned",  label: "Sin asignar",        color: "#f59e0b" },
    { key: "mine",        label: "Mías",               color: "#10b981" },
    { key: "needs_reply", label: "Requiere respuesta", color: "#ef4444" },
    { key: "done",        label: "Cerradas",           color: "#6b7280" },
  ];

  const filteredConversations = useMemo(() => conversations.filter(c => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.contactName.toLowerCase().includes(q) && !c.lastMessage.toLowerCase().includes(q)) return false;
    }
    if (selectedPage) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO: [React] Refactor de hooks anti-patrón
  }), [conversations, searchQuery, selectedPage, channelFilter, queueFilter, currentAssignee]);

  const platformCounts = useMemo(() => conversations.reduce((acc, c) => {
    CHANNEL_TABS.forEach(tab => {
      if (tab.key !== "all" && (tab.platforms as string[]).includes(c.platform))
        acc[tab.key] = (acc[tab.key] || 0) + 1;
    });
    return acc;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO: [React] Refactor de hooks anti-patrón
  }, {} as Record<string, number>), [conversations]);

  return {
    searchQuery, setSearchQuery,
    selectedPage, setSelectedPage,
    channelFilter, setChannelFilter,
    channelFilterOpen, setChannelFilterOpen,
    queueFilter, setQueueFilter,
    queueMenuOpen, setQueueMenuOpen,
    filteredConversations,
    platformCounts,
    CHANNEL_TABS,
    QUEUE_TABS
  };
}
