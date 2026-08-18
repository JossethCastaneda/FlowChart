/* eslint-disable @next/next/no-html-link-for-pages, @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/components/layout/LanguageContext";
import { useTheme } from "next-themes";
import { signIn } from "next-auth/react";
import { FacebookIcon, GoogleIcon, TikTokIcon } from "@/components/ui/BrandIcons";

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

const T = {
  es: {
    heroTitulo: "Todos tus canales en un solo flujo de datos.",
    heroTexto: "Meta, Google y TikTok en el mismo tablero, con reportes que se arman solos y alertas cuando un canal deja de responder.",
    metricaLabel: "Inversión gestionada en agosto",
    roasLabel: "ROAS promedio", cuentasLabel: "Cuentas activas",
    periodo: "Últimos 7 días · todos los canales",
    pruebaSocial: "184 agencias y equipos internos en México y Colombia cierran su mes con FlowChart.",
    tituloForm: "Entra a tu tablero", subtituloForm: "Usa tu cuenta de trabajo para continuar.",
    conMeta: "Continuar con Facebook", conGoogle: "Continuar con Google", oCorreo: "o con tu correo",
    etiquetaCorreo: "Correo de trabajo", etiquetaPass: "Contraseña", olvide: "¿La olvidaste?",
    recordarme: "Recordarme en este equipo", ctaEntrar: "Iniciar sesión",
    sinCuenta: "¿Todavía no tienes cuenta?", crearUna: "Crear una",
    cifrado: "Conexión cifrada de extremo a extremo", otraCuenta: "Usar otra cuenta", saludo: "Hola otra vez",
    ver: "Mostrar", ocultar: "Ocultar", temaOscuro: "Oscuro", temaClaro: "Claro",
    privacidad: "Privacidad", terminos: "Términos", soporte: "Soporte",
    nombreCorto: "Nombre completo", confirmaPass: "Confirmar contraseña", ctaReg: "Crear cuenta",
    errorLlenar: "Completa todos los campos", errorPassLen: "La contraseña debe tener al menos 8 caracteres",
    errorPassMatch: "Las contraseñas no coinciden"
  },
  en: {
    heroTitulo: "Every channel in a single data flow.",
    heroTexto: "Meta, Google and TikTok on one board, with reports that build themselves and alerts when a channel stops responding.",
    metricaLabel: "Ad spend managed in August",
    roasLabel: "Average ROAS", cuentasLabel: "Active accounts",
    periodo: "Last 7 days · all channels",
    pruebaSocial: "184 agencies and in-house teams across Mexico and Colombia close their month on FlowChart.",
    tituloForm: "Sign in to your board", subtituloForm: "Use your work account to continue.",
    conMeta: "Continue with Facebook", conGoogle: "Continue with Google", oCorreo: "or with email",
    etiquetaCorreo: "Work email", etiquetaPass: "Password", olvide: "Forgot it?",
    recordarme: "Remember me on this device", ctaEntrar: "Sign in",
    sinCuenta: "Don't have an account yet?", crearUna: "Create one",
    cifrado: "End-to-end encrypted connection", otraCuenta: "Use another account", saludo: "Welcome back",
    ver: "Show", ocultar: "Hide", temaOscuro: "Dark", temaClaro: "Light",
    privacidad: "Privacy", terminos: "Terms", soporte: "Support",
    nombreCorto: "Full name", confirmaPass: "Confirm password", ctaReg: "Create account",
    errorLlenar: "Complete all fields", errorPassLen: "Password must be at least 8 characters",
    errorPassMatch: "Passwords do not match"
  }
};

export default function LoginPage() {
  const { lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();
  const t = T[lang as 'es' | 'en'] || T.es;

  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<AuthProviders | null>(null);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [credError, setCredError] = useState("");
  const [fbReady, setFbReady] = useState(false);
  
  const [ver, setVer] = useState(false);
  const [recordar, setRecordar] = useState(true);

  // Returning user
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [useOther, setUseOther] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("register") === "1") setIsRegister(true);
  }, []);

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
        const le = window.localStorage.getItem("fc-last-user");
        if (le) { setSavedEmail(le); setEmail(le); }
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

    const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
    if (!APP_ID) return () => { isActive = false; };
    const w = window as any;
    const initSdk = () => {
      w.FB!.init({ appId: APP_ID, cookie: true, xfbml: false, version: process.env.NEXT_PUBLIC_FB_API_VERSION || "v25.0" });
      w.FB!.AppEvents.logPageView();
      if (isActive) setFbReady(true);
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
  }, []);

  const hasFacebookProvider = Boolean(providers?.facebook);
  const hasGoogleProvider = Boolean(providers?.google);

  function rememberAndGo() {
    try {
      if (recordar && email) {
        window.localStorage.setItem("fc-last-user", email);
      } else if (!recordar) {
        window.localStorage.removeItem("fc-last-user");
      }
    } catch { /* noop */ }
    setTimeout(() => { window.location.href = getSafeCallbackUrl(); }, 300);
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

  async function handleFacebookLogin() {
    const w = window as any;
    if (!fbReady || !w.FB) {
      popupLogin("facebook");
      return;
    }
    setIsLoading(true);
    setCredError("");
    w.FB.login((response: any) => {
      if (response.status === "connected" && response.authResponse?.accessToken) {
        (async () => {
          try {
            const result = await signIn("facebook-sdk", {
              accessToken: response.authResponse.accessToken,
              redirect: false,
            });
            if (result?.error) {
              setIsLoading(false);
              setCredError(
                result.error === "MetaRateLimit"
                  ? "Facebook tiene demasiadas solicitudes activas. Espera un momento e inténtalo de nuevo."
                  : "No se pudo iniciar sesión con Facebook. Inténtalo de nuevo."
              );
            } else {
              rememberAndGo();
            }
          } catch {
            setIsLoading(false);
            setCredError("Ocurrió un error inesperado al iniciar sesión con Facebook.");
          }
        })();
      } else {
        setIsLoading(false);
        if (response.status !== "unknown" && response.status !== "not_authorized") {
          setCredError("Inicio de sesión con Facebook cancelado.");
        }
      }
    }, { scope: "public_profile,email" });
  }

  function handleGoogleLogin() {
    if (!hasGoogleProvider) { setCredError("Google Login no está configurado en este entorno."); return; }
    popupLogin("google");
  }

  async function handleCredentialsLogin() {
    if (!email || !password) { setCredError(t.errorLlenar); return; }
    setIsLoading(true); setCredError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) { 
      setIsLoading(false); 
      setCredError(result.error === "RATE_LIMIT_EXCEEDED" ? "Demasiados intentos. Por seguridad, espera 5 minutos." : "Email o contraseña incorrectos"); 
      return; 
    }
    rememberAndGo();
  }

  async function handleRegister() {
    if (!name || !email || !password || !confirmPassword) { setCredError(t.errorLlenar); return; }
    if (password.length < 8) { setCredError(t.errorPassLen); return; }
    if (password !== confirmPassword) { setCredError(t.errorPassMatch); return; }
    setIsLoading(true); setCredError("");
    const res = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) { setIsLoading(false); setCredError(data.error || "Error al registrar"); return; }
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
  const isDark = theme === "dark" || theme === "system"; // Simplified for this template
  
  const activo = isDark ? "#35D3D9" : "#0A6E73";
  const activoFg = isDark ? "#0B1214" : "#FDFCFA";

  const handleOlvidar = () => {
    try { window.localStorage.removeItem("fc-last-user"); } catch (e) {}
    setSavedEmail(null);
    setPassword("");
    setUseOther(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--fc-bg)", color: "var(--fc-text)", fontFamily: "var(--fc-font-sans), Manrope, system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "clamp(16px, 3vw, 28px) clamp(16px, 4vw, 40px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <svg viewBox="0 0 100 100" width="30" height="30" aria-hidden="true">
            <rect x="6" y="58" width="20" height="36" rx="10" fill="var(--fc-accent-deep)"></rect>
            <rect x="34" y="34" width="20" height="60" rx="10" fill="var(--fc-accent)"></rect>
            <rect x="62" y="8" width="20" height="86" rx="10" fill="var(--fc-warning)"></rect>
            <rect x="34" y="68" width="20" height="8" rx="4" fill="var(--fc-bg)"></rect>
            <rect x="62" y="68" width="20" height="8" rx="4" fill="var(--fc-bg)"></rect>
          </svg>
          <span style={{ fontSize: "19px", fontWeight: 800, letterSpacing: "-.02em" }}>FlowChart</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", background: "var(--fc-surface)", border: "1px solid var(--fc-border)", borderRadius: "999px", padding: "3px" }}>
            <button onClick={() => setLang("es")} style={{ fontFamily: "inherit", cursor: "pointer", fontSize: "12px", fontWeight: 700, borderRadius: "999px", padding: "7px 14px", border: "none", background: lang === "es" ? activo : "transparent", color: lang === "es" ? activoFg : "var(--fc-text-tertiary)" }}>ES</button>
            <button onClick={() => setLang("en")} style={{ fontFamily: "inherit", cursor: "pointer", fontSize: "12px", fontWeight: 700, borderRadius: "999px", padding: "7px 14px", border: "none", background: lang === "en" ? activo : "transparent", color: lang === "en" ? activoFg : "var(--fc-text-tertiary)" }}>EN</button>
          </div>
          <button onClick={() => setTheme(isDark ? "light" : "dark")} aria-label={isDark ? t.temaClaro : t.temaOscuro} style={{ fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", background: "var(--fc-surface)", border: "1px solid var(--fc-border)", borderRadius: "999px", padding: "8px 14px", color: "var(--fc-text-secondary)", fontSize: "12px", fontWeight: 700 }}>
            {isDark ? (
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"></path></svg>
            )}
            {isDark ? t.temaClaro : t.temaOscuro}
          </button>
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "clamp(24px, 5vw, 72px)", padding: "clamp(16px, 4vw, 56px)" }}>
        <div style={{ flex: "1 1 440px", maxWidth: "600px", display: "flex", flexDirection: "column", gap: "26px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h1 style={{ margin: 0, fontSize: "clamp(30px, 4.4vw, 46px)", lineHeight: 1.05, fontWeight: 800, letterSpacing: "-.03em", textWrap: "balance" as any }}>{t.heroTitulo}</h1>
            <p style={{ margin: 0, fontSize: "clamp(15px, 1.5vw, 17px)", lineHeight: 1.6, color: "var(--fc-text-secondary)", maxWidth: "46ch" }}>{t.heroTexto}</p>
          </div>

          <div style={{ border: "1px solid var(--fc-border)", borderRadius: "18px", background: "var(--fc-surface)", padding: "22px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "24px 40px", alignItems: "flex-end", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--fc-text-tertiary)", fontWeight: 700 }}>{t.metricaLabel}</span>
                <strong style={{ fontSize: "clamp(30px, 3.6vw, 40px)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1 }}>$184.3M <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--fc-text-tertiary)" }}>MXN</span></strong>
              </div>
              <div style={{ display: "flex", gap: "26px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}><span style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-.02em" }}>3.8×</span><span style={{ fontSize: "12px", color: "var(--fc-text-tertiary)" }}>{t.roasLabel}</span></div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}><span style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-.02em" }}>412</span><span style={{ fontSize: "12px", color: "var(--fc-text-tertiary)" }}>{t.cuentasLabel}</span></div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: "clamp(6px, 1.4vw, 12px)", height: "132px" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: "3px", height: "100%" }}><div style={{ height: "30%", borderRadius: "6px 6px 0 0", background: "var(--fc-accent)" }}></div><div style={{ height: "16%", background: "var(--fc-accent-deep)" }}></div><div style={{ height: "10%", borderRadius: "0 0 6px 6px", background: "var(--fc-warning)" }}></div></div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: "3px", height: "100%" }}><div style={{ height: "38%", borderRadius: "6px 6px 0 0", background: "var(--fc-accent)" }}></div><div style={{ height: "20%", background: "var(--fc-accent-deep)" }}></div><div style={{ height: "12%", borderRadius: "0 0 6px 6px", background: "var(--fc-warning)" }}></div></div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: "3px", height: "100%" }}><div style={{ height: "32%", borderRadius: "6px 6px 0 0", background: "var(--fc-accent)" }}></div><div style={{ height: "18%", background: "var(--fc-accent-deep)" }}></div><div style={{ height: "9%", borderRadius: "0 0 6px 6px", background: "var(--fc-warning)" }}></div></div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: "3px", height: "100%" }}><div style={{ height: "46%", borderRadius: "6px 6px 0 0", background: "var(--fc-accent)" }}></div><div style={{ height: "24%", background: "var(--fc-accent-deep)" }}></div><div style={{ height: "14%", borderRadius: "0 0 6px 6px", background: "var(--fc-warning)" }}></div></div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: "3px", height: "100%" }}><div style={{ height: "40%", borderRadius: "6px 6px 0 0", background: "var(--fc-accent)" }}></div><div style={{ height: "20%", background: "var(--fc-accent-deep)" }}></div><div style={{ height: "11%", borderRadius: "0 0 6px 6px", background: "var(--fc-warning)" }}></div></div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: "3px", height: "100%" }}><div style={{ height: "52%", borderRadius: "6px 6px 0 0", background: "var(--fc-accent)" }}></div><div style={{ height: "26%", background: "var(--fc-accent-deep)" }}></div><div style={{ height: "15%", borderRadius: "0 0 6px 6px", background: "var(--fc-warning)" }}></div></div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: "3px", height: "100%" }}><div style={{ height: "58%", borderRadius: "6px 6px 0 0", background: "var(--fc-accent)" }}></div><div style={{ height: "30%", background: "var(--fc-accent-deep)" }}></div><div style={{ height: "18%", borderRadius: "0 0 6px 6px", background: "var(--fc-warning)" }}></div></div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--fc-border-subtle)", paddingTop: "16px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "14px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "12px", color: "var(--fc-text-tertiary)" }}><span style={{ width: "9px", height: "9px", borderRadius: "3px", background: "var(--fc-accent)" }}></span>Facebook</span>
                <span style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "12px", color: "var(--fc-text-tertiary)" }}><span style={{ width: "9px", height: "9px", borderRadius: "3px", background: "var(--fc-accent-deep)" }}></span>Google</span>
                <span style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "12px", color: "var(--fc-text-tertiary)" }}><span style={{ width: "9px", height: "9px", borderRadius: "3px", background: "var(--fc-warning)" }}></span>TikTok</span>
              </div>
              <span style={{ fontSize: "12px", color: "var(--fc-text-disabled)" }}>{t.periodo}</span>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.6, color: "var(--fc-text-tertiary)" }}>{t.pruebaSocial}</p>
        </div>

        <div style={{ flex: "0 1 440px", minWidth: "min(100%, 320px)", background: "var(--fc-surface)", border: "1px solid var(--fc-border)", borderRadius: "20px", padding: "clamp(24px, 4vw, 36px)", display: "flex", flexDirection: "column", gap: "24px", boxShadow: "var(--fc-shadow-overlay)" }}>
          {showReturning ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", textAlign: "center" }}>
                <span style={{ width: "64px", height: "64px", borderRadius: "999px", background: "var(--fc-accent-wash)", color: "var(--fc-accent)", display: "grid", placeItems: "center", fontSize: "26px", fontWeight: 800 }}>
                  {savedEmail ? savedEmail[0].toUpperCase() : "U"}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <strong style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-.02em" }}>{t.saludo},</strong>
                  <span style={{ fontSize: "14px", color: "var(--fc-text-tertiary)" }}>{savedEmail}</span>
                </div>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--fc-text-secondary)" }}>{t.etiquetaPass}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "10px", height: "52px", padding: "0 16px", border: "1px solid var(--fc-border-strong)", borderRadius: "12px", background: "var(--fc-bg)" }}>
                  <input type={ver ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" aria-label={t.etiquetaPass} style={{ font: "inherit", color: "inherit", background: "none", border: "none", outline: "none", width: "100%" }} />
                  <button onClick={() => setVer(!ver)} style={{ fontFamily: "inherit", cursor: "pointer", background: "none", border: "none", fontSize: "13px", fontWeight: 700, color: "var(--fc-text-tertiary)", whiteSpace: "nowrap" }}>{ver ? t.ocultar : t.ver}</button>
                </span>
              </label>
              {credError && <div style={{ color: "var(--fc-danger)", fontSize: "13px", fontWeight: 600 }}>{credError}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <button onClick={submit} disabled={isLoading} style={{ fontFamily: "inherit", cursor: isLoading ? "wait" : "pointer", height: "54px", border: "none", borderRadius: "12px", background: "var(--fc-accent)", color: "var(--fc-on-accent)", fontSize: "16px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", transition: "background 220ms ease", opacity: isLoading ? 0.7 : 1 }}>
                  {isLoading ? (
                    <span style={{ position: "relative", width: "22px", height: "22px", flex: "none" }}>
                      <span style={{ position: "absolute", left: "1.3px", bottom: "1.3px", width: "4.4px", height: "36%", transformOrigin: "bottom", borderRadius: "2.2px", background: "currentColor", opacity: 0.55, animation: "fcB1 1.4s ease-in-out infinite" }}></span>
                      <span style={{ position: "absolute", left: "7.5px", bottom: "1.3px", width: "4.4px", height: "60%", transformOrigin: "bottom", borderRadius: "2.2px", background: "currentColor", opacity: 0.8, animation: "fcB2 1.4s ease-in-out infinite .12s" }}></span>
                      <span style={{ position: "absolute", left: "13.7px", bottom: "1.3px", width: "4.4px", height: "86%", transformOrigin: "bottom", borderRadius: "2.2px", background: "currentColor", animation: "fcB3 1.4s ease-in-out infinite .24s" }}></span>
                    </span>
                  ) : t.ctaEntrar}
                </button>
                <button onClick={handleOlvidar} style={{ fontFamily: "inherit", cursor: "pointer", background: "none", border: "none", fontSize: "14px", fontWeight: 600, color: "var(--fc-text-tertiary)" }}>{t.otraCuenta}</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 800, letterSpacing: "-.02em" }}>{isRegister ? t.ctaReg : t.tituloForm}</h2>
                <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.55, color: "var(--fc-text-tertiary)" }}>{t.subtituloForm}</p>
              </div>

              {!isRegister && (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <button onClick={handleFacebookLogin} disabled={isLoading || !hasFacebookProvider} style={{ fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", height: "50px", border: "1px solid var(--fc-border)", borderRadius: "12px", background: "var(--fc-surface-raised)", color: "var(--fc-text)", fontSize: "15px", fontWeight: 700, opacity: isLoading ? 0.7 : 1 }}>
                      <span style={{ width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}><FacebookIcon width={20} height={20} /></span>
                      {t.conMeta}
                    </button>
                    <button onClick={handleGoogleLogin} disabled={isLoading || !hasGoogleProvider} style={{ fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", height: "50px", border: "1px solid var(--fc-border)", borderRadius: "12px", background: "var(--fc-surface-raised)", color: "var(--fc-text)", fontSize: "15px", fontWeight: 700, opacity: isLoading ? 0.7 : 1 }}>
                      <span style={{ width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}><GoogleIcon width={20} height={20} /></span>
                      {t.conGoogle}
                    </button>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <span style={{ flex: 1, height: "1px", background: "var(--fc-border)" }}></span>
                    <span style={{ fontSize: "13px", color: "var(--fc-text-disabled)" }}>{t.oCorreo}</span>
                    <span style={{ flex: 1, height: "1px", background: "var(--fc-border)" }}></span>
                  </div>
                </>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {isRegister && (
                  <label style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--fc-text-secondary)" }}>{t.nombreCorto}</span>
                    <span style={{ display: "flex", alignItems: "center", height: "52px", padding: "0 16px", border: "1px solid var(--fc-border-strong)", borderRadius: "12px", background: "var(--fc-bg)" }}>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Juan Pérez" aria-label={t.nombreCorto} style={{ font: "inherit", color: "inherit", background: "none", border: "none", outline: "none", width: "100%" }} />
                    </span>
                  </label>
                )}
                
                <label style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--fc-text-secondary)" }}>{t.etiquetaCorreo}</span>
                  <span style={{ display: "flex", alignItems: "center", height: "52px", padding: "0 16px", border: "1px solid var(--fc-border-strong)", borderRadius: "12px", background: "var(--fc-bg)" }}>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@empresa.com" aria-label={t.etiquetaCorreo} style={{ font: "inherit", color: "inherit", background: "none", border: "none", outline: "none", width: "100%" }} />
                  </span>
                </label>
                
                <label style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--fc-text-secondary)" }}>{t.etiquetaPass}</span>
                    {!isRegister && <a href="/forgot-password" style={{ fontSize: "13px", fontWeight: 600, color: "var(--fc-accent)", textDecoration: "none" }}>{t.olvide}</a>}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", height: "52px", padding: "0 16px", border: "1px solid var(--fc-border-strong)", borderRadius: "12px", background: "var(--fc-bg)" }}>
                    <input type={ver ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" aria-label={t.etiquetaPass} style={{ font: "inherit", color: "inherit", background: "none", border: "none", outline: "none", width: "100%" }} />
                    <button onClick={() => setVer(!ver)} style={{ fontFamily: "inherit", cursor: "pointer", background: "none", border: "none", fontSize: "13px", fontWeight: 700, color: "var(--fc-text-tertiary)", whiteSpace: "nowrap" }}>{ver ? t.ocultar : t.ver}</button>
                  </span>
                </label>
                
                {isRegister && (
                  <label style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--fc-text-secondary)" }}>{t.confirmaPass}</span>
                    <span style={{ display: "flex", alignItems: "center", height: "52px", padding: "0 16px", border: "1px solid var(--fc-border-strong)", borderRadius: "12px", background: "var(--fc-bg)" }}>
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" aria-label={t.confirmaPass} style={{ font: "inherit", color: "inherit", background: "none", border: "none", outline: "none", width: "100%" }} />
                    </span>
                  </label>
                )}
              </div>

              {!isRegister && (
                <button onClick={() => setRecordar(!recordar)} style={{ fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", padding: 0, textAlign: "left" }}>
                  <span style={{ width: "20px", height: "20px", borderRadius: "6px", border: "1px solid var(--fc-border-strong)", background: recordar ? activo : "transparent", display: "grid", placeItems: "center" }}>
                    {recordar && (
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--fc-on-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5L9.5 18L20 6.5"></path></svg>
                    )}
                  </span>
                  <span style={{ fontSize: "14px", color: "var(--fc-text-secondary)" }}>{t.recordarme}</span>
                </button>
              )}

              {credError && <div style={{ color: "var(--fc-danger)", fontSize: "13px", fontWeight: 600 }}>{credError}</div>}

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <button onClick={submit} disabled={isLoading} style={{ fontFamily: "inherit", cursor: isLoading ? "wait" : "pointer", height: "54px", border: "none", borderRadius: "12px", background: "var(--fc-accent)", color: "var(--fc-on-accent)", fontSize: "16px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", transition: "background 220ms ease", opacity: isLoading ? 0.7 : 1 }}>
                  {isLoading ? (
                    <span style={{ position: "relative", width: "22px", height: "22px", flex: "none" }}>
                      <span style={{ position: "absolute", left: "1.3px", bottom: "1.3px", width: "4.4px", height: "36%", transformOrigin: "bottom", borderRadius: "2.2px", background: "currentColor", opacity: 0.55, animation: "fcB1 1.4s ease-in-out infinite" }}></span>
                      <span style={{ position: "absolute", left: "7.5px", bottom: "1.3px", width: "4.4px", height: "60%", transformOrigin: "bottom", borderRadius: "2.2px", background: "currentColor", opacity: 0.8, animation: "fcB2 1.4s ease-in-out infinite .12s" }}></span>
                      <span style={{ position: "absolute", left: "13.7px", bottom: "1.3px", width: "4.4px", height: "86%", transformOrigin: "bottom", borderRadius: "2.2px", background: "currentColor", animation: "fcB3 1.4s ease-in-out infinite .24s" }}></span>
                    </span>
                  ) : (isRegister ? t.ctaReg : t.ctaEntrar)}
                </button>
                <p style={{ margin: 0, textAlign: "center", fontSize: "14px", color: "var(--fc-text-tertiary)" }}>
                  {isRegister ? "¿Ya tienes una cuenta?" : t.sinCuenta}{" "}
                  <button onClick={() => setIsRegister(!isRegister)} style={{ fontWeight: 700, color: "var(--fc-accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "14px" }}>
                    {isRegister ? t.ctaEntrar : t.crearUna}
                  </button>
                </p>
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", borderTop: "1px solid var(--fc-border-subtle)", paddingTop: "18px" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "99px", background: "var(--fc-success)" }}></span>
            <span style={{ fontSize: "12px", color: "var(--fc-text-disabled)" }}>{t.cifrado}</span>
          </div>

        </div>
      </main>

      <footer style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px", justifyContent: "center", padding: "0 24px 28px", fontSize: "12px", color: "var(--fc-text-disabled)" }}>
        <span>© 2026 FlowChart</span>
        <a href="/aviso-de-privacidad" style={{ color: "inherit", textDecoration: "none" }}>{t.privacidad}</a>
        <a href="/terminos" style={{ color: "inherit", textDecoration: "none" }}>{t.terminos}</a>
        <a href="/soporte" style={{ color: "inherit", textDecoration: "none" }}>{t.soporte}</a>
      </footer>

    </div>
  );
}
