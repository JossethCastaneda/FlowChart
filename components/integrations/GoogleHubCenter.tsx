"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Loader2, Settings, ExternalLink, RefreshCw, BarChart2, Tag, Save, AlertCircle } from "lucide-react";
import { GOOGLE_MODULES, GoogleModule } from "@/lib/integrations/google/registry";

export function GoogleHubCenter() {
  const [googleState, setGoogleState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connectingModule, setConnectingModule] = useState<string | null>(null);
  
  // Resource configuration state
  const [activeConfigMod, setActiveConfigMod] = useState<string | null>(null);
  const [loadingResources, setLoadingResources] = useState(false);
  const [savingResources, setSavingResources] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // GA4 & GSC dropdown options
  const [ga4Props, setGa4Props] = useState<any[]>([]);
  const [gscSites, setGscSites] = useState<any[]>([]);
  
  // GTM dropdown options
  const [gtmAccounts, setGtmAccounts] = useState<any[]>([]);
  const [gtmContainers, setGtmContainers] = useState<any[]>([]);

  // Selected config values
  const [selectedGa4, setSelectedGa4] = useState("");
  const [selectedGsc, setSelectedGsc] = useState("");
  const [selectedGtmAcc, setSelectedGtmAcc] = useState("");
  const [selectedGtmCont, setSelectedGtmCont] = useState("");

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

  const isModuleConnected = (mod: GoogleModule) => {
    if (!googleState?.connected) return false;
    return googleState.connectedModules?.includes(mod.id);
  };

  const handleConnectModule = (mod: GoogleModule) => {
    setConnectingModule(mod.id);
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
    setActiveConfigMod(null);
  };

  // Open resource configuration and load data
  const handleOpenConfig = async (modId: string) => {
    setActiveConfigMod(modId);
    setLoadingResources(true);
    setErrorMsg("");
    
    // Set initial values if already configured
    const currentConfig = googleState?.resources?.[modId] || {};
    
    if (modId === "page_analytics") {
      setSelectedGa4(currentConfig.ga4PropertyId || "");
      setSelectedGsc(currentConfig.gscSiteUrl || "");
      
      try {
        const [ga4Res, gscRes] = await Promise.all([
          fetch("/api/integrations/google/resources/ga4").then(r => r.json()),
          fetch("/api/integrations/google/resources/gsc").then(r => r.json())
        ]);
        
        if (ga4Res.error) throw new Error(ga4Res.error);
        if (gscRes.error) throw new Error(gscRes.error);
        
        setGa4Props(ga4Res.properties || []);
        setGscSites(ga4Res.properties?.length ? gscRes.sites || [] : []);
      } catch (err: any) {
        setErrorMsg(err.message || "Error al cargar recursos de Google Analytics / Search Console.");
      }
    } else if (modId === "tag_tracking") {
      setSelectedGtmAcc(currentConfig.accountId || "");
      setSelectedGtmCont(currentConfig.containerId || "");
      
      try {
        const gtmRes = await fetch("/api/integrations/google/resources/gtm").then(r => r.json());
        if (gtmRes.error) throw new Error(gtmRes.error);
        setGtmAccounts(gtmRes.accounts || []);
        
        if (currentConfig.accountId) {
          const contRes = await fetch(`/api/integrations/google/resources/gtm?accountId=${currentConfig.accountId}`).then(r => r.json());
          setGtmContainers(contRes.containers || []);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Error al cargar cuentas de Google Tag Manager.");
      }
    }
    
    setLoadingResources(false);
  };

  // Fetch containers when account is selected
  const handleGtmAccountChange = async (accId: string) => {
    setSelectedGtmAcc(accId);
    setSelectedGtmCont("");
    setGtmContainers([]);
    if (!accId) return;
    
    setLoadingResources(true);
    try {
      const res = await fetch(`/api/integrations/google/resources/gtm?accountId=${accId}`).then(r => r.json());
      setGtmContainers(res.containers || []);
    } catch {
      setErrorMsg("Error al obtener los contenedores para la cuenta seleccionada.");
    } finally {
      setLoadingResources(false);
    }
  };

  // Save selected resources
  const handleSaveConfig = async (modId: string) => {
    setSavingResources(true);
    setErrorMsg("");
    
    try {
      if (modId === "page_analytics") {
        if (!selectedGa4 || !selectedGsc) {
          throw new Error("Por favor, selecciona tanto la propiedad de GA4 como el sitio de Search Console.");
        }
        
        const [ga4Save, gscSave] = await Promise.all([
          fetch("/api/integrations/google/resources/ga4", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ propertyId: selectedGa4 })
          }).then(r => r.json()),
          fetch("/api/integrations/google/resources/gsc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ siteUrl: selectedGsc })
          }).then(r => r.json())
        ]);
        
        if (!ga4Save.success || !gscSave.success) {
          throw new Error("Error al guardar la configuración de recursos.");
        }
      } else if (modId === "tag_tracking") {
        if (!selectedGtmAcc || !selectedGtmCont) {
          throw new Error("Por favor, selecciona tanto la cuenta como el contenedor de Google Tag Manager.");
        }
        
        const saveRes = await fetch("/api/integrations/google/resources/gtm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: selectedGtmAcc, containerId: selectedGtmCont })
        }).then(r => r.json());
        
        if (!saveRes.success) {
          throw new Error("Error al guardar la configuración del contenedor GTM.");
        }
      }
      
      // Reload state and close config panel
      setActiveConfigMod(null);
      loadGoogleIntegration();
    } catch (err: any) {
      setErrorMsg(err.message || "Ocurrió un error al guardar la configuración.");
    } finally {
      setSavingResources(false);
    }
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
            Autenticación incremental. Configura propiedades, sitios y contenedores de forma modular.
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
          const isConfiguring = activeConfigMod === mod.id;
          
          const currentConfig = googleState?.resources?.[mod.id] || {};
          const isConfigured = mod.id === "page_analytics"
            ? (currentConfig.ga4PropertyId && currentConfig.gscSiteUrl)
            : (currentConfig.accountId && currentConfig.containerId);

          return (
            <div key={mod.id} style={{
              display: "flex", flexDirection: "column", gap: 12,
              padding: "16px 20px",
              borderBottom: idx < GOOGLE_MODULES.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
                  <p style={{ fontSize: 10, color: "#475569", margin: 0, marginTop: 4, fontFamily: "monospace" }}>
                    APIs: {mod.apis.join(", ")}
                  </p>
                </div>

                {/* Action Button */}
                {connected ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    {mod.status !== "stub" && (
                      <button
                        onClick={() => isConfiguring ? setActiveConfigMod(null) : handleOpenConfig(mod.id)}
                        disabled={loadingResources}
                        style={{
                          padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: isConfiguring ? "rgba(255,255,255,0.05)" : "rgba(56, 189, 248, 0.1)",
                          border: `1px solid ${isConfiguring ? "rgba(255,255,255,0.1)" : "rgba(56, 189, 248, 0.2)"}`,
                          color: isConfiguring ? "#cbd5e1" : "#38bdf8", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 5,
                        }}
                      >
                        <Settings size={12} />
                        {isConfiguring ? "Cerrar" : "Configurar"}
                      </button>
                    )}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: isConfigured ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                      border: `1px solid ${isConfigured ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
                      color: isConfigured ? "#10b981" : "#f59e0b",
                    }}>
                      <CheckCircle size={12} />
                      {isConfigured ? "Configurado" : "Sin recursos"}
                    </div>
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

              {/* Resource config panel */}
              {connected && isConfiguring && (
                <div style={{
                  marginTop: 8, padding: "16px", background: "rgba(0,0,0,0.25)",
                  borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex", flexDirection: "column", gap: 14
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Settings size={14} style={{ color: "#38bdf8" }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>Configurar recursos requeridos:</span>
                  </div>

                  {loadingResources ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0" }}>
                      <Loader2 size={14} className="animate-spin text-sky-400" />
                      <span style={{ fontSize: 12, color: "#64748b" }}>Cargando tus recursos de Google...</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {/* error message */}
                      {errorMsg && (
                        <div style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                          borderRadius: 6, color: "#f87171", fontSize: 11
                        }}>
                          <AlertCircle size={12} />
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      {mod.id === "page_analytics" && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>Propiedad GA4</label>
                            <select
                              value={selectedGa4}
                              onChange={e => setSelectedGa4(e.target.value)}
                              style={{
                                width: "100%", padding: "8px", borderRadius: 6, fontSize: 12,
                                background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9"
                              }}
                            >
                              <option value="">-- Selecciona Propiedad --</option>
                              {ga4Props.map(p => (
                                <option key={p.id} value={p.id}>{p.displayName}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>Sitio Search Console</label>
                            <select
                              value={selectedGsc}
                              onChange={e => setSelectedGsc(e.target.value)}
                              style={{
                                width: "100%", padding: "8px", borderRadius: 6, fontSize: 12,
                                background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9"
                              }}
                            >
                              <option value="">-- Selecciona Sitio --</option>
                              {gscSites.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.permissionLevel})</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {mod.id === "tag_tracking" && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>Cuenta GTM</label>
                            <select
                              value={selectedGtmAcc}
                              onChange={e => handleGtmAccountChange(e.target.value)}
                              style={{
                                width: "100%", padding: "8px", borderRadius: 6, fontSize: 12,
                                background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9"
                              }}
                            >
                              <option value="">-- Selecciona Cuenta --</option>
                              {gtmAccounts.map(a => (
                                <option key={a.accountId} value={a.accountId}>{a.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>Contenedor GTM</label>
                            <select
                              value={selectedGtmCont}
                              disabled={!selectedGtmAcc}
                              onChange={e => setSelectedGtmCont(e.target.value)}
                              style={{
                                width: "100%", padding: "8px", borderRadius: 6, fontSize: 12,
                                background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9",
                                opacity: selectedGtmAcc ? 1 : 0.5
                              }}
                            >
                              <option value="">-- Selecciona Contenedor --</option>
                              {gtmContainers.map(c => (
                                <option key={c.containerId} value={c.containerId}>{c.name} ({c.publicId})</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                        <button
                          onClick={() => setActiveConfigMod(null)}
                          style={{
                            padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8",
                            cursor: "pointer"
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveConfig(mod.id)}
                          disabled={savingResources}
                          style={{
                            padding: "6px 16px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981",
                            cursor: "pointer", display: "flex", alignItems: "center", gap: 5
                          }}
                        >
                          {savingResources ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          Guardar Recursos
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Display Configured values summary */}
              {connected && isConfigured && !isConfiguring && (
                <div style={{
                  padding: "10px 14px", background: "rgba(255,255,255,0.02)",
                  borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)",
                  fontSize: 11, color: "#64748b", display: "flex", flexDirection: "column", gap: 4
                }}>
                  {mod.id === "page_analytics" && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Propiedad GA4 conectada:</span>
                        <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{currentConfig.ga4PropertyId}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Sitio Search Console:</span>
                        <span style={{ color: "#94a3b8" }}>{currentConfig.gscSiteUrl}</span>
                      </div>
                    </>
                  )}
                  {mod.id === "tag_tracking" && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Cuenta GTM:</span>
                        <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{currentConfig.accountId}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Contenedor GTM:</span>
                        <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{currentConfig.containerId}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
