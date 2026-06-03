"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import {
  FolderKanban, Plus, X, Users, Globe, DollarSign, Target, Rocket,
  Trash2, Edit3, Eye, MoreHorizontal, Check, ChevronDown, AlertTriangle
} from "lucide-react";

/* ═══════════════════════════════════════
   TYPES
   ═══════════════════════════════════════ */

interface ChannelConfig {
  platformId: string;
  platformName: string;
  adAccounts: string[];
  budget: string;
  period: string;
  goal: string;
  cpr: string;
}

interface Project {
  id: string;
  name?: string;
  alias: string;
  client: string;
  vertical: string;
  fanpage: string[];
  instagram: string[];
  whatsapp: string[];
  website: string;
  channels: ChannelConfig[];
  dateStart: string;
  dateEnd: string;
  persona: string;
  geo: string;
  status: "EN VUELO" | "EN ÓRBITA" | "Draft" | "Completado";
  workspaceId?: string;
  createdAt: string;
  updatedAt?: string;
}

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

const EMPTY_PROJECT: Omit<Project, "id" | "createdAt"> = {
  alias: "", client: "", vertical: "", fanpage: [], instagram: [],
  whatsapp: [], website: "", channels: [],
  dateStart: "", dateEnd: "", persona: "", geo: "",
  status: "Draft",
};

/* ═══════════════════════════════════════
   DATA
   ═══════════════════════════════════════ */

const VERTICALS = [
  "E-commerce", "Real Estate", "Fintech", "Health & Wellness", "Education",
  "Food & Beverage", "Automotive", "SaaS / Tech", "Fashion", "Travel",
];

const PLATFORMS = [
  { id: "meta",      name: "Meta Ads",            connected: true,  color: "#0081FB" },
  { id: "google",    name: "Google Ads",           connected: false, color: "#4285F4" },
  { id: "tiktok",    name: "TikTok Ads",           connected: false, color: "#25F4EE" },
  { id: "whatsapp",  name: "WhatsApp Business",    connected: false, color: "#25D366" },
];

const GOALS = [
  "Conversaciones", "Clics al sitio", "Seguidores", "Leads",
  "Ventas (Purchase)", "Registros", "Descargas app", "Video views",
  "Alcance (Reach)", "Tráfico a tienda",
];
const CPR_MAP: Record<string, string> = {
  "Conversaciones": "Costo / conversación",
  "Clics al sitio": "CPC", "Seguidores": "Costo / seguidor",
  "Leads": "CPL", "Ventas (Purchase)": "CPA",
  "Registros": "Costo / registro", "Descargas app": "CPI",
  "Video views": "CPV", "Alcance (Reach)": "CPM",
  "Tráfico a tienda": "Costo / visita",
};
const STATUSES = ["EN VUELO", "EN ÓRBITA", "Draft", "Completado"] as const;
const STATUS_COLORS: Record<string, string> = {
  "EN VUELO": "emerald", "EN ÓRBITA": "amber", Draft: "muted", Completado: "cyan",
};

/* ═══════════════════════════════════════
   PERSISTENCE — API (database)
   ═══════════════════════════════════════ */

async function fetchProjectsFromAPI(): Promise<Project[]> {
  try {
    const res = await fetch("/api/projects");
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.success) return [];
    return (json.data || []).map((p: any) => ({
      ...p,
      alias: p.alias || p.name || "",
      channels: (p.channels || []).map((ch: any) => {
        const cfg = ch.config || {};
        return {
          platformId: cfg.platformId || ch.type?.toLowerCase() || ch.name?.toLowerCase() || "",
          platformName: cfg.platformName || ch.name || "",
          adAccounts: cfg.adAccounts || [],
          budget: cfg.budget || "",
          period: cfg.period || "Mensual",
          goal: cfg.goal || "",
          cpr: cfg.cpr || "",
        };
      }),
    }));
  } catch { return []; }
}

/* ═══════════════════════════════════════
   STYLES
   ═══════════════════════════════════════ */

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 12px", fontSize: "13px", color: "var(--foreground)",
  background: "var(--surface)", border: "1px solid var(--border)",
  outline: "none", fontFamily: "inherit", transition: "border-color 0.15s",
};
const sel: React.CSSProperties = {
  ...inp, appearance: "none" as const, cursor: "pointer", paddingRight: "28px",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='rgba(148,163,184,0.4)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
};

