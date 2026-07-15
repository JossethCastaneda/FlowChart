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
 * ZEFIRUS Logo — Modern tech logo featuring a stylized Z with an upward arrow and a network graph.
 * Matches the uploaded image exactly.
 */
export function ZefirusLogo({ size = "md", showText = true, className, style, animated = true }: ZefirusLogoProps) {
  // Ajustamos los tamaños para que el logo se vea proporcionado con el texto
  const dims = { sm: 32, md: 48, lg: 64, xl: 80 }[size];
  const fontSize = { sm: "14px", md: "18px", lg: "24px", xl: "32px" }[size];
  const subFontSize = { sm: "6px", md: "8px", lg: "10px", xl: "13px" }[size];
  const gap = { sm: 8, md: 12, lg: 16, xl: 20 }[size];
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
      {animated && (
        <style>{`
          @keyframes zefirus-glow-breathe {
            0%, 100% { filter: drop-shadow(0 0 4px rgba(6, 182, 212, 0.4)); }
            50% { filter: drop-shadow(0 0 12px rgba(6, 182, 212, 0.8)); }
          }
          @keyframes zefirus-node-pulse {
            0%, 100% { r: 3.5; opacity: 0.8; filter: drop-shadow(0 0 2px #06b6d4); }
            50% { r: 4.5; opacity: 1; filter: drop-shadow(0 0 8px #22d3ee); }
          }
          @keyframes zefirus-arrow-shoot {
            0% { stroke-dashoffset: 150; }
            50%, 100% { stroke-dashoffset: 0; }
          }
          @keyframes zefirus-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
          @keyframes zefirus-text-shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          .zefirus-emblem {
            transition: transform 0.4s ease;
          }
          .zefirus-emblem:hover {
            transform: scale(1.05);
          }
          .zefirus-animated-nodes circle {
            animation: zefirus-node-pulse 2s ease-in-out infinite;
          }
          .zefirus-animated-nodes circle:nth-child(1) { animation-delay: 0s; }
          .zefirus-animated-nodes circle:nth-child(2) { animation-delay: 0.5s; }
          .zefirus-animated-nodes circle:nth-child(3) { animation-delay: 1s; }
          .zefirus-animated-nodes circle:nth-child(4) { animation-delay: 1.5s; }
          
          .zefirus-animated-arrow {
            stroke-dasharray: 150;
            animation: zefirus-arrow-shoot 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
          
          .zefirus-wordmark {
            font-family: var(--font-display), sans-serif;
            font-weight: 700;
            letter-spacing: 0.15em;
            background: linear-gradient(90deg, #22d3ee 0%, #0ea5e9 50%, #22d3ee 100%);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          
          .zefirus-wordmark:hover {
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
          animation: animated ? "zefirus-float 6s ease-in-out infinite" : "none"
        }}
      >
        <svg
          viewBox="0 0 100 100"
          width={dims}
          height={dims}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Cyan gradient for top part and arrow */}
            <linearGradient id={`${uid}-cyan-grad`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            {/* Darker blue gradient for bottom part */}
            <linearGradient id={`${uid}-blue-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>

            {/* Drop shadow for glow effect */}
            <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#22d3ee" floodOpacity="0.6" />
            </filter>
          </defs>

          <g filter={`url(#${uid}-glow)`}>
            {/* Top part of the Z */}
            <path
              d="M 20 40 L 45 40 L 35 52 L 15 52 Z"
              fill={`url(#${uid}-cyan-grad)`}
            />
            {/* Top extension left */}
            <path
              d="M 20 40 Q 15 45 25 50"
              fill="none"
              stroke={`url(#${uid}-cyan-grad)`}
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Bottom part of the Z (Dark Blue) */}
            <path
              d="M 28 65 L 55 65 L 45 75 L 18 75 Z"
              fill={`url(#${uid}-blue-grad)`}
            />

            {/* Swooping Arrow through the middle */}
            <path
              className={animated ? "zefirus-animated-arrow" : undefined}
              d="M 15 65 Q 40 45 60 25"
              fill="none"
              stroke={`url(#${uid}-cyan-grad)`}
              strokeWidth="6"
              strokeLinecap="round"
            />
            
            {/* Arrowhead */}
            <path
              d="M 50 25 L 63 22 L 60 35 Z"
              fill={`url(#${uid}-cyan-grad)`}
            />

            {/* Network Graph Lines */}
            <g stroke="#0ea5e9" strokeWidth="2" opacity="0.7">
              <line x1="55" y1="52" x2="68" y2="45" />
              <line x1="68" y1="45" x2="80" y2="52" />
              <line x1="80" y1="52" x2="65" y2="62" />
              <line x1="65" y1="62" x2="55" y2="52" />
            </g>

            {/* Network Graph Nodes (Animated) */}
            <g className={animated ? "zefirus-animated-nodes" : undefined} fill="#22d3ee">
              <circle cx="55" cy="52" r="3.5" />
              <circle cx="68" cy="45" r="3.5" />
              <circle cx="80" cy="52" r="3.5" />
              <circle cx="65" cy="62" r="3.5" />
            </g>
          </g>
        </svg>
      </div>

      {/* ── Wordmark & Subtitle ── */}
      {showText && (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span
            className={animated ? "zefirus-wordmark" : undefined}
            style={{
              fontSize,
              lineHeight: 1.1,
              color: animated ? undefined : "#22d3ee",
            }}
          >
            ZEFIRUS
          </span>
          <span
            style={{
              fontFamily: "var(--font-sans), sans-serif",
              fontSize: subFontSize,
              fontWeight: 600,
              letterSpacing: "0.2em",
              color: "#3b82f6",
              textTransform: "uppercase",
              lineHeight: 1,
              marginTop: "2px"
            }}
          >
            SOFTWARE PLATFORM
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact icon-only version for favicons, small spaces, etc.
 */
export function ZefirusIcon({ size = 24 }: { size?: number }) {
  const uid = React.useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${uid}-c`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id={`${uid}-b`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <path d="M 20 40 L 45 40 L 35 52 L 15 52 Z" fill={`url(#${uid}-c)`} />
      <path d="M 28 65 L 55 65 L 45 75 L 18 75 Z" fill={`url(#${uid}-b)`} />
      <path d="M 15 65 Q 40 45 60 25" fill="none" stroke={`url(#${uid}-c)`} strokeWidth="6" strokeLinecap="round" />
      <path d="M 50 25 L 63 22 L 60 35 Z" fill={`url(#${uid}-c)`} />
      <circle cx="55" cy="52" r="3.5" fill="#22d3ee" />
      <circle cx="68" cy="45" r="3.5" fill="#22d3ee" />
      <circle cx="80" cy="52" r="3.5" fill="#22d3ee" />
      <circle cx="65" cy="62" r="3.5" fill="#22d3ee" />
    </svg>
  );
}
