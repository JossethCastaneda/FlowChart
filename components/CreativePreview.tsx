"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX,
  Eye, ExternalLink, Heart, MessageCircle, Share2, ThumbsUp,
} from "lucide-react";

/* ═══ TYPES ═══ */
interface CarouselItem {
  imageUrl: string;
  title: string;
  description: string;
  link: string;
}

interface AdCreative {
  adId: string;
  adName: string;
  status: string;
  format: "video" | "image" | "carousel";
  thumbnailUrl: string;
  videoUrl?: string;
  carouselItems?: CarouselItem[];
  title: string;
  body: string;
  description: string;
  cta: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  results: number;
  cprVal: number;
}

/* ═══ FORMAT BADGE ═══ */
const FormatBadge = ({ format }: { format: string }) => {
  const colors: Record<string, { bg: string; text: string }> = {
    video:    { bg: "rgba(162,93,220,0.15)", text: "#a25ddc" },
    image:    { bg: "rgba(0,212,255,0.12)", text: "#00d4ff" },
    carousel: { bg: "rgba(253,171,61,0.12)", text: "#fdab3d" },
  };
  const c = colors[format] || colors.image;
  const label = format === "video" ? "Video" : format === "carousel" ? "Carrusel" : "Imagen";
  return (
    <span style={{
      position: "absolute", top: 8, right: 8, padding: "2px 8px",
      fontSize: 9, fontWeight: 700, background: c.bg, color: c.text,
      borderRadius: 4, letterSpacing: "0.05em", textTransform: "uppercase",
      backdropFilter: "blur(4px)", zIndex: 2,
    }}>{label}</span>
  );
};

/* ═══ VIDEO PLAYER ═══ */
const VideoPlayer = ({
  src, poster, compact = false, autoPlay = false,
}: { src: string; poster: string; compact?: boolean; autoPlay?: boolean }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(autoPlay);
  const [muted, setMuted] = useState(true);

  const toggle = useCallback(() => {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play().catch(() => {}); setPlaying(true); }
  }, [playing]);

  useEffect(() => {
    if (autoPlay && ref.current) {
      ref.current.play().catch(() => {});
      setPlaying(true);
    }
  }, [autoPlay]);

  if (!src) {
    // No video URL — show poster with play icon overlay
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <img src={poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.3)",
        }}>
          <Play style={{ width: compact ? 28 : 48, height: compact ? 28 : 48, color: "white", fill: "white", opacity: 0.8 }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }} onClick={toggle}>
      <video
        ref={ref} src={src} poster={poster} muted={muted} loop playsInline
        style={{ width: "100%", height: "100%", objectFit: "contain", cursor: "pointer", background: "#000" }}
      />
      {/* Play/Pause overlay */}
      {!playing && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.25)", cursor: "pointer",
        }}>
          <Play style={{ width: compact ? 28 : 48, height: compact ? 28 : 48, color: "white", fill: "white", opacity: 0.9 }} />
        </div>
      )}
      {/* Controls */}
      <div style={{
        position: "absolute", bottom: 8, right: 8, display: "flex", gap: 6, zIndex: 3,
      }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => { setMuted(!muted); if (ref.current) ref.current.muted = !muted; }}
          style={{
            background: "rgba(0,0,0,0.5)", border: "none", borderRadius: 4, padding: 4,
            cursor: "pointer", display: "flex", alignItems: "center",
          }}
        >
          {muted
            ? <VolumeX style={{ width: 14, height: 14, color: "white" }} />
            : <Volume2 style={{ width: 14, height: 14, color: "white" }} />
          }
        </button>
      </div>
    </div>
  );
};

/* ═══ CAROUSEL VIEWER ═══ */
const CarouselViewer = ({
  items, compact = false,
}: { items: CarouselItem[]; compact?: boolean }) => {
  const [idx, setIdx] = useState(0);
  if (!items.length) return null;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <img
        src={items[idx].imageUrl} alt={items[idx].title}
        style={{ width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.2s" }}
      />
      {/* Nav arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => Math.max(0, i - 1)); }}
            disabled={idx === 0}
            style={{
              position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)",
              background: idx === 0 ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%",
              width: compact ? 24 : 32, height: compact ? 24 : 32, cursor: idx === 0 ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3,
            }}
          >
            <ChevronLeft style={{ width: compact ? 14 : 18, height: compact ? 14 : 18, color: "white" }} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => Math.min(items.length - 1, i + 1)); }}
            disabled={idx === items.length - 1}
            style={{
              position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
              background: idx === items.length - 1 ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%",
              width: compact ? 24 : 32, height: compact ? 24 : 32, cursor: idx === items.length - 1 ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3,
            }}
          >
            <ChevronRight style={{ width: compact ? 14 : 18, height: compact ? 14 : 18, color: "white" }} />
          </button>
          {/* Dots */}
          <div style={{
            position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: 4, zIndex: 3,
          }}>
            {items.map((_, i) => (
              <span key={i} onClick={e => { e.stopPropagation(); setIdx(i); }} style={{
                width: i === idx ? 12 : 6, height: 6, borderRadius: 3,
                background: i === idx ? "#00d4ff" : "rgba(255,255,255,0.5)",
                cursor: "pointer", transition: "all 0.2s",
              }} />
            ))}
          </div>
        </>
      )}
      {/* Current slide info */}
      {!compact && items[idx].title && (
        <div style={{
          position: "absolute", bottom: 28, left: 8, right: 8,
          background: "rgba(0,0,0,0.6)", borderRadius: 4, padding: "4px 8px", zIndex: 2,
        }}>
          <p style={{ fontSize: 10, color: "white", fontWeight: 600 }}>{items[idx].title}</p>
        </div>
      )}
    </div>
  );
};

