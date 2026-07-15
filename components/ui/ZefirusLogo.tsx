"use client";

import React from "react";

/* ───────────────────────────────────────────────────────
 *  ZefirusLogo — Componente vectorizado del logo oficial.
 *
 *  Tres modos de render:
 *    1. "icon"  — solo el emblema (Z + flecha + grafo de red)
 *    2. "stack" — emblema + wordmark + (opcionalmente) subtitle apilados
 *    3. "inline"— emblema a la izquierda + wordmark a la derecha (horizontal)
 *
 *  Cada modo usa un viewBox recortado al contenido real, evitando
 *  espacio muerto en el SVG.
 *
 *  Coordenadas (después de transform translate(0,1024) scale(0.1,-0.1)):
 *    Emblema:   x ≈ 230–760   y ≈ 236–590
 *    Wordmark:  x ≈ 221–836   y ≈ 614–690
 *    Subtitle:  x ≈ 265–764   y ≈ 730–776
 * ─────────────────────────────────────────────────────── */

interface ZefirusLogoProps {
  /** Controla la altura del logo (en px, o nombre de preset) */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  /** Muestra el wordmark "ZEFIRUS" */
  showText?: boolean;
  /** Muestra el subtítulo "SOFTWARE PLATFORM" (requiere showText=true) */
  showSubtitle?: boolean;
  /** Layout: "auto" decide según showText. "stack" apila, "inline" pone lado a lado. */
  layout?: "auto" | "stack" | "inline";
  className?: string;
  style?: React.CSSProperties;
  /** Activa animaciones CSS */
  animated?: boolean;
}

// ─── Preset sizes (altura del contenedor en px) ───
const SIZE_MAP: Record<string, number> = {
  xs: 28,
  sm: 36,
  md: 48,
  lg: 72,
  xl: 110,
};

// ─── ViewBox constants (bounding boxes reales del contenido) ───
// Obtenidos midiendo los paths renderizados después de transform
const VB = {
  // Solo el emblema (3 paths)
  icon:     { x: 220, y: 225, w: 550, h: 375 },
  // Emblema + wordmark
  noSub:    { x: 210, y: 225, w: 640, h: 478 },
  // Emblema + wordmark + subtitle (todo)
  full:     { x: 210, y: 225, w: 640, h: 560 },
  // Solo wordmark (para layout inline)
  wordmark: { x: 215, y: 610, w: 630, h: 86 },
  // Wordmark + subtitle (para layout inline)
  wordSub:  { x: 215, y: 610, w: 630, h: 170 },
} as const;

