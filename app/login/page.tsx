"use client";

/**
 * SODARE · Login "Puente de Mando"
 * Drop-in replacement for app/login/page.tsx.
 *
 * Conserva TODA la lógica de auth existente (NextAuth facebook-sdk/popup,
 * google popup, credentials, registro vía /api/auth/register) — solo cambia
 * la capa visual. Requiere el componente Orbi (ver handoff/Orbi.tsx → muévelo
 * a components/ui/Orbi.tsx) y SodareLogo ya existente.
 *
 * Fuente Orbitron: ya se usa en SodareLogo, así que está disponible.
 */

import React, { useState, useEffect, useRef } from "react";
import { Orbi } from "@/components/ui/Orbi";
import { SodareLogo } from "@/components/ui/SodareLogo";
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

// ── i18n local (puedes migrarlo a tu LanguageContext) ──────────────────────
const STRINGS = {
  es: {
    hook: "Menos pestañas. Más ventas.",
    h1: "El centro de mando", h2: "de tu marketing.",
    sub: "Campañas, conversaciones y resultados de todos tus canales en una sola pantalla, en tiempo real.",
    bubblePre: "Hola 👋 Conecto ", bubblePost: " para que tú solo veas resultados.",
    metricsLabel: "RESULTADOS DE NUESTROS CLIENTES · HOY",
    roas: "ROAS promedio", convs: "conversaciones", campaigns: "campañas activas",
    trust: "CONFÍAN:",
    returningHi: (n: string) => `Hola otra vez, ${n}`, pwReturning: "Tu contraseña",
    forgot: "¿Olvidaste tu contraseña?", useOther: "Usar otra cuenta",
    title: "Acceso al sistema", subtitle: "Inicia sesión para entrar al puente de mando.",
    orEmail: "o con tu email", tabLogin: "INICIAR SESIÓN", tabReg: "CREAR CUENTA",
    name: "Nombre completo", confirmPw: "Confirmar contraseña",
    ctaLogin: "ENTRAR AL PUENTE", ctaReg: "CREAR CUENTA GRATIS",
    demo: "¿Aún no usas Sodare? Ver demo · 2 min",
    secure: "Acceso seguro · cifrado de extremo a extremo",
    successTitle: "Acceso concedido", successSub: "Entrando al puente de mando…",
  },
  en: {
    hook: "Fewer tabs. More sales.",
    h1: "The command center", h2: "for your marketing.",
    sub: "Campaigns, conversations and results from every channel on one screen, in real time.",
    bubblePre: "Hi 👋 I connect ", bubblePost: " so you only see results.",
    metricsLabel: "OUR CLIENTS' RESULTS · TODAY",
    roas: "avg. ROAS", convs: "conversations", campaigns: "active campaigns",
    trust: "TRUSTED BY:",
    returningHi: (n: string) => `Welcome back, ${n}`, pwReturning: "Your password",
    forgot: "Forgot your password?", useOther: "Use another account",
    title: "System access", subtitle: "Sign in to enter the command bridge.",
    orEmail: "or with your email", tabLogin: "SIGN IN", tabReg: "CREATE ACCOUNT",
    name: "Full name", confirmPw: "Confirm password",
    ctaLogin: "ENTER THE BRIDGE", ctaReg: "CREATE FREE ACCOUNT",
    demo: "New to Sodare? Watch demo · 2 min",
    secure: "Secure access · end-to-end encryption",
    successTitle: "Access granted", successSub: "Entering the command bridge…",
  },
};

