"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, RefreshCw, ExternalLink, Loader2,
  AlertCircle, CheckCircle, Copy, Check, Info, Zap,
} from "lucide-react";
import { openConnectPopup } from "@/lib/connect-popup";
import { useLanguage } from "@/components/layout/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StatusData {
  integration: {
    id: string;
    connected: boolean;
    connectedAt: string | null;
    username: string | null;
    instagramUserId: string | null;
  } | null;
  webhookConfig: {
    callbackUrl: string;
    verifyToken: string | null;
    verifyTokenHint: string;
    appId: string | null;
    subscribedFields: string[];
  };
  subscriptionStatus: {
    active: boolean;
    fields?: string[];
    error?: string;
  } | null;
}

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  es: {
    title: "Instagram Direct",
    subtitle: "Conecta tu cuenta de Instagram para recibir DMs y comentarios en el Inbox.",
    back: "Volver",
    connectBtn: "Conectar Instagram",
    reconnectBtn: "Reconectar",
    resubscribeBtn: "Reactivar Webhooks",
    connected: "Conectado",
    notConnected: "No conectado",
    connectedAs: "Conectado como",
    connectedOn: "Conectado el",
    loading: "Cargando...",
    opening: "Abriendo...",
    webhookTitle: "Configuración de Webhook (Meta Developers)",
    webhookDesc: "Para recibir mensajes y comentarios, debes configurar el webhook en la app de Instagram en Meta Developers.",
    callbackUrl: "Callback URL",
    verifyToken: "Verify Token",
    copied: "Copiado",
    copy: "Copiar",
    webhookActive: "Webhook activo — recibirás mensajes y comentarios",
    webhookInactive: "Webhook inactivo — configura el webhook en Meta Developers",
    webhookFields: "Campos suscritos",
    step1: "Paso 1: Ir a Meta Developers",
    step1Desc: "Abre Meta for Developers y selecciona la app de Instagram.",
    step2: "Paso 2: Configurar Webhook",
    step2Desc: "En el menú izquierdo → Instagram → Webhooks → Add Callback URL",
    step3: "Paso 3: Suscribir campos",
    step3Desc: "Después de verificar, suscríbete a: messages, comments, mentions, messaging_postbacks, story_insights",
    step4: "Paso 4: Reconectar",
    step4Desc: "Haz clic en 'Reconectar' para activar la suscripción automática.",
    openMetaDev: "Abrir Meta Developers",
    errorLoading: "Error cargando estado",
    resubscribeSuccess: "¡Webhooks reactivados correctamente!",
    resubscribeError: "Error al reactivar webhooks",
    noTokenWarning: "META_WEBHOOK_VERIFY_TOKEN no esta configurado en Vercel. Sin este token, Meta Developers no puede verificar el webhook.",
  },
  en: {
    title: "Instagram Direct",
    subtitle: "Connect your Instagram account to receive DMs and comments in the Inbox.",
    back: "Back",
    connectBtn: "Connect Instagram",
    reconnectBtn: "Reconnect",
    resubscribeBtn: "Reactivate Webhooks",
    connected: "Connected",
    notConnected: "Not connected",
    connectedAs: "Connected as",
    connectedOn: "Connected on",
    loading: "Loading...",
    opening: "Opening...",
    webhookTitle: "Webhook Configuration (Meta Developers)",
    webhookDesc: "To receive messages and comments, you must configure the webhook in the Instagram app on Meta Developers.",
    callbackUrl: "Callback URL",
    verifyToken: "Verify Token",
    copied: "Copied",
    copy: "Copy",
    webhookActive: "Webhook active — you will receive messages and comments",
    webhookInactive: "Webhook inactive — configure the webhook on Meta Developers",
    webhookFields: "Subscribed fields",
    step1: "Step 1: Go to Meta Developers",
    step1Desc: "Open Meta for Developers and select the Instagram app.",
    step2: "Step 2: Configure Webhook",
    step2Desc: "Left menu → Instagram → Webhooks → Add Callback URL",
    step3: "Step 3: Subscribe to fields",
    step3Desc: "After verifying, subscribe to: messages, comments, mentions, messaging_postbacks, story_insights",
    step4: "Step 4: Reconnect",
    step4Desc: "Click 'Reconnect' to activate the automatic subscription.",
    openMetaDev: "Open Meta Developers",
    errorLoading: "Error loading status",
    resubscribeSuccess: "Webhooks reactivated successfully!",
    resubscribeError: "Error reactivating webhooks",
    noTokenWarning: "META_WEBHOOK_VERIFY_TOKEN is not configured in Vercel. Without this token, Meta Developers cannot verify the webhook.",
  },
};

