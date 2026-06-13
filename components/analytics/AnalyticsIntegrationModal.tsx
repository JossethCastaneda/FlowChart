"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Check, AlertCircle, Database, Play } from "lucide-react";
import { createPortal } from "react-dom";

interface IntegrationConfig {
  syncFrequency: string;
  backfillStart?: string;
  timezone: string;
  paused: boolean;
}

export interface AnalyticsIntegrationData {
  id?: string;
  provider: "cari_ai" | "botmaker";
  name: string;
  credentials: { accessToken?: string };
  config: IntegrationConfig;
  connected?: boolean;
}

interface AnalyticsIntegrationModalProps {
  initial?: AnalyticsIntegrationData;
  onClose: () => void;
  onSave: () => void; // Trigger reload on parent
}

export function AnalyticsIntegrationModal({ initial, onClose, onSave }: AnalyticsIntegrationModalProps) {
  const isEditing = !!initial?.id;

  const [form, setForm] = useState<AnalyticsIntegrationData>({
    provider: "botmaker",
    name: "",
    credentials: { accessToken: "" },
    config: {
      syncFrequency: "24h",
      timezone: "America/Mexico_City",
      paused: false,
    },
    ...initial,
  });

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleTest = async () => {
    // Si estamos editando y el token está enmascarado, significa que el usuario no lo cambió.
    // Para probar, idealmente necesitaríamos el token real, pero el backend de test pide las credenciales.
    // Como esto es un MOCK, si manda enmascarado fallará. Para UX simple:
    if (form.credentials.accessToken?.includes("••••")) {
      setTestResult({ success: false, message: "Ingresa el token completo para probar la conexión." });
      return;
    }

    if (!form.credentials.accessToken) {
      setTestResult({ success: false, message: "El token no puede estar vacío." });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/analytics/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: form.provider,
          credentials: form.credentials,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.success) {
        setTestResult({ success: true, message: "Conexión exitosa" });
      } else {
        setTestResult({ success: false, message: json.data?.error || json.error || "Fallo la conexión" });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Error de red" });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError("El nombre es requerido");
    if (!isEditing && !form.credentials.accessToken) return setError("El token es requerido");
    
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/analytics/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();

      if (json.success) {
        onSave();
      } else {
        setError(json.error || "Error al guardar");
      }
    } catch (err: any) {
      setError(err.message || "Error de red");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  const inpStyles = {
    width: "100%", padding: "9px 12px", borderRadius: "8px", fontSize: "13px",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    color: "#e2e8f0", outline: "none", fontFamily: "inherit"
  };

  return createPortal(
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)",
    }}>
      <div onClick={e => e.stopPropagation()} className="page-enter" style={{
        width: "500px", maxWidth: "90%",
        background: "var(--surface)", border: "1px solid var(--border-strong)",
        borderRadius: "14px", overflow: "hidden", display: "flex", flexDirection: "column"
      }}>
        {/* Header */}
        <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: "8px" }}>
            <Database className="w-4 h-4" />
            {isEditing ? "Editar Integración de Analítica" : "Nueva Integración de Analítica"}
          </h2>
          <button onClick={onClose} style={{ color: "#64748b", background: "none", border: "none", cursor: "pointer" }}><X className="w-5 h-5" /></button>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto", maxHeight: "70vh" }}>
          {error && (
            <div style={{ padding: "12px", background: "rgba(226,68,92,0.1)", color: "#e2445c", borderRadius: "8px", fontSize: "12px", border: "1px solid rgba(226,68,92,0.2)" }}>
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>PROVEEDOR</label>
              <select
                style={{ ...inpStyles, appearance: "auto" }}
                value={form.provider}
                onChange={e => setForm({ ...form, provider: e.target.value as any })}
                disabled={isEditing}
              >
                <option value="botmaker">BotMaker</option>
                <option value="cari_ai">Cari AI</option>
              </select>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>NOMBRE DE LA INTEGRACIÓN</label>
              <input
                style={inpStyles}
                placeholder="Ej: CRM Principal"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>ACCESS TOKEN</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                style={{ ...inpStyles, flex: 1, fontFamily: "monospace" }}
                placeholder={isEditing ? "Dejar en blanco para mantener el actual" : "Ingresa el token seguro"}
                value={form.credentials.accessToken || ""}
                onChange={e => setForm({ ...form, credentials: { ...form.credentials, accessToken: e.target.value } })}
              />
              <button 
                onClick={handleTest}
                disabled={testing}
                style={{ 
                  padding: "0 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                  background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)", color: "#00d4ff",
                  cursor: testing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px"
                }}
              >
                {testing ? <Loader2 className="w-3 h-3" style={{ animation: "spin 1s linear infinite" }} /> : <Play className="w-3 h-3" />}
                Probar
              </button>
            </div>
            {testResult && (
              <span style={{ fontSize: "11px", color: testResult.success ? "#10b981" : "#e2445c", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                {testResult.success ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {testResult.message}
              </span>
            )}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "4px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>FRECUENCIA DE SINCRONIZACIÓN</label>
              <select
                style={{ ...inpStyles, appearance: "auto" }}
                value={form.config.syncFrequency}
                onChange={e => setForm({ ...form, config: { ...form.config, syncFrequency: e.target.value } })}
              >
                <option value="1h">Cada hora</option>
                <option value="6h">Cada 6 horas</option>
                <option value="12h">Cada 12 horas</option>
                <option value="24h">Una vez al día</option>
              </select>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>ZONA HORARIA</label>
              <select
                style={{ ...inpStyles, appearance: "auto" }}
                value={form.config.timezone}
                onChange={e => setForm({ ...form, config: { ...form.config, timezone: e.target.value } })}
              >
                <option value="America/Mexico_City">America/Mexico_City</option>
                <option value="America/Bogota">America/Bogota</option>
                <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>FECHA INICIAL (BACKFILL)</label>
              <input
                type="date"
                style={{ ...inpStyles, colorScheme: "dark" }}
                value={form.config.backfillStart || ""}
                onChange={e => setForm({ ...form, config: { ...form.config, backfillStart: e.target.value } })}
              />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", justifyContent: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.config.paused}
                  onChange={e => setForm({ ...form, config: { ...form.config, paused: e.target.checked } })}
                  style={{ accentColor: "var(--amber)", width: "16px", height: "16px" }}
                />
                <span style={{ fontSize: "13px", color: "#e2e8f0" }}>Pausar Sincronización</span>
              </label>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", fontSize: "12px", color: "#94a3b8", background: "transparent", border: "1px solid transparent", cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} style={{ 
            padding: "8px 24px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, 
            background: "var(--cyan)", color: "#050812", border: "none", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px"
          }}>
            {saving && <Loader2 className="w-3 h-3" style={{ animation: "spin 1s linear infinite" }} />}
            Guardar Integración
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
