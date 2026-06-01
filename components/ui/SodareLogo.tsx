"use client";

import React from "react";

interface SodareLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * SODARE Logo — Star Wars-inspired holographic emblem.
 * Pure SVG, no external assets.
 */
export function SodareLogo({ size = "md", showText = true, className, style }: SodareLogoProps) {
  const dims = { sm: 28, md: 36, lg: 48, xl: 64 }[size];
  const fontSize = { sm: "13px", md: "16px", lg: "22px", xl: "28px" }[size];
  const gap = { sm: 6, md: 8, lg: 10, xl: 14 }[size];

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
      {/* ── Emblem (SVG) ── */}
      <div style={{
        width: dims, height: dims, position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg
          viewBox="0 0 64 64"
          width={dims}
          height={dims}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Holographic gradient */}
            <linearGradient id="sodare-glow" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="50%" stopColor="#0080ff" />
              <stop offset="100%" stopColor="#00f0ff" />
            </linearGradient>
            {/* Inner glow */}
            <radialGradient id="sodare-inner" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
            </radialGradient>
            {/* Drop shadow filter */}
            <filter id="sodare-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00f0ff" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Background hexagon */}
          <polygon
            points="32,2 58,17 58,47 32,62 6,47 6,17"
            fill="rgba(0,15,30,0.8)"
            stroke="url(#sodare-glow)"
            strokeWidth="1.5"
            filter="url(#sodare-shadow)"
          />

          {/* Inner glow fill */}
          <polygon
            points="32,2 58,17 58,47 32,62 6,47 6,17"
            fill="url(#sodare-inner)"
          />

          {/* Scan lines (holographic effect) */}
          {[14, 22, 30, 38, 46].map(y => (
            <line
              key={y}
              x1="10" y1={y} x2="54" y2={y}
              stroke="#00f0ff"
              strokeWidth="0.3"
              opacity="0.15"
            />
          ))}

          {/* Central "S" glyph — angular Star Wars style */}
          <path
            d="M 24 20 L 40 20 L 40 24 L 28 24 L 28 29 L 40 29 L 40 44 L 24 44 L 24 40 L 36 40 L 36 33 L 24 33 Z"
            fill="url(#sodare-glow)"
            filter="url(#sodare-shadow)"
          />

          {/* Corner accents */}
          <line x1="10" y1="17" x2="16" y2="17" stroke="#00f0ff" strokeWidth="1" opacity="0.6" />
          <line x1="10" y1="17" x2="10" y2="23" stroke="#00f0ff" strokeWidth="1" opacity="0.6" />
          <line x1="48" y1="47" x2="54" y2="47" stroke="#00f0ff" strokeWidth="1" opacity="0.6" />
          <line x1="54" y1="41" x2="54" y2="47" stroke="#00f0ff" strokeWidth="1" opacity="0.6" />

          {/* Dot accents */}
          <circle cx="14" cy="14" r="1.2" fill="#00f0ff" opacity="0.7" />
          <circle cx="50" cy="50" r="1.2" fill="#00f0ff" opacity="0.7" />
        </svg>
      </div>

      {/* ── Wordmark ── */}
      {showText && (
        <span
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize,
            fontWeight: 900,
            letterSpacing: "0.2em",
            color: "#e2e8f0",
            textShadow: "0 0 12px rgba(0,240,255,0.3), 0 0 40px rgba(0,240,255,0.1)",
            lineHeight: 1,
          }}
        >
          SODARE
        </span>
      )}
    </div>
  );
}

/**
 * Compact icon-only version for favicons, small spaces, etc.
 */
export function SodareIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="si-glow" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00f0ff" />
          <stop offset="50%" stopColor="#0080ff" />
          <stop offset="100%" stopColor="#00f0ff" />
        </linearGradient>
        <filter id="si-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#00f0ff" floodOpacity="0.6" />
        </filter>
      </defs>
      <polygon
        points="32,2 58,17 58,47 32,62 6,47 6,17"
        fill="rgba(0,10,20,0.9)"
        stroke="url(#si-glow)"
        strokeWidth="2"
        filter="url(#si-shadow)"
      />
      <path
        d="M 24 20 L 40 20 L 40 24 L 28 24 L 28 29 L 40 29 L 40 44 L 24 44 L 24 40 L 36 40 L 36 33 L 24 33 Z"
        fill="url(#si-glow)"
      />
    </svg>
  );
}
