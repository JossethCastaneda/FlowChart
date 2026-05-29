"use client";

import React, { useState, useEffect } from "react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<{
    type: "idle" | "connecting" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "Awaiting authentication..." });

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleFacebookLogin() {
    setIsLoading(true);
    setStatus({
      type: "connecting",
      message: "Establishing hyperspace connection...",
    });
    const { signIn } = await import("next-auth/react");
    try {
      await signIn("facebook", { callbackUrl: "/dashboard/resumen" });
    } catch {
      setIsLoading(false);
      setStatus({ type: "error", message: "⚠ Connection failed. Retry." });
    }
  }

  return (
    <div className="login-page">
      {/* Starfield */}
      <StarfieldCanvas />

      {/* Animated nebula gradients */}
      <div className="nebula nebula-1" />
      <div className="nebula nebula-2" />
      <div className="nebula nebula-3" />

      {/* Grid overlay */}
      <div className="grid-overlay" />

      {/* Scanlines */}
      <div className="scanlines" />

      {/* Main content */}
      <div className={`login-wrapper ${mounted ? "is-visible" : ""}`}>
        {/* Decorative corner brackets */}
        <div className="corner-brackets">
          <span className="corner tl" />
          <span className="corner tr" />
          <span className="corner bl" />
          <span className="corner br" />
        </div>

        {/* Card */}
        <div className="login-card">
          {/* Top accent line */}
          <div className="card-accent-top" />

          {/* Logo section */}
          <div className="logo-section">
            <div className="logo-icon">
              <svg viewBox="0 0 40 40" className="logo-diamond">
                <path d="M20 2 L38 20 L20 38 L2 20 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M20 8 L32 20 L20 32 L8 20 Z" fill="currentColor" opacity="0.3" />
                <circle cx="20" cy="20" r="4" fill="currentColor" />
              </svg>
              <div className="logo-icon-glow" />
            </div>

            <h1 className="logo-text">SODARE</h1>
            <div className="logo-underline">
              <span className="line-segment" />
              <span className="line-diamond">◆</span>
              <span className="line-segment" />
            </div>
            <p className="logo-subtitle">MULTICHANNEL INTELLIGENCE</p>
          </div>

          {/* Tagline */}
          <p className="tagline">Navigate the Marketing Galaxy</p>

          {/* Facebook button */}
          <button
            onClick={handleFacebookLogin}
            disabled={isLoading}
            className="fb-btn"
          >
            <div className="fb-btn-bg" />
            <div className="fb-btn-content">
              {!isLoading ? (
                <>
                  <svg viewBox="0 0 24 24" className="fb-icon">
                    <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                  </svg>
                  <span>{status.type === "error" ? "RETRY CONNECTION" : "CONNECT WITH FACEBOOK"}</span>
                </>
              ) : (
                <>
                  <span>ESTABLISHING CONNECTION</span>
                  <span className="loader-dots">
                    <i /><i /><i />
                  </span>
                </>
              )}
            </div>
          </button>

          {/* Divider */}
          <div className="divider-or">
            <span className="divider-line" />
            <span className="divider-text">OR</span>
            <span className="divider-line" />
          </div>

          {/* Phase 2 */}
          <div className="phase2-notice">
            <span className="phase2-bracket">[</span>
            <span>Email / Password — Phase 2</span>
            <span className="phase2-bracket">]</span>
          </div>

          {/* Status */}
          <div className="status-section">
            <div className="status-line" />
            <div className="status-content">
              <span className={`status-dot status-${status.type}`} />
              <span className={`status-msg status-${status.type}`}>
                {status.message}
              </span>
            </div>
          </div>

          {/* Bottom accent */}
          <div className="card-accent-bottom" />
        </div>

        {/* Version footer */}
        <div className="version-footer">
          <span className="vf-line" />
          <span className="vf-text">
            v{process.env.NEXT_PUBLIC_APP_VERSION || "2.0.0"} — &quot;{process.env.NEXT_PUBLIC_APP_CODENAME || "The Empire Strikes Back"}&quot;
          </span>
          <span className="vf-line" />
        </div>
        <p className="copyright">© 2025 Sodare · All Systems Operational</p>
      </div>
    </div>
  );
}

/* ─── Starfield ──────────────────────────────────── */
function StarfieldCanvas() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    interface Star {
      x: number; y: number; r: number; speed: number;
      opacity: number; twinkle: number; offset: number;
    }
    const stars: Star[] = [];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }

    resize();
    for (let i = 0; i < 300; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.8 + 0.1,
        speed: Math.random() * 0.4 + 0.02,
        opacity: Math.random() * 0.8 + 0.2,
        twinkle: Math.random() * 0.03 + 0.005,
        offset: Math.random() * Math.PI * 2,
      });
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = Date.now() / 1000;
      for (const s of stars) {
        const tw = Math.sin(t * s.twinkle * 60 + s.offset) * 0.35 + 0.65;
        const a = s.opacity * tw;
        // Glow for bigger stars
        if (s.r > 1) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(150, 200, 255, ${a * 0.08})`;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 230, 255, ${a})`;
        ctx.fill();
        s.y += s.speed;
        if (s.y > canvas.height) { s.y = -2; s.x = Math.random() * canvas.width; }
      }
      animId = requestAnimationFrame(draw);
    }

    draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="starfield" />;
}
