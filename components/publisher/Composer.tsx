"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Image as ImageIcon,
  X,
  Clock,
  Save,
  Upload,
  Hash,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Smartphone,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Bookmark,
  ChevronDown,
} from "lucide-react";

/* ── Social Icons (not in lucide-react) ───────────────── */
const Facebook = ({ style }: { style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16, ...style }}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
const Instagram = ({ style }: { style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16, ...style }}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);


/* ── Types ─────────────────────────────────────────────── */
interface MetaPage {
  id: string;
  name: string;
  picture: string;
  followers: number;
  instagram: {
    id: string;
    username: string;
    picture: string;
    followers: number;
  } | null;
}

interface UploadedMedia {
  url: string;
  type: "image" | "video";
  name: string;
}

interface Banner {
  type: "success" | "error";
  message: string;
}

/* ── Constants ─────────────────────────────────────────── */
const CHAR_LIMITS: Record<string, number> = {
  facebook: 63206,
  instagram: 2200,
};

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 8,
  padding: 20,
};

/* ══════════════════════════════════════════════════════════
   COMPOSER COMPONENT
   ══════════════════════════════════════════════════════════ */
export function Composer() {
  /* ── State ──────────────────────────────────────────── */
  const [content, setContent] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<UploadedMedia[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [activePreview, setActivePreview] = useState<string>("facebook");

  // Pages
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<MetaPage | null>(null);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [showPageDropdown, setShowPageDropdown] = useState(false);

  // Loading
  const [savingDraft, setSavingDraft] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Feedback
  const [banner, setBanner] = useState<Banner | null>(null);

  // Drag & drop
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const pageDropdownRef = useRef<HTMLDivElement>(null);

  /* ── Load pages on mount ────────────────────────────── */
  useEffect(() => {
    const loadPages = async () => {
      setPagesLoading(true);
      try {
        const res = await fetch("/api/meta/pages");
        const data = await res.json();
        const list: MetaPage[] = data.data || [];
        setPages(list);
        if (list.length > 0) setSelectedPage(list[0]);
      } catch {
        /* silent */
      } finally {
        setPagesLoading(false);
      }
    };
    loadPages();
  }, []);

  /* ── Auto-dismiss banner ────────────────────────────── */
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(t);
  }, [banner]);

  /* ── Close page dropdown on outside click ───────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        pageDropdownRef.current &&
        !pageDropdownRef.current.contains(e.target as Node)
      ) {
        setShowPageDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Channel toggle ─────────────────────────────────── */
  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) => {
      const next = prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel];
      if (!prev.includes(channel)) setActivePreview(channel);
      return next;
    });
  };

  /* ── File upload ────────────────────────────────────── */
  const uploadFile = async (file: File): Promise<UploadedMedia | null> => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/publisher/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json();
        setBanner({ type: "error", message: err.error || "Error al subir archivo" });
        return null;
      }
      const data = await res.json();
      const isVideo = file.type.startsWith("video/");
      return { url: data.url, type: isVideo ? "video" : "image", name: file.name };
    } catch {
      setBanner({ type: "error", message: "Error de red al subir archivo" });
      return null;
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const videoCount = mediaFiles.filter((m) => m.type === "video").length;
    const imageCount = mediaFiles.filter((m) => m.type === "image").length;

    const toUpload: File[] = [];
    for (const file of fileArr) {
      const isVideo = file.type.startsWith("video/");
      if (isVideo && videoCount >= 1) {
        setBanner({ type: "error", message: "Máximo 1 video por publicación" });
        continue;
      }
      if (!isVideo && imageCount + toUpload.filter((f) => !f.type.startsWith("video/")).length >= 10) {
        setBanner({ type: "error", message: "Máximo 10 imágenes por publicación" });
        continue;
      }
      toUpload.push(file);
    }

    if (toUpload.length === 0) return;

    setUploading(true);
    const results: UploadedMedia[] = [];
    for (const file of toUpload) {
      const uploaded = await uploadFile(file);
      if (uploaded) results.push(uploaded);
    }
    setMediaFiles((prev) => [...prev, ...results]);
    setUploading(false);
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /* ── Drag & drop handlers ───────────────────────────── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mediaFiles]
  );

  /* ── Hashtag management ─────────────────────────────── */
  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, "");
    if (tag && !hashtags.includes(tag)) {
      setHashtags((prev) => [...prev, tag]);
    }
    setHashtagInput("");
  };

  const removeHashtag = (tag: string) => {
    setHashtags((prev) => prev.filter((t) => t !== tag));
  };

  const handleHashtagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addHashtag();
    }
  };

  /* ── Build full content with hashtags ───────────────── */
  const fullContent = () => {
    if (hashtags.length === 0) return content;
    return content + "\n\n" + hashtags.map((t) => `#${t}`).join(" ");
  };

  /* ── Character count helpers ────────────────────────── */
  const charCount = fullContent().length;
  const getCharLimit = () => {
    if (selectedChannels.includes("instagram")) return CHAR_LIMITS.instagram;
    return CHAR_LIMITS.facebook;
  };
  const charLimit = getCharLimit();
  const charPercent = Math.min((charCount / charLimit) * 100, 100);
  const isOverLimit = charCount > charLimit;
  const isNearLimit = charPercent > 90 && !isOverLimit;

  /* ── Clear form ─────────────────────────────────────── */
  const clearForm = () => {
    setContent("");
    setMediaFiles([]);
    setHashtags([]);
    setHashtagInput("");
    setScheduledAt("");
  };

  /* ── Actions ────────────────────────────────────────── */
  const validateForm = (): string | null => {
    if (!content.trim()) return "El contenido es obligatorio";
    if (selectedChannels.length === 0) return "Selecciona al menos un canal";
    if (isOverLimit) return `El contenido excede el límite de ${charLimit.toLocaleString()} caracteres`;
    return null;
  };

  const saveDraft = async () => {
    const err = validateForm();
    if (err) { setBanner({ type: "error", message: err }); return; }

    setSavingDraft(true);
    try {
      const res = await fetch("/api/publisher/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: fullContent(),
          channels: selectedChannels,
          mediaUrls: mediaFiles.map((m) => m.url),
          status: "Draft",
          type: "post",
          hashtags,
          pageName: selectedPage?.name || null,
          pageId: selectedPage?.id || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }
      setBanner({ type: "success", message: "Borrador guardado exitosamente" });
      clearForm();
    } catch (e: any) {
      setBanner({ type: "error", message: e.message });
    } finally {
      setSavingDraft(false);
    }
  };

  const schedulePost = async () => {
    const err = validateForm();
    if (err) { setBanner({ type: "error", message: err }); return; }
    if (!scheduledAt) {
      setBanner({ type: "error", message: "Selecciona fecha y hora para programar" });
      return;
    }

    setScheduling(true);
    try {
      const res = await fetch("/api/publisher/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: fullContent(),
          channels: selectedChannels,
          mediaUrls: mediaFiles.map((m) => m.url),
          scheduledAt: new Date(scheduledAt).toISOString(),
          status: "Scheduled",
          type: "post",
          hashtags,
          pageName: selectedPage?.name || null,
          pageId: selectedPage?.id || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al programar");
      }
      const scheduleDate = new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(scheduledAt));
      setBanner({ type: "success", message: `Publicación programada para ${scheduleDate}` });
      clearForm();
    } catch (e: any) {
      setBanner({ type: "error", message: e.message });
    } finally {
      setScheduling(false);
    }
  };

  const publishNow = async () => {
    const err = validateForm();
    if (err) { setBanner({ type: "error", message: err }); return; }

    setPublishing(true);
    try {
      // Step 1: Create post as Draft
      const createRes = await fetch("/api/publisher/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: fullContent(),
          channels: selectedChannels,
          mediaUrls: mediaFiles.map((m) => m.url),
          status: "Draft",
          type: "post",
          hashtags,
          pageName: selectedPage?.name || null,
          pageId: selectedPage?.id || null,
        }),
      });
      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error || "Error al crear post");
      }
      const { post } = await createRes.json();

      // Step 2: Publish
      const pubRes = await fetch("/api/publisher/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      const pubData = await pubRes.json();
      if (!pubRes.ok) {
        throw new Error(pubData.error || "Error al publicar");
      }
      setBanner({ type: "success", message: "¡Publicación exitosa! Tu post ya está en vivo." });
      clearForm();
    } catch (e: any) {
      setBanner({ type: "error", message: e.message });
    } finally {
      setPublishing(false);
    }
  };

  const anyLoading = savingDraft || scheduling || publishing;

  /* ── Preview helpers ────────────────────────────────── */
  const previewPageName = selectedPage?.name || "Tu Página";
  const previewPagePic = selectedPage?.picture || "";
  const previewIgUsername = selectedPage?.instagram?.username || "tu.cuenta";
  const previewIgPic = selectedPage?.instagram?.picture || "";
  const previewText = fullContent() || "Tu increíble contenido aparecerá aquí...";
  const previewMedia = mediaFiles.length > 0 ? mediaFiles[0].url : null;

  /* ── Render Facebook Preview ────────────────────────── */
  const renderFacebookPreview = () => (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        overflow: "hidden",
        maxWidth: 380,
        width: "100%",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {previewPagePic ? (
            <img
              src={previewPagePic}
              alt=""
              style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #1877f2, #00d4ff)",
              }}
            />
          )}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{previewPageName}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
              Justo ahora · 🌎
            </div>
          </div>
        </div>
        <MoreHorizontal style={{ width: 18, height: 18, color: "#64748b" }} />
      </div>

      {/* Content */}
      <div style={{ padding: "0 14px 12px", fontSize: 14, color: "#cbd5e1", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
        {previewText}
      </div>

      {/* Media */}
      {previewMedia && (
        <div style={{ width: "100%", height: 240, background: "#0f172a" }}>
          {mediaFiles[0]?.type === "video" ? (
            <video src={previewMedia} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
          ) : (
            <img src={previewMedia} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>
      )}

      {/* Action bar */}
      <div
        style={{
          display: "flex",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "8px 4px",
        }}
      >
        {[
          { icon: <Heart style={{ width: 16, height: 16 }} />, label: "Me gusta" },
          { icon: <MessageCircle style={{ width: 16, height: 16 }} />, label: "Comentar" },
          { icon: <Share2 style={{ width: 16, height: 16 }} />, label: "Compartir" },
        ].map((btn) => (
          <div
            key={btn.label}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              color: "#64748b",
              fontSize: 13,
              fontWeight: 500,
              padding: "6px 0",
            }}
          >
            {btn.icon}
            <span>{btn.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── Render Instagram Preview ───────────────────────── */
  const renderInstagramPreview = () => (
    <div
      style={{
        background: "#000",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        overflow: "hidden",
        maxWidth: 380,
        width: "100%",
        fontFamily: "Inter, -apple-system, sans-serif",
        color: "#fff",
      }}
    >
      {/* Header */}
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
              padding: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {previewIgPic ? (
              <img
                src={previewIgPic}
                alt=""
                style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#0a0f1e" }} />
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{previewIgUsername}</div>
        </div>
        <MoreHorizontal style={{ width: 18, height: 18 }} />
      </div>

      {/* Media */}
      {previewMedia ? (
        <div style={{ width: "100%", aspectRatio: "1", background: "#0a0f1e" }}>
          {mediaFiles[0]?.type === "video" ? (
            <video src={previewMedia} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
          ) : (
            <img src={previewMedia} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            aspectRatio: "1",
            background: "#0a0f1e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#334155",
          }}
        >
          <ImageIcon style={{ width: 48, height: 48 }} />
        </div>
      )}

      {/* Actions + Caption */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <Heart style={{ width: 24, height: 24 }} />
            <MessageCircle style={{ width: 24, height: 24 }} />
            <Send style={{ width: 24, height: 24 }} />
          </div>
          <Bookmark style={{ width: 24, height: 24 }} />
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          <span style={{ fontWeight: 600, marginRight: 6 }}>{previewIgUsername}</span>
          {previewText}
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════ */
  return (
    <div style={{ display: "flex", gap: 24, minHeight: 600, flexWrap: "wrap" }}>
      {/* ─── LEFT: COMPOSER ─────────────────────────────── */}
      <div className="glass-panel" style={{ flex: 1, minWidth: 0, padding: 24, display: "flex", flexDirection: "column", gap: 20, borderRadius: 12 }}>
        {/* Banner */}
        {banner && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              background: banner.type === "success" ? "rgba(0,200,117,0.12)" : "rgba(226,68,92,0.12)",
              border: `1px solid ${banner.type === "success" ? "rgba(0,200,117,0.3)" : "rgba(226,68,92,0.3)"}`,
              color: banner.type === "success" ? "#00c875" : "#e2445c",
            }}
          >
            {banner.type === "success" ? (
              <Check style={{ width: 16, height: 16, flexShrink: 0 }} />
            ) : (
              <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
            )}
            {banner.message}
          </div>
        )}

        {/* Header */}
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>Editor de Publicaciones</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
            Selecciona canales y redacta un post para todas tus redes.
          </p>
        </div>

        {/* Channels */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => toggleChannel("facebook")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              border: selectedChannels.includes("facebook")
                ? "1px solid #1877f2"
                : "1px solid rgba(255,255,255,0.08)",
              background: selectedChannels.includes("facebook")
                ? "rgba(24,119,242,0.15)"
                : "rgba(255,255,255,0.03)",
              color: selectedChannels.includes("facebook") ? "#60a5fa" : "#64748b",
              transition: "all 0.2s",
            }}
          >
            <Facebook style={{ width: 16, height: 16 }} /> Facebook
          </button>

          <button
            onClick={() => toggleChannel("instagram")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              border: selectedChannels.includes("instagram")
                ? "1px solid #e1306c"
                : "1px solid rgba(255,255,255,0.08)",
              background: selectedChannels.includes("instagram")
                ? "rgba(225,48,108,0.15)"
                : "rgba(255,255,255,0.03)",
              color: selectedChannels.includes("instagram") ? "#f472b6" : "#64748b",
              transition: "all 0.2s",
            }}
          >
            <Instagram style={{ width: 16, height: 16 }} /> Instagram
          </button>
        </div>

        {/* Page Selector */}
        {selectedChannels.length > 0 && (
          <div ref={pageDropdownRef} style={{ position: "relative" }}>
            <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, marginBottom: 6, display: "block" }}>
              Página / Cuenta
            </label>
            <button
              onClick={() => setShowPageDropdown(!showPageDropdown)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#e2e8f0",
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {pagesLoading ? (
                <>
                  <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                  <span style={{ color: "#94a3b8" }}>Cargando páginas...</span>
                </>
              ) : selectedPage ? (
                <>
                  <img
                    src={selectedPage.picture}
                    alt=""
                    style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
                  />
                  <span style={{ flex: 1 }}>{selectedPage.name}</span>
                  {selectedPage.instagram && (
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      @{selectedPage.instagram.username}
                    </span>
                  )}
                  <ChevronDown style={{ width: 14, height: 14, color: "#64748b" }} />
                </>
              ) : (
                <span style={{ color: "#64748b" }}>No hay páginas disponibles</span>
              )}
            </button>

            {showPageDropdown && pages.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  background: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  overflow: "hidden",
                  zIndex: 50,
                  maxHeight: 240,
                  overflowY: "auto",
                }}
              >
                {pages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => {
                      setSelectedPage(page);
                      setShowPageDropdown(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "10px 14px",
                      background: selectedPage?.id === page.id ? "rgba(0,212,255,0.08)" : "transparent",
                      border: "none",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      color: "#e2e8f0",
                      fontSize: 13,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <img
                      src={page.picture}
                      alt=""
                      style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{page.name}</div>
                      {page.instagram && (
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>
                          @{page.instagram.username}
                        </div>
                      )}
                    </div>
                    {selectedPage?.id === page.id && (
                      <Check style={{ width: 14, height: 14, color: "#00d4ff" }} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Text area */}
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRadius: 10,
            border: isDragging
              ? "2px dashed #00d4ff"
              : "1px solid rgba(255,255,255,0.08)",
            background: isDragging ? "rgba(0,212,255,0.04)" : "rgba(255,255,255,0.02)",
            overflow: "hidden",
            transition: "all 0.2s",
            minHeight: 200,
          }}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="¿Qué quieres compartir con tu audiencia hoy?"
            style={{
              flex: 1,
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              padding: 16,
              color: "#e2e8f0",
              fontSize: 14,
              lineHeight: 1.6,
              fontFamily: "Inter, sans-serif",
              minHeight: 140,
            }}
          />

          {/* Hashtag pills */}
          {hashtags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 16px 8px" }}>
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: "rgba(123,97,255,0.15)",
                    border: "1px solid rgba(123,97,255,0.3)",
                    color: "#a78bfa",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  #{tag}
                  <button
                    onClick={() => removeHashtag(tag)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#a78bfa",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                    }}
                  >
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Media thumbnails */}
          {mediaFiles.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0 16px 12px" }}>
              {mediaFiles.map((media, i) => (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    width: 64,
                    height: 64,
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.1)",
                    flexShrink: 0,
                  }}
                >
                  {media.type === "video" ? (
                    <video src={media.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                  ) : (
                    <img src={media.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                  <button
                    onClick={() => removeMedia(i)}
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.7)",
                      border: "none",
                      color: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              ))}
              {uploading && (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 8,
                    border: "1px dashed rgba(255,255,255,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Loader2 style={{ width: 20, height: 20, color: "#00d4ff", animation: "spin 1s linear infinite" }} />
                </div>
              )}
            </div>
          )}

          {/* Drag overlay */}
          {isDragging && (
            <div
              style={{
                padding: "24px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                color: "#00d4ff",
              }}
            >
              <Upload style={{ width: 32, height: 32 }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Suelta tus archivos aquí</span>
            </div>
          )}

          {/* Bottom toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.01)",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {/* Left: media + hashtag */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Subir imagen o video"
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#94a3b8",
                  cursor: uploading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  transition: "all 0.15s",
                }}
              >
                {uploading ? (
                  <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                ) : (
                  <ImageIcon style={{ width: 16, height: 16 }} />
                )}
                <span>Medios</span>
              </button>

              {/* Hashtag input inline */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Hash style={{ width: 14, height: 14, color: "#64748b" }} />
                <input
                  type="text"
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={handleHashtagKeyDown}
                  placeholder="hashtag"
                  style={{
                    width: 100,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#a78bfa",
                    fontSize: 12,
                    fontFamily: "Inter, sans-serif",
                  }}
                />
                {hashtagInput.trim() && (
                  <button
                    onClick={addHashtag}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#7b61ff",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                    }}
                  >
                    <Plus style={{ width: 14, height: 14 }} />
                  </button>
                )}
              </div>
            </div>

            {/* Right: char count */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: isOverLimit ? "#e2445c" : isNearLimit ? "#fdab3d" : "#64748b",
                }}
              >
                {charCount.toLocaleString()} / {charLimit.toLocaleString()}
              </span>
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${charPercent}%`,
                    height: "100%",
                    borderRadius: 2,
                    background: isOverLimit ? "#e2445c" : isNearLimit ? "#fdab3d" : "#00d4ff",
                    transition: "all 0.3s",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Schedule date picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Clock style={{ width: 16, height: 16, color: "#64748b", flexShrink: 0 }} />
          <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, flexShrink: 0 }}>
            Programar para:
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            style={{
              flex: 1,
              maxWidth: 240,
              padding: "8px 12px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#e2e8f0",
              fontSize: 13,
              fontFamily: "Inter, sans-serif",
              outline: "none",
              colorScheme: "dark",
            }}
          />
          {scheduledAt && (
            <button
              onClick={() => setScheduledAt("")}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                padding: 2,
                display: "flex",
              }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {/* Save Draft */}
          <button
            onClick={saveDraft}
            disabled={anyLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#cbd5e1",
              fontSize: 13,
              fontWeight: 500,
              cursor: anyLoading ? "not-allowed" : "pointer",
              opacity: anyLoading ? 0.5 : 1,
              transition: "all 0.2s",
            }}
          >
            {savingDraft ? (
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
            ) : (
              <Save style={{ width: 16, height: 16 }} />
            )}
            Guardar Borrador
          </button>

          {/* Schedule */}
          <button
            onClick={schedulePost}
            disabled={anyLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 8,
              background: scheduledAt ? "rgba(253,171,61,0.12)" : "rgba(255,255,255,0.04)",
              border: scheduledAt ? "1px solid rgba(253,171,61,0.3)" : "1px solid rgba(255,255,255,0.1)",
              color: scheduledAt ? "#fdab3d" : "#64748b",
              fontSize: 13,
              fontWeight: 500,
              cursor: anyLoading ? "not-allowed" : "pointer",
              opacity: anyLoading ? 0.5 : 1,
              transition: "all 0.2s",
            }}
          >
            {scheduling ? (
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
            ) : (
              <Clock style={{ width: 16, height: 16 }} />
            )}
            Programar
          </button>

          {/* Publish Now */}
          <button
            onClick={publishNow}
            disabled={anyLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 24px",
              borderRadius: 8,
              background: "linear-gradient(135deg, #00b4d8, #0077b6)",
              border: "none",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: anyLoading ? "not-allowed" : "pointer",
              opacity: anyLoading ? 0.6 : 1,
              boxShadow: "0 4px 16px rgba(0,180,216,0.2)",
              transition: "all 0.2s",
            }}
          >
            {publishing ? (
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
            ) : (
              <Send style={{ width: 16, height: 16 }} />
            )}
            Publicar Ahora
          </button>
        </div>
      </div>

      {/* ─── RIGHT: LIVE PREVIEW ────────────────────────── */}
      <div
        className="glass-panel"
        style={{
          width: 450,
          minWidth: 320,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          borderRadius: 12,
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Smartphone style={{ width: 16, height: 16, color: "#64748b" }} />
            <h3 style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1.5, textTransform: "uppercase", margin: 0 }}>
              Vista Previa
            </h3>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {["facebook", "instagram"].map((ch) => (
              <button
                key={ch}
                onClick={() => setActivePreview(ch)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  background: activePreview === ch ? "rgba(255,255,255,0.08)" : "transparent",
                  border: "none",
                  color: activePreview === ch ? "#fff" : "#475569",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 500,
                  transition: "all 0.15s",
                }}
              >
                {ch === "facebook" && <Facebook style={{ width: 14, height: 14 }} />}
                {ch === "instagram" && <Instagram style={{ width: 14, height: 14 }} />}
                {ch === "facebook" ? "FB" : "IG"}
              </button>
            ))}
          </div>
        </div>

        {/* Preview content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            overflowY: "auto",
            paddingTop: 8,
          }}
        >
          {activePreview === "facebook" && renderFacebookPreview()}
          {activePreview === "instagram" && renderInstagramPreview()}
        </div>
      </div>

      {/* Spin keyframes injected once */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
