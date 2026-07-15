"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle2, Circle, X, Phone, RefreshCw, Send, ExternalLink, Trash2 } from "lucide-react";

// Los tipos de Window.FB viven en types/facebook-sdk.d.ts

// Sin fallbacks hardcodeados: la configuración vive en Vercel. Si falta un
// env, el botón de conexión muestra un error claro en lugar de usar IDs viejos.
const APP_ID    = process.env.NEXT_PUBLIC_META_APP_ID || "";
const CONFIG_ID = process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID || "";

// ── Load FB SDK once ──────────────────────────────────────────────────────────

function loadFbSdk(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return;

    const w = window as any;
    if (w.FB) { resolve(); return; }

    // Script already in DOM but fbAsyncInit not fired yet — queue up
    const prevInit = w.fbAsyncInit;
    w.fbAsyncInit = function () {
      if (prevInit) prevInit();
      w.FB!.init({
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

interface WaLine {
  id: string;
  displayPhoneNumber: string;
  verifiedName: string;
  qualityRating: string;
  status: string;
  codeVerificationStatus: string;
  isLinked: boolean;
  projectId: string | null;
}

interface Project {
  id: string;
  name: string;
}

export function WhatsAppConnectCard() {
  const [status, setStatus] = useState<WaStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [wsInfo, setWsInfo] = useState<WorkspaceInfo>({});

  // WhatsApp Lines State
  const [lines, setLines] = useState<WaLine[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [linesError, setLinesError] = useState<string | null>(null);

  // Test Call state
  const [testingLineId, setTestingLineId] = useState<string | null>(null);
  const [testRecipient, setTestRecipient] = useState("");
  const [useTemplate, setUseTemplate] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

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

  // ── Fetch lines list ────────────────────────────────────────────────────────
  const fetchLines = useCallback(async () => {
    setLoadingLines(true);
    setLinesError(null);
    try {
      const res = await fetch("/api/whatsapp/phone-numbers");
      const data = await res.json();
      if (res.ok && data.success) {
        setLines(data.data.phoneNumbers);
        setProjects(data.data.projects);
      } else {
        setLinesError(data.error || "No se pudieron obtener las líneas de WhatsApp.");
      }
    } catch (err) {
      setLinesError("Error de red al obtener las líneas.");
    } finally {
      setLoadingLines(false);
    }
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

  // ── Load SDK and status on mount ─────────────────────────────────────────────
  useEffect(() => {
    fetchStatus();
    fetchWorkspaceInfo();
    loadFbSdk().then(() => setSdkReady(true));
  }, [fetchStatus, fetchWorkspaceInfo]);

  // ── Fetch lines when connected changes ───────────────────────────────────────
  useEffect(() => {
    if (status.connected) {
      fetchLines();
    } else {
      setLines([]);
    }
  }, [status.connected, fetchLines]);

  // ── Link/Unlink Lines ────────────────────────────────────────────────────────
  const handleLinkLine = async (phoneNumberId: string, projectId: string | null) => {
    try {
      const res = await fetch("/api/whatsapp/phone-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumberId, projectId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Actualizar estado local
        setLines((prev) =>
          prev.map((l) => (l.id === phoneNumberId ? { ...l, isLinked: true, projectId } : l))
        );
      } else {
        alert(data.error || "Error al enlazar la línea.");
      }
    } catch {
      alert("Error de red al enlazar la línea.");
    }
  };

  const handleUnlinkLine = async (phoneNumberId: string) => {
    if (!confirm("¿Desvincular esta línea de Zefirus? Dejará de recibir y enviar mensajes.")) return;
    try {
      const res = await fetch("/api/whatsapp/phone-numbers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumberId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Actualizar estado local
        setLines((prev) =>
          prev.map((l) => (l.id === phoneNumberId ? { ...l, isLinked: false, projectId: null } : l))
        );
      } else {
        alert(data.error || "Error al desvincular la línea.");
      }
    } catch {
      alert("Error de red al desvincular la línea.");
    }
  };

  // ── Register Line (if PENDING) ─────────────────────────────────────────────────
  const handleRegisterLine = async (phoneNumberId: string) => {
    const pin = prompt("Ingresa el PIN de 6 dígitos que configuraste en Facebook para este número:");
    if (!pin) return;
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      alert("El PIN debe contener exactamente 6 números.");
      return;
    }

    try {
      const res = await fetch("/api/whatsapp/phone-numbers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumberId, pin }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("¡Número registrado exitosamente! Ahora puedes enlazarlo.");
        fetchLines(); // Refrescar para ver el nuevo status
      } else {
        alert(data.error || "Error al registrar el número.");
      }
    } catch {
      alert("Error de red al registrar el número.");
    }
  };

  // ── Send Test Call ───────────────────────────────────────────────────────────
  const handleSendTestCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testingLineId || !testRecipient.trim()) return;
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/whatsapp/test-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId: testingLineId,
          recipient: testRecipient.replace(/\D/g, ""), // dejar solo dígitos
          useTemplate,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `Mensaje enviado con éxito. ID: ${data.data.messageId}`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "No se pudo enviar el mensaje de prueba.",
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: "Error de red al enviar el mensaje de prueba.",
      });
    } finally {
      setSendingTest(false);
    }
  };

  // ── Embedded Signup flow ─────────────────────────────────────────────────────
  const handleConnect = useCallback(() => {
    const w = window as any;
    if (!sdkReady || !w.FB) {
      setError("El SDK de Facebook aún se está cargando. Intenta de nuevo en un momento.");
      return;
    }
    setError(null);

    if (!APP_ID || !CONFIG_ID) {
      setError("Conexión de WhatsApp no configurada en este entorno (faltan NEXT_PUBLIC_META_APP_ID / NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID).");
      return;
    }

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
          } else if (data.event === "CANCEL") {
            cancelStep = data.data?.current_step;
          }
        }
      } catch { /* not JSON */ }
    };
    window.addEventListener("message", onMessage);

    w.FB.login(
      (response: any) => {
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
          setTimeout(() => {
            window.removeEventListener("message", onMessage);
            doPost(code, pmData.wabaId, pmData.phoneNumberId);
          }, 3000);
        }
      },
      {
        config_id: CONFIG_ID,
        response_type: "code",
        extras: {
          setup,
          sessionInfoVersion: "3",
          version: "v4",
        },
      }
    );
  }, [sdkReady, fetchStatus, wsInfo]);


  // ── Disconnect ───────────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    if (!confirm("¿Desconectar WhatsApp Business? Los mensajes entrantes dejarán de procesarse y se borrarán los enlaces locales.")) return;
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
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
        fill="#25D366"
      />
    </svg>
  );

  if (loading) {
    return (
      <div style={{
        height: 120, borderRadius: 8,
        background: "var(--border-neutral)",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <Loader2 style={{ width: 20, height: 20, color: "var(--text-muted)", animation: "int-spin 1s linear infinite" }} />
      </div>
    );
  }

  if (status.connected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header de la WABA */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          background: "var(--surface)",
          border: "1px solid var(--hairline)",
          borderRadius: "10px",
          gap: 12,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--emerald)", boxShadow: "0 0 8px var(--emerald)" }} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>Cuenta Conectada</span>
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>WABA ID: {wsInfo.wabaId || "Cargando..."}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleConnect}
              disabled={connecting}
              style={{
                background: "var(--surface-hover)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                color: "var(--foreground)",
                fontSize: "10px",
                fontWeight: 600,
                padding: "6px 12px",
                cursor: connecting ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontFamily: "inherit",
              }}
            >
              <RefreshCw size={10} />
              Reconectar
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              style={{
                background: "var(--red-dim)",
                border: "1px solid rgba(229,72,77, 0.2)",
                borderRadius: "6px",
                color: "var(--red)",
                fontSize: "10px",
                fontWeight: 600,
                padding: "6px 12px",
                cursor: disconnecting ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontFamily: "inherit",
              }}
            >
              <X size={10} />
              Desconectar
            </button>
          </div>
        </div>

        {/* Panel de líneas de WhatsApp */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h4 style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
              Líneas Disponibles en Meta ({lines.length})
            </h4>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {loadingLines && <Loader2 size={12} style={{ animation: "int-spin 1s linear infinite", color: "var(--text-muted)" }} />}
              <button
                onClick={fetchLines}
                disabled={loadingLines}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: 2,
                  display: "flex",
                  alignItems: "center",
                }}
                title="Actualizar líneas"
              >
                <RefreshCw size={11} />
              </button>
            </div>
          </div>

          {linesError && (
            <div style={{
              padding: "10px 14px",
              background: "var(--red-dim)",
              border: "1px solid rgba(229,72,77, 0.15)",
              borderRadius: "8px",
              color: "var(--red)",
              fontSize: "11px",
            }}>
              {linesError}
            </div>
          )}

          {!loadingLines && lines.length === 0 && !linesError && (
            <div style={{
              padding: "24px",
              textAlign: "center",
              background: "var(--surface)",
              border: "1px dashed var(--border)",
              borderRadius: "8px",
              color: "var(--text-muted)",
              fontSize: "11px",
            }}>
              No se encontraron números de teléfono activos en esta WABA. Verifica tu configuración en Meta.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lines.map((line) => {
              const isQualityGreen = line.qualityRating === "GREEN" || line.qualityRating === "HIGH";
              const isQualityYellow = line.qualityRating === "YELLOW" || line.qualityRating === "MEDIUM";
              const isStatusApproved = line.status === "APPROVED" || line.status === "CONNECTED" || line.status === "VERIFIED";

              return (
                <div
                  key={line.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    background: line.isLinked ? "rgba(37, 211, 102, 0.02)" : "rgba(255, 255, 255, 0.01)",
                    border: `1px solid ${line.isLinked ? "rgba(37, 211, 102, 0.12)" : "rgba(255, 255, 255, 0.05)"}`,
                    borderRadius: "10px",
                    padding: "12px 14px",
                    gap: 10,
                  }}
                >
                  {/* Fila superior de la línea */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: line.isLinked ? "rgba(37, 211, 102, 0.08)" : "rgba(255, 255, 255, 0.03)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <Phone size={13} style={{ color: line.isLinked ? "#25D366" : "var(--text-muted)" }} />
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)" }}>
                            {line.verifiedName || "Línea sin nombre"}
                          </span>
                          <span style={{
                            fontSize: "9px",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            fontWeight: 600,
                            background: isStatusApproved ? "rgba(16, 185, 129, 0.08)" : "rgba(224,168,60, 0.08)",
                            color: isStatusApproved ? "var(--emerald)" : "var(--amber)",
                            border: `1px solid ${isStatusApproved ? "rgba(16, 185, 129, 0.15)" : "rgba(224,168,60, 0.15)"}`,
                          }}>
                            {line.status}
                          </span>
                          <span style={{
                            fontSize: "9px",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            fontWeight: 600,
                            background: isQualityGreen ? "rgba(16, 185, 129, 0.08)" : isQualityYellow ? "rgba(224,168,60, 0.08)" : "rgba(229,72,77, 0.08)",
                            color: isQualityGreen ? "var(--emerald)" : isQualityYellow ? "var(--amber)" : "var(--red)",
                            border: `1px solid ${isQualityGreen ? "rgba(16, 185, 129, 0.15)" : isQualityYellow ? "rgba(224,168,60, 0.15)" : "rgba(229,72,77, 0.15)"}`,
                          }}>
                            {line.qualityRating}
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: 1 }}>
                          {line.displayPhoneNumber} <span style={{ color: "var(--text-secondary)" }}>·</span> ID: {line.id}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {line.isLinked ? (
                        <>
                          <button
                            onClick={() => {
                              setTestingLineId(line.id);
                              setTestResult(null);
                              setTestRecipient("");
                            }}
                            style={{
                              background: "var(--cyan-dim)",
                              border: "1px solid rgba(59,130,246, 0.2)",
                              borderRadius: "6px",
                              color: "var(--cyan)",
                              fontSize: "10px",
                              fontWeight: 600,
                              padding: "5px 10px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontFamily: "inherit",
                            }}
                          >
                            <Send size={10} />
                            Prueba
                          </button>
                          <button
                            onClick={() => handleUnlinkLine(line.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--text-muted)",
                              cursor: "pointer",
                              padding: 4,
                              display: "flex",
                              alignItems: "center",
                            }}
                            title="Desenlazar número"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      ) : line.status === "PENDING" ? (
                        <button
                          onClick={() => handleRegisterLine(line.id)}
                          style={{
                            background: "var(--surface)",
                            border: "1px solid rgba(224,168,60, 0.2)",
                            borderRadius: "6px",
                            color: "var(--amber)",
                            fontSize: "10px",
                            fontWeight: 600,
                            padding: "5px 12px",
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          Registrar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLinkLine(line.id, null)}
                          style={{
                            background: "var(--emerald-dim)",
                            border: "1px solid rgba(37, 211, 102, 0.2)",
                            borderRadius: "6px",
                            color: "#25D366",
                            fontSize: "10px",
                            fontWeight: 600,
                            padding: "5px 12px",
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          Enlazar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Asignación de proyecto */}
                  {line.isLinked && (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      paddingTop: 8,
                      border: "1px solid var(--hairline)",
                    }}>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Proyecto:</span>
                      <select
                        value={line.projectId || ""}
                        onChange={(e) => handleLinkLine(line.id, e.target.value || null)}
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--hairline)",
                          borderRadius: "4px",
                          color: "var(--foreground)",
                          fontSize: "10px",
                          padding: "3px 8px",
                          outline: "none",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        <option value="">-- Sin asociar --</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <span style={{ fontSize: "9px", color: "var(--text-secondary)" }}>
                        Enlaza este número para enviar y recibir mensajes en Inbox 2.0.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Formulario de envío de llamada de prueba */}
        {testingLineId && (
          <div style={{
            padding: 16,
            borderRadius: 10,
            background: "var(--cyan-dim)",
            border: "1px solid rgba(59,130,246, 0.12)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--cyan)", display: "flex", alignItems: "center", gap: 5 }}>
                <Send size={12} />
                Llamada de Prueba obligatoria
              </span>
              <button
                onClick={() => setTestingLineId(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "10px" }}
              >
                Cancelar
              </button>
            </div>
            <p style={{ fontSize: "10px", color: "var(--text-muted)", margin: 0 }}>
              Meta requiere que se realice al menos una llamada a la API saliente para aprobar el permiso de mensajería.
            </p>

            <form onSubmit={handleSendTestCall} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: 600 }}>Número Destinatario (con código de país, sin "+"):</label>
                <input
                  type="text"
                  required
                  placeholder="ej. 5215512345678"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  id="useTemplateCheck"
                  checked={useTemplate}
                  onChange={(e) => setUseTemplate(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                <label htmlFor="useTemplateCheck" style={{ fontSize: "10px", color: "var(--foreground)", cursor: "pointer" }}>
                  Usar plantilla default oficial de Meta (<code>hello_world</code>)
                </label>
              </div>
              <span style={{ fontSize: "9px", color: "var(--text-secondary)", display: "block", marginTop: -6 }}>
                {useTemplate 
                  ? "✅ Recomendado: Se salta la ventana de 24h y funciona siempre."
                  : "⚠️ Solo funciona si el destinatario interactuó en las últimas 24h."
                }
              </span>

              {testResult && (
                <div style={{
                  padding: "8px 12px",
                  background: testResult.success ? "rgba(16, 185, 129, 0.05)" : "rgba(229,72,77, 0.05)",
                  border: `1px solid ${testResult.success ? "rgba(16, 185, 129, 0.15)" : "rgba(229,72,77, 0.15)"}`,
                  borderRadius: "6px",
                  color: testResult.success ? "var(--emerald)" : "var(--red)",
                  fontSize: "10px",
                }}>
                  {testResult.message}
                </div>
              )}

              <button
                type="submit"
                disabled={sendingTest || !testRecipient.trim()}
                style={{
                  background: "var(--cyan-dim)",
                  border: "1px solid rgba(59,130,246, 0.25)",
                  borderRadius: "6px",
                  color: "var(--cyan)",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "7px 12px",
                  cursor: sendingTest ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  transition: "all 0.15s",
                  fontFamily: "inherit",
                }}
              >
                {sendingTest && <Loader2 size={11} style={{ animation: "int-spin 1s linear infinite" }} />}
                Enviar Llamada de Prueba
              </button>
            </form>
          </div>
        )}
      </div>
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
          background: status.connected ? "rgba(37,211,102,0.12)" : "var(--surface-hover)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <WaIcon />
        </div>

        {/* Label + summary */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: status.connected ? "var(--foreground)" : "var(--text-secondary)" }}>
              WhatsApp Business
            </span>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 1, display: "flex", alignItems: "center", gap: 4 }}>
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
            : <Circle style={{ width: 14, height: 14, color: "var(--surface)" }} />
          }
        </div>

        {/* Connect / Reconnect button */}
        <button
          onClick={handleConnect}
          disabled={connecting || !sdkReady}
          style={{
            padding: "5px 12px", borderRadius: 6, flexShrink: 0,
            background: status.connected ? "var(--surface-hover)" : "rgba(37,211,102,0.8)",
            border: status.connected ? "1px solid var(--hairline)" : "none",
            color: status.connected ? "var(--text-secondary)" : "#fff",
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
              background: "var(--red-dim)",
              border: "1px solid rgba(229,72,77,0.18)",
              color: "var(--red)", fontSize: 10, fontWeight: 600,
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
          fontSize: 10, color: "var(--red)",
          borderTop: "1px solid rgba(229,72,77,0.1)",
          background: "var(--red-dim)",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
