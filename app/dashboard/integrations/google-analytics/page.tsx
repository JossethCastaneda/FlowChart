"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, RefreshCw, Plus, AlertCircle, Database, CheckCircle2, Loader2
} from "lucide-react";
import { useLanguage } from "@/components/layout/LanguageContext";

const TRANSLATIONS = {
  es: {
    title: "Google Analytics 4",
    subtitle: "Propiedades de GA4 accesibles desde tu usuario de Google.",
    connectedOn: "Conectado el",
    grantPermissions: "Renovar accesos",
    opening: "Abriendo...",
    errorLoading: "Error cargando propiedades",
    errorNetwork: "Error de red",
    retry: "Reintentar",
    notConnected: "No conectado",
    connectPrompt: "Conecta tu cuenta de Google para gestionar tus analíticas",
    connectBtn: "Conectar Google Analytics",
    enabledAccounts: "Propiedades Disponibles",
    noAccounts: "No hay propiedades disponibles. Asegúrate de tener acceso a propiedades de GA4 y vuelve a dar permisos.",
    accountLinked: "propiedad encontrada",
    accountsLinked: "propiedades encontradas",
    noAccountsConnected: "Sin propiedades conectadas",
    renewAuth: "Renovar autorizaciones",
    select: "Seleccionar",
    selected: "Seleccionada",
    saving: "Guardando...",
    saveSelections: "Guardar Selección",
  },
  en: {
    title: "Google Analytics 4",
    subtitle: "GA4 properties accessible from your Google user.",
    connectedOn: "Connected on",
    grantPermissions: "Renew access",
    opening: "Opening...",
    errorLoading: "Error loading properties",
    errorNetwork: "Network error",
    retry: "Retry",
    notConnected: "Not connected",
    connectPrompt: "Connect your Google account to manage your analytics",
    connectBtn: "Connect Google Analytics",
    enabledAccounts: "Available Properties",
    noAccounts: "No properties available. Make sure you have access to GA4 properties and grant permissions again.",
    accountLinked: "property found",
    accountsLinked: "properties found",
    noAccountsConnected: "No connected properties",
    renewAuth: "Renew authorizations",
    select: "Select",
    selected: "Selected",
    saving: "Saving...",
    saveSelections: "Save Selection",
  }
};

interface GA4Property {
  id: string;
  name: string;
  displayName: string;
}

const GA4Icon = () => (
  <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1.897 17.552h-2.5v-8.81h2.5v8.81zm4.19-2.61h-2.5v-6.2h2.5v6.2zm4.191-3.696h-2.5v-2.505h2.5v2.505z" />
  </svg>
);

