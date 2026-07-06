"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, RefreshCw, Plus, AlertCircle, Database, CheckCircle2, Loader2, Box
} from "lucide-react";
import { useLanguage } from "@/components/layout/LanguageContext";

const TRANSLATIONS = {
  es: {
    title: "Google Tag Manager",
    subtitle: "Cuentas y contenedores de GTM accesibles.",
    connectedOn: "Conectado el",
    grantPermissions: "Renovar accesos",
    opening: "Abriendo...",
    errorLoading: "Error cargando cuentas",
    errorNetwork: "Error de red",
    retry: "Reintentar",
    notConnected: "No conectado",
    connectPrompt: "Conecta tu cuenta de Google para gestionar tus etiquetas",
    connectBtn: "Conectar Tag Manager",
    enabledAccounts: "Cuentas Disponibles",
    enabledContainers: "Contenedores Disponibles",
    noAccounts: "No hay cuentas de Tag Manager disponibles.",
    noContainers: "No hay contenedores en esta cuenta.",
    accountsLinked: "cuentas encontradas",
    containersLinked: "contenedores encontrados",
    noAccountsConnected: "Sin cuentas conectadas",
    renewAuth: "Renovar autorizaciones",
    select: "Seleccionar",
    selected: "Seleccionada",
    saving: "Guardando...",
    viewContainers: "Ver contenedores",
    backToAccounts: "Volver a cuentas",
  },
  en: {
    title: "Google Tag Manager",
    subtitle: "Accessible GTM accounts and containers.",
    connectedOn: "Connected on",
    grantPermissions: "Renew access",
    opening: "Opening...",
    errorLoading: "Error loading accounts",
    errorNetwork: "Network error",
    retry: "Retry",
    notConnected: "Not connected",
    connectPrompt: "Connect your Google account to manage your tags",
    connectBtn: "Connect Tag Manager",
    enabledAccounts: "Available Accounts",
    enabledContainers: "Available Containers",
    noAccounts: "No Tag Manager accounts available.",
    noContainers: "No containers in this account.",
    accountsLinked: "accounts found",
    containersLinked: "containers found",
    noAccountsConnected: "No connected accounts",
    renewAuth: "Renew authorizations",
    select: "Select",
    selected: "Selected",
    saving: "Saving...",
    viewContainers: "View containers",
    backToAccounts: "Back to accounts",
  }
};

interface GTMAccount {
  accountId: string;
  name: string;
}

interface GTMContainer {
  containerId: string;
  name: string;
  publicId: string;
}

const GTMIcon = () => (
  <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor">
    <path d="M22.753 11.235 12.766 1.246a1.761 1.761 0 0 0-1.246-.516H3.344C2.378.73.73 2.378.73 3.344v8.176c0 .468.187.917.516 1.246l9.988 9.988a1.761 1.761 0 0 0 2.492 0l9.027-9.027a1.761 1.761 0 0 0 0-2.492zm-16.14-5.023c-1.218 0-2.203-.984-2.203-2.203s.984-2.203 2.203-2.203 2.203.984 2.203 2.203-.984 2.203-2.203 2.203z"/>
  </svg>
);

