"use client";
import React, { useState } from "react";
import { X, Plus, Trash2, ChevronRight, ChevronLeft, Zap, AlertCircle } from "lucide-react";

interface RulesBuilderModalProps {
  adAccountId: string;
  onClose: () => void;
  onCreated: () => void;
}

interface Condition {
  field: string;
  operator: string;
  value: string;
  window: string;
}

const METRICS = [
  { value: "spent", label: "Gasto" },
  { value: "impressions", label: "Impresiones" },
  { value: "cpm", label: "CPM" },
  { value: "cpc", label: "CPC" },
  { value: "ctr", label: "CTR" },
  { value: "reach", label: "Alcance" },
  { value: "frequency", label: "Frecuencia" },
  { value: "cost_per", label: "Costo por resultado" },
  { value: "result_rate", label: "Tasa de resultados" },
  { value: "cost_per_action_type:lead", label: "Costo por Lead" },
  { value: "cost_per_action_type:purchase", label: "Costo por compra" },
];

const OPERATORS = [
  { value: "GREATER_THAN", label: "Mayor que" },
  { value: "LESS_THAN", label: "Menor que" },
  { value: "EQUAL", label: "Igual a" },
  { value: "IN_RANGE", label: "En rango" },
  { value: "NOT_IN_RANGE", label: "Fuera de rango" },
];

const TIME_WINDOWS = [
  { value: "1", label: "Hoy" },
  { value: "3", label: "Últimos 3 días" },
  { value: "7", label: "Últimos 7 días" },
  { value: "14", label: "Últimos 14 días" },
  { value: "28", label: "Últimos 28 días" },
  { value: "lifetime", label: "Vigencia de la campaña" },
];

const ACTIONS = [
  { value: "PAUSE_CAMPAIGN", label: "Pausar campaña" },
  { value: "UNPAUSE_CAMPAIGN", label: "Activar campaña" },
  { value: "CHANGE_BUDGET", label: "Ajustar presupuesto" },
  { value: "CHANGE_BID", label: "Ajustar puja" },
  { value: "SEND_NOTIFICATION", label: "Solo notificar" },
];

const FREQUENCIES = [
  { value: "DAILY", label: "Diario" },
  { value: "SEMI_DAILY", label: "Cada 12h" },
  { value: "HOURLY", label: "Cada hora" },
  { value: "WEEKLY", label: "Semanal" },
];

