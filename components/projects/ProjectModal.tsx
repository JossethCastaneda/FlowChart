import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown, Check, Plus, AlertTriangle, Users, Globe, DollarSign } from "lucide-react";
import type { Project, ChannelConfig } from "@/types/project";
import {
  PLATFORMS, VERTICALS, GOALS, BOT_PLATFORM_CHANNELS, GOOGLE_PLATFORM, NO_BOT_PLATFORM,
  CPR_MAP, type BotChannel
} from "@/lib/project-constants";
import { normalizeIntegrationProvider, PROVIDER_LABELS } from "@/lib/analytics/project-scope";

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

function CustomMultiSelectPictures({ values, options, onChange, placeholder, disabled, ro }: any) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const id = React.useId().replace(/:/g, "");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (document.getElementById(`portal-${id}`)?.contains(event.target as Node)) {
        return;
      }
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [id]);

  const handleToggle = () => {
    if (ro || disabled) return;
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width });
    }
    setOpen(!open);
  };

  const filtered = options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()));
  const grouped: Record<string, any[]> = {};
  filtered.forEach((o: any) => {
    const p = o.portfolio || "Páginas";
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(o);
  });

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <div
        onClick={handleToggle}
        className="f-input" style={{ cursor: ro || disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "34px", height: "auto" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
          {values.length === 0 ? <span style={{ color: "var(--text-muted)" }}>{placeholder}</span> :
            values.map((v: string) => {
              const opt = options.find((o: any) => o.value === v);
              return (
                <span key={v} style={{ fontSize: "10px", padding: "3px 8px", background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--cyan)", borderRadius: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                  {opt?.picture && <img src={opt.picture} alt="" style={{ width: 12, height: 12, borderRadius: "50%", objectFit: "cover" }} />}
                  {opt ? opt.label : v}
                  {!ro && <X className="w-2 h-2" style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); onChange(values.filter((x: string) => x !== v)); }} />}
                </span>
              );
            })
          }
        </div>
        {!ro && <ChevronDown className="w-3 h-3" style={{ opacity: 0.5, flexShrink: 0 }} />}
      </div>
      {open && !ro && !disabled && createPortal(
        <div id={`portal-${id}`} style={{ position: "absolute", top: coords.top + 4, left: coords.left, width: coords.width, zIndex: 99999, background: "var(--panel-bg)", border: "1px solid rgba(59,130,246,0.2)",  maxHeight: "200px", overflowY: "auto", boxShadow: "0 8px 30px rgba(0,0,0,0.5)", borderRadius: 8 }}>
          <div style={{ padding: "8px", position: "sticky", top: 0, background: "var(--panel-bg)", zIndex: 10 }}>
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              className="f-input" style={{ padding: "6px 8px", fontSize: "11px", background: "var(--surface-hover)" }}
            />
          </div>
          {Object.entries(grouped).map(([portfolio, items]) => (
            <div key={portfolio}>
              <div style={{ padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.1em", background: "var(--cyan-dim)", borderTop: "1px solid rgba(59,130,246,0.1)", borderBottom: "1px solid rgba(59,130,246,0.1)" }}>
                {portfolio}
              </div>
              {items.map((o: any) => {
                const selected = values.includes(o.value);
                return (
                  <div key={o.value} onClick={() => {
                    if (selected) onChange(values.filter((v: string) => v !== o.value));
                    else onChange([...values, o.value]);
                  }} style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "11px", color: selected ? "var(--cyan)" : "var(--foreground)", background: selected ? "rgba(59,130,246,0.05)" : "transparent" }} onMouseEnter={e => e.currentTarget.style.background = selected ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.1)"} onMouseLeave={e => e.currentTarget.style.background = selected ? "rgba(59,130,246,0.05)" : "transparent"}>
                    <div style={{ width: 12, height: 12, border: `1px solid ${selected ? "var(--cyan)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", background: selected ? "var(--cyan)" : "transparent" }}>
                      {selected && <Check className="w-2 h-2 text-[var(--foreground)]" />}
                    </div>
                    {o.picture && <img src={o.picture} alt="" style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} />}
                    {o.label}
                  </div>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: "10px", fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>Sin opciones disponibles</div>}
        </div>,
        document.body
      )}
    </div>
  );
}

function TagsInput({ values, onChange, placeholder, ro }: { values: string[]; onChange: (v: string[]) => void; placeholder: string; ro?: boolean }) {
  const [input, setInput] = useState("");

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      const val = input.trim();
      if (val && !values.includes(val)) {
        onChange([...values, val]);
      }
      setInput("");
    } else if (e.key === "Backspace" && !input && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className="f-input" style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap", minHeight: "34px", height: "auto", cursor: ro ? "not-allowed" : "text" }}>
      {values.map((v, i) => (
        <span key={i} style={{ fontSize: "10px", padding: "3px 8px", background: "var(--emerald-dim)", border: "1px solid rgba(37,211,102,0.3)", color: "#25D366", borderRadius: "3px", display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}>
          {v}
          {!ro && <X className="w-2 h-2" style={{ cursor: "pointer" }} onClick={() => onChange(values.filter((_, j) => j !== i))} />}
        </span>
      ))}
      {!ro && (
        <input
          type="tel"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            const val = input.trim();
            if (val && !values.includes(val)) {
              onChange([...values, val]);
            }
            setInput("");
          }}
          placeholder={values.length === 0 ? placeholder : "Agregar..."}
          style={{ flex: 1, minWidth: "80px", background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: "13px", padding: "0" }}
        />
      )}
    </div>
  );
}

function CustomMultiSelect({ values, options, onChange, placeholder, disabled, ro }: any) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o: any) => o.name.toLowerCase().includes(search.toLowerCase()));
  
  const grouped: Record<string, any[]> = {};
  filtered.forEach((o: any) => {
    const p = o.portfolio || "Independientes";
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(o);
  });

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <div 
        onClick={() => !ro && !disabled && setOpen(!open)}
        className="f-input" style={{ cursor: ro || disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "34px", height: "auto" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
          {values.length === 0 ? <span style={{ color: "var(--text-muted)" }}>{placeholder}</span> : 
            values.map((v: string) => {
              const opt = options.find((o: any) => o.id === v);
              return (
                <span key={v} style={{ fontSize: "10px", padding: "3px 8px", background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--cyan)", borderRadius: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                  {opt ? opt.name : v} 
                  {!ro && <X className="w-2 h-2" style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); onChange(values.filter((x: string) => x !== v)); }} />}
                </span>
              );
            })
          }
        </div>
        {!ro && <ChevronDown className="w-3 h-3" style={{ opacity: 0.5, flexShrink: 0 }} />}
      </div>
      {open && !ro && !disabled && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--panel-bg)", border: "1px solid rgba(59,130,246,0.2)",  maxHeight: "200px", overflowY: "auto", marginTop: "4px" }}>
          <div style={{ padding: "8px", position: "sticky", top: 0, background: "var(--panel-bg)", zIndex: 10 }}>
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              className="f-input" style={{ padding: "6px 8px", fontSize: "11px", background: "var(--surface-hover)" }} 
            />
          </div>
          {Object.entries(grouped).map(([portfolio, items]) => (
            <div key={portfolio}>
              <div style={{ padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.1em", background: "var(--cyan-dim)", borderTop: "1px solid rgba(59,130,246,0.1)", borderBottom: "1px solid rgba(59,130,246,0.1)" }}>
                {portfolio}
              </div>
              {items.map((o: any) => {
                const selected = values.includes(o.id);
                return (
                  <div key={o.id} onClick={() => {
                    if (selected) onChange(values.filter((v: string) => v !== o.id));
                    else onChange([...values, o.id]);
                  }} style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "11px", color: selected ? "var(--cyan)" : "var(--foreground)", background: selected ? "rgba(59,130,246,0.05)" : "transparent" }} onMouseEnter={e => e.currentTarget.style.background = selected ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.1)"} onMouseLeave={e => e.currentTarget.style.background = selected ? "rgba(59,130,246,0.05)" : "transparent"}>
                    <div style={{ width: 12, height: 12, border: `1px solid ${selected ? "var(--cyan)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", background: selected ? "var(--cyan)" : "transparent" }}>
                      {selected && <Check className="w-2 h-2 text-[var(--foreground)]" />}
                    </div>
                    {o.name}
                  </div>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: "10px", fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>No hay cuentas publicitarias</div>}
        </div>
      )}
    </div>
  );
}

function CustomCreatableSelect({ value, options, onChange, placeholder, disabled, ro }: any) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()));
  const exactMatch = options.some((o: any) => o.label.toLowerCase() === search.toLowerCase());

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <div 
        onClick={() => !ro && !disabled && setOpen(true)}
        className="f-input" style={{ cursor: ro || disabled ? "not-allowed" : "text", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: disabled ? 0.5 : 1, padding: 0 }}
      >
        <input 
          type="text" 
          placeholder={placeholder}
          value={open ? search : value}
          onChange={e => { setSearch(e.target.value); setOpen(true); onChange(e.target.value); }}
          onFocus={() => { setOpen(true); setSearch(value); }}
          readOnly={ro || disabled}
          style={{ width: "100%", height: "100%", background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: "13px", padding: "10px 12px" }}
        />
        {!ro && <ChevronDown className="w-3 h-3" style={{ opacity: 0.5, marginRight: "10px", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setOpen(!open); }} />}
      </div>
      {open && !ro && !disabled && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--panel-bg)", border: "1px solid rgba(59,130,246,0.2)",  maxHeight: "200px", overflowY: "auto", marginTop: "4px" }}>
          {filtered.map((o: any) => (
            <div key={o.value} onClick={() => { onChange(o.value); setSearch(o.value); setOpen(false); }} 
                 style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "11px", color: "var(--foreground)" }} 
                 onMouseEnter={e => e.currentTarget.style.background = "rgba(59,130,246,0.1)"} 
                 onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              {o.label}
            </div>
          ))}
          {search && !exactMatch && (
            <div onClick={() => { onChange(search); setOpen(false); }} 
                 style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "11px", color: "var(--emerald)" }} 
                 onMouseEnter={e => e.currentTarget.style.background = "rgba(52,183,124,0.1)"} 
                 onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <Plus className="w-3 h-3" /> Crear "{search}"
            </div>
          )}
          {filtered.length === 0 && !search && <div style={{ padding: "10px", fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>Empieza a escribir...</div>}
        </div>
      )}
    </div>
  );
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
  const ro = mode === "view";

  useEffect(() => { setMounted(true); }, []);

  const analyticsIntegrations: any[] = [];
  const isGooglePlatform = false;
  const isNoBot = true;
  const selectedBotProvider = null;
  const showWhatsapp = false;
  const showWebchat = false;
  const showInstagram = false;
  const showFacebook = false;
  const botChannelsAvail = null;
  const loadingChannels = false;
  const totalAvail = 0;
  // El botón "Autollenar" ya no se usa porque ahora los canales se eligen en 
  // listas desplegables (CustomMultiSelectPictures) directamente.

  // Sugerir/autoseleccionar cuando hay EXACTAMENTE una integración analítica y
  // el proyecto nuevo aún no tiene ninguna asociada. Con varias, selección manual.
  useEffect(() => {
    if (mode === "view") return;
    if (analyticsIntegrations.length === 1 && !form.crmIntegrationId && !(form.crmIntegrationIds && form.crmIntegrationIds.length)) {
      const only = analyticsIntegrations[0];
      setForm((prev) => ({ ...prev, crmIntegrationId: only.id, crmIntegrationIds: [only.id], crmType: only.provider }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIntegrations.length]);

  function set(k: string, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
    setErrors(prev => prev.filter(e => e !== k));
  }

  /* ─── Channel toggle ─── */
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
  }

  /* ─── Channel config update ─── */
  function setChannel(platformId: string, key: keyof ChannelConfig, val: string | string[]) {
    setForm(prev => ({
      ...prev,
      channels: prev.channels.map(c => c.platformId === platformId ? { ...c, [key]: val } : c),
    }));
  }

  function handleSubmit() {
    const missing: string[] = [];
    if (!form.alias) missing.push("alias");
    if (form.channels.length === 0) missing.push("channels");
    if (missing.length) { setErrors(missing); return; }
    onSave(form);
  }

  if (!mounted) return null;

  const title = mode === "create" ? "Nuevo Proyecto" : mode === "edit" ? "Editar Proyecto" : "Detalle";
  const accent = mode === "create" ? "var(--emerald)" : mode === "edit" ? "var(--amber)" : "var(--cyan)";
  
  const fanpageOptions = metaPages.map(p => ({
    value: p.name,
    label: p.name,
    picture: p.picture,
    portfolio: p.portfolio
  }));
  
  const instagramOptions = metaPages
    .filter(p => p.instagram)
    .map(p => ({
      value: `@${p.instagram!.username}`,
      label: `@${p.instagram!.username}`,
      picture: p.instagram!.picture,
      portfolio: p.portfolio
    }));

  const uniqueVerticals = Array.from(new Set([...VERTICALS, ...projects.map(p => p.vertical).filter(Boolean)]));
  const verticalOptions = uniqueVerticals.map(v => ({ value: v, label: v }));
  
  const uniqueClients = Array.from(new Set(projects.map(p => p.client).filter(Boolean)));
  const clientOptions = uniqueClients.map(c => ({ value: c, label: c }));

  // Estado de conexión REAL por plataforma publicitaria — deriva de las
  // integraciones conectadas del workspace (no de un flag hardcodeado), para que
  // Google/TikTok/WhatsApp se habiliten automáticamente al conectarse.
  const connectedProvidersStr = (activeIntegrations || []).map(i => i.provider).join(",").toLowerCase();
  const platformConnected = (id: string): boolean => {
    if (id === "meta") return /meta|facebook|instagram/.test(connectedProvidersStr);
    if (id === "google") return /google/.test(connectedProvidersStr);
    if (id === "tiktok") return /tiktok/.test(connectedProvidersStr);
    if (id === "whatsapp") return /whatsapp/.test(connectedProvidersStr);
    return false;
  };

  // ── Revelado progresivo ──
  // En modo "create" las secciones aparecen conforme se llenan los datos: el
  // formulario empieza minimal (solo Identidad) y va revelando lo siguiente.
  // En edit/view se muestran siempre (ya hay datos que enseñar) o si la sección
  // ya tiene contenido. Esto simplifica el alta sin esconder datos existentes.
  const progressive = mode === "create";
  const filled = (...vals: unknown[]) => vals.some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)));
  const aliasFilled = Boolean(form.alias && form.alias.trim());
  const botChoiceMade = true;
  const flowStarted = aliasFilled && botChoiceMade;
  const manualBotChannels = true;
  const hasBotChannelUI = false;
  const anyBotChannelSelected = false;
  const botStepDone = true;
  const reveal = {
    identityRest: !progressive || aliasFilled,
    botPlatform: false,
    botChannels: false,
    redes: !progressive || filled(form.fanpage, form.instagram, form.website),
    adChannels: !progressive || form.channels.length > 0,
    audiencia: !progressive || form.channels.length > 0 || filled(form.persona, form.geo, form.dateStart, form.dateEnd),
  };

  return createPortal(
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      overflowY: "auto", padding: "3vh 16px",
      background: "var(--panel-bg)", 
    }}>
      <div onClick={e => e.stopPropagation()} className="page-enter" style={{
        width: "640px", maxWidth: "100%",
        background: "var(--surface)", border: "1px solid var(--border-strong)",
        flexShrink: 0, marginBottom: "3vh",
      }}>
        <div style={{ height: "2px", background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />

        {/* Header */}
        <div style={{ padding: "16px 24px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "13px", fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.1em" }}>{title}</h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)", cursor: "pointer", background: "none", border: "none", transition: "color 0.15s" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-secondary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}><X className="w-5 h-5" /></button>
        </div>

        <div style={{ padding: "20px 24px 24px" }}>

          {/* ── Identidad ── */}
          <Sec icon={<Users className="w-3 h-3" />} text="Identidad del Proyecto" />
          <Row>
            <Field l="Alias del proyecto" error={errors.includes("alias")} el={
              <input type="text" value={form.alias} readOnly={ro} placeholder="Ej. Lanzamiento Q3"
                className="f-input" style={{ ...(errors.includes("alias") ? { borderColor: "var(--red)" } : {}) }}
                onChange={e => set("alias", e.target.value)} />
            } />
            <Field l="Cliente" el={
              <CustomCreatableSelect
                value={form.client}
                options={clientOptions}
                onChange={(val: string) => set("client", val)}
                placeholder="Nombre de la marca o seleccionar..."
                ro={ro}
              />
            } />
          </Row>
          {reveal.botPlatform && (
          <Row>
            <Field l="Vertical" el={
              <CustomCreatableSelect
                value={form.vertical}
                options={verticalOptions}
                onChange={(val: string) => set("vertical", val)}
                placeholder="Seleccionar o escribir..."
                ro={ro}
              />
            } />
          </Row>
          )}

          {/* ── Redes Sociales (Meta) ── */}
          {reveal.redes && (
          <>
          <Sec icon={<Globe className="w-3 h-3" />} text="Redes Sociales" />
          <Row>
            <Field l="Fanpages" el={
              <CustomMultiSelectPictures
                values={Array.isArray(form.fanpage) ? form.fanpage : form.fanpage ? [form.fanpage] : []}
                options={fanpageOptions}
                onChange={(vals: string[]) => setForm(prev => ({ ...prev, fanpage: vals }))}
                placeholder="Seleccionar Fanpages..."
                ro={ro}
              />
            } />
            <Field l="Instagram" el={
              <CustomMultiSelectPictures
                values={Array.isArray(form.instagram) ? form.instagram : form.instagram ? [form.instagram] : []}
                options={instagramOptions}
                onChange={(vals: string[]) => setForm(prev => ({ ...prev, instagram: vals }))}
                placeholder="Seleccionar Instagram..."
                ro={ro}
              />
            } />
          </Row>
          <Row>
            <Field l="Página Web" el={<input type="url" value={form.website} readOnly={ro} placeholder="https://sitio.com" className="f-input" onChange={e => set("website", e.target.value)} />} />
          </Row>
          </>
          )}

          {/* ── Channel selector ── */}
          {reveal.adChannels && (
          <>
          <Sec icon={<DollarSign className="w-3 h-3" />} text={`Canales Publicitarios${errors.includes("channels") ? " — Selecciona al menos 1" : ""}`} />

          {/* Platform checkboxes */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
            {PLATFORMS.map(pl => {
              const selected = form.channels.some(c => c.platformId === pl.id);
              const isConnected = platformConnected(pl.id);
              const disabled = !isConnected && !selected;
              return (
                <button
                  key={pl.id}
                  onClick={() => !disabled && toggleChannel(pl.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "6px 12px", fontSize: "11px", fontWeight: 600,
                    border: `1px solid ${selected ? pl.color : disabled ? "rgba(148,163,184,0.16)" : "rgba(148,163,184,0.22)"}`,
                    background: selected ? `${pl.color}12` : "transparent",
                    color: selected ? pl.color : disabled ? "rgba(148,163,184,0.65)" : "var(--text-muted)",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.5 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  {selected && <Check className="w-3 h-3" />}
                  {pl.name}
                  {!isConnected && !selected && <span style={{ fontSize: "9px", opacity: 0.6 }}>(offline)</span>}
                </button>
              );
            })}
          </div>

          {/* ── Per-channel config cards ── */}
          {form.channels.map(ch => {
            const pl = PLATFORMS.find(p => p.id === ch.platformId) || { name: ch.platformId, color: "var(--cyan)" };
            const accounts = adAccountsByPlatform[ch.platformId] || [];

            return (
              <div key={ch.platformId} style={{
                border: `1px solid ${pl.color}30`,
                background: `${pl.color}05`,
                marginBottom: "12px",
                padding: "14px 16px",
              }}>
                {/* Channel header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: pl.color }} />
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: pl.color }}>{pl.name}</span>
                  </div>
                  {!ro && (
                    <button onClick={() => toggleChannel(ch.platformId)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "10px" }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Ad accounts multi-select dropdown */}
                <label style={{ display: "block", fontSize: "10px", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "6px" }}>
                  Cuentas Publicitarias
                </label>
                <div style={{ marginBottom: "12px" }}>
                  <CustomMultiSelect 
                    values={ch.adAccounts}
                    options={accounts}
                    onChange={(vals: string[]) => setChannel(ch.platformId, "adAccounts", vals)}
                    placeholder="Seleccionar cuentas..."
                    ro={ro}
                  />
                </div>

                {/* Metrics row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>Budget</label>
                    <input type="text" value={ch.budget} readOnly={ro} placeholder="$0.00"
                      className="f-input" style={{ fontSize: "11px", padding: "6px 8px" }}
                      onChange={e => setChannel(ch.platformId, "budget", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>Período</label>
                    <select className="f-select" style={{ fontSize: "11px", padding: "6px 8px" }} value={ch.period} disabled={ro}
                      onChange={e => setChannel(ch.platformId, "period", e.target.value)}>
                      {["Diario","Semanal","Mensual","Anual"].map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>Meta</label>
                    <select className="f-select" style={{ fontSize: "11px", padding: "6px 8px" }} value={ch.goal} disabled={ro}
                      onChange={e => setChannel(ch.platformId, "goal", e.target.value)}>
                      <option value="">—</option>{GOALS.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>{CPR_MAP[ch.goal] || "CPR"}</label>
                    <input type="text" value={ch.cpr} readOnly={ro} placeholder="$0.00"
                      className="f-input" style={{ fontSize: "11px", padding: "6px 8px" }}
                      onChange={e => setChannel(ch.platformId, "cpr", e.target.value)} />
                  </div>
                </div>
              </div>
            );
          })}
          </>
          )}

          {/* ── Audiencia ── */}
          {reveal.audiencia && (
          <>
          <Sec icon={<Users className="w-3 h-3" />} text="Audiencia & Calendario" />
          <Row>
            <Field l="Buyer Persona" el={<input type="text" value={form.persona} readOnly={ro} placeholder="Mujeres 25-40, fitness" className="f-input" onChange={e => set("persona", e.target.value)} />} />
            <Field l="Geo-Targeting" el={<input type="text" value={form.geo} readOnly={ro} placeholder="País / Ciudad" className="f-input" onChange={e => set("geo", e.target.value)} />} />
          </Row>
          <Row>
            <Field l="Fecha Inicio" el={<input type="date" value={form.dateStart} readOnly={ro} className="f-input" style={{ colorScheme: "dark" }} onChange={e => set("dateStart", e.target.value)} />} />
            <Field l="Fecha Fin" el={<input type="date" value={form.dateEnd} readOnly={ro} className="f-input" style={{ colorScheme: "dark" }} onChange={e => set("dateEnd", e.target.value)} />} />
          </Row>
          </>
          )}

          {/* Actions */}
          {!ro ? (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
              <button onClick={onClose} style={{
                fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
                padding: "8px 20px", border: "1px solid var(--border)", color: "var(--text-muted)",
                background: "transparent", cursor: "pointer", transition: "all 0.15s", borderRadius: "4px",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.65)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.12)"; e.currentTarget.style.color = "var(--text-muted)"; }}
              >Cancelar</button>
              <button onClick={handleSubmit} className="btn-primary" style={{
                padding: "8px 24px", background: "var(--surface)",
                borderColor: "rgba(52,183,124,0.35)", color: "var(--emerald)",
              }}>{mode === "create" ? "Crear Proyecto" : "Guardar"}</button>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
              <button onClick={onClose} className="btn-primary" style={{ padding: "8px 24px" }}>Cerrar</button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
function Sec({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="f-section">
      {icon}
      <span>{text}</span>
      <span style={{ flex: 1, height: "1px", background: "var(--hairline)", marginLeft: "8px" }} />
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="f-row">{children}</div>;
}
function Field({ l, el, error }: { l: string; el: React.ReactNode; error?: boolean }) {
  return (
    <div>
      <label className="f-label" data-error={error ? "true" : undefined}>{l}{error ? " *" : ""}</label>
      {el}
    </div>
  );
}