/* ═══════════════════════════════════════
   CUSTOM UI COMPONENTS
   ═══════════════════════════════════════ */

function CustomSelect({ value, options, onChange, placeholder, disabled, ro }: any) {
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

  const selected = options.find((o: any) => o.value === value);
  const filtered = options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()));

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
        style={{ ...inp, cursor: ro || disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: disabled ? 0.5 : 1 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
          {selected?.picture && <img src={selected.picture} alt="" style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} />}
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: selected ? "var(--foreground)" : "rgba(148,163,184,0.55)" }}>
            {selected ? selected.label : placeholder}
          </span>
        </div>
        {!ro && <ChevronDown className="w-3 h-3" style={{ opacity: 0.5 }} />}
      </div>
      {open && !ro && !disabled && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "rgba(10,15,30,0.95)", border: "1px solid rgba(0,212,255,0.2)", backdropFilter: "blur(10px)", maxHeight: "200px", overflowY: "auto", marginTop: "4px" }}>
          <div style={{ padding: "8px", position: "sticky", top: 0, background: "rgba(10,15,30,0.95)", zIndex: 10 }}>
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              style={{ ...inp, padding: "6px 8px", fontSize: "11px", background: "rgba(0,0,0,0.3)" }} 
            />
          </div>
          {Object.entries(grouped).map(([portfolio, items]) => (
            <div key={portfolio}>
              <div style={{ padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.1em", background: "rgba(0,212,255,0.05)", borderTop: "1px solid rgba(0,212,255,0.1)", borderBottom: "1px solid rgba(0,212,255,0.1)" }}>
                {portfolio}
              </div>
              {items.map((o: any) => (
                <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); setSearch(""); }} 
                     style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "11px", color: "var(--foreground)" }} 
                     onMouseEnter={e => e.currentTarget.style.background = "rgba(0,212,255,0.1)"} 
                     onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  {o.picture && <img src={o.picture} alt="" style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} />}
                  {o.label}
                </div>
              ))}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: "10px", fontSize: "11px", color: "rgba(148,163,184,0.5)", textAlign: "center" }}>Sin opciones disponibles</div>}
        </div>
      )}
    </div>
  );
}

