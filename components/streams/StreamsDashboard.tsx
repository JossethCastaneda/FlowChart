"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Home, AtSign, Hash, Calendar, Send, Heart, MessageCircle, Share2,
  MoreHorizontal, X, Settings, RefreshCw, ChevronDown, ChevronUp, Trash2, Loader2,
  ExternalLink, Search, Check
} from "lucide-react";
import { useLanguage } from "@/components/layout/LanguageContext";

/* Column type definitions */
const STREAM_TYPES = [
  { type: "home_feed", label: "Home Feed", icon: Home },
  { type: "mentions", label: "Menciones", icon: AtSign },
  { type: "keyword", label: "Keyword", icon: Hash },
  { type: "scheduled", label: "Programados", icon: Calendar },
  { type: "published", label: "Publicados", icon: Send },
];

const platformColors: Record<string, string> = {
  facebook: "#1877F2",
  instagram: "#E4405F",
  tiktok: "#000000",
  linkedin: "#0A66C2",
  x: "#1DA1F2",
};

interface StreamPost {
  id: string;
  author: string;
  handle: string;
  content: string;
  time: string;
  likes: number;
  comments: number;
  shares: number;
  platform: string;
  image?: string;
}

interface BoardColumn {
  id: string;
  type: string;
  platform: string;
  query?: string;
  position?: number;
}

interface Board {
  id: string;
  name: string;
  columns: BoardColumn[];
}

const TRANSLATIONS = {
  es: {
    homeFeed: "Home Feed",
    mentions: "Menciones",
    keyword: "Keyword / Hashtag",
    scheduled: "Programados",
    published: "Publicados",
    addCol: "Agregar Columna",
    type: "Tipo",
    platform: "Plataforma",
    activeAsset: "Activo (Página/Perfil)",
    addBtn: "Agregar",
    cancelBtn: "Cancelar",
    emptyBoard: "Board vacío",
    emptySub: "Agrega columnas para monitorear tu feed, menciones y publicaciones en tiempo real.",
    selectAsset: "Selecciona un activo...",
    loadingBoards: "Cargando boards...",
    newBoardPrompt: "Nombre del board:",
    deleteBoardConfirm: "¿Eliminar este board?",
    updatedJustNow: "Actualizado hace un momento",
    updatedSeconds: "Actualizado hace {s}s",
    noDataMeta: "Sin contenido aún. Conecta tus activos en el sistema.",
    postDetail: "Detalle de Publicación",
    viewOnPlatform: "Ver en la plataforma",
    nicknamePlaceholder: "Apodo de columna...",
    refreshInterval: "Frecuencia de Refresco",
    manualRefresh: "Solo Manual",
    secondsInterval: "{s} segundos",
    minutesInterval: "{m} minutos",
    writeReply: "Escribe una respuesta directa...",
    sendingReply: "Enviando respuesta...",
    replySent: "Respuesta enviada con éxito",
    replyFailed: "Error al enviar la respuesta",
    sendBtn: "Enviar",
  },
  en: {
    homeFeed: "Home Feed",
    mentions: "Mentions",
    keyword: "Keyword / Hashtag",
    scheduled: "Scheduled",
    published: "Published",
    addCol: "Add Column",
    type: "Type",
    platform: "Platform",
    activeAsset: "Active Asset (Page/Profile)",
    addBtn: "Add",
    cancelBtn: "Cancel",
    emptyBoard: "Empty Board",
    emptySub: "Add columns to monitor your feed, mentions, and posts in real-time.",
    selectAsset: "Select an asset...",
    loadingBoards: "Loading boards...",
    newBoardPrompt: "Board name:",
    deleteBoardConfirm: "Delete this board?",
    updatedJustNow: "Updated just now",
    updatedSeconds: "Updated {s}s ago",
    noDataMeta: "No content yet. Connect your assets in the dashboard.",
    postDetail: "Post Detail",
    viewOnPlatform: "View on platform",
    nicknamePlaceholder: "Column nickname...",
    refreshInterval: "Refresh Interval",
    manualRefresh: "Manual Only",
    secondsInterval: "{s} seconds",
    minutesInterval: "{m} minutes",
    writeReply: "Write a direct reply...",
    sendingReply: "Sending reply...",
    replySent: "Reply sent successfully",
    replyFailed: "Failed to send reply",
    sendBtn: "Send",
  }
};

