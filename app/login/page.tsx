"use client";

/**
 * SODARE · Login Page — Línea gráfica nativa
 *
 * Usa 100% los design tokens del sistema Sodare:
 *  • Background: --background (#04070e) + dashboard-bg radial gradients
 *  • Superficies: --surface glass-panel con borde var(--border) cyan
 *  • Color primario: --c-brand / --cyan (#5b9bff)
 *  • Tipografía: Inter (--font-sans) + Orbitron (--font-display) solo en logo
 *  • Botones: btn-brand (cyan→indigo gradient) y btn-ghost
 *  • Inputs: f-input con focus cyan
 *  • GalaxyBackground canvas (estrellas flotantes)
 *  • Grid holográfico dashboard-grid
 *
 * Toda la lógica de auth se conserva intacta.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { SodareLogo } from "@/components/ui/SodareLogo";
import { GalaxyBackground } from "@/components/ui/GalaxyBackground";
import { useLanguage } from "@/components/layout/LanguageContext";

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

// ── i18n ────────────────────────────────────────────────────────────────────
const STRINGS = {
  es: {
    returningHi: (n: string) => `Hola otra vez, ${n}`,
    pwReturning: "Tu contraseña",
    forgot: "¿Olvidaste tu contraseña?",
    useOther: "Usar otra cuenta",
    title: "Acceso al sistema",
    subtitle: "Inicia sesión para entrar al puente de mando.",
    orEmail: "o con correo",
    tabLogin: "INICIAR SESIÓN",
    tabReg: "CREAR CUENTA",
    name: "Nombre completo",
    confirmPw: "Confirmar contraseña",
    ctaLogin: "ENTRAR AL PUENTE",
    ctaReg: "CREAR CUENTA",
    secure: "Acceso seguro · cifrado de extremo a extremo",
    successTitle: "Acceso concedido",
    successSub: "Entrando al puente de mando…",
  },
  en: {
    returningHi: (n: string) => `Welcome back, ${n}`,
    pwReturning: "Your password",
    forgot: "Forgot your password?",
    useOther: "Use another account",
    title: "System access",
    subtitle: "Sign in to enter the command bridge.",
    orEmail: "or with email",
    tabLogin: "SIGN IN",
    tabReg: "CREATE ACCOUNT",
    name: "Full name",
    confirmPw: "Confirm password",
    ctaLogin: "ENTER THE BRIDGE",
    ctaReg: "CREATE ACCOUNT",
    secure: "Secure access · end-to-end encryption",
    successTitle: "Access granted",
    successSub: "Entering the command bridge…",
  },
};

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<AuthProviders | null>(null);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [credError, setCredError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const { lang, setLang } = useLanguage();
  const [success, setSuccess] = useState(false);

  // Returning user
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string>("");
  const [useOther, setUseOther] = useState(false);

  const t = STRINGS[lang];

  useEffect(() => {
    let isActive = true;

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("error");
      if (oauthError) {
        const map: Record<string, string> = {
          OAuthCallback: "Error de conexión con el proveedor OAuth.",
          OAuthSignin: "No se pudo iniciar la autenticación con el proveedor.",
          OAuthAccountNotLinked: "Este email ya está vinculado a otro método de inicio de sesión.",
          AccessDenied: "Acceso denegado.",
          Verification: "El enlace de verificación expiró o ya fue utilizado.",
          Configuration: "Error de configuración del servidor de autenticación.",
        };
        setCredError(map[oauthError] || `Error: ${oauthError}`);
        window.history.replaceState({}, "", "/login");
      }
      try {
        const le = window.localStorage.getItem("sodare:lastEmail");
        const ln = window.localStorage.getItem("sodare:lastName");
        if (le) { setSavedEmail(le); setEmail(le); }
        if (ln) setSavedName(ln);
      } catch { /* noop */ }
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/providers");
        if (!res.ok) throw new Error("providers");
        const data = await res.json();
        if (isActive) setProviders(data || {});
      } catch {
        if (isActive) {
          setProviders({});
          setCredError("No se pudo verificar la configuración de login.");
        }
      }
    })();

    // FB SDK
    const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
    if (!APP_ID) return () => { isActive = false; };
    const w = window as any;
    const initSdk = () => {
      w.FB!.init({ appId: APP_ID, cookie: true, xfbml: false, version: process.env.NEXT_PUBLIC_META_API_VERSION || "v22.0" });
      w.FB!.AppEvents.logPageView();
    };
    if (w.FB) initSdk();
    else {
      w.fbAsyncInit = initSdk;
      if (!document.getElementById("facebook-jssdk")) {
        const js = document.createElement("script");
        js.id = "facebook-jssdk"; js.src = "https://connect.facebook.net/en_US/sdk.js"; js.async = true;
        document.head.appendChild(js);
      }
    }
    return () => { isActive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const providerStatusLoaded = providers !== null;
  const hasFacebookProvider = Boolean(providers?.facebook);
  const hasGoogleProvider = Boolean(providers?.google);

  function rememberAndGo() {
    try {
      window.localStorage.setItem("sodare:lastEmail", email);
      if (name) window.localStorage.setItem("sodare:lastName", name);
    } catch { /* noop */ }
    setSuccess(true);
    setTimeout(() => { window.location.href = getSafeCallbackUrl(); }, 800);
  }

  function popupLogin(provider: "facebook" | "google") {
    setIsLoading(true);
    setCredError("");
    const w = 520, h = 660;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    const features = `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`;
    const popup = window.open(`/login/popup?provider=${provider}`, `connect_oauth_${provider}`, features);
    if (popup) {
      const handler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === "CONNECT_DONE") {
          window.removeEventListener("message", handler);
          if (event.data.module === "login") rememberAndGo();
          popup.close();
        }
      };
      window.addEventListener("message", handler);
      const timer = setInterval(() => {
        if (popup.closed) { clearInterval(timer); window.removeEventListener("message", handler); setIsLoading(false); }
      }, 500);
    } else {
      window.location.href = `/login/popup?provider=${provider}`;
    }
  }

  function handleFacebookLogin() {
    if (!hasFacebookProvider) { setCredError("Facebook Login no está configurado en este entorno."); return; }
    popupLogin("facebook");
  }
  function handleGoogleLogin() {
    if (!hasGoogleProvider) { setCredError("Google Login no está configurado en este entorno."); return; }
    popupLogin("google");
  }

  async function handleCredentialsLogin() {
    if (!email || !password) { setCredError("Completa todos los campos"); return; }
    setIsLoading(true); setCredError("");
    const { signIn } = await import("next-auth/react");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) { 
      setIsLoading(false); 
      setCredError(result.error === "RATE_LIMIT_EXCEEDED" ? "Demasiados intentos. Por seguridad, espera 5 minutos." : "Email o contraseña incorrectos"); 
      return; 
    }
    rememberAndGo();
  }

  async function handleRegister() {
    if (!name || !email || !password) { setCredError("Completa todos los campos"); return; }
    if (password.length < 8) { setCredError("La contraseña debe tener al menos 8 caracteres"); return; }
    if (password !== confirmPassword) { setCredError("Las contraseñas no coinciden"); return; }
    setIsLoading(true); setCredError("");
    const res = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) { setIsLoading(false); setCredError(data.error || "Error al registrar"); return; }
    const { signIn } = await import("next-auth/react");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) { 
      setIsLoading(false); 
      if (result.error === "RATE_LIMIT_EXCEEDED") {
        setCredError("Demasiados intentos. Por seguridad, espera 5 minutos.");
      } else {
        setCredError("Cuenta creada. Inicia sesión."); 
        setIsRegister(false); 
      }
      return; 
    }
    rememberAndGo();
  }

  const submit = () => (isRegister ? handleRegister() : handleCredentialsLogin());
  const showReturning = !!savedEmail && !useOther && !isRegister;

  return (
    <div className="login-page-root">
      {/* ── Scoped styles ── */}
      <style>{`
        /* ──────────────────────────────────────────────────
           LOGIN PAGE — Sodare brand design system
           Tokens: var(--background), var(--surface), var(--border),
                   var(--c-brand), var(--cyan), var(--cyan-dim),
                   var(--foreground), var(--text-secondary), var(--text-muted)
           Fonts:  Inter (body), Orbitron (logo via SodareLogo)
        ────────────────────────────────────────────────── */

        .login-page-root {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 24px;
          /* Sodare native dark background */
          background-color: var(--background);
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
        }

        /* ── Background radial glow (identical to .dashboard-bg) ── */
        .login-bg-glow {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background:
            radial-gradient(ellipse 700px 500px at 15% 25%, var(--cyan-dim) 0%, transparent 70%),
            radial-gradient(ellipse 500px 600px at 85% 75%, rgba(100,0,180,0.05) 0%, transparent 70%);
        }

        /* ── Grid overlay (same as .dashboard-grid) ── */
        .login-bg-grid {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 80px 80px;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 90%);
        }

        /* ── Corner scan line decorators ── */
        .login-corner {
          position: absolute;
          z-index: 1;
          pointer-events: none;
        }
        .login-corner-tl {
          top: 20px; left: 20px;
        }
        .login-corner-br {
          bottom: 20px; right: 20px;
          transform: rotate(180deg);
        }
        .login-corner svg line {
          stroke: var(--c-brand);
          stroke-width: 1;
          opacity: 0.4;
        }

        /* ── Horizontal scan line animation ── */
        @keyframes login-scan {
          0%   { top: -2px; opacity: 0; }
          10%  { opacity: 0.6; }
          90%  { opacity: 0.4; }
          100% { top: 100%; opacity: 0; }
        }
        .login-scan-line {
          position: absolute;
          left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, var(--cyan) 40%, var(--cyan) 60%, transparent 100%);
          animation: login-scan 6s linear infinite;
          pointer-events: none;
          z-index: 2;
          opacity: 0;
        }

        /* ── Main card — uses Sodare glass-panel pattern ── */
        .login-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 400px;
          /* glass-panel base */
          background: var(--surface);
          backdrop-filter: blur(24px) saturate(1.4);
          -webkit-backdrop-filter: blur(24px) saturate(1.4);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          box-shadow:
            0 30px 80px rgba(0,0,0,0.6),
            0 0 0 1px rgba(59,130,246,0.06) inset;
        }

        /* Top cyan accent line — same as .glass-panel::before */
        .login-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--border-strong), transparent);
          z-index: 1;
        }

        /* Subtle inner glow top-left */
        .login-card::after {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 150px; height: 150px;
          background: linear-gradient(135deg, var(--cyan-dim), transparent);
          pointer-events: none;
        }

        .login-card-inner {
          position: relative;
          z-index: 2;
          padding: 40px 36px 36px;
        }

        /* ── System label — .t-label style ── */
        .login-system-label {
          font-family: var(--font-display);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--cyan);
          opacity: 0.7;
          text-align: center;
          margin-bottom: 20px;
        }

        /* ── Inputs — matches globals .f-input ── */
        .login-input {
          width: 100%;
          padding: 10px 12px;
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          font-size: 13px;
          color: var(--foreground);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
          margin-bottom: 10px;
        }
        .login-input::placeholder { color: var(--text-muted); }
        .login-input:focus {
          border-color: var(--c-brand);
          box-shadow: 0 0 0 3px var(--cyan-dim);
        }
        .login-input-wrap {
          position: relative;
          margin-bottom: 10px;
        }
        .login-input-wrap .login-input {
          margin-bottom: 0;
          padding-right: 40px;
        }

        /* ── Eye toggle ── */
        .login-eye-btn {
          position: absolute;
          right: 10px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          cursor: pointer;
          color: var(--text-muted);
          display: flex; align-items: center;
          padding: 4px;
          transition: color 0.15s;
        }
        .login-eye-btn:hover { color: var(--text-secondary); }

        /* ── Divider ── */
        .login-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
        }
        .login-divider-line {
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .login-divider-text {
          font-size: 11px;
          color: var(--text-muted);
          letter-spacing: 0.05em;
          white-space: nowrap;
        }

        /* ── Tab switch ── */
        .login-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 20px;
          padding: 3px;
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--border);
          border-radius: 8px;
        }
        .login-tab {
          flex: 1;
          padding: 8px 10px;
          font-family: var(--font-display);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--text-muted);
          background: transparent;
        }
        .login-tab.active {
          background: var(--cyan-dim);
          color: var(--cyan);
          border: 1px solid var(--border-strong);
          box-shadow: 0 0 12px var(--cyan-dim);
        }

        /* ── CTA — matches .btn-brand ── */
        .login-btn-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 11px 22px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, var(--cyan) 0%, #2563eb 100%);
          color: #fff;
          font-family: var(--font-display);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 4px 18px rgba(59,130,246,0.35);
          margin-top: 8px;
        }
        .login-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(59,130,246,0.5);
        }
        .login-btn-primary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }

        /* ── Ghost / OAuth buttons — .btn-ghost ── */
        .login-btn-ghost {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--foreground);
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .login-btn-ghost:hover:not(:disabled) {
          border-color: var(--border-strong);
          background: rgba(255,255,255,0.04);
        }
        .login-btn-ghost:disabled { opacity: 0.35; cursor: not-allowed; }

        /* ── Error row ── */
        .login-error {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 9px 12px;
          border-radius: 6px;
          background: rgba(229,72,77,0.08);
          border: 1px solid rgba(229,72,77,0.2);
          color: var(--c-danger, #e5484d);
          font-size: 12px;
          margin-bottom: 12px;
          line-height: 1.4;
        }

        /* ── Spinner ── */
        @keyframes login-spin { to { transform: rotate(360deg); } }
        .login-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: #fff;
          border-radius: 50%;
          animation: login-spin 0.7s linear infinite;
          display: inline-block;
        }

        /* ── Success ── */
        @keyframes login-check-scale {
          from { transform: scale(0.6); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        .login-success-icon {
          animation: login-check-scale 0.4s cubic-bezier(0.34,1.56,0.64,1);
          width: 60px; height: 60px;
          margin: 0 auto 20px;
          background: var(--cyan-dim);
          border: 1px solid var(--border-strong);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 20px var(--cyan-dim);
        }

        /* ── Avatar (returning user) ── */
        .login-avatar {
          width: 52px; height: 52px;
          margin: 0 auto 14px;
          background: linear-gradient(135deg, var(--red), #d98843);
          border: 1px solid rgba(229,72,77,0.35);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          position: relative;
        }
        .login-avatar::after {
          content: '';
          position: absolute;
          inset: -3px;
          border: 1px solid rgba(229,72,77,0.2);
        }

        /* ── Lang toggle ── */
        .login-lang-toggle {
          position: absolute;
          top: 16px; right: 16px;
          z-index: 30;
          display: flex;
          gap: 2px;
          padding: 3px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 100px;
          backdrop-filter: blur(12px);
        }
        .login-lang-btn {
          padding: 5px 12px;
          border: none;
          border-radius: 100px;
          cursor: pointer;
          font-family: var(--font-display);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          transition: all 0.2s;
          background: transparent;
          color: var(--text-muted);
        }
        .login-lang-btn.active {
          background: var(--cyan-dim);
          color: var(--cyan);
        }

        /* ── Forgot link ── */
        .login-forgot {
          font-size: 11px;
          color: var(--cyan);
          text-decoration: none;
          opacity: 0.75;
          transition: opacity 0.15s;
          display: block;
          text-align: right;
          margin: 4px 0 18px;
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
        }
        .login-forgot:hover { opacity: 1; }

        /* ── Use other account link ── */
        .login-other-link {
          display: block;
          text-align: center;
          margin-top: 18px;
          font-size: 11px;
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.15s;
          cursor: pointer;
          background: none; border: none;
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
        }
        .login-other-link:hover { color: var(--text-secondary); }

        /* ── Secure label ── */
        .login-secure {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          margin-top: 18px;
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.03em;
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
        }

        /* ── HUD corner decorators ── */
        @keyframes login-corner-blink {
          0%, 80%, 100% { opacity: 0.3; }
          90% { opacity: 1; }
        }
        .login-hud-corner { animation: login-corner-blink 4s ease-in-out infinite; }
        .login-hud-corner-delay { animation: login-corner-blink 4s ease-in-out infinite 2s; }

        /* ── Responsive ── */
        @media (max-width: 480px) {
          .login-card-inner { padding: 28px 20px 24px; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>

      {/* ── Galaxy starfield (native Sodare component) ── */}
      <GalaxyBackground />

      {/* ── Background radial glow (dashboard-bg pattern) ── */}
      <div className="login-bg-glow" aria-hidden="true" />

      {/* ── Grid overlay ── */}
      <div className="login-bg-grid" aria-hidden="true" />

      {/* ── HUD corner decorators ── */}
      <div className="login-corner login-corner-tl" aria-hidden="true">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <line x1="0" y1="18" x2="12" y2="18" className="login-hud-corner" />
          <line x1="18" y1="0" x2="18" y2="12" className="login-hud-corner" />
          <line x1="0" y1="0" x2="8" y2="0" className="login-hud-corner-delay" />
          <line x1="0" y1="0" x2="0" y2="8" className="login-hud-corner-delay" />
        </svg>
      </div>
      <div className="login-corner login-corner-br" aria-hidden="true">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <line x1="0" y1="18" x2="12" y2="18" className="login-hud-corner" />
          <line x1="18" y1="0" x2="18" y2="12" className="login-hud-corner" />
          <line x1="0" y1="0" x2="8" y2="0" className="login-hud-corner-delay" />
          <line x1="0" y1="0" x2="0" y2="8" className="login-hud-corner-delay" />
        </svg>
      </div>

      {/* ── Horizontal scan line ── */}
      <div className="login-scan-line" aria-hidden="true" />

      {/* ── Language toggle ── */}
      <div className="login-lang-toggle">
        <button
          className={`login-lang-btn${lang === "es" ? " active" : ""}`}
          onClick={() => setLang("es")}
        >
          ES
        </button>
        <button
          className={`login-lang-btn${lang === "en" ? " active" : ""}`}
          onClick={() => setLang("en")}
        >
          EN
        </button>
      </div>

      {/* ── Glass Card ── */}
      <div className="login-card">
        <div className="login-card-inner">

          {/* System label */}
          <div className="login-system-label">· SODARE COMMAND BRIDGE ·</div>

          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <a href="/" style={{ display: "inline-flex" }}>
              <SodareLogo size="lg" />
            </a>
          </div>

          {/* ── State: Success ── */}
          {success ? (
            <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
              <div className="login-success-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
                {t.successTitle}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>
                {t.successSub}
              </div>
            </div>

          ) : showReturning ? (
            /* ── State: Returning user ── */
            <>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div className="login-avatar">
                  {(savedName || savedEmail || "U").trim().charAt(0).toUpperCase()}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>
                  {t.returningHi(savedName || "")}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  {savedEmail}
                </div>
              </div>

              <div className="login-input-wrap">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setCredError(""); }}
                  placeholder={t.pwReturning}
                  className="login-input"
                  style={{ marginBottom: 0 }}
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
                  }
                </button>
              </div>

              {credError && (
                <div className="login-error">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  {credError}
                </div>
              )}

              <button
                onClick={submit}
                disabled={isLoading}
                className="login-btn-primary"
              >
                {isLoading ? <span className="login-spinner" /> : t.ctaLogin}
              </button>

              <button className="login-other-link" onClick={() => { setUseOther(true); setPassword(""); setCredError(""); }}>
                {t.useOther}
              </button>
            </>

          ) : (
            /* ── State: Normal login / register ── */
            <>
              {/* Header text */}
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
                  {t.title}
                </h1>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {t.subtitle}
                </p>
              </div>

              {/* OAuth buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="login-btn-ghost"
                  onClick={handleFacebookLogin}
                  disabled={isLoading || !providerStatusLoaded || !hasFacebookProvider}
                  title="Facebook"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                  </svg>
                  Facebook
                </button>
                <button
                  className="login-btn-ghost"
                  onClick={handleGoogleLogin}
                  disabled={isLoading || !providerStatusLoaded || !hasGoogleProvider}
                  title="Google"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Google
                </button>
              </div>

              {/* Divider */}
              <div className="login-divider">
                <span className="login-divider-line" />
                <span className="login-divider-text">{t.orEmail}</span>
                <span className="login-divider-line" />
              </div>

              {/* Tab switcher */}
              <div className="login-tabs">
                <button
                  className={`login-tab${!isRegister ? " active" : ""}`}
                  onClick={() => { setIsRegister(false); setCredError(""); }}
                >
                  {t.tabLogin}
                </button>
                <button
                  className={`login-tab${isRegister ? " active" : ""}`}
                  onClick={() => { setIsRegister(true); setCredError(""); }}
                >
                  {t.tabReg}
                </button>
              </div>

              {/* Form fields */}
              {isRegister && (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.name}
                  className="login-input"
                />
              )}

              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setCredError(""); }}
                placeholder="tu@empresa.com"
                className="login-input"
              />

              <div className="login-input-wrap">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setCredError(""); }}
                  placeholder="••••••••"
                  className="login-input"
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
                  }
                </button>
              </div>

              {isRegister && (
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.confirmPw}
                  className="login-input"
                />
              )}

              {credError && (
                <div className="login-error">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  {credError}
                </div>
              )}

              {!isRegister && (
                <a href="/forgot-password" className="login-forgot">
                  {t.forgot}
                </a>
              )}

              <button
                onClick={submit}
                disabled={isLoading}
                className="login-btn-primary"
                style={{ marginTop: isRegister ? 12 : 0 }}
              >
                {isLoading
                  ? <span className="login-spinner" />
                  : isRegister ? t.ctaReg : t.ctaLogin
                }
              </button>

              {/* Secure footer */}
              <div className="login-secure">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                {t.secure}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
