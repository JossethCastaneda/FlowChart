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
        {/* ─── Azul (marca) ─── */}
        <linearGradient id="sodare-holo-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--cyan)" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="var(--cyan)" />
        </linearGradient>

        {/* ─── Verde (éxito/crecimiento) ─── */}
        <linearGradient id="sodare-holo-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--emerald)" />
          <stop offset="50%" stopColor="#2b9a67" />
          <stop offset="100%" stopColor="var(--emerald)" />
        </linearGradient>

        {/* ─── Magenta atenuado (métricas) ─── */}
        <linearGradient id="sodare-holo-pink" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bc5fb2" />
          <stop offset="50%" stopColor="var(--purple)" />
          <stop offset="100%" stopColor="#bc5fb2" />
        </linearGradient>

        {/* ─── Naranja atenuado (escucha/planner) ─── */}
        <linearGradient id="sodare-holo-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d98843" />
          <stop offset="50%" stopColor="var(--amber)" />
          <stop offset="100%" stopColor="#d98843" />
        </linearGradient>
      </defs>
    </svg>
  );
}
