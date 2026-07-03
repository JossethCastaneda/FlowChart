"use client";

import { useState } from "react";
import { Key, Loader2, Database, Link as LinkIcon, RefreshCw } from "lucide-react";

interface CustomCrmModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CustomCrmModal({ onClose, onSuccess }: CustomCrmModalProps) {
  const [form, setForm] = useState({ apiUrl: "", token: "", refreshToken: "" });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  async function handleTest() {
    if (!form.apiUrl || !form.token) return;
    setTesting(true);
    setTestResult(null);
    try {
      // Endpoint para validar (Mock) o delegar al backend
      const res = await fetch("/api/workspace/integrations/test-crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, msg: "Conexión exitosa. ¡Todo listo!" });
      } else {
        setTestResult({ success: false, msg: data.error || "Fallo la conexión con el API." });
      }
    } catch (e) {
      setTestResult({ success: false, msg: "Error de red al probar conexión." });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!form.apiUrl || !form.token) return;
    setSaving(true);
    try {
      const res = await fetch("/api/workspace/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          provider: "custom_crm", 
          token: JSON.stringify(form) // Enviamos el JSON stringificado, el backend lo encriptará
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        alert(data.error || "Error al guardar el CRM");
      }
    } catch {
      alert("Error de red");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 500, padding: 24, borderRadius: 12,
          background: "var(--foreground)", border: "1px solid var(--hairline)",
          display: "flex", flexDirection: "column", gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Database size={18} style={{ color: "var(--emerald)" }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            Conectar CRM vía API
          </h3>
        </div>
        
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
          Configura un endpoint personalizado para importar resultados, sesiones e intenciones de tu bot o CRM.
          Tus credenciales se cifrarán de manera segura con AES-256.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
              <LinkIcon size={10} style={{ display: "inline", marginRight: 4 }} /> URL del API
            </label>
            <input
              type="url"
              placeholder="https://api.tucrm.com/v1"
              value={form.apiUrl}
              onChange={e => setForm({ ...form, apiUrl: e.target.value })}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
                background: "rgba(255,255,255,0.05)", border: "1px solid var(--hairline)",
                color: "var(--foreground)", outline: "none"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
              <Key size={10} style={{ display: "inline", marginRight: 4 }} /> Access Token (Bearer)
            </label>
            <input
              type="password"
              placeholder="••••••••••••••••••••••••••••••••"
              value={form.token}
              onChange={e => setForm({ ...form, token: e.target.value })}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
                background: "rgba(255,255,255,0.05)", border: "1px solid var(--hairline)",
                color: "var(--foreground)", outline: "none", fontFamily: "monospace"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
              <RefreshCw size={10} style={{ display: "inline", marginRight: 4 }} /> Refresh Token (Opcional)
            </label>
            <input
              type="password"
              placeholder="••••••••••••••••••••••••••••••••"
              value={form.refreshToken}
              onChange={e => setForm({ ...form, refreshToken: e.target.value })}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
                background: "rgba(255,255,255,0.05)", border: "1px solid var(--hairline)",
                color: "var(--foreground)", outline: "none", fontFamily: "monospace"
              }}
            />
          </div>
        </div>

        {testResult && (
          <div style={{
            padding: "10px 14px", borderRadius: 6, fontSize: 12,
            background: testResult.success ? "rgba(16,185,129,0.1)" : "rgba(229,72,77,0.1)",
            border: `1px solid ${testResult.success ? "rgba(16,185,129,0.3)" : "rgba(229,72,77,0.3)"}`,
            color: testResult.success ? "var(--emerald)" : "var(--red)"
          }}>
            {testResult.msg}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 8 }}>
          <button
            onClick={handleTest}
            disabled={testing || !form.apiUrl || !form.token}
            style={{
              padding: "10px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: "rgba(255,255,255,0.05)", border: "1px solid var(--hairline)",
              color: "var(--foreground)", cursor: testing || !form.apiUrl || !form.token ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {testing && <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />}
            Probar Conexión
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: "10px 16px", borderRadius: 6, fontSize: 12,
                background: "transparent", border: "1px solid var(--hairline)",
                color: "var(--text-secondary)", cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              disabled={!form.apiUrl || !form.token || saving}
              onClick={handleSave}
              style={{
                padding: "10px 20px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: form.apiUrl && form.token ? "rgba(16,185,129,0.15)" : "var(--row-hover)",
                border: `1px solid ${form.apiUrl && form.token ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.06)"}`,
                color: form.apiUrl && form.token ? "var(--emerald)" : "var(--text-secondary)",
                cursor: form.apiUrl && form.token && !saving ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {saving && <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
