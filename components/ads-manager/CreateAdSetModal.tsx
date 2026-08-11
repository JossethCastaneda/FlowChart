/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import { X, Layers, AlertTriangle, Loader2, PauseCircle, Info } from "lucide-react";

interface Campaign { id: string; name: string; objective?: string }
interface Props {
  adAccountId: string;
  campaigns: Campaign[];
  onClose: () => void;
  onCreated: (id: string) => void;
}

const OBJ_LABELS: Record<string, string> = {
  OUTCOME_TRAFFIC: "Optimiza por clics en el enlace",
  OUTCOME_AWARENESS: "Optimiza por alcance",
  OUTCOME_ENGAGEMENT: "Optimiza por interacción",
  OUTCOME_LEADS: "Optimiza por generación de leads",
  OUTCOME_SALES: "Optimiza por conversiones",
  OUTCOME_APP_PROMOTION: "Optimiza por instalaciones de app",
};

// Objectives that need extra config (promoted_object)
const NEEDS_PAGE = ["OUTCOME_LEADS"];
const NEEDS_PIXEL = ["OUTCOME_SALES"];

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", background: "var(--surface-hover)",
  border: "1px solid var(--hairline)", borderRadius: 6, color: "var(--fc-text)",
  fontSize: 13, outline: "none", fontFamily: "inherit",
};
const lbl: React.CSSProperties = { fontSize: 11, color: "var(--fc-text-secondary)", display: "block", marginBottom: 5, fontWeight: 500 };

