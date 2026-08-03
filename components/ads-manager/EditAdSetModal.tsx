"use client";
import React, { useState, useEffect, useRef } from "react";
import { X, Save, Loader2, AlertCircle, Target, MapPin, Users, Monitor } from "lucide-react";
import { useMetaUpdate } from "@/hooks/useMetaUpdate";
import { inputStyle, selectStyle, toggleStyle } from "./EditCampaignModal";

// Re-export FormGroup locally
function FormGroup({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
        {hint && <span style={{ marginLeft: 6, fontSize: 9, color: "var(--text-muted)", fontWeight: 400, textTransform: "none", fontStyle: "italic" }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const OPTIMIZATION_GOALS = [
  { value: "IMPRESSIONS", label: "Impresiones" },
  { value: "REACH", label: "Alcance" },
  { value: "LINK_CLICKS", label: "Clics en enlace" },
  { value: "CONVERSIONS", label: "Conversiones" },
  { value: "LEAD_GENERATION", label: "Generación de leads" },
  { value: "REPLIES", label: "Respuestas en mensajes" },
  { value: "THRUPLAY", label: "ThruPlay (video)" },
  { value: "POST_ENGAGEMENT", label: "Interacción con publicación" },
];

const BID_STRATEGIES_ADSET = [
  { value: "LOWEST_COST_WITHOUT_CAP", label: "Costo más bajo (automático)" },
  { value: "LOWEST_COST_WITH_BID_CAP", label: "Límite de puja" },
  { value: "COST_CAP", label: "Límite de costo" },
];

interface EditAdSetModalProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  adset: any;
  onClose: () => void;
  onSaved: () => void;
}

export function EditAdSetModal({ adset, onClose, onSaved }: EditAdSetModalProps) {
  const { updateAdSet, loading } = useMetaUpdate();
  const [localError, setLocalError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "budget" | "targeting" | "schedule">("general");
  const overlayRef = useRef<HTMLDivElement>(null);

  // -- General --
  const [name, setName] = useState(adset.name || "");
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED">(adset.status === "ACTIVE" ? "ACTIVE" : "PAUSED");

  // -- Budget --
  const hasDailyBudget = adset.daily_budget !== undefined && adset.daily_budget !== null;
  const [budgetType, setBudgetType] = useState<"daily" | "lifetime">(hasDailyBudget ? "daily" : "lifetime");
  const [budget, setBudget] = useState<number>(
    hasDailyBudget
      ? (parseFloat(adset.daily_budget || "0") / 100)
      : (parseFloat(adset.lifetime_budget || "0") / 100)
  );
  const [bidStrategy, setBidStrategy] = useState(adset.bid_strategy || "LOWEST_COST_WITHOUT_CAP");
  const [bidAmount, setBidAmount] = useState<number>(parseFloat(adset.bid_amount || "0") / 100);
  const [optimizationGoal, setOptimizationGoal] = useState(adset.optimization_goal || "IMPRESSIONS");

  // -- Schedule --
  const [startTime, setStartTime] = useState(adset.start_time ? adset.start_time.substring(0, 16) : "");
  const [endTime, setEndTime] = useState(adset.end_time ? adset.end_time.substring(0, 16) : "");

  // -- Targeting --
  const targeting = adset.targeting || {};
  const [ageMin, setAgeMin] = useState<number>(targeting.age_min || 18);
  const [ageMax, setAgeMax] = useState<number>(targeting.age_max || 65);
  const [genders, setGenders] = useState<number[]>(targeting.genders || []);
  const [countries, setCountries] = useState<string>(
    (targeting.geo_locations?.countries || []).join(", ")
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    setLocalError(null);
    if (!name.trim()) { setLocalError("El nombre es obligatorio"); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const fields: any = { name };
    if (status !== adset.status) fields.status = status;

    // Budget
    if (hasDailyBudget || budget > 0) {
      if (budgetType === "daily") fields.daily_budget = budget;
      else fields.lifetime_budget = budget;
    }
    if (bidStrategy !== adset.bid_strategy) fields.bid_strategy = bidStrategy;
    if (bidAmount > 0 && bidStrategy === "LOWEST_COST_WITH_BID_CAP") fields.bid_amount = bidAmount;
    if (optimizationGoal !== adset.optimization_goal) fields.optimization_goal = optimizationGoal;

    // Schedule — SOLO enviar si el usuario cambió el valor. Antes se reenviaba en cada
    // guardado y `new Date(localValue).toISOString()` reinterpretaba la hora en la zona
    // horaria del navegador, desplazando la programación un poco en cada save.
    const origStart = adset.start_time ? adset.start_time.substring(0, 16) : "";
    const origEnd = adset.end_time ? adset.end_time.substring(0, 16) : "";
    if (startTime && startTime !== origStart) fields.start_time = new Date(startTime).toISOString();
    if (endTime !== origEnd) fields.end_time = endTime ? new Date(endTime).toISOString() : null;

    // Targeting — must be full object
    const newTargeting = {
      ...targeting,
      age_min: ageMin,
      age_max: ageMax,
      genders: genders.length > 0 ? genders : undefined,
      geo_locations: {
        ...(targeting.geo_locations || {}),
        countries: countries.split(",").map((c) => c.trim()).filter(Boolean),
      },
    };
    fields.targeting = newTargeting;

    const result = await updateAdSet(adset.id, fields);
    if (result.success) {
      setSaved(true);
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } else {
      setLocalError(result.error || "Error desconocido");
    }
  };

  const TABS = [
    { key: "general", label: "General", icon: <Target className="w-3.5 h-3.5" /> },
    { key: "budget", label: "Presupuesto", icon: <Monitor className="w-3.5 h-3.5" /> },
    { key: "targeting", label: "Segmentación", icon: <Users className="w-3.5 h-3.5" /> },
    { key: "schedule", label: "Programación", icon: <MapPin className="w-3.5 h-3.5" /> },
  ] as const;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "var(--overlay-dark)", 
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          width: "100%", maxWidth: 560,
          maxHeight: "90vh",
          boxShadow: "0 24px 64px -12px rgba(0,0,0,0.8)",
          display: "flex", flexDirection: "column",
          animation: "fadeInScale 0.2s ease",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Target className="w-4 h-4" style={{ color: "var(--purple)" }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>Editar Conjunto de Anuncios</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>ID: {adset.id}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4, display: "flex", alignItems: "center", borderRadius: 6 }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 20px" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "10px 12px",
                background: "none", border: "none",
                borderBottom: `2px solid ${activeTab === tab.key ? "var(--cyan)" : "transparent"}`,
                color: activeTab === tab.key ? "var(--cyan)" : "var(--text-secondary)",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                marginBottom: -1, transition: "color 0.15s",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {activeTab === "general" && (
            <>
              <FormGroup label="Nombre del conjunto">
                <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
              </FormGroup>
              <FormGroup label="Estado">
                <div style={{ display: "flex", gap: 8 }}>
                  {(["ACTIVE", "PAUSED"] as const).map((s) => (
                    <button key={s} onClick={() => setStatus(s)} style={{ ...toggleStyle, background: status === s ? (s === "ACTIVE" ? "rgba(52,183,124,0.15)" : "rgba(224,168,60,0.1)") : "rgba(255,255,255,0.09)", borderColor: status === s ? (s === "ACTIVE" ? "var(--emerald)" : "var(--amber)") : "var(--border)", color: status === s ? (s === "ACTIVE" ? "var(--emerald)" : "var(--amber)") : "var(--text-secondary)" }}>
                      {s === "ACTIVE" ? "? Activo" : "? Pausado"}
                    </button>
                  ))}
                </div>
              </FormGroup>
              <FormGroup label="Objetivo de optimización">
                <select value={optimizationGoal} onChange={(e) => setOptimizationGoal(e.target.value)} style={selectStyle}>
                  {OPTIMIZATION_GOALS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </FormGroup>
            </>
          )}

          {activeTab === "budget" && (
            <>
              <FormGroup label="Tipo de presupuesto">
                <div style={{ display: "flex", gap: 8 }}>
                  {(["daily", "lifetime"] as const).map((t) => (
                    <button key={t} onClick={() => setBudgetType(t)} style={{ ...toggleStyle, background: budgetType === t ? "rgba(0,129,251,0.15)" : "rgba(255,255,255,0.09)", borderColor: budgetType === t ? "var(--cyan)" : "var(--border)", color: budgetType === t ? "var(--cyan)" : "var(--text-secondary)" }}>
                      {t === "daily" ? "Diario" : "Total"}
                    </button>
                  ))}
                </div>
              </FormGroup>
              <FormGroup label="Importe">
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", fontSize: 13 }}>$</span>
                  <input type="number" value={budget} onChange={(e) => setBudget(parseFloat(e.target.value) || 0)} min={0.01} step={0.01} style={{ ...inputStyle, paddingLeft: 28 }} />
                </div>
              </FormGroup>
              <FormGroup label="Estrategia de puja">
                <select value={bidStrategy} onChange={(e) => setBidStrategy(e.target.value)} style={selectStyle}>
                  {BID_STRATEGIES_ADSET.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </FormGroup>
              {bidStrategy === "LOWEST_COST_WITH_BID_CAP" && (
                <FormGroup label="Límite de puja ($)">
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", fontSize: 13 }}>$</span>
                    <input type="number" value={bidAmount} onChange={(e) => setBidAmount(parseFloat(e.target.value) || 0)} min={0.01} step={0.01} style={{ ...inputStyle, paddingLeft: 28 }} />
                  </div>
                </FormGroup>
              )}
            </>
          )}

          {activeTab === "targeting" && (
            <>
              <FormGroup label="Rango de edad">
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="number" value={ageMin} onChange={(e) => setAgeMin(parseInt(e.target.value) || 18)} min={13} max={65} style={{ ...inputStyle, width: 80 }} />
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>–</span>
                  <input type="number" value={ageMax} onChange={(e) => setAgeMax(parseInt(e.target.value) || 65)} min={13} max={65} style={{ ...inputStyle, width: 80 }} />
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>años</span>
                </div>
              </FormGroup>

              <FormGroup label="Género">
                <div style={{ display: "flex", gap: 8 }}>
                  {([{ v: 0, l: "Todos" }, { v: 1, l: "Hombres" }, { v: 2, l: "Mujeres" }]).map(({ v, l }) => {
                    const isActive = v === 0 ? genders.length === 0 : genders.includes(v);
                    return (
                      <button
                        key={v}
                        onClick={() => {
                          if (v === 0) setGenders([]);
                          else setGenders(genders.includes(v) ? genders.filter((g) => g !== v) : [...genders.filter((g) => g !== 0), v]);
                        }}
                        style={{ ...toggleStyle, background: isActive ? "rgba(0,129,251,0.15)" : "rgba(255,255,255,0.09)", borderColor: isActive ? "var(--cyan)" : "var(--border)", color: isActive ? "var(--cyan)" : "var(--text-secondary)" }}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              </FormGroup>

              <FormGroup label="Países" hint="Separados por coma (ej: MX, US, ES)">
                <input
                  value={countries}
                  onChange={(e) => setCountries(e.target.value)}
                  placeholder="MX, US, ES"
                  style={inputStyle}
                />
              </FormGroup>

              <div style={{ padding: "10px 12px", background: "var(--surface)", border: "1px solid rgba(224,168,60,0.2)", borderRadius: 8, fontSize: 11, color: "rgba(224,168,60,0.9)", lineHeight: 1.5 }}>
                ?? La segmentación detallada (intereses, comportamientos, audiencias personalizadas) se gestiona a nivel avanzado desde el Administrador de Meta para evitar pérdida de datos.
              </div>
            </>
          )}

          {activeTab === "schedule" && (
            <>
              <FormGroup label="Fecha de inicio">
                <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
              </FormGroup>
              <FormGroup label="Fecha de fin" hint="Opcional">
                <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
                {endTime && (
                  <button onClick={() => setEndTime("")} style={{ marginTop: 6, background: "none", border: "none", fontSize: 11, color: "var(--text-secondary)", cursor: "pointer" }}>
                    Eliminar fecha de fin
                  </button>
                )}
              </FormGroup>
              <div style={{ padding: "10px 12px", background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.08)", borderRadius: 8, fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                ?? Los cambios de programación pueden reiniciar la fase de aprendizaje del conjunto.
              </div>
            </>
          )}

          {localError && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--red-dim)", border: "1px solid rgba(229,72,77,0.3)", borderRadius: 8, fontSize: 12, color: "var(--red)" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {localError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading || saved} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: saved ? "rgba(52,183,124,0.2)" : "rgba(0,129,251,0.2)", border: `1px solid ${saved ? "var(--emerald)" : "var(--cyan)"}`, borderRadius: 8, color: saved ? "var(--emerald)" : "var(--cyan)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? "? Guardado" : <><Save className="w-4 h-4" /> Guardar</>}
          </button>
        </div>
      </div>
    </div>
  );
}
