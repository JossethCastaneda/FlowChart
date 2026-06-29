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

  // ── estilos ──
  const input: React.CSSProperties = {
    width: "100%", padding: "12px 14px", marginBottom: 12, background: "rgba(0,212,255,0.03)",
    border: "1px solid rgba(0,212,255,0.15)", color: "var(--foreground)", fontSize: 13, outline: "none",
    boxSizing: "border-box", borderRadius: 5, transition: "border-color .15s,box-shadow .15s",
  };
  const cta: React.CSSProperties = {
    width: "100%", marginTop: 6, padding: 15, border: "none", cursor: "pointer",
    background: `linear-gradient(135deg,${ACCENT},#0080ff)`, color: "var(--background)", fontWeight: 700,
    letterSpacing: "0.02em", borderRadius: 6, display: "flex", alignItems: "center",
    justifyContent: "center", gap: 10, minHeight: 50, fontSize: 14,
  };
  const tab = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: 9, fontFamily: ORB, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
    cursor: "pointer", borderRadius: 3,
    background: active ? "rgba(0,212,255,0.12)" : "transparent",
    border: `1px solid ${active ? "rgba(0,212,255,0.45)" : "rgba(0,212,255,0.12)"}`,
    color: active ? ACCENT : "var(--text-secondary)",
  });
  const langBtn = (active: boolean): React.CSSProperties => ({
    padding: "5px 12px", border: "none", borderRadius: 100, cursor: "pointer", fontSize: 11,
    fontWeight: active ? 700 : 600, background: active ? "rgba(0,212,255,0.18)" : "transparent",
    color: active ? ACCENT : "var(--text-secondary)",
  });
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "rgba(0,212,255,0.55)";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,212,255,0.12)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "rgba(0,212,255,0.15)";
    e.currentTarget.style.boxShadow = "none";
  };

  const EyeBtn = (
    <button type="button" onClick={() => setShowPw((v) => !v)}
      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", padding: 6 }}>
      {showPw ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
      )}
    </button>
  );

  const ErrorRow = credError ? (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, fontSize: 12, color: "var(--red)" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
      {credError}
    </div>
  ) : null;

  const leftBg = "radial-gradient(ellipse 600px 500px at 22% 14%,rgba(0,120,220,0.2) 0%,transparent 60%),radial-gradient(ellipse 540px 540px at 80% 100%,rgba(110,0,190,0.15) 0%,transparent 62%),linear-gradient(135deg,var(--background),var(--background))";

  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", flexWrap: "wrap", background: "var(--background)", fontFamily: "var(--font-inter),system-ui,sans-serif", overflow: "hidden" }}>
      <style>{`
        @keyframes f-headglow{0%,100%{text-shadow:0 0 30px rgba(0,212,255,.22)}50%{text-shadow:0 0 46px rgba(0,212,255,.42)}}
        @keyframes f-pulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes f-bubble{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes f-seam{0%{opacity:.25;transform:translateY(-30%)}50%{opacity:.8}100%{opacity:.25;transform:translateY(30%)}}
        @keyframes f-spin{to{transform:rotate(360deg)}}
        .login-left{width:50%;padding:52px}
        .login-right{width:50%;padding:56px 64px;border-left:1px solid rgba(0,212,255,.1)}
        @media (max-width:820px){
          .login-left{width:100%;padding:32px 24px}
          .login-right{width:100%;padding:32px 24px 44px;border-left:none;border-top:1px solid rgba(0,212,255,.1)}
          .login-hero{display:none}
          .login-headline{font-size:26px !important}
        }
        @media (prefers-reduced-motion:reduce){*{animation:none !important}}
      `}</style>

      {/* Language toggle */}
      <div style={{ position: "absolute", top: 18, right: 22, zIndex: 20, display: "flex", gap: 2, padding: 3, background: "rgba(8,14,26,0.7)", border: "1px solid rgba(0,212,255,0.18)", borderRadius: 100 }}>
        <button onClick={() => setLang("es")} style={langBtn(lang === "es")}>ES</button>
        <button onClick={() => setLang("en")} style={langBtn(lang === "en")}>EN</button>
      </div>

      {/* LEFT · brand + proof */}
      <div className="login-left" style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 26, background: leftBg }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,212,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.03) 1px,transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none", maskImage: "radial-gradient(ellipse 90% 80% at 45% 42%,#000 30%,transparent 95%)" }} />
        <div style={{ position: "relative" }}><SodareLogo size="lg" /></div>

        <div style={{ position: "relative" }}>
          <div className="login-hero" style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
            <Orbi scale={0.82} />
            <div style={{ position: "relative", marginTop: 30, marginLeft: -18, maxWidth: 270, padding: "16px 18px", background: "rgba(8,18,34,0.92)", border: "1px solid rgba(0,212,255,0.28)", borderRadius: "14px 14px 14px 4px", boxShadow: "0 0 28px rgba(0,212,255,0.14)", animation: "f-bubble 4s ease-in-out infinite" }}>
              <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.24em", color: "var(--cyan)", marginBottom: 7 }}>ORBI <span style={{ color: "var(--text-secondary)" }}>{lang === "es" ? "// tu copiloto" : "// your copilot"}</span></div>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--foreground)" }}>{t.bubblePre}<b style={{ color: "#fff" }}>Meta, Google, WhatsApp &amp; TikTok</b>{t.bubblePost}</div>
            </div>
          </div>
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: ACCENT, background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", padding: "6px 12px", borderRadius: 100, marginBottom: 16 }}>{t.hook}</div>
          <div className="login-headline" style={{ fontFamily: ORB, fontSize: 36, fontWeight: 700, lineHeight: 1.16, color: "var(--foreground)", animation: "f-headglow 4.5s ease-in-out infinite" }}>{t.h1}<br />{t.h2}</div>
          <div style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 16, maxWidth: 420 }}>{t.sub}</div>
        </div>

        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.3em", color: "var(--text-secondary)", marginBottom: 12 }}>{t.metricsLabel}</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[["+34%", t.roas], ["2,400", t.convs], ["118", t.campaigns]].map(([v, l]) => (
              <div key={l} style={{ flex: 1, minWidth: 120, padding: "15px 18px", background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 8 }}>
                <div style={{ fontFamily: ORB, fontSize: 28, fontWeight: 700, color: "#fff" }}>{v}</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT · acceso */}
      <div className="login-right" style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", background: "rgba(4,7,14,0.6)" }}>
        <span style={{ position: "absolute", left: -1, top: 0, width: 2, height: "50%", background: "linear-gradient(180deg,transparent,rgba(0,212,255,0.7),transparent)", animation: "f-seam 6s ease-in-out infinite" }} />
        <div style={{ width: "100%", maxWidth: 392, margin: "0 auto", padding: "38px 34px", background: "rgba(8,14,26,0.55)", border: `1px solid ${ACCENT}33`, borderRadius: 16, boxShadow: `0 0 56px ${ACCENT}1f,inset 0 1px 0 rgba(255,255,255,0.04)` }}>

          {success ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ width: 64, height: 64, margin: "0 auto 18px", borderRadius: "50%", background: "rgba(6,214,160,0.12)", border: "1.5px solid rgba(6,214,160,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <div style={{ fontFamily: ORB, fontSize: 18, fontWeight: 700, color: "#fff" }}>{t.successTitle}</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>{t.successSub}</div>
            </div>
          ) : showReturning ? (
            <>
              <div style={{ textAlign: "center", marginBottom: 6 }}>
                <div style={{ width: 60, height: 60, margin: "0 auto 12px", borderRadius: "50%", background: "linear-gradient(135deg,var(--background),var(--background))", border: "1.5px solid rgba(0,212,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ORB, fontSize: 22, fontWeight: 700, color: ACCENT, boxShadow: "0 0 22px rgba(0,212,255,0.18)" }}>{(savedName || savedEmail || "U").trim().charAt(0).toUpperCase()}</div>
                <div style={{ fontFamily: ORB, fontSize: 17, fontWeight: 700, color: "#fff" }}>{t.returningHi(savedName || "")}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 5, marginBottom: 22 }}>{savedEmail}</div>
              </div>
              <div style={{ position: "relative", marginBottom: 8 }}>
                <input type={showPw ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setCredError(""); }} placeholder={t.pwReturning} onFocus={onFocus} onBlur={onBlur} style={{ ...input, marginBottom: 0, padding: "12px 44px 12px 14px" }} />
                {EyeBtn}
              </div>
              {ErrorRow}
              <div style={{ textAlign: "right", marginBottom: 8 }}><a href="/forgot-password" style={{ fontSize: 12, color: "rgba(0,212,255,0.7)", textDecoration: "none" }}>{t.forgot}</a></div>
              <button onClick={submit} disabled={isLoading} style={{ ...cta, opacity: isLoading ? 0.7 : 1 }}>
                {isLoading ? <span style={{ width: 16, height: 16, border: "2px solid rgba(3,18,26,0.35)", borderTopColor: "var(--background)", borderRadius: "50%", animation: "f-spin .7s linear infinite", display: "inline-block" }} /> : t.ctaLogin}
              </button>
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <a href="#" onClick={(e) => { e.preventDefault(); setUseOther(true); setPassword(""); setCredError(""); }} style={{ fontSize: 12, color: "var(--text-secondary)", textDecoration: "none", cursor: "pointer" }}>{t.useOther}</a>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: ORB, fontSize: 22, fontWeight: 700, letterSpacing: "0.06em", color: "#fff", textAlign: "center" }}>{t.title}</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8, marginBottom: 24, textAlign: "center" }}>{t.subtitle}</div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleFacebookLogin} disabled={isLoading || !providerStatusLoaded || !hasFacebookProvider} style={{ flex: 1, padding: 12, border: "1px solid rgba(0,212,255,0.16)", cursor: "pointer", background: "rgba(10,15,28,0.6)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 6 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#1877F2"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" /></svg>Facebook
                </button>
                <button onClick={handleGoogleLogin} disabled={isLoading || !providerStatusLoaded || !hasGoogleProvider} style={{ flex: 1, padding: 12, border: "1px solid rgba(0,212,255,0.16)", cursor: "pointer", background: "rgba(10,15,28,0.6)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 6 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>Google
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
                <span style={{ flex: 1, height: 1, background: "rgba(0,212,255,0.12)" }} /><span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t.orEmail}</span><span style={{ flex: 1, height: 1, background: "rgba(0,212,255,0.12)" }} />
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                <button onClick={() => { setIsRegister(false); setCredError(""); }} style={tab(!isRegister)}>{t.tabLogin}</button>
                <button onClick={() => { setIsRegister(true); setCredError(""); }} style={tab(isRegister)}>{t.tabReg}</button>
              </div>

              {isRegister && <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.name} onFocus={onFocus} onBlur={onBlur} style={input} />}
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setCredError(""); }} placeholder="tu@empresa.com" onFocus={onFocus} onBlur={onBlur} style={input} />
              <div style={{ position: "relative", marginBottom: 8 }}>
                <input type={showPw ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setCredError(""); }} placeholder="••••••••" onFocus={onFocus} onBlur={onBlur} style={{ ...input, marginBottom: 0, padding: "12px 44px 12px 14px" }} />
                {EyeBtn}
              </div>
              {isRegister && <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t.confirmPw} onFocus={onFocus} onBlur={onBlur} style={input} />}
              {ErrorRow}
              {!isRegister && <div style={{ textAlign: "right", marginBottom: 6 }}><a href="/forgot-password" style={{ fontSize: 12, color: "rgba(0,212,255,0.7)", textDecoration: "none" }}>{t.forgot}</a></div>}

              <button onClick={submit} disabled={isLoading} style={{ ...cta, opacity: isLoading ? 0.7 : 1 }}>
                {isLoading ? <span style={{ width: 16, height: 16, border: "2px solid rgba(3,18,26,0.35)", borderTopColor: "var(--background)", borderRadius: "50%", animation: "f-spin .7s linear infinite", display: "inline-block" }} /> : (isRegister ? t.ctaReg : t.ctaLogin)}
              </button>
            </>
          )}

          {!success && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 22 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--emerald)", boxShadow: "0 0 8px rgba(6,214,160,0.6)", animation: "f-pulse 2.4s infinite" }} />
              <span style={{ fontSize: 11, color: "var(--emerald)" }}>{t.secure}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
