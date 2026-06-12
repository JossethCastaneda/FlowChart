"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle2, Circle, X, Phone, RefreshCw } from "lucide-react";

// Los tipos de Window.FB viven en types/facebook-sdk.d.ts

const APP_ID    = process.env.NEXT_PUBLIC_META_APP_ID                    || "1145688207386567";
const CONFIG_ID = process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID || "1033923712495963";

// ── Load FB SDK once ──────────────────────────────────────────────────────────

function loadFbSdk(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return;

    // Already initialized
    if (window.FB) { resolve(); return; }

    // Script already in DOM but fbAsyncInit not fired yet — queue up
    const prevInit = window.fbAsyncInit;
    window.fbAsyncInit = function () {
      if (prevInit) prevInit();
      window.FB!.init({
        appId: APP_ID,
        autoLogAppEvents: true,
        xfbml: false,
        version: "v25.0",
      });
      resolve();
    };

    // Only inject the script once
    if (!document.getElementById("facebook-jssdk")) {
      const js = document.createElement("script");
      js.id = "facebook-jssdk";
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      js.async = true;
      js.defer = true;
      document.head.appendChild(js);
    }
  });
}

interface WaStatus {
  connected: boolean;
  phoneNumber?: string;
  connectedAt?: string | null;
}

interface WorkspaceInfo {
  name?: string;
  email?: string;
  website?: string;
  wabaId?: string;
}

