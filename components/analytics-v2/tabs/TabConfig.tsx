"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, RefreshCw, Save, CheckCircle, Database, Lock, Settings } from "lucide-react";
import { useAnalyticsScope } from "../AnalyticsScopeContext";

interface KpiTargetRow {
  kpiKey: string;
  name: string;
  description?: string;
  unit?: string;
  targetValue: number | null;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  enabled: boolean;
  overridden: boolean;
}

export function TabConfig({ base, projectId, clientId }: { base: string; projectId?: string; clientId?: string | null }) {
  const scope = useAnalyticsScope();
  const [syncing, setSyncing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [targets, setTargets] = useState<KpiTargetRow[]>([]);
  const [edits, setEdits] = useState<Record<string, { targetValue?: string; warningThreshold?: string }>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const numOr = (v: string | undefined, fallback: number | null): number | null => {
    if (v === undefined || v.trim() === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const saveTarget = async (current: { kpiKey: string; name: string; targetValue: number | null; warningThreshold: number | null; criticalThreshold: number | null; enabled: boolean }) => {
    setSavingKey(current.kpiKey);
    setSuccessMsg("");
    try {
      const e = edits[current.kpiKey] || {};
      const body = {
        kpiKey: current.kpiKey,
        projectId: projectId || undefined,
        targetValue: numOr(e.targetValue, current.targetValue),
        warningThreshold: numOr(e.warningThreshold, current.warningThreshold),
        criticalThreshold: current.criticalThreshold ?? null,
        enabled: current.enabled ?? true,
      };
      // Escritura al endpoint global con projectId explícito (override de proyecto).
      const res = await fetch(`/api/analytics/kpi-targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSuccessMsg(`Meta de "${current.name}" guardada.`);
        setEdits((p) => { const n = { ...p }; delete n[current.kpiKey]; return n; });
        fetchTargets();
      } else {
        const err = await res.json().catch(() => ({}));
        alert("Error al guardar meta: " + (err.error || "Desconocido"));
      }
    } catch {
      alert("Fallo al contactar al servidor");
    } finally {
      setSavingKey(null);
    }
  };

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

  useEffect(() => {
    fetchTargets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  const handleManualSync = async () => {
    if (!projectId) {
      alert("La sincronización manual requiere un proyecto.");
      return;
    }
    setSyncing(true);
    setSuccessMsg("");
    try {
      // Ruta de proyecto YA con scope (verifica ownership, valida proveedor/canal,
      // crea SyncJob trazable y estampa projectId en las filas de la ventana).
      // `base` = /api/projects/[id]/analytics → POST ${base}/sync.
      const res = await fetch(`${base}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const json = await res.json().catch(() => null);
        const inserted = json?.data?.jobs?.reduce((s: number, j: { recordsInserted?: number }) => s + (j.recordsInserted || 0), 0) ?? null;
        setSuccessMsg(inserted != null ? `Sincronización completada (${inserted} registros).` : "Sincronización iniciada con éxito");
      } else {
        const err = await res.json().catch(() => ({}));
        alert("Error de sincronización: " + (err.error || "Desconocido"));
      }
    } catch {
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
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
            {targets.length === 0 && <p style={{ color: "#64748b", fontSize: "12px" }}>Cargando metas...</p>}
            {targets.map((t) => {
              const e = edits[t.kpiKey] || {};
              const unit = t.unit === "percent" ? "%" : "";
              const curTarget = t.targetValue != null ? String(t.targetValue) : "";
              const curWarn = t.warningThreshold != null ? String(t.warningThreshold) : "";
              const dirty = (e.targetValue !== undefined && e.targetValue !== curTarget) || (e.warningThreshold !== undefined && e.warningThreshold !== curWarn);
              const inputStyle: React.CSSProperties = { width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 12, borderRadius: 6, padding: "4px 8px", outline: "none" };
              return (
                <div key={t.kpiKey} style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "white" }} title={t.description || ""}>{t.name}</span>
                    <span style={{ fontSize: "11px", color: t.overridden ? "#00d4ff" : "#64748b" }}>{t.overridden ? "Override proyecto" : "Global"}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "10px", alignItems: "end" }}>
                    <label>
                      <span style={{ fontSize: "10px", color: "#4ade80", display: "block", marginBottom: 4 }}>Meta (Verde){unit ? ` ${unit}` : ""}</span>
                      <input type="number" step="any" style={inputStyle}
                        value={e.targetValue ?? curTarget}
                        onChange={(ev) => setEdits((p) => ({ ...p, [t.kpiKey]: { ...p[t.kpiKey], targetValue: ev.target.value } }))} />
                    </label>
                    <label>
                      <span style={{ fontSize: "10px", color: "#f87171", display: "block", marginBottom: 4 }}>Advertencia (Rojo){unit ? ` ${unit}` : ""}</span>
                      <input type="number" step="any" style={inputStyle}
                        value={e.warningThreshold ?? curWarn}
                        onChange={(ev) => setEdits((p) => ({ ...p, [t.kpiKey]: { ...p[t.kpiKey], warningThreshold: ev.target.value } }))} />
                    </label>
                    <button
                      onClick={() => saveTarget(t)}
                      disabled={!dirty || savingKey === t.kpiKey}
                      style={{ background: dirty ? "var(--cyan)" : "rgba(255,255,255,0.05)", color: dirty ? "#0f172a" : "#64748b", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: dirty ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>
                      {savingKey === t.kpiKey ? "…" : "Guardar"}
                    </button>
                  </div>
                </div>
              );
            })}
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