function CustomMultiSelectPictures({ values, options, onChange, placeholder, disabled, ro }: any) {
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
        onClick={() => !ro && !disabled && setOpen(!open)}
        style={{ ...inp, cursor: ro || disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "34px", height: "auto" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
          {values.length === 0 ? <span style={{ color: "rgba(148,163,184,0.5)" }}>{placeholder}</span> :
            values.map((v: string) => {
              const opt = options.find((o: any) => o.value === v);
              return (
                <span key={v} style={{ fontSize: "10px", padding: "3px 8px", background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)", color: "var(--cyan)", borderRadius: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
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
      {open && !ro && !disabled && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "rgba(10,15,30,0.95)", border: "1px solid rgba(0,212,255,0.2)", backdropFilter: "blur(10px)", maxHeight: "200px", overflowY: "auto", marginTop: "4px" }}>
          <div style={{ padding: "8px", position: "sticky", top: 0, background: "rgba(10,15,30,0.95)", zIndex: 10 }}>
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              style={{ ...inp, padding: "6px 8px", fontSize: "11px", background: "rgba(0,0,0,0.3)" }}
            />
          </div>
          {Object.entries(grouped).map(([portfolio, items]) => (
            <div key={portfolio}>
              <div style={{ padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.1em", background: "rgba(0,212,255,0.05)", borderTop: "1px solid rgba(0,212,255,0.1)", borderBottom: "1px solid rgba(0,212,255,0.1)" }}>
                {portfolio}
              </div>
              {items.map((o: any) => {
                const selected = values.includes(o.value);
                return (
                  <div key={o.value} onClick={() => {
                    if (selected) onChange(values.filter((v: string) => v !== o.value));
                    else onChange([...values, o.value]);
                  }} style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "11px", color: selected ? "var(--cyan)" : "var(--foreground)", background: selected ? "rgba(0,212,255,0.05)" : "transparent" }} onMouseEnter={e => e.currentTarget.style.background = selected ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.05)"} onMouseLeave={e => e.currentTarget.style.background = selected ? "rgba(0,212,255,0.05)" : "transparent"}>
                    <div style={{ width: 12, height: 12, border: `1px solid ${selected ? "#00d4ff" : "rgba(255,255,255,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", background: selected ? "#00d4ff" : "transparent" }}>
                      {selected && <Check className="w-2 h-2 text-black" />}
                    </div>
                    {o.picture && <img src={o.picture} alt="" style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} />}
                    {o.label}
                  </div>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: "10px", fontSize: "11px", color: "rgba(148,163,184,0.5)", textAlign: "center" }}>Sin opciones disponibles</div>}
        </div>
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
    <div style={{ ...inp, display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap", minHeight: "34px", height: "auto", cursor: ro ? "not-allowed" : "text" }}>
      {values.map((v, i) => (
        <span key={i} style={{ fontSize: "10px", padding: "3px 8px", background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.3)", color: "#25D366", borderRadius: "3px", display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}>
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
        style={{ ...inp, cursor: ro || disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "34px", height: "auto" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
          {values.length === 0 ? <span style={{ color: "rgba(148,163,184,0.5)" }}>{placeholder}</span> : 
            values.map((v: string) => {
              const opt = options.find((o: any) => o.id === v);
              return (
                <span key={v} style={{ fontSize: "10px", padding: "3px 8px", background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)", color: "var(--cyan)", borderRadius: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
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
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "rgba(10,15,30,0.95)", border: "1px solid rgba(0,212,255,0.2)", backdropFilter: "blur(10px)", maxHeight: "200px", overflowY: "auto", marginTop: "4px" }}>
          <div style={{ padding: "8px", position: "sticky", top: 0, background: "rgba(10,15,30,0.95)", zIndex: 10 }}>
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              style={{ ...inp, padding: "6px 8px", fontSize: "11px", background: "rgba(0,0,0,0.3)" }} 
            />
          </div>
          {Object.entries(grouped).map(([portfolio, items]) => (
            <div key={portfolio}>
              <div style={{ padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.1em", background: "rgba(0,212,255,0.05)", borderTop: "1px solid rgba(0,212,255,0.1)", borderBottom: "1px solid rgba(0,212,255,0.1)" }}>
                {portfolio}
              </div>
              {items.map((o: any) => {
                const selected = values.includes(o.id);
                return (
                  <div key={o.id} onClick={() => {
                    if (selected) onChange(values.filter((v: string) => v !== o.id));
                    else onChange([...values, o.id]);
                  }} style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "11px", color: selected ? "var(--cyan)" : "var(--foreground)", background: selected ? "rgba(0,212,255,0.05)" : "transparent" }} onMouseEnter={e => e.currentTarget.style.background = selected ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.05)"} onMouseLeave={e => e.currentTarget.style.background = selected ? "rgba(0,212,255,0.05)" : "transparent"}>
                    <div style={{ width: 12, height: 12, border: `1px solid ${selected ? "#00d4ff" : "rgba(255,255,255,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", background: selected ? "#00d4ff" : "transparent" }}>
                      {selected && <Check className="w-2 h-2 text-black" />}
                    </div>
                    {o.name}
                  </div>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: "10px", fontSize: "11px", color: "rgba(148,163,184,0.5)", textAlign: "center" }}>No hay cuentas publicitarias</div>}
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
        style={{ ...inp, cursor: ro || disabled ? "not-allowed" : "text", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: disabled ? 0.5 : 1, padding: 0 }}
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
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "rgba(10,15,30,0.95)", border: "1px solid rgba(0,212,255,0.2)", backdropFilter: "blur(10px)", maxHeight: "200px", overflowY: "auto", marginTop: "4px" }}>
          {filtered.map((o: any) => (
            <div key={o.value} onClick={() => { onChange(o.value); setSearch(o.value); setOpen(false); }} 
                 style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "11px", color: "var(--foreground)" }} 
                 onMouseEnter={e => e.currentTarget.style.background = "rgba(0,212,255,0.1)"} 
                 onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              {o.label}
            </div>
          ))}
          {search && !exactMatch && (
            <div onClick={() => { onChange(search); setOpen(false); }} 
                 style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "11px", color: "var(--emerald)" }} 
                 onMouseEnter={e => e.currentTarget.style.background = "rgba(6,214,160,0.1)"} 
                 onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <Plus className="w-3 h-3" /> Crear "{search}"
            </div>
          )}
          {filtered.length === 0 && !search && <div style={{ padding: "10px", fontSize: "11px", color: "rgba(148,163,184,0.5)", textAlign: "center" }}>Empieza a escribir...</div>}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   PAGE
   ═══════════════════════════════════════ */

export default function ProyectosPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<"closed" | "create" | "edit" | "view">("closed");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // FIX: removed fake Google/TikTok/WhatsApp hardcoded accounts.
  // Only Meta is connected. Other platforms show "(próximamente)" via PLATFORMS.connected=false.
  const [adAccounts, setAdAccounts] = useState<Record<string, { id: string; name: string; portfolio?: string }[]>>({
    meta: [],
    google: [],
    tiktok: [],
    whatsapp: [],
  });

  const [metaPages, setMetaPages] = useState<MetaPage[]>([]);

  const fetchMetaAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/meta/adaccounts");
      if (res.ok) {
        const json = await res.json();
        if (json.data) setAdAccounts(prev => ({ ...prev, meta: json.data }));
      }
    } catch (err) { console.error("Failed to fetch meta ad accounts", err); }
  }, []);

  const fetchMetaPages = useCallback(async () => {
    try {
      const res = await fetch("/api/meta/pages");
      if (res.ok) {
        const json = await res.json();
        if (json.data) setMetaPages(json.data);
      }
    } catch (err) { console.error("Failed to fetch meta pages", err); }
  }, []);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const data = await fetchProjectsFromAPI();
    setProjects(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProjects();
    fetchMetaAccounts();
    fetchMetaPages();
    const interval = setInterval(() => {
      fetchMetaAccounts();
      fetchMetaPages();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadProjects, fetchMetaAccounts, fetchMetaPages]);

  // Transform ChannelConfig[] to DB Channel format for API
  function channelsToApi(channels: ChannelConfig[]) {
    return channels.map(c => ({
      name: c.platformName,
      type: c.platformId.toUpperCase(),
      config: {
        platformId: c.platformId,
        platformName: c.platformName,
        adAccounts: c.adAccounts,
        budget: c.budget,
        period: c.period,
        goal: c.goal,
        cpr: c.cpr,
      },
    }));
  }

  async function handleCreate(data: Omit<Project, "id" | "createdAt">) {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, name: data.alias, channels: channelsToApi(data.channels) }),
      });
      const json = await res.json();
      if (json.success) {
        await loadProjects();
        setModalMode("closed"); // FIX: only close on success
      } else {
        console.error("Failed to create project:", json.error);
        // Keep modal open so user doesn't lose their data
      }
    } catch (err) {
      console.error("Failed to create project", err);
      // Keep modal open — don't swallow error silently
    }
  }

  async function handleUpdate(data: Omit<Project, "id" | "createdAt">) {
    if (!editingId) return;
    const prev = [...projects];
    setProjects(projects.map(p => p.id === editingId ? { ...p, ...data } : p));
    try {
      const res = await fetch(`/api/projects/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, name: data.alias, channels: channelsToApi(data.channels) }),
      });
      const json = await res.json();
      if (!json.success) setProjects(prev);
      else await loadProjects();
    } catch { setProjects(prev); }
    setModalMode("closed"); setEditingId(null);
  }

  async function handleDelete(id: string) {
    const prev = [...projects];
    setProjects(projects.filter(p => p.id !== id)); // optimistic
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        setProjects(prev); // rollback
        console.error("Failed to delete project:", json.error);
      }
    } catch {
      setProjects(prev); // rollback on network error
    }
    setDeleteConfirm(null);
    setMenuOpen(null);
  }

  async function handleStatusChange(id: string, s: Project["status"]) {
    const prev = [...projects];
    setProjects(projects.map(p => p.id === id ? { ...p, status: s } : p));
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: s }),
      });
      const json = await res.json();
      if (!json.success) setProjects(prev);
    } catch { setProjects(prev); }
    setMenuOpen(null);
  }

  const editingProject = editingId ? projects.find(p => p.id === editingId) : null;
  const activeCount = projects.filter(p => p.status === "EN VUELO").length;
  const totalBudget = projects.reduce((acc, p) => {
    return acc + p.channels.reduce((a, c) => a + (parseFloat(c.budget.replace(/[^0-9.]/g, "")) || 0), 0);
  }, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proyectos"
        description="Gestiona tus proyectos de clientes, campañas y presupuestos."
        icon={<FolderKanban className="w-6 h-6" style={{ color: "#06d6a0" }} />}
        action={
          <button className="btn-primary" onClick={() => { setEditingId(null); setModalMode("create"); }} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus className="w-4 h-4" /> Nuevo Proyecto
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard color="emerald" icon={<FolderKanban className="w-4 h-4" />} value={projects.length} label="Total Proyectos" />
        <KpiCard color="cyan" icon={<Target className="w-4 h-4" />} value={activeCount} label="En Vuelo" trend="up" trendValue={`${((activeCount / Math.max(projects.length, 1)) * 100).toFixed(0)}% activos`} />
        <KpiCard color="amber" icon={<DollarSign className="w-4 h-4" />} value={`$${totalBudget.toLocaleString()}`} label="Budget Total" />
      </div>

      {/* List */}
      <div className="glass-panel" style={{ overflow: "visible" }}>
        <div className="section-header">
          <span className="section-title">Todos los Proyectos</span>
          <span className="badge badge-emerald">{projects.length}</span>
        </div>

        {loading ? (
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {[1, 2, 3].map(i => <Skeleton key={i} style={{ height: "64px", width: "100%", borderRadius: "8px" }} />)}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<Rocket className="w-12 h-12" />}
            title="Ningún proyecto en radar"
            description="Aún no tienes misiones activas. Crea tu primer proyecto para empezar a gestionar campañas."
            actionLabel="NUEVA MISIÓN"
            actionIcon={<Plus className="w-4 h-4" />}
            onAction={() => { setEditingId(null); setModalMode("create"); }}
          />
        ) : projects.map(p => (
          <div key={p.id} className="data-row" style={{ position: "relative" }}>
            <div className="flex items-center gap-3" style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
              onClick={() => router.push(`/dashboard/proyectos/${p.id}`)}>
              <div className="status-indicator" style={{
                background: p.status === "EN VUELO" ? "var(--emerald)" : p.status === "EN ÓRBITA" ? "var(--amber)" : p.status === "Completado" ? "var(--cyan)" : "rgba(148,163,184,0.3)",
                boxShadow: p.status === "EN VUELO" ? "0 0 8px var(--emerald)" : "none",
              }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{p.alias || "Sin nombre"}</p>
                <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.4)", marginTop: "1px" }}>
                  {p.vertical}{p.channels.length ? ` · ${p.channels.map(c => c.platformName).join(", ")}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
              {p.channels.slice(0, 3).map(c => {
                const pl = PLATFORMS.find(x => x.id === c.platformId);
                return <span key={c.platformId} style={{ fontSize: "10px", padding: "3px 8px", border: `1px solid ${pl?.color || "var(--border)"}`, color: pl?.color || "#94a3b8", fontWeight: 600, letterSpacing: "0.05em" }}>{c.platformName}</span>;
              })}
              {p.channels.length > 3 && <span style={{ fontSize: "9px", color: "rgba(148,163,184,0.3)" }}>+{p.channels.length - 3}</span>}
              <span className={`badge badge-${STATUS_COLORS[p.status]}`}>{p.status}</span>
              <button onClick={(e) => {
                e.stopPropagation();
                if (menuOpen === p.id) { setMenuOpen(null); return; }
                const rect = e.currentTarget.getBoundingClientRect();
                setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                setMenuOpen(p.id);
              }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(148,163,184,0.3)", padding: "4px" }}>
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Context Menu Portal */}
      {menuOpen && createPortal(
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 9990 }} onClick={() => setMenuOpen(null)} />
          <div style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 9991, background: "rgba(5,8,18,0.98)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: "6px", minWidth: "180px", padding: "4px 0", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
            <MenuBtn icon={<Eye className="w-3.5 h-3.5" />} text="Abrir Dashboard" onClick={() => { router.push(`/dashboard/proyectos/${menuOpen}`); setMenuOpen(null); }} />
            <MenuBtn icon={<Edit3 className="w-3.5 h-3.5" />} text="Editar Proyecto" onClick={() => { setEditingId(menuOpen); setModalMode("edit"); setMenuOpen(null); }} />
            <div style={{ height: "1px", background: "rgba(255,255,255,0.04)", margin: "4px 0" }} />
            {STATUSES.filter(s => s !== projects.find(pp => pp.id === menuOpen)?.status).map(s => (
              <MenuBtn key={s} icon={<div style={{ width: 6, height: 6, borderRadius: "50%", background: s === "EN VUELO" ? "var(--emerald)" : s === "EN ÓRBITA" ? "var(--amber)" : s === "Completado" ? "var(--cyan)" : "rgba(148,163,184,0.3)" }} />}
                text={`Cambiar a ${s}`} onClick={() => handleStatusChange(menuOpen, s)} />
            ))}
            <div style={{ height: "1px", background: "rgba(255,255,255,0.04)", margin: "4px 0" }} />
            <MenuBtn icon={<Trash2 className="w-3.5 h-3.5" />} text="Eliminar" onClick={() => { setDeleteConfirm(menuOpen); setMenuOpen(null); }} danger />
          </div>
        </>,
        document.body
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: "rgba(5,8,18,0.98)", border: "1px solid rgba(226,68,92,0.25)", borderRadius: 8, padding: 24, maxWidth: 400, width: "90%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <AlertTriangle style={{ width: 20, height: 20, color: "#e2445c" }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Eliminar Proyecto</h3>
            </div>
            <p style={{ fontSize: 12, color: "rgba(148,163,184,0.6)", marginBottom: 20, lineHeight: 1.6 }}>
              ¿Estás seguro de que deseas eliminar <strong style={{ color: "white" }}>{projects.find(p => p.id === deleteConfirm)?.alias || "este proyecto"}</strong>? Esta acción no se puede deshacer. Se eliminarán todos los canales, configuraciones y datos asociados.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ fontSize: 11, fontWeight: 600, padding: "8px 20px", border: "1px solid rgba(148,163,184,0.15)", color: "rgba(148,163,184,0.6)", background: "transparent", cursor: "pointer", borderRadius: 4 }}>Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ fontSize: 11, fontWeight: 600, padding: "8px 20px", border: "1px solid rgba(226,68,92,0.4)", color: "#e2445c", background: "rgba(226,68,92,0.08)", cursor: "pointer", borderRadius: 4 }}>Sí, eliminar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {modalMode !== "closed" && (
        <ProjectModal
          mode={modalMode}
          initial={editingProject || EMPTY_PROJECT}
          adAccountsByPlatform={adAccounts}
          metaPages={metaPages}
          onClose={() => { setModalMode("closed"); setEditingId(null); }}
          onSave={editingId ? handleUpdate : handleCreate}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   MODAL
   ═══════════════════════════════════════ */

function ProjectModal({ mode, initial, adAccountsByPlatform, metaPages, onClose, onSave }: {
  mode: "create" | "edit" | "view";
  initial: Omit<Project, "id" | "createdAt">;
  adAccountsByPlatform: Record<string, { id: string; name: string; portfolio?: string }[]>;
  metaPages: MetaPage[];
  onClose: () => void;
  onSave: (d: Omit<Project, "id" | "createdAt">) => void;
}) {
  const [form, setForm] = useState({ ...initial, channels: [...(initial.channels || []).map(c => ({ ...c, adAccounts: [...c.adAccounts] }))] });
  const [errors, setErrors] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const ro = mode === "view";

  useEffect(() => { setMounted(true); }, []);

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

  const verticalOptions = VERTICALS.map(v => ({ value: v, label: v }));

  return createPortal(
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      overflowY: "auto", padding: "3vh 16px",
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)",
    }}>
      <div onClick={e => e.stopPropagation()} className="page-enter" style={{
        width: "640px", maxWidth: "100%",
        background: "var(--surface)", border: "1px solid var(--border-strong)",
        flexShrink: 0, marginBottom: "3vh",
      }}>
        <div style={{ height: "2px", background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />

        {/* Header */}
        <div style={{ padding: "16px 24px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "13px", fontWeight: 700, color: "white", letterSpacing: "0.1em" }}>{title}</h2>
          <button onClick={onClose} style={{ color: "rgba(148,163,184,0.4)", cursor: "pointer", background: "none", border: "none", transition: "color 0.15s" }} onMouseEnter={e => e.currentTarget.style.color = "rgba(148,163,184,0.8)"} onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,0.4)"}><X className="w-5 h-5" /></button>
        </div>

        <div style={{ padding: "20px 24px 24px" }}>

          {/* ── Identidad ── */}
          <Sec icon={<Users className="w-3 h-3" />} text="Identidad del Proyecto" />
          <Row>
            <Field l="Alias del proyecto" error={errors.includes("alias")} el={
              <input type="text" value={form.alias} readOnly={ro} placeholder="Ej. Lanzamiento Q3"
                style={{ ...inp, ...(errors.includes("alias") ? { borderColor: "var(--red)" } : {}) }}
                onChange={e => set("alias", e.target.value)} />
            } />
            <Field l="Cliente" el={
              <input type="text" value={form.client} readOnly={ro} placeholder="Nombre de la marca"
                style={inp}
                onChange={e => set("client", e.target.value)} />
            } />
          </Row>
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
            {/* Vacío para mantener el grid parejo, o se puede reacomodar */}
            <div />
          </Row>

          {/* ── Redes ── */}
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
            <Field l="WhatsApp" el={
              <TagsInput
                values={Array.isArray(form.whatsapp) ? form.whatsapp : form.whatsapp ? [form.whatsapp] : []}
                onChange={(vals) => setForm(prev => ({ ...prev, whatsapp: vals }))}
                placeholder="+52 55 1234 5678 (Enter para agregar)"
                ro={ro}
              />
            } />
            <Field l="Página Web" el={<input type="url" value={form.website} readOnly={ro} placeholder="https://sitio.com" style={inp} onChange={e => set("website", e.target.value)} />} />
          </Row>

          {/* ── Channel selector ── */}
          <Sec icon={<DollarSign className="w-3 h-3" />} text={`Canales Publicitarios${errors.includes("channels") ? " — Selecciona al menos 1" : ""}`} />

          {/* Platform checkboxes */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
            {PLATFORMS.map(pl => {
              const selected = form.channels.some(c => c.platformId === pl.id);
              const disabled = !pl.connected && !selected;
              return (
                <button
                  key={pl.id}
                  onClick={() => !disabled && toggleChannel(pl.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "6px 12px", fontSize: "11px", fontWeight: 600,
                    border: `1px solid ${selected ? pl.color : disabled ? "rgba(148,163,184,0.08)" : "rgba(148,163,184,0.15)"}`,
                    background: selected ? `${pl.color}12` : "transparent",
                    color: selected ? pl.color : disabled ? "rgba(148,163,184,0.3)" : "rgba(148,163,184,0.55)",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.5 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  {selected && <Check className="w-3 h-3" />}
                  {pl.name}
                  {!pl.connected && !selected && <span style={{ fontSize: "9px", opacity: 0.6 }}>(offline)</span>}
                </button>
              );
            })}
          </div>

          {/* ── Per-channel config cards ── */}
          {form.channels.map(ch => {
            const pl = PLATFORMS.find(p => p.id === ch.platformId) || { name: ch.platformId, color: "#00d4ff" };
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
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: pl.color }}>{pl.name}</span>
                  </div>
                  {!ro && (
                    <button onClick={() => toggleChannel(ch.platformId)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(148,163,184,0.3)", fontSize: "10px" }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Ad accounts multi-select dropdown */}
                <label style={{ display: "block", fontSize: "10px", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(148,163,184,0.5)", marginBottom: "6px" }}>
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
                    <label style={{ display: "block", fontSize: "10px", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(148,163,184,0.45)", marginBottom: "4px" }}>Budget</label>
                    <input type="text" value={ch.budget} readOnly={ro} placeholder="$0.00"
                      style={{ ...inp, fontSize: "11px", padding: "6px 8px" }}
                      onChange={e => setChannel(ch.platformId, "budget", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(148,163,184,0.45)", marginBottom: "4px" }}>Período</label>
                    <select style={{ ...sel, fontSize: "11px", padding: "6px 8px" }} value={ch.period} disabled={ro}
                      onChange={e => setChannel(ch.platformId, "period", e.target.value)}>
                      {["Diario","Semanal","Mensual","Anual"].map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(148,163,184,0.45)", marginBottom: "4px" }}>Meta</label>
                    <select style={{ ...sel, fontSize: "11px", padding: "6px 8px" }} value={ch.goal} disabled={ro}
                      onChange={e => setChannel(ch.platformId, "goal", e.target.value)}>
                      <option value="">—</option>{GOALS.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(148,163,184,0.45)", marginBottom: "4px" }}>{CPR_MAP[ch.goal] || "CPR"}</label>
                    <input type="text" value={ch.cpr} readOnly={ro} placeholder="$0.00"
                      style={{ ...inp, fontSize: "11px", padding: "6px 8px" }}
                      onChange={e => setChannel(ch.platformId, "cpr", e.target.value)} />
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── Audiencia ── */}
          <Sec icon={<Users className="w-3 h-3" />} text="Audiencia & Calendario" />
          <Row>
            <Field l="Buyer Persona" el={<input type="text" value={form.persona} readOnly={ro} placeholder="Mujeres 25-40, fitness" style={inp} onChange={e => set("persona", e.target.value)} />} />
            <Field l="Geo-Targeting" el={<input type="text" value={form.geo} readOnly={ro} placeholder="País / Ciudad" style={inp} onChange={e => set("geo", e.target.value)} />} />
          </Row>
          <Row>
            <Field l="Fecha Inicio" el={<input type="date" value={form.dateStart} readOnly={ro} style={{ ...inp, colorScheme: "dark" }} onChange={e => set("dateStart", e.target.value)} />} />
            <Field l="Fecha Fin" el={<input type="date" value={form.dateEnd} readOnly={ro} style={{ ...inp, colorScheme: "dark" }} onChange={e => set("dateEnd", e.target.value)} />} />
          </Row>

          {/* Actions */}
          {!ro ? (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
              <button onClick={onClose} style={{
                fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
                padding: "8px 20px", border: "1px solid rgba(148,163,184,0.12)", color: "rgba(148,163,184,0.5)",
                background: "transparent", cursor: "pointer", transition: "all 0.15s", borderRadius: "4px",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.3)"; e.currentTarget.style.color = "rgba(148,163,184,0.8)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.12)"; e.currentTarget.style.color = "rgba(148,163,184,0.5)"; }}
              >Cancelar</button>
              <button onClick={handleSubmit} className="btn-primary" style={{
                padding: "8px 24px", background: "rgba(6,214,160,0.08)",
                borderColor: "rgba(6,214,160,0.35)", color: "var(--emerald)",
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

/* ═══════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════ */



function MenuBtn({ icon, text, onClick, danger }: { icon: React.ReactNode; text: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: "8px", width: "100%",
      padding: "7px 14px", fontSize: "11px", border: "none", background: "none",
      color: danger ? "var(--red)" : "rgba(200,214,229,0.7)", cursor: "pointer", textAlign: "left",
    }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,212,255,0.05)")}
      onMouseLeave={e => (e.currentTarget.style.background = "none")}
    >{icon}{text}</button>
  );
}

function Sec({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", marginTop: "16px" }}>
      <span style={{ color: "var(--cyan)", opacity: 0.4 }}>{icon}</span>
      <span style={{ fontFamily: "var(--font-display)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(148,163,184,0.45)" }}>{text}</span>
      <span style={{ flex: 1, height: "1px", background: "var(--border)" }} />
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "12px" }}>{children}</div>;
}
function Field({ l, el, error }: { l: string; el: React.ReactNode; error?: boolean }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "10px", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: error ? "var(--red)" : "rgba(148,163,184,0.5)", marginBottom: "5px" }}>{l}{error ? " *" : ""}</label>
      {el}
    </div>
  );
}