export function WhatsAppConnectCard() {
  const [status, setStatus] = useState<WaStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [wsInfo, setWsInfo] = useState<WorkspaceInfo>({});

  // ── Fetch current connection status ─────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/connect/status");
      if (res.ok) {
        const data = await res.json();
        const wa = data.modules?.whatsapp_business;
        if (wa) {
          setStatus({
            connected: !!wa.connected,
            phoneNumber: wa.phoneNumber,
            connectedAt: wa.connectedAt,
          });
          // Capture wabaId if already connected
          if (wa.wabaId) setWsInfo(prev => ({ ...prev, wabaId: wa.wabaId }));
        }
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  // ── Fetch workspace info for pre-fill ────────────────────────────────────────
  const fetchWorkspaceInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace");
      if (res.ok) {
        const data = await res.json();
        const ws = data.workspace || data;
        setWsInfo(prev => ({
          ...prev,
          name: ws.name || ws.businessName,
          email: ws.email || ws.businessEmail,
          website: ws.website || ws.businessWebsite,
        }));
      }
    } catch { /* silent */ }
  }, []);

  // ── Load SDK on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchStatus();
    fetchWorkspaceInfo();
    loadFbSdk().then(() => setSdkReady(true));
  }, [fetchStatus, fetchWorkspaceInfo]);

  // ── Embedded Signup flow ─────────────────────────────────────────────────────
  const handleConnect = useCallback(() => {
    if (!sdkReady || !window.FB) {
      setError("El SDK de Facebook aún se está cargando. Intenta de nuevo en un momento.");
      return;
    }
    setError(null);
    setConnecting(true);

    // Build pre-fill setup object
    const setup: Record<string, unknown> = {};
    if (wsInfo.name || wsInfo.email || wsInfo.website) {
      setup.business = {
        ...(wsInfo.name    && { name:    wsInfo.name }),
        ...(wsInfo.email   && { email:   wsInfo.email }),
        ...(wsInfo.website && { website: wsInfo.website }),
      };
    }
    if (wsInfo.wabaId) {
      setup.whatsAppBusinessAccount = { ids: [wsInfo.wabaId] };
    }

    // ── Race condition fix ───────────────────────────────────────────────
    // postMessage FINISH y FB.login callback pueden llegar en cualquier orden.
    // Usamos refs para almacenar ambos y disparar el POST solo cuando los dos estén.
    const pmData = { wabaId: undefined as string | undefined, phoneNumberId: undefined as string | undefined };
    let authCode: string | undefined;
    let cancelStep: string | undefined;
    let posted = false; // evitar doble envío

    const doPost = async (code: string, wabaId?: string, phoneNumberId?: string) => {
      if (posted) return;
      posted = true;
      try {
        const res = await fetch("/api/connect/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            // Enviar los IDs del postMessage si los tenemos (más precisos que el discovery)
            ...(wabaId        && { wabaId }),
            ...(phoneNumberId && { phoneNumberId }),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Error al conectar WhatsApp Business.");
        } else {
          await fetchStatus();
        }
      } catch {
        setError("Error de red al conectar. Intenta de nuevo.");
      }
      setConnecting(false);
    };

    // Escuchar postMessage de Meta durante el flujo
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com") return;
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === "WA_EMBEDDED_SIGNUP") {
          if (data.event === "FINISH") {
            pmData.wabaId        = data.data?.waba_id;
            pmData.phoneNumberId = data.data?.phone_number_id;
            // Si ya tenemos el code del callback, disparar ahora
            if (authCode) {
              window.removeEventListener("message", onMessage);
              doPost(authCode, pmData.wabaId, pmData.phoneNumberId);
            }
            // Si no, el callback lo disparará cuando llegue (con los datos ya guardados)
          } else if (data.event === "CANCEL") {
            cancelStep = data.data?.current_step;
          }
        }
      } catch { /* not JSON */ }
    };
    window.addEventListener("message", onMessage);

    window.FB.login(
      (response: FbLoginResponse) => {
        // NO removemos el listener aquí todavía — el postMessage puede venir después
        const code = response?.authResponse?.code;
        if (!code) {
          window.removeEventListener("message", onMessage);
          setConnecting(false);
          const stepMessages: Record<string, string> = {
            ASSET_SELECTION:    "Cancelaste antes de seleccionar tu cuenta de WhatsApp Business.",
            PHONE_REGISTRATION: "Cancelaste durante el registro del número de teléfono.",
            PHONE_VERIFICATION: "Cancelaste durante la verificación del número.",
          };
          setError(
            cancelStep
              ? stepMessages[cancelStep] ?? `Cancelaste en el paso: ${cancelStep}.`
              : "La conexión fue cancelada o el popup fue cerrado.",
          );
          return;
        }

        authCode = code;

        // Si el postMessage ya llegó, disparar inmediatamente
        if (pmData.wabaId || pmData.phoneNumberId) {
          window.removeEventListener("message", onMessage);
          doPost(code, pmData.wabaId, pmData.phoneNumberId);
        } else {
          // Esperar hasta 3s a que llegue el postMessage FINISH
          // (Si no llega, hacer el POST sin IDs — el backend hará discovery)
          setTimeout(() => {
            window.removeEventListener("message", onMessage);
            doPost(code, pmData.wabaId, pmData.phoneNumberId);
          }, 3000);
        }
      },
      {
        config_id: CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup,
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
          version: "v4",
          features: [{ name: "app_only_install" }],
        },
      }
    );
  }, [sdkReady, fetchStatus, wsInfo]);


  // ── Disconnect ───────────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    if (!confirm("¿Desconectar WhatsApp Business? Los mensajes entrantes dejarán de procesarse.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/connect/whatsapp", { method: "DELETE" });
      setStatus({ connected: false });
    } catch { /* silent */ }
    setDisconnecting(false);
  };

  const WaIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
        fill="#25D366"
      />
    </svg>
  );

  if (loading) {
    return (
      <div style={{
        height: 52, borderRadius: 8,
        background: "rgba(148,163,184,0.04)",
        animation: "fade-pulse 1.4s ease-in-out infinite",
      }} />
    );
  }

  return (
    <div style={{
      borderRadius: 8, overflow: "hidden",
      border: `1px solid ${status.connected ? "rgba(37,211,102,0.18)" : "rgba(255,255,255,0.05)"}`,
      background: status.connected ? "rgba(37,211,102,0.04)" : "transparent",
      transition: "all 0.2s",
    }}>
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px" }}>

        {/* Icon */}
        <div style={{
          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
          background: status.connected ? "rgba(37,211,102,0.12)" : "rgba(255,255,255,0.04)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <WaIcon />
        </div>

        {/* Label + summary */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: status.connected ? "#e2e8f0" : "#475569" }}>
              WhatsApp Business
            </span>
          </div>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 1, display: "flex", alignItems: "center", gap: 4 }}>
            {status.connected ? (
              <>
                <Phone style={{ width: 9, height: 9 }} />
                {status.phoneNumber || "Conectado"}
              </>
            ) : (
              "Mensajería directa con clientes"
            )}
          </div>
        </div>

        {/* Status icon */}
        <div style={{ flexShrink: 0 }}>
          {status.connected
            ? <CheckCircle2 style={{ width: 14, height: 14, color: "#25D366" }} />
            : <Circle style={{ width: 14, height: 14, color: "#1e293b" }} />
          }
        </div>

        {/* Connect / Reconnect button */}
        <button
          onClick={handleConnect}
          disabled={connecting || !sdkReady}
          style={{
            padding: "5px 12px", borderRadius: 6, flexShrink: 0,
            background: status.connected ? "rgba(255,255,255,0.04)" : "rgba(37,211,102,0.8)",
            border: status.connected ? "1px solid rgba(255,255,255,0.08)" : "none",
            color: status.connected ? "#475569" : "#fff",
            fontSize: 10, fontWeight: 600,
            cursor: connecting || !sdkReady ? "wait" : "pointer",
            display: "flex", alignItems: "center", gap: 5,
            transition: "all 0.15s", fontFamily: "inherit",
            opacity: connecting || !sdkReady ? 0.6 : 1,
          }}
        >
          {connecting
            ? <Loader2 style={{ width: 10, height: 10, animation: "int-spin 1s linear infinite" }} />
            : status.connected
              ? <><RefreshCw style={{ width: 10, height: 10 }} /> Reconectar</>
              : "Conectar"
          }
        </button>

        {/* Disconnect */}
        {status.connected && (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            title="Desconectar WhatsApp Business"
            style={{
              padding: "5px 10px", borderRadius: 6, flexShrink: 0,
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.18)",
              color: "#f87171", fontSize: 10, fontWeight: 600,
              cursor: disconnecting ? "wait" : "pointer",
              display: "flex", alignItems: "center", gap: 5,
              fontFamily: "inherit", transition: "all 0.15s",
              opacity: disconnecting ? 0.6 : 1,
            }}
          >
            {disconnecting
              ? <Loader2 style={{ width: 10, height: 10, animation: "int-spin 1s linear infinite" }} />
              : <X style={{ width: 10, height: 10 }} />
            }
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          padding: "8px 14px 10px 54px",
          fontSize: 10, color: "#f87171",
          borderTop: "1px solid rgba(239,68,68,0.1)",
          background: "rgba(239,68,68,0.03)",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
