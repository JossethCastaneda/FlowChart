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
    image:    { bg: "rgba(0,212,255,0.12)", text: "var(--cyan)" },
    carousel: { bg: "rgba(253,171,61,0.12)", text: "var(--amber)" },
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
    // No playable video source from Meta — show poster (contain) with a clear notice.
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <img src={poster} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column", gap: 6,
          alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)",
        }}>
          <Play style={{ width: compact ? 22 : 36, height: compact ? 22 : 36, color: "var(--foreground)", fill: "white", opacity: 0.45 }} />
          {!compact && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>Vista previa de video no disponible</span>}
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
          <Play style={{ width: compact ? 28 : 48, height: compact ? 28 : 48, color: "var(--foreground)", fill: "white", opacity: 0.9 }} />
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
            ? <VolumeX style={{ width: 14, height: 14, color: "var(--foreground)" }} />
            : <Volume2 style={{ width: 14, height: 14, color: "var(--foreground)" }} />
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
            <ChevronLeft style={{ width: compact ? 14 : 18, height: compact ? 14 : 18, color: "var(--foreground)" }} />
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
            <ChevronRight style={{ width: compact ? 14 : 18, height: compact ? 14 : 18, color: "var(--foreground)" }} />
          </button>
          {/* Dots */}
          <div style={{
            position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: 4, zIndex: 3,
          }}>
            {items.map((_, i) => (
              <span key={i} onClick={e => { e.stopPropagation(); setIdx(i); }} style={{
                width: i === idx ? 12 : 6, height: 6, borderRadius: 3,
                background: i === idx ? "var(--cyan)" : "rgba(255,255,255,0.5)",
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
          <p style={{ fontSize: 10, color: "var(--foreground)", fontWeight: 600 }}>{items[idx].title}</p>
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
        background: "rgba(255,255,255,0.025)", border: "1px solid var(--hairline)",
        borderRadius: 8, overflow: "hidden", cursor: "pointer",
        transition: "border-color 0.2s, transform 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,212,255,0.25)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "none"; }}
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
            <Eye style={{ width: 24, height: 24, color: "var(--text-muted)" }} />
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
        <p style={{ fontSize: 11, color: "var(--foreground)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
          {ad.adName}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
          <div>
            <p style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase" }}>Inversión</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--amber)" }}>{fmtMXN(ad.spend)}</p>
          </div>
          <div>
            <p style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase" }}>Result.</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--emerald)" }}>{ad.results}</p>
          </div>
          <div>
            <p style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase" }}>CPR</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: ad.cprVal === Infinity ? "var(--red)" : cprTarget > 0 && ad.cprVal > cprTarget ? "var(--red)" : "var(--cyan)" }}>
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

  const statusColor = ad.status === "ACTIVE" ? "var(--emerald)" : ad.status === "PAUSED" ? "var(--amber)" : "rgba(148,163,184,0.65)";
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
          position: "relative",
          background: "var(--background)", border: "1px solid var(--hairline)", borderRadius: 12,
          maxWidth: 460, width: "100%", maxHeight: "90vh", overflow: "auto",
          display: "flex", flexDirection: "column", animation: "slideUp 0.25s ease",
          margin: "auto",
        }}
      >
        {/* Single column: feed-style preview (the ONLY media surface) + metrics */}
        <div style={{ flex: 1, padding: "16px 16px", display: "flex", flexDirection: "column" }}>
          {/* Close */}
          <button onClick={onClose} style={{
            position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.1)",
            border: "1px solid var(--hairline)", borderRadius: 6, width: 32, height: 32,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10
          }}>
            <X style={{ width: 16, height: 16, color: "var(--text-secondary)" }} />
          </button>

          {/* Ad name + status */}
          <div style={{ marginBottom: 16, paddingRight: 40 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", marginBottom: 6, lineHeight: 1.3 }}>{ad.adName}</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor }} />
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{statusLabel}</span>
              <span style={{ fontSize: 10, color: "rgba(148,163,184,0.55)", fontFamily: "monospace", marginLeft: 8 }}>ID: {ad.adId}</span>
            </div>
          </div>

          {/* ── Ad Preview (Feed simulation) moved to the top ── */}
          <div style={{
            background: "var(--surface-hover)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8, overflow: "hidden", marginBottom: 20, flexShrink: 0
          }}>
            <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--hairline)" }}>
              <p style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Vista previa del anuncio</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {pageImageUrl ? (
                  <img src={pageImageUrl} alt={pageName || ""} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--hairline)" }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #0081FB, var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>{(pageName || ad.adName || "A")[0].toUpperCase()}</span>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{pageName || ad.title || ad.adName}</p>
                  <p style={{ fontSize: 10, color: "rgba(148,163,184,0.7)" }}>Publicidad · 🌐</p>
                </div>
              </div>
            </div>

            {/* Body text */}
            {ad.body && (
              <div style={{ padding: "10px 12px" }}>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {ad.body}
                </p>
              </div>
            )}

            {/* Preview image/video — single media surface, capped height */}
            <div style={{ width: "100%", background: "#000", overflow: "hidden", position: "relative" }}>
              {ad.format === "video" ? (
                <div style={{ width: "100%", height: "min(56vh, 480px)", position: "relative", background: "#000" }}>
                  <VideoPlayer src={ad.videoUrl || ""} poster={ad.thumbnailUrl} autoPlay={!!ad.videoUrl} />
                </div>
              ) : ad.format === "carousel" && ad.carouselItems && ad.carouselItems.length > 0 ? (
                <div style={{ aspectRatio: "1 / 1" }}><CarouselViewer items={ad.carouselItems} compact /></div>
              ) : ad.thumbnailUrl ? (
                <img src={ad.thumbnailUrl} alt="" style={{ width: "100%", height: "auto", maxHeight: "56vh", objectFit: "contain", display: "block", margin: "0 auto" }} />
              ) : null}
              <FormatBadge format={ad.format} />
            </div>

            {/* Title + CTA */}
            <div style={{ padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-hover)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {ad.title && <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.title}</p>}
                {ad.description && <p style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.description}</p>}

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
              padding: "8px 12px", borderTop: "1px solid var(--hairline)",
              display: "flex", gap: 20, fontSize: 11, color: "var(--text-muted)",
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><ThumbsUp style={{ width: 12, height: 12 }} /> Me gusta</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MessageCircle style={{ width: 12, height: 12 }} /> Comentar</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Share2 style={{ width: 12, height: 12 }} /> Compartir</span>
            </div>
          </div>

          {/* Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12, flexShrink: 0 }}>
            {[
              { label: "Inversión", value: fmtMXN(ad.spend), color: "var(--amber)" },
              { label: "Resultados", value: String(ad.results), color: "var(--emerald)" },
              { label: cprLabel, value: ad.cprVal === Infinity ? "—" : fmtMXN(ad.cprVal), color: ad.cprVal === Infinity ? "var(--red)" : cprTarget > 0 && ad.cprVal > cprTarget ? "var(--red)" : "var(--cyan)" },
              { label: "CTR", value: `${ad.ctr.toFixed(2)}%`, color: "rgba(148,163,184,0.7)" },
            ].map(m => (
              <div key={m.label} style={{ background: "var(--surface-hover)", border: "1px solid var(--hairline)", borderRadius: 6, padding: "8px 10px" }}>
                <p style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{m.label}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: m.color }}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Additional metrics row */}
          <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--text-secondary)", flexShrink: 0 }}>
            <span>Impresiones: <strong style={{ color: "var(--foreground)" }}>{fmtNum(ad.impressions)}</strong></span>
            <span>Clics: <strong style={{ color: "var(--foreground)" }}>{fmtNum(ad.clicks)}</strong></span>
            <span>CPC: <strong style={{ color: "var(--foreground)" }}>{fmtMXN(ad.spend / (ad.clicks || 1))}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreativeCard;
