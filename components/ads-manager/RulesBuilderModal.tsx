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
}

// Monetary metrics: the Automated Rules API expects values in cents
// (account minor units). CTR/frequency/counts are plain numbers.
const MONETARY_METRICS = new Set(["spent", "cpm", "cpc", "cost_per"]);

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
];

// Valid `time_preset` filter values in the Automated Rules API.
const TIME_WINDOWS = [
  { value: "TODAY", label: "Hoy" },
  { value: "LAST_3_DAYS", label: "Últimos 3 días" },
  { value: "LAST_7_DAYS", label: "Últimos 7 días" },
  { value: "LAST_14_DAYS", label: "Últimos 14 días" },
  { value: "LAST_28_DAYS", label: "Últimos 28 días" },
  { value: "LIFETIME", label: "Vigencia de la campaña" },
];

// Valid `execution_type` values (PAUSE_CAMPAIGN / SEND_NOTIFICATION no existen en la API).
const ACTIONS = [
  { value: "PAUSE", label: "Pausar" },
  { value: "UNPAUSE", label: "Activar" },
  { value: "CHANGE_BUDGET", label: "Ajustar presupuesto" },
  { value: "CHANGE_BID", label: "Ajustar puja" },
  { value: "NOTIFICATION", label: "Solo notificar" },
];

// Valid `schedule_type` values: DAILY, HOURLY, SEMI_HOURLY, CUSTOM.
const FREQUENCIES = [
  { value: "DAILY", label: "Diario" },
  { value: "HOURLY", label: "Cada hora" },
  { value: "SEMI_HOURLY", label: "Cada 30 min" },
];

export function RulesBuilderModal({ adAccountId, onClose, onCreated }: RulesBuilderModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Basics
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState<"CAMPAIGN" | "ADSET" | "AD">("CAMPAIGN");
  const [frequency, setFrequency] = useState("DAILY");

  // Step 2 — Conditions (the API supports ONE time window per rule)
  const [timeWindow, setTimeWindow] = useState("LAST_7_DAYS");
  const [conditions, setConditions] = useState<Condition[]>([
    { field: "spent", operator: "GREATER_THAN", value: "" },
  ]);

  // Step 3 — Action
  const [action, setAction] = useState("PAUSE_CAMPAIGN");
  const [budgetAdjustment, setBudgetAdjustment] = useState<string>("+10");

  // Step 4 — Review
  const [notifyEmail, setNotifyEmail] = useState(true);

  const addCondition = () => {
    setConditions([...conditions, { field: "cpc", operator: "GREATER_THAN", value: "" }]);
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
      // Official format: entity_type and time_preset are FILTERS (field/value/
      // operator triplets), and monetary metric values go in cents.
      const evaluation_spec = {
        evaluation_type: "SCHEDULE",
        filters: [
          { field: "entity_type", value: entityType, operator: "EQUAL" },
          { field: "time_preset", value: timeWindow, operator: "EQUAL" },
          ...conditions.map((c) => {
            const isMonetary = MONETARY_METRICS.has(c.field) || c.field.startsWith("cost_per_action_type");
            const num = parseFloat(c.value);
            return {
              field: c.field,
              operator: c.operator,
              value: Number.isFinite(num) ? (isMonetary ? Math.round(num * 100) : num) : c.value,
            };
          }),
        ],
      };

      // CHANGE_BUDGET uses change_spec: { amount (signed %), unit }.
      const adjustment = parseFloat(budgetAdjustment) || 10;
      const execution_spec = {
        execution_type: action,
        ...(action === "CHANGE_BUDGET" ? {
          execution_options: [{
            field: "change_spec",
            value: { amount: adjustment, unit: "PERCENTAGE" },
            operator: "EQUAL",
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
    border: "1px solid rgba(148,163,184,0.22)", borderRadius: "6px", color: "white", outline: "none",
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
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", padding: "12px 20px", gap: "4px" }}>
          {[1, 2, 3, 4].map((s) => (
            <div key={s} style={{ flex: 1, height: "3px", borderRadius: "2px", background: s <= step ? "var(--cyan)" : "rgba(148,163,184,0.18)" }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "16px 20px", minHeight: "280px", maxHeight: "400px", overflowY: "auto" }} className="custom-scrollbar">
          {step === 1 && (
            <>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, display: "block", marginBottom: "4px" }}>Nombre de la regla</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Pausar CPC alto" style={inputStyle} autoFocus />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, display: "block", marginBottom: "4px" }}>Aplicar a</label>
                <select value={entityType} onChange={(e) => setEntityType(e.target.value as any)} style={selectStyle}>
                  <option value="CAMPAIGN">Campañas</option>
                  <option value="ADSET">Conjuntos de anuncios</option>
                  <option value="AD">Anuncios</option>
                </select>
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, display: "block", marginBottom: "4px" }}>Frecuencia de evaluación</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value)} style={selectStyle}>
                  {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, display: "block", marginBottom: "4px" }}>Ventana de tiempo (aplica a todas las condiciones)</label>
                <select value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)} style={selectStyle}>
                  {TIME_WINDOWS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </div>
              {conditions.map((cond, idx) => (
                <div key={idx} style={{ display: "flex", gap: "6px", marginBottom: "10px", alignItems: "flex-end" }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ fontSize: "9px", color: "#64748b", display: "block", marginBottom: "2px" }}>Métrica</label>
                    <select value={cond.field} onChange={(e) => updateCondition(idx, "field", e.target.value)} style={{ ...selectStyle, fontSize: "11px" }}>
                      {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1.5 }}>
                    <label style={{ fontSize: "9px", color: "#64748b", display: "block", marginBottom: "2px" }}>Operador</label>
                    <select value={cond.operator} onChange={(e) => updateCondition(idx, "operator", e.target.value)} style={{ ...selectStyle, fontSize: "11px" }}>
                      {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "9px", color: "#64748b", display: "block", marginBottom: "2px" }}>Valor</label>
                    <input type="number" value={cond.value} onChange={(e) => updateCondition(idx, "value", e.target.value)} style={{ ...inputStyle, fontSize: "11px" }} placeholder="0" />
                  </div>
                  <button onClick={() => removeCondition(idx)} disabled={conditions.length <= 1} style={{ background: "none", border: "none", color: conditions.length > 1 ? "#ef4444" : "rgba(148,163,184,0.65)", cursor: "pointer", padding: "8px", flexShrink: 0 }}>
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
                <label style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, display: "block", marginBottom: "4px" }}>Acción a ejecutar</label>
                <select value={action} onChange={(e) => setAction(e.target.value)} style={selectStyle}>
                  {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              {action === "CHANGE_BUDGET" && (
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, display: "block", marginBottom: "4px" }}>Ajuste de presupuesto (%)</label>
                  <input value={budgetAdjustment} onChange={(e) => setBudgetAdjustment(e.target.value)} placeholder="+10 o -20" style={inputStyle} />
                  <span style={{ fontSize: "9px", color: "rgba(148,163,184,0.65)", marginTop: "4px", display: "block" }}>
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
                    </div>
                  ))}
                  <div style={{ paddingLeft: "12px", fontSize: "10px" }}>
                    Ventana: {TIME_WINDOWS.find((w) => w.value === timeWindow)?.label}
                  </div>
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
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "7px 14px", fontSize: "11px", fontWeight: 600, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "rgba(148,163,184,0.7)", cursor: "pointer" }}
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