const ACCENT = "var(--cyan)";
const ORB = "Orbitron, sans-serif";

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
  const autoLoginAttempted = useRef(false);

  // Cliente recurrente: recordamos el último correo usado.
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
          OAuthCallback: "Error de conexión. Meta podría estar limitando peticiones, o las credenciales no son válidas.",
          OAuthSignin: "No se pudo iniciar la autenticación con el proveedor.",
          OAuthAccountNotLinked: "Este email ya está vinculado a otro método de inicio de sesión.",
          AccessDenied: "Acceso denegado.",
          Verification: "El enlace de verificación expiró o ya fue utilizado.",
          Configuration: "Error de configuración del servidor de autenticación.",
        };
        setCredError(map[oauthError] || `Error de autenticación: ${oauthError}`);
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

    // FB SDK (igual que tu implementación previa)
    const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
    if (!APP_ID) return () => { isActive = false; };
    const initSdk = () => {
      window.FB!.init({ appId: APP_ID, cookie: true, xfbml: false, version: process.env.NEXT_PUBLIC_FB_API_VERSION || "v25.0" });
      window.FB!.AppEvents.logPageView();
    };
    if (window.FB) initSdk();
    else {
      window.fbAsyncInit = initSdk;
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

  // Auto-login logic (credentials)
  function rememberAndGo() {
    try {
      window.localStorage.setItem("sodare:lastEmail", email);
      if (name) window.localStorage.setItem("sodare:lastName", name);
    } catch { /* noop */ }
    setSuccess(true);
    setTimeout(() => { window.location.href = getSafeCallbackUrl(); }, 700);
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
    if (result?.error) { setIsLoading(false); setCredError("Email o contraseña incorrectos"); return; }
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
    if (result?.error) { setIsLoading(false); setCredError("Cuenta creada. Inicia sesión."); setIsRegister(false); return; }
    rememberAndGo();
  }

  const submit = () => (isRegister ? handleRegister() : handleCredentialsLogin());
  const showReturning = !!savedEmail && !useOther && !isRegister;

  const input: React.CSSProperties = {
    width: "100%", padding: "14px 16px", marginBottom: 16, background: "transparent",
    border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 14, outline: "none",
    boxSizing: "border-box", borderRadius: 8, transition: "all 0.2s",
  };
  const cta: React.CSSProperties = {
    width: "100%", marginTop: 8, padding: 15, border: "none", cursor: "pointer",
    background: "#fff", color: "#000", fontWeight: 600,
    letterSpacing: "0.01em", borderRadius: 8, display: "flex", alignItems: "center",
    justifyContent: "center", gap: 10, minHeight: 52, fontSize: 14, transition: "all 0.2s"
  };
  const tab = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 6,
    background: active ? "rgba(255,255,255,0.1)" : "transparent",
    border: "none", color: active ? "#fff" : "rgba(255,255,255,0.5)", transition: "all 0.2s"
  });
  const langBtn = (active: boolean): React.CSSProperties => ({
    padding: "6px 14px", border: "none", borderRadius: 100, cursor: "pointer", fontSize: 11,
    fontWeight: active ? 600 : 500, background: active ? "rgba(255,255,255,0.1)" : "transparent",
    color: active ? "#fff" : "rgba(255,255,255,0.4)", transition: "all 0.2s"
  });
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "var(--cyan)";
    e.currentTarget.style.boxShadow = "0 0 0 1px var(--cyan)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
    e.currentTarget.style.boxShadow = "none";
  };

  const EyeBtn = (
    <button type="button" onClick={() => setShowPw((v) => !v)}
      style={{ position: "absolute", right: 12, top: 25, transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex", padding: 6 }}>
      {showPw ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
      )}
    </button>
  );

  const ErrorRow = credError ? (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12, fontSize: 13, color: "#ff4d4f" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
      {credError}
    </div>
  ) : null;

  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#060606", fontFamily: "var(--font-inter),system-ui,sans-serif", overflow: "hidden", padding: "24px" }}>
      <style>{`
        @keyframes f-spin{to{transform:rotate(360deg)}}
        @keyframes f-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes shine { to { background-position: 200% center; } }
        
        .text-shimmer {
          background: linear-gradient(to right, #ffffff 20%, #00d4ff 40%, #00d4ff 60%, #ffffff 80%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          color: transparent;
          animation: shine 4s linear infinite;
        }

        .login-card {
          width: 100%; max-width: 420px; padding: 40px; 
          background: rgba(10,12,18,0.7); 
          border: 1px solid rgba(0, 212, 255, 0.12); 
          border-radius: 20px; 
          box-shadow: 0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 40px rgba(0,212,255,0.03);
          backdrop-filter: blur(24px);
          position: relative;
          z-index: 10;
        }
        
        @media (max-width:480px){
          .login-card { padding: 32px 24px; border-radius: 16px; border:none; box-shadow:none; background:transparent; }
        }
        @media (prefers-reduced-motion:reduce){*{animation:none !important}}
      `}</style>

      {/* Subtle background glow */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "800px", height: "800px", background: "radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Language toggle */}
      <div style={{ position: "absolute", top: 24, right: 24, zIndex: 20, display: "flex", gap: 4, padding: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100 }}>
        <button onClick={() => setLang("es")} style={langBtn(lang === "es")}>ES</button>
        <button onClick={() => setLang("en")} style={langBtn(lang === "en")}>EN</button>
      </div>

      {/* Header section */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
        <a href="/" style={{ display: "inline-flex", marginBottom: 32 }}><SodareLogo size="lg" /></a>
        <div style={{ animation: "f-float 6s ease-in-out infinite", marginBottom: 16 }}>
          <Orbi size={64} style={{ filter: "drop-shadow(0px 0px 15px rgba(0, 212, 255, 0.4))" }} />
        </div>
        <h1 className="text-shimmer" style={{ fontFamily: ORB, fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 700, lineHeight: 1.15, margin: 0, textAlign: "center", letterSpacing: "-0.01em" }}>
          {t.h1}
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", marginTop: 12, textAlign: "center", maxWidth: 320 }}>
          {t.subtitle}
        </p>
      </div>

      {/* Login Box */}
      <div className="login-card">
        {success ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ width: 64, height: 64, margin: "0 auto 24px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em" }}>{t.successTitle}</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>{t.successSub}</div>
          </div>
        ) : showReturning ? (
          <>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ width: 64, height: 64, margin: "0 auto 16px", borderRadius: "50%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 600, color: "#fff" }}>{(savedName || savedEmail || "U").trim().charAt(0).toUpperCase()}</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em" }}>{t.returningHi(savedName || "")}</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{savedEmail}</div>
            </div>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <input type={showPw ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setCredError(""); }} placeholder={t.pwReturning} onFocus={onFocus} onBlur={onBlur} style={{ ...input, marginBottom: 0, paddingRight: 44 }} />
              {EyeBtn}
            </div>
            {ErrorRow}
            <button onClick={submit} disabled={isLoading} style={{ ...cta, opacity: isLoading ? 0.7 : 1 }} onMouseEnter={(e) => e.currentTarget.style.background = "#f0f0f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}>
              {isLoading ? <span style={{ width: 18, height: 18, border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "#000", borderRadius: "50%", animation: "f-spin .7s linear infinite", display: "inline-block" }} /> : t.ctaLogin}
            </button>
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <a href="#" onClick={(e) => { e.preventDefault(); setUseOther(true); setPassword(""); setCredError(""); }} style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>{t.useOther}</a>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
              <button onClick={handleFacebookLogin} disabled={isLoading || !providerStatusLoaded || !hasFacebookProvider} style={{ flex: 1, padding: 12, border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", background: "transparent", color: "#fff", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 8, transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" /></svg>
              </button>
              <button onClick={handleGoogleLogin} disabled={isLoading || !providerStatusLoaded || !hasGoogleProvider} style={{ flex: 1, padding: 12, border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", background: "transparent", color: "#fff", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 8, transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
              <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} /><span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{t.orEmail}</span><span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 24, padding: 4, background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
              <button onClick={() => { setIsRegister(false); setCredError(""); }} style={tab(!isRegister)}>{t.tabLogin}</button>
              <button onClick={() => { setIsRegister(true); setCredError(""); }} style={tab(isRegister)}>{t.tabReg}</button>
            </div>

            {isRegister && <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.name} onFocus={onFocus} onBlur={onBlur} style={input} />}
            <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setCredError(""); }} placeholder="tu@empresa.com" onFocus={onFocus} onBlur={onBlur} style={input} />
            <div style={{ position: "relative", marginBottom: isRegister ? 16 : 8 }}>
              <input type={showPw ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setCredError(""); }} placeholder="••••••••" onFocus={onFocus} onBlur={onBlur} style={{ ...input, marginBottom: 0, paddingRight: 44 }} />
              {EyeBtn}
            </div>
            {isRegister && <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t.confirmPw} onFocus={onFocus} onBlur={onBlur} style={input} />}
            
            {ErrorRow}
            {!isRegister && <div style={{ textAlign: "right", marginBottom: 24 }}><a href="/forgot-password" style={{ fontSize: 13, color: "var(--cyan)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "#fff"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--cyan)"}>{t.forgot}</a></div>}

            <button onClick={submit} disabled={isLoading} style={{ ...cta, opacity: isLoading ? 0.7 : 1, marginTop: isRegister ? 24 : 0 }} onMouseEnter={(e) => e.currentTarget.style.background = "#f0f0f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}>
              {isLoading ? <span style={{ width: 18, height: 18, border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "#000", borderRadius: "50%", animation: "f-spin .7s linear infinite", display: "inline-block" }} /> : (isRegister ? t.ctaReg : t.ctaLogin)}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