export default function GoogleAnalyticsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];

  const [properties, setProperties] = useState<GA4Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/google/resources/ga4");
      const data = await res.json();
      if (res.status === 401 || data.error) {
        setConnected(false);
        if (data.error && res.status !== 401) setError(data.error);
      } else {
        setConnected(true);
        setProperties(data.properties || []);
        if (data.selectedIds) {
          setSelectedIds(data.selectedIds);
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    } catch (e: any) {
      setError(e.message || t.errorNetwork);
    }
    setLoading(false);
  }, [t.errorNetwork]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO: [React] Refactor de hooks anti-patrón
  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const handleReconnect = () => {
    setReconnecting(true);
    window.location.href = "/api/oauth/google/start?modules=page_analytics";
  };

  const handleSaveSelections = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/google/resources/ga4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyIds: selectedIds })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error al guardar la selección");
      } else {
        alert(t.saveSelections + " OK");
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
    } catch (e) {
      alert("Error de red");
    }
    setSaving(false);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        .adaccount-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--fc-surface-hover); border: 1px solid var(--fc-border); border-radius: 8px; margin-bottom: 8px; transition: border-color 0.2s; cursor: pointer; }
        .adaccount-row[data-selected="true"] { border-color: var(--fc-warning); background: rgba(251,191,36,0.05); }
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
          borderBottom: "1px solid var(--fc-border)",
          background: "var(--fc-surface)", 
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={() => router.back()}
              style={{
                background: "var(--fc-surface-hover)", border: "1px solid var(--fc-border)",
                borderRadius: 8, padding: "5px 8px", cursor: "pointer", color: "var(--fc-text-secondary)",
                display: "flex", alignItems: "center",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "var(--fc-warning)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(251,191,36,0.3)",
              color: "var(--fc-text)",
            }}>
              <GA4Icon />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--fc-text)", margin: 0, letterSpacing: "-0.02em" }}>
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
              background: "var(--amber-dim)",
              border: "1px solid rgba(251,191,36,0.3)",
              color: "var(--fc-warning)", fontSize: 12, fontWeight: 600,
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
        <div style={{ padding: "12px 28px", borderBottom: "1px solid var(--fc-border)", background: "var(--fc-surface)" }}>
          <p style={{ fontSize: 12, color: "var(--fc-text-secondary)", margin: 0 }}>
            {t.subtitle}
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: "28px 28px 0" }}>
          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", borderRadius: 10,
              background: "var(--red-dim)", border: "1px solid var(--fc-danger)",
              color: "var(--fc-danger)", fontSize: 12, marginBottom: 20,
            }}>
              <AlertCircle size={14} />
              {error}
              <button onClick={fetchProperties} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--fc-danger)", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: "inherit" }}>
                <RefreshCw size={11} /> {t.retry}
              </button>
            </div>
          )}

          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(2)].map((_, i) => (
                <div key={i} style={{ height: 68, borderRadius: 10, background: "var(--fc-surface-hover)", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}

          {!loading && !connected && !error && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--fc-surface)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--fc-warning)" }}>
                <GA4Icon />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--fc-text)", margin: "0 0 6px" }}>{t.notConnected}</p>
              <p style={{ fontSize: 12, color: "var(--fc-text-secondary)", margin: "0 0 20px" }}>{t.connectPrompt}</p>
              <button
                onClick={handleReconnect}
                style={{ padding: "10px 20px", borderRadius: 8, background: "var(--fc-surface)", border: "1px solid rgba(251,191,36,0.3)", color: "var(--fc-warning)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Plus size={13} /> {t.connectBtn}
              </button>
            </div>
          )}

          {!loading && connected && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--fc-text)", margin: 0 }}>{t.enabledAccounts}</h2>
                  <p style={{ fontSize: 12, color: "var(--fc-text-secondary)", margin: "2px 0 0" }}>
                    {properties.length === 0 ? t.noAccountsConnected : `${properties.length} ${properties.length !== 1 ? t.accountsLinked : t.accountLinked}`}
                  </p>
                </div>
              </div>

              {properties.length === 0 && (
                <div style={{ padding: "40px 20px", textAlign: "center", borderRadius: 12, border: "1px dashed var(--fc-border)", background: "var(--fc-surface)" }}>
                  <p style={{ color: "var(--fc-text-secondary)", fontSize: 13, margin: 0 }}>{t.noAccounts}</p>
                </div>
              )}

              {properties.map(property => (
                <div key={property.id} className="adaccount-row" data-selected={selectedIds.includes(property.id)} onClick={() => toggleSelection(property.id)}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--fc-surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fc-warning)", flexShrink: 0 }}>
                    <Database size={14} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{property.displayName}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--fc-text-secondary)" }}>ID: {property.name}</p>
                  </div>
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, border: `1px solid ${selectedIds.includes(property.id) ? "var(--fc-warning)" : "var(--fc-border-hover)"}`,
                    background: selectedIds.includes(property.id) ? "var(--fc-warning)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "var(--background)",
                    transition: "all 0.2s"
                  }}>
                    {selectedIds.includes(property.id) && <CheckCircle2 size={14} />}
                  </div>
                </div>
              ))}

              {properties.length > 0 && (
                <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={handleSaveSelections}
                    disabled={saving}
                    style={{
                      padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer",
                      background: "var(--fc-warning)", color: "var(--background)", border: "none",
                      display: "flex", alignItems: "center", gap: 8
                    }}
                  >
                    {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                    {t.saveSelections}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
