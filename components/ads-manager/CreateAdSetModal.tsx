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
  width: "100%", padding: "9px 12px", background: "var(--surface-hover)",
  border: "1px solid var(--hairline)", borderRadius: 6, color: "var(--foreground)",
  fontSize: 13, outline: "none", fontFamily: "inherit",
};
const lbl: React.CSSProperties = { fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 5, fontWeight: 500 };

export function CreateAdSetModal({ adAccountId, campaigns, onClose, onCreated }: Props) {
  const supported = campaigns.filter((c) => c.objective && SUPPORTED[c.objective]);
  const [campaignId, setCampaignId] = useState(supported[0]?.id || campaigns[0]?.id || "");
  const [name, setName] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [countries, setCountries] = useState("MX");
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("65");
  const [gender, setGender] = useState<"all" | "male" | "female">("all");
  const [advantageAudience, setAdvantageAudience] = useState(true);
  const [advantagePlacements, setAdvantagePlacements] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const campaign = campaigns.find((c) => c.id === campaignId) || null;
  const objSupported = !!(campaign?.objective && SUPPORTED[campaign.objective]);

  const submit = async () => {
    if (!campaign) { setError("Selecciona una campaña."); return; }
    if (!objSupported) { setError("El objetivo de esta campaña requiere configuración extra (píxel/formulario). Créalo en Meta."); return; }
    if (!name.trim()) { setError("Escribe un nombre para el conjunto."); return; }
    // Budget is optional if the parent campaign is using Campaign Budget Optimization (CBO)
    // We just warn or let the API handle the validation error.
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
          advantageAudience,
          advantagePlacements,
          start_time: startDate ? new Date(startDate).toISOString() : undefined,
          end_time: endDate ? new Date(endDate).toISOString() : undefined,
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
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "5vh 16px", background: "var(--overlay-dark)", backdropFilter: "blur(6px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 540, background: "var(--surface)", border: "1px solid rgba(139,141,242,0.25)", borderRadius: 10, animation: "fadeInScale 0.2s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", border: "1px solid var(--hairline)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>
            <Layers style={{ width: 16, height: 16, color: "var(--purple)" }} /> Crear conjunto de anuncios
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X style={{ width: 18, height: 18 }} /></button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 16 }}>
          <div>
            <label style={lbl}>Campaña *</label>
            <select style={{ ...inp, cursor: "pointer" }} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}{c.objective && !SUPPORTED[c.objective] ? " (objetivo no soportado aquí)" : ""}</option>)}
            </select>
            {campaign && objSupported && (
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <Info style={{ width: 11, height: 11 }} /> {SUPPORTED[campaign.objective!]}
              </div>
            )}
          </div>

          {campaign && !objSupported && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 8, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)" }}>
              <AlertTriangle style={{ width: 15, height: 15, color: "var(--amber)", flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 11, color: "var(--amber)" }}>Este objetivo (Leads/Ventas/App) necesita píxel, formulario o app. Créalo en Meta, o usa una campaña de <strong>Tráfico, Reconocimiento o Interacción</strong>.</div>
            </div>
          )}

          <div>
            <label style={lbl}>Nombre del conjunto *</label>
            <input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. MX — 25-45 — Intereses A" autoFocus />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Presupuesto diario (MXN) <span style={{fontWeight: "normal", color: "var(--text-muted)"}}>(Opcional con CBO)</span></label>
              <input style={inp} type="number" min={1} value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} placeholder="Ej. 200" />
            </div>
            <div>
              <label style={lbl}>Países (códigos ISO)</label>
              <input style={inp} value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="MX, US" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, opacity: advantageAudience ? 0.6 : 1, transition: "opacity 0.2s" }}>
            <div><label style={lbl}>Edad mín.</label><input style={inp} type="number" min={13} max={65} value={ageMin} onChange={(e) => setAgeMin(e.target.value)} disabled={advantageAudience} /></div>
            <div><label style={lbl}>Edad máx.</label><input style={inp} type="number" min={13} max={65} value={ageMax} onChange={(e) => setAgeMax(e.target.value)} disabled={advantageAudience} /></div>
            <div>
              <label style={lbl}>Género</label>
              <select style={{ ...inp, cursor: advantageAudience ? "not-allowed" : "pointer" }} value={gender} onChange={(e) => setGender(e.target.value as any)} disabled={advantageAudience}>
                <option value="all">Todos</option>
                <option value="male">Hombres</option>
                <option value="female">Mujeres</option>
              </select>
            </div>
          </div>
          
          {advantageAudience && (
            <div style={{ fontSize: 10, color: "var(--purple)", marginTop: "-6px" }}>
              * Advantage+ tomará control de la edad y el género basado en el rendimiento.
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Fecha de inicio</label>
              <input style={inp} type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Fecha de fin (opcional)</label>
              <input style={inp} type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--foreground)", cursor: "pointer", background: "var(--row-hover)", padding: "10px", borderRadius: 8, border: "1px solid var(--hairline)" }}>
              <input type="checkbox" checked={advantageAudience} onChange={(e) => setAdvantageAudience(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--purple)" }} />
              <div>
                <div style={{ fontWeight: 600 }}>Advantage+ Audience</div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>Recomendado por Meta</div>
              </div>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--foreground)", cursor: "pointer", background: "var(--row-hover)", padding: "10px", borderRadius: 8, border: "1px solid var(--hairline)" }}>
              <input type="checkbox" checked={advantagePlacements} onChange={(e) => setAdvantagePlacements(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--purple)" }} />
              <div>
                <div style={{ fontWeight: 600 }}>Advantage+ Placements</div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>Todas las ubicaciones automáticas</div>
              </div>
            </label>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 8, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)" }}>
            <PauseCircle style={{ width: 16, height: 16, color: "var(--amber)", flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 11, color: "var(--amber)" }}>
              El conjunto se crea <strong>en pausa</strong>. No entrega ni gasta hasta que le agregues anuncios y lo actives en Meta. Si la campaña usa <strong>CBO</strong>, ajusta el presupuesto allí.
            </div>
          </div>

          {error && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", borderRadius: 6, background: "var(--red-dim)", border: "1px solid rgba(229,72,77,0.2)" }}>
              <AlertTriangle style={{ width: 14, height: 14, color: "var(--red)", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--red)" }}>{error}</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 22px", border: "1px solid var(--hairline)" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, borderRadius: 6, fontFamily: "inherit" }}>Cancelar</button>
          <button onClick={submit} disabled={saving || !objSupported || !name.trim()} className="btn-primary" style={{ padding: "9px 22px", opacity: saving || !objSupported || !name.trim() ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 7 }}>
            {saving ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <PauseCircle style={{ width: 14, height: 14 }} />}
            Crear en pausa
          </button>
        </div>
      </div>
    </div>
  );
}
