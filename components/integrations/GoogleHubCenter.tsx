"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Loader2, Settings, ExternalLink, RefreshCw } from "lucide-react";
import { GOOGLE_MODULES, GoogleModule } from "@/lib/integrations/google/registry";

export function GoogleHubCenter() {
  const [googleState, setGoogleState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connectingModule, setConnectingModule] = useState<string | null>(null);

  const loadGoogleIntegration = useCallback(() => {
    setLoading(true);
    fetch("/api/workspace/integrations")
      .then(r => r.json())
      .then(res => {
        if (res.data) {
          const g = res.data.find((i: any) => i.provider === "google");
          setGoogleState(g || null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadGoogleIntegration(); }, [loadGoogleIntegration]);

  // A module is considered connected if it was requested in lastRequestedModules (or if its scopes are present, but for UI simplicity we use credentials)
  const isModuleConnected = (mod: GoogleModule) => {
    if (!googleState?.connected) return false;
    // We don't send raw credentials to the client for security, but the backend 
    // API might not be sending 'lastRequestedModules'. 
    // Let's assume the backend will need an update to send connectedModules.
    // We will check googleState.connectedModules
    return googleState.connectedModules?.includes(mod.id);
  };

  const handleConnectModule = (mod: GoogleModule) => {
    setConnectingModule(mod.id);
    // Redirect to the incremental OAuth flow, asking for this module
    // If the user already has other modules connected, we should include them so we don't lose them!
    // But our start route already includes all requested modules + include_granted_scopes=true.
    // To ensure we keep existing ones, we can just pass the current module, and Google will append it to granted scopes.
    window.location.href = `/api/oauth/google/start?modules=${mod.id}`;
  };

  const handleDisconnectAll = async () => {
    if (!confirm("¿Desconectar toda la integración de Google y todos sus módulos?")) return;
    setConnectingModule("disconnecting");
    await fetch("/api/workspace/integrations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "google" }),
    });
    setGoogleState(null);
    setConnectingModule(null);
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: "24px", display: "flex", justifyContent: "center" }}>
        <Loader2 className="animate-spin text-slate-500" />
      </div>
    );
  }

  const isAnyConnected = googleState?.connected;

  return (
    <div className="glass-panel overflow-hidden">
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.09)",
        background: "rgba(66, 133, 244, 0.05)",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, background: "#185ABC",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Google Hub Comercial</h2>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, marginTop: 2 }}>
            Autenticación incremental. Solicita solo los permisos que necesitas para cada módulo.
          </p>
        </div>
        {isAnyConnected && (
          <button
            onClick={handleDisconnectAll}
            disabled={connectingModule === "disconnecting"}
            style={{
              padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              color: "#ef4444", cursor: "pointer", transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {connectingModule === "disconnecting" ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
            Desconectar Hub
          </button>
        )}
      </div>

      {/* Modules List */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {GOOGLE_MODULES.map((mod, idx) => {
          const connected = isModuleConnected(mod);
          const isConnecting = connectingModule === mod.id;
          
          return (
            <div key={mod.id} style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "16px 20px",
              borderBottom: idx < GOOGLE_MODULES.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc", margin: 0 }}>{mod.label}</h3>
                  {mod.status === "stub" && (
                    <span style={{ fontSize: 9, background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: 4, color: "#94a3b8" }}>
                      PRÓXIMAMENTE
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{mod.description}</p>
                <p style={{ fontSize: 10, color: "#475569", margin: 0, marginTop: 6, fontFamily: "monospace" }}>
                  APIs: {mod.apis.join(", ")}
                </p>
                
                {connected && mod.status !== "stub" && (
                  <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>Recurso configurado para este workspace:</p>
                    {/* The resource selector component should go here, but for now we just show a placeholder / settings link */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                      <Settings size={12} style={{ color: "#38bdf8" }} />
                      <span style={{ fontSize: 12, color: "#38bdf8", cursor: "pointer" }}>Configurar recurso...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {connected ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
                  color: "#10b981",
                }}>
                  <CheckCircle size={12} />
                  Módulo Activo
                </div>
              ) : mod.status === "stub" ? (
                <div style={{ padding: "6px 12px", fontSize: 11, color: "#475569", fontWeight: 600 }}>
                  En desarrollo
                </div>
              ) : (
                <button
                  onClick={() => handleConnectModule(mod)}
                  disabled={isConnecting || connectingModule === "disconnecting"}
                  style={{
                    padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.2)",
                    color: "#38bdf8", cursor: "pointer", transition: "all 0.15s",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  {isConnecting ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                  Añadir Módulo
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
