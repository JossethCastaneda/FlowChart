"use client";

import React from "react";

/**
 * ORBI — mascota/copiloto de Sodare.
 * SVG/CSS puro, sin assets externos. Respeta prefers-reduced-motion.
 *
 * Uso:
 *   <Orbi scale={0.82} />
 */
type OrbiState = "idle" | "thinking" | "success" | "error" | "working";

const STATE_COLORS: Record<OrbiState, { accent: string; shadow: string; edge: string }> = {
  idle: {
    accent: "var(--cyan)",
    shadow: "rgba(0,200,255,0.5)",
    edge: "rgba(0,212,255,0.5)",
  },
  thinking: {
    accent: "var(--amber)",
    shadow: "rgba(255,190,11,0.5)",
    edge: "rgba(255,190,11,0.5)",
  },
  success: {
    accent: "var(--emerald)",
    shadow: "rgba(6,214,160,0.5)",
    edge: "rgba(6,214,160,0.5)",
  },
  error: {
    accent: "var(--red)",
    shadow: "rgba(255,45,85,0.5)",
    edge: "rgba(255,45,85,0.5)",
  },
  working: {
    accent: "var(--purple)",
    shadow: "rgba(123,97,255,0.5)",
    edge: "rgba(123,97,255,0.5)",
  }
};

interface OrbiProps {
  state?: OrbiState;
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Orbi({ state = "idle", scale = 1, className = "", style }: OrbiProps) {
  const colors = STATE_COLORS[state];

  return (
    <div 
      style={{ transform: `scale(${scale})`, transformOrigin: "top left", flex: "none", ...style }}
      className={className}
    >
      <style>{`
        @keyframes orbi-float { 0%,100%{transform:translateY(0) rotate(-2deg);} 50%{transform:translateY(-14px) rotate(2deg);} }
        @keyframes orbi-blink { 0%,90%,100%{transform:scaleY(1);} 94%{transform:scaleY(0.08);} 97%{transform:scaleY(1);} }
        @keyframes orbi-look { 0%,22%{transform:translateX(0);} 38%,52%{transform:translateX(6px);} 68%,84%{transform:translateX(-6px);} 100%{transform:translateX(0);} }
        @keyframes orbi-glow { 0%,100%{opacity:.45;} 50%{opacity:.9;} }
        @keyframes orbi-tip { 0%,100%{opacity:.35;} 50%{opacity:1;} }
        @keyframes orbi-hover { 0%,100%{opacity:.28;transform:scaleX(.9);} 50%{opacity:.62;transform:scaleX(1.14);} }
        @keyframes orbi-pulse { 0%,100%{opacity:1;} 50%{opacity:.35;} }
        @media (prefers-reduced-motion: reduce){ .orbi-root *{animation:none !important;} }
      `}</style>
      <div 
        className="orbi-root" 
        style={{ 
          animation: "orbi-float 5.5s ease-in-out infinite",
          "--orbi-accent": colors.accent,
          "--orbi-shadow": colors.shadow,
          "--orbi-edge": colors.edge,
        } as React.CSSProperties}
      >
        <div style={{ position: "relative", width: 176, height: 200 }}>
          <div style={{ position: "absolute", left: 33, top: 185, width: 110, height: 15, borderRadius: "50%", background: "radial-gradient(ellipse,var(--orbi-shadow),transparent 70%)", filter: "blur(5px)", animation: "orbi-hover 5.5s ease-in-out infinite" }} />
          <div style={{ position: "absolute", left: 64, top: 14, width: 2.5, height: 30, borderRadius: 2, background: "linear-gradient(var(--orbi-accent),#0080ff)", transform: "rotate(20deg)", transformOrigin: "bottom center" }} />
          <div style={{ position: "absolute", left: 50, top: 6, width: 9, height: 9, borderRadius: "50%", background: "var(--orbi-accent)", boxShadow: "0 0 9px var(--orbi-accent)", animation: "orbi-tip 1.9s ease-in-out infinite" }} />
          <div style={{ position: "absolute", left: 109, top: 14, width: 2.5, height: 30, borderRadius: 2, background: "linear-gradient(var(--orbi-accent),#0080ff)", transform: "rotate(-20deg)", transformOrigin: "bottom center" }} />
          <div style={{ position: "absolute", left: 117, top: 6, width: 9, height: 9, borderRadius: "50%", background: "var(--orbi-accent)", boxShadow: "0 0 9px var(--orbi-accent)", animation: "orbi-tip 2.3s ease-in-out infinite .4s" }} />
          <div style={{ position: "absolute", left: 4, top: 86, width: 18, height: 34, borderRadius: 9, background: "linear-gradient(#101c3a,#050b18)", border: "2px solid var(--orbi-edge)", boxShadow: "0 0 12px rgba(0,0,0,0.18)" }} />
          <div style={{ position: "absolute", left: 154, top: 86, width: 18, height: 34, borderRadius: 9, background: "linear-gradient(#101c3a,#050b18)", border: "2px solid var(--orbi-edge)", boxShadow: "0 0 12px rgba(0,0,0,0.18)" }} />
          <div style={{ position: "absolute", left: 18, top: 40, width: 140, height: 122, borderRadius: 48, background: "linear-gradient(160deg,#13243f,#060d1c)", border: "2.5px solid var(--orbi-edge)", boxShadow: "0 0 26px var(--orbi-shadow),inset 0 2px 0 rgba(255,255,255,0.12),inset 0 -10px 24px rgba(0,0,0,0.5)" }} />
          <div style={{ position: "absolute", left: 44, top: 50, width: 88, height: 12, borderRadius: 7, background: "rgba(255,255,255,0.05)" }} />
          <div style={{ position: "absolute", left: 38, top: 64, width: 100, height: 62, borderRadius: 31, background: "#02060f", border: "1.5px solid var(--orbi-edge)", boxShadow: "inset 0 0 18px rgba(0,0,0,0.8)", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: "50%", top: "50%", width: 78, height: 78, margin: "-39px 0 0 -39px", borderRadius: "50%", background: "radial-gradient(circle,var(--orbi-shadow),transparent 65%)", animation: "orbi-glow 3s ease-in-out infinite" }} />
            <div style={{ position: "absolute", left: "50%", top: "50%", width: 42, height: 42, margin: "-21px 0 0 -21px", animation: "orbi-blink 5.5s ease-in-out infinite" }}>
              <div style={{ width: "100%", height: "100%", animation: "orbi-look 7s ease-in-out infinite" }}>
                <div style={{ position: "absolute", left: 3, top: 3, width: 36, height: 36, borderRadius: "50%", background: "radial-gradient(circle at 38% 38%,#c8faff,var(--orbi-accent) 38%,#0066d6)", boxShadow: "0 0 14px var(--orbi-shadow)" }} />
                <div style={{ position: "absolute", left: 9, top: 8, width: 10, height: 10, borderRadius: "50%", background: "#eafdff" }} />
              </div>
            </div>
          </div>
          <div style={{ position: "absolute", left: 78, top: 131, width: 20, height: 22, clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)", background: "linear-gradient(135deg,var(--orbi-accent),#0080ff)", boxShadow: "0 0 10px var(--orbi-shadow)" }} />
          <div style={{ position: "absolute", left: 80.5, top: 134, width: 15, height: 16, clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)", background: "#060f1e" }} />
          <div style={{ position: "absolute", left: 85, top: 139, width: 6, height: 6, borderRadius: "50%", background: "var(--orbi-accent)", boxShadow: "0 0 6px var(--orbi-accent)", animation: "orbi-pulse 2s ease-in-out infinite" }} />
        </div>
      </div>
    </div>
  );
}
