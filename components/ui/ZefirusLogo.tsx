"use client";

import React from "react";

interface ZefirusLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showSubtitle?: boolean;
  className?: string;
  style?: React.CSSProperties;
  animated?: boolean;
}

/**
 * ZefirusLogo — SVG fiel al logo de la imagen.
 *
 * Estructura exacta del diseño:
 * 1. Z exterior: trazo cursivo grueso, color cyan (#22d3ee) — parte superior e inferior
 * 2. Z interior: trazo cursivo más pequeño, color azul (#3b82f6)
 * 3. Flecha diagonal ascendente (↗) que cruza toda la Z — punta de flecha con 3 líneas
 * 4. Grafo de red: 3 nodos circulares (cyan) conectados por segmentos, parte superior-derecha
 * 5. Wordmark: "ZEFIRUS" en azul cian bold
 * 6. Subtítulo: "SOFTWARE PLATFORM" en azul más oscuro
 */
export function ZefirusLogo({
  size = "md",
  showText = true,
  showSubtitle = true,
  className,
  style,
  animated = true,
}: ZefirusLogoProps) {
  const dims = { sm: 40, md: 56, lg: 80, xl: 110 }[size];
  const fontSize = { sm: "15px", md: "20px", lg: "28px", xl: "38px" }[size];
  const subFontSize = { sm: "6.5px", md: "8px", lg: "11px", xl: "15px" }[size];
  const gap = { sm: 10, md: 14, lg: 18, xl: 24 }[size];
  const uid = React.useId().replace(/:/g, "");

  return (
    <div
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap, ...style }}
    >
      {/* ── CSS Animations ── */}
      {animated && (
        <style>{`
          @keyframes zfr-float {
            0%,100% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
          }
          @keyframes zfr-glow-pulse {
            0%,100% { filter: drop-shadow(0 0 6px rgba(34,211,238,0.45)); }
            50%       { filter: drop-shadow(0 0 18px rgba(34,211,238,0.85)); }
          }
          @keyframes zfr-node-beat {
            0%,100% { opacity: 0.75; transform: scale(1); }
            50%       { opacity: 1;    transform: scale(1.4); }
          }
          @keyframes zfr-arrow-draw {
            0%   { stroke-dashoffset: 260; opacity: 0.3; }
            40%  { opacity: 1; }
            100% { stroke-dashoffset: 0;   opacity: 1; }
          }
          @keyframes zfr-text-shine {
            0%   { background-position: -200% center; }
            100% { background-position:  200% center; }
          }

          .zfr-emblem {
            animation: zfr-float 5s ease-in-out infinite,
                       zfr-glow-pulse 3s ease-in-out infinite;
            transition: transform 0.35s ease;
          }
          .zfr-emblem:hover { transform: scale(1.08) translateY(-2px); }

          .zfr-node-1 { animation: zfr-node-beat 2.4s ease-in-out infinite 0s; transform-origin: 139px 39px; }
          .zfr-node-2 { animation: zfr-node-beat 2.4s ease-in-out infinite 0.7s; transform-origin: 163px 50px; }
          .zfr-node-3 { animation: zfr-node-beat 2.4s ease-in-out infinite 1.4s; transform-origin: 147px 64px; }

          .zfr-arrow-path {
            stroke-dasharray: 260;
            animation: zfr-arrow-draw 3.5s ease-in-out infinite alternate;
          }

          .zfr-wordmark {
            background: linear-gradient(90deg, #22d3ee 0%, #06b6d4 45%, #22d3ee 100%);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .zfr-wordmark:hover {
            animation: zfr-text-shine 2s linear infinite;
          }
        `}</style>
      )}

      {/* ── SVG Emblem ── */}
      <div
        className={animated ? "zfr-emblem" : undefined}
        style={{ width: dims, height: dims, flexShrink: 0 }}
      >
        {/*
          ViewBox: 0 0 200 200
          Z exterior ocupa la mitad izquierda (x: 20-120, y: 20-160)
          Z interior es una copia más pequeña centrada en el mismo espacio
          La flecha sube de abajo-izquierda (30,155) a arriba-derecha (160,22)
          El grafo queda en la esquina superior-derecha (x:130-170, y:32-70)
        */}
        <svg
          viewBox="0 0 200 200"
          width={dims}
          height={dims}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Zefirus logo"
        >
          <defs>
            {/* Gradiente principal: cyan */}
            <linearGradient id={`${uid}-cg`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            {/* Gradiente secundario: azul */}
            <linearGradient id={`${uid}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Gradiente para la flecha */}
            <linearGradient id={`${uid}-ag`} x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>

            {/* Filtro de brillo cyan */}
            <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Filtro de brillo suave para nodos */}
            <filter id={`${uid}-node-glow`} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ══════════════════════════════════════════
              Z  E X T E R I O R  (trazo cursivo grueso, cyan)
              - Trazo superior: barra horizontal top con ángulo
              - Diagonal: línea central que cruza de arriba-derecha a abajo-izquierda
              - Trazo inferior: barra horizontal bottom con ángulo y cola curva izquierda
          ══════════════════════════════════════════ */}
          <g filter={`url(#${uid}-glow)`}>
            {/* Barra superior de la Z (horizontal, ligeramente en ángulo) */}
            <path
              d="M 32 38 L 110 28 L 112 42 L 38 50 Z"
              fill={`url(#${uid}-cg)`}
              opacity="0.95"
            />

            {/* Diagonal central de la Z exterior (de arriba-derecha a abajo-izquierda) */}
            <path
              d="M 38 50 L 112 42 L 88 118 L 68 122 Z"
              fill={`url(#${uid}-cg)`}
              opacity="0.85"
            />

            {/* Barra inferior de la Z con cola curva hacia la izquierda */}
            <path
              d="M 26 138 Q 22 152 32 158 Q 42 164 52 156 L 88 118 L 68 122 Z"
              fill={`url(#${uid}-cg)`}
              opacity="0.95"
            />

            {/* Remate inferior derecho */}
            <path
              d="M 68 122 L 88 118 L 118 148 L 96 154 Z"
              fill={`url(#${uid}-cg)`}
              opacity="0.95"
            />

            {/* Barra inferior horizontal de la Z */}
            <path
              d="M 26 138 L 96 154 L 118 148 L 42 130 Z"
              fill={`url(#${uid}-cg)`}
              opacity="0.9"
            />
          </g>

          {/* ══════════════════════════════════════════
              Z  I N T E R I O R  (trazo cursivo más pequeño, azul)
              Idéntica forma a la Z exterior pero escalada ~60% y desplazada
          ══════════════════════════════════════════ */}
          <g opacity="0.9">
            {/* Barra superior Z interior */}
            <path
              d="M 48 62 L 98 54 L 100 64 L 54 70 Z"
              fill={`url(#${uid}-bg)`}
            />
            {/* Diagonal Z interior */}
            <path
              d="M 54 70 L 100 64 L 84 108 L 68 112 Z"
              fill={`url(#${uid}-bg)`}
            />
            {/* Barra inferior + remate Z interior */}
            <path
              d="M 44 122 L 68 112 L 84 108 L 102 128 L 80 134 L 58 124 Z"
              fill={`url(#${uid}-bg)`}
            />
            {/* Barra inferior horizontal Z interior */}
            <path
              d="M 44 122 L 80 134 L 102 128 L 62 118 Z"
              fill={`url(#${uid}-bg)`}
              opacity="0.8"
            />
          </g>

          {/* ══════════════════════════════════════════
              F L E C H A  D I A G O N A L  ↗
              Sube de abajo-izquierda (36,158) a arriba-derecha (158,28)
              Punta de flecha estilo outline (3 líneas formando ">")
          ══════════════════════════════════════════ */}

          {/* Tronco de la flecha */}
          <path
            className={animated ? "zfr-arrow-path" : undefined}
            d="M 36 158 L 148 36"
            stroke={`url(#${uid}-ag)`}
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />

          {/* Punta de flecha (3 líneas tipo outline) */}
          {/* Línea izquierda de la punta */}
          <path
            d="M 148 36 L 130 42"
            stroke={`url(#${uid}-ag)`}
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          {/* Línea inferior de la punta */}
          <path
            d="M 148 36 L 142 54"
            stroke={`url(#${uid}-ag)`}
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />

          {/* ══════════════════════════════════════════
              G R A F O  D E  R E D  (3 nodos + conexiones)
              Triángulo de nodos en la zona superior-derecha
              Nodo 1: (139, 39) — esquina superior
              Nodo 2: (163, 50) — derecha
              Nodo 3: (147, 64) — inferior
          ══════════════════════════════════════════ */}

          {/* Líneas de conexión entre nodos */}
          <g stroke="#3b82f6" strokeWidth="2.5" opacity="0.85">
            <line x1="139" y1="39" x2="163" y2="50" strokeLinecap="round" />
            <line x1="163" y1="50" x2="147" y2="64" strokeLinecap="round" />
            <line x1="147" y1="64" x2="139" y2="39" strokeLinecap="round" />
          </g>

          {/* Nodos del grafo */}
          <circle
            className={animated ? "zfr-node-1" : undefined}
            cx="139" cy="39" r="5"
            fill="#22d3ee"
            filter={`url(#${uid}-node-glow)`}
          />
          <circle
            className={animated ? "zfr-node-2" : undefined}
            cx="163" cy="50" r="5"
            fill="#22d3ee"
            filter={`url(#${uid}-node-glow)`}
          />
          <circle
            className={animated ? "zfr-node-3" : undefined}
            cx="147" cy="64" r="5"
            fill="#22d3ee"
            filter={`url(#${uid}-node-glow)`}
          />
        </svg>
      </div>

      {/* ── Wordmark + Subtitle ── */}
      {showText && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          <span
            className={animated ? "zfr-wordmark" : undefined}
            style={{
              fontFamily: "var(--font-orbitron, var(--font-display), 'Orbitron', sans-serif)",
              fontSize,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: animated ? undefined : "#22d3ee",
              display: "block",
            }}
          >
            ZEFIRUS
          </span>
          {showSubtitle && (
            <span
              style={{
                fontFamily: "var(--font-space, var(--font-sans), 'Space Grotesk', sans-serif)",
                fontSize: subFontSize,
                fontWeight: 600,
                letterSpacing: "0.22em",
                color: "#3b82f6",
                textTransform: "uppercase" as const,
                marginTop: "3px",
                display: "block",
                opacity: 0.9,
              }}
            >
              SOFTWARE PLATFORM
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ZefirusIcon — Versión compacta solo del emblema (sin texto).
 * Ideal para favicons, avatares, espacios reducidos.
 */
export function ZefirusIcon({ size = 24 }: { size?: number }) {
  const uid = React.useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Zefirus icon"
    >
      <defs>
        <linearGradient id={`${uid}-cg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id={`${uid}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id={`${uid}-ag`} x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>

      {/* Z Exterior */}
      <path d="M 32 38 L 110 28 L 112 42 L 38 50 Z" fill={`url(#${uid}-cg)`} opacity="0.95" />
      <path d="M 38 50 L 112 42 L 88 118 L 68 122 Z" fill={`url(#${uid}-cg)`} opacity="0.85" />
      <path d="M 26 138 Q 22 152 32 158 Q 42 164 52 156 L 88 118 L 68 122 Z" fill={`url(#${uid}-cg)`} opacity="0.95" />
      <path d="M 68 122 L 88 118 L 118 148 L 96 154 Z" fill={`url(#${uid}-cg)`} opacity="0.95" />
      <path d="M 26 138 L 96 154 L 118 148 L 42 130 Z" fill={`url(#${uid}-cg)`} opacity="0.9" />

      {/* Z Interior */}
      <path d="M 48 62 L 98 54 L 100 64 L 54 70 Z" fill={`url(#${uid}-bg)`} />
      <path d="M 54 70 L 100 64 L 84 108 L 68 112 Z" fill={`url(#${uid}-bg)`} />
      <path d="M 44 122 L 68 112 L 84 108 L 102 128 L 80 134 L 58 124 Z" fill={`url(#${uid}-bg)`} />

      {/* Flecha */}
      <path d="M 36 158 L 148 36" stroke={`url(#${uid}-ag)`} strokeWidth="8" strokeLinecap="round" />
      <path d="M 148 36 L 130 42" stroke={`url(#${uid}-ag)`} strokeWidth="8" strokeLinecap="round" />
      <path d="M 148 36 L 142 54" stroke={`url(#${uid}-ag)`} strokeWidth="8" strokeLinecap="round" />

      {/* Grafo de red */}
      <g stroke="#3b82f6" strokeWidth="2.5" opacity="0.85">
        <line x1="139" y1="39" x2="163" y2="50" />
        <line x1="163" y1="50" x2="147" y2="64" />
        <line x1="147" y1="64" x2="139" y2="39" />
      </g>
      <circle cx="139" cy="39" r="5" fill="#22d3ee" />
      <circle cx="163" cy="50" r="5" fill="#22d3ee" />
      <circle cx="147" cy="64" r="5" fill="#22d3ee" />
    </svg>
  );
}
