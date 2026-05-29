"use client";
import React, { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";

// Inline brand icons (lucide-react doesn't have social brand icons)
function FacebookIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16, ...style }}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function InstagramIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16, ...style }}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

export interface AdCreativeData {
  pageName?: string;
  pageAvatar?: string;
  message?: string;      // Ad body / primary text
  headline?: string;     // Title
  description?: string;  // Description
  imageUrl?: string;     // Creative image URL
  videoUrl?: string;     // If video ad
  ctaType?: string;      // LEARN_MORE, SHOP_NOW, SEND_MESSAGE, etc.
  ctaUrl?: string;       // Destination URL
  displayUrl?: string;   // Shown URL (optional, visual only)
  format?: "image" | "video" | "carousel";
}

type PreviewFormat = "facebook_feed" | "instagram_feed" | "instagram_story" | "facebook_story";

const CTA_LABELS: Record<string, string> = {
  LEARN_MORE: "Más información",
  SHOP_NOW: "Comprar",
  SEND_MESSAGE: "Enviar mensaje",
  CONTACT_US: "Contáctanos",
  SIGN_UP: "Registrarse",
  DOWNLOAD: "Descargar",
  BOOK_TRAVEL: "Reservar",
  SUBSCRIBE: "Suscribirse",
  GET_QUOTE: "Obtener cotización",
  WATCH_MORE: "Ver más",
  APPLY_NOW: "Aplicar ahora",
  GET_OFFER: "Ver oferta",
  OPEN_LINK: "Abrir enlace",
};

