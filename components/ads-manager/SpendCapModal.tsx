"use client";
import React, { useState } from "react";
import { X, DollarSign, ToggleLeft, ToggleRight } from "lucide-react";

interface SpendCapModalProps {
  items: { id: string; name: string; spend_cap?: string }[];
  onClose: () => void;
  onApply: (updates: { id: string; spend_cap: number }[]) => Promise<void>;
}

export function SpendCapModal({ items, onClose, onApply }: SpendCapModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [noLimit, setNoLimit] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    const capValue = noLimit ? 0 : Math.round((parseFloat(amount) || 0) * 100);
    const updates = items.map((i) => ({ id: i.id, spend_cap: capValue }));
    setLoading(true);
    await onApply(updates);
    setLoading(false);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 101,
        width: "420px", maxWidth: "90vw", background: "rgba(8,14,28,0.98)", backdropFilter: "blur(16px)",
        border: "1px solid rgba(0,212,255,0.15)", borderRadius: "12px", overflow: "hidden",
        boxShadow: "0 20px 60px -12px rgba(0,0,0,0.7)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "white" }}>
            Límite de gasto de campaña
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: "1.5", marginBottom: "16px", padding: "10px 12px", background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.08)", borderRadius: "6px" }}>
            El límite de gasto es el máximo que esta campaña puede gastar en total, independientemente del presupuesto diario. Una vez alcanzado, la campaña se pausa automáticamente.
          </div>

          {/* No limit toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", cursor: "pointer" }}>
            <button
              onClick={() => setNoLimit(!noLimit)}
              style={{ background: "none", border: "none", cursor: "pointer", color: noLimit ? "#34d399" : "#64748b" }}
            >
              {noLimit ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
            </button>
            <span style={{ fontSize: "11px", color: noLimit ? "#34d399" : "#94a3b8", fontWeight: 600 }}>
              {noLimit ? "Sin límite de gasto" : "Con límite de gasto"}
            </span>
          </label>

          {/* Amount input */}
          {!noLimit && (
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                Límite máximo de gasto
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: "13px" }}>$</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: "100%", padding: "10px 12px 10px 24px", fontSize: "14px", background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(148,163,184,0.22)", borderRadius: "6px", color: "white", outline: "none",
                  }}
                />
              </div>
            </div>
          )}

          {/* Items list */}
          <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, marginBottom: "6px" }}>
            Aplica a {items.length} campaña{items.length > 1 ? "s" : ""}:
          </div>
          <div style={{ maxHeight: "120px", overflowY: "auto" }} className="custom-scrollbar">
            {items.map((item) => {
              const currentCap = item.spend_cap ? parseFloat(item.spend_cap) / 100 : 0;
              return (
                <div key={item.id} style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", padding: "4px 0", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{item.name}</span>
                  <span style={{ color: "rgba(148,163,184,0.65)", flexShrink: 0, marginLeft: "8px" }}>
                    actual: {currentCap > 0 ? `$${currentCap.toFixed(2)}` : "sin límite"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", padding: "12px 20px", borderTop: "1px solid var(--border)", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 14px", fontSize: "11px", fontWeight: 600, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "rgba(148,163,184,0.7)", cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={handleApply} disabled={loading || (!noLimit && !amount)} style={{
            padding: "7px 14px", fontSize: "11px", fontWeight: 600, borderRadius: "6px",
            cursor: (!noLimit && !amount) ? "not-allowed" : "pointer",
            background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)", color: "var(--cyan)",
            opacity: loading ? 0.5 : 1,
          }}>
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </>
  );
}
