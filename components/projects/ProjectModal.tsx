import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Users, Globe, DollarSign, Target, Check, ChevronRight, ChevronLeft } from "lucide-react";
import type { Project, ChannelConfig } from "@/types/project";
import {
  PLATFORMS, VERTICALS, GOALS, CPR_MAP
} from "@/lib/project-constants";
import {
  CustomMultiSelectPictures,
  CustomMultiSelect,
  CustomCreatableSelect,
} from "@/components/ui/CustomSelects";

interface MetaPage {
  id: string;
  name: string;
  picture: string;
  portfolio: string;
  instagram: {
    id: string;
    username: string;
    picture: string;
  } | null;
}

export function ProjectModal({ mode, initial, adAccountsByPlatform, metaPages, activeIntegrations, projects, onClose, onSave }: {
  mode: "create" | "edit" | "view";
  initial: Omit<Project, "id" | "createdAt">;
  adAccountsByPlatform: Record<string, { id: string; name: string; portfolio?: string }[]>;
  metaPages: MetaPage[];
  activeIntegrations: {id: string, provider: string}[];
  projects: Project[];
  onClose: () => void;
  onSave: (d: Omit<Project, "id" | "createdAt">) => void;
}) {
  const [form, setForm] = useState({ ...initial, channels: [...(initial.channels || []).map(c => ({ ...c, adAccounts: [...c.adAccounts] }))] });
  const [errors, setErrors] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const ro = mode === "view";
  const isCreate = mode === "create";

  useEffect(() => { setMounted(true); }, []);

  const analyticsIntegrations: any[] = [];

  useEffect(() => {
    if (mode === "view") return;
    if (analyticsIntegrations.length === 1 && !form.crmIntegrationId && !(form.crmIntegrationIds && form.crmIntegrationIds.length)) {
      const only = analyticsIntegrations[0];
      setForm((prev) => ({ ...prev, crmIntegrationId: only.id, crmIntegrationIds: [only.id], crmType: only.provider }));
    }
  }, [activeIntegrations.length, mode, analyticsIntegrations, form.crmIntegrationId, form.crmIntegrationIds]);

  function set(k: string, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
    setErrors(prev => prev.filter(e => e !== k));
  }

  function toggleChannel(platformId: string) {
    if (ro) return;
    setForm(prev => {
      const exists = prev.channels.find(c => c.platformId === platformId);
      if (exists) {
        return { ...prev, channels: prev.channels.filter(c => c.platformId !== platformId) };
      }
      const pl = PLATFORMS.find(p => p.id === platformId)!;
      return {
        ...prev,
        channels: [...prev.channels, {
          platformId, platformName: pl.name,
          adAccounts: [], budget: "", period: "Mensual", goal: "", cpr: "",
        }],
      };
    });
    setErrors(prev => prev.filter(e => e !== "channels"));
  }

  function setChannel(platformId: string, key: keyof ChannelConfig, val: string | string[]) {
    setForm(prev => ({
      ...prev,
      channels: prev.channels.map(c => c.platformId === platformId ? { ...c, [key]: val } : c),
    }));
  }

  function handleNext() {
    // Basic validation before going to next step
    if (currentStep === 1) {
      if (!form.alias?.trim()) {
        setErrors(["alias"]);
        return;
      }
    }
    if (currentStep === 3) {
      if (form.channels.length === 0) {
        setErrors(["channels"]);
        return;
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, 4));
  }

  function handleBack() {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }

  function handleSubmit() {
    const missing: string[] = [];
    if (!form.alias?.trim()) missing.push("alias");
    if (form.channels.length === 0) missing.push("channels");
    if (missing.length) {
      setErrors(missing);
      // Auto-navigate to the step with error
      if (missing.includes("alias")) setCurrentStep(1);
      else if (missing.includes("channels")) setCurrentStep(3);
      return; 
    }
    onSave(form);
  }

  if (!mounted) return null;

  const title = isCreate ? "Nuevo Proyecto" : mode === "edit" ? "Editar Proyecto" : "Detalle del Proyecto";
  
  const fanpageOptions = metaPages.map(p => ({
    value: p.name, label: p.name, picture: p.picture, portfolio: p.portfolio
  }));
  
  const instagramOptions = metaPages
    .filter(p => p.instagram)
    .map(p => ({
      value: `@${p.instagram!.username}`, label: `@${p.instagram!.username}`, picture: p.instagram!.picture, portfolio: p.portfolio
    }));

  const uniqueVerticals = Array.from(new Set([...VERTICALS, ...projects.map(p => p.vertical).filter(Boolean)]));
  const verticalOptions = uniqueVerticals.map(v => ({ value: v, label: v }));
  
  const uniqueClients = Array.from(new Set(projects.map(p => p.client).filter(Boolean)));
  const clientOptions = uniqueClients.map(c => ({ value: c, label: c }));

  const connectedProvidersStr = (activeIntegrations || []).map(i => i.provider).join(",").toLowerCase();
  const platformConnected = (id: string): boolean => {
    if (id === "meta") return /meta|facebook|instagram/.test(connectedProvidersStr);
    if (id === "google") return /google/.test(connectedProvidersStr);
    if (id === "tiktok") return /tiktok/.test(connectedProvidersStr);
    if (id === "whatsapp") return /whatsapp/.test(connectedProvidersStr);
    return false;
  };

  const steps = [
    { id: 1, title: "Identidad", icon: <Users className="w-4 h-4" /> },
    { id: 2, title: "Redes Sociales", icon: <Globe className="w-4 h-4" /> },
    { id: 3, title: "Canales Publicitarios", icon: <DollarSign className="w-4 h-4" /> },
    { id: 4, title: "Audiencia", icon: <Target className="w-4 h-4" /> },
  ];

  // If not create mode, we can show everything at once, or keep the wizard. 
  // Let's keep the wizard for consistency but allow clicking tabs to jump.
  
  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto p-4 sm:p-6 bg-[#0a0f1e]/80 backdrop-blur-sm">
      <div onClick={e => e.stopPropagation()} className="w-full max-w-2xl bg-[#0d121f] border border-white/10 rounded-xl shadow-2xl flex flex-col my-auto relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#111827]">
          <h2 className="text-sm font-bold text-white tracking-widest uppercase">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="px-6 py-4 border-b border-white/5 bg-[#0d121f]">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/5 -z-10 -translate-y-1/2"></div>
            {steps.map((step) => (
              <button 
                key={step.id}
                onClick={() => {
                  // Only allow jumping tabs if not in create mode, or if previous steps are valid
                  if (!isCreate || step.id < currentStep) setCurrentStep(step.id);
                }}
                className={`flex flex-col items-center gap-2 bg-[#0d121f] px-2 ${
                  currentStep === step.id ? "text-blue-400" : currentStep > step.id ? "text-emerald-500 cursor-pointer hover:text-emerald-400" : "text-gray-500 cursor-not-allowed"
                } ${!isCreate ? "cursor-pointer hover:text-blue-300" : ""}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors bg-[#0d121f] ${
                  currentStep === step.id ? "border-blue-400 text-blue-400" : 
                  currentStep > step.id ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : 
                  "border-gray-700 text-gray-500"
                }`}>
                  {currentStep > step.id && isCreate ? <Check className="w-4 h-4" /> : step.icon}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">{step.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 min-h-[300px]">
          
          {/* STEP 1: Identidad */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="space-y-4">
                <div>
                  <label className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 block ${errors.includes("alias") ? "text-red-400" : "text-gray-400"}`}>
                    Alias del Proyecto {errors.includes("alias") && "*"}
                  </label>
                  <input type="text" value={form.alias} readOnly={ro} placeholder="Ej. Lanzamiento Q3"
                    className={`f-input w-full bg-white/5 border ${errors.includes("alias") ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"} rounded px-3 py-2 text-sm text-white outline-none transition-colors`}
                    onChange={e => set("alias", e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block text-gray-400">Cliente</label>
                    <CustomCreatableSelect
                      value={form.client}
                      options={clientOptions}
                      onChange={(val: string) => set("client", val)}
                      placeholder="Nombre de la marca..."
                      ro={ro}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block text-gray-400">Vertical / Industria</label>
                    <CustomCreatableSelect
                      value={form.vertical}
                      options={verticalOptions}
                      onChange={(val: string) => set("vertical", val)}
                      placeholder="Seleccionar..."
                      ro={ro}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Redes */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block text-gray-400">Fanpages (Facebook)</label>
                  <CustomMultiSelectPictures
                    values={Array.isArray(form.fanpage) ? form.fanpage : form.fanpage ? [form.fanpage] : []}
                    options={fanpageOptions}
                    onChange={(vals: string[]) => setForm(prev => ({ ...prev, fanpage: vals }))}
                    placeholder="Seleccionar Fanpages..."
                    ro={ro}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block text-gray-400">Instagram</label>
                  <CustomMultiSelectPictures
                    values={Array.isArray(form.instagram) ? form.instagram : form.instagram ? [form.instagram] : []}
                    options={instagramOptions}
                    onChange={(vals: string[]) => setForm(prev => ({ ...prev, instagram: vals }))}
                    placeholder="Seleccionar Instagram..."
                    ro={ro}
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block text-gray-400">Página Web (URL)</label>
                <input type="url" value={form.website} readOnly={ro} placeholder="https://sitio.com" 
                  className="f-input w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded px-3 py-2 text-sm text-white outline-none transition-colors" 
                  onChange={e => set("website", e.target.value)} />
              </div>
            </div>
          )}

          {/* STEP 3: Canales */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300">
              <div>
                <label className={`text-[11px] font-bold uppercase tracking-wider mb-2 block ${errors.includes("channels") ? "text-red-400" : "text-gray-400"}`}>
                  Plataformas a integrar {errors.includes("channels") && "(Selecciona al menos 1)"}
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {PLATFORMS.map(pl => {
                    const selected = form.channels.some(c => c.platformId === pl.id);
                    const isConnected = platformConnected(pl.id);
                    const disabled = !isConnected && !selected;
                    return (
                      <button
                        key={pl.id}
                        onClick={() => !disabled && toggleChannel(pl.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded border transition-all ${
                          selected ? `border-current bg-current/10` : 
                          disabled ? "border-white/5 text-gray-600 cursor-not-allowed opacity-50" : 
                          "border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300"
                        }`}
                        style={{ color: selected ? pl.color : undefined }}
                      >
                        {selected && <Check className="w-3 h-3" />}
                        {pl.name}
                        {!isConnected && !selected && <span className="text-[9px] opacity-60 font-normal">(offline)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.channels.length === 0 && !errors.includes("channels") && (
                <div className="text-center py-8 text-gray-500 text-xs border border-dashed border-white/10 rounded-lg">
                  Selecciona una plataforma arriba para configurar sus cuentas y presupuesto.
                </div>
              )}

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {form.channels.map(ch => {
                  const pl = PLATFORMS.find(p => p.id === ch.platformId) || { name: ch.platformId, color: "#3b82f6" };
                  const accounts = adAccountsByPlatform[ch.platformId] || [];

                  return (
                    <div key={ch.platformId} className="border rounded-lg p-4" style={{ borderColor: `${pl.color}30`, backgroundColor: `${pl.color}05` }}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pl.color }} />
                          <span className="font-bold text-[11px] tracking-widest uppercase" style={{ color: pl.color }}>{pl.name}</span>
                        </div>
                        {!ro && (
                          <button onClick={() => toggleChannel(ch.platformId)} className="text-gray-500 hover:text-red-400 transition-colors p-1">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="mb-4">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Cuentas Publicitarias</label>
                        <CustomMultiSelect 
                          values={ch.adAccounts}
                          options={accounts}
                          onChange={(vals: string[]) => setChannel(ch.platformId, "adAccounts", vals)}
                          placeholder="Seleccionar cuentas..."
                          ro={ro}
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Budget</label>
                          <input type="text" value={ch.budget} readOnly={ro} placeholder="$0.00"
                            className="f-input w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500/50 transition-colors"
                            onChange={e => setChannel(ch.platformId, "budget", e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Período</label>
                          <select className="f-select w-full bg-[#111827] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500/50 transition-colors" value={ch.period} disabled={ro}
                            onChange={e => setChannel(ch.platformId, "period", e.target.value)}>
                            {["Diario","Semanal","Mensual","Anual"].map(b => <option key={b}>{b}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Meta</label>
                          <select className="f-select w-full bg-[#111827] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500/50 transition-colors" value={ch.goal} disabled={ro}
                            onChange={e => setChannel(ch.platformId, "goal", e.target.value)}>
                            <option value="">—</option>{GOALS.map(g => <option key={g}>{g}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">{CPR_MAP[ch.goal] || "CPR"}</label>
                          <input type="text" value={ch.cpr} readOnly={ro} placeholder="$0.00"
                            className="f-input w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500/50 transition-colors"
                            onChange={e => setChannel(ch.platformId, "cpr", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Audiencia */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block text-gray-400">Buyer Persona</label>
                  <input type="text" value={form.persona} readOnly={ro} placeholder="Mujeres 25-40, fitness" 
                    className="f-input w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded px-3 py-2 text-sm text-white outline-none transition-colors" 
                    onChange={e => set("persona", e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block text-gray-400">Geo-Targeting</label>
                  <input type="text" value={form.geo} readOnly={ro} placeholder="País / Ciudad" 
                    className="f-input w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded px-3 py-2 text-sm text-white outline-none transition-colors" 
                    onChange={e => set("geo", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block text-gray-400">Fecha Inicio</label>
                  <input type="date" value={form.dateStart} readOnly={ro} 
                    className="f-input w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded px-3 py-2 text-sm text-white outline-none transition-colors [color-scheme:dark]" 
                    onChange={e => set("dateStart", e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block text-gray-400">Fecha Fin</label>
                  <input type="date" value={form.dateEnd} readOnly={ro} 
                    className="f-input w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded px-3 py-2 text-sm text-white outline-none transition-colors [color-scheme:dark]" 
                    onChange={e => set("dateEnd", e.target.value)} />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#111827] flex items-center justify-between">
          {!ro ? (
            <>
              {currentStep > 1 ? (
                <button onClick={handleBack} className="text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Atrás
                </button>
              ) : (
                <button onClick={onClose} className="text-[11px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors">
                  Cancelar
                </button>
              )}
              
              {currentStep < 4 ? (
                <button onClick={handleNext} className="bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 px-5 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1">
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleSubmit} className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/20 px-6 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  {isCreate ? "Crear Proyecto" : "Guardar Cambios"}
                </button>
              )}
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button onClick={onClose} className="bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 px-6 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-all">
                Cerrar
              </button>
            </div>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}
