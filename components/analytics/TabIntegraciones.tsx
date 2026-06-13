"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Database, Activity, Pause, Clock, Edit2 } from "lucide-react";
import { AnalyticsIntegrationData, AnalyticsIntegrationModal } from "./AnalyticsIntegrationModal";

export function TabIntegraciones() {
  const [integrations, setIntegrations] = useState<AnalyticsIntegrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<"closed" | "new" | "edit">("closed");
  const [editingData, setEditingData] = useState<AnalyticsIntegrationData | null>(null);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/integrations");
      const json = await res.json();
      if (json.success) {
        setIntegrations(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleEdit = (intg: AnalyticsIntegrationData) => {
    setEditingData(intg);
    setModalMode("edit");
  };

  const handleNew = () => {
    setEditingData(null);
    setModalMode("new");
  };

  return (
    <div className="space-y-4">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Integraciones de Datos</h3>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>Configura fuentes de datos como Cari AI o Botmaker para sincronizar analítica.</p>
        </div>
        <button
          onClick={handleNew}
          style={{
            padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 700,
            background: "var(--cyan)", color: "#050812", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "6px"
          }}
        >
          <Plus className="w-3 h-3" />
          Nueva Integración
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
        {loading ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#64748b", gridColumn: "1/-1" }}>Cargando integraciones...</div>
        ) : integrations.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.1)", gridColumn: "1/-1" }}>
            <Database className="w-8 h-8" style={{ color: "#475569", margin: "0 auto 12px" }} />
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>No tienes integraciones de analítica configuradas.</p>
          </div>
        ) : (
          integrations.map((intg) => (
            <div key={intg.id} style={{ 
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", 
              borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" 
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)", margin: "0 0 4px" }}>{intg.name}</h4>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)", background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: "4px", textTransform: "uppercase" }}>
                    {intg.provider === "cari_ai" ? "Cari AI" : "Botmaker"}
                  </span>
                </div>
                <button onClick={() => handleEdit(intg)} style={{ background: "none", border: "none", color: "var(--cyan)", cursor: "pointer", padding: "4px" }}>
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8" }}>
                  <Clock className="w-3.5 h-3.5" /> Frecuencia: <span style={{ color: "white" }}>{intg.config.syncFrequency}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8" }}>
                  {intg.config.paused ? (
                    <><Pause className="w-3.5 h-3.5" style={{ color: "var(--amber)" }} /> <span style={{ color: "var(--amber)" }}>Pausada</span></>
                  ) : (
                    <><Activity className="w-3.5 h-3.5" style={{ color: "var(--emerald)" }} /> <span style={{ color: "var(--emerald)" }}>Activa</span></>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", gridColumn: "1/-1" }}>
                  <Database className="w-3.5 h-3.5" /> Conexión: <span style={{ color: intg.connected ? "var(--emerald)" : "var(--red)" }}>
                    {intg.connected ? "Conectada" : "Fallo"}
                  </span>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {modalMode !== "closed" && (
        <AnalyticsIntegrationModal
          initial={editingData || undefined}
          onClose={() => setModalMode("closed")}
          onSave={() => {
            setModalMode("closed");
            fetchIntegrations();
          }}
        />
      )}
    </div>
  );
}
