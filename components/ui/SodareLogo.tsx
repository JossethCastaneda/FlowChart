"use client";

import React from "react";

interface SodareLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  style?: React.CSSProperties;
  animated?: boolean;
}

/**
 * SODARE Logo — Star Wars-inspired holographic emblem with animations.
 * Pure SVG + CSS keyframes, no external assets.
 */
export function SodareLogo({ size = "md", showText = true, className, style, animated = true }: SodareLogoProps) {
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
      {/* Scoped keyframes */}
      {animated && (
        <style>{`
          @keyframes sodare-pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
          @keyframes sodare-scan {
            0% { transform: translateY(-8px); opacity: 0; }
            20% { opacity: 0.4; }
            80% { opacity: 0.4; }
            100% { transform: translateY(8px); opacity: 0; }
          }
          @keyframes sodare-rotate-slow {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes sodare-glow-breathe {
            0%, 100% { filter: drop-shadow(0 0 3px rgba(91,155,255,0.4)); }
            50% { filter: drop-shadow(0 0 8px rgba(91,155,255,0.8)); }
          }
          @keyframes sodare-text-shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          @keyframes sodare-corner-blink {
            0%, 80%, 100% { opacity: 0.3; }
            90% { opacity: 1; }
          }
          .sodare-emblem {
            transition: transform 0.3s ease, filter 0.3s ease;
          }
          .sodare-emblem:hover {
            transform: scale(1.08);
            animation: sodare-glow-breathe 2s ease-in-out infinite;
          }
          .sodare-wordmark-animated {
            background: linear-gradient(
              90deg,
              var(--foreground) 0%,
              var(--foreground) 40%,
              var(--cyan) 50%,
              var(--foreground) 60%,
              var(--foreground) 100%
            );
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            transition: background-position 0.3s ease;
          }
          .sodare-wordmark-animated:hover {
            animation: sodare-text-shimmer 2s linear infinite;
          }
        `}</style>
      )}

      {/* ── Emblem (SVG) ── */}
      <div
        className={animated ? "sodare-emblem" : undefined}
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
            {/* Holographic gradient */}
            <linearGradient id={`${uid}-glow`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--cyan)" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="var(--cyan)" />
            </linearGradient>
            {/* Animated gradient for S glyph */}
            <linearGradient id={`${uid}-s-glow`} x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--cyan)">
                {animated && <animate attributeName="stopColor" values="var(--cyan);#2563eb;var(--cyan)" dur="2s" repeatCount="indefinite" />}
              </stop>
              <stop offset="100%" stopColor="#2563eb">
                {animated && <animate attributeName="stopColor" values="#2563eb;var(--cyan);#2563eb" dur="2s" repeatCount="indefinite" />}
              </stop>
            </linearGradient>
            {/* Inner glow */}
            <radialGradient id={`${uid}-inner`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0" />
            </radialGradient>
            {/* Drop shadow */}
            <filter id={`${uid}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="var(--cyan)" floodOpacity="0.5" />
            </filter>
            {/* Clip to hexagon for scan effect */}
            <clipPath id={`${uid}-hex-clip`}>
              <polygon points="32,4 56,18 56,46 32,60 8,46 8,18" />
            </clipPath>
          </defs>

          {/* Background hexagon */}
          <polygon
            points="32,2 58,17 58,47 32,62 6,47 6,17"
            fill="rgba(0,15,30,0.85)"
            stroke={`url(#${uid}-glow)`}
            strokeWidth="1.5"
            filter={`url(#${uid}-shadow)`}
          />

          {/* Inner glow fill */}
          <polygon
            points="32,2 58,17 58,47 32,62 6,47 6,17"
            fill={`url(#${uid}-inner)`}
          />

          {/* Animated scan lines */}
          <g clipPath={`url(#${uid}-hex-clip)`}>
            {animated ? (
              <>
                <rect x="8" y="20" width="48" height="1" fill="var(--cyan)" opacity="0.15">
                  <animate attributeName="y" values="10;54;10" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0;0.3;0" dur="3s" repeatCount="indefinite" />
                </rect>
                <rect x="8" y="40" width="48" height="0.5" fill="var(--cyan)" opacity="0.1">
                  <animate attributeName="y" values="50;10;50" dur="4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0;0.2;0" dur="4s" repeatCount="indefinite" />
                </rect>
              </>
            ) : (
              [14, 22, 30, 38, 46].map(y => (
                <line key={y} x1="10" y1={y} x2="54" y2={y} stroke="var(--cyan)" strokeWidth="0.3" opacity="0.15" />
              ))
            )}
          </g>

          {/* Central "S" glyph — angular Star Wars style */}
          <path
            d="M 24 20 L 40 20 L 40 24 L 28 24 L 28 29 L 40 29 L 40 44 L 24 44 L 24 40 L 36 40 L 36 33 L 24 33 Z"
            fill={`url(#${uid}-s-glow)`}
            filter={`url(#${uid}-shadow)`}
          />

          {/* Corner accents — blinking */}
          <g style={animated ? { animation: "sodare-corner-blink 4s ease-in-out infinite" } : undefined}>
            <line x1="10" y1="17" x2="16" y2="17" stroke="var(--cyan)" strokeWidth="1" opacity="0.6" />
            <line x1="10" y1="17" x2="10" y2="23" stroke="var(--cyan)" strokeWidth="1" opacity="0.6" />
          </g>
          <g style={animated ? { animation: "sodare-corner-blink 4s ease-in-out infinite 2s" } : undefined}>
            <line x1="48" y1="47" x2="54" y2="47" stroke="var(--cyan)" strokeWidth="1" opacity="0.6" />
            <line x1="54" y1="41" x2="54" y2="47" stroke="var(--cyan)" strokeWidth="1" opacity="0.6" />
          </g>

          {/* Dot accents — pulsing */}
          <circle cx="14" cy="14" r="1.2" fill="var(--cyan)" style={animated ? { animation: "sodare-pulse 2s ease-in-out infinite" } : { opacity: 0.7 }} />
          <circle cx="50" cy="50" r="1.2" fill="var(--cyan)" style={animated ? { animation: "sodare-pulse 2s ease-in-out infinite 1s" } : { opacity: 0.7 }} />
        </svg>
      </div>

      {/* ── Wordmark ── */}
      {showText && (
        <span
          className={animated ? "sodare-wordmark-animated" : undefined}
          style={{
            fontFamily: "var(--font-display)",
            fontSize,
            fontWeight: 900,
            letterSpacing: "0.2em",
            color: animated ? undefined : "var(--foreground)",
            textShadow: animated ? undefined : "0 0 12px rgba(91,155,255,0.3), 0 0 40px rgba(91,155,255,0.1)",
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
          <stop offset="0%" stopColor="var(--cyan)" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="var(--cyan)" />
        </linearGradient>
        <filter id="si-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="var(--cyan)" floodOpacity="0.6" />
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
