"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, RefreshCw, Save, CheckCircle, Database, Lock, Settings } from "lucide-react";
import { useAnalyticsScope } from "../AnalyticsScopeContext";

export function TabConfig({ base, projectId, clientId }: { base: string; projectId?: string; clientId?: string | null }) {
  const scope = useAnalyticsScope();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [targets, setTargets] = useState<any[]>([]);

  useEffect(() => {
    fetchTargets();
  }, [base]);

  const fetchTargets = async () => {
    try {
      const res = await fetch(`${base}/kpi-targets`);
      if (res.ok) {
        const json = await res.json();
        setTargets(json.data.targets || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSuccessMsg("");
    try {
      // Usamos el primer proveedor si hay uno, o disparamos global si es posible.
      // En un entorno real, iteraríamos por provider o pediríamos elegir al usuario.
      const providerId = scope.allowedProviders?.[0] || "cari_ai"; 
      const res = await fetch(`/api/analytics/integrations/${providerId}/sync?projectId=${projectId || ""}`, {
        method: "POST"
      });
      if (res.ok) {
        setSuccessMsg("Sincronización iniciada con éxito");
      } else {
        const err = await res.json();
        alert("Error de sincronización: " + (err.error || "Desconocido"));
      }
    } catch (e) {
      alert("Fallo al contactar al servidor");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Sync Card */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h3 style={{ color: "white", fontSize: "16px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Database className="w-5 h-5 text-cyan-400" /> Sincronización y Origen
          </h3>
          <div className="space-y-4">
            <div>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Modo de Datos</p>
              <div style={{ display: "inline-block", background: "rgba(255,255,255,0.05)", padding: "4px 12px", borderRadius: "12px", fontSize: "12px", color: "white" }}>
                {scope.allowedProviders?.length ? "Real (Conectado)" : "Mock (Pruebas)"}
              </div>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Canales Activos</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {scope.allowedChannels?.map(c => (
                  <span key={c} style={{ background: "rgba(0,212,255,0.1)", color: "#00d4ff", padding: "2px 8px", borderRadius: "4px", fontSize: "11px" }}>{c}</span>
                )) || <span style={{ color: "#64748b", fontSize: "12px" }}>Todos</span>}
              </div>
            </div>
            
            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <button 
                onClick={handleManualSync}
                disabled={syncing}
                style={{ background: "var(--cyan)", border: "none", color: "#0f172a", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", cursor: syncing ? "not-allowed" : "pointer" }}
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} /> 
                {syncing ? "Sincronizando..." : "Sincronizar Manualmente"}
              </button>
              {successMsg && <p style={{ fontSize: "12px", color: "#4ade80", marginTop: "8px" }}>{successMsg}</p>}
            </div>
          </div>
        </div>

        {/* Metas y ROI */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h3 style={{ color: "white", fontSize: "16px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Settings className="w-5 h-5 text-cyan-400" /> Metas y Semáforos (KPI Targets)
          </h3>
          <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "16px" }}>
            Los objetivos definidos a nivel proyecto sobreescriben la configuración global del workspace.
          </p>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {targets.length === 0 && <p style={{ color: "#64748b", fontSize: "12px" }}>Cargando metas...</p>}
            {targets.map(t => (
              <div key={t.kpiKey} style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "white" }}>{t.name}</span>
                  <span style={{ fontSize: "11px", color: t.overridden ? "#00d4ff" : "#64748b" }}>{t.overridden ? "Override" : "Global"}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <span style={{ fontSize: "10px", color: "#94a3b8", display: "block" }}>Meta (Verde)</span>
                    <span style={{ fontSize: "12px", color: "#4ade80" }}>{t.targetValue ?? "-"} {t.unit === "percent" ? "%" : ""}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: "10px", color: "#94a3b8", display: "block" }}>Advertencia (Rojo)</span>
                    <span style={{ fontSize: "12px", color: "#f87171" }}>{t.warningThreshold ?? "-"} {t.unit === "percent" ? "%" : ""}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Permisos */}
        <div className="glass-panel md:col-span-2" style={{ padding: "24px" }}>
          <h3 style={{ color: "white", fontSize: "16px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Lock className="w-5 h-5 text-cyan-400" /> Privacidad y Permisos (view_sensitive)
          </h3>
          <p style={{ fontSize: "12px", color: "#94a3b8", maxWidth: "600px" }}>
            Toda exportación y visualización de PII (Personally Identifiable Information) como IDs de usuario, emails, o teléfonos, es enmascarada automáticamente a menos que el usuario tenga el rol de Admin con permisos de <code>view_sensitive</code>. Cada des-enmascaramiento queda registrado en el log de auditoría del sistema de manera inmutable.
          </p>
        </div>

      </div>
    </div>
  );
}