export function ZefirusLogo({
  size = "md",
  showText = true,
  showSubtitle = true,
  layout = "auto",
  className,
  style,
  animated = true,
}: ZefirusLogoProps) {
  const uid = React.useId().replace(/:/g, "");
  const h = typeof size === "number" ? size : (SIZE_MAP[size] ?? 48);

  // Decidir layout real
  const resolvedLayout: "stack" | "inline" =
    layout === "auto"
      ? (showText ? "inline" : "stack")  // si muestra texto, ponerlo al lado
      : layout;

  // ─── Modo INLINE: emblema + texto lado a lado ───
  if (showText && resolvedLayout === "inline") {
    const iconVb = VB.icon;
    const iconAR = iconVb.w / iconVb.h; // aspect ratio del emblema
    const iconW = Math.round(h * iconAR);

    return (
      <div
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: Math.round(h * 0.25),
          height: h,
          ...style,
        }}
      >
        {/* Emblema */}
        <div style={{ height: h, width: iconW, flexShrink: 0 }}>
          <EmblemSVG uid={uid} vb={iconVb} animated={animated} />
        </div>

        {/* Texto */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: Math.round(h * 0.04) }}>
          <span style={{
            fontFamily: "var(--font-orbitron, var(--font-display, 'Orbitron'), sans-serif)",
            fontSize: Math.max(11, Math.round(h * 0.42)),
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#1de4f2",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}>
            ZEFIRUS
          </span>
          {showSubtitle && (
            <span style={{
              fontFamily: "var(--font-space, var(--font-sans, 'Space Grotesk'), sans-serif)",
              fontSize: Math.max(6, Math.round(h * 0.18)),
              fontWeight: 600,
              letterSpacing: "0.22em",
              color: "#1db5e2",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}>
              SOFTWARE PLATFORM
            </span>
          )}
        </div>
      </div>
    );
  }

  // ─── Modo STACK o ICON: el SVG completo apilado ───
  const vb = !showText
    ? VB.icon
    : showSubtitle
      ? VB.full
      : VB.noSub;

  const ar = vb.w / vb.h;
  const w = Math.round(h * ar);

  return (
    <div
      className={className}
      style={{ display: "inline-block", width: w, height: h, ...style }}
    >
      {animated && (
        <style>{`
          @keyframes zfr-embIn-${uid} {
            from { opacity:0; transform:scale(.92) translateY(18px); }
            60%  { opacity:1; }
            to   { opacity:1; transform:none; }
          }
          @keyframes zfr-glow-${uid} {
            0%,100% { filter:drop-shadow(0 0 7px rgba(38,230,248,.35)); }
            50%     { filter:drop-shadow(0 0 16px rgba(38,230,248,.6)); }
          }
          @keyframes zfr-fadeUp-${uid} {
            from { opacity:0; transform:translateY(22px); }
            to   { opacity:1; transform:none; }
          }
          @keyframes zfr-nodeIn-${uid} {
            from { opacity:0; transform:scale(.3); }
            to   { opacity:.55; transform:scale(1); }
          }
          @keyframes zfr-npulse-${uid} {
            0%,100% { opacity:.4; transform:scale(1); }
            50%     { opacity:.8; transform:scale(1.35); }
          }
          @keyframes zfr-sweep-${uid} {
            0%   { transform:translateX(-620px); }
            22%  { transform:translateX(620px); }
            100% { transform:translateX(620px); }
          }

          .zfr-emb-${uid} {
            opacity:0;
            transform-origin:490px 410px;
            animation:
              zfr-embIn-${uid}  1.1s .15s cubic-bezier(.2,.8,.25,1) forwards,
              zfr-glow-${uid}   4.5s 1.6s ease-in-out infinite;
          }
          .zfr-wm-${uid} {
            opacity:0;
            animation:zfr-fadeUp-${uid} .85s .9s cubic-bezier(.2,.8,.25,1) forwards;
            filter:drop-shadow(0 0 8px rgba(30,220,240,.28));
          }
          .zfr-sub-${uid} {
            opacity:0;
            animation:zfr-fadeUp-${uid} .85s 1.25s cubic-bezier(.2,.8,.25,1) forwards;
          }

          .zfr-ng-${uid} {
            fill:#2fd4f5; opacity:0;
            transform-origin:center; transform-box:fill-box;
          }
          .zfr-ng-${uid}.g0 { animation:zfr-nodeIn-${uid} .4s 1.5s  forwards, zfr-npulse-${uid} 3s 2.2s ease-in-out infinite; }
          .zfr-ng-${uid}.g1 { animation:zfr-nodeIn-${uid} .4s 1.65s forwards, zfr-npulse-${uid} 3s 2.5s ease-in-out infinite; }
          .zfr-ng-${uid}.g2 { animation:zfr-nodeIn-${uid} .4s 1.8s  forwards, zfr-npulse-${uid} 3s 2.8s ease-in-out infinite; }
          .zfr-ng-${uid}.g3 { animation:zfr-nodeIn-${uid} .4s 1.95s forwards, zfr-npulse-${uid} 3s 3.1s ease-in-out infinite; }

          .zfr-shine-${uid} {
            transform:translateX(-620px);
            animation:zfr-sweep-${uid} 5s 2.2s ease-in-out infinite;
          }

          @media (prefers-reduced-motion:reduce) {
            .zfr-emb-${uid},.zfr-wm-${uid},.zfr-sub-${uid} {
              opacity:1!important; transform:none!important; animation:none!important;
            }
            .zfr-ng-${uid} { opacity:.5!important; animation:none!important; }
            .zfr-shine-${uid} { animation:none!important; }
          }
        `}</style>
      )}

      <svg
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Zefirus"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`${uid}-gE`} x1="0" y1="250" x2="120" y2="590" gradientUnits="userSpaceOnUse">
            <stop offset="0"   stopColor="#28eefb" />
            <stop offset=".45" stopColor="#23d9ea" />
            <stop offset=".8"  stopColor="#17a5ec" />
            <stop offset="1"   stopColor="#1490f0" />
          </linearGradient>
          <linearGradient id={`${uid}-gS`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0"  stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".55" />
            <stop offset="1"  stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id={`${uid}-sf`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>

        {/* Halos de nodos */}
        <g filter={`url(#${uid}-sf)`}>
          <circle className={animated?`zfr-ng-${uid} g0`:undefined} cx="613" cy="405" r="19" fill="#2fd4f5" opacity={animated?undefined:"0.5"} />
          <circle className={animated?`zfr-ng-${uid} g1`:undefined} cx="699" cy="395" r="19" fill="#2fd4f5" opacity={animated?undefined:"0.5"} />
          <circle className={animated?`zfr-ng-${uid} g2`:undefined} cx="562" cy="462" r="19" fill="#2fd4f5" opacity={animated?undefined:"0.5"} />
          <circle className={animated?`zfr-ng-${uid} g3`:undefined} cx="646" cy="469" r="19" fill="#2fd4f5" opacity={animated?undefined:"0.5"} />
        </g>

        {/* Emblema */}
        <g className={animated?`zfr-emb-${uid}`:undefined} style={!animated?{opacity:1}:undefined}>
          <g transform="translate(0,1024) scale(0.1,-0.1)">
            {EMB_PATHS.map((d, i) => <path key={i} d={d} fill={`url(#${uid}-gE)`} />)}
          </g>
          <g mask={`url(#${uid}-mE)`}>
            <rect className={animated?`zfr-shine-${uid}`:undefined} x="230" y="230" width="240" height="380" fill={`url(#${uid}-gS)`} />
          </g>
        </g>
        <mask id={`${uid}-mE`}>
          <g transform="translate(0,1024) scale(0.1,-0.1)">
            {EMB_PATHS.map((d, i) => <path key={i} d={d} fill="#fff" />)}
          </g>
        </mask>

        {/* Wordmark */}
        {showText && (
          <g className={animated?`zfr-wm-${uid}`:undefined}
             style={!animated?{opacity:1, filter:"drop-shadow(0 0 8px rgba(30,220,240,.28))"}:undefined}
             transform="translate(0,1024) scale(0.1,-0.1)">
            {WORD_PATHS.map((d, i) => <path key={i} d={d} fill="#1de4f2" />)}
          </g>
        )}

        {/* Subtitle */}
        {showText && showSubtitle && (
          <g className={animated?`zfr-sub-${uid}`:undefined}
             style={!animated?{opacity:1}:undefined}
             transform="translate(0,1024) scale(0.1,-0.1)">
            {SUB_PATHS.map((d, i) => <path key={i} d={d} fill="#1db5e2" />)}
          </g>
        )}
      </svg>
    </div>
  );
}

/**
 * EmblemSVG — SVG del emblema solo, con viewBox recortado.
 * Usado por el modo inline y por ZefirusIcon.
 */
function EmblemSVG({ uid, vb, animated = false }: { uid: string; vb: typeof VB.icon; animated?: boolean }) {
  return (
    <svg
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      width="100%"
      height="100%"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Zefirus emblem"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`${uid}-ig`} x1="0" y1="250" x2="120" y2="590" gradientUnits="userSpaceOnUse">
          <stop offset="0"   stopColor="#28eefb" />
          <stop offset=".45" stopColor="#23d9ea" />
          <stop offset=".8"  stopColor="#17a5ec" />
          <stop offset="1"   stopColor="#1490f0" />
        </linearGradient>
        {animated && (
          <filter id={`${uid}-isf`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        )}
      </defs>

      {/* Halos de nodos (simplificados, sin animación para icon mode) */}
      {animated && (
        <g filter={`url(#${uid}-isf)`}>
          <circle cx="613" cy="405" r="19" fill="#2fd4f5" opacity="0.5" />
          <circle cx="699" cy="395" r="19" fill="#2fd4f5" opacity="0.5" />
          <circle cx="562" cy="462" r="19" fill="#2fd4f5" opacity="0.5" />
          <circle cx="646" cy="469" r="19" fill="#2fd4f5" opacity="0.5" />
        </g>
      )}

      <g transform="translate(0,1024) scale(0.1,-0.1)">
        {EMB_PATHS.map((d, i) => <path key={i} d={d} fill={`url(#${uid}-ig)`} />)}
      </g>
    </svg>
  );
}

/**
 * ZefirusIcon — Solo el emblema sin texto. Para favicons, avatares, etc.
 */
export function ZefirusIcon({ size = 24 }: { size?: number }) {
  const uid = React.useId().replace(/:/g, "");
  const vb = VB.icon;
  return <EmblemSVG uid={uid} vb={vb} />;
}


/* ═══════════════════════════════════════════════════════
 *  PATH DATA — extraído del HTML vectorizado oficial.
 *  Separado para no ensuciar el JSX.
 * ═══════════════════════════════════════════════════════ */

const EMB_PATHS = [
  // Path 1: Z principal + flecha + cola
  `M6850 7659 c-223 -59 -451 -120 -507 -135 -57 -14 -103 -30 -103 -35
0 -5 54 -56 120 -115 67 -59 119 -111 118 -115 -9 -25 -463 -524 -623 -685
-270 -271 -465 -412 -751 -544 -119 -55 -252 -101 -649 -225 -82 -26 -188 -62
-234 -81 -47 -19 -87 -32 -89 -29 -5 4 35 50 273 315 198 220 477 534 638 717
l152 172 169 0 c159 1 168 0 155 -16 -14 -18 -105 -120 -308 -348 -64 -71
-134 -150 -156 -175 -22 -26 -95 -108 -162 -184 -118 -131 -136 -156 -112
-156 16 0 227 86 254 104 19 12 284 307 782 870 24 26 43 52 43 57 0 6 -369 8
-942 7 l-943 -3 -75 -23 c-131 -41 -205 -86 -311 -191 -105 -106 -319 -348
-319 -362 0 -5 288 -10 670 -11 l670 -3 -58 -66 c-31 -36 -146 -165 -254 -286
-109 -122 -259 -290 -334 -375 -76 -84 -214 -238 -308 -341 -242 -267 -316
-374 -404 -586 -42 -102 -92 -258 -92 -287 0 -11 17 -14 73 -14 l73 0 38 118
c50 150 148 343 230 453 214 284 513 465 1006 609 477 140 752 266 1033 474
168 124 412 364 697 686 95 107 216 244 269 303 53 59 97 114 99 121 1 7 -30
41 -70 76 -40 34 -74 66 -76 70 -2 4 21 13 50 20 29 7 161 41 293 76 131 35
240 62 241 61 2 -2 -3 -39 -46 -327 -17 -118 -34 -228 -38 -243 l-7 -28 -73
67 c-39 36 -76 64 -81 62 -4 -2 -73 -75 -152 -163 -79 -89 -216 -241 -304
-339 -88 -98 -161 -182 -163 -186 -1 -4 10 -15 25 -25 15 -10 40 -29 55 -42
l26 -25 34 38 c398 448 481 539 493 539 7 0 61 -44 120 -98 58 -54 112 -96
118 -94 7 2 21 66 33 153 76 521 106 726 114 779 6 33 13 75 16 93 4 26 2 32
-13 31 -10 -1 -200 -50 -423 -110z m-1970 -894 l-122 -135 -580 0 -580 0 42
50 c90 107 196 177 313 206 38 9 185 13 550 13 l499 1 -122 -135z`,

  // Path 2: Grafo de red + detalles
  `M6990 6438 c-25 -5 -55 -10 -68 -12 -32 -5 -92 -70 -92 -100 0 -14
-4 -27 -8 -30 -11 -6 -440 -56 -486 -56 -31 0 -38 5 -55 39 -24 47 -35 51
-131 58 -59 4 -83 2 -108 -11 -47 -24 -56 -49 -57 -162 l-1 -100 -101 -116
c-140 -158 -152 -168 -218 -168 -59 0 -89 -10 -151 -52 -84 -55 -85 -170 -3
-257 49 -52 148 -67 207 -31 17 11 32 24 32 28 0 5 11 21 25 36 30 32 61 33
333 9 143 -12 192 -20 192 -30 0 -7 4 -13 9 -13 5 0 12 -16 15 -35 8 -40 49
-73 101 -82 41 -7 167 32 192 59 24 27 28 106 9 172 l-17 58 62 91 c46 67 261
369 273 383 0 1 27 -2 60 -6 63 -9 102 1 111 29 3 9 19 24 36 34 31 17 31 18
24 75 -4 31 -9 69 -10 84 -3 43 -44 95 -86 107 -20 6 -38 11 -40 10 -2 -1 -24
-5 -49 -11z m-135 -238 c-4 -6 -2 -17 4 -24 9 -11 -6 -40 -70 -132 -65 -94
-232 -328 -244 -342 -1 -1 -22 2 -46 9 -70 18 -116 -3 -154 -68 -36 -63 -22
-61 -292 -38 -208 18 -240 26 -249 62 -11 42 5 66 135 213 93 106 129 140 147
140 13 0 24 -4 24 -10 0 -5 21 -10 47 -10 36 0 57 7 95 33 26 17 48 38 48 45
0 6 4 12 9 12 5 0 11 13 14 28 6 32 -18 27 352 71 189 23 187 23 180 11z`,

  // Path 3: Base inferior de la Z
  `M5314 5566 c-70 -31 -318 -83 -479 -101 -117 -13 -331 -56 -430 -86
-180 -56 -330 -147 -463 -281 -93 -94 -144 -165 -207 -289 -41 -81 -105 -255
-105 -286 0 -12 136 -13 908 -11 l907 3 70 24 c100 33 177 73 246 128 78 61
373 399 365 418 -5 13 -113 15 -767 17 l-762 3 83 95 c46 52 88 98 94 101 6 3
58 12 116 18 194 23 506 99 517 127 7 18 -34 129 -49 131 -7 1 -27 -4 -44 -11z
m-804 -322 c0 -5 -75 -91 -197 -227 -29 -32 -53 -62 -53 -68 0 -5 292 -9 765
-9 675 0 765 -2 765 -15 0 -29 -132 -150 -206 -188 -132 -68 -113 -67 -966
-67 -682 0 -768 2 -768 15 0 23 57 132 98 190 59 82 153 174 227 225 89 60
120 76 225 116 85 33 110 39 110 28z`,
];

const WORD_PATHS = [
  // S (final)
  `M7593 3885 c-77 -21 -125 -49 -163 -91 -46 -53 -60 -93 -60 -171 0
-72 18 -115 63 -155 39 -34 139 -75 250 -102 167 -41 207 -67 207 -136 0 -113
-228 -136 -414 -40 -32 16 -62 30 -66 30 -3 0 -19 -27 -35 -60 -34 -71 -30
-79 60 -121 94 -45 191 -63 312 -56 91 4 113 9 168 36 129 64 181 176 143 305
-17 56 -82 119 -149 143 -30 12 -111 35 -180 53 -142 36 -177 57 -185 111 -5
28 -1 41 21 67 32 38 77 52 168 52 68 0 170 -27 211 -56 11 -8 23 -14 27 -14
4 0 19 29 35 65 33 80 31 84 -77 122 -93 32 -255 41 -336 18z`,
  // Z
  `M2210 3815 l0 -75 245 0 c208 0 245 -2 238 -14 -9 -15 -203 -252
-386 -470 l-118 -141 3 -60 3 -60 380 0 380 0 3 71 3 71 -87 7 c-48 4 -153 5
-233 1 -80 -3 -160 -2 -177 2 l-32 8 170 205 c93 113 208 251 254 307 l84 103
0 60 0 60 -365 0 -365 0 0 -75z`,
  // E
  `M3160 3440 l0 -450 338 2 337 3 3 73 3 72 -256 0 -255 0 0 120 0 120
220 0 220 0 0 70 0 70 -220 0 -220 0 0 110 0 110 245 0 245 0 0 75 0 75 -330
0 -330 0 0 -450z`,
  // F
  `M4065 3878 c-3 -7 -4 -209 -3 -448 l3 -435 85 0 85 0 3 173 2 172
221 0 220 0 -3 73 -3 72 -217 3 -218 2 0 125 0 125 245 0 245 0 0 75 0 75
-330 0 c-255 0 -332 -3 -335 -12z`,
  // I
  `M4935 3878 c-3 -7 -4 -209 -3 -448 l3 -435 85 0 85 0 3 448 2 447
-85 0 c-59 0 -87 -4 -90 -12z`,
  // R
  `M5382 3443 l3 -448 85 0 85 0 3 133 3 132 112 -1 112 0 90 -132 90
-132 94 -3 c83 -2 93 -1 87 14 -3 9 -47 74 -96 144 -50 71 -90 132 -90 137 0
4 20 20 44 34 46 28 95 92 114 148 17 48 15 159 -4 214 -19 56 -83 131 -135
157 -77 40 -152 50 -382 50 l-217 0 2 -447z m493 270 c54 -29 75 -67 75 -140
0 -72 -24 -114 -79 -143 -35 -17 -59 -20 -176 -20 l-135 0 0 166 0 166 138 -4
c116 -3 143 -7 177 -25z`,
  // U
  `M6357 3883 c-11 -11 -8 -535 4 -598 15 -84 46 -142 104 -201 77 -77
139 -98 290 -99 116 0 123 1 187 33 80 39 138 101 170 181 22 54 23 70 26 374
l3 317 -85 0 -85 0 -3 -302 c-3 -284 -4 -306 -24 -342 -30 -59 -80 -95 -145
-105 -110 -18 -199 20 -243 105 -20 37 -21 58 -24 342 l-3 302 -83 0 c-45 0
-86 -3 -89 -7z`,
];

const SUB_PATHS = [
  // S
  `M2685 2718 c-31 -17 -45 -39 -45 -73 0 -40 21 -59 90 -82 42 -14 55
-23 55 -38 0 -16 -8 -21 -39 -23 -21 -2 -52 2 -68 9 -25 10 -31 10 -39 -2 -14
-22 -11 -27 21 -44 65 -34 173 -10 186 42 13 51 -6 76 -73 98 -76 25 -92 38
-72 61 11 13 24 15 71 10 54 -7 58 -6 58 14 0 35 -97 55 -145 28z`,
  // O
  `M2972 2711 c-64 -41 -86 -108 -58 -174 23 -54 59 -80 119 -85 96 -8
157 47 157 141 0 42 -5 53 -38 89 -35 37 -45 42 -93 45 -42 3 -61 0 -87 -16z
m113 -41 c31 -12 55 -64 48 -103 -7 -37 -48 -67 -90 -67 -89 0 -117 125 -38
168 25 14 47 15 80 2z`,
  // F
  `M3265 2717 c-3 -7 -4 -69 -3 -138 l3 -124 28 -3 c26 -3 27 -2 27 47
l0 50 63 3 c55 3 62 5 65 25 3 20 -1 22 -60 25 l-63 3 -3 37 -3 37 73 3 c65 3
73 5 73 23 0 18 -8 20 -98 23 -74 2 -99 0 -102 -11z`,
  // T
  `M3510 2705 c0 -23 4 -25 40 -25 l40 0 0 -115 0 -115 30 0 29 0 3 113
3 112 43 3 c38 3 43 6 40 25 -3 21 -8 22 -115 25 l-113 3 0 -26z`,
  // W
  `M3780 2708 c1 -13 18 -75 38 -138 37 -111 39 -115 69 -118 30 -3 31
-2 58 82 15 48 31 86 34 86 4 0 20 -37 37 -82 27 -78 31 -83 58 -83 29 0 30 3
73 130 42 128 44 150 7 143 -12 -2 -26 -29 -47 -91 -16 -49 -33 -85 -37 -80
-4 4 -20 45 -35 91 -25 77 -29 83 -52 80 -22 -3 -29 -14 -53 -81 -27 -78 -36
-94 -45 -86 -2 3 -17 41 -32 85 -23 64 -32 80 -50 82 -18 3 -23 -1 -23 -20z`,
  // A
  `M4317 2703 c-29 -55 -107 -233 -107 -243 0 -6 11 -10 25 -10 17 0 29
9 40 30 15 29 18 30 81 30 63 0 65 -1 75 -30 9 -24 17 -30 40 -30 16 0 29 2
29 4 0 2 -27 64 -59 137 -52 116 -63 134 -85 137 -19 2 -28 -4 -39 -25z m73
-130 c0 -8 -14 -13 -40 -13 -22 0 -40 2 -40 4 0 8 29 72 36 79 8 8 43 -48 44
-70z`,
  // R
  `M4556 2714 c-8 -20 -8 -125 0 -203 6 -56 9 -61 30 -61 21 0 24 5 24
40 0 39 1 40 34 40 28 0 38 -6 60 -40 19 -29 33 -40 51 -40 30 0 31 16 5 50
-25 31 -25 36 0 67 22 28 26 83 9 115 -16 30 -70 48 -143 48 -49 0 -65 -4 -70
-16z m152 -50 c47 -33 14 -84 -55 -84 l-43 0 0 50 0 50 38 0 c21 0 48 -7 60
-16z`,
  // E
  `M4867 2724 c-4 -4 -7 -67 -7 -141 l0 -133 105 0 105 0 0 25 c0 24 -2
25 -75 25 l-75 0 0 35 0 35 65 0 c58 0 65 2 65 20 0 16 -8 19 -62 22 -63 3
-63 3 -66 36 l-3 32 71 0 c68 0 71 1 68 23 -3 21 -8 22 -93 25 -50 1 -94 0
-98 -4z`,
  // P
  `M5280 2591 l0 -141 24 0 c20 0 24 6 30 40 6 40 6 40 52 40 86 0 137
53 118 122 -15 52 -54 72 -145 77 l-79 3 0 -141z m161 68 c15 -24 10 -58 -10
-69 -11 -5 -38 -10 -60 -10 -40 0 -41 1 -41 34 0 61 8 69 58 63 24 -3 48 -11
53 -18z`,
  // L
  `M5580 2590 l0 -141 98 3 c89 3 97 5 97 23 0 18 -8 20 -67 23 l-68 3
-1 37 c0 20 -2 71 -2 112 -2 74 -2 75 -29 78 l-28 3 0 -141z`,
  // A
  `M5916 2708 c-14 -21 -116 -245 -116 -254 0 -2 13 -4 29 -4 22 0 31 6
41 30 13 30 14 31 79 28 61 -3 67 -5 79 -30 9 -19 21 -28 38 -28 13 0 24 4 24
10 0 12 -100 240 -113 258 -15 19 -45 14 -61 -10z m54 -98 c11 -21 20 -42 20
-45 0 -3 -18 -5 -40 -5 -22 0 -40 4 -40 10 0 10 32 80 37 80 1 0 12 -18 23
-40z`,
  // T
  `M6110 2705 c0 -23 4 -25 40 -25 l39 0 3 -112 3 -113 28 -3 27 -3 0
115 0 115 43 3 c34 2 42 7 42 23 0 19 -8 20 -112 23 l-113 3 0 -26z`,
  // F
  `M6407 2723 c-4 -3 -7 -67 -7 -140 l0 -134 28 3 c25 3 27 7 30 50 l3
47 57 3 c50 3 57 6 60 25 3 20 -1 22 -55 25 l-58 3 -3 38 -3 37 70 0 c69 0 71
1 71 25 0 25 0 25 -93 25 -52 0 -97 -3 -100 -7z`,
  // O
  `M6730 2712 c-97 -49 -106 -186 -15 -242 68 -42 179 -16 212 50 17 34
16 105 -2 140 -18 35 -81 70 -127 70 -18 0 -49 -8 -68 -18z m112 -43 c11 -6
26 -26 34 -45 12 -30 12 -39 0 -69 -8 -19 -26 -40 -40 -46 -34 -16 -92 -3
-111 24 -17 25 -20 79 -4 108 18 35 81 49 121 28z`,
  // R
  `M7017 2709 c-3 -12 -3 -75 0 -140 6 -116 7 -119 30 -119 20 0 23 5
23 40 0 39 1 40 35 40 29 0 39 -6 61 -40 19 -28 34 -40 50 -40 29 0 30 9 3 55
l-22 36 21 22 c30 33 35 61 18 102 -19 46 -64 65 -150 65 -57 0 -64 -2 -69
-21z m158 -49 c40 -33 4 -80 -61 -80 l-44 0 0 43 c0 24 3 47 8 51 10 11 80 0
97 -14z`,
  // M
  `M7327 2724 c-4 -4 -7 -67 -7 -141 l0 -133 30 0 29 0 3 78 3 77 39
-63 c24 -40 44 -62 54 -60 8 2 31 32 51 68 l36 65 3 -83 3 -83 27 3 27 3 0
135 c0 131 -1 135 -21 138 -18 3 -32 -13 -74 -83 -29 -48 -56 -83 -60 -78 -5
4 -28 42 -52 83 -42 70 -71 94 -91 74z`,
];
