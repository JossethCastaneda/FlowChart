/* eslint-disable @next/next/no-img-element */
﻿"use client";
import React from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Image as ImageIcon,
  Play,
  ChevronLeft,
  ChevronRight,
  Share2,
} from "lucide-react";

/* ── Social Icons (inline SVG, same as Composer.tsx) ──── */
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

/* ── Types ───────────────────────────────────────────── */
export type PostFormat = "post" | "reel" | "story" | "carousel";

interface Props {
  format: PostFormat;
  platform: "facebook" | "instagram";
  content: string;
  mediaUrls: string[];
  mediaTypes: ("image" | "video")[];
  pageName: string;
  pageAvatar: string;
  igUsername?: string;
  igAvatar?: string;
  firstComment?: string;
}

/* ── Helpers ─────────────────────────────────────────── */
const platformLabel = (format: PostFormat, platform: "facebook" | "instagram") => {
  const fmtName = format.charAt(0).toUpperCase() + format.slice(1);
  const pltName = platform === "facebook" ? "Facebook" : "Instagram";
  return `${pltName} ${fmtName}`;
};

const platformColors = (platform: "facebook" | "instagram") => ({
  bg: platform === "facebook" ? "rgba(24,119,242,0.06)" : "rgba(225,48,108,0.06)",
  border: platform === "facebook" ? "rgba(24,119,242,0.15)" : "rgba(225,48,108,0.15)",
  text: platform === "facebook" ? "var(--cyan)" : "#bc5fb2",
  icon: platform === "facebook" ? "#1877f2" : "#E1306C",
});

/* ── Platform Label Bar ─────────────────────────────── */
function PlatformLabelBar({ format, platform }: { format: PostFormat; platform: "facebook" | "instagram" }) {
  const c = platformColors(platform);
  const Icon = platform === "facebook" ? Facebook : Instagram;
  return (
    <div
      style={{
        padding: "8px 14px",
        borderBottom: "1px solid var(--hairline)",
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: c.bg,
      }}
    >
      <Icon style={{ width: 13, height: 13, color: c.icon }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: c.text }}>
        {platformLabel(format, platform)}
      </span>
    </div>
  );
}

/* ── Media renderer ─────────────────────────────────── */
function MediaBox({
  url,
  type,
  style,
}: {
  url?: string;
  type?: "image" | "video";
  style?: React.CSSProperties;
}) {
  if (!url) {
    return (
      <div
        style={{
          width: "100%",
          background: "var(--background)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-secondary)",
          ...style,
        }}
      >
        <ImageIcon style={{ width: 48, height: 48 }} />
      </div>
    );
  }
  if (type === "video") {
    return (
      <video src={url} style={{ width: "100%", objectFit: "cover", ...style }} muted />
    );
  }
  return (
        <img src={url} alt="" style={{ width: "100%", objectFit: "cover", ...style }} />
  );
}

/* ══════════════════════════════════════════════════════
   POST PREVIEW COMPONENT
   ══════════════════════════════════════════════════════ */
