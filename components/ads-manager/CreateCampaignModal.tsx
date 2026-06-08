"use client";

import { useState } from "react";
import { X, Megaphone, AlertTriangle, Loader2, PauseCircle } from "lucide-react";

interface Props {
  adAccountId: string;
  adAccountName?: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}

const OBJECTIVES = [
  { id: "OUTCOME_AWARENESS", label: "Reconocimiento", desc: "Mostrar tu marca a más personas" },
  { id: "OUTCOME_TRAFFIC", label: "Tráfico", desc: "Llevar gente a un sitio / app" },
  { id: "OUTCOME_ENGAGEMENT", label: "Interacción", desc: "Mensajes, reacciones, vídeo" },
  { id: "OUTCOME_LEADS", label: "Clientes potenciales", desc: "Formularios, registros" },
  { id: "OUTCOME_SALES", label: "Ventas", desc: "Conversiones / compras" },
  { id: "OUTCOME_APP_PROMOTION", label: "Promoción de app", desc: "Instalaciones / eventos de app" },
];
const SPECIAL = [
  { id: "", label: "Ninguna" },
  { id: "HOUSING", label: "Vivienda" },
  { id: "EMPLOYMENT", label: "Empleo" },
  { id: "CREDIT", label: "Crédito" },
  { id: "ISSUES_ELECTIONS_POLITICS", label: "Política / Temas sociales" },
  { id: "FINANCIAL_PRODUCTS_SERVICES", label: "Productos/servicios financieros" },
  { id: "ONLINE_GAMBLING_AND_GAMING", label: "Juego y apuestas" },
];
const BIDS = [
  { id: "LOWEST_COST_WITHOUT_CAP", label: "Costo más bajo (automático)" },
  { id: "LOWEST_COST_WITH_BID_CAP", label: "Límite de puja" },
  { id: "COST_CAP", label: "Límite de costo" },
];

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", background: "rgba(0,0,0,0.25)",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#e2e8f0",
  fontSize: 13, outline: "none", fontFamily: "inherit",
};
const lbl: React.CSSProperties = { fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 5, fontWeight: 500 };

export function CreateCampaignModal({ adAccountId, adAccountName, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("OUTCOME_TRAFFIC");
  const [special, setSpecial] = useState("");
  const [buyingType, setBuyingType] = useState("AUCTION");
  const [cbo, setCbo] = useState(false);
  const [dailyBudget, setDailyBudget] = useState("");
  const [bidStrategy, setBidStrategy] = useState("LOWEST_COST_WITHOUT_CAP");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim()) { setError("Escribe un nombre para la campaña."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/meta/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adAccountId,
          name: name.trim(),
          objective,
          special_ad_categories: special ? [special] : [],
          buying_type: buyingType,
          daily_budget: cbo && dailyBudget ? Number(dailyBudget) : undefined,
          bid_strategy: cbo ? bidStrategy : undefined,
          confirmed_by_user: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        onCreated(data.object_id);
      } else {
        setError(data.user_message || data.error || data.blocked_reason || "No se pudo crear la campaña.");
      }
    } catch {
      setError("Error de red al crear la campaña.");
    }
    setSaving(false);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "5vh 16px", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, background: "rgba(8,12,24,0.98)", border: "1px solid rgba(0,129,251,0.2)", borderRadius: 10, animation: "fadeInScale 0.2s ease-out" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
            <Megaphone style={{ width: 16, height: 16, color: "#0081FB" }} /> Crear campaña
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}><X style={{ width: 18, height: 18 }} /></button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 16 }}>
          {adAccountName && (
            <div style={{ fontSize: 11, color: "#64748b" }}>Cuenta: <span style={{ color: "#e2e8f0" }}>{adAccountName}</span></div>
          )}

          <div>
            <label style={lbl}>Nombre de la campaña *</label>
            <input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Ventas — Junio — Prospección" autoFocus />
          </div>

          <div>
            <label style={lbl}>Objetivo *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {OBJECTIVES.map((o) => {
                const active = objective === o.id;
                return (
                  <button key={o.id} onClick={() => setObjective(o.id)}
                    style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                      background: active ? "rgba(0,129,251,0.1)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${active ? "rgba(0,129,251,0.4)" : "rgba(255,255,255,0.07)"}` }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: active ? "#4aa3ff" : "#e2e8f0" }}>{o.label}</div>
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{o.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Categoría especial</label>
              <select style={{ ...inp, cursor: "pointer" }} value={special} onChange={(e) => setSpecial(e.target.value)}>
                {SPECIAL.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Tipo de compra</label>
              <select style={{ ...inp, cursor: "pointer" }} value={buyingType} onChange={(e) => setBuyingType(e.target.value)}>
                <option value="AUCTION">Subasta</option>
                <option value="RESERVED">Reservado (alcance y frecuencia)</option>
              </select>
            </div>
          </div>

          {/* Optional CBO */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", cursor: "pointer" }}>
              <input type="checkbox" checked={cbo} onChange={(e) => setCbo(e.target.checked)} />
              Presupuesto a nivel campaña (CBO)
            </label>
            {cbo && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
                <div>
                  <label style={lbl}>Presupuesto diario (MXN)</label>
                  <input style={inp} type="number" min={1} value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} placeholder="Ej. 200" />
                </div>
                <div>
                  <label style={lbl}>Estrategia de puja</label>
                  <select style={{ ...inp, cursor: "pointer" }} value={bidStrategy} onChange={(e) => setBidStrategy(e.target.value)}>
                    {BIDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Safety note */}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 8, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)" }}>
            <PauseCircle style={{ width: 16, height: 16, color: "#fbbf24", flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 11, color: "#fcd34d" }}>
              La campaña se crea <strong>en pausa</strong> y no gasta nada hasta que le agregues conjuntos de anuncios y anuncios, y la actives en Meta.
            </div>
          </div>

          {error && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertTriangle style={{ width: 14, height: 14, color: "#f87171", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#fca5a5" }}>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 22px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "transparent", border: "1px solid rgba(148,163,184,0.25)", color: "#94a3b8", cursor: "pointer", fontSize: 12, borderRadius: 6, fontFamily: "inherit" }}>Cancelar</button>
          <button onClick={submit} disabled={saving || !name.trim()} className="btn-primary" style={{ padding: "9px 22px", opacity: saving || !name.trim() ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 7 }}>
            {saving ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <PauseCircle style={{ width: 14, height: 14 }} />}
            Crear en pausa
          </button>
        </div>
      </div>
    </div>
  );
}
