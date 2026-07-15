"use client";

import React from "react";

interface ZefirusLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  style?: React.CSSProperties;
  animated?: boolean;
}

/**
 * ZEFIRUS Logo — Modern, glowing neon square emblem with a sharp "Z".
 * Pure SVG + CSS keyframes, highly optimized and scalable.
 */
export function ZefirusLogo({ size = "md", showText = true, className, style, animated = true }: ZefirusLogoProps) {
  const dims = { sm: 28, md: 36, lg: 48, xl: 64 }[size];
  const fontSize = { sm: "13px", md: "16px", lg: "22px", xl: "28px" }[size];
  const gap = { sm: 6, md: 8, lg: 10, xl: 14 }[size];
  const uid = React.useId().replace(/:/g, "");

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap,
        ...style,
      }}
    >
      {/* Scoped keyframes for Zefirus animations */}
      {animated && (
        <style>{`
          @keyframes zefirus-glow-breathe {
            0%, 100% { filter: drop-shadow(0 0 4px rgba(91,155,255,0.5)); }
            50% { filter: drop-shadow(0 0 12px rgba(91,155,255,0.9)); }
          }
          @keyframes zefirus-trace {
            0% { stroke-dashoffset: 200; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes zefirus-pulse {
            0%, 100% { opacity: 0.8; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.02); }
          }
          @keyframes zefirus-text-shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          .zefirus-emblem {
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.3s ease;
          }
          .zefirus-emblem:hover {
            transform: scale(1.1);
            animation: zefirus-glow-breathe 2s ease-in-out infinite;
          }
          .zefirus-z-path {
            transform-origin: center;
            animation: zefirus-pulse 3s ease-in-out infinite;
          }
          .zefirus-wordmark-animated {
            background: linear-gradient(
              90deg,
              var(--foreground) 0%,
              var(--foreground) 40%,
              #0ea5e9 50%,
              var(--cyan) 60%,
              var(--foreground) 100%
            );
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            transition: background-position 0.3s ease;
          }
          .zefirus-wordmark-animated:hover {
            animation: zefirus-text-shimmer 2.5s linear infinite;
          }
        `}</style>
      )}

      {/* ── Emblem (SVG) ── */}
      <div
        className={animated ? "zefirus-emblem" : undefined}
        style={{
          width: dims, height: dims, position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <svg
          viewBox="0 0 64 64"
          width={dims}
          height={dims}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Holographic linear gradient */}
            <linearGradient id={`${uid}-border-glow`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            {/* Glowing gradient for Z */}
            <linearGradient id={`${uid}-z-glow`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#22d3ee">
                {animated && <animate attributeName="stopColor" values="#22d3ee;#3b82f6;#22d3ee" dur="3s" repeatCount="indefinite" />}
              </stop>
              <stop offset="100%" stopColor="#3b82f6">
                {animated && <animate attributeName="stopColor" values="#3b82f6;#06b6d4;#3b82f6" dur="3s" repeatCount="indefinite" />}
              </stop>
            </linearGradient>

            {/* Inner glow */}
            <radialGradient id={`${uid}-inner`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
            </radialGradient>

            {/* Drop shadow */}
            <filter id={`${uid}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#0ea5e9" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Background square with rounded corners */}
          <rect
            x="6" y="6" width="52" height="52" rx="14"
            fill="rgba(2,6,23,0.85)"
            stroke={`url(#${uid}-border-glow)`}
            strokeWidth="1.5"
            filter={`url(#${uid}-shadow)`}
          />

          {/* Animated trace line around the border */}
          {animated && (
            <rect
              x="6" y="6" width="52" height="52" rx="14"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
              strokeDasharray="40 160"
              strokeDashoffset="0"
              style={{ animation: "zefirus-trace 4s linear infinite" }}
            />
          )}

          {/* Inner glow fill */}
          <rect
            x="6" y="6" width="52" height="52" rx="14"
            fill={`url(#${uid}-inner)`}
          />

          {/* Central "Z" glyph — angular & sharp */}
          <path
            className={animated ? "zefirus-z-path" : undefined}
            d="M 24 20 L 40 20 L 40 24 L 29 40 L 40 40 L 40 44 L 24 44 L 24 40 L 35 24 L 24 24 Z"
            fill={`url(#${uid}-z-glow)`}
            filter={`url(#${uid}-shadow)`}
          />

          {/* Geometric accents */}
          <circle cx="12" cy="12" r="1.5" fill="#3b82f6" opacity="0.8" />
          <circle cx="52" cy="52" r="1.5" fill="#06b6d4" opacity="0.8" />
        </svg>
      </div>

      {/* ── Wordmark ── */}
      {showText && (
        <span
          className={animated ? "zefirus-wordmark-animated" : undefined}
          style={{
            fontFamily: "var(--font-display)",
            fontSize,
            fontWeight: 900,
            letterSpacing: "0.2em",
            color: animated ? undefined : "var(--foreground)",
            textShadow: animated ? undefined : "0 0 12px rgba(14,165,233,0.4), 0 0 30px rgba(14,165,233,0.2)",
            lineHeight: 1,
          }}
        >
          ZEFIRUS
        </span>
      )}
    </div>
  );
}

/**
 * Compact icon-only version for favicons, small spaces, etc.
 */
export function ZefirusIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="zi-glow" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <filter id="zi-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#0ea5e9" floodOpacity="0.7" />
        </filter>
      </defs>
      <rect
        x="6" y="6" width="52" height="52" rx="14"
        fill="rgba(2,6,23,0.95)"
        stroke="url(#zi-glow)"
        strokeWidth="2"
        filter="url(#zi-shadow)"
      />
      <path
        d="M 24 20 L 40 20 L 40 24 L 29 40 L 40 40 L 40 44 L 24 44 L 24 40 L 35 24 L 24 24 Z"
        fill="url(#zi-glow)"
      />
    </svg>
  );
}
