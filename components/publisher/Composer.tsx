/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, react-hooks/purity */
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
import { PostPreview, platformLabel, platformColors, Facebook, Instagram } from "./PostPreview";
import DeviceEmulator, { DeviceType } from "@/components/ui/DeviceEmulator";

/* ── Social Icons (imported from PostPreview) ───────────── */

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
function ComposerConnectDropdown({
  onConnectFacebook,
  onConnectInstagram,
}: {
  onConnectFacebook: () => void;
  onConnectInstagram: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block", marginTop: 16 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          borderRadius: 20,
          background: "var(--fc-accent)",
          color: "var(--fc-bg)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          border: "none",
          fontFamily: "inherit",
          transition: "all 0.2s ease-in-out",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.15)")}
        onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
      >
        <Plus style={{ width: 14, height: 14 }} />
        <span>Conectar más</span>
        <ChevronDown style={{ width: 12, height: 12, opacity: 0.7, transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 260,
            background: "var(--panel-bg)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--glass-border)",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            padding: "8px 0",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "6px 14px 4px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--fc-text-muted)", letterSpacing: "0.05em" }}>
            Selecciona plataforma
          </div>
          <button
            onClick={() => { onConnectFacebook(); setIsOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", color: "var(--fc-text)", fontFamily: "inherit", fontSize: 13, textAlign: "left", transition: "background 0.2s", width: "100%" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Facebook style={{ width: 20, height: 20 }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 600 }}>Facebook</span>
              <span style={{ fontSize: 10, color: "var(--fc-text-muted)" }}>Gestiona tus páginas</span>
            </div>
          </button>
          <button
            onClick={() => { onConnectInstagram(); setIsOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", color: "var(--fc-text)", fontFamily: "inherit", fontSize: 13, textAlign: "left", transition: "background 0.2s", width: "100%" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Instagram style={{ width: 20, height: 20 }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 600 }}>Instagram</span>
              <span style={{ fontSize: 10, color: "var(--fc-text-muted)" }}>Conecta tus cuentas</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

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
  const [deviceView, setDeviceView] = useState<DeviceType>("ios");
  const [fbContent, setFbContent] = useState("");
  const [igContent, setIgContent] = useState("");
  const [activePlatformTab, setActivePlatformTab] = useState<"facebook" | "instagram">("facebook");
  const [firstComment, setFirstComment] = useState("");

  // Pages
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [allTargets, setAllTargets] = useState<PublishTarget[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [requestingApproval, setRequestingApproval] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  // Asset Groups
  const [assetGroups, setAssetGroups] = useState<any[]>([]);
  const loadAssetGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/asset-groups");
      if (res.ok) {
        const data = await res.json();
        setAssetGroups(data.data || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadAssetGroups();
  }, [loadAssetGroups]);

  const selectAssetGroup = (group: any) => {
    if (!group.assets || !Array.isArray(group.assets)) return;
    const newTargets = allTargets.filter(t => 
      group.assets.some((a: any) => 
        a.provider === t.platform && a.externalId === (t.platform === "facebook" ? t.pageId : t.igId)
      )
    );
    setSelectedTargets(newTargets);
    setShowAccountPicker(false);
  };

  // Social connection status
    const [socialConnected, setSocialConnected] = useState<boolean | null>(null);
    const [socialPages, setSocialPages] = useState<any[]>([]);
      const [socialInstagramAccounts, setSocialInstagramAccounts] = useState<any[]>([]);
  // Cuentas de Instagram del activo UNIFICADO (mismo que el Inbox). Vienen de
  // /api/connect/status → modules.publisher_instagram.instagramAccounts, así que
  // aparecen aquí aunque la conexión se haya hecho desde el Inbox.
  const [igAccounts, setIgAccounts] = useState<any[]>([]);

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
    const seenIg = new Set<string>();
    for (const page of pages) {
      targets.push({
        key: `fb_${page.id}`,
        platform: "facebook",
        pageId: page.id,
        pageName: page.name,
        pagePicture: page.picture,
      });
      if (page.instagram) {
        seenIg.add(page.instagram.id);
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

    // Instagram conectado con "Iniciar sesión con Instagram" (aquí o en el Inbox):
    // no depende de ninguna página de Facebook.
    for (const acc of igAccounts) {
      if (!acc?.id || seenIg.has(acc.id)) continue;
      // El cliente puede haber apagado las publicaciones de esta cuenta: no se
      // ofrece como destino. El servidor lo vuelve a comprobar al publicar.
      if (acc.capabilities?.publish === false) continue;
      seenIg.add(acc.id);
      targets.push({
        key: `ig_${acc.id}`,
        platform: "instagram",
        pageId: acc.pageId || "",
        pageName: acc.name || acc.username || "Instagram",
        pagePicture: acc.picture || "",
        igId: acc.id,
        igUsername: acc.username || undefined,
        igPicture: acc.picture || undefined,
      });
    }

    setAllTargets(targets);
  }, [pages, igAccounts]);

  /* ── Load pages on mount and on connection ──────────── */
  const loadPages = useCallback(async () => {
    setPagesLoading(true);
    try {
      const res = await fetch("/api/meta/pages?module=publisher_facebook");
      const data = await res.json();
      const list: MetaPage[] = data.data || [];
      setPages(list);
    } catch {
      /* silent */
    } finally {
      setPagesLoading(false);
    }
  }, []);

  useEffect(() => {
   
        loadPages();
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "OAUTH_SUCCESS" || e.data?.type === "INTEGRATION_UPDATED") {
        loadPages();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [loadPages]);

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
        // Activo unificado de Instagram (compartido con el Inbox).
        setIgAccounts(data.modules?.publisher_instagram?.instagramAccounts || []);
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
    // Multi-cuenta: el post recuerda a qué cuenta de Instagram va.
    const firstIgTarget = selectedTargets.find((t) => t.platform === "instagram");
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
      igUserId: firstIgTarget?.igId || undefined,
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

  const requestApproval = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const err = validateForm();
    if (err) { setBanner({ type: "error", message: err }); return; }
    setRequestingApproval(true);
    try {
      const status = scheduledAt ? "Scheduled" : "Draft";
      const res = await fetch("/api/publisher/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...buildPayload(status), approvalStatus: "pending" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo solicitar aprobación");
      setBanner({ type: "success", message: "Pieza enviada a la cola de aprobación del cliente." });
      clearForm();
    } catch (reason) {
      setBanner({ type: "error", message: reason instanceof Error ? reason.message : "No se pudo solicitar aprobación" });
    } finally { setRequestingApproval(false); }
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
      const post = createData.data?.post;
      if (!post) throw new Error("Error al registrar la programacion.");

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
      const post = createData.data?.post;
      if (!post) throw new Error("Error creando post");

      // ── Step 2: Publish via correct endpoint based on format ──
      let pubEndpoint = "/api/publisher/publish";
            const pubBody: any = { postId: post.id };

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
            // El token de página lo resuelve el servidor (nunca desde el cliente).
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
          const raw = await res.json();
          // Las rutas responden con envelope { success, data: { reelId/storyId } };
          // desempaquetar para leer reelId/storyId (antes quedaba undefined y el
          // primer comentario nunca se posteaba).
          const data = raw?.data ?? raw;
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
                body: JSON.stringify({ mediaId, comment: firstComment, igUserId: target.igId }),
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
        const publishPayload = pubData.data || pubData;

        // First comment for IG
        if (
          firstComment.trim() &&
          publishPayload.published?.instagram &&
          format === "post"
        ) {
          await fetch("/api/publisher/first-comment", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mediaId: publishPayload.published.instagram,
              comment: firstComment,
              igUserId: selectedTargets.find((t) => t.platform === "instagram")?.igId,
            }),
          }).catch(() => {});
        }

        if (publishPayload.status === "Processing") {
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

  const anyLoading = savingDraft || scheduling || publishing || requestingApproval;

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
          color: banner.type === "success" ? "var(--fc-success)" : "var(--fc-danger)",
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
          borderRadius: 12, overflowY: "auto",
        }}>
          {/* ── Publish To bar ──────────────────────────────── */}
          <div style={{
            padding: "14px 20px", borderBottom: "1px solid var(--hairline)",
            background: "var(--row-hover)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fc-text-secondary)", fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}>CANALES DE PUBLICACIÓN</span>
              {selectedTargets.length > 0 && (
                <button onClick={clearAllTargets} style={{
                  background: "none", border: "none", color: "var(--fc-text-muted)", fontSize: 11,
                  cursor: "pointer", textDecoration: "underline", padding: 0,
                }}>
                  Limpiar selección
                </button>
              )}
            </div>

            {/* Selected chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {selectedTargets.map((target) => {
                const isFb = target.platform === "facebook";
                const bgColor = isFb ? "rgba(24,119,242,0.12)" : "rgba(225,48,108,0.12)";
                const borderColor = isFb ? "rgba(24,119,242,0.4)" : "rgba(225,48,108,0.4)";
                const textColor = isFb ? "var(--fc-accent)" : "#bc5fb2";
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
                  background: "var(--surface-hover)", border: "1px dashed var(--fc-border)",
                  color: "var(--fc-text-secondary)", fontSize: 12, cursor: "pointer",
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
                    background: "var(--fc-bg)", border: "1px solid var(--hairline)",
                    borderRadius: 12, overflow: "hidden", zIndex: 100,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                    display: "flex", flexDirection: "column",
                  }}>
                    {/* Header */}
                    <div style={{
                      padding: "12px 16px", border: "1px solid var(--hairline)",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fc-text)" }}>Seleccionar cuentas</span>
                      <button onClick={selectedTargets.length === allTargets.length ? clearAllTargets : selectAllTargets} style={{
                        background: "none", border: "none", color: "var(--fc-accent)",
                        fontSize: 11, cursor: "pointer", padding: 0,
                      }}>
                        {selectedTargets.length === allTargets.length ? "Despejar canales" : "Elegir todo el cuadrante"}
                      </button>
                    </div>

                    {/* Scrollable account list */}
                    <div style={{ flex: 1, overflowY: "auto", maxHeight: 300 }}>
                    {/* Asset Groups section */}
                    {assetGroups.length > 0 && (
                      <>
                        <div style={{
                          padding: "8px 16px", fontSize: 10, fontWeight: 700,
                          color: "var(--fc-text-secondary)", textTransform: "uppercase", letterSpacing: 1,
                          background: "var(--surface-hover)",
                          position: "sticky", top: 0, zIndex: 1,
                        }}>
                          Grupos de Activos
                        </div>
                        {assetGroups.map((group) => (
                          <button key={group.id} onClick={() => selectAssetGroup(group)} style={{
                            display: "flex", alignItems: "center", gap: 10, width: "100%",
                            padding: "10px 16px", background: "transparent",
                            border: "1px solid var(--hairline)",
                            color: "var(--fc-accent)", fontSize: 13, cursor: "pointer", textAlign: "left",
                            transition: "background 0.15s",
                            fontWeight: 600
                          }}>
                            <span style={{ flex: 1 }}>{group.name}</span>
                          </button>
                        ))}
                      </>
                    )}

                    {/* Facebook section */}
                    {allTargets.filter((t) => t.platform === "facebook").length > 0 && (
                      <>
                        <div style={{
                          padding: "8px 16px", fontSize: 10, fontWeight: 700,
                          color: "var(--fc-text-secondary)", textTransform: "uppercase", letterSpacing: 1,
                          background: "var(--surface-hover)",
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
                              border: "1px solid var(--hairline)",
                              color: "var(--fc-text)", fontSize: 13, cursor: "pointer", textAlign: "left",
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
                                {isSelected && <Check style={{ width: 13, height: 13, color: "var(--fc-text)" }} />}
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
                          color: "var(--fc-text-secondary)", textTransform: "uppercase", letterSpacing: 1,
                          background: "var(--surface-hover)",
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
                              border: "1px solid var(--hairline)",
                              color: "var(--fc-text)", fontSize: 13, cursor: "pointer", textAlign: "left",
                              transition: "background 0.15s",
                            }}>
                                                            <img
                                src={
                                  target.igPicture ||
                                  target.pagePicture ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(target.igUsername || target.pageName || "IG")}&background=random`
                                }
                                alt=""
                                style={{
                                width: 32, height: 32, borderRadius: "50%", objectFit: "cover",
                                border: isSelected ? "2px solid #E1306C" : "2px solid transparent",
                              }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500 }}>{target.igUsername ? `@${target.igUsername}` : target.pageName}</div>
                                <div style={{ fontSize: 11, color: "var(--fc-text-muted)" }}>
                                  {target.pageId ? target.pageName : "Instagram Business"}
                                </div>
                              </div>
                              <div style={{
                                width: 20, height: 20, borderRadius: 4,
                                border: isSelected ? "none" : "1.5px solid rgba(255,255,255,0.65)",
                                background: isSelected ? "#E1306C" : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "all 0.15s",
                              }}>
                                {isSelected && <Check style={{ width: 13, height: 13, color: "var(--fc-text)" }} />}
                              </div>
                            </button>
                          );
                        })}
                      </>
                    )}

                    {allTargets.length === 0 && !pagesLoading && (
                      <div style={{ padding: "32px 16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <EmptyState 
                          icon={<AlertTriangle style={{ width: 32, height: 32, color: "var(--fc-warning)" }} />}
                          title="SIN CONEXIÓN DE COMUNICACIONES"
                          description="No hay cuentas enlazadas para publicar. Conecta tu perfil para otorgar acceso a las páginas."
                        />
                        <ComposerConnectDropdown 
                          onConnectFacebook={() => openConnectPopup("publisher_facebook", loadPages)}
                          onConnectInstagram={() => openConnectPopup("publisher_instagram", loadPages)}
                        />
                      </div>
                    )}

                    {/* Botón extra al final de la lista si hay cuentas */}
                    {allTargets.length > 0 && !pagesLoading && (
                      <div style={{ padding: "16px", display: "flex", justifyContent: "center", borderTop: "1px solid var(--hairline)" }}>
                        <ComposerConnectDropdown 
                          onConnectFacebook={() => openConnectPopup("publisher_facebook", loadPages)}
                          onConnectInstagram={() => openConnectPopup("publisher_instagram", loadPages)}
                        />
                      </div>
                    )}
                    </div>

                    {/* Done button */}
                    <div style={{ padding: "10px 16px", border: "1px solid var(--hairline)" }}>
                      <button onClick={() => setShowAccountPicker(false)} style={{
                        width: "100%", padding: "8px 0", borderRadius: 8,
                        background: "linear-gradient(135deg, var(--fc-accent), var(--fc-accent))", border: "none",
                        color: "var(--fc-text)", fontSize: 13, fontWeight: 600, cursor: "pointer",
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
            padding: "10px 20px", border: "1px solid var(--hairline)",
            background: "var(--fc-surface)",
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
              background: isDragging ? "rgba(59,130,246,0.04)" : "transparent",
              transition: "all 0.2s", minHeight: 200,
            }}
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe el contenido de tu publicación aquí..."
              style={{
                flex: 1, width: "100%", background: "transparent",
                border: "none", outline: "none", resize: "none",
                padding: "16px 20px", color: "var(--fc-text)", fontSize: 14,
                lineHeight: 1.6, fontFamily: "var(--font-sans)",
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
                    background: "var(--fc-surface)", border: "1px solid rgba(139,141,242,0.3)",
                    color: "var(--fc-module-aria)", fontSize: 12, fontWeight: 500,
                  }}>
                    #{tag}
                    <button onClick={() => removeHashtag(tag)} style={{
                      background: "none", border: "none", color: "var(--fc-module-aria)",
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
                    overflow: "hidden", border: "1px solid var(--hairline)", flexShrink: 0,
                  }}>
                    {media.type === "video" ? (
                      <video src={media.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                    ) : (
                                            <img src={media.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                    <button onClick={() => removeMedia(i)} style={{
                      position: "absolute", top: 3, right: 3, width: 20, height: 20,
                      borderRadius: "50%", background: "var(--panel-bg)", border: "none",
                      color: "var(--fc-text)", cursor: "pointer", display: "flex",
                      alignItems: "center", justifyContent: "center", padding: 0,
                    }}>
                      <X style={{ width: 11, height: 11 }} />
                    </button>
                  </div>
                ))}
                {uploading && (
                  <div style={{
                    width: 72, height: 72, borderRadius: 10,
                    border: "1px dashed var(--fc-border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Loader2 style={{ width: 20, height: 20, color: "var(--fc-accent)", animation: "spin 1s linear infinite" }} />
                  </div>
                )}
              </div>
            )}

            {/* Drag overlay */}
            {isDragging && (
              <div style={{
                padding: "24px 20px", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 8, color: "var(--fc-accent)",
              }}>
                <Upload style={{ width: 32, height: 32 }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>Sube imagen o video</span>
              </div>
            )}

            {/* Bottom toolbar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 20px", borderTop: "1px solid var(--hairline)",
              background: "var(--row-hover)", flexWrap: "wrap", gap: 8,
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
                    background: "var(--surface-hover)", border: "1px solid var(--hairline)",
                    color: "var(--fc-text-secondary)", cursor: uploading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 4, fontSize: 12,
                    transition: "all 0.15s",
                  }}>
                  {uploading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                    : <ImageIcon style={{ width: 16, height: 16 }} />}
                  <span>Carga visual</span>
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Hash style={{ width: 14, height: 14, color: "var(--fc-text-muted)" }} />
                  <input type="text" value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={handleHashtagKeyDown}
                    placeholder="hashtag"
                    style={{
                      width: 100, background: "transparent", border: "none", outline: "none",
                      color: "var(--fc-module-aria)", fontSize: 12, fontFamily: "var(--font-sans)",
                    }}
                  />
                  {hashtagInput.trim() && (
                    <button onClick={addHashtag} style={{
                      background: "none", border: "none", color: "var(--fc-module-aria)",
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
                  color: isOverLimit ? "var(--fc-danger)" : isNearLimit ? "var(--fc-warning)" : "var(--fc-text-muted)",
                }}>
                  {charCount.toLocaleString()} / {charLimit.toLocaleString()}
                </span>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--surface-hover)", overflow: "hidden" }}>
                  <div style={{
                    width: `${charPercent}%`, height: "100%", borderRadius: 2,
                    background: isOverLimit ? "var(--fc-danger)" : isNearLimit ? "var(--fc-warning)" : "var(--fc-accent)",
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
            padding: "12px 20px", border: "1px solid var(--hairline)",
            background: "var(--surface-hover)", flexWrap: "wrap", gap: 10,
          }}>
            {/* Left: schedule */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock style={{ width: 15, height: 15, color: "var(--fc-text-muted)" }} />
              <span style={{ fontSize: 12, color: "var(--fc-text-secondary)", fontWeight: 500, fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}>PROGRAMAR:</span>
              <input type="datetime-local" value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                // min en hora LOCAL (el input datetime-local es local). Con toISOString()
                // (UTC) en zonas UTC-negativas se bloqueaban las próximas horas válidas.
                                min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                style={{
                  maxWidth: 200, padding: "6px 10px", borderRadius: 6,
                  background: "var(--row-hover)", border: "1px solid var(--hairline)",
                  color: "var(--fc-text)", fontSize: 12, fontFamily: "var(--font-sans)",
                  outline: "none", colorScheme: "dark",
                }}
              />
              {scheduledAt && (
                <button onClick={() => setScheduledAt("")} style={{
                  background: "none", border: "none", color: "var(--fc-text-muted)", cursor: "pointer", padding: 2, display: "flex",
                }}>
                  <X style={{ width: 13, height: 13 }} />
                </button>
              )}
            </div>

            {/* Right: actions */}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveDraft} disabled={anyLoading} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                borderRadius: 8, background: "var(--surface-hover)",
                border: "1px solid var(--hairline)", color: "var(--fc-text)",
                fontSize: 12, fontWeight: 500,
                cursor: anyLoading ? "not-allowed" : "pointer", opacity: anyLoading ? 0.5 : 1,
                transition: "all 0.2s",
              }}>
                {savingDraft ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Save style={{ width: 14, height: 14 }} />}
                Guardar Borrador
              </button>

              <button onClick={requestApproval} disabled={anyLoading} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                borderRadius: 8, background: "rgba(16,185,129,.1)",
                border: "1px solid rgba(16,185,129,.3)", color: "var(--fc-success)",
                fontSize: 12, fontWeight: 600, cursor: anyLoading ? "not-allowed" : "pointer", opacity: anyLoading ? .5 : 1,
              }}>
                {requestingApproval ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <CheckCircle style={{ width: 14, height: 14 }} />}
                Solicitar aprobación
              </button>

              <button onClick={schedulePost} disabled={anyLoading} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                borderRadius: 8,
                background: scheduledAt ? "rgba(253,171,61,0.12)" : "rgba(255,255,255,0.09)",
                border: scheduledAt ? "1px solid rgba(253,171,61,0.3)" : "1px solid var(--hairline)",
                color: scheduledAt ? "var(--fc-warning)" : "var(--fc-text-muted)",
                fontSize: 12, fontWeight: 500,
                cursor: anyLoading ? "not-allowed" : "pointer", opacity: anyLoading ? 0.5 : 1,
                transition: "all 0.2s",
              }}>
                {scheduling ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Clock style={{ width: 14, height: 14 }} />}
                Programar
              </button>

              <button onClick={publishNow} disabled={anyLoading} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 20px",
                borderRadius: 8, background: "linear-gradient(135deg, var(--fc-accent), var(--fc-accent))",
                border: "none", color: "var(--fc-text)", fontSize: 13, fontWeight: 600,
                cursor: anyLoading ? "not-allowed" : "pointer", opacity: anyLoading ? 0.6 : 1,
                boxShadow: "0 4px 16px rgba(0,180,216,0.2)", transition: "all 0.2s",
              }}>
                {publishing ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 14, height: 14 }} />}
                PUBLICAR
              </button>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT COLUMN: LIVE PREVIEW ═══ */}
        <div className="glass-panel" style={{
          width: 420, minWidth: 340, display: "flex", flexDirection: "column",
          borderRadius: 12, overflow: "hidden", flexShrink: 0,
        }}>

          {/* Preview header */}
          <div style={{
            padding: "14px 20px", border: "1px solid var(--hairline)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Smartphone style={{ width: 15, height: 15, color: "var(--fc-text-muted)" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--fc-text-secondary)", letterSpacing: 1.5, textTransform: "uppercase" }}>
              VISTA PREVIA
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, color: "var(--fc-accent)",
              background: "var(--fc-accent-wash)", padding: "2px 8px", borderRadius: 10,
              border: "1px solid rgba(59,130,246,0.2)", textTransform: "uppercase", letterSpacing: 0.5,
            }}>
              {format}
            </span>
            
            {/* Device Toggle */}
            <div style={{ marginLeft: "auto", display: "flex", background: "var(--surface-hover)", borderRadius: 8, padding: 2, border: "1px solid var(--hairline)" }}>
              <button 
                onClick={() => setDeviceView("ios")}
                style={{
                  background: deviceView === "ios" ? "var(--fc-surface)" : "transparent",
                  color: deviceView === "ios" ? "var(--fc-text)" : "var(--fc-text-muted)",
                  border: deviceView === "ios" ? "1px solid var(--fc-border)" : "1px solid transparent",
                  borderRadius: 6, fontSize: 10, fontWeight: 600, padding: "2px 8px", cursor: "pointer",
                  boxShadow: deviceView === "ios" ? "var(--fc-shadow-sm)" : "none",
                  transition: "all 0.2s"
                }}
              >
                iOS
              </button>
              <button 
                onClick={() => setDeviceView("android")}
                style={{
                  background: deviceView === "android" ? "var(--fc-surface)" : "transparent",
                  color: deviceView === "android" ? "var(--fc-text)" : "var(--fc-text-muted)",
                  border: deviceView === "android" ? "1px solid var(--fc-border)" : "1px solid transparent",
                  borderRadius: 6, fontSize: 10, fontWeight: 600, padding: "2px 8px", cursor: "pointer",
                  boxShadow: deviceView === "android" ? "var(--fc-shadow-sm)" : "none",
                  transition: "all 0.2s"
                }}
              >
                Android
              </button>
            </div>
          </div>

          {/* Preview cards — one per selected target */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            {selectedTargets.length === 0 ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
                <DeviceEmulator type={deviceView}>
                  <PostPreview
                    format="post"
                    platform="instagram"
                    content="Elige tus canales y escribe un mensaje para ver la vista previa..."
                    mediaUrls={[]}
                    mediaTypes={[]}
                    pageName="Tu Cuenta"
                    pageAvatar=""
                    igUsername="tu_cuenta"
                    igAvatar=""
                    os={deviceView}
                  />
                </DeviceEmulator>
              </div>
            ) : (
              selectedTargets.map((target) => {
                const isFb = target.platform === "facebook";
                const platformContent = customizeByPlatform
                  ? (isFb ? fbContent : igContent) || previewText
                  : previewText;
                return (
                  <div key={target.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "10px 0" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: platformColors(target.platform).bg,
                        padding: "6px 12px",
                        borderRadius: 16,
                        border: `1px solid ${platformColors(target.platform).border}`,
                      }}
                    >
                      {target.platform === "facebook" ? <Facebook style={{ width: 14, height: 14, color: platformColors(target.platform).icon }} /> : <Instagram style={{ width: 14, height: 14, color: platformColors(target.platform).icon }} />}
                      <span style={{ fontSize: 12, fontWeight: 600, color: platformColors(target.platform).text }}>
                        {platformLabel(format, target.platform)}
                      </span>
                    </div>
                    <DeviceEmulator type={deviceView} theme={target.platform === "instagram" ? "dark" : "light"}>
                      <PostPreview
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
                        os={deviceView}
                      />
                    </DeviceEmulator>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
