"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Home,
  AtSign,
  Hash,
  Calendar,
  Send,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  X,
  Settings,
  RefreshCw,
} from "lucide-react";

/* ── Demo Stream Data ─────────────────────────────────── */
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

const generatePosts = (type: string, platform: string): StreamPost[] => {
  const basePosts: StreamPost[] = [
    { id: "1", author: "María García", handle: "@maria_garcia", content: "¡Nuevo lanzamiento de nuestra colección de verano! 🌞 No se lo pierdan.", time: "Hace 3m", likes: 45, comments: 12, shares: 8, platform },
    { id: "2", author: "Carlos López", handle: "@carlos_mkt", content: "Tips para mejorar tu engagement en Instagram en 2025 🚀 Hilo 🧵", time: "Hace 15m", likes: 128, comments: 34, shares: 56, platform },
    { id: "3", author: "Digital Agency MX", handle: "@digitalagencymx", content: "Resultados del Q2: +340% en alcance orgánico para nuestros clientes. ¿Cómo lo logramos? 👇", time: "Hace 32m", likes: 89, comments: 23, shares: 41, platform },
    { id: "4", author: "Ana Morales", handle: "@ana_morales", content: "¿Alguien más siente que el algoritmo de IG cambió esta semana? Mis views bajaron un 40% 😤", time: "Hace 1h", likes: 234, comments: 67, shares: 12, platform },
    { id: "5", author: "Pedro Hernández", handle: "@pedro_h", content: "Webinar gratuito mañana: \"Estrategias de contenido para TikTok\" Registro en bio ☝️", time: "Hace 2h", likes: 67, comments: 15, shares: 23, platform },
    { id: "6", author: "Laura Digital", handle: "@laura_digital", content: "Meta acaba de anunciar cambios en la API de Instagram. Les cuento los detalles...", time: "Hace 3h", likes: 156, comments: 45, shares: 78, platform },
  ];

  if (type === "mentions") {
    return basePosts.map((p) => ({ ...p, content: `@sodare ${p.content}` })).slice(0, 4);
  }
  if (type === "scheduled") {
    return basePosts.slice(0, 3).map((p) => ({ ...p, content: `[Programado] ${p.content}`, time: "Mañana 10:00 AM" }));
  }
  return basePosts;
};

/* ── Board interface ────────────────────────────────────── */
interface BoardColumn {
  id: string;
  type: string;
  platform: string;
  query?: string;
}

interface Board {
  id: string;
  name: string;
  columns: BoardColumn[];
}

const DEFAULT_BOARDS: Board[] = [
  {
    id: "1",
    name: "Monitoreo Principal",
    columns: [
      { id: "c1", type: "home_feed", platform: "facebook" },
      { id: "c2", type: "mentions", platform: "instagram" },
      { id: "c3", type: "keyword", platform: "instagram", query: "#marketingdigital" },
      { id: "c4", type: "scheduled", platform: "facebook" },
    ],
  },
  {
    id: "2",
    name: "Instagram Focus",
    columns: [
      { id: "c5", type: "home_feed", platform: "instagram" },
      { id: "c6", type: "mentions", platform: "instagram" },
      { id: "c7", type: "published", platform: "instagram" },
    ],
  },
];

/* ═══════════════════════════════════════════════════════
   STREAMS DASHBOARD
   ═══════════════════════════════════════════════════════ */
