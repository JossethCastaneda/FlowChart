"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, RefreshCw, Plus, ExternalLink, Loader2,
  AlertCircle, CheckCircle, X, Shield,
} from "lucide-react";
import { openConnectPopup } from "@/lib/connect-popup";
import { useLanguage } from "@/components/layout/LanguageContext";

// ─── Translations ────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  es: {
    title: "Facebook y FB Messenger",
    subtitle: "Conecta tu página de Facebook.",
    noPageLink: "¿No tienes una página de Facebook? Créala desde aquí",
    connectedOn: "Conectado el",
    grantPermissions: "Dar permisos al bot",
    opening: "Abriendo…",
    errorLoading: "Error cargando páginas",
    errorNetwork: "Error de red",
    retry: "Reintentar",
    notConnected: "No conectado",
    connectPrompt: "Conecta tu cuenta de Facebook para gestionar tus páginas",
    connectBtn: "Conectar Facebook",
    enabledAccounts: "Cuentas Habilitadas",
    noPages: "No hay páginas disponibles. Asegúrate de tener una página de Facebook y vuelve a dar permisos.",
    pageLinked: "página vinculada",
    pagesLinked: "páginas vinculadas",
    noPagesConnected: "Sin páginas conectadas",
    renewAuth: "Renovar autorizaciones",
    profile: "PERFIL",
    messenger: "Messenger",
    facebookPage: "Facebook Page",
    active: "Activo",
    inactive: "Inactivo",
    authPermission: "Permiso de autorización",
    missingScopesAlert: "Permisos faltantes",
    missingScopesMsg: "La conexión es parcial porque faltan permisos requeridos para publicar o gestionar mensajes. Por favor re-autoriza:",
    footerInfo: "Los toggles de Messenger y Facebook Page controlan qué canales de cada página reciben mensajes en el Inbox. Para renovar permisos o agregar páginas, haz clic en Dar permisos al bot.",
  },
  en: {
    title: "Facebook & FB Messenger",
    subtitle: "Connect the bot to your Facebook page.",
    noPageLink: "Don't have a Facebook page? Create it here",
    connectedOn: "Connected on",
    grantPermissions: "Grant permissions to bot",
    opening: "Opening...",
    errorLoading: "Error loading pages",
    errorNetwork: "Network error",
    retry: "Retry",
    notConnected: "Not connected",
    connectPrompt: "Connect your Facebook account to manage your pages",
    connectBtn: "Connect Facebook",
    enabledAccounts: "Enabled Accounts",
    noPages: "No pages available. Make sure you have a Facebook page and grant permissions again.",
    pageLinked: "page linked",
    pagesLinked: "pages linked",
    noPagesConnected: "No connected pages",
    renewAuth: "Renew authorizations",
    profile: "PROFILE",
    messenger: "Messenger",
    facebookPage: "Facebook Page",
    active: "Active",
    inactive: "Inactive",
    authPermission: "Authorization permission",
    missingScopesAlert: "Missing Permissions",
    missingScopesMsg: "The connection is partial because required permissions for publishing or messaging are missing. Please re-authorize:",
    footerInfo: "The Messenger and Facebook Page toggles control which channels of each page receive messages in the Inbox. To renew permissions or add pages, click Grant permissions to bot.",
  }
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface FbPage {
  id: string;
  name: string;
  picture: string | null;
  email: string | null;
  category: string | null;
  messengerEnabled: boolean;
  pageEnabled: boolean;
  instagram: { id: string; username: string; picture: string | null } | null;
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: checked ? "var(--cyan)" : "var(--border-strong)",
        border: checked ? "none" : "1px solid var(--border)",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.2s ease",
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "white",
          transition: "left 0.2s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

// ─── Page Avatar ──────────────────────────────────────────────────────────────
function PageAvatar({ name, picture, pageId }: { name: string; picture: string | null; pageId: string }) {
  const [err, setErr] = useState(false);
  if (!err) {
    // Use Graph API redirect to always get a fresh, non-expired picture
    const src = `https://graph.facebook.com/${pageId}/picture?type=large`;
    return (
      <img
        src={src}
        alt={name}
        onError={() => setErr(true)}
        style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border-strong)" }}
      />
    );
  }
  return (
    <div style={{
      width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, var(--cyan), var(--purple))",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 15, fontWeight: 700, color: "var(--foreground)", border: "2px solid var(--border-strong)",
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Messenger SVG icon ───────────────────────────────────────────────────────
const MessengerIcon = () => (
  <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor">
    <path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.193 14.963l-3.056-3.259-5.963 3.259 6.559-6.963 3.13 3.259 5.889-3.259-6.559 6.963z" />
  </svg>
);

const MetaIcon = () => (
  <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FacebookPagesPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];

  const [pages, setPages] = useState<FbPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<{ pageId: string; field: string } | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [missingScopes, setMissingScopes] = useState<string[]>([]);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/connect/facebook-pages");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (lang === "es" ? "Error cargando páginas" : "Error loading pages"));
      setConnected(data.connected ?? false);
      setConnectedAt(data.connectedAt || null);
      setPages(data.pages || []);
      setMissingScopes(data.missingScopes || []);
    } catch (e: any) {
      setError(e.message || (lang === "es" ? "Error de red" : "Network error"));
    }
    setLoading(false);
  }, [lang]);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const handleToggle = async (pageId: string, field: "messengerEnabled" | "pageEnabled", value: boolean) => {
    setToggling({ pageId, field });
    // Optimistic update
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, [field]: value } : p));
    try {
      await fetch("/api/connect/facebook-pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, [field]: value }),
      });
    } catch {
      // revert on error
      setPages(prev => prev.map(p => p.id === pageId ? { ...p, [field]: !value } : p));
    }
    setToggling(null);
  };

  const handleReconnect = () => {
    setReconnecting(true);
    openConnectPopup("community", () => {
      setReconnecting(false);
      fetchPages();
    });
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        .fb-row:hover { background: var(--surface-hover) !important; }
      `}</style>

      <div style={{
        display: "flex", flexDirection: "column", gap: 0,
        minHeight: "100vh", padding: "0 0 40px",
        animation: "fadeIn 0.25s ease",
        fontFamily: "inherit",
      }}>

        {/* ── Top bar ─────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 28px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)", 
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={() => router.back()}
              style={{
                background: "var(--surface-hover)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "5px 8px", cursor: "pointer", color: "var(--text-secondary)",
                display: "flex", alignItems: "center",
              }}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Messenger icon badge */}
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, var(--cyan), #2563eb)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,100,224,0.3)",
              color: "var(--foreground)",
            }}>
              <MessengerIcon />
            </div>

            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: 0, letterSpacing: "-0.02em" }}>
                {t.title}
              </h1>
              {connectedAt && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
                  {t.connectedOn} {fmtDate(connectedAt)}
                </p>
              )}
            </div>
          </div>

          {/* Dar permisos / Renovar */}
          <button
            onClick={handleReconnect}
            disabled={reconnecting}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 16px", borderRadius: 8,
              background: reconnecting ? "var(--cyan-dim)" : "var(--cyan-dim)",
              border: "1px solid var(--border-strong)",
              color: "var(--cyan)", fontSize: 12, fontWeight: 600,
              cursor: reconnecting ? "wait" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {reconnecting ? (
              <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Plus size={13} />
            )}
            {reconnecting ? t.opening : t.grantPermissions}
          </button>
        </div>

        {/* ── Subtitle ───────────────────────────────────────────── */}
        <div style={{ padding: "12px 28px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
            {t.subtitle}{" "}
            <a
              href="https://www.facebook.com/pages/create"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--cyan)", textDecoration: "underline" }}
            >
              {t.noPageLink}
            </a>
          </p>
        </div>

        {/* ── Content ────────────────────────────────────────────── */}
        <div style={{ padding: "28px 28px 0" }}>

          {/* Error */}
          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", borderRadius: 10,
              background: "var(--red-dim)", border: "1px solid var(--red)",
              color: "var(--red)", fontSize: 12, marginBottom: 20,
            }}>
              <AlertCircle size={14} />
              {error}
              <button onClick={fetchPages} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--red)", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: "inherit" }}>
                <RefreshCw size={11} /> {t.retry}
              </button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(2)].map((_, i) => (
                <div key={i} style={{ height: 68, borderRadius: 10, background: "var(--surface-hover)", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}

          {/* Not connected */}
          {!loading && !connected && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--cyan-dim)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--cyan)" }}>
                <MetaIcon />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: "0 0 6px" }}>{t.notConnected}</p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 20px" }}>{t.connectPrompt}</p>
              <button
                onClick={handleReconnect}
                style={{ padding: "10px 20px", borderRadius: 8, background: "var(--cyan-dim)", border: "1px solid var(--border-strong)", color: "var(--cyan)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Plus size={13} /> {t.connectBtn}
              </button>
            </div>
          )}

          {/* Connected — table */}
          {!loading && connected && (
            <div>
              {/* Section header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{t.enabledAccounts}</h2>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0" }}>
                    {pages.length === 0 ? t.noPagesConnected : `${pages.length} ${pages.length !== 1 ? t.pagesLinked : t.pageLinked}`}
                  </p>
                </div>
                <button
                  onClick={handleReconnect}
                  disabled={reconnecting}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "none", border: "none", cursor: reconnecting ? "wait" : "pointer",
                    color: "var(--cyan)", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  }}
                >
                  <RefreshCw size={12} style={{ animation: reconnecting ? "spin 1s linear infinite" : "none" }} />
                  {t.renewAuth}
                </button>
              </div>

              {/* Missing scopes warning */}
              {missingScopes.length > 0 && (
                <div style={{
                  padding: "16px 20px", borderRadius: 12, background: "var(--red-dim)", border: "1px solid var(--red)",
                  marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12
                }}>
                  <AlertCircle size={18} style={{ color: "var(--red)", marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--red)", margin: "0 0 4px" }}>{t.missingScopesAlert}</h3>
                    <p style={{ fontSize: 12, color: "var(--red)", opacity: 0.9, margin: "0 0 10px" }}>{t.missingScopesMsg}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {missingScopes.map(scope => (
                        <span key={scope} style={{ background: "var(--red-dim)", border: "1px solid rgba(229,72,77,0.3)", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--red)" }}>
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Empty pages */}
              {pages.length === 0 && (
                <div style={{ padding: "40px 20px", textAlign: "center", borderRadius: 12, border: "1px dashed var(--border)", background: "var(--surface)" }}>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
                    {t.noPages}
                  </p>
                </div>
              )}

              {/* Pages table */}
              {pages.length > 0 && (
                <div style={{ borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", background: "var(--surface)" }}>
                  {/* Table head */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 180px 180px",
                    background: "var(--surface-hover)",
                    borderBottom: "1px solid var(--border)",
                    padding: "10px 20px",
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.06em" }}>{t.profile}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 18, height: 18, borderRadius: 5, background: "linear-gradient(135deg, var(--cyan), #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--foreground)" }}>
                        <MessengerIcon />
                      </div>
                      {t.messenger}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 18, height: 18, borderRadius: 5, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--foreground)" }}>
                        <MetaIcon />
                      </div>
                      {t.facebookPage}
                    </span>
                  </div>

                  {/* Rows */}
                  {pages.map((page, idx) => {
                    const isTogglingPage = toggling?.pageId === page.id && toggling.field === "pageEnabled";

                    return (
                      <div
                        key={page.id}
                        className="fb-row"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 180px 180px",
                          padding: "16px 20px",
                          borderTop: idx > 0 ? "1px solid var(--border-neutral)" : "none",
                          background: "transparent",
                          transition: "background 0.15s",
                          alignItems: "center",
                        }}
                      >
                        {/* Profile column */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ position: "relative" }}>
                            <PageAvatar name={page.name} picture={page.picture} pageId={page.id} />
                            {/* minus / indicator */}
                            <div style={{
                              position: "absolute", bottom: -1, right: -1,
                              width: 14, height: 14, borderRadius: "50%",
                              background: "var(--background)", border: "1.5px solid var(--border)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <div style={{ width: 6, height: 2, background: "var(--text-muted)", borderRadius: 1 }} />
                            </div>
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{page.name}</p>
                            {page.email && (
                              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>{page.email}</p>
                            )}
                            {page.category && !page.email && (
                              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>{page.category}</p>
                            )}
                            {page.instagram && (
                              <p style={{ fontSize: 10, color: "var(--purple)", margin: 0 }}>@{page.instagram.username}</p>
                            )}
                          </div>
                        </div>

                        {/* Messenger toggle column */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {isTogglingPage && toggling?.field === "messengerEnabled" ? (
                              <Loader2 size={14} style={{ color: "var(--cyan)", animation: "spin 1s linear infinite" }} />
                            ) : (
                              <Toggle
                                checked={page.messengerEnabled}
                                onChange={(v) => handleToggle(page.id, "messengerEnabled", v)}
                              />
                            )}
                            <span style={{ fontSize: 12, color: page.messengerEnabled ? "var(--foreground)" : "var(--text-secondary)", fontWeight: 500 }}>
                              {page.messengerEnabled ? t.active : t.inactive}
                            </span>
                          </div>
                          <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 11, textAlign: "left", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit", padding: 0 }}>
                            <Shield size={10} /> {t.authPermission}
                          </button>
                        </div>

                        {/* Facebook Page toggle column */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {isTogglingPage ? (
                              <Loader2 size={14} style={{ color: "var(--cyan)", animation: "spin 1s linear infinite" }} />
                            ) : (
                              <Toggle
                                checked={page.pageEnabled}
                                onChange={(v) => handleToggle(page.id, "pageEnabled", v)}
                              />
                            )}
                            <span style={{ fontSize: 12, color: page.pageEnabled ? "var(--foreground)" : "var(--text-secondary)", fontWeight: 500 }}>
                              {page.pageEnabled ? t.active : t.inactive}
                            </span>
                          </div>
                          <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 11, textAlign: "left", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit", padding: 0 }}>
                            <Shield size={10} /> {t.authPermission}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Info footer */}
              <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 10, background: "var(--cyan-dim)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <CheckCircle size={13} style={{ color: "var(--cyan)", flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
                  {t.footerInfo}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
