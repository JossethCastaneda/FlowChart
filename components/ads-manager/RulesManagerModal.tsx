"use client";
import React, { useState, useEffect } from "react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
import { X, Zap, Trash2, Pencil, Copy, ToggleLeft, ToggleRight, RefreshCw, AlertCircle, Loader2 } from "lucide-react";

interface RulesManagerModalProps {
  adAccountId: string;
  onClose: () => void;
}

interface Rule {
  id: string;
  name: string;
  status: string;
  entity_type?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  evaluation_spec?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  execution_spec?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  schedule_spec?: any;
}

export function RulesManagerModal({ adAccountId, onClose }: RulesManagerModalProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meta/rules?adAccountId=${adAccountId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRules(data.data || []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- TODO: Limpieza de deuda técnica
  useEffect(() => { fetchRules(); }, [adAccountId]);

  const toggleRuleStatus = async (rule: Rule) => {
    setActionLoading(rule.id);
    const newStatus = rule.status === "ENABLED" ? "DISABLED" : "ENABLED";
    try {
      await fetch(`/api/meta/rules/${rule.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, confirmed_by_user: true }),
      });
      setRules(rules.map((r) => r.id === rule.id ? { ...r, status: newStatus } : r));
    } catch {} finally {
      setActionLoading(null);
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm("¿Eliminar esta regla?")) return;
    setActionLoading(ruleId);
    try {
      await fetch(`/api/meta/rules/${ruleId}?confirmed_by_user=true`, { method: "DELETE" });
      setRules(rules.filter((r) => r.id !== ruleId));
    } catch {} finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "var(--panel-bg)",  }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 101,
        width: "600px", maxWidth: "90vw", background: "var(--fc-surface)", 
        border: "1px solid rgba(59,130,246,0.15)", borderRadius: "12px", overflow: "hidden",
        boxShadow: "0 20px 60px -12px rgba(0,0,0,0.7)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--fc-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 700, color: "var(--fc-text)" }}>
            <Zap className="w-4 h-4" style={{ color: "var(--fc-accent)" }} />
            Administrar reglas automáticas
            {rules.length > 0 && (
              <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 6px", borderRadius: "8px", background: "var(--fc-accent-wash)", color: "var(--fc-accent)" }}>
                {rules.length}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            <button onClick={fetchRules} style={{ background: "none", border: "none", color: "var(--fc-text-muted)", cursor: "pointer" }}>
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--fc-text-muted)", cursor: "pointer" }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "8px 0", maxHeight: "400px", overflowY: "auto" }} className="custom-scrollbar">
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--fc-accent)" }} />
            </div>
          ) : error ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "20px", fontSize: "11px", color: "var(--fc-danger)" }}>
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          ) : rules.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <Zap className="w-8 h-8" style={{ color: "var(--fc-text-secondary)", margin: "0 auto 12px" }} />
              <div style={{ fontSize: "12px", color: "var(--fc-text-muted)" }}>No hay reglas automáticas</div>
              <div style={{ fontSize: "10px", color: "var(--fc-text-muted)", marginTop: "4px" }}>Crea una regla desde el menú "Más"</div>
            </div>
          ) : (
            rules.map((rule) => {
              const isEnabled = rule.status === "ENABLED";
              const execType = rule.execution_spec?.execution_type || "—";
              const entityLabel = rule.entity_type === "CAMPAIGN" ? "Campañas" : rule.entity_type === "ADSET" ? "Conjuntos" : "Anuncios";
              return (
                <div key={rule.id} style={{
                  display: "flex", alignItems: "center", gap: "10px", padding: "10px 20px",
                  border: "1px solid var(--hairline)",
                  opacity: actionLoading === rule.id ? 0.5 : 1,
                }}>
                  {/* Toggle */}
                  <button onClick={() => toggleRuleStatus(rule)} style={{ background: "none", border: "none", cursor: "pointer", color: isEnabled ? "var(--fc-success)" : "rgba(148,163,184,0.65)", flexShrink: 0 }}>
                    {isEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", color: "var(--fc-text)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {rule.name}
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--fc-text-muted)", marginTop: "2px" }}>
                      {entityLabel} · {execType.replace(/_/g, " ").toLowerCase()} · {isEnabled ? "Activa" : "Pausada"}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button onClick={() => deleteRule(rule.id)} style={{ background: "none", border: "none", color: "rgba(229,72,77,0.5)", cursor: "pointer", padding: "4px" }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--fc-border)", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 14px", fontSize: "11px", fontWeight: 600, background: "var(--surface-hover)", border: "1px solid var(--hairline)", borderRadius: "6px", color: "var(--fc-text-secondary)", cursor: "pointer" }}>
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
}
