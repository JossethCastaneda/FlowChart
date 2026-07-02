"use client";
import { ProjectModal } from "@/components/projects/ProjectModal";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Orbi } from "@/components/ui/Orbi";
import { KpiCard } from "@/components/ui/KpiCard";
import {
  FolderKanban, Plus, X, Users, Globe, DollarSign, Target, Rocket,
  Trash2, Edit3, Eye, MoreHorizontal, Check, ChevronDown, AlertTriangle, CheckCircle, Search
} from "lucide-react";
import { PlanLimitBanner } from "@/components/settings/PlanUsageMeter";
import type { Project, ChannelConfig } from "@/types/project";
import { ProjectCard } from "@/components/projects/ProjectCard";
import {
  PLATFORMS, VERTICALS, GOALS, BOT_PLATFORM_CHANNELS, GOOGLE_PLATFORM, NO_BOT_PLATFORM,
  CPR_MAP, STATUSES, STATUS_COLORS, type BotChannel
} from "@/lib/project-constants";

/* ═══════════════════════════════════════
   TYPES
   ═══════════════════════════════════════ */

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
  whatsapp: [], webchat: [], website: "", channels: [],
  dateStart: "", dateEnd: "", persona: "", geo: "",
  status: "Draft",
};

/* ═══════════════════════════════════════
   DATA
   ═══════════════════════════════════════ */



/* ═══════════════════════════════════════
   PERSISTENCE — API (database)
   ═══════════════════════════════════════ */

type FetchResult =
  | { ok: true; data: Project[] }
  | { ok: false; status: number; code: string; message: string };

async function fetchProjectsFromAPI(retries = 2): Promise<FetchResult> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      if (!res.ok) {
        let code = "HTTP_ERROR";
        let message = `Error ${res.status} al cargar proyectos.`;
        try {
          const json = await res.json();
          code = json.code || code;
          message = json.error || message;
        } catch { /* ignore parse error */ }
        if (res.status === 401) {
          // Stale/orphan session — gracefully sign out
          if (typeof window !== "undefined") {
            signOut({ callbackUrl: "/login?reason=session_expired" });
          }
          return { ok: false, status: res.status, code, message: "Tu sesión expiró. Redirigiendo al login..." };
        }
        // Retry on server errors (500+) if we have attempts left
        if (res.status >= 500 && attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return { ok: false, status: res.status, code, message };
      }
      const json = await res.json();
      if (!json.success) {
        return { ok: false, status: 200, code: json.code || "API_ERROR", message: json.error || "Error al cargar proyectos." };
      }
      return { ok: true, data: (json.data || []).map((p: any) => ({
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
      })) };
    } catch (err: unknown) {
      // Retry on network errors if we have attempts left
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      const msg = err instanceof Error ? err.message : "Error de red al cargar proyectos.";
      return { ok: false, status: 0, code: "NETWORK_ERROR", message: msg };
    }
  }
  // Should never reach here, but satisfy TypeScript
  return { ok: false, status: 0, code: "NETWORK_ERROR", message: "Error de red al cargar proyectos." };
}

/* ═══════════════════════════════════════
   STYLES
   ═══════════════════════════════════════ */

/* Using f-input and f-select from forms.css */

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
        className="f-input" style={{ cursor: ro || disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: disabled ? 0.5 : 1 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
          {selected?.picture && <img src={selected.picture} alt="" style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} />}
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: selected ? "var(--foreground)" : "var(--text-muted)" }}>
            {selected ? selected.label : placeholder}
          </span>
        </div>
        {!ro && <ChevronDown className="w-3 h-3" style={{ opacity: 0.5 }} />}
      </div>
      {open && !ro && !disabled && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--panel-bg)", border: "1px solid rgba(0,212,255,0.2)", backdropFilter: "blur(10px)", maxHeight: "200px", overflowY: "auto", marginTop: "4px" }}>
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
          {filtered.length === 0 && <div style={{ padding: "10px", fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>Sin opciones disponibles</div>}
        </div>
      )}
    </div>
  );
}

export default function ProyectosPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Cargando Proyectos...</div>}>
      <ProyectosContent />
    </Suspense>
  );
}

function ProyectosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"closed" | "create" | "edit" | "view">("closed");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeIntegrations, setActiveIntegrations] = useState<{id: string, provider: string}[]>([]);

  // Búsqueda y filtros de la lista (multi-cliente: filtrar por cliente/estatus)
  const [query, setQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Meta Ads connection status
  const [adsConnected, setAdsConnected] = useState<boolean | null>(null);
  const [justConnected, setJustConnected] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (searchParams.get("connected") === "ads") {
      setJustConnected(true);
    }
    fetch("/api/connect/status")
      .then((r) => r.json())
      .then((data) => {
        const adsMod = data?.modules?.ads;
        setAdsConnected(adsMod?.connected ?? false);
      })
      .catch(() => setAdsConnected(false));
  }, []);

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
      const res = await fetch("/api/meta/pages?module=social");
      if (res.ok) {
        const json = await res.json();
        if (json.data) setMetaPages(json.data);
      }
    } catch (err) { console.error("Failed to fetch meta pages", err); }
  }, []);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/integrations");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data?.data)) setActiveIntegrations(json.data.data.filter((i: any) => i.connected));
      }
    } catch (err) { console.error("Failed to fetch integrations", err); }
  }, []);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const result = await fetchProjectsFromAPI();
    if (result.ok) {
      setProjects(result.data);
    } else {
      setProjects([]);
      if (result.status === 401) {
        // Session expired or invalid — redirect to login
        window.location.href = "/login?callbackUrl=" + encodeURIComponent("/dashboard/proyectos");
        return;
      } else if (result.code === "NO_WORKSPACE") {
        setFetchError("No tienes un workspace configurado aún. Completa el onboarding o solicita una invitación.");
      } else {
        setFetchError(result.message);
      }
    }
    setLoading(false);
  }, []);


  useEffect(() => {
    loadProjects();
    fetchMetaAccounts();
    fetchMetaPages();
    fetchIntegrations();
    const interval = setInterval(() => {
      fetchMetaAccounts();
      fetchMetaPages();
      fetchIntegrations();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadProjects, fetchMetaAccounts, fetchMetaPages, fetchIntegrations]);

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
        setModalMode("closed");
        setBanner({ type: "success", message: "Proyecto creado exitosamente." });
      } else {
        console.error("Failed to create project:", json.error);
        setBanner({ type: "error", message: json.error || "Ocurrió un error al crear el proyecto." });
      }
    } catch (err: any) {
      console.error("Failed to create project", err);
      setBanner({ type: "error", message: err.message || "Error de red al crear el proyecto." });
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
      if (!json.success) {
        setProjects(prev);
        setBanner({ type: "error", message: json.error || "Error al actualizar el proyecto." });
      } else {
        await loadProjects();
        setModalMode("closed");
        setEditingId(null);
        setBanner({ type: "success", message: "Proyecto actualizado correctamente." });
      }
    } catch (err: any) { 
      setProjects(prev);
      setBanner({ type: "error", message: err.message || "Error de red al actualizar." });
    }
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
        setBanner({ type: "error", message: json.error || "Error al eliminar el proyecto." });
      } else {
        setBanner({ type: "success", message: "Proyecto eliminado permanentemente." });
      }
    } catch (err: any) {
      setProjects(prev); // rollback on network error
      setBanner({ type: "error", message: err.message || "Error de red al eliminar." });
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
      if (!json.success) {
        setProjects(prev);
        setBanner({ type: "error", message: json.error || "Error al cambiar el estatus." });
      } else {
        setBanner({ type: "success", message: `Estatus cambiado a ${s}.` });
      }
    } catch (err: any) { 
      setProjects(prev);
      setBanner({ type: "error", message: err.message || "Error de red al cambiar estatus." });
    }
    setMenuOpen(null);
  }

  const editingProject = editingId ? projects.find(p => p.id === editingId) : null;
  const activeCount = projects.filter(p => p.status === "EN VUELO" || p.status === "Activo").length;

  // Clientes distintos (para el filtro multi-cliente)
  const clients = Array.from(new Set(projects.map(p => (p.client || "").trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, "es"));

  const normalizedQuery = query.trim().toLowerCase();
  const visibleProjects = projects.filter(p => {
    if (clientFilter && (p.client || "").trim() !== clientFilter) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    if (normalizedQuery) {
      const haystack = `${p.alias || ""} ${p.client || ""} ${p.vertical || ""}`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }
    return true;
  });
  const isFiltering = Boolean(normalizedQuery || clientFilter || statusFilter);
  const totalBudget = projects.reduce((acc, p) => {
    return acc + p.channels.reduce((a, c) => a + (parseFloat(c.budget.replace(/[^0-9.]/g, "")) || 0), 0);
  }, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proyectos"
        description="Gestiona tus proyectos de clientes, campañas y presupuestos."
        icon={<FolderKanban className="w-6 h-6" style={{ color: "var(--emerald)" }} />}
        action={
          <button className="btn-primary" onClick={() => { setEditingId(null); setModalMode("create"); }} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus className="w-4 h-4" /> Nuevo Proyecto
          </button>
        }
      />

      <PlanLimitBanner
        feature="projects"
        onUpgrade={() => window.location.href = "/dashboard/settings?section=plan"}
      />

      {banner && (
        <div style={{
          padding: "12px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
          background: banner.type === "success" ? "rgba(6,214,160,0.15)" : "rgba(226,68,92,0.15)",
          color: banner.type === "success" ? "var(--emerald)" : "var(--red)",
          border: `1px solid ${banner.type === "success" ? "rgba(6,214,160,0.4)" : "rgba(226,68,92,0.4)"}`,
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <span>{banner.message}</span>
          <button onClick={() => setBanner(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", opacity: 0.8 }}><X className="w-4 h-4" /></button>
        </div>
      )}

      {fetchError && (
        <div style={{
          padding: "12px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
          background: "rgba(251,191,36,0.12)", color: "var(--amber)",
          border: "1px solid rgba(251,191,36,0.35)",
          display: "flex", alignItems: "center", gap: "10px"
        }}>
          <AlertTriangle className="w-4 h-4" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{fetchError}</span>
          <button onClick={() => { setFetchError(null); loadProjects(); }} style={{ background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.4)", color: "inherit", cursor: "pointer", padding: "4px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: 600 }}>Reintentar</button>
          <button onClick={() => setFetchError(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", opacity: 0.8 }}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard color="emerald" icon={<FolderKanban className="w-4 h-4" />} value={projects.length} label="Total Proyectos" />
        <KpiCard color="cyan" icon={<Target className="w-4 h-4" />} value={activeCount} label="En Vuelo" trend="up" trendValue={`${((activeCount / Math.max(projects.length, 1)) * 100).toFixed(0)}% activos`} />
        <KpiCard color="amber" icon={<DollarSign className="w-4 h-4" />} value={`$${totalBudget.toLocaleString()}`} label="Budget Total" />
      </div>

      {/* ── META ADS CONNECTION PANEL ── */}
      {adsConnected === false ? (
        <div style={{
          position: "relative",
          display: "flex", alignItems: "center", gap: "16px",
          padding: "16px 20px",
          background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.06) 50%, rgba(236,72,153,0.08) 100%)",
          border: "1px solid rgba(168,85,247,0.2)",
          borderRadius: "12px",
          overflow: "hidden",
        }}>
          {/* Animated gradient accent line */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "2px",
            background: "linear-gradient(90deg, var(--purple), var(--purple), var(--red), var(--purple))",
            backgroundSize: "200% 100%",
            animation: "shimmer 3s linear infinite",
          }} />
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0,
            background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))",
            boxShadow: "0 0 20px rgba(168,85,247,0.15)",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)", margin: 0, lineHeight: 1.3 }}>
              Conecta Meta Ads Manager
            </p>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "3px 0 0", lineHeight: 1.4 }}>
              Vincula tus cuentas publicitarias para gestionar campañas y presupuestos en tiempo real.
            </p>
          </div>
          <a
            href="/api/connect/ads"
            className="ads-connect-btn"
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "10px 20px",
              background: "linear-gradient(135deg, var(--purple), var(--purple))",
              color: "#fff",
              fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" as const,
              borderRadius: "8px", cursor: "pointer", textDecoration: "none",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 15px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
              border: "none",
              transition: "all 0.3s ease",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.transform = "translateY(-1px)";
              el.style.boxShadow = "0 6px 20px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.2)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.transform = "translateY(0)";
              el.style.boxShadow = "0 4px 15px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.15)";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Conectar
          </a>
          <style>{`
            @keyframes shimmer {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </div>
      ) : null}


      {/* Projects Grid */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)" }}>Proyectos Activos</span>
            <span className="badge badge-emerald">{projects.filter(p => p.status === "EN VUELO" || p.status === "Activo").length}</span>
            <span className="badge badge-muted" style={{ marginLeft: 4 }}>
              {isFiltering ? `${visibleProjects.length} de ${projects.length}` : `${projects.length} total`}
            </span>
          </div>
        </div>

        {/* Búsqueda y filtros (multi-cliente) */}
        {projects.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180, maxWidth: 360 }}>
              <Search className="w-3.5 h-3.5" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              <input
                type="search"
                className="f-input"
                style={{ paddingLeft: 32 }}
                placeholder="Buscar por proyecto, cliente o vertical…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                aria-label="Buscar proyectos"
              />
            </div>
            <select
              className="f-select"
              style={{ flex: "0 1 180px", minWidth: 140, width: "auto" }}
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              aria-label="Filtrar por cliente"
            >
              <option value="">Todos los clientes</option>
              {clients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              className="f-select"
              style={{ flex: "0 1 160px", minWidth: 130, width: "auto" }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              aria-label="Filtrar por estatus"
            >
              <option value="">Todos los estatus</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {isFiltering && (
              <button
                onClick={() => { setQuery(""); setClientFilter(""); setStatusFilter(""); }}
                style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 12, padding: "4px 6px" }}
              >
                <X className="w-3.5 h-3.5" /> Limpiar
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(340px, 100%), 1fr))", gap: 16 }}>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} style={{ height: "160px", width: "100%", borderRadius: "16px" }} />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="glass-panel" style={{ padding: "40px 24px" }}>
            <EmptyState
              icon={<Orbi state="idle" scale={0.65} />}
              title="Ningún proyecto en radar"
              description="Aún no tienes misiones activas. Crea tu primer proyecto para empezar a gestionar campañas."
              actionLabel="NUEVA MISIÓN"
              actionIcon={<Plus className="w-4 h-4" />}
              onAction={() => { setEditingId(null); setModalMode("create"); }}
            />
          </div>
        ) : visibleProjects.length === 0 ? (
          <div className="glass-panel" style={{ padding: "32px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
              Ningún proyecto coincide con la búsqueda o los filtros.
            </p>
            <button
              onClick={() => { setQuery(""); setClientFilter(""); setStatusFilter(""); }}
              style={{ marginTop: 10, background: "none", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--text-secondary)", fontSize: 12, padding: "6px 14px" }}
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(340px, 100%), 1fr))", gap: 16 }}>
            {visibleProjects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                menuOpen={menuOpen}
                setMenuOpen={setMenuOpen}
                setMenuPos={setMenuPos}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context Menu Portal */}
      {menuOpen && createPortal(
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 9990 }} onClick={() => setMenuOpen(null)} />
          <div style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 9991, background: "rgba(5,8,18,0.98)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: "6px", minWidth: "180px", padding: "4px 0", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
            <MenuBtn icon={<Eye className="w-3.5 h-3.5" />} text="Abrir Dashboard" onClick={() => { router.push(`/dashboard/proyectos/${menuOpen}`); setMenuOpen(null); }} />
            <MenuBtn icon={<Edit3 className="w-3.5 h-3.5" />} text="Editar Proyecto" onClick={() => { setEditingId(menuOpen); setModalMode("edit"); setMenuOpen(null); }} />
            <div style={{ height: "1px", background: "rgba(255,255,255,0.09)", margin: "4px 0" }} />
            {STATUSES.filter(s => s !== projects.find(pp => pp.id === menuOpen)?.status).map(s => (
              <MenuBtn key={s} icon={<div style={{ width: 6, height: 6, borderRadius: "50%", background: s === "EN VUELO" ? "var(--emerald)" : s === "EN ÓRBITA" ? "var(--amber)" : s === "Completado" ? "var(--cyan)" : "var(--text-muted)" }} />}
                text={`Cambiar a ${s}`} onClick={() => handleStatusChange(menuOpen, s)} />
            ))}
            <div style={{ height: "1px", background: "rgba(255,255,255,0.09)", margin: "4px 0" }} />
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
              <AlertTriangle style={{ width: 20, height: 20, color: "var(--red)" }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Eliminar Proyecto</h3>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
              ¿Estás seguro de que deseas eliminar <strong style={{ color: "white" }}>{projects.find(p => p.id === deleteConfirm)?.alias || "este proyecto"}</strong>? Esta acción no se puede deshacer. Se eliminarán todos los canales, configuraciones y datos asociados.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ fontSize: 11, fontWeight: 600, padding: "8px 20px", border: "1px solid rgba(148,163,184,0.22)", color: "var(--text-secondary)", background: "transparent", cursor: "pointer", borderRadius: 4 }}>Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ fontSize: 11, fontWeight: 600, padding: "8px 20px", border: "1px solid rgba(226,68,92,0.4)", color: "var(--red)", background: "rgba(226,68,92,0.08)", cursor: "pointer", borderRadius: 4 }}>Sí, eliminar</button>
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
          activeIntegrations={activeIntegrations}
          projects={projects}
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

/** Une dos listas de strings sin duplicar (preserva orden). */
function mergeUnique(cur: string[] | undefined, add: string[]): string[] {
  const out = Array.isArray(cur) ? [...cur] : [];
  for (const v of add) if (v && !out.includes(v)) out.push(v);
  return out;
}




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