function FallbackImage({ url, alt, style }: { url?: string; alt: string; style?: React.CSSProperties }) {
  const [error, setError] = useState(false);
  if (!url || error) {
    return (
      <div
        style={{
          ...style,
          background: "linear-gradient(135deg, rgba(0,129,251,0.15) 0%, rgba(0,212,255,0.08) 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <Monitor style={{ width: 32, height: 32, color: "rgba(148,163,184,0.3)" }} />
        <span style={{ fontSize: 11, color: "rgba(148,163,184,0.4)" }}>Vista previa no disponible</span>
      </div>
    );
  }
  return <img src={url} alt={alt} style={{ ...style, objectFit: "cover" }} onError={() => setError(true)} />;
}

function FacebookFeedPreview({ creative }: { creative: AdCreativeData }) {
  const ctaLabel = creative.ctaType ? (CTA_LABELS[creative.ctaType] || creative.ctaType) : "Más información";
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        overflow: "hidden",
        maxWidth: 500,
        margin: "0 auto",
        fontFamily: "system-ui, -apple-system, Helvetica, Arial, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg,#1877F2,#4299E1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, overflow: "hidden",
          }}
        >
          {creative.pageAvatar
            ? <img src={creative.pageAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <FacebookIcon style={{ width: 20, height: 20, color: "#fff" }} />
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1c1e21", lineHeight: 1.3 }}>
            {creative.pageName || "Tu Página"}
          </div>
          <div style={{ fontSize: 12, color: "#65676b", display: "flex", alignItems: "center", gap: 4 }}>
            Patrocinado · <FacebookIcon style={{ width: 10, height: 10 }} />
          </div>
        </div>
        <div style={{ color: "#65676b", fontSize: 22, lineHeight: 1, cursor: "pointer" }}>···</div>
      </div>

      {/* Body text */}
      {creative.message && (
        <div style={{ padding: "0 16px 12px", fontSize: 15, color: "#1c1e21", lineHeight: 1.5 }}>
          {creative.message.length > 200 ? creative.message.substring(0, 200) + "..." : creative.message}
        </div>
      )}

      {/* Creative image */}
      <FallbackImage
        url={creative.imageUrl}
        alt="Ad creative"
        style={{ width: "100%", height: 280, display: "block" }}
      />

      {/* Card footer */}
      <div
        style={{
          background: "#f2f3f5",
          borderTop: "1px solid #ddd",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {creative.displayUrl && (
            <div style={{ fontSize: 11, color: "#65676b", textTransform: "uppercase", marginBottom: 2 }}>
              {creative.displayUrl}
            </div>
          )}
          {creative.headline && (
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1c1e21", lineHeight: 1.3 }}>
              {creative.headline}
            </div>
          )}
          {creative.description && (
            <div style={{ fontSize: 13, color: "#65676b", lineHeight: 1.3, marginTop: 2 }}>
              {creative.description}
            </div>
          )}
        </div>
        <button
          style={{
            padding: "8px 16px",
            background: "#e4e6eb",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            color: "#050505",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {ctaLabel}
        </button>
      </div>

      {/* Engagement bar */}
      <div style={{ padding: "8px 16px", borderTop: "1px solid #e4e6eb", display: "flex", gap: 4 }}>
        {["👍 Me gusta", "💬 Comentar", "↗ Compartir"].map((action) => (
          <button
            key={action}
            style={{
              flex: 1, background: "none", border: "none", padding: "8px 4px",
              fontSize: 13, fontWeight: 600, color: "#65676b", cursor: "pointer",
              borderRadius: 6,
            }}
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}

function InstagramFeedPreview({ creative }: { creative: AdCreativeData }) {
  const ctaLabel = creative.ctaType ? (CTA_LABELS[creative.ctaType] || creative.ctaType) : "Más información";
  return (
    <div
      style={{
        background: "#fff",
        maxWidth: 400,
        margin: "0 auto",
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        borderRadius: 4,
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
            padding: 2, flexShrink: 0, overflow: "hidden",
          }}
        >
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "#fff" }}>
            {creative.pageAvatar
              ? <img src={creative.pageAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1877F2,#4299E1)" }} />
            }
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#262626" }}>
            {creative.pageName || "tupagina"}
          </div>
          <div style={{ fontSize: 11, color: "#8e8e8e" }}>Publicidad</div>
        </div>
        <div style={{ color: "#262626", fontSize: 22, lineHeight: 1 }}>···</div>
      </div>

      {/* Square image */}
      <FallbackImage
        url={creative.imageUrl}
        alt="Ad creative"
        style={{ width: "100%", aspectRatio: "1/1", display: "block" }}
      />

      {/* CTA Bar */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid #efefef",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 14 }}>
          <span style={{ fontSize: 20 }}>🤍</span>
          <span style={{ fontSize: 20 }}>💬</span>
          <span style={{ fontSize: 20 }}>↗</span>
        </div>
        <button
          style={{
            padding: "6px 14px",
            background: "#0095f6",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {ctaLabel}
        </button>
      </div>

      {/* Caption */}
      <div style={{ padding: "10px 14px 14px" }}>
        {creative.headline && (
          <div style={{ fontSize: 14, fontWeight: 700, color: "#262626", marginBottom: 4 }}>
            {creative.headline}
          </div>
        )}
        {creative.message && (
          <div style={{ fontSize: 14, color: "#262626", lineHeight: 1.5 }}>
            <span style={{ fontWeight: 600 }}>{creative.pageName || "tupagina"}</span>{" "}
            {creative.message.length > 150 ? creative.message.substring(0, 150) + "..." : creative.message}
          </div>
        )}
        {creative.displayUrl && (
          <div style={{ fontSize: 12, color: "#0095f6", marginTop: 6 }}>{creative.displayUrl}</div>
        )}
      </div>
    </div>
  );
}

function StoryPreview({ creative, platform }: { creative: AdCreativeData; platform: "facebook" | "instagram" }) {
  const ctaLabel = creative.ctaType ? (CTA_LABELS[creative.ctaType] || creative.ctaType) : "Más información";
  const igGradient = "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)";

  return (
    <div
      style={{
        background: "#000",
        borderRadius: 16,
        overflow: "hidden",
        maxWidth: 280,
        margin: "0 auto",
        aspectRatio: "9/16",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      {/* Background image fills entire story */}
      {creative.imageUrl ? (
        <img
          src={creative.imageUrl}
          alt="story"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => {}}
        />
      ) : (
        <div
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(0,129,251,0.2) 0%, rgba(0,0,0,0.7) 100%)",
          }}
        />
      )}

      {/* Overlay gradient at top and bottom */}
      <div
        style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* Top bar */}
      <div style={{ position: "relative", zIndex: 2, padding: "14px 12px 0" }}>
        {/* Progress bar */}
        <div style={{ height: 2, background: "rgba(255,255,255,0.4)", borderRadius: 2, marginBottom: 10 }}>
          <div style={{ width: "40%", height: "100%", background: "#fff", borderRadius: 2 }} />
        </div>
        {/* Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: platform === "instagram" ? igGradient : "#1877F2",
              padding: platform === "instagram" ? 2 : 0,
              flexShrink: 0, overflow: "hidden",
            }}
          >
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "#fff" }}>
              {creative.pageAvatar
                ? <img src={creative.pageAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1877F2,#4299E1)" }} />
              }
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
              {creative.pageName || "Tu Página"}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}>Publicidad</div>
          </div>
        </div>
      </div>

      {/* Bottom content */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2, padding: "16px 14px 20px" }}>
        {creative.headline && (
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
            {creative.headline}
          </div>
        )}
        {creative.message && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", marginBottom: 12, lineHeight: 1.4, textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>
            {creative.message.length > 80 ? creative.message.substring(0, 80) + "..." : creative.message}
          </div>
        )}
        <button
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            width: "100%", padding: "10px 16px",
            background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)",
            border: "none", borderRadius: 24,
            fontSize: 13, fontWeight: 700, color: "#000",
            cursor: "pointer",
          }}
        >
          {ctaLabel} ↗
        </button>
      </div>
    </div>
  );
}

interface AdPreviewProps {
  creative: AdCreativeData;
}

export function AdPreview({ creative }: AdPreviewProps) {
  const [format, setFormat] = useState<PreviewFormat>("facebook_feed");

  const formats: { key: PreviewFormat; label: string; icon: React.ReactNode }[] = [
    { key: "facebook_feed", label: "FB Feed", icon: <FacebookIcon style={{ width: 14, height: 14 }} /> },
    { key: "instagram_feed", label: "IG Feed", icon: <InstagramIcon style={{ width: 14, height: 14 }} /> },
    { key: "facebook_story", label: "FB Story", icon: <Smartphone className="w-3.5 h-3.5" /> },
    { key: "instagram_story", label: "IG Story", icon: <Smartphone className="w-3.5 h-3.5" /> },
  ];

  return (
    <div>
      {/* Format selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {formats.map((f) => (
          <button
            key={f.key}
            onClick={() => setFormat(f.key)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 10px",
              background: format === f.key ? "rgba(0,129,251,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${format === f.key ? "var(--cyan)" : "var(--border)"}`,
              borderRadius: 6,
              color: format === f.key ? "var(--cyan)" : "rgba(148,163,184,0.7)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {f.icon}
            {f.label}
          </button>
        ))}
      </div>

      {/* Preview area */}
      <div
        style={{
          background: "rgba(0,0,0,0.3)",
          borderRadius: 10,
          border: "1px solid var(--border)",
          padding: 16,
          maxHeight: 520,
          overflowY: "auto",
        }}
        className="custom-scrollbar"
      >
        {format === "facebook_feed" && <FacebookFeedPreview creative={creative} />}
        {format === "instagram_feed" && <InstagramFeedPreview creative={creative} />}
        {format === "facebook_story" && <StoryPreview creative={creative} platform="facebook" />}
        {format === "instagram_story" && <StoryPreview creative={creative} platform="instagram" />}
      </div>
    </div>
  );
}
