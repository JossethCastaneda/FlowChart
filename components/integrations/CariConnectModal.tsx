"use client";

import { useState } from "react";
import { Key, Loader2 } from "lucide-react";

/**
 * Conexión de Cari AI (Report API v2).
 *
 * Cari entrega una credencial DISTINTA por grupo de reportes; el análisis de
 * resultados usa principalmente Conversaciones y Servicio (las demás son
 * opcionales). Se guardan como un solo blob cifrado (AES-256) en la
 * Integration del workspace: { provider: "cari", token: JSON de credenciales }.
 */

const FIELDS: { key: string; label: string; required?: boolean; hint: string }[] = [
  { key: "conversaciones", label: "ReportesConversaciones", required: true, hint: "conversaciones, mensajes, frases sin respuesta" },
  { key: "servicio", label: "ReportesServicio", required: true, hint: "indicadores de atención bot→agente, errores" },
  { key: "agentes", label: "ReportesAgentes", hint: "KPIs de agentes (FRT, AHT, colas) — opcional" },
  { key: "clientes", label: "ReportesClientes", hint: "lista de clientes y registros — opcional" },
  { key: "personalizados", label: "ReportesPersonalizados", hint: "reportes a la medida de tu cuenta — opcional" },
];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 11,
  fontFamily: "var(--font-mono)", background: "var(--surface-hover)",
  border: "1px solid var(--hairline)", color: "var(--foreground)",
  outline: "none", boxSizing: "border-box",
};

export function CariConnectModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const requiredOk = FIELDS.filter((f) => f.required).every((f) => (values[f.key] || "").trim());

  const save = async () => {
    if (!requiredOk) { setError("Las credenciales de Conversaciones y Servicio son necesarias para el análisis de resultados."); return; }
    setSaving(true);
    setError("");
    try {
      const credentials: Record<string, string> = {};
      for (const f of FIELDS) {
        const v = (values[f.key] || "").trim();
        if (v) credentials[f.key] = v;
      }
      const res = await fetch("/api/workspace/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "cari", token: JSON.stringify(credentials) }),
      });
      const data = await res.json();
      if (data.success) onSuccess();
      else setError(data.error || "Error al guardar las credenciales");
    } catch {
      setError("Error de red");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--panel-bg)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", padding: 24, borderRadius: 12, background: "var(--foreground)", border: "1px solid var(--hairline)", display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Key size={16} style={{ color: "var(--emerald)" }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Conectar Cari AI</h3>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          Pega las credenciales de la Report API de Cari (una por grupo de reportes — las entrega soporte de Cari AI).
          Se cifran con AES-256 antes de guardarse. Los reportes se descargan en hora CDMX.
        </p>

        {FIELDS.map((f) => (
          <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>
              {f.label}
              {f.required
                ? <span style={{ color: "var(--emerald)", fontWeight: 400 }}> · requerida</span>
                : <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}> · opcional</span>}
            </label>
            <input
              value={values[f.key] || ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={`Credencial de ${f.label}...`}
              style={inputStyle}
            />
            <span style={{ fontSize: 9, color: "var(--text-secondary)" }}>{f.hint}</span>
          </div>
        ))}

        {error && <p style={{ fontSize: 11, color: "var(--red)", margin: 0 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 6, fontSize: 12, background: "transparent", border: "1px solid var(--hairline)", color: "var(--text-secondary)", cursor: "pointer" }}>
            Cancelar
          </button>
          <button
            disabled={!requiredOk || saving}
            onClick={save}
            style={{
              padding: "8px 20px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: requiredOk ? "rgba(16,185,129,0.15)" : "var(--row-hover)",
              border: `1px solid ${requiredOk ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.06)"}`,
              color: requiredOk ? "var(--emerald)" : "var(--text-secondary)",
              cursor: requiredOk && !saving ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {saving && <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />}
            Guardar y conectar
          </button>
        </div>
      </div>
    </div>
  );
}