/* Helper to safely parse JSON query */
function parseColumnQuery(rawQuery?: string) {
  if (!rawQuery) return { pageId: "", nickname: "", interval: 60000, keyword: "" };
  if (rawQuery.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawQuery);
      return {
        pageId: parsed.pageId || "",
        nickname: parsed.nickname || "",
        interval: parsed.interval !== undefined ? parsed.interval : 60000,
        keyword: parsed.keyword || ""
      };
    } catch {
      // Fallback
    }
  }
  return { pageId: "", nickname: "", interval: 60000, keyword: rawQuery };
}

/* Helper to serialize JSON query */
function serializeColumnQuery(pageId: string, nickname: string, interval: number, keyword: string) {
  return JSON.stringify({ pageId, nickname, interval, keyword });
}

/* Dropdown component helper */
function Dropdown({ trigger, children }: { trigger: React.ReactNode; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <div onClick={() => setOpen(!open)} style={{ cursor: "pointer" }}>{trigger}</div>
      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0,
          marginTop: 6, zIndex: 150, background: "var(--surface)",
          border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden",
          boxShadow: "0 10px 40px rgba(0,0,0,0.35)", minWidth: 180, padding: 6
        }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STREAMS DASHBOARD
   ═══════════════════════════════════════════════════════ */
export function StreamsDashboard() {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];

  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColType, setNewColType] = useState("home_feed");
  const [newColPlatform, setNewColPlatform] = useState("facebook");
  const [newColQuery, setNewColQuery] = useState("");
  const [loadingBoards, setLoadingBoards] = useState(true);
  
  const [availablePages, setAvailablePages] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<StreamPost | null>(null);

  // Load boards from DB
  useEffect(() => {
    fetch("/api/streams/boards")
      .then((r) => r.json())
      .then((data) => {
        const b = data.boards || [];
        setBoards(b);
        if (b[0]) setActiveBoardId(b[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingBoards(false));

    fetch("/api/meta/pages?module=streams")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setAvailablePages(d.data);
      })
      .catch(() => {});
  }, []);

  const activeBoard = boards.find((b) => b.id === activeBoardId) || boards[0];

  /* ── Persist columns to DB ── */
  const saveColumns = useCallback(async (boardId: string, columns: BoardColumn[]) => {
    await fetch(`/api/streams/boards/${boardId}/columns`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        columns: columns.map((c, i) => ({
          type: c.type,
          platform: c.platform,
          query: c.query || null,
          position: i,
        })),
      }),
    }).catch(() => {});
  }, []);

  const addColumn = () => {
    if (!activeBoard) return;
    
    let queryVal = "";
    if (["home_feed", "mentions", "published"].includes(newColType)) {
      queryVal = serializeColumnQuery(newColQuery, "", 60000, "");
    } else {
      queryVal = serializeColumnQuery("", "", 60000, newColQuery);
    }

    const newCol: BoardColumn = {
      id: `c${Date.now()}`,
      type: newColType,
      platform: newColPlatform,
      query: queryVal,
    };
    const updatedCols = [...activeBoard.columns, newCol];
    setBoards(boards.map((b) =>
      b.id === activeBoardId ? { ...b, columns: updatedCols } : b
    ));
    setAddingColumn(false);
    setNewColQuery("");
    saveColumns(activeBoardId, updatedCols);
  };

  const removeColumn = (colId: string) => {
    if (!activeBoard) return;
    const updatedCols = activeBoard.columns.filter((c) => c.id !== colId);
    setBoards(boards.map((b) =>
      b.id === activeBoardId ? { ...b, columns: updatedCols } : b
    ));
    saveColumns(activeBoardId, updatedCols);
  };

  /* ── Drag & Drop Column Reordering ── */
  const handleColumnDrop = (draggedId: string, targetId: string) => {
    if (!activeBoard || draggedId === targetId) return;
    const cols = [...activeBoard.columns];
    const draggedIdx = cols.findIndex((c) => c.id === draggedId);
    const targetIdx = cols.findIndex((c) => c.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;
    
    // Swap columns
    const [removed] = cols.splice(draggedIdx, 1);
    cols.splice(targetIdx, 0, removed);
    
    setBoards(boards.map((b) =>
      b.id === activeBoardId ? { ...b, columns: cols } : b
    ));
    saveColumns(activeBoardId, cols);
  };

  /* ── Update Column Settings ── */
  const updateColumnConfig = (colId: string, pageId: string, nickname: string, interval: number, keyword: string) => {
    if (!activeBoard) return;
    const queryVal = serializeColumnQuery(pageId, nickname, interval, keyword);
    const updatedCols = activeBoard.columns.map(c => 
      c.id === colId ? { ...c, query: queryVal } : c
    );
    setBoards(boards.map((b) =>
      b.id === activeBoardId ? { ...b, columns: updatedCols } : b
    ));
    saveColumns(activeBoardId, updatedCols);
  };

  /* ── Board CRUD ── */
  const createBoard = async () => {
    const name = prompt(t.newBoardPrompt);
    if (!name?.trim()) return;
    try {
      const res = await fetch("/api/streams/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (data.board) {
        setBoards((prev) => [...prev, { ...data.board, columns: data.board.columns || [] }]);
        setActiveBoardId(data.board.id);
      }
    } catch {}
  };

  const deleteBoard = async (boardId: string) => {
    if (boards.length <= 1) return;
    if (!confirm(t.deleteBoardConfirm)) return;
    await fetch(`/api/streams/boards/${boardId}`, { method: "DELETE" }).catch(() => {});
    const remaining = boards.filter((b) => b.id !== boardId);
    setBoards(remaining);
    if (activeBoardId === boardId) {
      setActiveBoardId(remaining[0]?.id || "");
    }
  };

  const filteredAssets = useMemo(() => {
    if (newColPlatform === "facebook") {
      return availablePages.map(p => ({ id: p.id, name: p.name }));
    }
    if (newColPlatform === "instagram") {
      return availablePages.filter(p => p.instagram).map(p => ({ id: p.instagram.id, name: `@${p.instagram.username}` }));
    }
    return [];
  }, [availablePages, newColPlatform]);

  useEffect(() => {
    if (["home_feed", "mentions", "published"].includes(newColType)) {
      if (filteredAssets[0] && !newColQuery) {
        setNewColQuery(filteredAssets[0].id);
      }
    }
  }, [newColType, filteredAssets, newColQuery]);

  if (loadingBoards) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 12 }}>
        <Loader2 style={{ width: 24, height: 24, color: "var(--cyan)", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t.loadingBoards}</p>
      </div>
    );
  }

  const selectStyles: React.CSSProperties = {
    padding: "8px 12px", borderRadius: 8, background: "var(--surface-hover)",
    border: "1px solid var(--border)", color: "var(--foreground)", fontSize: 13, outline: "none", cursor: "pointer",
    minWidth: 150
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 40 }}>

      {/* Board tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", padding: 4, borderRadius: 12 }}>
          {boards.map((board) => (
            <div key={board.id} style={{ display: "flex", alignItems: "center", position: "relative" }}>
              <button
                onClick={() => setActiveBoardId(board.id)}
                style={{
                  background: activeBoardId === board.id ? "var(--surface-hover)" : "transparent",
                  color: activeBoardId === board.id ? "var(--cyan)" : "var(--text-secondary)",
                  border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600
                }}
              >
                {board.name}
              </button>
              {boards.length > 1 && activeBoardId === board.id && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteBoard(board.id); }}
                  style={{
                    position: "absolute", top: -4, right: -4, width: 16, height: 16,
                    borderRadius: "50%", background: "rgba(226,68,92,0.15)", border: "1px solid rgba(226,68,92,0.25)",
                    color: "var(--red)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10,
                  }}
                  title="Eliminar board"
                >
                  <X style={{ width: 8, height: 8 }} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={createBoard}
            style={{
              background: "transparent", border: "none", color: "var(--text-secondary)",
              padding: "8px 12px", borderRadius: 8, cursor: "pointer"
            }}
            title="Nuevo board"
          >
            <Plus style={{ width: 14, height: 14 }} />
          </button>
        </div>

        <button
          onClick={() => setAddingColumn(true)}
          style={{
            padding: "8px 16px", borderRadius: 10, background: "var(--cyan-dim)",
            border: "1px solid var(--border-strong)", color: "var(--cyan)", fontSize: 12, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit"
          }}
        >
          <Plus style={{ width: 14, height: 14 }} /> {t.addCol}
        </button>
      </div>

      {/* Add column modal */}
      {addingColumn && (
        <div className="glass-panel" style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", padding: 16, border: "1px solid var(--border)", background: "var(--surface)", borderRadius: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>{t.type}</label>
            <select
              value={newColType}
              onChange={(e) => {
                setNewColType(e.target.value);
                setNewColQuery("");
              }}
              style={selectStyles}
            >
              {STREAM_TYPES.map((t) => (
                <option key={t.type} value={t.type} style={{ background: "var(--surface)" }}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>{t.platform}</label>
            <select
              value={newColPlatform}
              onChange={(e) => {
                setNewColPlatform(e.target.value);
                setNewColQuery("");
              }}
              style={selectStyles}
            >
              {Object.keys(platformColors).map((p) => (
                <option key={p} value={p} style={{ background: "var(--surface)" }}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
          
          {["home_feed", "mentions", "published"].includes(newColType) && ["facebook", "instagram"].includes(newColPlatform) && (
            <div>
              <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>{t.activeAsset}</label>
              <select
                value={newColQuery}
                onChange={(e) => setNewColQuery(e.target.value)}
                style={selectStyles}
              >
                <option value="">{t.selectAsset}</option>
                {filteredAssets.map(asset => (
                  <option key={asset.id} value={asset.id} style={{ background: "var(--surface)" }}>{asset.name}</option>
                ))}
              </select>
            </div>
          )}

          {(newColType === "keyword" || newColType === "hashtag") && (
            <div>
              <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>{t.keyword}</label>
              <input
                value={newColQuery}
                onChange={(e) => setNewColQuery(e.target.value)}
                placeholder="#hashtag o keyword"
                style={{
                  padding: "8px 12px", borderRadius: 8, background: "var(--surface-hover)",
                  border: "1px solid var(--border)", color: "var(--foreground)", fontSize: 13, outline: "none",
                }}
              />
            </div>
          )}
          
          <button onClick={addColumn} style={{
            padding: "8px 20px", borderRadius: 8, background: "var(--cyan-dim)", color: "var(--cyan)",
            border: "1px solid var(--border-strong)", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>
            {t.addBtn}
          </button>
          <button onClick={() => setAddingColumn(false)} style={{
            padding: "8px 16px", borderRadius: 8, background: "transparent", color: "var(--text-secondary)",
            fontSize: 13, border: "1px solid var(--border)", cursor: "pointer",
          }}>
            {t.cancelBtn}
          </button>
        </div>
      )}

      {/* Empty state for no columns */}
      {activeBoard && activeBoard.columns.length === 0 && (
        <div className="glass-panel" style={{ padding: "48px 20px", textAlign: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }}>
          <Settings style={{ width: 32, height: 32, color: "var(--text-muted)", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{t.emptyBoard}</p>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>
            {t.emptySub}
          </p>
        </div>
      )}

      {/* Columns grid with horizontal layout */}
      <div style={{
        display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16,
        minHeight: "calc(100vh - 280px)",
      }}>
        {activeBoard?.columns?.map((col) => (
          <div
            key={col.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("colId", col.id);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const draggedId = e.dataTransfer.getData("colId");
              handleColumnDrop(draggedId, col.id);
            }}
            style={{ flex: "0 0 auto", cursor: "grab" }}
          >
            <StreamColumnView
              col={col}
              availablePages={availablePages}
              onRemove={removeColumn}
              onUpdateConfig={updateColumnConfig}
              onPostClick={setSelectedPost}
            />
          </div>
        ))}
      </div>

      {/* Modal Detail View */}
      {selectedPost && (
        <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
}

/* ── Stream Column with real data fetching + auto-refresh ── */
const INITIAL_VISIBLE = 10;

function StreamColumnView({ col, availablePages, onRemove, onUpdateConfig, onPostClick }: {
  col: BoardColumn; availablePages: any[]; onRemove: (id: string) => void;
  onUpdateConfig: (id: string, pageId: string, nickname: string, interval: number, keyword: string) => void;
  onPostClick: (post: StreamPost) => void;
}) {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];

  const { pageId, nickname, interval, keyword } = useMemo(() => parseColumnQuery(col.query), [col.query]);

  const streamType = STREAM_TYPES.find((t) => t.type === col.type);
  const Icon = streamType?.icon || Home;
  const platColor = platformColors[col.platform] || "var(--text-muted)";
  const [posts, setPosts] = useState<StreamPost[]>([]);
  const [isReal, setIsReal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);
  
  // Column-specific search text
  const [colSearch, setColSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Fetch data
  const fetchData = useCallback(() => {
    if (!["home_feed", "mentions", "published"].includes(col.type)) {
      setLoading(false);
      return;
    }
    const pageParam = pageId ? `&pageId=${pageId}` : "";
    fetch(`/api/streams/feed?type=${col.type}&platform=${col.platform}${pageParam}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.posts?.length) {
          const mapped: StreamPost[] = data.posts.map((p: any) => ({
            id: p.id,
            author: p.author || "Usuario",
            handle: p.handle || "",
            content: p.content || "",
            time: relativeTime(p.time),
            likes: p.likes || 0,
            comments: p.comments || 0,
            shares: p.shares || 0,
            platform: p.platform || col.platform,
            image: p.image,
          }));
          setPosts(mapped);
          setIsReal(true);
        } else {
          setPosts([]);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setLastRefresh(Date.now());
      });
  }, [col.type, col.platform, pageId]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh interval listener
  useEffect(() => {
    if (interval <= 0) return; // Manual only
    const id = setInterval(() => {
      fetchData();
    }, interval);
    return () => clearInterval(id);
  }, [fetchData, interval]);

  // Seconds-ago counter
  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastRefresh) / 1000));
    }, 5000);
    return () => clearInterval(tick);
  }, [lastRefresh]);

  // Filter posts internally
  const filteredPosts = useMemo(() => {
    if (!colSearch.trim()) return posts;
    const q = colSearch.toLowerCase();
    return posts.filter(p => 
      p.content.toLowerCase().includes(q) || 
      p.author.toLowerCase().includes(q) || 
      p.handle.toLowerCase().includes(q)
    );
  }, [posts, colSearch]);

  const visiblePosts = showAll ? filteredPosts : filteredPosts.slice(0, INITIAL_VISIBLE);
  const hasMore = filteredPosts.length > INITIAL_VISIBLE;
  const CollapseIcon = collapsed ? ChevronDown : ChevronUp;

  // Resolve active page name
  const matchedPage = availablePages.find(p => p.id === pageId || (p.instagram?.id === pageId));
  const pageLabel = matchedPage ? (col.platform === "instagram" ? `@${matchedPage.instagram?.username}` : matchedPage.name) : (keyword || "");

  const headerLabel = nickname || streamType?.label || col.type;

  return (
    <div
      style={{
        width: 340,
        display: "flex", flexDirection: "column",
        borderRadius: 12, background: "var(--surface)",
        border: "1px solid var(--border)", overflow: "hidden",
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "12px 14px",
          borderBottom: collapsed ? "none" : "1px solid var(--border)",
          background: "var(--surface-hover)",
          userSelect: "none",
        }}
      >
        <div onClick={() => setCollapsed((c) => !c)} style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0, cursor: "pointer" }}>
          <Icon style={{ width: 16, height: 16, color: platColor }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {headerLabel}
            {pageLabel && <span style={{ fontWeight: 400, color: "var(--text-secondary)", fontSize: 11 }}> · {pageLabel}</span>}
          </span>
        </div>

        {/* Action controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => setShowSearch(!showSearch)}
            style={{ background: "none", border: "none", color: showSearch ? "var(--cyan)" : "var(--text-secondary)", cursor: "pointer", padding: 2 }}
            title="Buscar en columna"
          >
            <Search style={{ width: 13, height: 13 }} />
          </button>

          {/* Column Settings dropdown */}
          <Dropdown trigger={
            <button style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 2 }} title="Configuración de columna">
              <Settings style={{ width: 13, height: 13 }} />
            </button>
          }>
            {(close) => (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <input
                    value={nickname}
                    onChange={(e) => onUpdateConfig(col.id, pageId, e.target.value, interval, keyword)}
                    placeholder={t.nicknamePlaceholder}
                    style={{
                      width: "100%", padding: "6px 8px", fontSize: 11, background: "var(--surface-hover)",
                      border: "1px solid var(--border)", color: "var(--foreground)", borderRadius: 4, outline: "none"
                    }}
                  />
                </div>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                    {t.refreshInterval}
                  </span>
                  {[
                    { val: 0, label: t.manualRefresh },
                    { val: 30000, label: t.secondsInterval.replace("{s}", "30") },
                    { val: 60000, label: t.minutesInterval.replace("{m}", "1") },
                    { val: 300000, label: t.minutesInterval.replace("{m}", "5") },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => {
                        onUpdateConfig(col.id, pageId, nickname, opt.val, keyword);
                        close();
                      }}
                      style={{
                        display: "flex", width: "100%", padding: "5px 8px", border: "none", background: "transparent",
                        fontSize: 11, color: interval === opt.val ? "var(--cyan)" : "var(--foreground)", cursor: "pointer",
                        textAlign: "left", borderRadius: 4, alignItems: "center", justifyContent: "space-between"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {opt.label}
                      {interval === opt.val && <Check style={{ width: 10, height: 10 }} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Dropdown>

          <CollapseIcon onClick={() => setCollapsed((c) => !c)} style={{ width: 14, height: 14, color: "var(--text-muted)", cursor: "pointer" }} />

          <button
            onClick={() => onRemove(col.id)}
            style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 2 }}
          >
            <X style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>

      {/* Inner Column Search Bar */}
      {!collapsed && showSearch && (
        <div style={{ padding: "6px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6, background: "var(--surface-hover)" }}>
          <Search style={{ width: 12, height: 12, color: "var(--text-muted)" }} />
          <input
            value={colSearch}
            onChange={(e) => setColSearch(e.target.value)}
            placeholder="Filtrar..."
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 11, color: "var(--foreground)" }}
          />
          {colSearch && (
            <X style={{ width: 12, height: 12, color: "var(--text-muted)", cursor: "pointer" }} onClick={() => setColSearch("")} />
          )}
        </div>
      )}

      {/* Posts – list */}
      {!collapsed && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0", maxHeight: 500 }}>
            {loading && (
              <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
                <Loader2 style={{ width: 16, height: 16, color: platColor, animation: "spin 1s linear infinite" }} />
              </div>
            )}

            {!loading && filteredPosts.length === 0 && (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <Icon style={{ width: 24, height: 24, color: platColor, opacity: 0.3, margin: "0 auto 8px" }} />
                <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {t.noDataMeta}
                </p>
              </div>
            )}

            {visiblePosts.map((post) => (
              <div
                key={post.id}
                onClick={() => onPostClick(post)}
                style={{
                  display: "flex", flexDirection: "column", gap: 6,
                  padding: "10px 14px", borderBottom: "1px solid var(--border-neutral)",
                  transition: "background 0.15s", cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", background: "var(--cyan-dim)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 600, color: "var(--cyan)", flexShrink: 0,
                  }}>
                    {post.author.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: "var(--foreground)",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {post.author}
                      {post.handle && (
                        <span style={{ fontWeight: 400, color: "var(--text-secondary)", marginLeft: 4, fontSize: 10 }}>{post.handle}</span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{post.time}</span>
                </div>

                {post.content && (
                  <p style={{ fontSize: 11.5, color: "var(--text-secondary)", lineHeight: 1.4, margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {post.content}
                  </p>
                )}

                {post.image && (
                  <div style={{ width: "100%", height: 120, borderRadius: 6, overflow: "hidden", marginTop: 4, background: "rgba(0,0,0,0.2)" }}>
                    <img src={post.image} alt="Media" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--text-secondary)", fontSize: 10 }}>
                    <Heart style={{ width: 11, height: 11, color: "var(--text-muted)" }} /> {post.likes}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--text-secondary)", fontSize: 10 }}>
                    <MessageCircle style={{ width: 11, height: 11, color: "var(--text-muted)" }} /> {post.comments}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--text-secondary)", fontSize: 10 }}>
                    <Share2 style={{ width: 11, height: 11, color: "var(--text-muted)" }} /> {post.shares}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => setShowAll((s) => !s)}
              style={{
                width: "100%", padding: "8px 0", background: "none", border: "none",
                borderTop: "1px solid var(--border)",
                color: "var(--cyan)", fontSize: 11, cursor: "pointer", fontWeight: 700, fontFamily: "inherit"
              }}
            >
              {showAll ? "Ver menos" : `Ver más (${filteredPosts.length - INITIAL_VISIBLE})`}
            </button>
          )}

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: 8, borderTop: "1px solid var(--border)",
            fontSize: 10, color: "var(--text-muted)",
          }}>
            <button
              onClick={(e) => { e.stopPropagation(); fetchData(); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, display: "flex" }}
              title="Refrescar ahora"
            >
              <RefreshCw style={{ width: 10, height: 10 }} />
            </button>
            {isReal
              ? (lang === "es" ? `Actualizado hace ${secondsAgo < 5 ? "un momento" : `${secondsAgo}s`}` : `Updated ${secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`}`)
              : t.noDataMeta}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Modal Detail View Component with Quick Replies ── */
function PostDetailModal({ post, onClose }: { post: StreamPost; onClose: () => void }) {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "info" });

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    setStatusMsg({ text: t.sendingReply, type: "info" });
    try {
      const r = await fetch("/api/streams/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          platform: post.platform,
          content: replyText.trim()
        })
      });
      const d = await r.json();
      if (r.ok) {
        setReplyText("");
        setStatusMsg({ text: t.replySent, type: "success" });
        setTimeout(() => setStatusMsg({ text: "", type: "info" }), 3000);
      } else {
        setStatusMsg({ text: d.error || t.replyFailed, type: "error" });
      }
    } catch {
      setStatusMsg({ text: t.replyFailed, type: "error" });
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 500, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground)", fontFamily: "'Orbitron',sans-serif" }}>
              {t.postDetail}
            </span>
            <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "var(--cyan-dim)", color: "var(--cyan)", fontWeight: 700, textTransform: "capitalize" }}>
              {post.platform}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 4 }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, maxHeight: "60vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Author info */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--cyan-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--cyan)" }}>
              {post.author.charAt(0)}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{post.author}</p>
              {post.handle && <p style={{ fontSize: 10, color: "var(--text-secondary)", margin: 0 }}>{post.handle}</p>}
            </div>
            <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: "auto" }}>{post.time}</span>
          </div>

          {/* Body content */}
          {post.content && (
            <p style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
              {post.content}
            </p>
          )}

          {/* Full Media Image */}
          {post.image && (
            <div style={{ width: "100%", borderRadius: 8, overflow: "hidden", background: "rgba(0,0,0,0.1)", border: "1px solid var(--border)" }}>
              <img src={post.image} alt="Full Post Media" style={{ width: "100%", height: "auto", maxHeight: 260, objectFit: "contain" }} />
            </div>
          )}

          {/* Stats Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "10px 12px", background: "var(--surface-hover)", border: "1px solid var(--border)", borderRadius: 8, textAlign: "center" }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{post.likes}</p>
              <p style={{ fontSize: 9, color: "var(--text-secondary)", margin: 2 }}>Likes</p>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{post.comments}</p>
              <p style={{ fontSize: 9, color: "var(--text-secondary)", margin: 2 }}>Comments</p>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{post.shares}</p>
              <p style={{ fontSize: 9, color: "var(--text-secondary)", margin: 2 }}>Shares</p>
            </div>
          </div>
        </div>

        {/* Quick Comment Input */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8, background: "var(--surface-hover)" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={t.writeReply}
              disabled={sending}
              onKeyDown={e => { if (e.key === "Enter" && replyText.trim()) sendReply(); }}
              style={{
                flex: 1, padding: "8px 12px", fontSize: 12, background: "var(--surface)",
                border: "1px solid var(--border)", color: "var(--foreground)", outline: "none", borderRadius: 6
              }}
            />
            <button
              onClick={sendReply}
              disabled={sending || !replyText.trim()}
              style={{
                padding: "8px 16px", background: "var(--cyan-dim)", border: "1px solid var(--border-strong)",
                color: "var(--cyan)", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                opacity: replyText.trim() ? 1 : 0.4
              }}
            >
              {t.sendBtn}
            </button>
          </div>
          {statusMsg.text && (
            <p style={{
              fontSize: 10, margin: 0, fontWeight: 600,
              color: statusMsg.type === "success" ? "var(--emerald)" : statusMsg.type === "error" ? "var(--red)" : "var(--cyan)"
            }}>
              {statusMsg.text}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 18px", borderTop: "1px solid var(--border)" }}>
          <a
            href={post.platform === "facebook" ? `https://facebook.com/${post.id}` : `https://instagram.com/p/${post.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}
          >
            <ExternalLink style={{ width: 13, height: 13 }} />
            {t.viewOnPlatform}
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Helper ───────────────────────────────────────────── */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}