// ─── CopyButton Component ─────────────────────────────────────────────────────
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all"
      style={{
        background: copied ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)",
        color: copied ? "#22c55e" : "#a1a1aa",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copiado" : label}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InstagramIntegrationPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const t = T[lang as keyof typeof T] ?? T.es;

  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [resubscribing, setResubscribing] = useState(false);
  const [resubscribeMsg, setResubscribeMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/integrations/instagram/status");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setStatus(data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO: [React] Refactor de hooks anti-patrón
  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await openConnectPopup("/api/integrations/instagram/connect");
      await loadStatus();
    } finally {
      setConnecting(false);
    }
  };

  const handleResubscribe = async () => {
    setResubscribing(true);
    setResubscribeMsg(null);
    try {
      const res = await fetch("/api/integrations/instagram/resubscribe", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setResubscribeMsg({ type: "success", text: t.resubscribeSuccess });
        await loadStatus();
      } else {
        setResubscribeMsg({ type: "error", text: data.error || t.resubscribeError });
      }
    } catch {
      setResubscribeMsg({ type: "error", text: t.resubscribeError });
    } finally {
      setResubscribing(false);
    }
  };

  const isConnected = status?.integration?.connected;
  const webhook = status?.webhookConfig;
  const sub = status?.subscriptionStatus;

  return (
    <div className="min-h-screen" style={{ background: "#09090b", color: "#fafafa" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm"
            style={{ color: "#a1a1aa" }}
          >
            <ChevronLeft size={16} /> {t.back}
          </button>
          <span style={{ color: "#3f3f46" }}>|</span>
          {/* Instagram gradient icon */}
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-base font-semibold">{t.title}</h1>
            <p style={{ fontSize: 12, color: "#71717a", marginTop: 1 }}>{t.subtitle}</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 24px" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#71717a" }}>
            <Loader2 size={16} className="animate-spin" /> {t.loading}
          </div>
        ) : (
          <>
            {/* ── Connection Status Card ── */}
            <div style={{
              background: "#18181b",
              border: `1px solid ${isConnected ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {isConnected && status?.integration?.username ? `@${status.integration.username}` : t.title}
                      </span>
                      {isConnected ? (
                        <span style={{
                          fontSize: 10, padding: "2px 6px", borderRadius: 20,
                          background: "rgba(34,197,94,0.15)", color: "#22c55e",
                          fontWeight: 600, letterSpacing: 0.5,
                        }}>
                          {t.connected.toUpperCase()}
                        </span>
                      ) : (
                        <span style={{
                          fontSize: 10, padding: "2px 6px", borderRadius: 20,
                          background: "rgba(113,113,122,0.15)", color: "#71717a",
                          fontWeight: 600, letterSpacing: 0.5,
                        }}>
                          {t.notConnected.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {isConnected && status?.integration?.connectedAt && (
                      <p style={{ fontSize: 11, color: "#71717a", marginTop: 2 }}>
                        {t.connectedOn}: {new Date(status.integration.connectedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {isConnected && (
                    <button
                      onClick={handleResubscribe}
                      disabled={resubscribing}
                      className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-all"
                      style={{
                        background: "rgba(99,102,241,0.12)",
                        border: "1px solid rgba(99,102,241,0.25)",
                        color: "#818cf8",
                        cursor: resubscribing ? "not-allowed" : "pointer",
                      }}
                    >
                      {resubscribing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                      {t.resubscribeBtn}
                    </button>
                  )}
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-all"
                    style={{
                      background: "linear-gradient(135deg, rgba(240,148,51,0.15), rgba(188,24,136,0.15))",
                      border: "1px solid rgba(220,39,67,0.25)",
                      color: "#f87171",
                      cursor: connecting ? "not-allowed" : "pointer",
                    }}
                  >
                    {connecting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {isConnected ? t.reconnectBtn : t.connectBtn}
                  </button>
                </div>
              </div>

              {resubscribeMsg && (
                <div style={{
                  marginTop: 12, padding: "10px 14px", borderRadius: 8,
                  background: resubscribeMsg.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                  border: `1px solid ${resubscribeMsg.type === "success" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                  color: resubscribeMsg.type === "success" ? "#22c55e" : "#f87171",
                  fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                }}>
                  {resubscribeMsg.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  {resubscribeMsg.text}
                </div>
              )}
            </div>

            {/* ── Webhook Status ── */}
            {isConnected && (
              <div style={{
                background: "#18181b",
                border: `1px solid ${sub?.active ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                {sub?.active ? (
                  <CheckCircle size={16} style={{ color: "#22c55e", flexShrink: 0 }} />
                ) : (
                  <AlertCircle size={16} style={{ color: "#f59e0b", flexShrink: 0 }} />
                )}
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: sub?.active ? "#22c55e" : "#f59e0b" }}>
                    {sub?.active ? t.webhookActive : t.webhookInactive}
                  </p>
                  {sub?.active && sub.fields && sub.fields.length > 0 && (
                    <p style={{ fontSize: 11, color: "#71717a", marginTop: 2 }}>
                      {t.webhookFields}: {sub.fields.join(", ")}
                    </p>
                  )}
                  {sub?.error && (
                    <p style={{ fontSize: 11, color: "#71717a", marginTop: 2 }}>Error: {sub.error}</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Webhook Configuration ── */}
            <div style={{
              background: "#18181b",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Info size={16} style={{ color: "#818cf8" }} />
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "#e4e4e7" }}>{t.webhookTitle}</h2>
              </div>
              <p style={{ fontSize: 13, color: "#71717a", marginBottom: 16, lineHeight: 1.6 }}>
                {t.webhookDesc}
              </p>

              {/* Warning if no verify token */}
              {!webhook?.verifyToken && (
                <div style={{
                  padding: "10px 14px", borderRadius: 8, marginBottom: 16,
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                  color: "#f87171", fontSize: 13,
                }}>
                  {t.noTokenWarning}
                </div>
              )}

              {/* Callback URL */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: "#71717a", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
                  {t.callbackUrl}
                </label>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(255,255,255,0.04)", borderRadius: 8,
                  padding: "10px 14px", border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  <code style={{ fontSize: 12, color: "#e4e4e7", flex: 1, wordBreak: "break-all" }}>
                    {webhook?.callbackUrl}
                  </code>
                  {webhook?.callbackUrl && <CopyButton value={webhook.callbackUrl} label="Copiar" />}
                </div>
              </div>

              {/* Verify Token */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: "#71717a", fontWeight: 600, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
                  {t.verifyToken}
                </label>
                {webhook?.verifyToken ? (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "rgba(255,255,255,0.04)", borderRadius: 8,
                    padding: "10px 14px", border: "1px solid rgba(255,255,255,0.08)",
                  }}>
                    <code style={{ fontSize: 12, color: "#a78bfa", flex: 1 }}>
                      {webhook.verifyToken}
                    </code>
                    <CopyButton value={webhook.verifyToken} label="Copiar" />
                  </div>
                ) : (
                  <div style={{
                    background: "rgba(239,68,68,0.08)", borderRadius: 8,
                    padding: "10px 14px", border: "1px solid rgba(239,68,68,0.15)",
                    fontSize: 12, color: "#f87171",
                  }}>
                    No configurado — agrega META_WEBHOOK_VERIFY_TOKEN en Vercel
                  </div>
                )}
              </div>

              {/* Steps */}
              <div style={{
                background: "rgba(99,102,241,0.06)", borderRadius: 8,
                padding: "14px", border: "1px solid rgba(99,102,241,0.15)",
              }}>
                <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.8 }}>
                  <div style={{ fontWeight: 600, color: "#818cf8", marginBottom: 8 }}>Pasos en Meta Developers:</div>
                  <ol style={{ paddingLeft: 16, margin: 0 }}>
                    <li><strong>developers.facebook.com/apps</strong> → App ID: {webhook?.appId ?? "1701603701115305"}</li>
                    <li>Instagram → <strong>Webhooks</strong> → "Add Callback URL"</li>
                    <li>Callback URL: <code style={{ color: "#e4e4e7" }}>{webhook?.callbackUrl}</code></li>
                    <li>Verify Token: <code style={{ color: "#a78bfa" }}>{webhook?.verifyToken ?? "no configurado"}</code></li>
                    <li>Haz clic en <strong>"Verify and Save"</strong></li>
                    <li>Suscríbete a: <code style={{ color: "#86efac" }}>{webhook?.subscribedFields?.join(", ")}</code></li>
                  </ol>
                </div>
                <a
                  href={`https://developers.facebook.com/apps/${webhook?.appId ?? "1701603701115305"}/instagram-business/webhooks/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 mt-3 text-xs"
                  style={{ color: "#818cf8", textDecoration: "none" }}
                >
                  <ExternalLink size={12} />
                  {t.openMetaDev}
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