export function RulesBuilderModal({ adAccountId, onClose, onCreated }: RulesBuilderModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Basics
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState<"CAMPAIGN" | "ADSET" | "AD">("CAMPAIGN");
  const [frequency, setFrequency] = useState("DAILY");

  // Step 2 — Conditions
  const [conditions, setConditions] = useState<Condition[]>([
    { field: "spent", operator: "GREATER_THAN", value: "", window: "7" },
  ]);

  // Step 3 — Action
  const [action, setAction] = useState("PAUSE_CAMPAIGN");
  const [budgetAdjustment, setBudgetAdjustment] = useState<string>("+10");

  // Step 4 — Review
  const [notifyEmail, setNotifyEmail] = useState(true);

  const addCondition = () => {
    setConditions([...conditions, { field: "cpc", operator: "GREATER_THAN", value: "", window: "7" }]);
  };

  const removeCondition = (idx: number) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const updateCondition = (idx: number, key: keyof Condition, val: string) => {
    const next = [...conditions];
    next[idx] = { ...next[idx], [key]: val };
    setConditions(next);
  };

  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    if (conditions.some((c) => !c.value)) { setError("Todas las condiciones deben tener un valor"); return; }

    setLoading(true);
    try {
      const evaluation_spec = {
        evaluation_type: "SCHEDULE",
        filters: conditions.map((c) => ({
          field: c.field,
          operator: c.operator,
          value: parseFloat(c.value) || c.value,
          ...(c.window !== "lifetime" ? { time_preset: `LAST_${c.window}_DAYS` } : {}),
        })),
      };

      const execution_spec = {
        execution_type: action,
        ...(action === "CHANGE_BUDGET" ? {
          execution_options: [{
            field: "daily_budget",
            operator: budgetAdjustment.startsWith("+") ? "INCREASE_BY" : "DECREASE_BY",
            value: Math.abs(parseFloat(budgetAdjustment) || 10),
          }],
        } : {}),
      };

      const schedule_spec = {
        schedule_type: frequency,
      };

      const res = await fetch("/api/meta/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adAccountId,
          name,
          entity_type: entityType,
          evaluation_spec,
          execution_spec,
          schedule_spec,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onCreated();
        onClose();
      } else {
        setError(data.error || "Error al crear la regla");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", fontSize: "12px", background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(148,163,184,0.15)", borderRadius: "6px", color: "white", outline: "none",
  };

  const selectStyle: React.CSSProperties = { ...inputStyle, appearance: "none" as const, paddingRight: "28px" };

  const stepTitles = ["Configuración", "Condiciones", "Acción", "Revisar"];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 101,
        width: "560px", maxWidth: "90vw", background: "rgba(8,14,28,0.98)", backdropFilter: "blur(16px)",
        border: "1px solid rgba(0,212,255,0.15)", borderRadius: "12px", overflow: "hidden",
        boxShadow: "0 20px 60px -12px rgba(0,0,0,0.7)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 700, color: "white" }}>
            <Zap className="w-4 h-4" style={{ color: "var(--cyan)" }} />
            Nueva regla automática — {stepTitles[step - 1]}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(148,163,184,0.5)", cursor: "pointer" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", padding: "12px 20px", gap: "4px" }}>
          {[1, 2, 3, 4].map((s) => (
            <div key={s} style={{ flex: 1, height: "3px", borderRadius: "2px", background: s <= step ? "var(--cyan)" : "rgba(148,163,184,0.1)" }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "16px 20px", minHeight: "280px", maxHeight: "400px", overflowY: "auto" }} className="custom-scrollbar">
          {step === 1 && (
            <>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "10px", color: "rgba(148,163,184,0.5)", fontWeight: 600, display: "block", marginBottom: "4px" }}>Nombre de la regla</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Pausar CPC alto" style={inputStyle} autoFocus />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "10px", color: "rgba(148,163,184,0.5)", fontWeight: 600, display: "block", marginBottom: "4px" }}>Aplicar a</label>
                <select value={entityType} onChange={(e) => setEntityType(e.target.value as any)} style={selectStyle}>
                  <option value="CAMPAIGN">Campañas</option>
                  <option value="ADSET">Conjuntos de anuncios</option>
                  <option value="AD">Anuncios</option>
                </select>
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "10px", color: "rgba(148,163,184,0.5)", fontWeight: 600, display: "block", marginBottom: "4px" }}>Frecuencia de evaluación</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value)} style={selectStyle}>
                  {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {conditions.map((cond, idx) => (
                <div key={idx} style={{ display: "flex", gap: "6px", marginBottom: "10px", alignItems: "flex-end" }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ fontSize: "9px", color: "rgba(148,163,184,0.4)", display: "block", marginBottom: "2px" }}>Métrica</label>
                    <select value={cond.field} onChange={(e) => updateCondition(idx, "field", e.target.value)} style={{ ...selectStyle, fontSize: "11px" }}>
                      {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1.5 }}>
                    <label style={{ fontSize: "9px", color: "rgba(148,163,184,0.4)", display: "block", marginBottom: "2px" }}>Operador</label>
                    <select value={cond.operator} onChange={(e) => updateCondition(idx, "operator", e.target.value)} style={{ ...selectStyle, fontSize: "11px" }}>
                      {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "9px", color: "rgba(148,163,184,0.4)", display: "block", marginBottom: "2px" }}>Valor</label>
                    <input type="number" value={cond.value} onChange={(e) => updateCondition(idx, "value", e.target.value)} style={{ ...inputStyle, fontSize: "11px" }} placeholder="0" />
                  </div>
                  <div style={{ flex: 1.5 }}>
                    <label style={{ fontSize: "9px", color: "rgba(148,163,184,0.4)", display: "block", marginBottom: "2px" }}>Ventana</label>
                    <select value={cond.window} onChange={(e) => updateCondition(idx, "window", e.target.value)} style={{ ...selectStyle, fontSize: "11px" }}>
                      {TIME_WINDOWS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                    </select>
                  </div>
                  <button onClick={() => removeCondition(idx)} disabled={conditions.length <= 1} style={{ background: "none", border: "none", color: conditions.length > 1 ? "#ef4444" : "rgba(148,163,184,0.2)", cursor: "pointer", padding: "8px", flexShrink: 0 }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button onClick={addCondition} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600, color: "var(--cyan)", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
                <Plus className="w-3.5 h-3.5" /> Agregar condición (AND)
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "10px", color: "rgba(148,163,184,0.5)", fontWeight: 600, display: "block", marginBottom: "4px" }}>Acción a ejecutar</label>
                <select value={action} onChange={(e) => setAction(e.target.value)} style={selectStyle}>
                  {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              {action === "CHANGE_BUDGET" && (
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "10px", color: "rgba(148,163,184,0.5)", fontWeight: 600, display: "block", marginBottom: "4px" }}>Ajuste de presupuesto (%)</label>
                  <input value={budgetAdjustment} onChange={(e) => setBudgetAdjustment(e.target.value)} placeholder="+10 o -20" style={inputStyle} />
                  <span style={{ fontSize: "9px", color: "rgba(148,163,184,0.3)", marginTop: "4px", display: "block" }}>
                    Usa + para aumentar, - para reducir. Ejemplo: +15 = +15%
                  </span>
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div style={{ background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.08)", borderRadius: "8px", padding: "14px" }}>
                <div style={{ fontSize: "11px", color: "white", fontWeight: 700, marginBottom: "10px" }}>Resumen de la regla</div>
                <div style={{ fontSize: "11px", color: "rgba(148,163,184,0.7)", lineHeight: "1.8" }}>
                  <div><strong style={{ color: "white" }}>Nombre:</strong> {name || "—"}</div>
                  <div><strong style={{ color: "white" }}>Aplica a:</strong> {entityType === "CAMPAIGN" ? "Campañas" : entityType === "ADSET" ? "Conjuntos" : "Anuncios"}</div>
                  <div><strong style={{ color: "white" }}>Frecuencia:</strong> {FREQUENCIES.find((f) => f.value === frequency)?.label}</div>
                  <div><strong style={{ color: "white" }}>Condiciones:</strong></div>
                  {conditions.map((c, i) => (
                    <div key={i} style={{ paddingLeft: "12px", fontSize: "10px" }}>
                      {i > 0 && <span style={{ color: "var(--cyan)", fontWeight: 600 }}>AND </span>}
                      {METRICS.find((m) => m.value === c.field)?.label} {OPERATORS.find((o) => o.value === c.operator)?.label} {c.value}
                      {c.window !== "lifetime" && ` (últimos ${c.window} días)`}
                    </div>
                  ))}
                  <div><strong style={{ color: "white" }}>Acción:</strong> {ACTIONS.find((a) => a.value === action)?.label}</div>
                  {action === "CHANGE_BUDGET" && <div style={{ paddingLeft: "12px", fontSize: "10px" }}>Ajuste: {budgetAdjustment}%</div>}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 20px 10px", fontSize: "11px", color: "#ef4444" }}>
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", gap: "8px", padding: "12px 20px", borderTop: "1px solid var(--border)", justifyContent: "space-between" }}>
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "7px 14px", fontSize: "11px", fontWeight: 600, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "rgba(148,163,184,0.7)", cursor: "pointer" }}
          >
            <ChevronLeft className="w-3 h-3" /> {step > 1 ? "Atrás" : "Cancelar"}
          </button>
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              style={{ display: "flex", alignItems: "center", gap: "4px", padding: "7px 14px", fontSize: "11px", fontWeight: 600, background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)", borderRadius: "6px", color: "var(--cyan)", cursor: "pointer" }}
            >
              Siguiente <ChevronRight className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={loading}
              style={{ padding: "7px 14px", fontSize: "11px", fontWeight: 600, background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)", borderRadius: "6px", color: "var(--cyan)", cursor: "pointer", opacity: loading ? 0.5 : 1 }}
            >
              {loading ? "Creando..." : "Crear regla"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