export function StreamsDashboard() {
  const [boards, setBoards] = useState<Board[]>(DEFAULT_BOARDS);
  const [activeBoardId, setActiveBoardId] = useState("1");
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColType, setNewColType] = useState("home_feed");
  const [newColPlatform, setNewColPlatform] = useState("facebook");
  const [newColQuery, setNewColQuery] = useState("");

  const activeBoard = boards.find((b) => b.id === activeBoardId) || boards[0];

  const addColumn = () => {
    if (!activeBoard) return;
    const newCol: BoardColumn = {
      id: `c${Date.now()}`,
      type: newColType,
      platform: newColPlatform,
      query: newColQuery || undefined,
    };
    setBoards(boards.map((b) =>
      b.id === activeBoardId ? { ...b, columns: [...b.columns, newCol] } : b
    ));
    setAddingColumn(false);
    setNewColQuery("");
  };

  const removeColumn = (colId: string) => {
    setBoards(boards.map((b) =>
      b.id === activeBoardId ? { ...b, columns: b.columns.filter((c) => c.id !== colId) } : b
    ));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 40 }}>
      {/* Board tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="flex space-x-1 glass-panel p-1">
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => setActiveBoardId(board.id)}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                activeBoardId === board.id
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {board.name}
            </button>
          ))}
        </div>

        <button
          onClick={() => setAddingColumn(true)}
          style={{
            padding: "8px 14px", borderRadius: 10, background: "rgba(34,211,238,0.12)",
            border: "1px solid rgba(34,211,238,0.25)", color: "#22d3ee", fontSize: 12,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <Plus style={{ width: 14, height: 14 }} /> Agregar Columna
        </button>
      </div>

      {/* Add column modal */}
      {addingColumn && (
        <div className="glass-panel p-4" style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 4 }}>Tipo</label>
            <select
              value={newColType}
              onChange={(e) => setNewColType(e.target.value)}
              style={{
                padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13,
              }}
            >
              {STREAM_TYPES.map((t) => (
                <option key={t.type} value={t.type} style={{ background: "#1a1a2e" }}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 4 }}>Plataforma</label>
            <select
              value={newColPlatform}
              onChange={(e) => setNewColPlatform(e.target.value)}
              style={{
                padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13,
              }}
            >
              {Object.keys(platformColors).map((p) => (
                <option key={p} value={p} style={{ background: "#1a1a2e" }}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
          {(newColType === "keyword" || newColType === "hashtag") && (
            <div>
              <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 4 }}>Keyword</label>
              <input
                value={newColQuery}
                onChange={(e) => setNewColQuery(e.target.value)}
                placeholder="#hashtag o keyword"
                style={{
                  padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13, outline: "none",
                }}
              />
            </div>
          )}
          <button onClick={addColumn} style={{
            padding: "8px 16px", borderRadius: 8, background: "#22d3ee", color: "#0a0a1a",
            fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer",
          }}>
            Agregar
          </button>
          <button onClick={() => setAddingColumn(false)} style={{
            padding: "8px 16px", borderRadius: 8, background: "transparent", color: "#94a3b8",
            fontSize: 13, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
          }}>
            Cancelar
          </button>
        </div>
      )}

      {/* Columns grid */}
      <div style={{
        display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8,
        minHeight: "calc(100vh - 280px)",
      }}>
        {activeBoard.columns.map((col) => (
          <StreamColumnView key={col.id} col={col} onRemove={removeColumn} />
        ))}
      </div>
    </div>
  );
}

/* ── Stream Column with real data fetching ──────────────── */
function StreamColumnView({ col, onRemove }: { col: BoardColumn; onRemove: (id: string) => void }) {
  const streamType = STREAM_TYPES.find((t) => t.type === col.type);
  const Icon = streamType?.icon || Home;
  const platColor = platformColors[col.platform] || "#64748b";
  const [posts, setPosts] = useState<StreamPost[]>(generatePosts(col.type, col.platform));
  const [isReal, setIsReal] = useState(false);

  useEffect(() => {
    // Only fetch for feed types (home_feed, mentions, published)
    if (["home_feed", "mentions", "published"].includes(col.type)) {
      fetch(`/api/streams/feed?type=${col.type}&platform=${col.platform}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
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
          }
        })
        .catch(() => {});
    }
  }, [col.type, col.platform]);

  return (
    <div
      style={{
        minWidth: 320, maxWidth: 360, flex: "0 0 auto",
        display: "flex", flexDirection: "column",
        borderRadius: 12, background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden",
      }}
    >
      {/* Column header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "12px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: `${platColor}08`,
      }}>
        <Icon style={{ width: 16, height: 16, color: platColor }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "white", flex: 1 }}>
          {streamType?.label || col.type}
          {col.query && <span style={{ fontWeight: 400, color: "#94a3b8" }}> · {col.query}</span>}
        </span>
        <span style={{
          fontSize: 10, padding: "2px 6px", borderRadius: 4,
          background: `${platColor}20`, color: platColor,
        }}>
          {col.platform}
        </span>
        {!isReal && (
          <span style={{ fontSize: 8, color: "#64748b", fontWeight: 600 }}>DEMO</span>
        )}
        <button
          onClick={() => onRemove(col.id)}
          style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 2 }}
        >
          <X style={{ width: 12, height: 12 }} />
        </button>
      </div>

      {/* Posts */}
      <div style={{ flex: 1, overflowY: "auto", padding: 8 }} className="space-y-2">
        {posts.map((post) => (
          <div
            key={post.id}
            style={{
              padding: 12, borderRadius: 10,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)",
              transition: "background 0.2s", cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: `${platColor}15`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 600, color: platColor,
              }}>
                {post.author.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "white" }}>{post.author}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>{post.handle}</div>
              </div>
              <span style={{ fontSize: 10, color: "#64748b" }}>{post.time}</span>
            </div>
            <p style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.5, marginBottom: 8 }}>
              {post.content}
            </p>
            <div style={{ display: "flex", gap: 16 }}>
              <button style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#64748b", fontSize: 11, cursor: "pointer" }}>
                <Heart style={{ width: 12, height: 12 }} /> {post.likes}
              </button>
              <button style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#64748b", fontSize: 11, cursor: "pointer" }}>
                <MessageCircle style={{ width: 12, height: 12 }} /> {post.comments}
              </button>
              <button style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#64748b", fontSize: 11, cursor: "pointer" }}>
                <Share2 style={{ width: 12, height: 12 }} /> {post.shares}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Refresh indicator */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: 8, borderTop: "1px solid rgba(255,255,255,0.04)",
        fontSize: 10, color: "#475569",
      }}>
        <RefreshCw style={{ width: 10, height: 10 }} />
        {isReal ? "Datos en vivo" : "Datos de demostración"}
      </div>
    </div>
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
