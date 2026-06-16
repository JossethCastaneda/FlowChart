"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { openConnectPopup } from "@/lib/connect-popup";
import { useLanguage } from "@/components/layout/LanguageContext";
import { SodareLogo } from "@/components/ui/SodareLogo";

// Los tipos de Window.FB y FbLoginResponse viven en types/facebook-sdk.d.ts

type AuthProviders = Record<string, unknown>;

function getSafeCallbackUrl() {
  if (typeof window === "undefined") return "/dashboard/resumen";
  const rawCallbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
  if (!rawCallbackUrl) return "/dashboard/resumen";
  if (rawCallbackUrl.startsWith("/")) return rawCallbackUrl;
  try {
    const callbackUrl = new URL(rawCallbackUrl);
    if (callbackUrl.origin === window.location.origin) {
      return `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`;
    }
  } catch {
    return "/dashboard/resumen";
  }
  return "/dashboard/resumen";
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<AuthProviders | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [credError, setCredError] = useState("");
  const [fbReady, setFbReady] = useState(false);
  const autoLoginAttempted = useRef(false);
  const [status, setStatus] = useState<{
    type: "idle" | "connecting" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "Esperando autenticación..." });

  useEffect(() => {
    let isActive = true;

    // Detect OAuth errors from NextAuth redirect (e.g., ?error=OAuthCallback)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("error");
      if (oauthError) {
        const errorMessages: Record<string, string> = {
          OAuthCallback: "Error al conectar con el proveedor. Verifica que las credenciales estén correctas.",
          OAuthSignin: "No se pudo iniciar la autenticación con el proveedor.",
          OAuthAccountNotLinked: "Este email ya está vinculado a otro método de inicio de sesión.",
          AccessDenied: "Acceso denegado. No tienes permisos para acceder.",
          Verification: "El enlace de verificación ha expirado o ya fue utilizado.",
          Configuration: "Error de configuración del servidor de autenticación.",
          Default: `Error de autenticación: ${oauthError}`,
        };
        setStatus({
          type: "error",
          message: errorMessages[oauthError] || errorMessages.Default,
        });
        window.history.replaceState({}, "", "/login");
      }
    }

    async function loadProviders() {
      try {
        const res = await fetch("/api/auth/providers");
        if (!res.ok) throw new Error("Unable to load providers");
        const data = await res.json();
        if (isActive) setProviders(data || {});
      } catch {
        if (isActive) {
          setProviders({});
          setStatus({
            type: "error",
            message: "No se pudo verificar la configuración de login.",
          });
        }
      }
    }

    loadProviders();

    // ── Cargar FB SDK ──────────────────────────────────────────
    // Sin fallback hardcodeado: si falta el env, no se carga el SDK y el
    // botón usa el flujo redirect de NextAuth (que valida config en servidor).
    const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
    if (!APP_ID) {
      console.error("[LOGIN] NEXT_PUBLIC_META_APP_ID no configurado — SDK de Facebook deshabilitado, se usará redirect OAuth.");
      return () => { isActive = false; };
    }

    const initSdk = () => {
      window.FB!.init({
        appId: APP_ID,
        cookie: true,
        xfbml: false,
        version: process.env.NEXT_PUBLIC_FB_API_VERSION || "v25.0",
      });
      window.FB!.AppEvents.logPageView();
      if (isActive) setFbReady(true);
    };

    if (window.FB) {
      // SDK ya cargado (p.ej. hot-reload / segunda visita)
      initSdk();
    } else {
      window.fbAsyncInit = initSdk;
      if (!document.getElementById("facebook-jssdk")) {
        const js = document.createElement("script");
        js.id = "facebook-jssdk";
        js.src = "https://connect.facebook.net/en_US/sdk.js";
        js.async = true;
        document.head.appendChild(js);
      }
    }

    return () => { isActive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Autenticar con el accessToken obtenido del SDK ──────────
  async function handleFbTokenInternal(accessToken: string) {
    setIsLoading(true);
    setStatus({ type: "connecting", message: "Autenticando con Facebook..." });
    const { signIn } = await import("next-auth/react");
    console.log("[FB LOGIN] Calling NextAuth signIn with facebook-sdk credentials provider...");
    const result = await signIn("facebook-sdk", {
      accessToken,
      redirect: false,
    });
    console.log("[FB LOGIN] NextAuth signIn result:", JSON.stringify(result));
    if (!result?.ok || result?.error) {
      setIsLoading(false);
      let errorMsg = "";
      if (result?.error === "MetaRateLimit") {
        errorMsg = " (Límite de peticiones de Meta alcanzado. Espera 60 minutos sin reintentar para permitir que se restablezca)";
      } else {
        errorMsg = result?.error ? ` (${result.error})` : `. Intenta de nuevo`;
      }
      setStatus({
        type: "error",
        message: `Error al autenticar con Facebook${errorMsg}.`
      });
      return;
    }
    setStatus({ type: "success", message: "Acceso autorizado" });
    window.location.href = getSafeCallbackUrl();
  }

  const providerStatusLoaded = providers !== null;
  const hasFacebookProvider = Boolean(providers?.facebook);
  const hasGoogleProvider = Boolean(providers?.google);

  async function handleFacebookLogin() {
    if (!hasFacebookProvider) {
      setStatus({
        type: "error",
        message: "Facebook Login no está configurado en este entorno.",
      });
      return;
    }

    setIsLoading(true);
    setStatus({ type: "connecting", message: "Conectando con Facebook..." });
    
    // Abrimos el popup de forma síncrona para evitar que el navegador lo bloquee
    const w = 520, h = 660;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    const features = `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`;
    const popup = window.open("", "connect_oauth", features);
    if (popup) popup.document.write("<div style='font-family:sans-serif;padding:20px'>Cargando...</div>");

    const { signIn } = await import("next-auth/react");
    try {
      const result = await signIn("facebook", {
        callbackUrl: window.location.origin + "/connect/done?module=login",
        redirect: false,
      });

      if (result?.url) {
        if (popup) {
          popup.location.href = result.url;
          
          const handler = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === "CONNECT_DONE") {
              window.removeEventListener("message", handler);
              if (event.data.module === "login") {
                setStatus({ type: "success", message: "Acceso autorizado" });
                window.location.href = getSafeCallbackUrl();
              }
              popup.close();
            }
          };
          window.addEventListener("message", handler);

          const timer = setInterval(() => {
            if (popup.closed) {
              clearInterval(timer);
              window.removeEventListener("message", handler);
              setIsLoading(false);
              setStatus({ type: "idle", message: "Inicio de sesión cancelado." });
            }
          }, 500);
        } else {
          // Fallback si se bloqueó
          window.location.href = result.url;
        }
      } else if (result?.error) {
        if (popup) popup.close();
        throw new Error(result.error);
      }
    } catch {
      if (popup && !popup.closed) popup.close();
      setIsLoading(false);
      setStatus({ type: "error", message: "⚠ Error de conexión. Reintentar." });
    }
  }


  async function handleGoogleLogin() {
    if (!hasGoogleProvider) {
      setStatus({
        type: "error",
        message: "Google Login no está configurado en este entorno.",
      });
      return;
    }
    setIsLoading(true);
    setStatus({ type: "connecting", message: "Conectando con Google..." });

    const w = 520, h = 660;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    const features = `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`;
    const popup = window.open("", "connect_oauth_google", features);
    if (popup) popup.document.write("<div style='font-family:sans-serif;padding:20px'>Cargando...</div>");

    const { signIn } = await import("next-auth/react");
    try {
      const result = await signIn("google", {
        callbackUrl: window.location.origin + "/connect/done?module=login",
        redirect: false,
      });

      if (result?.url) {
        if (popup) {
          popup.location.href = result.url;
          
          const handler = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === "CONNECT_DONE") {
              window.removeEventListener("message", handler);
              if (event.data.module === "login") {
                setStatus({ type: "success", message: "Acceso autorizado" });
                window.location.href = getSafeCallbackUrl();
              }
              popup.close();
            }
          };
          window.addEventListener("message", handler);

          const timer = setInterval(() => {
            if (popup.closed) {
              clearInterval(timer);
              window.removeEventListener("message", handler);
              setIsLoading(false);
              setStatus({ type: "idle", message: "Inicio de sesión cancelado." });
            }
          }, 500);
        } else {
          window.location.href = result.url;
        }
      } else if (result?.error) {
        if (popup) popup.close();
        throw new Error(result.error);
      }
    } catch {
      if (popup && !popup.closed) popup.close();
      setIsLoading(false);
      setStatus({ type: "error", message: "⚠ Error de conexión. Reintentar." });
    }
  }

  async function handleCredentialsLogin() {
    if (!email || !password) {
      setCredError("Completa todos los campos");
      return;
    }
    setIsLoading(true);
    setCredError("");
    setStatus({ type: "connecting", message: "Autenticando..." });
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
    window.location.href = getSafeCallbackUrl();
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
      setStatus({ type: "idle", message: "Esperando autenticación..." });
      return;
    }
    setStatus({ type: "success", message: "Access granted" });
    window.location.href = getSafeCallbackUrl();
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
      <div className="login-wrapper is-visible">
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
            <p className="logo-subtitle">INTELIGENCIA MULTICANAL</p>
          </div>

          {/* Tagline */}
          <p className="tagline">Navega la galaxia del marketing</p>

          {/* Facebook button */}
          <button
            onClick={handleFacebookLogin}
            disabled={isLoading || !providerStatusLoaded || !hasFacebookProvider}
            className="fb-btn"
            title={!hasFacebookProvider && providerStatusLoaded ? "Faltan FACEBOOK_CLIENT_ID/FACEBOOK_CLIENT_SECRET" : undefined}
          >
            <div className="fb-btn-bg" />
            <div className="fb-btn-content">
              {!isLoading ? (
                <>
                  <svg viewBox="0 0 24 24" className="fb-icon">
                    <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                  </svg>
                  <span>
                    {!providerStatusLoaded
                      ? "VERIFICANDO FACEBOOK"
                      : hasFacebookProvider
                        ? status.type === "error" ? "REINTENTAR" : "INICIAR SESIÓN CON FACEBOOK"
                        : "FACEBOOK NO CONFIGURADO"}
                  </span>
                </>
              ) : (
                <>
                  <span>INICIANDO SESIÓN</span>
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
            <span className="divider-text">O</span>
            <span className="divider-line" />
          </div>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading || !providerStatusLoaded || !hasGoogleProvider}
            className="google-btn"
            title={!hasGoogleProvider && providerStatusLoaded ? "Faltan GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET" : undefined}
          >
            <div className="fb-btn-bg" />
            <div className="fb-btn-content">
              {!isLoading ? (
                <>
                  <svg viewBox="0 0 24 24" className="fb-icon" style={{ fill: "white" }}>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span>
                    {!providerStatusLoaded
                      ? "VERIFICANDO GOOGLE"
                      : hasGoogleProvider
                        ? "INICIAR SESIÓN CON GOOGLE"
                        : "GOOGLE NO CONFIGURADO"}
                  </span>
                </>
              ) : (
                <>
                  <span>INICIANDO SESIÓN</span>
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
            <span className="divider-text">O</span>
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
                <span>INICIAR CON EMAIL</span>
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
                    color: !isRegister ? "#00d4ff" : "#64748b",
                    cursor: "pointer",
                  }}
                >
                  INICIAR SESIÓN
                </button>
                <button
                  onClick={() => { setIsRegister(true); setCredError(""); }}
                  style={{
                    flex: 1, padding: "8px", fontSize: "10px",
                    fontFamily: "'Orbitron', monospace", letterSpacing: "0.1em",
                    background: isRegister ? "rgba(0,212,255,0.1)" : "transparent",
                    border: `1px solid ${isRegister ? "rgba(0,212,255,0.4)" : "rgba(0,212,255,0.1)"}`,
                    color: isRegister ? "#00d4ff" : "#64748b",
                    cursor: "pointer",
                  }}
                >
                  REGISTRARSE
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
                    <span>{isRegister ? "CREAR CUENTA" : "INICIAR SESIÓN →"}</span>
                  ) : (
                    <>
                      <span>{isRegister ? "CREANDO CUENTA" : "AUTENTICANDO"}</span>
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
        <p className="copyright">© {new Date().getFullYear()} Sodare · All Systems Operational</p>
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
