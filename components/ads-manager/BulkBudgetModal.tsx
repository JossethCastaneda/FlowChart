/* eslint-disable @typescript-eslint/no-unused-expressions */
﻿"use client";
import React, { useState, useMemo } from "react";
import { X, DollarSign, Percent } from "lucide-react";

interface BulkBudgetModalProps {
  items: { id: string; name: string; daily_budget?: string; lifetime_budget?: string }[];
  onClose: () => void;
  onApply: (updates: { id: string; budget: number; type: "daily" | "lifetime" }[]) => Promise<void>;
}

export function BulkBudgetModal({ items, onClose, onApply }: BulkBudgetModalProps) {
  const [budgetType, setBudgetType] = useState<"daily" | "lifetime">("daily");
  const [mode, setMode] = useState<"absolute" | "percentage">("absolute");
  const [amount, setAmount] = useState<string>("");
  const [percentChange, setPercentChange] = useState<string>("");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const activeItems = items.filter((i) => !excluded.has(i.id));

  const preview = useMemo(() => {
    return items.map((item) => {
      const currentBudget = budgetType === "daily"
        ? parseFloat(item.daily_budget || "0") / 100
        : parseFloat(item.lifetime_budget || "0") / 100;
      let newBudget = currentBudget;
      if (mode === "absolute" && amount) {
        newBudget = parseFloat(amount) || 0;
      } else if (mode === "percentage" && percentChange) {
        const pct = parseFloat(percentChange) || 0;
        newBudget = currentBudget * (1 + pct / 100);
      }
      newBudget = Math.max(1, Math.round(newBudget * 100) / 100);
      return { id: item.id, name: item.name, current: currentBudget, next: newBudget, excluded: excluded.has(item.id) };
    });
  }, [items, mode, amount, percentChange, budgetType, excluded]);

  const handleApply = async () => {
    const updates = preview
      .filter((p) => !p.excluded && p.next !== p.current)
      .map((p) => ({ id: p.id, budget: p.next, type: budgetType }));
    if (updates.length === 0) return;
    setLoading(true);
    await onApply(updates);
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", fontSize: "13px", background: "var(--surface-hover)",
    border: "1px solid var(--fc-border)", borderRadius: "6px", color: "var(--fc-text)", outline: "none",
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "var(--panel-bg)",  }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 101,
        width: "480px", maxWidth: "90vw", background: "var(--fc-surface)", 
        border: "1px solid rgba(59,130,246,0.15)", borderRadius: "12px", overflow: "hidden",
        boxShadow: "0 20px 60px -12px rgba(0,0,0,0.7)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--fc-border)" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--fc-text)" }}>
            <DollarSign className="w-4 h-4 inline-block mr-1" style={{ color: "var(--fc-accent)" }} />
            Editar presupuesto — {activeItems.length} elemento{activeItems.length > 1 ? "s" : ""}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--fc-text-muted)", cursor: "pointer" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div style={{ padding: "16px 20px" }}>
          {/* Budget type */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "10px", color: "var(--fc-text-muted)", fontWeight: 600, display: "block", marginBottom: "6px" }}>Tipo de presupuesto</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["daily", "lifetime"] as const).map((t) => (
                <button key={t} onClick={() => setBudgetType(t)} style={{
                  flex: 1, padding: "8px", fontSize: "11px", fontWeight: 600, borderRadius: "6px", cursor: "pointer",
                  background: budgetType === t ? "rgba(59,130,246,0.1)" : "var(--surface-hover)",
                  border: `1px solid ${budgetType === t ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.06)"}`,
                  color: budgetType === t ? "var(--fc-accent)" : "var(--fc-text-muted)",
                }}>
                  {t === "daily" ? "? Diario" : "? Total de campaña"}
                </button>
              ))}
            </div>
          </div>

          {/* Mode toggle */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            <button onClick={() => setMode("absolute")} style={{
              display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", fontSize: "10px", fontWeight: 600, borderRadius: "5px", cursor: "pointer",
              background: mode === "absolute" ? "rgba(59,130,246,0.1)" : "transparent",
              border: `1px solid ${mode === "absolute" ? "rgba(59,130,246,0.2)" : "transparent"}`,
              color: mode === "absolute" ? "var(--fc-accent)" : "var(--fc-text-muted)",
            }}>
              <DollarSign className="w-3 h-3" /> Monto fijo
            </button>
            <button onClick={() => setMode("percentage")} style={{
              display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", fontSize: "10px", fontWeight: 600, borderRadius: "5px", cursor: "pointer",
              background: mode === "percentage" ? "rgba(59,130,246,0.1)" : "transparent",
              border: `1px solid ${mode === "percentage" ? "rgba(59,130,246,0.2)" : "transparent"}`,
              color: mode === "percentage" ? "var(--fc-accent)" : "var(--fc-text-muted)",
            }}>
              <Percent className="w-3 h-3" /> Cambio porcentual
            </button>
          </div>

          {/* Input */}
          {mode === "absolute" ? (
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "10px", color: "var(--fc-text-muted)", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                Nuevo presupuesto {budgetType === "daily" ? "diario" : "total"}
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--fc-text-muted)", fontSize: "13px" }}>$</span>
                <input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ ...inputStyle, paddingLeft: "24px" }} />
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "10px", color: "var(--fc-text-muted)", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                Cambio porcentual (+ para aumentar, - para reducir)
              </label>
              <div style={{ position: "relative" }}>
                <input type="number" value={percentChange} onChange={(e) => setPercentChange(e.target.value)} placeholder="+10 o -20" style={{ ...inputStyle, paddingRight: "24px" }} />
                <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--fc-text-muted)", fontSize: "13px" }}>%</span>
              </div>
            </div>
          )}

          {/* Preview table */}
          <div style={{ fontSize: "10px", color: "var(--fc-text-muted)", fontWeight: 600, marginBottom: "6px" }}>Aplica a:</div>
          <div style={{ maxHeight: "180px", overflowY: "auto", borderRadius: "6px", border: "1px solid var(--hairline)" }} className="custom-scrollbar">
            {preview.map((p) => (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px",
                border: "1px solid var(--hairline)", opacity: p.excluded ? 0.3 : 1,
              }}>
                <input
                  type="checkbox"
                  checked={!p.excluded}
                  onChange={() => {
                    const next = new Set(excluded);
                    p.excluded ? next.delete(p.id) : next.add(p.id);
                    setExcluded(next);
                  }}
                />
                <span style={{ fontSize: "10px", color: "var(--fc-text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                <span style={{ fontSize: "10px", color: "var(--fc-text-muted)" }}>${p.current.toFixed(2)}</span>
                <span style={{ fontSize: "10px", color: "var(--fc-text-muted)" }}>?</span>
                <span style={{ fontSize: "10px", color: p.next > p.current ? "var(--fc-success)" : p.next < p.current ? "var(--fc-danger)" : "white", fontWeight: 600 }}>
                  ${p.next.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: "9px", color: "var(--fc-text-muted)", marginTop: "8px", fontStyle: "italic" }}>
            Los presupuestos se envían a Meta en centavos. Mínimo: $1.00/día.
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", padding: "12px 20px", borderTop: "1px solid var(--fc-border)", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 14px", fontSize: "11px", fontWeight: 600, background: "var(--surface-hover)", border: "1px solid var(--hairline)", borderRadius: "6px", color: "var(--fc-text-secondary)", cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={handleApply} disabled={loading} style={{
            padding: "7px 14px", fontSize: "11px", fontWeight: 600, borderRadius: "6px", cursor: "pointer",
            background: "var(--fc-accent-wash)", border: "1px solid rgba(59,130,246,0.25)", color: "var(--fc-accent)", opacity: loading ? 0.5 : 1,
          }}>
            {loading ? "Guardando..." : "Guardar presupuesto"}
          </button>
        </div>
      </div>
    </>
  );
}
