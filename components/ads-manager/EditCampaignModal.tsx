"use client";
import React, { useState, useEffect, useRef } from "react";
import { X, Save, Loader2, AlertCircle, TrendingUp } from "lucide-react";
import { useMetaUpdate } from "@/hooks/useMetaUpdate";

interface EditCampaignModalProps {
  campaign: any;
  onClose: () => void;
  onSaved: () => void;
}

const BID_STRATEGIES = [
  { value: "LOWEST_COST_WITHOUT_CAP", label: "Costo más bajo (sin límite)" },
  { value: "LOWEST_COST_WITH_BID_CAP", label: "Costo más bajo (con límite de puja)" },
  { value: "COST_CAP", label: "Límite de costo" },
  { value: "LOWEST_COST_WITH_MIN_ROAS", label: "ROAS mínimo" },
];

const SPECIAL_CATEGORIES = [
  { value: "", label: "Ninguna" },
  { value: "EMPLOYMENT", label: "Empleo" },
  { value: "HOUSING", label: "Vivienda" },
  { value: "CREDIT", label: "Crédito" },
  { value: "ISSUES_ELECTIONS_POLITICS", label: "Política / Elecciones" },
];

export function EditCampaignModal({ campaign, onClose, onSaved }: EditCampaignModalProps) {
  const { updateCampaign, loading } = useMetaUpdate();
  const [localError, setLocalError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Form state — pre-fill from campaign data
  const [name, setName] = useState(campaign.name || "");
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED">(campaign.status === "ACTIVE" ? "ACTIVE" : "PAUSED");
  const hasDailyBudget = campaign.daily_budget !== undefined;
  const hasLifetimeBudget = campaign.lifetime_budget !== undefined;
  const [budgetType, setBudgetType] = useState<"daily" | "lifetime">(hasDailyBudget ? "daily" : "lifetime");
  const [budget, setBudget] = useState<number>(
    hasDailyBudget
      ? (parseFloat(campaign.daily_budget || "0") / 100)
      : (parseFloat(campaign.lifetime_budget || "0") / 100)
  );
  const [bidStrategy, setBidStrategy] = useState(campaign.bid_strategy || "LOWEST_COST_WITHOUT_CAP");
  const [specialCategory, setSpecialCategory] = useState(
    (campaign.special_ad_categories || [])[0] || ""
  );

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    setLocalError(null);
    if (!name.trim()) { setLocalError("El nombre es obligatorio"); return; }
    if (budget <= 0) { setLocalError("El presupuesto debe ser mayor a 0"); return; }

    const fields: any = { name };
    if (status !== campaign.status) fields.status = status;
    if (budgetType === "daily") fields.daily_budget = budget;
    else fields.lifetime_budget = budget;
    fields.bid_strategy = bidStrategy;
    fields.special_ad_categories = specialCategory ? [specialCategory] : [];

    const result = await updateCampaign(campaign.id, fields);
    if (result.success) {
      setSaved(true);
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } else {
      setLocalError(result.error || "Error desconocido");
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div
        style={{
          background: "rgba(10,15,30,0.98)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          width: "100%", maxWidth: 520,
          boxShadow: "0 24px 64px -12px rgba(0,0,0,0.8)",
          display: "flex", flexDirection: "column",
          animation: "fadeInScale 0.2s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 20px", borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: "rgba(0,129,251,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>Editar Campaña</div>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.6)" }}>ID: {campaign.id}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(148,163,184,0.6)", padding: 4, borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div
          className="custom-scrollbar"
          style={{ padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}
        >
          {/* Name */}
          <FormGroup label="Nombre de campaña">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la campaña"
              style={inputStyle}
            />
          </FormGroup>

          {/* Status */}
          <FormGroup label="Estado">
            <div style={{ display: "flex", gap: 8 }}>
              {(["ACTIVE", "PAUSED"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  style={{
                    ...toggleStyle,
                    background: status === s
                      ? s === "ACTIVE" ? "rgba(6,214,160,0.15)" : "rgba(255,190,11,0.1)"
                      : "rgba(255,255,255,0.04)",
                    borderColor: status === s
                      ? s === "ACTIVE" ? "var(--emerald)" : "var(--amber)"
                      : "var(--border)",
                    color: status === s
                      ? s === "ACTIVE" ? "var(--emerald)" : "var(--amber)"
                      : "rgba(148,163,184,0.6)",
                  }}
                >
                  {s === "ACTIVE" ? "● Activa" : "◌ Pausada"}
                </button>
              ))}
            </div>
          </FormGroup>

          {/* Budget */}
          {(hasDailyBudget || hasLifetimeBudget) && (
            <FormGroup label="Presupuesto (CBO)">
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {(["daily", "lifetime"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setBudgetType(t)}
                    style={{
                      ...toggleStyle,
                      background: budgetType === t ? "rgba(0,129,251,0.15)" : "rgba(255,255,255,0.04)",
                      borderColor: budgetType === t ? "var(--cyan)" : "var(--border)",
                      color: budgetType === t ? "var(--cyan)" : "rgba(148,163,184,0.6)",
                    }}
                  >
                    {t === "daily" ? "Diario" : "Total"}
                  </button>
                ))}
              </div>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(148,163,184,0.6)", fontSize: 13 }}>$</span>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                  min={0.01}
                  step={0.01}
                  style={{ ...inputStyle, paddingLeft: 28 }}
                />
              </div>
            </FormGroup>
          )}

          {/* Bid Strategy */}
          <FormGroup label="Estrategia de puja">
            <select value={bidStrategy} onChange={(e) => setBidStrategy(e.target.value)} style={selectStyle}>
              {BID_STRATEGIES.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </FormGroup>

          {/* Special Ad Categories */}
          <FormGroup label="Categoría especial">
            <select value={specialCategory} onChange={(e) => setSpecialCategory(e.target.value)} style={selectStyle}>
              {SPECIAL_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </FormGroup>

          {/* Objective (read-only) */}
          <FormGroup label="Objetivo">
            <div style={{ ...inputStyle, color: "rgba(148,163,184,0.5)", display: "flex", alignItems: "center" }}>
              {campaign.objective || "—"}
              <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(148,163,184,0.4)", fontStyle: "italic" }}>
                No editable
              </span>
            </div>
          </FormGroup>

          {/* Error */}
          {localError && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.3)", borderRadius: 8, fontSize: 12, color: "var(--red)" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {localError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancelar</button>
          <button onClick={handleSave} disabled={loading || saved} style={saveBtnStyle(saved)}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? "✓ Guardado" : <><Save className="w-4 h-4" /> Guardar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared sub-components & styles ──────────────────────────────────────────

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(148,163,184,0.7)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.3)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "9px 12px",
  color: "white",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

export const selectStyle: React.CSSProperties = {
  ...inputStyle as any,
  cursor: "pointer",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(148,163,184,0.6)' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  backgroundSize: 16,
  paddingRight: 32,
};

export const toggleStyle: React.CSSProperties = {
  padding: "7px 14px",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s",
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "9px 18px",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "rgba(148,163,184,0.7)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const saveBtnStyle = (saved: boolean): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 6,
  padding: "9px 18px",
  background: saved ? "rgba(6,214,160,0.2)" : "rgba(0,129,251,0.2)",
  border: `1px solid ${saved ? "var(--emerald)" : "var(--cyan)"}`,
  borderRadius: 8,
  color: saved ? "var(--emerald)" : "var(--cyan)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s",
});
