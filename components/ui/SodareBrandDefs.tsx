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
          <stop offset="100%" stopColor="#00f0ff" />
        </linearGradient>

        {/* ─── Emerald Holographic Glow (Success/Growth) ─── */}
        <linearGradient id="sodare-holo-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>

        {/* ─── Purple/Pink Holographic Glow (Inbox/Analytics) ─── */}
        <linearGradient id="sodare-holo-pink" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
        
        {/* ─── Orange/Gold Holographic Glow (Listening/Planner) ─── */}
        <linearGradient id="sodare-holo-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="50%" stopColor="#ffbe0b" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
    </svg>
  );
}