export function CreateAdSetModal({ adAccountId, campaigns, onClose, onCreated }: Props) {
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id || "");
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

  // Pages for LEADS (promoted_object.page_id)
  const [pages, setPages] = useState<{id: string; name: string}[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [loadingPages, setLoadingPages] = useState(false);

  // Pixels for SALES (promoted_object.pixel_id)
  const [pixelId, setPixelId] = useState("");

  const campaign = campaigns.find((c) => c.id === campaignId) || null;
  const obj = campaign?.objective || "";
  const needsPage = NEEDS_PAGE.includes(obj);
  const needsPixel = NEEDS_PIXEL.includes(obj);
  const isAppPromo = obj === "OUTCOME_APP_PROMOTION";
  const objLabel = OBJ_LABELS[obj] || "";

  // Fetch pages when LEADS objective selected
  useEffect(() => {
    if (needsPage && pages.length === 0) {
   
            setLoadingPages(true);
      fetch("/api/meta/pages?module=ads")
        .then(r => r.json())
        .then(d => {
                    const list = (d.data || []).map((p: any) => ({ id: p.id, name: p.name }));
          setPages(list);
          if (list.length > 0 && !selectedPageId) setSelectedPageId(list[0].id);
        })
        .catch(() => {})
        .finally(() => setLoadingPages(false));
    }
  }, [needsPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const canSubmit = (() => {
    if (!campaign || !name.trim()) return false;
    if (isAppPromo) return false; // Not supported yet
    if (needsPage && !selectedPageId) return false;
    if (needsPixel && !pixelId.trim()) return false;
    return true;
  })();

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      // Build promoted_object
      let promoted_object: Record<string, string> | undefined;
      if (needsPage) promoted_object = { page_id: selectedPageId };
      else if (needsPixel) promoted_object = { pixel_id: pixelId.trim() };

      const res = await fetch("/api/meta/adsets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adAccountId,
          campaignId,
          objective: campaign!.objective,
          name: name.trim(),
          dailyBudget: Number(dailyBudget),
          countries: countries.split(",").map((c) => c.trim()).filter(Boolean),
          ageMin: Number(ageMin) || 18,
          ageMax: Number(ageMax) || 65,
          genders: gender === "male" ? [1] : gender === "female" ? [2] : [],
          advantageAudience,
          advantagePlacements,
          promoted_object,
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
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "5vh 16px", background: "var(--overlay-dark)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 540, background: "var(--fc-surface)", border: "1px solid rgba(139,141,242,0.25)", borderRadius: 10, animation: "fadeInScale 0.2s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", border: "1px solid var(--hairline)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, fontWeight: 700, color: "var(--fc-text)" }}>
            <Layers style={{ width: 16, height: 16, color: "var(--fc-module-aria)" }} /> Crear conjunto de anuncios
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--fc-text-muted)", cursor: "pointer" }}><X style={{ width: 18, height: 18 }} /></button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 16 }}>
          <div>
            <label style={lbl}>Campaña *</label>
            <select style={{ ...inp, cursor: "pointer" }} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}{c.objective === "OUTCOME_APP_PROMOTION" ? " ⚠ (App no soportada aún)" : ""}</option>)}
            </select>
            {campaign && objLabel && (
              <div style={{ fontSize: 10, color: "var(--fc-text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <Info style={{ width: 11, height: 11 }} /> {objLabel}
              </div>
            )}
          </div>

          {isAppPromo && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 8, background: "var(--fc-surface)", border: "1px solid rgba(251,191,36,0.18)" }}>
              <AlertTriangle style={{ width: 15, height: 15, color: "var(--fc-warning)", flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 11, color: "var(--fc-warning)" }}>La promoción de app aún no está soportada desde FlowChart. Créalo directamente en Meta.</div>
            </div>
          )}

          {/* Page selector for LEADS */}
          {needsPage && (
            <div>
              <label style={lbl}>Página de Facebook * (para leads)</label>
              {loadingPages ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fc-text-muted)", padding: 8 }}>
                  <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Cargando páginas…
                </div>
              ) : pages.length > 0 ? (
                <select style={{ ...inp, cursor: "pointer" }} value={selectedPageId} onChange={(e) => setSelectedPageId(e.target.value)}>
                  {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              ) : (
                <div style={{ fontSize: 11, color: "var(--fc-warning)", padding: 8 }}>No se encontraron páginas. Conecta una página en Integraciones.</div>
              )}
            </div>
          )}

          {/* Pixel ID for SALES */}
          {needsPixel && (
            <div>
              <label style={lbl}>Pixel ID * (para conversiones)</label>
              <input style={inp} value={pixelId} onChange={(e) => setPixelId(e.target.value)} placeholder="Ej. 123456789012345" />
              <div style={{ fontSize: 10, color: "var(--fc-text-muted)", marginTop: 3 }}>Encuéntralo en Meta Business Suite → Orígenes de datos → Píxeles.</div>
            </div>
          )}

          <div>
            <label style={lbl}>Nombre del conjunto *</label>
            <input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. MX — 25-45 — Intereses A" autoFocus />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Presupuesto diario (MXN) <span style={{fontWeight: "normal", color: "var(--fc-text-muted)"}}>(Opcional con CBO)</span></label>
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
            <div style={{ fontSize: 10, color: "var(--fc-module-aria)", marginTop: "-6px" }}>
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
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fc-text)", cursor: "pointer", background: "var(--row-hover)", padding: "10px", borderRadius: 8, border: "1px solid var(--hairline)" }}>
              <input type="checkbox" checked={advantageAudience} onChange={(e) => setAdvantageAudience(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--fc-module-aria)" }} />
              <div>
                <div style={{ fontWeight: 600 }}>Advantage+ Audience</div>
                <div style={{ fontSize: 10, color: "var(--fc-text-secondary)", marginTop: 2 }}>Recomendado por Meta</div>
              </div>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fc-text)", cursor: "pointer", background: "var(--row-hover)", padding: "10px", borderRadius: 8, border: "1px solid var(--hairline)" }}>
              <input type="checkbox" checked={advantagePlacements} onChange={(e) => setAdvantagePlacements(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--fc-module-aria)" }} />
              <div>
                <div style={{ fontWeight: 600 }}>Advantage+ Placements</div>
                <div style={{ fontSize: 10, color: "var(--fc-text-secondary)", marginTop: 2 }}>Todas las ubicaciones automáticas</div>
              </div>
            </label>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 8, background: "var(--fc-surface)", border: "1px solid rgba(251,191,36,0.18)" }}>
            <PauseCircle style={{ width: 16, height: 16, color: "var(--fc-warning)", flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 11, color: "var(--fc-warning)" }}>
              El conjunto se crea <strong>en pausa</strong>. No entrega ni gasta hasta que le agregues anuncios y lo actives en Meta. Si la campaña usa <strong>CBO</strong>, ajusta el presupuesto allí.
            </div>
          </div>

          {error && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", borderRadius: 6, background: "var(--fc-danger-wash)", border: "1px solid rgba(229,72,77,0.2)" }}>
              <AlertTriangle style={{ width: 14, height: 14, color: "var(--fc-danger)", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--fc-danger)" }}>{error}</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 22px", border: "1px solid var(--hairline)" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--fc-border)", color: "var(--fc-text-secondary)", cursor: "pointer", fontSize: 12, borderRadius: 6, fontFamily: "inherit" }}>Cancelar</button>
          <button onClick={submit} disabled={saving || !canSubmit} className="btn-primary" style={{ padding: "9px 22px", opacity: saving || !canSubmit ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 7 }}>
            {saving ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <PauseCircle style={{ width: 14, height: 14 }} />}
            Crear en pausa
          </button>
        </div>
      </div>
    </div>
  );
}
