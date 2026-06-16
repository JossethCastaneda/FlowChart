"use client";

import React, { useEffect, useState } from "react";

/**
 * SodareBrandDefs
 * This component must be mounted once in the app (e.g. in layout.tsx or ClientMainWrapper.tsx).
 * It injects the global SVG definitions (<defs>) for the holographic gradients and filters
 * that make up the Sodare brand aesthetic. Any SVG in the app can then reference these.
 */
export function SodareBrandDefs() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <svg width="0" height="0" style={{ position: "absolute", width: 0, height: 0, visibility: "hidden" }}>
      <defs>
        {/* ─── Cyan Holographic Glow (Default Brand) ─── */}
        <linearGradient id="sodare-holo-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f0ff" />
          <stop offset="50%" stopColor="#0080ff" />
          <stop offset="100%" stopColor="#00f0ff">
            <animate attributeName="stop-color" values="#00f0ff;#0080ff;#00f0ff" dur="4s" repeatCount="indefinite" />
          </stop>
        </linearGradient>

        {/* ─── Emerald Holographic Glow (Success/Growth) ─── */}
        <linearGradient id="sodare-holo-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#10b981">
            <animate attributeName="stop-color" values="#10b981;#059669;#10b981" dur="4s" repeatCount="indefinite" />
          </stop>
        </linearGradient>

        {/* ─── Purple/Pink Holographic Glow (Inbox/Analytics) ─── */}
        <linearGradient id="sodare-holo-pink" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#f472b6">
            <animate attributeName="stop-color" values="#f472b6;#a855f7;#f472b6" dur="4s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
        
        {/* ─── Orange/Gold Holographic Glow (Listening/Planner) ─── */}
        <linearGradient id="sodare-holo-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="50%" stopColor="#ffbe0b" />
          <stop offset="100%" stopColor="#fb923c">
            <animate attributeName="stop-color" values="#fb923c;#ffbe0b;#fb923c" dur="4s" repeatCount="indefinite" />
          </stop>
        </linearGradient>

        {/* ─── Global Glow Filters ─── */}
        <filter id="sodare-glow-filter-cyan" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00f0ff" floodOpacity="0.6" />
        </filter>
        <filter id="sodare-glow-filter-emerald" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.6" />
        </filter>
        <filter id="sodare-glow-filter-pink" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f472b6" floodOpacity="0.6" />
        </filter>
        <filter id="sodare-glow-filter-gold" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#fb923c" floodOpacity="0.6" />
        </filter>
      </defs>
    </svg>
  );
}
