/* eslint-disable @next/next/no-html-link-for-pages, @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { FlowChartLogo } from "@/components/ui/FlowChartLogo";
import { GalaxyBackground } from "@/components/ui/GalaxyBackground";
import { useLanguage } from "@/components/layout/LanguageContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

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
  const [fbReady, setFbReady] = useState(false);
  const { lang, setLang } = useLanguage();
  const [success, setSuccess] = useState(false);

  // Returning user
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string>("");
  const [useOther, setUseOther] = useState(false);

  const t = STRINGS[lang];

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
        const le = window.localStorage.getItem("flowchart:lastEmail");
        const ln = window.localStorage.getItem("flowchart:lastName");
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

  const providerStatusLoaded = providers !== null;
  const hasFacebookProvider = Boolean(providers?.facebook);
  const hasGoogleProvider = Boolean(providers?.google);

  function rememberAndGo() {
    try {
      window.localStorage.setItem("flowchart:lastEmail", email);
      if (name) window.localStorage.setItem("flowchart:lastName", name);
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
            const { signIn } = await import("next-auth/react");
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
    <div className="fc-login-root">
      <GalaxyBackground />

      <div className="fc-login-lang-toggle">
        <button
          className={`fc-login-lang-btn${lang === "es" ? " fc-login-lang-btn--active" : ""}`}
          onClick={() => setLang("es")}
        >
          ES
        </button>
        <button
          className={`fc-login-lang-btn${lang === "en" ? " fc-login-lang-btn--active" : ""}`}
          onClick={() => setLang("en")}
        >
          EN
        </button>
      </div>

      <div className="fc-login-card">
        <div className="fc-login-system-label">· FLOWCHART COMMAND BRIDGE ·</div>

        <div className="fc-login-logo">
          <a href="/">
            <FlowChartLogo size="lg" />
          </a>
        </div>

        {success ? (
          <div className="fc-login-success">
            <div className="fc-login-success-icon">
              <Icon name="verificado" size={32} />
            </div>
            <div className="fc-login-success-title">{t.successTitle}</div>
            <div className="fc-login-success-sub">{t.successSub}</div>
          </div>
        ) : showReturning ? (
          <>
            <div className="fc-login-returning">
              <div className="fc-login-avatar">
                {(savedName || savedEmail || "U").trim().charAt(0).toUpperCase()}
              </div>
              <div className="fc-login-returning-hi">{t.returningHi(savedName || "")}</div>
              <div className="fc-login-returning-email">{savedEmail}</div>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <Input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setCredError(""); }}
                placeholder={t.pwReturning}
                error={!!credError}
              />
            </div>

            {credError && (
              <div className="fc-login-error">
                <Icon name="alerta" size={14} /> {credError}
              </div>
            )}

            <Button
              variant="primary"
              onClick={submit}
              loading={isLoading}
              style={{ width: "100%" }}
            >
              {t.ctaLogin}
            </Button>

            <button className="fc-login-other-btn" onClick={() => { setUseOther(true); setPassword(""); setCredError(""); }}>
              {t.useOther}
            </button>
          </>
        ) : (
          <>
            <div className="fc-login-header">
              <h1 className="fc-login-title">{t.title}</h1>
              <p className="fc-login-subtitle">{t.subtitle}</p>
            </div>

            <div className="fc-login-oauth">
              <Button
                variant="secondary"
                onClick={handleFacebookLogin}
                disabled={isLoading || !providerStatusLoaded || !hasFacebookProvider}
                style={{ flex: 1 }}
              >
                Meta
              </Button>
              <Button
                variant="secondary"
                onClick={handleGoogleLogin}
                disabled={isLoading || !providerStatusLoaded || !hasGoogleProvider}
                style={{ flex: 1 }}
              >
                Google
              </Button>
            </div>

            <div className="fc-login-divider">
              <span className="fc-login-divider-line" />
              <span className="fc-login-divider-text">{t.orEmail}</span>
              <span className="fc-login-divider-line" />
            </div>

            <div className="fc-login-tabs">
              <button
                className={`fc-login-tab${!isRegister ? " fc-login-tab--active" : ""}`}
                onClick={() => { setIsRegister(false); setCredError(""); }}
              >
                {t.tabLogin}
              </button>
              <button
                className={`fc-login-tab${isRegister ? " fc-login-tab--active" : ""}`}
                onClick={() => { setIsRegister(true); setCredError(""); }}
              >
                {t.tabReg}
              </button>
            </div>

            {isRegister && (
              <div style={{ marginBottom: "12px" }}>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.name}
                />
              </div>
            )}

            <div style={{ marginBottom: "12px" }}>
              <Input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setCredError(""); }}
                placeholder="tu@empresa.com"
                error={!!credError}
              />
            </div>

            <div style={{ marginBottom: "12px" }}>
              <Input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setCredError(""); }}
                placeholder="••••••••"
                error={!!credError}
              />
            </div>

            {isRegister && (
              <div style={{ marginBottom: "12px" }}>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.confirmPw}
                />
              </div>
            )}

            {credError && (
              <div className="fc-login-error">
                <Icon name="alerta" size={14} /> {credError}
              </div>
            )}

            {!isRegister && (
              <a href="/forgot-password" className="fc-login-forgot">
                {t.forgot}
              </a>
            )}

            <Button
              variant="primary"
              onClick={submit}
              loading={isLoading}
              style={{ width: "100%", marginTop: isRegister ? "12px" : "0" }}
            >
              {isRegister ? t.ctaReg : t.ctaLogin}
            </Button>

            <div className="fc-login-secure">
              <Icon name="verificado" size={12} /> {t.secure}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
