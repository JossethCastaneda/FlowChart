"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, AlertCircle, Loader2, RefreshCw, ChevronRight,
  ChevronLeft, Database, Box, BarChart2, Settings, ExternalLink
} from "lucide-react";

export interface GoogleSources {
  adsCustomerId?: string;
  ga4PropertyId?: string;
  gtmAccountId?: string;
  gtmContainerId?: string;
}

interface GoogleSourcesPanelProps {
  projectId: string;
}

type ActiveSection = "ads" | "ga4" | "gtm" | null;

export function GoogleSourcesPanel({ projectId }: GoogleSourcesPanelProps) {
  const [sources, setSources] = useState<GoogleSources>({});
  const [loading, setLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Resource lists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const [adsAccounts, setAdsAccounts] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const [ga4Properties, setGa4Properties] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const [gtmAccounts, setGtmAccounts] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const [gtmContainers, setGtmContainers] = useState<any[]>([]);
  const [selectedGtmAccount, setSelectedGtmAccount] = useState<string | null>(null);

  const [loadingResources, setLoadingResources] = useState(false);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const [sourcesRes, integrationsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/google-sources`),
        fetch("/api/workspace/integrations"),
      ]);

      const sourcesData = await sourcesRes.json();
      const intData = await integrationsRes.json();

      if (sourcesData.success) setSources(sourcesData.data || {});

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      const googleIntegration = intData.data?.data?.find((i: any) => i.provider === "google");
      setGoogleConnected(!!googleIntegration?.connected);
    } catch {
      setErrorMsg("Error al cargar la configuración de Google.");
    }
    setLoading(false);
  }, [projectId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO: [React] Refactor de hooks anti-patrón
  useEffect(() => { fetchSources(); }, [fetchSources]);

  const openSection = async (section: ActiveSection) => {
    setActiveSection(section);
    setLoadingResources(true);
    setErrorMsg(null);

    try {
      if (section === "ads") {
        const res = await fetch("/api/integrations/google/resources/ads");
        const data = await res.json();
        if (res.status === 401 || res.status === 403 || data.error?.toLowerCase().includes("scope") || data.error?.toLowerCase().includes("adwords") || data.error?.toLowerCase().includes("developer token")) {
          setErrorMsg("__scope_ads__");
        } else if (res.ok) {
          setAdsAccounts(data.customers || []);
        } else {
          setErrorMsg(data.error || "Error cargando cuentas de Ads.");
        }
      } else if (section === "ga4") {
        const res = await fetch("/api/integrations/google/resources/ga4");
        const data = await res.json();
        if (res.status === 401 || res.status === 403 || data.error?.toLowerCase().includes("scope") || data.error?.toLowerCase().includes("analytics")) {
          setErrorMsg("__scope_ga4__");
        } else if (res.ok) {
          setGa4Properties(data.properties || []);
        } else {
          setErrorMsg(data.error || "Error cargando propiedades de GA4.");
        }
      } else if (section === "gtm") {
        const res = await fetch("/api/integrations/google/resources/gtm");
        const data = await res.json();
        if (res.status === 401 || res.status === 403 || data.error?.toLowerCase().includes("scope") || data.error?.toLowerCase().includes("tagmanager")) {
          setErrorMsg("__scope_gtm__");
        } else if (res.ok) {
          setGtmAccounts(data.accounts || []);
          // If there's a saved account, load its containers
          if (sources.gtmAccountId) {
            setSelectedGtmAccount(sources.gtmAccountId);
            const res2 = await fetch(`/api/integrations/google/resources/gtm?accountId=${sources.gtmAccountId}`);
            const data2 = await res2.json();
            if (res2.ok) setGtmContainers(data2.containers || []);
          }
        } else {
          setErrorMsg(data.error || "Error cargando cuentas de Tag Manager.");
        }
      }
    } catch {
      setErrorMsg("Error de red al cargar recursos de Google.");
    }
    setLoadingResources(false);
  };

  const loadGtmContainers = async (accountId: string) => {
    setLoadingResources(true);
    setSelectedGtmAccount(accountId);
    try {
      const res = await fetch(`/api/integrations/google/resources/gtm?accountId=${accountId}`);
      const data = await res.json();
      if (res.ok) setGtmContainers(data.containers || []);
      else setErrorMsg(data.error || "Error cargando contenedores.");
    } catch {
      setErrorMsg("Error de red.");
    }
    setLoadingResources(false);
  };

  const saveSource = async (patch: Partial<GoogleSources>, successText: string) => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/google-sources`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSources(data.data);
        setSuccessMsg(successText);
        setTimeout(() => setSuccessMsg(null), 4000);
        setActiveSection(null);
      } else {
        setErrorMsg(data.error || "Error al guardar.");
      }
    } catch {
      setErrorMsg("Error de red al guardar.");
    }
    setSaving(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  const statusDot = (configured: boolean) => (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 8, height: 8, borderRadius: "50%",
      background: configured ? "var(--fc-success)" : "rgba(255,255,255,0.15)",
      boxShadow: configured ? "0 0 8px rgba(52,183,124,0.6)" : "none",
      flexShrink: 0,
    }} />
  );

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0", color: "var(--fc-text-secondary)", fontSize: 13 }}>
        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
        Cargando configuración de Google...
      </div>
    );
  }

  if (!googleConnected) {
    return (
      <div style={{
        padding: "20px 24px", borderRadius: 10,
        background: "var(--fc-surface)", border: "1px solid rgba(251,191,36,0.2)",
        display: "flex", gap: 14, alignItems: "flex-start",
      }}>
        <AlertCircle size={18} style={{ color: "var(--fc-warning)", flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--fc-text)", margin: "0 0 4px" }}>
            Google no está conectado
          </p>
          <p style={{ fontSize: 12, color: "var(--fc-text-secondary)", margin: "0 0 12px", lineHeight: 1.6 }}>
            Para vincular recursos de Google a este proyecto, primero debes conectar Google en el panel de Integraciones del workspace.
          </p>
          <a
            href="/dashboard/integrations"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 11, fontWeight: 600, color: "var(--fc-accent)",
              padding: "6px 14px", borderRadius: 6,
              background: "rgba(0, 212, 255, 0.1)", border: "1px solid rgba(59,130,246,0.2)",
              textDecoration: "none",
            }}
          >
            <ExternalLink size={12} /> Ir a Integraciones
          </a>
        </div>
      </div>
    );
  }

  // ── Section detail view ──
  if (activeSection) {
    return (
      <div style={{ animation: "fadeIn 0.2s ease" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }`}</style>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => { setActiveSection(null); setErrorMsg(null); setSelectedGtmAccount(null); setGtmContainers([]); }}
            style={{ background: "var(--fc-surface-hover)", border: "1px solid var(--fc-border)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "var(--fc-text-secondary)", display: "flex", alignItems: "center" }}
          >
            <ChevronLeft size={14} />
          </button>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--fc-text)", margin: 0 }}>
            {activeSection === "ads" && "Vincular cuenta de Google Ads"}
            {activeSection === "ga4" && "Vincular propiedad de Google Analytics 4"}
            {activeSection === "gtm" && "Vincular contenedor de Tag Manager"}
          </h4>
        </div>


        {errorMsg && (() => {
          const scopeMap: Record<string, { label: string; module: string; icon: string }> = {
            "__scope_ads__": { label: "Google Ads", module: "google_ads", icon: "" },
            "__scope_ga4__": { label: "Google Analytics 4", module: "page_analytics", icon: "" },
            "__scope_gtm__": { label: "Tag Manager", module: "tag_tracking", icon: "" },
          };
          const scopeInfo = scopeMap[errorMsg];

          if (scopeInfo) {
            return (
              <div style={{
                padding: "16px 18px", borderRadius: 10, marginBottom: 16,
                background: "var(--fc-surface)", border: "1px solid rgba(251,191,36,0.25)",
                display: "flex", gap: 14, alignItems: "flex-start",
              }}>
                <AlertCircle size={16} style={{ color: "var(--fc-warning)", flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "var(--fc-text)" }}>
                    {scopeInfo.icon} Permisos insuficientes para {scopeInfo.label}
                  </p>
                  <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--fc-text-secondary)", lineHeight: 1.6 }}>
                    Google no otorgó los permisos necesarios. Reconecta Google desde Integraciones para conceder acceso a <strong>{scopeInfo.label}</strong>.
                  </p>
                  <a
                    href={`/api/oauth/google/start?modules=${scopeInfo.module}`}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      fontSize: 11, fontWeight: 600, color: "#4285F4",
                      padding: "6px 14px", borderRadius: 6, textDecoration: "none",
                      background: "var(--fc-surface)", border: "1px solid rgba(66,133,244,0.25)",
                    }}
                  >
                    <ExternalLink size={11} /> Reconectar {scopeInfo.label}
                  </a>
                </div>
              </div>
            );
          }

          return (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "var(--red-dim)", border: "1px solid var(--fc-danger)", color: "var(--fc-danger)", fontSize: 12, marginBottom: 16 }}>
              <AlertCircle size={13} /> {errorMsg}
            </div>
          );
        })()}

        {loadingResources ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ height: 60, borderRadius: 8, background: "var(--fc-surface)", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : (
          <>
            {/* ── Google Ads Accounts ── */}
            {activeSection === "ads" && (
              adsAccounts.length === 0 ? (
                <p style={{ color: "var(--fc-text-secondary)", fontSize: 13 }}>No hay cuentas de Google Ads accesibles. Verifica los permisos de tu cuenta de Google.</p>
              ) : (
                adsAccounts.map(account => {
                  const isCurrent = sources.adsCustomerId === account.id;
                  return (
                    <div key={account.id} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px", borderRadius: 8, marginBottom: 8,
                      background: isCurrent ? "rgba(52,183,124,0.05)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isCurrent ? "rgba(52,183,124,0.3)" : "rgba(255,255,255,0.06)"}`,
                    }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--fc-surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "#4285F4", flexShrink: 0 }}>
                        <Database size={13} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--fc-text)" }}>{account.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--fc-text-secondary)", fontFamily: "var(--font-mono)" }}>ID: {account.id}</p>
                      </div>
                      <button
                        onClick={() => saveSource({ adsCustomerId: account.id }, `Cuenta de Ads vinculada: ${account.name}`)}
                        disabled={saving || isCurrent}
                        style={{
                          padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          cursor: isCurrent ? "default" : "pointer",
                          background: isCurrent ? "rgba(52,183,124,0.1)" : "rgba(59,130,246,0.08)",
                          border: `1px solid ${isCurrent ? "rgba(52,183,124,0.3)" : "rgba(59,130,246,0.2)"}`,
                          color: isCurrent ? "var(--fc-success)" : "var(--fc-accent)",
                          display: "flex", alignItems: "center", gap: 6,
                        }}
                      >
                        {saving && <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />}
                        {isCurrent ? <><CheckCircle2 size={11} /> Vinculada</> : "Vincular"}
                      </button>
                    </div>
                  );
                })
              )
            )}

            {/* ── GA4 Properties ── */}
            {activeSection === "ga4" && (
              ga4Properties.length === 0 ? (
                <p style={{ color: "var(--fc-text-secondary)", fontSize: 13 }}>No hay propiedades de GA4 accesibles. Verifica los permisos de tu cuenta de Google.</p>
              ) : (
                ga4Properties.map(prop => {
                  const isCurrent = sources.ga4PropertyId === prop.id;
                  return (
                    <div key={prop.id} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px", borderRadius: 8, marginBottom: 8,
                      background: isCurrent ? "rgba(52,183,124,0.05)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isCurrent ? "rgba(52,183,124,0.3)" : "rgba(255,255,255,0.06)"}`,
                    }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--fc-surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fc-warning)", flexShrink: 0 }}>
                        <BarChart2 size={13} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--fc-text)" }}>{prop.displayName}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--fc-text-secondary)", fontFamily: "var(--font-mono)" }}>{prop.name}</p>
                      </div>
                      <button
                        onClick={() => saveSource({ ga4PropertyId: prop.id }, `Propiedad de GA4 vinculada: ${prop.displayName}`)}
                        disabled={saving || isCurrent}
                        style={{
                          padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          cursor: isCurrent ? "default" : "pointer",
                          background: isCurrent ? "rgba(52,183,124,0.1)" : "rgba(251,191,36,0.08)",
                          border: `1px solid ${isCurrent ? "rgba(52,183,124,0.3)" : "rgba(251,191,36,0.2)"}`,
                          color: isCurrent ? "var(--fc-success)" : "var(--fc-warning)",
                          display: "flex", alignItems: "center", gap: 6,
                        }}
                      >
                        {saving && <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />}
                        {isCurrent ? <><CheckCircle2 size={11} /> Vinculada</> : "Vincular"}
                      </button>
                    </div>
                  );
                })
              )
            )}

            {/* ── GTM Accounts → Containers ── */}
            {activeSection === "gtm" && !selectedGtmAccount && (
              gtmAccounts.length === 0 ? (
                <p style={{ color: "var(--fc-text-secondary)", fontSize: 13 }}>No hay cuentas de Tag Manager accesibles. Verifica los permisos.</p>
              ) : (
                gtmAccounts.map(acct => (
                  <div key={acct.accountId} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 8, marginBottom: 8,
                    background: "var(--fc-surface)", border: "1px solid var(--fc-border-subtle)",
                    cursor: "pointer",
                  }}
                    onClick={() => loadGtmContainers(acct.accountId)}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--fc-surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fc-success)", flexShrink: 0 }}>
                      <Settings size={13} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--fc-text)" }}>{acct.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--fc-text-secondary)", fontFamily: "var(--font-mono)" }}>ID: {acct.accountId}</p>
                    </div>
                    <ChevronRight size={14} style={{ color: "var(--fc-text-muted)" }} />
                  </div>
                ))
              )
            )}

            {activeSection === "gtm" && selectedGtmAccount && (
              <>
                <button
                  onClick={() => { setSelectedGtmAccount(null); setGtmContainers([]); }}
                  style={{ background: "none", border: "none", padding: 0, color: "var(--fc-text-secondary)", fontSize: 12, cursor: "pointer", marginBottom: 14, display: "flex", alignItems: "center", gap: 4 }}
                >
                  <ChevronLeft size={13} /> {gtmAccounts.find(a => a.accountId === selectedGtmAccount)?.name}
                </button>
                {gtmContainers.length === 0 ? (
                  <p style={{ color: "var(--fc-text-secondary)", fontSize: 13 }}>No hay contenedores en esta cuenta.</p>
                ) : (
                  gtmContainers.map(cont => {
                    const isCurrent = sources.gtmContainerId === cont.containerId && sources.gtmAccountId === selectedGtmAccount;
                    return (
                      <div key={cont.containerId} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 14px", borderRadius: 8, marginBottom: 8,
                        background: isCurrent ? "rgba(52,183,124,0.05)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${isCurrent ? "rgba(52,183,124,0.3)" : "rgba(255,255,255,0.06)"}`,
                      }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--fc-surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fc-success)", flexShrink: 0 }}>
                          <Box size={13} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--fc-text)" }}>{cont.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: "var(--fc-text-secondary)", fontFamily: "var(--font-mono)" }}>{cont.publicId} (ID: {cont.containerId})</p>
                        </div>
                        <button
                          onClick={() => saveSource(
                            { gtmAccountId: selectedGtmAccount, gtmContainerId: cont.containerId },
                            `Contenedor de GTM vinculado: ${cont.name}`
                          )}
                          disabled={saving || isCurrent}
                          style={{
                            padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                            cursor: isCurrent ? "default" : "pointer",
                            background: isCurrent ? "rgba(52,183,124,0.1)" : "rgba(16,185,129,0.08)",
                            border: `1px solid ${isCurrent ? "rgba(52,183,124,0.3)" : "rgba(16,185,129,0.2)"}`,
                            color: isCurrent ? "var(--fc-success)" : "var(--fc-success)",
                            display: "flex", alignItems: "center", gap: 6,
                          }}
                        >
                          {saving && <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />}
                          {isCurrent ? <><CheckCircle2 size={11} /> Vinculado</> : "Vincular"}
                        </button>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Overview (main view) ──
  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }`}</style>

      {successMsg && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "var(--fc-surface)", border: "1px solid rgba(52,183,124,0.3)", color: "var(--fc-success)", fontSize: 12, marginBottom: 16 }}>
          <CheckCircle2 size={13} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "var(--red-dim)", border: "1px solid var(--fc-danger)", color: "var(--fc-danger)", fontSize: 12, marginBottom: 16 }}>
          <AlertCircle size={13} /> {errorMsg}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Google Ads */}
        <ResourceRow
          icon={<Database size={14} />}
          iconBg="rgba(66,133,244,0.1)"
          iconColor="#4285F4"
          label="Google Ads"
          configured={!!sources.adsCustomerId}
          configuredValue={sources.adsCustomerId ? `Customer ID: ${sources.adsCustomerId}` : undefined}
          onConfigure={() => openSection("ads")}
          onClear={() => saveSource({ adsCustomerId: "" }, "Cuenta de Ads desvinculada.")}
        />

        {/* Google Analytics 4 */}
        <ResourceRow
          icon={<BarChart2 size={14} />}
          iconBg="rgba(251,191,36,0.1)"
          iconColor="var(--fc-warning)"
          label="Google Analytics 4"
          configured={!!sources.ga4PropertyId}
          configuredValue={sources.ga4PropertyId ? `Property: ${sources.ga4PropertyId}` : undefined}
          onConfigure={() => openSection("ga4")}
          onClear={() => saveSource({ ga4PropertyId: "" }, "Propiedad de GA4 desvinculada.")}
        />

        {/* Tag Manager */}
        <ResourceRow
          icon={<Box size={14} />}
          iconBg="rgba(16,185,129,0.1)"
          iconColor="var(--fc-success)"
          label="Tag Manager"
          configured={!!sources.gtmContainerId}
          configuredValue={sources.gtmContainerId ? `Container ID: ${sources.gtmContainerId}` : undefined}
          onConfigure={() => openSection("gtm")}
          onClear={() => saveSource({ gtmAccountId: "", gtmContainerId: "" }, "Contenedor de GTM desvinculado.")}
        />
      </div>

      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={fetchSources}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fc-text-secondary)", fontSize: 11, display: "flex", alignItems: "center", gap: 4, padding: "4px 0" }}
        >
          <RefreshCw size={11} /> Actualizar
        </button>
        <span style={{ color: "var(--fc-text-muted)", fontSize: 10 }}>·</span>
        <a href="/dashboard/integrations" style={{ fontSize: 11, color: "var(--fc-text-secondary)", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
          <ExternalLink size={10} /> Gestionar integración de Google
        </a>
      </div>
    </div>
  );
}

// ── Row component ──
function ResourceRow({
  icon, iconBg, iconColor, label,
  configured, configuredValue,
  onConfigure, onClear,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  configured: boolean;
  configuredValue?: string;
  onConfigure: () => void;
  onClear: () => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px", borderRadius: 8,
      background: configured ? "rgba(52,183,124,0.03)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${configured ? "rgba(52,183,124,0.2)" : "rgba(255,255,255,0.06)"}`,
      transition: "all 0.2s",
    }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
          <span style={{
            display: "inline-block", width: 7, height: 7, borderRadius: "50%",
            background: configured ? "var(--fc-success)" : "rgba(255,255,255,0.2)",
            boxShadow: configured ? "0 0 6px rgba(52,183,124,0.7)" : "none",
            flexShrink: 0,
          }} />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--fc-text)" }}>{label}</p>
          {configured && (
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fc-success)", background: "var(--emerald-dim)", padding: "1px 6px", borderRadius: 4 }}>
              VINCULADO
            </span>
          )}
        </div>
        {configuredValue ? (
          <p style={{ margin: 0, fontSize: 11, color: "var(--fc-text-secondary)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{configuredValue}</p>
        ) : (
          <p style={{ margin: 0, fontSize: 11, color: "var(--fc-text-muted)" }}>Sin configurar — Click para vincular</p>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {configured && (
          <button
            onClick={onClear}
            style={{ background: "none", border: "1px solid var(--fc-border)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: "var(--fc-text-muted)", fontSize: 11 }}
          >
            Quitar
          </button>
        )}
        <button
          onClick={onConfigure}
          style={{
            background: "rgba(0, 212, 255, 0.1)", border: "1px solid rgba(59,130,246,0.2)",
            borderRadius: 6, padding: "5px 12px", cursor: "pointer", color: "var(--fc-accent)",
            fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 5,
          }}
        >
          {configured ? "Cambiar" : "Vincular"} <ChevronRight size={11} />
        </button>
      </div>
    </div>
  );
}
