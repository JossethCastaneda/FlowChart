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
  Globe,
  Trash2,
  Terminal,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronUp,
} from "lucide-react";
import { openConnectPopup } from "@/lib/connect-popup";

import { EmptyState } from "@/components/ui/EmptyState";
import { FormatSelector, type PostFormat } from "./FormatSelector";
import { PlatformContentTabs } from "./PlatformContentTabs";
import { FirstCommentExpander } from "./FirstCommentExpander";
import { PostPreview } from "./PostPreview";

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

/** A "publishable target" — one FB page or one IG account derived from a page */
interface PublishTarget {
  key: string;            // unique: `fb_${pageId}` or `ig_${igId}`
  platform: "facebook" | "instagram";
  pageId: string;
  pageName: string;
  pagePicture: string;
  igId?: string;
  igUsername?: string;
  igPicture?: string;
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

/* ══════════════════════════════════════════════════════════
   COMPOSER COMPONENT — Hootsuite-style
   ══════════════════════════════════════════════════════════ */
export function Composer() {
  /* ── State ──────────────────────────────────────────── */
  const [content, setContent] = useState("");
  const [selectedTargets, setSelectedTargets] = useState<PublishTarget[]>([]);
  const [mediaFiles, setMediaFiles] = useState<UploadedMedia[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  // ── New: Format + Per-platform + First comment ──
  const [format, setFormat] = useState<PostFormat>("post");
  const [customizeByPlatform, setCustomizeByPlatform] = useState(false);
  const [fbContent, setFbContent] = useState("");
  const [igContent, setIgContent] = useState("");
  const [activePlatformTab, setActivePlatformTab] = useState<"facebook" | "instagram">("facebook");
  const [firstComment, setFirstComment] = useState("");

  // Pages
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [allTargets, setAllTargets] = useState<PublishTarget[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  // Social connection status
  const [socialConnected, setSocialConnected] = useState<boolean | null>(null);
  const [socialPages, setSocialPages] = useState<any[]>([]);
  const [socialInstagramAccounts, setSocialInstagramAccounts] = useState<any[]>([]);

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
  const pickerRef = useRef<HTMLDivElement>(null);

  /* ── Build targets from pages ───────────────────────── */
  useEffect(() => {
    const targets: PublishTarget[] = [];
    for (const page of pages) {
      targets.push({
        key: `fb_${page.id}`,
        platform: "facebook",
        pageId: page.id,
        pageName: page.name,
        pagePicture: page.picture,
      });
      if (page.instagram) {
        targets.push({
          key: `ig_${page.instagram.id}`,
          platform: "instagram",
          pageId: page.id,
          pageName: page.name,
          pagePicture: page.picture,
          igId: page.instagram.id,
          igUsername: page.instagram.username,
          igPicture: page.instagram.picture,
        });
      }
    }
    setAllTargets(targets);
  }, [pages]);

  /* ── Load pages on mount ────────────────────────────── */
  useEffect(() => {
    const loadPages = async () => {
      setPagesLoading(true);
      try {
        const res = await fetch("/api/meta/pages");
        const data = await res.json();
        const list: MetaPage[] = data.data || [];
        setPages(list);
      } catch {
        /* silent */
      } finally {
        setPagesLoading(false);
      }
    };
    loadPages();
  }, []);

  /* ── Load social connection status ──────────────────── */
  const loadSocialStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/connect/status");
      if (res.ok) {
        const data = await res.json();
        // Check publisher_facebook first, fall back to social
        const pub = data.modules?.publisher_facebook || data.modules?.social;
        setSocialConnected(pub?.connected ?? false);
        const pagesArr: any[] = pub?.pages || [];
        setSocialPages(pagesArr);
        setSocialInstagramAccounts(pagesArr.filter((p: any) => p.instagramId));
      } else {
        setSocialConnected(false);
      }
    } catch {
      setSocialConnected(false);
    }
  }, []);

