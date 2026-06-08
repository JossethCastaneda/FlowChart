"use client";

import { useState } from "react";
import { X, Layers, AlertTriangle, Loader2, PauseCircle, Info } from "lucide-react";

interface Campaign { id: string; name: string; objective?: string }
interface Props {
  adAccountId: string;
  campaigns: Campaign[];
  onClose: () => void;
  onCreated: (id: string) => void;
}

// Objectives we can create an ad set for without a pixel/form/app.
const SUPPORTED: Record<string, string> = {
  OUTCOME_TRAFFIC: "Optimiza por clics en el enlace",
  OUTCOME_AWARENESS: "Optimiza por alcance",
  OUTCOME_ENGAGEMENT: "Optimiza por interacción",
};

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", background: "rgba(0,0,0,0.25)",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#e2e8f0",
  fontSize: 13, outline: "none", fontFamily: "inherit",
};
const lbl: React.CSSProperties = { fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 5, fontWeight: 500 };

export function CreateAdSetModal({ adAccountId, campaigns, onClose, onCreated }: Props) {
  const supported = campaigns.filter((c) => c.objective && SUPPORTED[c.objective]);
  const [campaignId, setCampaignId] = useState(supported[0]?.id || campaigns[0]?.id || "");
  const [name, setName] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [countries, setCountries] = useState("MX");
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("65");
  const [gender, setGender] = useState<"all" | "male" | "female">("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const campaign = campaigns.find((c) => c.id === campaignId) || null;
  const objSupported = !!(campaign?.objective && SUPPORTED[campaign.objective]);

  const submit = async () => {
    if (!campaign) { setError("Selecciona una campaña."); return; }
    if (!objSupported) { setError("El objetivo de esta campaña requiere configuración extra (píxel/formulario). Créalo en Meta."); return; }
    if (!name.trim()) { setError("Escribe un nombre para el conjunto."); return; }
    if (!dailyBudget || Number(dailyBudget) <= 0) { setError("Indica un presupuesto diario."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/meta/adsets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adAccountId,
          campaignId,
          objective: campaign.objective,
          name: name.trim(),
          dailyBudget: Number(dailyBudget),
          countries: countries.split(",").map((c) => c.trim()).filter(Boolean),
          ageMin: Number(ageMin) || 18,
          ageMax: Number(ageMax) || 65,
          genders: gender === "male" ? [1] : gender === "female" ? [2] : [],
          confirmed_by_user: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") onCreated(data.object_id);
      else setError(data.user_message || data.error || data.blocked_reason || "No se pudo crear el conjunto.");
    } catch {
      setError("Error de red al crear el conjunto.");
    }
    setSaving(false);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "5vh 16px", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 540, background: "rgba(8,12,24,0.98)", border: "1px solid rgba(123,97,255,0.25)", borderRadius: 10, animation: "fadeInScale 0.2s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
            <Layers style={{ width: 16, height: 16, color: "#7b61ff" }} /> Crear conjunto de anuncios
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}><X style={{ width: 18, height: 18 }} /></button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 16 }}>
          <div>
            <label style={lbl}>Campaña *</label>
            <select style={{ ...inp, cursor: "pointer" }} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}{c.objective && !SUPPORTED[c.objective] ? " (objetivo no soportado aquí)" : ""}</option>)}
            </select>
            {campaign && objSupported && (
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <Info style={{ width: 11, height: 11 }} /> {SUPPORTED[campaign.objective!]}
              </div>
            )}
          </div>

          {campaign && !objSupported && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 8, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)" }}>
              <AlertTriangle style={{ width: 15, height: 15, color: "#fbbf24", flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 11, color: "#fcd34d" }}>Este objetivo (Leads/Ventas/App) necesita píxel, formulario o app. Créalo en Meta, o usa una campaña de <strong>Tráfico, Reconocimiento o Interacción</strong>.</div>
            </div>
          )}

          <div>
            <label style={lbl}>Nombre del conjunto *</label>
            <input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. MX — 25-45 — Intereses A" autoFocus />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Presupuesto diario (MXN) *</label>
              <input style={inp} type="number" min={1} value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} placeholder="Ej. 200" />
            </div>
            <div>
              <label style={lbl}>Países (códigos ISO)</label>
              <input style={inp} value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="MX, US" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Edad mín.</label><input style={inp} type="number" min={13} max={65} value={ageMin} onChange={(e) => setAgeMin(e.target.value)} /></div>
            <div><label style={lbl}>Edad máx.</label><input style={inp} type="number" min={13} max={65} value={ageMax} onChange={(e) => setAgeMax(e.target.value)} /></div>
            <div>
              <label style={lbl}>Género</label>
              <select style={{ ...inp, cursor: "pointer" }} value={gender} onChange={(e) => setGender(e.target.value as any)}>
                <option value="all">Todos</option>
                <option value="male">Hombres</option>
                <option value="female">Mujeres</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 8, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)" }}>
            <PauseCircle style={{ width: 16, height: 16, color: "#fbbf24", flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 11, color: "#fcd34d" }}>
              El conjunto se crea <strong>en pausa</strong>. No entrega ni gasta hasta que le agregues anuncios y lo actives en Meta. Si la campaña usa <strong>CBO</strong>, ajusta el presupuesto allí.
            </div>
          </div>

          {error && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertTriangle style={{ width: 14, height: 14, color: "#f87171", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#fca5a5" }}>{error}</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 22px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "transparent", border: "1px solid rgba(148,163,184,0.25)", color: "#94a3b8", cursor: "pointer", fontSize: 12, borderRadius: 6, fontFamily: "inherit" }}>Cancelar</button>
          <button onClick={submit} disabled={saving || !objSupported || !name.trim() || !dailyBudget} className="btn-primary" style={{ padding: "9px 22px", opacity: saving || !objSupported || !name.trim() || !dailyBudget ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 7 }}>
            {saving ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <PauseCircle style={{ width: 14, height: 14 }} />}
            Crear en pausa
          </button>
        </div>
      </div>
    </div>
  );
}