export function PostPreview({
  format,
  platform,
  content,
  mediaUrls,
  mediaTypes,
  pageName,
  pageAvatar,
  igUsername,
  igAvatar,
  firstComment,
}: Props) {
  const previewText =
    content || "Iniciando enlace de subespacio... El holomensaje aparecerá aquí.";
  const firstMedia = mediaUrls[0] || undefined;
  const firstMediaType = mediaTypes[0] || undefined;

  const cardBase: React.CSSProperties = {
    background: platform === "instagram" ? "#000" : "rgba(255,255,255,0.09)",
    border: "1px solid var(--hairline)",
    borderRadius: 12,
    overflow: "hidden",
    fontFamily: "var(--font-sans)",
    color: platform === "instagram" ? "#fff" : "var(--foreground)",
  };

  /* ─── FACEBOOK POST ──────────────────────────────── */
  if (format === "post" && platform === "facebook") {
    return (
      <div style={cardBase}>
        <PlatformLabelBar format="post" platform="facebook" />
        {/* Header */}
        <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <img src={pageAvatar} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{pageName}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Justo ahora · </div>
            </div>
          </div>
          <MoreHorizontal style={{ width: 18, height: 18, color: "var(--text-muted)" }} />
        </div>
        {/* Content */}
        <div style={{ padding: "0 14px 12px", fontSize: 14, color: "var(--foreground)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
          {previewText}
        </div>
        {/* Media */}
        {firstMedia && (
          <div style={{ width: "100%", height: 200, background: "var(--foreground)" }}>
            <MediaBox url={firstMedia} type={firstMediaType} style={{ height: "100%" }} />
          </div>
        )}
        {/* Actions */}
        <div style={{ display: "flex", border: "1px solid var(--hairline)", padding: "8px 4px" }}>
          {[
            { icon: <Heart style={{ width: 15, height: 15 }} />, label: "Me gusta" },
            { icon: <MessageCircle style={{ width: 15, height: 15 }} />, label: "Comentar" },
            { icon: <Share2 style={{ width: 15, height: 15 }} />, label: "Compartir" },
          ].map((btn) => (
            <div
              key={btn.label}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                gap: 5, color: "var(--text-muted)", fontSize: 12, fontWeight: 500, padding: "6px 0",
              }}
            >
              {btn.icon}<span>{btn.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ─── INSTAGRAM POST ─────────────────────────────── */
  if (format === "post" && platform === "instagram") {
    const avatar = igAvatar || pageAvatar;
    const username = igUsername || pageName;
    return (
      <div style={cardBase}>
        <PlatformLabelBar format="post" platform="instagram" />
        {/* Header */}
        <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: "50%", padding: 2,
                background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
                            <img src={avatar} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>@{username}</div>
          </div>
          <MoreHorizontal style={{ width: 18, height: 18 }} />
        </div>
        {/* Media */}
        <MediaBox
          url={firstMedia}
          type={firstMediaType}
          style={{ width: "100%", aspectRatio: "1", background: "var(--background)" }}
        />
        {/* Actions + Caption */}
        <div style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 16 }}>
              <Heart style={{ width: 22, height: 22 }} />
              <MessageCircle style={{ width: 22, height: 22 }} />
              <Send style={{ width: 22, height: 22 }} />
            </div>
            <Bookmark style={{ width: 22, height: 22 }} />
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            <span style={{ fontWeight: 600, marginRight: 6 }}>@{username}</span>
            {previewText}
          </div>
          {/* First comment */}
          {firstComment && (
            <div style={{ marginTop: 10, paddingTop: 8, border: "1px solid var(--hairline)" }}>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--foreground)" }}>
                <span style={{ fontWeight: 600, marginRight: 6, color: "var(--foreground)" }}>@{username}</span>
                {firstComment}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── REEL ───────────────────────────────────────── */
  if (format === "reel") {
    const avatar = platform === "instagram" ? (igAvatar || pageAvatar) : pageAvatar;
    const displayName = platform === "instagram" ? `@${igUsername || pageName}` : pageName;
    return (
      <div style={{ ...cardBase, position: "relative" }}>
        <PlatformLabelBar format="reel" platform={platform} />
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "9/16",
            maxHeight: 400,
            background: "var(--background)",
            overflow: "hidden",
          }}
        >
          {/* Media background */}
          {firstMedia ? (
            firstMediaType === "video" ? (
              <video
                src={firstMedia}
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0 }}
              />
            ) : (
                            <img
                src={firstMedia}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0 }}
              />
            )
          ) : (
            <div
              style={{
                width: "100%", height: "100%", display: "flex",
                alignItems: "center", justifyContent: "center", color: "var(--text-secondary)",
              }}
            >
              <ImageIcon style={{ width: 48, height: 48 }} />
            </div>
          )}

          {/* Play button overlay */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--panel-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              
            }}
          >
            <Play style={{ width: 26, height: 26, color: "var(--foreground)", marginLeft: 3 }} />
          </div>

          {/* Bottom gradient + caption */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "40px 14px 14px",
              background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <img
                src={avatar}
                alt=""
                style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.3)" }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{displayName}</span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.4,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {previewText}
            </div>
          </div>

          {/* Right side action icons */}
          <div
            style={{
              position: "absolute",
              right: 10,
              bottom: 80,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 18,
            }}
          >
            {[Heart, MessageCircle, Send, Bookmark].map((Icon, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Icon style={{ width: 22, height: 22, color: "var(--foreground)" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─── STORY ──────────────────────────────────────── */
  if (format === "story") {
    const avatar = platform === "instagram" ? (igAvatar || pageAvatar) : pageAvatar;
    const displayName = platform === "instagram" ? `@${igUsername || pageName}` : pageName;
    return (
      <div style={{ ...cardBase, position: "relative" }}>
        <PlatformLabelBar format="story" platform={platform} />
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "9/16",
            maxHeight: 380,
            background: "var(--background)",
            overflow: "hidden",
          }}
        >
          {/* Media */}
          {firstMedia ? (
            firstMediaType === "video" ? (
              <video
                src={firstMedia}
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0 }}
              />
            ) : (
                            <img
                src={firstMedia}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0 }}
              />
            )
          ) : (
            <div
              style={{
                width: "100%", height: "100%", display: "flex",
                alignItems: "center", justifyContent: "center", color: "var(--text-secondary)",
              }}
            >
              <ImageIcon style={{ width: 48, height: 48 }} />
            </div>
          )}

          {/* Story progress bars at top */}
          <div
            style={{
              position: "absolute",
              top: 6,
              left: 8,
              right: 8,
              display: "flex",
              gap: 3,
              zIndex: 2,
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 2,
                  borderRadius: 1,
                  background: i === 0 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>

          {/* Username pill at top-left */}
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
              zIndex: 2,
            }}
          >
                        <img
              src={avatar}
              alt=""
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid rgba(255,255,255,0.4)",
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--foreground)",
                textShadow: "0 1px 4px rgba(0,0,0,0.6)",
              }}
            >
              {displayName}
            </span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>hace 1h</span>
          </div>
        </div>
      </div>
    );
  }

  /* ─── CAROUSEL (Instagram only) ──────────────────── */
  if (format === "carousel") {
    const avatar = igAvatar || pageAvatar;
    const username = igUsername || pageName;
    const itemCount = Math.max(mediaUrls.length, 1);
    return (
      <div style={cardBase}>
        <PlatformLabelBar format="carousel" platform="instagram" />
        {/* Header */}
        <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: "50%", padding: 2,
                background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
                            <img src={avatar} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>@{username}</div>
          </div>
          <MoreHorizontal style={{ width: 18, height: 18 }} />
        </div>
        {/* Media with chevrons */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "1", background: "var(--background)" }}>
          <MediaBox
            url={firstMedia}
            type={firstMediaType}
            style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
          />
          {/* Left chevron */}
          {itemCount > 1 && (
            <div
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--panel-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft style={{ width: 16, height: 16, color: "var(--foreground)" }} />
            </div>
          )}
          {/* Right chevron */}
          {itemCount > 1 && (
            <div
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--panel-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronRight style={{ width: 16, height: 16, color: "var(--foreground)" }} />
            </div>
          )}
          {/* Item counter badge */}
          {itemCount > 1 && (
            <div
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "var(--panel-bg)",
                borderRadius: 12,
                padding: "3px 9px",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--foreground)",
              }}
            >
              1/{itemCount}
            </div>
          )}
        </div>
        {/* Actions */}
        <div style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 16 }}>
              <Heart style={{ width: 22, height: 22 }} />
              <MessageCircle style={{ width: 22, height: 22 }} />
              <Send style={{ width: 22, height: 22 }} />
            </div>
            <Bookmark style={{ width: 22, height: 22 }} />
          </div>
          {/* Dot indicators */}
          {itemCount > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 10 }}>
              {Array.from({ length: Math.min(itemCount, 10) }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === 0 ? 6 : 5,
                    height: i === 0 ? 6 : 5,
                    borderRadius: "50%",
                    background: i === 0 ? "var(--cyan)" : "rgba(255,255,255,0.25)",
                    transition: "all 0.2s",
                  }}
                />
              ))}
            </div>
          )}
          {/* Caption */}
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            <span style={{ fontWeight: 600, marginRight: 6 }}>@{username}</span>
            {previewText}
          </div>
          {/* First comment */}
          {firstComment && (
            <div style={{ marginTop: 10, paddingTop: 8, border: "1px solid var(--hairline)" }}>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--foreground)" }}>
                <span style={{ fontWeight: 600, marginRight: 6, color: "var(--foreground)" }}>@{username}</span>
                {firstComment}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── Fallback ───────────────────────────────────── */
  return null;
}