  useEffect(() => {
    loadSocialStatus();
    // Also refresh if we just connected (URL param)
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "publisher_facebook" || params.get("connected") === "publisher_instagram" || params.get("connected") === "social") {
      window.history.replaceState({}, "", window.location.pathname);
      loadSocialStatus();
    }
  }, []);

  /* ── Auto-dismiss banner ────────────────────────────── */
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(t);
  }, [banner]);

  /* ── Close picker on outside click ──────────────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowAccountPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Target toggle (multi-select) ───────────────────── */
  const toggleTarget = (target: PublishTarget) => {
    setSelectedTargets((prev) => {
      const exists = prev.find((t) => t.key === target.key);
      if (exists) return prev.filter((t) => t.key !== target.key);
      return [...prev, target];
    });
  };

  const removeTarget = (key: string) => {
    setSelectedTargets((prev) => prev.filter((t) => t.key !== key));
  };

  const clearAllTargets = () => setSelectedTargets([]);

  const selectAllTargets = () => setSelectedTargets([...allTargets]);

  /* ── File upload ────────────────────────────────────── */
  const uploadFile = async (file: File): Promise<UploadedMedia | null> => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/publisher/upload", { method: "POST", body: fd });
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

  const removeMedia = (index: number) => setMediaFiles((prev) => prev.filter((_, i) => i !== index));

  /* ── Drag & drop handlers ───────────────────────────── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
  }, []);
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault(); e.stopPropagation(); setIsDragging(false);
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mediaFiles]
  );

  /* ── Hashtag management ─────────────────────────────── */
  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, "");
    if (tag && !hashtags.includes(tag)) setHashtags((prev) => [...prev, tag]);
    setHashtagInput("");
  };
  const removeHashtag = (tag: string) => setHashtags((prev) => prev.filter((t) => t !== tag));
  const handleHashtagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addHashtag(); }
  };

  /* ── Build full content with hashtags ───────────────── */
  const fullContent = () => {
    if (hashtags.length === 0) return content;
    return content + "\n\n" + hashtags.map((t) => `#${t}`).join(" ");
  };

  /* ── Character count helpers ────────────────────────── */
  const charCount = fullContent().length;
  const hasIg = selectedTargets.some((t) => t.platform === "instagram");
  const charLimit = hasIg ? CHAR_LIMITS.instagram : CHAR_LIMITS.facebook;
  const charPercent = Math.min((charCount / charLimit) * 100, 100);
  const isOverLimit = charCount > charLimit;
  const isNearLimit = charPercent > 90 && !isOverLimit;

  /* ── Clear form ─────────────────────────────────────── */
  const clearForm = () => {
    setContent(""); setMediaFiles([]); setHashtags([]); setHashtagInput(""); setScheduledAt("");
    setFormat("post"); setCustomizeByPlatform(false); setFbContent(""); setIgContent("");
    setFirstComment(""); setActivePlatformTab("facebook");
  };

  /* ── Actions ────────────────────────────────────────── */
  const selectedChannels = [...new Set(selectedTargets.map((t) => t.platform))];
  const firstFbTarget = selectedTargets.find((t) => t.platform === "facebook");

  const validateForm = (): string | null => {
    if (!content.trim()) return "Misión vacía. El contenido es obligatorio para transmitir.";
    if (selectedTargets.length === 0) return "Destinos no definidos. Asigna canales de transmisión.";
    if (isOverLimit) return `Desbordamiento de datos: la transmisión excede el límite de ${charLimit.toLocaleString()} caracteres.`;
    return null;
  };

  const buildPayload = (status: "Draft" | "Scheduled") => {
    const fallbackTarget = selectedTargets[0];
    return {
      content: fullContent(),
      contentByPlatform: customizeByPlatform ? { facebook: fbContent, instagram: igContent } : undefined,
      firstComment: firstComment.trim() || undefined,
      channels: selectedChannels,
      mediaUrls: mediaFiles.map((m) => m.url),
      scheduledAt: status === "Scheduled" ? new Date(scheduledAt).toISOString() : undefined,
      status,
      type: format,
      hashtags,
      pageName: firstFbTarget?.pageName || fallbackTarget?.pageName || null,
      pageId: firstFbTarget?.pageId || fallbackTarget?.pageId || null,
      targets: selectedTargets.map((t) => ({
        key: t.key,
        platform: t.platform,
        pageId: t.pageId,
        igId: t.igId,
      })),
    };
  };

  const saveDraft = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const err = validateForm();
    if (err) { setBanner({ type: "error", message: err }); return; }
    setSavingDraft(true);
    try {
      const res = await fetch("/api/publisher/posts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload("Draft")),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Error al guardar el borrador en la base de datos."); }
      setBanner({ type: "success", message: "Datos cifrados y almacenados en caché" });
      clearForm();
    } catch (e: any) { 
      console.error("saveDraft error:", e);
      setBanner({ type: "error", message: e.message || "Error desconocido" }); 
    }
    finally { setSavingDraft(false); }
  };

  const schedulePost = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const err = validateForm();
    if (err) { setBanner({ type: "error", message: err }); return; }
    if (!scheduledAt) { setBanner({ type: "error", message: "Selecciona fecha y hora" }); return; }
    
    const scheduleDateParsed = new Date(scheduledAt);
    const diffMin = (scheduleDateParsed.getTime() - Date.now()) / (1000 * 60);
    if (diffMin < 11) { setBanner({ type: "error", message: "Meta requiere programar con al menos 11 minutos de antelación" }); return; }
    if (diffMin > (75 * 24 * 60)) { setBanner({ type: "error", message: "Meta permite programar hasta un máximo de 75 días" }); return; }
    
    setScheduling(true);
    try {
      const res = await fetch("/api/publisher/posts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload("Scheduled")),
      });
      const createData = await res.json();
      if (!res.ok) { throw new Error(createData.error || "Error al registrar la programación."); }
      const { post } = createData;

      if (format === "post" && post.channels.includes("facebook")) {
        // Trigger native Facebook scheduling immediately
        await fetch("/api/publisher/publish", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: post.id }),
        }).catch(err => console.error("Native FB schedule error:", err));
      }

      const scheduleDate = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(scheduledAt));
      setBanner({ type: "success", message: `Salto orbital programado para el marco: ${scheduleDate}` });
      clearForm();
    } catch (e: any) { 
      console.error("schedulePost error:", e);
      setBanner({ type: "error", message: e.message || "Error desconocido" }); 
    }
    finally { setScheduling(false); }
  };

  const publishNow = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const err = validateForm();
    if (err) { setBanner({ type: "error", message: err }); return; }
    setPublishing(true);
    try {
      // ── Step 1: Save post to DB ──
      const createRes = await fetch("/api/publisher/posts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload("Draft")),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Error creando post");
      const { post } = createData;

      // ── Step 2: Publish via correct endpoint based on format ──
      let pubEndpoint = "/api/publisher/publish";
      let pubBody: any = { postId: post.id };

      if (format === "reel" || format === "story") {
        // For reels/stories, we publish directly per-platform
        pubEndpoint = format === "reel" ? "/api/publisher/reels" : "/api/publisher/stories";
        const igTarget = selectedTargets.find((t) => t.platform === "instagram");
        const fbTarget = selectedTargets.find((t) => t.platform === "facebook");
        const mediaUrl = mediaFiles[0]?.url || "";
        const caption = customizeByPlatform
          ? (igTarget ? igContent : fbContent)
          : fullContent();

        // Publish to each selected platform
        const results: any[] = [];
        for (const target of selectedTargets) {
          const platformCaption = customizeByPlatform
            ? (target.platform === "facebook" ? fbContent : igContent) || fullContent()
            : fullContent();
          const body: any = {
            platform: target.platform,
            caption: platformCaption,
            pageId: target.pageId,
            igUserId: target.igId,
            pageToken: "", // server resolves from session
          };
          if (format === "reel") {
            body.videoUrl = mediaUrl;
            body.shareToFeed = true;
          } else {
            body.mediaUrl = mediaUrl;
            body.mediaType = mediaFiles[0]?.type || "image";
          }
          const res = await fetch(pubEndpoint, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          results.push({ ...data, platform: target.platform });

          // First comment for IG (post/reel only)
          if (
            target.platform === "instagram" &&
            data.success &&
            firstComment.trim() &&
            format !== "story"
          ) {
            const mediaId = data.reelId || data.storyId;
            if (mediaId) {
              await fetch("/api/publisher/first-comment", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mediaId, comment: firstComment }),
              }).catch(() => {}); // non-critical
            }
          }
        }

        const anySuccess = results.some((r) => r.success);
        if (anySuccess) {
          setBanner({ type: "success", message: `¡${format === "reel" ? "Reel" : "Story"} publicado con éxito!` });
          clearForm();
        } else {
          const errs = results.map((r) => r.error).filter(Boolean).join(" | ");
          throw new Error(errs || "Error al publicar");
        }
      } else {
        // Standard post/carousel flow
        const pubRes = await fetch("/api/publisher/publish", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: post.id }),
        });
        const pubData = await pubRes.json();
        if (!pubRes.ok) {
          const detail = pubData.error || "Error al desplegar mensaje en redes.";
          throw new Error(detail);
        }

        // First comment for IG
        if (
          firstComment.trim() &&
          pubData.published?.instagram &&
          format === "post"
        ) {
          await fetch("/api/publisher/first-comment", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mediaId: pubData.published.instagram, comment: firstComment }),
          }).catch(() => {});
        }

        if (pubData.status === "Processing") {
          setBanner({ type: "success", message: "Video en procesamiento — se publicará en segundos en background." });
        } else {
          setBanner({ type: "success", message: "¡Transmisión Ejecutada! La señal está en vivo." });
        }
        clearForm();
      }
    } catch (e: any) { 
      console.error("publishNow error:", e);
      setBanner({ type: "error", message: e.message || "Error desconocido" }); 
    }
    finally { setPublishing(false); }
  };

  const anyLoading = savingDraft || scheduling || publishing;

  /* ── Preview helpers ────────────────────────────────── */
  const previewText = fullContent() || "Iniciando enlace de subespacio... El holomensaje proyectado aparecerá aquí.";
  const previewMedia = mediaFiles.length > 0 ? mediaFiles[0].url : null;

  /* ══════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════ */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>
      {/* ─── TOP: BANNER ─────────────────────────────────── */}
      {banner && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 16px", marginBottom: 8, borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: banner.type === "success" ? "rgba(0,200,117,0.12)" : "rgba(226,68,92,0.12)",
          border: `1px solid ${banner.type === "success" ? "rgba(0,200,117,0.3)" : "rgba(226,68,92,0.3)"}`,
          color: banner.type === "success" ? "#00c875" : "#e2445c",
        }}>
          {banner.type === "success" ? <Terminal style={{ width: 16, height: 16, flexShrink: 0 }} /> : <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} />}
          {banner.message}
        </div>
      )}

      {/* ─── MAIN: TWO-COLUMN LAYOUT ──────────────────────── */}
      <div style={{ display: "flex", flex: 1, gap: 16, minHeight: 0 }}>
        {/* ═══ LEFT COLUMN: EDITOR ═══ */}
        <div className="glass-panel" style={{
          flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
          borderRadius: 12, overflow: "hidden",
        }}>
          {/* ── Publish To bar ──────────────────────────────── */}
          <div style={{
            padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}>SECTOR DE TRANSMISIÓN</span>
              {selectedTargets.length > 0 && (
                <button onClick={clearAllTargets} style={{
                  background: "none", border: "none", color: "#64748b", fontSize: 11,
                  cursor: "pointer", textDecoration: "underline", padding: 0,
                }}>
                  Limpiar cuadrante
                </button>
              )}
            </div>

            {/* Selected chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {selectedTargets.map((target) => {
                const isFb = target.platform === "facebook";
                const bgColor = isFb ? "rgba(24,119,242,0.12)" : "rgba(225,48,108,0.12)";
                const borderColor = isFb ? "rgba(24,119,242,0.4)" : "rgba(225,48,108,0.4)";
                const textColor = isFb ? "#60a5fa" : "#f472b6";
                const Icon = isFb ? Facebook : Instagram;
                const label = isFb ? target.pageName : `@${target.igUsername}`;
                return (
                  <span key={target.key} style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "5px 10px 5px 8px", borderRadius: 20,
                    background: bgColor, border: `1px solid ${borderColor}`,
                    fontSize: 12, fontWeight: 500, color: textColor,
                    transition: "all 0.15s",
                  }}>
                    <Icon style={{ width: 13, height: 13 }} />
                    {label}
                    <button onClick={() => removeTarget(target.key)} style={{
                      background: "none", border: "none", color: textColor,
                      cursor: "pointer", padding: 0, display: "flex", marginLeft: 2,
                    }}>
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </span>
                );
              })}

              {/* Add account button */}
              <div ref={pickerRef} style={{ position: "relative" }}>
                <button onClick={() => setShowAccountPicker(!showAccountPicker)} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 20,
                  background: "rgba(255,255,255,0.09)", border: "1px dashed rgba(255,255,255,0.15)",
                  color: "#94a3b8", fontSize: 12, cursor: "pointer",
                  transition: "all 0.15s",
                }}>
                  {pagesLoading ? (
                    <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                  ) : (
                    <Plus style={{ width: 13, height: 13 }} />
                  )}
                  {selectedTargets.length === 0 ? "Asignar canales" : "Agregar"}
                  <ChevronDown style={{ width: 12, height: 12 }} />
                </button>

                {/* Account picker dropdown */}
                {showAccountPicker && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 320,
                    maxHeight: 420,
                    background: "#0c1222", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12, overflow: "hidden", zIndex: 100,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                    display: "flex", flexDirection: "column",
                  }}>
                    {/* Header */}
                    <div style={{
                      padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>Seleccionar cuentas</span>
                      <button onClick={selectedTargets.length === allTargets.length ? clearAllTargets : selectAllTargets} style={{
                        background: "none", border: "none", color: "#00d4ff",
                        fontSize: 11, cursor: "pointer", padding: 0,
                      }}>
                        {selectedTargets.length === allTargets.length ? "Despejar canales" : "Elegir todo el cuadrante"}
                      </button>
                    </div>

                    {/* Scrollable account list */}
                    <div style={{ flex: 1, overflowY: "auto", maxHeight: 300 }}>
                    {/* Facebook section */}
                    {allTargets.filter((t) => t.platform === "facebook").length > 0 && (
                      <>
                        <div style={{
                          padding: "8px 16px", fontSize: 10, fontWeight: 700,
                          color: "#475569", textTransform: "uppercase", letterSpacing: 1,
                          background: "rgba(255,255,255,0.04)",
                          position: "sticky", top: 0, zIndex: 1,
                        }}>
                          <Facebook style={{ width: 11, height: 11, display: "inline", verticalAlign: "middle", marginRight: 6, color: "#1877f2" }} />
                          Facebook Pages
                        </div>
                        {allTargets.filter((t) => t.platform === "facebook").map((target) => {
                          const isSelected = selectedTargets.some((t) => t.key === target.key);
                          return (
                            <button key={target.key} onClick={() => toggleTarget(target)} style={{
                              display: "flex", alignItems: "center", gap: 10, width: "100%",
                              padding: "10px 16px", background: isSelected ? "rgba(24,119,242,0.08)" : "transparent",
                              border: "none", borderBottom: "1px solid rgba(255,255,255,0.03)",
                              color: "#e2e8f0", fontSize: 13, cursor: "pointer", textAlign: "left",
                              transition: "background 0.15s",
                            }}>
                              <img src={target.pagePicture} alt="" style={{
                                width: 32, height: 32, borderRadius: "50%", objectFit: "cover",
                                border: isSelected ? "2px solid #1877f2" : "2px solid transparent",
                              }} />
                              <span style={{ flex: 1, fontWeight: 500 }}>{target.pageName}</span>
                              <div style={{
                                width: 20, height: 20, borderRadius: 4,
                                border: isSelected ? "none" : "1.5px solid rgba(255,255,255,0.65)",
                                background: isSelected ? "#1877f2" : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "all 0.15s",
                              }}>
                                {isSelected && <Check style={{ width: 13, height: 13, color: "#fff" }} />}
                              </div>
                            </button>
                          );
                        })}
                      </>
                    )}

                    {/* Instagram section */}
                    {allTargets.filter((t) => t.platform === "instagram").length > 0 && (
                      <>
                        <div style={{
                          padding: "8px 16px", fontSize: 10, fontWeight: 700,
                          color: "#475569", textTransform: "uppercase", letterSpacing: 1,
                          background: "rgba(255,255,255,0.04)",
                          position: "sticky", top: 0, zIndex: 1,
                        }}>
                          <Instagram style={{ width: 11, height: 11, display: "inline", verticalAlign: "middle", marginRight: 6, color: "#E1306C" }} />
                          Instagram Accounts
                        </div>
                        {allTargets.filter((t) => t.platform === "instagram").map((target) => {
                          const isSelected = selectedTargets.some((t) => t.key === target.key);
                          return (
                            <button key={target.key} onClick={() => toggleTarget(target)} style={{
                              display: "flex", alignItems: "center", gap: 10, width: "100%",
                              padding: "10px 16px", background: isSelected ? "rgba(225,48,108,0.08)" : "transparent",
                              border: "none", borderBottom: "1px solid rgba(255,255,255,0.03)",
                              color: "#e2e8f0", fontSize: 13, cursor: "pointer", textAlign: "left",
                              transition: "background 0.15s",
                            }}>
                              <img src={target.igPicture || target.pagePicture} alt="" style={{
                                width: 32, height: 32, borderRadius: "50%", objectFit: "cover",
                                border: isSelected ? "2px solid #E1306C" : "2px solid transparent",
                              }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500 }}>@{target.igUsername}</div>
                                <div style={{ fontSize: 11, color: "#64748b" }}>{target.pageName}</div>
                              </div>
                              <div style={{
                                width: 20, height: 20, borderRadius: 4,
                                border: isSelected ? "none" : "1.5px solid rgba(255,255,255,0.65)",
                                background: isSelected ? "#E1306C" : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "all 0.15s",
                              }}>
                                {isSelected && <Check style={{ width: 13, height: 13, color: "#fff" }} />}
                              </div>
                            </button>
                          );
                        })}
                      </>
                    )}

                    {allTargets.length === 0 && !pagesLoading && (
                      <div style={{ padding: "32px 16px" }}>
                        <EmptyState 
                          icon={<AlertTriangle style={{ width: 32, height: 32, color: "#e2445c" }} />}
                          title="SIN CONEXIÓN DE COMUNICACIONES"
                          description="No hay satélites enlazados al servidor maestro. Dirígete a la sección de Integraciones para restaurar el flujo."
                        />
                      </div>
                    )}
                    </div>

                    {/* Done button */}
                    <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <button onClick={() => setShowAccountPicker(false)} style={{
                        width: "100%", padding: "8px 0", borderRadius: 8,
                        background: "linear-gradient(135deg, #00b4d8, #0077b6)", border: "none",
                        color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}>
                        Aprobar Selección ({selectedTargets.length})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Format Selector (Post / Reel / Story / Carousel) ── */}
          <div style={{
            padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
          }}>
            <FormatSelector value={format} onChange={setFormat} />
          </div>

          {/* ── Text area with toolbar ──────────────────────── */}
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              background: isDragging ? "rgba(0,212,255,0.04)" : "transparent",
              transition: "all 0.2s", minHeight: 200,
            }}
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Introduce la orden imperial aquí. Será desplegada a los sectores seleccionados."
              style={{
                flex: 1, width: "100%", background: "transparent",
                border: "none", outline: "none", resize: "none",
                padding: "16px 20px", color: "#e2e8f0", fontSize: 14,
                lineHeight: 1.6, fontFamily: "Inter, sans-serif",
                minHeight: 160,
              }}
            />

            {/* Hashtag pills */}
            {hashtags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 20px 10px" }}>
                {hashtags.map((tag) => (
                  <span key={tag} style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "3px 10px", borderRadius: 20,
                    background: "rgba(123,97,255,0.15)", border: "1px solid rgba(123,97,255,0.3)",
                    color: "#a78bfa", fontSize: 12, fontWeight: 500,
                  }}>
                    #{tag}
                    <button onClick={() => removeHashtag(tag)} style={{
                      background: "none", border: "none", color: "#a78bfa",
                      cursor: "pointer", padding: 0, display: "flex",
                    }}>
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Media thumbnails */}
            {mediaFiles.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0 20px 12px" }}>
                {mediaFiles.map((media, i) => (
                  <div key={i} style={{
                    position: "relative", width: 72, height: 72, borderRadius: 10,
                    overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0,
                  }}>
                    {media.type === "video" ? (
                      <video src={media.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                    ) : (
                      <img src={media.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                    <button onClick={() => removeMedia(i)} style={{
                      position: "absolute", top: 3, right: 3, width: 20, height: 20,
                      borderRadius: "50%", background: "rgba(0,0,0,0.75)", border: "none",
                      color: "#fff", cursor: "pointer", display: "flex",
                      alignItems: "center", justifyContent: "center", padding: 0,
                    }}>
                      <X style={{ width: 11, height: 11 }} />
                    </button>
                  </div>
                ))}
                {uploading && (
                  <div style={{
                    width: 72, height: 72, borderRadius: 10,
                    border: "1px dashed rgba(255,255,255,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Loader2 style={{ width: 20, height: 20, color: "#00d4ff", animation: "spin 1s linear infinite" }} />
                  </div>
                )}
              </div>
            )}

            {/* Drag overlay */}
            {isDragging && (
              <div style={{
                padding: "24px 20px", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 8, color: "#00d4ff",
              }}>
                <Upload style={{ width: 32, height: 32 }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>Sube evidencia clasificada</span>
              </div>
            )}

            {/* Bottom toolbar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)", flexWrap: "wrap", gap: 8,
            }}>
              {/* Left: media + hashtag */}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input ref={fileInputRef} type="file" multiple accept="image/*,video/*"
                  style={{ display: "none" }}
                  onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }}
                />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  title="Subir imagen o video"
                  style={{
                    padding: "6px 10px", borderRadius: 6,
                    background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "#94a3b8", cursor: uploading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 4, fontSize: 12,
                    transition: "all 0.15s",
                  }}>
                  {uploading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                    : <ImageIcon style={{ width: 16, height: 16 }} />}
                  <span>Carga visual</span>
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Hash style={{ width: 14, height: 14, color: "#64748b" }} />
                  <input type="text" value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={handleHashtagKeyDown}
                    placeholder="hashtag"
                    style={{
                      width: 100, background: "transparent", border: "none", outline: "none",
                      color: "#a78bfa", fontSize: 12, fontFamily: "Inter, sans-serif",
                    }}
                  />
                  {hashtagInput.trim() && (
                    <button onClick={addHashtag} style={{
                      background: "none", border: "none", color: "#7b61ff",
                      cursor: "pointer", padding: 0, display: "flex",
                    }}>
                      <Plus style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>
              </div>

              {/* Right: char count */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontSize: 11, fontWeight: 500,
                  color: isOverLimit ? "#e2445c" : isNearLimit ? "#fdab3d" : "#64748b",
                }}>
                  {charCount.toLocaleString()} / {charLimit.toLocaleString()}
                </span>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{
                    width: `${charPercent}%`, height: "100%", borderRadius: 2,
                    background: isOverLimit ? "#e2445c" : isNearLimit ? "#fdab3d" : "#00d4ff",
                    transition: "all 0.3s",
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Per-platform text tabs ── */}
          {selectedTargets.some(t => t.platform === "facebook") && selectedTargets.some(t => t.platform === "instagram") && format !== "story" && (
            <PlatformContentTabs
              enabled={customizeByPlatform}
              onToggle={setCustomizeByPlatform}
              activePlatform={activePlatformTab}
              onPlatformChange={setActivePlatformTab}
              fbContent={fbContent}
              onFbContentChange={setFbContent}
              igContent={igContent}
              onIgContentChange={setIgContent}
              generalContent={content}
            />
          )}

          {/* ── First Comment Expander (IG only, post/reel only) ── */}
          <FirstCommentExpander
            value={firstComment}
            onChange={setFirstComment}
            visible={hasIg && (format === "post" || format === "reel")}
          />

          {/* ── Schedule + Action bar ───────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.025)", flexWrap: "wrap", gap: 10,
          }}>
            {/* Left: schedule */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock style={{ width: 15, height: 15, color: "#64748b" }} />
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}>RETRASO ORBITAL:</span>
              <input type="datetime-local" value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                style={{
                  maxWidth: 200, padding: "6px 10px", borderRadius: 6,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#e2e8f0", fontSize: 12, fontFamily: "Inter, sans-serif",
                  outline: "none", colorScheme: "dark",
                }}
              />
              {scheduledAt && (
                <button onClick={() => setScheduledAt("")} style={{
                  background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 2, display: "flex",
                }}>
                  <X style={{ width: 13, height: 13 }} />
                </button>
              )}
            </div>

            {/* Right: actions */}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveDraft} disabled={anyLoading} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                borderRadius: 8, background: "rgba(255,255,255,0.09)",
                border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1",
                fontSize: 12, fontWeight: 500,
                cursor: anyLoading ? "not-allowed" : "pointer", opacity: anyLoading ? 0.5 : 1,
                transition: "all 0.2s",
              }}>
                {savingDraft ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Save style={{ width: 14, height: 14 }} />}
                Cifrar Borrador
              </button>

              <button onClick={schedulePost} disabled={anyLoading} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                borderRadius: 8,
                background: scheduledAt ? "rgba(253,171,61,0.12)" : "rgba(255,255,255,0.09)",
                border: scheduledAt ? "1px solid rgba(253,171,61,0.3)" : "1px solid rgba(255,255,255,0.1)",
                color: scheduledAt ? "#fdab3d" : "#64748b",
                fontSize: 12, fontWeight: 500,
                cursor: anyLoading ? "not-allowed" : "pointer", opacity: anyLoading ? 0.5 : 1,
                transition: "all 0.2s",
              }}>
                {scheduling ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Clock style={{ width: 14, height: 14 }} />}
                Agendar Salto
              </button>

              <button onClick={publishNow} disabled={anyLoading} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 20px",
                borderRadius: 8, background: "linear-gradient(135deg, #00b4d8, #0077b6)",
                border: "none", color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: anyLoading ? "not-allowed" : "pointer", opacity: anyLoading ? 0.6 : 1,
                boxShadow: "0 4px 16px rgba(0,180,216,0.2)", transition: "all 0.2s",
              }}>
                {publishing ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 14, height: 14 }} />}
                EJECUTAR TRANSMISIÓN
              </button>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT COLUMN: LIVE PREVIEW ═══ */}
        <div className="glass-panel" style={{
          width: 420, minWidth: 340, display: "flex", flexDirection: "column",
          borderRadius: 12, overflow: "hidden", flexShrink: 0,
        }}>
          {/* ── Connection Status Panel ─────────────────────────── */}
          {socialConnected === true ? (
            <div style={{
              padding: "12px 16px",
              borderBottom: "1px solid rgba(0,200,117,0.15)",
              background: "rgba(0,200,117,0.04)",
            }}>
              {/* Facebook connected */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: socialInstagramAccounts.length > 0 ? 6 : 0 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: "#00c875", boxShadow: "0 0 6px #00c87560", flexShrink: 0,
                }} />
                <svg viewBox="0 0 24 24" width="13" height="13" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#00c875", flex: 1 }}>
                  Facebook conectado
                </span>
                {socialPages.length > 0 && (
                  <span style={{ fontSize: 10, color: "#64748b" }}>
                    {socialPages[0].name}{socialPages.length > 1 ? ` +${socialPages.length - 1}` : ""}
                  </span>
                )}
                <button
                  onClick={() => openConnectPopup("publisher_facebook", loadSocialStatus)}
                  style={{
                    background: "none", border: "1px solid rgba(148,163,184,0.22)", borderRadius: 4,
                    color: "#64748b", fontSize: 9, padding: "2px 7px", cursor: "pointer",
                  }}
                >
                  Reconectar
                </button>
              </div>
              {/* Instagram status */}
              {socialInstagramAccounts.length > 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 15 }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: "#00c875", boxShadow: "0 0 6px #00c87560", flexShrink: 0,
                  }} />
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="#E1306C"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", flex: 1 }}>
                    Instagram conectado
                  </span>
                  <span style={{ fontSize: 10, color: "#64748b" }}>
                    {socialInstagramAccounts.length} cuenta{socialInstagramAccounts.length > 1 ? "s" : ""}
                  </span>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 15 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#64748b", flexShrink: 0 }} />
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="#64748b"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  <span style={{ fontSize: 11, color: "#475569", flex: 1 }}>Sin Instagram Business</span>
                </div>
              )}
            </div>
          ) : socialConnected === false ? (
            /* Not connected banner */
            <div style={{
              padding: "12px 16px",
              borderBottom: "1px solid rgba(251,191,36,0.2)",
              background: "rgba(251,191,36,0.05)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <AlertCircle style={{ width: 16, height: 16, color: "#fbbf24", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#fbbf24", margin: 0 }}>
                  Facebook no conectado
                </p>
                <p style={{ fontSize: 10, color: "#64748b", margin: 0 }}>
                  Conecta para publicar en Facebook e Instagram
                </p>
              </div>
              <button
                onClick={() => openConnectPopup("publisher_facebook", loadSocialStatus)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 7, flexShrink: 0,
                  background: "linear-gradient(135deg, #1877f2, #0d5bbc)",
                  border: "none", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(24,119,242,0.3)",
                }}
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Conectar Facebook
              </button>
            </div>
          ) : null /* null = loading, show nothing */}
          {/* Preview header */}
          <div style={{
            padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Smartphone style={{ width: 15, height: 15, color: "#64748b" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1.5, textTransform: "uppercase" }}>
              HOLOGRAMA DE SIMULACIÓN
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, color: "#00d4ff",
              background: "rgba(0,212,255,0.1)", padding: "2px 8px", borderRadius: 10,
              border: "1px solid rgba(0,212,255,0.2)", textTransform: "uppercase", letterSpacing: 0.5,
            }}>
              {format}
            </span>
            <span style={{
              marginLeft: "auto", fontSize: 11, color: "#475569",
              background: "rgba(255,255,255,0.09)", padding: "3px 8px", borderRadius: 4,
            }}>
              {selectedTargets.length} {selectedTargets.length === 1 ? "cuenta" : "cuentas"}
            </span>
          </div>

          {/* Preview cards — one per selected target */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            {selectedTargets.length === 0 && (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", flex: 1, padding: 40, gap: 12,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: "rgba(255,255,255,0.09)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Globe style={{ width: 22, height: 22, color: "#334155" }} />
                </div>
                <EmptyState 
                  icon={<Globe style={{ width: 48, height: 48, color: "#64748b" }} />}
                  title="SIN HOLOGRAMA"
                  description="Enlaza una frecuencia objetivo para visualizar la proyección antes de ordenar el lanzamiento."
                />
                <a
                  href="/api/publisher/diagnose"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginTop: 8, fontSize: 11, color: "#475569",
                    textDecoration: "underline", cursor: "pointer",
                  }}
                >
                  Diagnóstico de conexión →
                </a>
              </div>
            )}

            {/* Preview cards — one per selected target, format-aware */}
            {selectedTargets.map((target) => {
              const isFb = target.platform === "facebook";
              const platformContent = customizeByPlatform
                ? (isFb ? fbContent : igContent) || previewText
                : previewText;
              return (
                <PostPreview
                  key={target.key}
                  format={format}
                  platform={target.platform}
                  content={platformContent}
                  mediaUrls={mediaFiles.map(m => m.url)}
                  mediaTypes={mediaFiles.map(m => m.type)}
                  pageName={target.pageName}
                  pageAvatar={target.pagePicture}
                  igUsername={target.igUsername}
                  igAvatar={target.igPicture}
                  firstComment={target.platform === "instagram" && firstComment.trim() ? firstComment : undefined}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