/* ═══ CREATIVE CARD (inline in table/grid) ═══ */
export const CreativeCard = ({
  ad, onPreview, fmtMXN, cprTarget,
}: {
  ad: AdCreative; onPreview: () => void; fmtMXN: (n: number) => string; cprTarget: number;
}) => {
  const hasMedia = ad.thumbnailUrl || ad.videoUrl || (ad.carouselItems && ad.carouselItems.length > 0);

  return (
    <div
      onClick={onPreview}
      style={{
        background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 8, overflow: "hidden", cursor: "pointer",
        transition: "border-color 0.2s, transform 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,212,255,0.25)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.transform = "none"; }}
    >
      {/* Media area — auto-size based on content */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", background: "rgba(0,0,0,0.4)", overflow: "hidden" }}>
        {ad.format === "video" ? (
          <VideoPlayer src={ad.videoUrl || ""} poster={ad.thumbnailUrl} compact />
        ) : ad.format === "carousel" && ad.carouselItems && ad.carouselItems.length > 0 ? (
          <CarouselViewer items={ad.carouselItems} compact />
        ) : hasMedia ? (
          <img src={ad.thumbnailUrl} alt={ad.adName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Eye style={{ width: 24, height: 24, color: "rgba(148,163,184,0.15)" }} />
          </div>
        )}
        <FormatBadge format={ad.format} />
        {/* Preview hint */}
        <div style={{
          position: "absolute", bottom: 8, left: 8, padding: "3px 8px",
          background: "rgba(0,0,0,0.5)", borderRadius: 4, fontSize: 9, color: "rgba(255,255,255,0.7)",
          opacity: 0, transition: "opacity 0.2s", pointerEvents: "none",
        }} className="preview-hint">
          <Eye style={{ width: 10, height: 10, display: "inline", verticalAlign: "middle", marginRight: 4 }} />
          Ver preview
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "10px 12px" }}>
        <p style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
          {ad.adName}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
          <div>
            <p style={{ fontSize: 8, color: "rgba(148,163,184,0.3)", textTransform: "uppercase" }}>Inversión</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#fdab3d" }}>{fmtMXN(ad.spend)}</p>
          </div>
          <div>
            <p style={{ fontSize: 8, color: "rgba(148,163,184,0.3)", textTransform: "uppercase" }}>Result.</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#00c875" }}>{ad.results}</p>
          </div>
          <div>
            <p style={{ fontSize: 8, color: "rgba(148,163,184,0.3)", textTransform: "uppercase" }}>CPR</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: ad.cprVal === Infinity ? "#e2445c" : cprTarget > 0 && ad.cprVal > cprTarget ? "#e2445c" : "#00d4ff" }}>
              {ad.cprVal === Infinity ? "—" : fmtMXN(ad.cprVal)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══ LIGHTBOX / PREVIEW MODAL ═══ */
export const CreativeLightbox = ({
  ad, onClose, fmtMXN, cprTarget, cprLabel, fmtNum, pageName, pageImageUrl,
}: {
  ad: AdCreative; onClose: () => void; fmtMXN: (n: number) => string; cprTarget: number; cprLabel: string; fmtNum: (n: number) => string; pageName?: string; pageImageUrl?: string;
}) => {
  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const statusColor = ad.status === "ACTIVE" ? "#00c875" : ad.status === "PAUSED" ? "#fdab3d" : "rgba(148,163,184,0.3)";
  const statusLabel = ad.status === "ACTIVE" ? "Activo" : ad.status === "PAUSED" ? "Pausado" : ad.status;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)", zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, animation: "fadeIn 0.2s ease",
      }}
    >
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#0f1219", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
          maxWidth: 960, width: "100%", maxHeight: "85vh", overflow: "hidden",
          display: "flex", flexDirection: "row", animation: "slideUp 0.25s ease",
          margin: "auto",
        }}
      >
        {/* Left: Media */}
        <div style={{
          flex: "0 0 50%", maxWidth: 480, background: "#000", position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: 300, maxHeight: "85vh", overflow: "hidden",
        }}>
          {ad.format === "video" ? (
            <VideoPlayer src={ad.videoUrl || ""} poster={ad.thumbnailUrl} autoPlay={!!ad.videoUrl} />
          ) : ad.format === "carousel" && ad.carouselItems && ad.carouselItems.length > 0 ? (
            <CarouselViewer items={ad.carouselItems} />
          ) : ad.thumbnailUrl ? (
            <img src={ad.thumbnailUrl} alt={ad.adName} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
              <Eye style={{ width: 48, height: 48, color: "rgba(148,163,184,0.1)" }} />
            </div>
          )}
          <FormatBadge format={ad.format} />
        </div>

        {/* Right: Info + Preview */}
        <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", overflow: "auto", maxHeight: "85vh" }}>
          {/* Close */}
          <button onClick={onClose} style={{
            position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, width: 32, height: 32,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <X style={{ width: 16, height: 16, color: "rgba(148,163,184,0.6)" }} />
          </button>

          {/* Ad name + status */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 6, lineHeight: 1.3 }}>{ad.adName}</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor }} />
              <span style={{ fontSize: 11, color: "rgba(148,163,184,0.5)" }}>{statusLabel}</span>
              <span style={{ fontSize: 10, color: "rgba(148,163,184,0.25)", fontFamily: "monospace", marginLeft: 8 }}>ID: {ad.adId}</span>
            </div>
          </div>

          {/* Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Inversión", value: fmtMXN(ad.spend), color: "#fdab3d" },
              { label: "Resultados", value: String(ad.results), color: "#00c875" },
              { label: cprLabel, value: ad.cprVal === Infinity ? "—" : fmtMXN(ad.cprVal), color: ad.cprVal === Infinity ? "#e2445c" : cprTarget > 0 && ad.cprVal > cprTarget ? "#e2445c" : "#00d4ff" },
              { label: "CTR", value: `${ad.ctr.toFixed(2)}%`, color: "rgba(148,163,184,0.7)" },
            ].map(m => (
              <div key={m.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6, padding: "8px 10px" }}>
                <p style={{ fontSize: 8, color: "rgba(148,163,184,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{m.label}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: m.color }}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Additional metrics row */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20, fontSize: 11, color: "rgba(148,163,184,0.5)" }}>
            <span>Impresiones: <strong style={{ color: "#e2e8f0" }}>{fmtNum(ad.impressions)}</strong></span>
            <span>Clics: <strong style={{ color: "#e2e8f0" }}>{fmtNum(ad.clicks)}</strong></span>
            <span>CPC: <strong style={{ color: "#e2e8f0" }}>{fmtMXN(ad.spend / (ad.clicks || 1))}</strong></span>
          </div>

          {/* ── Ad Preview (Feed simulation) ── */}
          <div style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8, overflow: "hidden", marginBottom: 16,
          }}>
            <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <p style={{ fontSize: 9, color: "rgba(148,163,184,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Vista previa del anuncio</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {pageImageUrl ? (
                  <img src={pageImageUrl} alt={pageName || ""} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)" }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #0081FB, #00d4ff)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>{(pageName || ad.adName || "A")[0].toUpperCase()}</span>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{pageName || ad.title || ad.adName}</p>
                  <p style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>Publicidad · 🌐</p>
                </div>
              </div>
            </div>

            {/* Body text */}
            {ad.body && (
              <div style={{ padding: "10px 12px" }}>
                <p style={{ fontSize: 12, color: "rgba(148,163,184,0.8)", lineHeight: 1.5 }}>
                  {ad.body.length > 200 ? ad.body.slice(0, 200) + "..." : ad.body}
                </p>
              </div>
            )}

            {/* Preview image/video */}
            <div style={{ width: "100%", aspectRatio: "1 / 1", maxHeight: 250, background: "#000", overflow: "hidden" }}>
              {ad.format === "video" ? (
                <VideoPlayer src={ad.videoUrl || ""} poster={ad.thumbnailUrl} compact />
              ) : ad.format === "carousel" && ad.carouselItems && ad.carouselItems.length > 0 ? (
                <CarouselViewer items={ad.carouselItems} compact />
              ) : ad.thumbnailUrl ? (
                <img src={ad.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : null}
            </div>

            {/* Title + CTA */}
            <div style={{ padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {ad.title && <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.title}</p>}
                {ad.description && <p style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.description}</p>}
              </div>
              {ad.cta && (
                <span style={{
                  padding: "6px 14px", fontSize: 11, fontWeight: 700,
                  background: "rgba(0,129,251,0.12)", color: "#0081FB",
                  borderRadius: 4, textTransform: "uppercase", whiteSpace: "nowrap", marginLeft: 12,
                }}>{ad.cta}</span>
              )}
            </div>

            {/* Engagement bar */}
            <div style={{
              padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.04)",
              display: "flex", gap: 20, fontSize: 11, color: "rgba(148,163,184,0.35)",
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><ThumbsUp style={{ width: 12, height: 12 }} /> Me gusta</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MessageCircle style={{ width: 12, height: 12 }} /> Comentar</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Share2 style={{ width: 12, height: 12 }} /> Compartir</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreativeCard;
