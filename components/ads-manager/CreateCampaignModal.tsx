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
  width: "100%", padding: "9px 12px", background: "var(--surface-hover)",
  border: "1px solid var(--hairline)", borderRadius: 6, color: "var(--foreground)",
  fontSize: 13, outline: "none", fontFamily: "inherit",
};
const lbl: React.CSSProperties = { fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 5, fontWeight: 500 };

export function CreateCampaignModal({ adAccountId, adAccountName, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("OUTCOME_TRAFFIC");
  const [special, setSpecial] = useState("");
  const [buyingType, setBuyingType] = useState("AUCTION");
  const [cbo, setCbo] = useState(false);
  const [isAsc, setIsAsc] = useState(true); // Default to Advantage+ Shopping when SALES
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
          // Advantage+ Shopping (ASC) sobre OUTCOME_SALES usa SMART_SHOPPING.
          // SMART_APP_PROMOTION es para campañas de promoción de APPS — enviarlo aquí
          // producía el smart_promotion_type equivocado.
          smart_promotion_type: objective === "OUTCOME_SALES" && isAsc ? "SMART_SHOPPING" : undefined,
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
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "5vh 16px", background: "var(--overlay-dark)",  }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, background: "var(--surface)", border: "1px solid rgba(0,129,251,0.2)", borderRadius: 10, animation: "fadeInScale 0.2s ease-out" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", border: "1px solid var(--hairline)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>
            <Megaphone style={{ width: 16, height: 16, color: "#0081FB" }} /> Crear campaña
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X style={{ width: 18, height: 18 }} /></button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 16 }}>
          {adAccountName && (
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Cuenta: <span style={{ color: "var(--foreground)" }}>{adAccountName}</span></div>
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
                    <div style={{ fontSize: 13, fontWeight: 600, color: active ? "var(--cyan)" : "var(--foreground)" }}>{o.label}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{o.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {objective === "OUTCOME_SALES" && (
            <div style={{ marginTop: 8 }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.15)", padding: "14px", borderRadius: 8 }}>
                <input type="checkbox" checked={isAsc} onChange={(e) => setIsAsc(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--cyan)", marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cyan)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Megaphone style={{ width: 14, height: 14 }} /> Campaña de compras Advantage+ (ASC)
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.4 }}>
                    Simplifica la configuración de la campaña y confía en el aprendizaje automático de Meta para encontrar los públicos adecuados. (Recomendado)
                  </div>
                </div>
              </label>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, opacity: objective === "OUTCOME_SALES" && isAsc ? 0.4 : 1, pointerEvents: objective === "OUTCOME_SALES" && isAsc ? "none" : "auto" }}>
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
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={cbo} onChange={(e) => setCbo(e.target.checked)} />
              Presupuesto de la campaña Advantage+
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
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid rgba(251,191,36,0.18)" }}>
            <PauseCircle style={{ width: 16, height: 16, color: "var(--amber)", flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 11, color: "var(--amber)" }}>
              La campaña se crea <strong>en pausa</strong> y no gasta nada hasta que le agregues conjuntos de anuncios y anuncios, y la actives en Meta.
            </div>
          </div>

          {error && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", borderRadius: 6, background: "var(--red-dim)", border: "1px solid rgba(229,72,77,0.2)" }}>
              <AlertTriangle style={{ width: 14, height: 14, color: "var(--red)", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--red)" }}>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 22px", border: "1px solid var(--hairline)" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, borderRadius: 6, fontFamily: "inherit" }}>Cancelar</button>
          <button onClick={submit} disabled={saving || !name.trim()} className="btn-primary" style={{ padding: "9px 22px", opacity: saving || !name.trim() ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 7 }}>
            {saving ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <PauseCircle style={{ width: 14, height: 14 }} />}
            Crear en pausa
          </button>
        </div>
      </div>
    </div>
  );
}