export default function TagManagerPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];

  const [accounts, setAccounts] = useState<GTMAccount[]>([]);
  const [containers, setContainers] = useState<GTMContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [currentContainerId, setCurrentContainerId] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/google/resources/gtm");
      const data = await res.json();
      if (res.status === 401 || data.error) {
        setConnected(false);
        if (data.error && res.status !== 401) setError(data.error);
      } else {
        setConnected(true);
        setAccounts(data.accounts || []);
      }
    } catch (e: any) {
      setError(e.message || t.errorNetwork);
    }
    setLoading(false);
  }, [t.errorNetwork]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleReconnect = () => {
    setReconnecting(true);
    window.location.href = "/api/oauth/google/start?modules=tag_tracking";
  };

  const fetchContainers = async (accountId: string) => {
    setSelectedAccountId(accountId);
    setLoadingContainers(true);
    try {
      const res = await fetch(`/api/integrations/google/resources/gtm?accountId=${accountId}`);
      const data = await res.json();
      setContainers(data.containers || []);
    } catch (e) {
      alert("Error al cargar contenedores");
    }
    setLoadingContainers(false);
  };

  const handleSelectContainer = async (containerId: string) => {
    if (!selectedAccountId) return;
    setSavingId(containerId);
    try {
      const res = await fetch("/api/integrations/google/resources/gtm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedAccountId, containerId })
      });
      if (res.ok) {
        setCurrentContainerId(containerId);
      } else {
        const data = await res.json();
        alert(data.error || "Error al seleccionar el contenedor");
      }
    } catch (e) {
      alert("Error de red");
    }
    setSavingId(null);
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        .adaccount-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--surface-hover); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px; transition: border-color 0.2s; }
        .adaccount-row[data-selected="true"] { border-color: var(--cyan); background: rgba(59,130,246,0.05); }
      `}</style>

      <div style={{
        display: "flex", flexDirection: "column", gap: 0,
        minHeight: "100vh", padding: "0 0 40px",
        animation: "fadeIn 0.25s ease",
        fontFamily: "inherit",
      }}>
        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 28px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)", backdropFilter: "blur(20px)",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={() => {
                if (selectedAccountId) {
                  setSelectedAccountId(null);
                  setContainers([]);
                } else {
                  router.back();
                }
              }}
              style={{
                background: "var(--surface-hover)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "5px 8px", cursor: "pointer", color: "var(--text-secondary)",
                display: "flex", alignItems: "center",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "#4285F4",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(66,133,244,0.3)",
              color: "white",
            }}>
              <GTMIcon />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: 0, letterSpacing: "-0.02em" }}>
                {t.title}
              </h1>
            </div>
          </div>
          <button
            onClick={handleReconnect}
            disabled={reconnecting}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 16px", borderRadius: 8,
              background: "var(--cyan-dim)",
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

        {/* Subtitle */}
        <div style={{ padding: "12px 28px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
            {t.subtitle}
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: "28px 28px 0" }}>
          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", borderRadius: 10,
              background: "var(--red-dim)", border: "1px solid var(--red)",
              color: "var(--red)", fontSize: 12, marginBottom: 20,
            }}>
              <AlertCircle size={14} />
              {error}
              <button onClick={fetchAccounts} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--red)", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: "inherit" }}>
                <RefreshCw size={11} /> {t.retry}
              </button>
            </div>
          )}

          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(2)].map((_, i) => (
                <div key={i} style={{ height: 68, borderRadius: 10, background: "var(--surface-hover)", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}

          {!loading && !connected && !error && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--cyan-dim)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--cyan)" }}>
                <GTMIcon />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: "0 0 6px" }}>{t.notConnected}</p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 20px" }}>{t.connectPrompt}</p>
              <button
                onClick={handleReconnect}
                style={{ padding: "10px 20px", borderRadius: 8, background: "var(--cyan-dim)", border: "1px solid var(--border-strong)", color: "var(--cyan)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Plus size={13} /> {t.connectBtn}
              </button>
            </div>
          )}

          {!loading && connected && !selectedAccountId && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{t.enabledAccounts}</h2>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0" }}>
                    {accounts.length === 0 ? t.noAccountsConnected : `${accounts.length} ${t.accountsLinked}`}
                  </p>
                </div>
              </div>

              {accounts.length === 0 && (
                <div style={{ padding: "40px 20px", textAlign: "center", borderRadius: 12, border: "1px dashed var(--border)", background: "var(--surface)" }}>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>{t.noAccounts}</p>
                </div>
              )}

              {accounts.map(account => (
                <div key={account.accountId} className="adaccount-row">
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--cyan-dim)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cyan)", flexShrink: 0 }}>
                    <Database size={14} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{account.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>ID: {account.accountId}</p>
                  </div>
                  <button
                    onClick={() => fetchContainers(account.accountId)}
                    style={{
                      padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--foreground)",
                    }}
                  >
                    {t.viewContainers}
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loading && connected && selectedAccountId && (
            <div style={{ animation: "fadeIn 0.2s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <button
                  onClick={() => setSelectedAccountId(null)}
                  style={{ background: "none", border: "none", padding: 0, color: "var(--text-secondary)", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
                >
                  {t.backToAccounts}
                </button>
                <span style={{ color: "var(--text-muted)" }}>/</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{accounts.find(a => a.accountId === selectedAccountId)?.name}</span>
              </div>
              
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: "0 0 16px" }}>{t.enabledContainers}</h2>
              
              {loadingContainers ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[...Array(2)].map((_, i) => (
                    <div key={i} style={{ height: 68, borderRadius: 10, background: "var(--surface-hover)", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              ) : containers.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", borderRadius: 12, border: "1px dashed var(--border)", background: "var(--surface)" }}>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>{t.noContainers}</p>
                </div>
              ) : (
                containers.map(container => (
                  <div key={container.containerId} className="adaccount-row" data-selected={currentContainerId === container.containerId}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--emerald)", opacity: 0.2, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--emerald)", flexShrink: 0, position: "relative" }}>
                    </div>
                    <div style={{ position: "absolute", marginLeft: 8, color: "var(--emerald)" }}>
                      <Box size={16} />
                    </div>
                    <div style={{ flex: 1, marginLeft: 20 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{container.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>{container.publicId} (ID: {container.containerId})</p>
                    </div>
                    <button
                      onClick={() => handleSelectContainer(container.containerId)}
                      disabled={savingId === container.containerId || currentContainerId === container.containerId}
                      style={{
                        padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: currentContainerId === container.containerId ? "default" : "pointer",
                        background: currentContainerId === container.containerId ? "rgba(16,185,129,0.1)" : "var(--surface-hover)",
                        border: `1px solid ${currentContainerId === container.containerId ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
                        color: currentContainerId === container.containerId ? "var(--emerald)" : "var(--foreground)",
                        display: "flex", alignItems: "center", gap: 6,
                      }}
                    >
                      {savingId === container.containerId && <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />}
                      {currentContainerId === container.containerId && <CheckCircle2 size={12} />}
                      {savingId === container.containerId ? t.saving : currentContainerId === container.containerId ? t.selected : t.select}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
