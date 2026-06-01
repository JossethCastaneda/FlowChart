"use client";

import React, { useState, useEffect } from "react";
import { SodareLogo } from "@/components/ui/SodareLogo";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [credError, setCredError] = useState("");
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

  async function handleGoogleLogin() {
    setIsLoading(true);
    setStatus({
      type: "connecting",
      message: "Establishing hyperspace connection...",
    });
    const { signIn } = await import("next-auth/react");
    try {
      await signIn("google", { callbackUrl: "/dashboard/resumen" });
    } catch {
      setIsLoading(false);
      setStatus({ type: "error", message: "⚠ Connection failed. Retry." });
    }
  }

  async function handleCredentialsLogin() {
    if (!email || !password) {
      setCredError("Completa todos los campos");
      return;
    }
    setIsLoading(true);
    setCredError("");
    setStatus({ type: "connecting", message: "Authenticating..." });
    const { signIn } = await import("next-auth/react");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (result?.error) {
      setIsLoading(false);
      setCredError("Email o contraseña incorrectos");
      setStatus({ type: "error", message: "Authentication failed" });
      return;
    }
    setStatus({ type: "success", message: "Access granted" });
    window.location.href = "/dashboard/resumen";
  }

  async function handleRegister() {
    if (!name || !email || !password) {
      setCredError("Completa todos los campos");
      return;
    }
    if (password.length < 8) {
      setCredError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setCredError("Las contraseñas no coinciden");
      return;
    }
    setIsLoading(true);
    setCredError("");
    setStatus({ type: "connecting", message: "Creating account..." });
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setIsLoading(false);
      setCredError(data.error || "Error al registrar");
      setStatus({ type: "error", message: "Registration failed" });
      return;
    }
    // Auto-login después del registro
    const { signIn } = await import("next-auth/react");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (result?.error) {
      setIsLoading(false);
      setCredError("Cuenta creada. Inicia sesión.");
      setIsRegister(false);
      setStatus({ type: "idle", message: "Awaiting authentication..." });
      return;
    }
    setStatus({ type: "success", message: "Access granted" });
    window.location.href = "/dashboard/resumen";
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
            <SodareLogo size="xl" />
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

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="google-btn"
          >
            <div className="fb-btn-bg" />
            <div className="fb-btn-content">
              {!isLoading ? (
                <>
                  <svg viewBox="0 0 24 24" className="fb-icon" style={{ fill: "white" }}>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>CONNECT WITH GOOGLE</span>
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

          {/* Email/Password toggle */}
          {!showCredentials ? (
            <button
              onClick={() => setShowCredentials(true)}
              className="google-btn"
              style={{ opacity: 0.7 }}
            >
              <div className="fb-btn-bg" />
              <div className="fb-btn-content">
                <svg viewBox="0 0 24 24" className="fb-icon" style={{ fill: "white" }}>
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
                <span>LOGIN WITH EMAIL</span>
              </div>
            </button>
          ) : (
            <div style={{ width: "100%" }}>
              {/* Toggle login/register */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <button
                  onClick={() => { setIsRegister(false); setCredError(""); }}
                  style={{
                    flex: 1, padding: "8px", fontSize: "10px",
                    fontFamily: "'Orbitron', monospace", letterSpacing: "0.1em",
                    background: !isRegister ? "rgba(0,212,255,0.1)" : "transparent",
                    border: `1px solid ${!isRegister ? "rgba(0,212,255,0.4)" : "rgba(0,212,255,0.1)"}`,
                    color: !isRegister ? "#00d4ff" : "rgba(148,163,184,0.5)",
                    cursor: "pointer",
                  }}
                >
                  LOGIN
                </button>
                <button
                  onClick={() => { setIsRegister(true); setCredError(""); }}
                  style={{
                    flex: 1, padding: "8px", fontSize: "10px",
                    fontFamily: "'Orbitron', monospace", letterSpacing: "0.1em",
                    background: isRegister ? "rgba(0,212,255,0.1)" : "transparent",
                    border: `1px solid ${isRegister ? "rgba(0,212,255,0.4)" : "rgba(0,212,255,0.1)"}`,
                    color: isRegister ? "#00d4ff" : "rgba(148,163,184,0.5)",
                    cursor: "pointer",
                  }}
                >
                  REGISTER
                </button>
              </div>

              {/* Name (register only) */}
              {isRegister && (
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  style={{
                    width: "100%", padding: "10px 14px", marginBottom: "8px",
                    background: "rgba(0,212,255,0.03)",
                    border: "1px solid rgba(0,212,255,0.15)",
                    color: "white", fontSize: "13px", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              )}

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                style={{
                  width: "100%", padding: "10px 14px", marginBottom: "8px",
                  background: "rgba(0,212,255,0.03)",
                  border: "1px solid rgba(0,212,255,0.15)",
                  color: "white", fontSize: "13px", outline: "none",
                  boxSizing: "border-box",
                }}
              />

              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                onKeyDown={(e) => !isRegister && e.key === "Enter" && handleCredentialsLogin()}
                style={{
                  width: "100%", padding: "10px 14px", marginBottom: isRegister ? "8px" : "4px",
                  background: "rgba(0,212,255,0.03)",
                  border: "1px solid rgba(0,212,255,0.15)",
                  color: "white", fontSize: "13px", outline: "none",
                  boxSizing: "border-box",
                }}
              />

              {!isRegister && (
                <div style={{ textAlign: "right", marginBottom: "12px" }}>
                  <a
                    href="/forgot-password"
                    style={{
                      fontSize: "11px",
                      color: "rgba(0, 240, 255, 0.6)",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#00f0ff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(0, 240, 255, 0.6)"; }}
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
              )}

              {/* Confirm password (register only) */}
              {isRegister && (
                <input
                  type="password"
                  placeholder="Confirmar contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                  style={{
                    width: "100%", padding: "10px 14px", marginBottom: "12px",
                    background: "rgba(0,212,255,0.03)",
                    border: "1px solid rgba(0,212,255,0.15)",
                    color: "white", fontSize: "13px", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              )}

              {credError && (
                <p style={{ fontSize: "11px", color: "#ff2d55", marginBottom: "8px" }}>
                  {credError}
                </p>
              )}

              <button
                onClick={isRegister ? handleRegister : handleCredentialsLogin}
                disabled={isLoading}
                className="fb-btn"
                style={{ width: "100%" }}
              >
                <div className="fb-btn-bg" />
                <div className="fb-btn-content">
                  {!isLoading ? (
                    <span>{isRegister ? "CREATE ACCOUNT" : "LOGIN →"}</span>
                  ) : (
                    <>
                      <span>{isRegister ? "CREATING ACCOUNT" : "AUTHENTICATING"}</span>
                      <span className="loader-dots"><i /><i /><i /></span>
                    </>
                  )}
                </div>
              </button>
            </div>
          )}

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
