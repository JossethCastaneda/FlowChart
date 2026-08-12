"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
import { GalaxyBackground } from "@/components/ui/GalaxyBackground";
import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher";
import { FlowChartLogo } from "@/components/ui/FlowChartLogo";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
import { NotificationBell } from "@/components/ui/NotificationBell";
import { AlertBellButton } from "@/components/alerts/AlertToast";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { WhatsAppPhonePrompt } from "@/components/ui/WhatsAppPhonePrompt";
import { Sheet } from "@/components/ui/Sheet";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useHeaderStore } from "@/lib/header-store";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  Users,
  Settings,
  Menu,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  X,
  Target,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  Zap,
  ChevronRight,
  ChevronLeft,
  Check,
  LogOut,
  FolderKanban,
  Megaphone,
  Plug,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  MessageSquare,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  BarChart3,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  Ear,
  Columns3,
  MessageSquarePlus,
  HelpCircle,
  ChevronDown,
  UserCheck,
  UserMinus,
  Coffee,
  Utensils,
  GraduationCap,
  MinusCircle,
  Languages,
  Palette,
  Bot,
} from "lucide-react";
import { showToast } from "@/components/ui/Toast";
import { useLanguage } from "@/components/layout/LanguageContext";

import { HoloIcon } from "@/components/ui/HoloIcon";

import { NAV_GROUPS } from "@/lib/flowchart-kit/nav-items";
import { MODULES } from "@/lib/flowchart-kit/modules";
import {
  Activity,
  MessagesSquare,
  Sparkles,
  Rocket,
  Radar,
  CheckCheck,
  FileText,
  FolderOpen,
  Database,
  Swords,
  Link as LinkIcon,
  Shield,
  Webhook,
  PieChart,
  BrainCircuit,
  Gauge,
  type LucideIcon,
} from "lucide-react";

/* Mapa nombre-kebab (modules.ts) → componente Lucide.
   Todo icono declarado en MODULES/FUTURE_MODULES debe existir aquí. */
const ICON_MAP: Record<string, LucideIcon> = {
  "activity": Activity,
  "folder-kanban": FolderKanban,
  "messages-square": MessagesSquare,
  "target": Target,
  "sparkles": Sparkles,
  "rocket": Rocket,
  "megaphone": Megaphone,
  "radar": Radar,
  "columns-3": Columns3,
  "bot": Bot,
  "plug": Plug,
  "settings": Settings,
  "check-check": CheckCheck,
  "file-text": FileText,
  "folder-open": FolderOpen,
  "database": Database,
  "swords": Swords,
  "link": LinkIcon,
  "shield": Shield,
  "webhook": Webhook,
  "pie-chart": PieChart,
  "brain-circuit": BrainCircuit,
  "gauge": Gauge,
};



const TRANSLATIONS = {
  es: {
    inicio: "Inicio",
    clientes: "Clientes",
    planner: "Planner",
    inbox: "Inbox",
    analytics: "Analytics",
    ads: "Ads",
    listening: "Listening",
    streams: "Streams",
    gridia: "GridIA",
    ops: "Ops",
    integrations: "Integraciones",
    admin: "Admin",
    operacion: "Operación",
    colapsar: "Colapsar",
    expandir: "Expandir menú",
    estado: "Estado",
    recibe: "Recibe conversaciones",
    noRecibe: "No recibe conversaciones",
    enLinea: "En línea",
    break: "Break",
    almuerzo: "Almuerzo",
    coach: "Coach",
    ocupado: "Ocupado",
    idioma: "Cambiar lenguaje",
    apariencia: "Apariencia",
    config: "Configuración",
    logout: "Cerrar sesión",
    superAdmin: "Super Administrador",
    miembro: "Miembro de Equipo",
    idiomaTitulo: "Seleccionar Idioma",
    aparienciaTitulo: "Apariencia",
    modoOscuro: "Original (Oscuro)",
    modoClaro: "Claro",
    modoAzul: "Azul Medianoche",
  },
  en: {
    inicio: "Home",
    clientes: "Clients",
    planner: "Planner",
    inbox: "Inbox",
    analytics: "Analytics",
    ads: "Ads",
    listening: "Listening",
    streams: "Streams",
    gridia: "GridIA",
    ops: "Ops",
    integrations: "Integrations",
    admin: "Admin",
    operacion: "Operation",
    colapsar: "Collapse",
    expandir: "Expand menu",
    estado: "Status",
    recibe: "Receives conversations",
    noRecibe: "Does not receive conversations",
    enLinea: "Online",
    break: "Break",
    almuerzo: "Lunch",
    coach: "Coach",
    ocupado: "Busy",
    idioma: "Change language",
    apariencia: "Appearance",
    config: "Settings",
    logout: "Sign Out",
    superAdmin: "Super Administrator",
    miembro: "Team Member",
    idiomaTitulo: "Select Language",
    aparienciaTitulo: "Appearance",
    modoOscuro: "Original (Dark)",
    modoClaro: "Light",
    modoAzul: "Midnight Blue",
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
const getTranslatedNavItemName = (name: string, lang: 'es' | 'en') => {
  const map: Record<string, string> = {
    "Inicio": lang === 'es' ? "Inicio" : "Home",
    "Clientes": lang === 'es' ? "Clientes" : "Clients",
    "Planner": lang === 'es' ? "Planner" : "Planner",
    "Inbox": lang === 'es' ? "Inbox" : "Inbox",
    "Analytics": lang === 'es' ? "Analytics" : "Analytics",
    "Ads": lang === 'es' ? "Ads" : "Ads",
    "Listening": lang === 'es' ? "Listening" : "Listening",
    "Streams": lang === 'es' ? "Streams" : "Streams",
    "GridIA": lang === 'es' ? "GridIA" : "GridIA",
    "Ops": lang === 'es' ? "Ops" : "Ops",
    "Integraciones": lang === 'es' ? "Integraciones" : "Integrations",
    "Resultados": lang === 'es' ? "Resultados" : "Results",
    "Admin": lang === 'es' ? "Admin" : "Admin",
  };
  return map[name] || name;
};

const BREADCRUMB_MAP: Record<string, { es: string; en: string }> = {
  dashboard: { es: "Inicio", en: "Home" },
  proyectos: { es: "Clientes", en: "Clients" },
  resumen: { es: "Resumen", en: "Overview" },
  analytics: { es: "Analítica", en: "Analytics" },
  portabilidad: { es: "Portabilidad", en: "Portability" },
  briefing: { es: "Briefing", en: "Briefing" },
  centurion: { es: "Centurion", en: "Centurion" },
  crecimiento: { es: "Crecimiento", en: "Growth" },
  studio: { es: "AI Studio", en: "AI Studio" },
  scores: { es: "Scoreboard", en: "Scoreboard" },
  "data-hub": { es: "Data Hub", en: "Data Hub" },
  gridia: { es: "GridIA", en: "GridIA" },
  historial: { es: "Historial", en: "History" },
  inbox: { es: "Inbox 2.0", en: "Inbox 2.0" },
  integrations: { es: "Integraciones", en: "Integrations" },
  ops: { es: "Ops", en: "Ops" },
  publisher: { es: "Publicador", en: "Publisher" },
  reportes: { es: "Reportes", en: "Reports" },
  settings: { es: "Configuración", en: "Settings" },
  streams: { es: "Streams", en: "Streams" },
  "analisis-resultados": { es: "Análisis de Resultados", en: "Performance Analysis" },
  configuracion: { es: "Configuración", en: "Settings" },
  reglas: { es: "Reglas", en: "Rules" },
};

/** Width of the invisible hover-trigger zone at the left edge */
const HOVER_TRIGGER_WIDTH = 20;
/** Delay (ms) before the sidebar auto-hides after mouse leaves */
const AUTO_HIDE_DELAY = 600;

export function ClientMainWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // "sidebarPinned" persists across sessions — sidebar stays open without hover
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { lang, setLang } = useLanguage();
  const currentModule = MODULES.find(m => pathname === m.route || pathname?.startsWith(m.route + "/"));

  // ── Global browser notifications (pop-up + sound) ──
  useBrowserNotifications();

  // Load pinned preference on mount
  useEffect(() => {
    // From 768px the desktop shell is active; CSS narrows it to compact mode
    // only between 1024–1279px, per the design-system contract.
    const media = window.matchMedia("(min-width: 768px)");
    const syncViewport = () => {
      const desktop = media.matches;
      setIsDesktopViewport(desktop);
      if (!desktop) {
        setSidebarOpen(false);
        return;
      }
      try {
        const saved = localStorage.getItem("flowchart:sidebar-pinned");
        if (saved === "true") {
          setSidebarPinned(true);
          setSidebarOpen(true);
        }
      } catch {}
    };
    syncViewport();
    media.addEventListener("change", syncViewport);

    return () => media.removeEventListener("change", syncViewport);
  }, []);
  


  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  const [mounted, setMounted] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: session } = useSession();
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO: [React] Refactor de hooks anti-patrón
    setAvatarError(false);
  }, [session?.user?.image]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO: [React] Refactor de hooks anti-patrón
    setMounted(true);
  }, []);



  // Detect iframe on mount (client-side only)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO: [React] Refactor de hooks anti-patrón
    try { setIsEmbedded(window.self !== window.top); } catch { setIsEmbedded(true); }
  }, []);

  // ── Auto show/hide on hover ──
  const { breadcrumbs } = useHeaderStore();

  const [projectNames, setProjectNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!pathname) return;
    const segments = pathname.split("/").filter(Boolean);
    if (segments[1] === "proyectos" && segments[2]) {
      const projectId = segments[2];
      if (!projectNames[projectId]) {
        fetch(`/api/projects/${projectId}`)
          .then((r) => r.json())
          .then((res) => {
            if (res?.success && res?.data?.name) {
              setProjectNames((prev) => ({
                ...prev,
                [projectId]: res.data.name,
              }));
            }
          })
          .catch(() => {});
      }
    }
  }, [pathname, projectNames]);

  const computedBreadcrumbs = React.useMemo(() => {
    if (!pathname) return [];
    const segments = pathname.split("/").filter(Boolean);
    const list: { label: string; href?: string }[] = [];

    let currentHref = "";
    segments.forEach((seg, index) => {
      if (seg === "dashboard") {
        list.push({
          label: lang === "es" ? BREADCRUMB_MAP.dashboard.es : BREADCRUMB_MAP.dashboard.en,
          href: "/dashboard/resumen"
        });
        currentHref = "/dashboard";
      } else if (index === 2 && segments[1] === "proyectos") {
        currentHref += `/${seg}`;
        const name = projectNames[seg] || (lang === "es" ? "Proyecto" : "Project");
        list.push({ label: name, href: currentHref });
      } else {
        currentHref += `/${seg}`;
        const mapped = BREADCRUMB_MAP[seg];
        if (mapped) {
          list.push({ label: lang === "es" ? mapped.es : mapped.en, href: currentHref });
        } else {
          const label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
          list.push({ label, href: currentHref });
        }
      }
    });

    return list;
  }, [pathname, projectNames, lang]);

  // Show sidebar when mouse enters the left-edge trigger zone with 150ms debounce
  const handleMouseEnterTrigger = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
    }
    showTimerRef.current = setTimeout(() => {
      setSidebarOpen(true);
    }, 150);
  }, []);

  // Clear debounce timer if mouse leaves trigger zone before opening
  const handleMouseLeaveTrigger = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  // Keep sidebar visible while mouse is inside it (cancel hide and show timers)
  const handleMouseEnterSidebar = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  // Start auto-hide timer when mouse leaves sidebar (unless pinned)
  const handleMouseLeaveSidebar = useCallback(() => {
    if (sidebarPinned) return;
    hideTimerRef.current = setTimeout(() => {
      setSidebarOpen(false);
    }, AUTO_HIDE_DELAY);
  }, [sidebarPinned]);

  // Toggle pinned state — persisted in localStorage
  const toggleSidebarPin = useCallback(() => {
    setSidebarPinned(prev => {
      const next = !prev;
      try { localStorage.setItem("flowchart:sidebar-pinned", String(next)); } catch {}
      if (!next) setSidebarOpen(false);
      return next;
    });
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, []);

  // ── Activity status ──
  const STATUS_OPTIONS = [
    { key: "online_chat", dbStatus: "disponible" as const, label: "En línea (Recibe chat)", category: "recibe" as const, color: "var(--fc-success)", icon: UserCheck },
    { key: "online_no_chat", dbStatus: "ausente" as const, label: "En línea", category: "no_recibe" as const, color: "var(--fc-warning)", icon: UserMinus },
    { key: "break", dbStatus: "ausente" as const, label: "Break", category: "no_recibe" as const, color: "var(--fc-warning)", icon: Coffee },
    { key: "almuerzo", dbStatus: "ausente" as const, label: "Almuerzo", category: "no_recibe" as const, color: "var(--fc-warning)", icon: Utensils },
    { key: "coach", dbStatus: "ausente" as const, label: "Coach", category: "no_recibe" as const, color: "var(--fc-warning)", icon: GraduationCap },
    { key: "ocupado", dbStatus: "ocupado" as const, label: "Ocupado", category: "no_recibe" as const, color: "var(--fc-danger)", icon: MinusCircle },
  ];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  const [activityStatus, setActivityStatus] = useState<"disponible" | "ocupado" | "ausente" | "offline">("disponible");
  const [subStatus, setSubStatus] = useState<string>("online_chat");
  const [userRole, setUserRole] = useState<string>("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [activePanel, setActivePanel] = useState<'main' | 'lang' | 'theme'>('main');

  const changeTheme = (t: string) => {
    setTheme(t);
    setActivePanel('main');
    showToast("success", lang === 'es' ? `Tema cambiado` : `Theme changed`);
  };

  const changeLang = (l: 'es' | 'en') => {
    setLang(l);
    localStorage.setItem("flowchart:lang", l);
    setActivePanel('main');
    showToast("success", l === 'es' ? `Idioma cambiado a Español` : `Language changed to English`);
  };

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    fetch("/api/workspace/members/status")
      .then(r => r.json())
      .then(d => { 
        if (d.activityStatus) {
          setActivityStatus(d.activityStatus); 
          const local = localStorage.getItem("flowchart:sub-status");
          const matched = STATUS_OPTIONS.find(s => s.key === local);
          if (matched && matched.dbStatus === d.activityStatus) {
            setSubStatus(matched.key);
          } else {
            const def = STATUS_OPTIONS.find(s => s.dbStatus === d.activityStatus);
            if (def) setSubStatus(def.key);
          }
        }
        if (d.role) setUserRole(d.role); 
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO: [React] Refactor de hooks anti-patrón
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const changeStatus = async (statusKey: string) => {
    const opt = STATUS_OPTIONS.find(o => o.key === statusKey);
    if (!opt) return;

    setSubStatus(statusKey);
    setActivityStatus(opt.dbStatus);
    localStorage.setItem("flowchart:sub-status", statusKey);
    setUserMenuOpen(false);

    try { 
      await fetch("/api/workspace/members/status", { 
        method: "PUT", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ status: opt.dbStatus }) 
      }); 
    } catch {}
  };

  const currentStatusCfg = STATUS_OPTIONS.find(s => s.key === subStatus) || { key: "online_chat", dbStatus: "disponible" as const, label: "En línea", category: "recibe" as const, color: "var(--fc-success)", icon: UserCheck };

  if (!pathname?.startsWith("/dashboard")) {
    return <>{children}</>;
  }

  // When embedded in an iframe, skip the full layout (sidebar, topbar, background)
  if (isEmbedded) {
    return (
      <div className="h-screen overflow-hidden flex flex-col" style={{ background: "var(--fc-bg)" }}>
        {children}
      </div>
    );
  }

  // Whether the sidebar is visually shown (either auto-hover or pinned)
  const sidebarVisible = sidebarOpen || sidebarPinned;

  return (
    <div className="h-screen overflow-hidden flex" style={{ background: "var(--fc-bg)" }}>

      {/* Hover trigger zone — always active on desktop */}
      <div
        onMouseEnter={handleMouseEnterTrigger}
        onMouseLeave={handleMouseLeaveTrigger}
        className="hidden md:block"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: sidebarPinned ? 0 : `${HOVER_TRIGGER_WIDTH}px`,
          zIndex: 190,
          background: "transparent",
        }}
      />

      {/* Mobile Sidebar via Sheet */}
      <Sheet
        isOpen={sidebarOpen && (!isDesktopViewport || !sidebarPinned)}
        onClose={() => setSidebarOpen(false)}
        position="left"
        className="md:hidden"
        ariaLabel={lang === "es" ? "Navegación principal" : "Main navigation"}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: "1px solid var(--fc-border)" }}>
            <Link href="/dashboard/resumen" className="flex items-center gap-3" aria-label="Inicio">
              <FlowChartLogo size="sm" showText={true} />
            </Link>
          </div>
          <div style={{ padding: "12px 0 0" }}>
            <WorkspaceSwitcher />
          </div>
          <nav aria-label={lang === "es" ? "Navegación principal" : "Main navigation"} className="flex flex-1 flex-col px-3 pb-4 space-y-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {NAV_GROUPS.map((group) => {
              if (group.items.length === 0) return null;
              return (
                <div key={group.key} className={group.key === "sistema" ? "mt-auto pt-4 border-t border-[var(--fc-border)]" : "mt-2"}>
                  <div className="sidebar-group-header px-2 pb-2">
                    <span style={{
                      fontFamily: "var(--fc-font-mono)",
                      fontSize: "9px",
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--fc-text-muted)"
                    }}>
                      {group.title}
                    </span>
                  </div>
                  <div className="flex flex-col space-y-[2px]">
                    {group.items.map((m) => {
                        const isActive = pathname === m.route || pathname?.startsWith(m.route + "/");
                        const Icon = ICON_MAP[m.icon] || LayoutDashboard;

                        return (
                          <Link
                            key={m.key}
                            href={m.route}
                            title={`✦ ${m.code} — ${m.tagline}`}
                            className={`nav-item ${isActive ? "active" : ""}`}
                            aria-current={isActive ? "page" : undefined}
                            data-mod={m.key}
                            onClick={() => setSidebarOpen(false)}
                            style={isActive ? { 
                              backgroundColor: `color-mix(in srgb, ${m.color} 12%, transparent)`, 
                              color: m.color,
                              borderLeftColor: "transparent"
                            } as React.CSSProperties : {}}
                          >
                            <HoloIcon
                              icon={Icon}
                              isActive={isActive}
                              className="w-[18px] h-[18px]"
                              style={isActive ? { color: m.color } : undefined}
                            />
                            <span className="nav-full-name">{m.label}</span>
                            <span className="nav-short-name" aria-hidden="true">{m.label.slice(0, 3)}</span>
                            {isActive && (
                              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: m.color, marginLeft: "auto" }}></div>
                            )}
                          </Link>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </Sheet>

      {/* ─── Floating Sidebar (Desktop) / Sheet (Mobile) ─── */}
      <aside
        ref={sidebarRef}
        className={`fc-sidebar sidebar-responsive ${sidebarVisible ? 'fc-sidebar--open' : ''} hidden md:flex`}
        onMouseEnter={handleMouseEnterSidebar}
        onMouseLeave={handleMouseLeaveSidebar}
      >

        {/* Logo */}
        <div className="sidebar-logo-row flex items-center justify-between px-5 py-5" style={{ borderBottom: "1px solid var(--fc-border)" }}>
          <Link href="/dashboard/resumen" className="flex items-center gap-3" aria-label="Inicio">
            <FlowChartLogo size="sm" showText={true} />
          </Link>
          {/* Pin toggle — inside sidebar, no hamburger needed */}
          <button
            onClick={toggleSidebarPin}
            title={sidebarPinned ? t.colapsar : t.expandir}
            style={{
              background: sidebarPinned ? "var(--fc-accent-wash)" : "transparent",
              border: sidebarPinned ? "1px solid var(--fc-border-strong)" : "1px solid transparent",
              borderRadius: 6,
              padding: "4px 6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
              color: sidebarPinned ? "var(--fc-accent)" : "var(--fc-text-muted)",
            }}
          >
            {sidebarPinned ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Workspace Switcher */}
        <div style={{ padding: "12px 0 0" }}>
          <WorkspaceSwitcher />
        </div>

        {/* Navigation */}
          <nav aria-label={lang === "es" ? "Navegación principal" : "Main navigation"} className="flex flex-1 flex-col px-3 pb-4 space-y-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {NAV_GROUPS.map((group) => {
            if (group.items.length === 0) return null;
            return (
              <div key={group.key} className={group.key === "sistema" ? "mt-auto pt-4 border-t border-[var(--fc-border-subtle)]" : "mt-2"}>
                <div className="sidebar-group-header px-2 pb-2">
                  <span style={{
                    fontFamily: "var(--fc-font-mono)",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--fc-text-muted)"
                  }}>
                    {group.title}
                  </span>
                </div>
                <div className="flex flex-col space-y-[2px]">
                  {group.items.map((m) => {
                const isActive = pathname === m.route || pathname?.startsWith(m.route + "/");
                const Icon = ICON_MAP[m.icon] || LayoutDashboard;

                return (
                  <Link
                    key={m.key}
                    href={m.route}
                    title={`✦ ${m.code} — ${m.tagline}`}
                    className={`nav-item ${isActive ? "active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                    data-mod={m.key}
                    onClick={() => {
                      if (!sidebarPinned) setSidebarOpen(false);
                    }}
                    style={isActive ? { 
                      backgroundColor: `color-mix(in srgb, ${m.color} 12%, transparent)`, 
                      color: m.color,
                      borderLeftColor: "transparent"
                    } as React.CSSProperties : {}}
                  >
                    <HoloIcon
                      icon={Icon}
                      isActive={isActive}
                      className="w-[18px] h-[18px]"
                      style={isActive ? { color: m.color } : undefined}
                    />
                    <span className="nav-full-name">{m.label}</span>
                    <span className="nav-short-name" aria-hidden="true">{m.label.slice(0, 3)}</span>
                    {isActive && (
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: m.color, marginLeft: "auto" }}></div>
                    )}
                  </Link>
                );
              })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* NO collapse button — removed per user request */}
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col min-w-0 relative z-[1]">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-5 py-4 z-10"
          style={{
            background: "var(--fc-surface-overlay)",
            borderBottom: "1px solid var(--fc-border)",
            
            
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center p-1 rounded-lg text-[var(--fc-text-secondary)] hover:text-[var(--fc-text)] transition-colors cursor-pointer"
              style={{ background: "transparent", border: "none" }}
            >
              <Menu className="w-5 h-5" />
            </button>
            <FlowChartLogo size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <AlertBellButton />
          </div>
        </header>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          onOpenMenu={() => setSidebarOpen(true)}
          isMenuOpen={sidebarOpen && !isDesktopViewport}
        />

        {/* Desktop top bar */}
        <div className="hidden md:flex items-center justify-between px-4 py-2 gap-5" style={{
          borderBottom: "1px solid var(--fc-border)",
          background: "var(--fc-surface-overlay)",
          height: "56px",
          position: "relative",
          zIndex: 100,
        }}>

          {/* ── Hamburger / Sidebar toggle ── */}
          <button
            id="sidebar-toggle-btn"
            onClick={toggleSidebarPin}
            title={sidebarPinned ? (lang === 'es' ? "Colapsar menú" : "Collapse menu") : (lang === 'es' ? "Abrir menú" : "Open menu")}
            style={{
              background: sidebarPinned ? "var(--fc-accent-wash)" : "transparent",
              border: "1px solid transparent",
              borderRadius: 8,
              padding: "6px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: sidebarPinned ? "var(--fc-accent)" : "var(--fc-text-secondary)",
              transition: "all 0.2s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = sidebarPinned ? "var(--fc-accent-wash)" : "var(--fc-row-hover)";
              e.currentTarget.style.borderColor = sidebarPinned ? "var(--fc-border-strong)" : "var(--fc-border)";
              e.currentTarget.style.color = sidebarPinned ? "var(--fc-accent)" : "var(--fc-text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = sidebarPinned ? "var(--fc-accent-wash)" : "transparent";
              e.currentTarget.style.borderColor = "transparent";
              e.currentTarget.style.color = sidebarPinned ? "var(--fc-accent)" : "var(--fc-text-secondary)";
            }}
          >
            <Menu
              style={{
                width: 18,
                height: 18,
                transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: sidebarPinned ? "rotate(90deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {/* Module Title / Breadcrumbs */}
          <div className="flex-1 ml-4 hidden md:flex items-center gap-2 overflow-hidden" style={{ fontSize: 13 }}>
            {breadcrumbs.length > 0 ? (
              // If there are store override breadcrumbs (e.g. from Inbox)
              breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span style={{ color: "var(--fc-text-muted)", fontSize: 13, margin: "0 2px" }}>/</span>}
                  <span
                    onClick={crumb.onClick}
                    className={crumb.onClick ? "hover:text-[var(--fc-text)] transition-colors" : ""}
                    style={{
                      color: crumb.onClick ? 'var(--fc-text-secondary)' : 'var(--fc-text)',
                      cursor: crumb.onClick ? 'pointer' : 'default',
                      fontWeight: idx === breadcrumbs.length - 1 ? 600 : 500
                    }}
                  >
                    {crumb.label}
                  </span>
                </React.Fragment>
              ))
            ) : (
              // Dynamically computed breadcrumbs from URL
              computedBreadcrumbs.map((crumb, idx) => {
                const isLast = idx === computedBreadcrumbs.length - 1;
                // Use currentModule color if this crumb matches currentModule label/route
                const color = (idx === 1 && currentModule) ? currentModule.color : undefined;
                
                return (
                  <React.Fragment key={idx}>
                  {idx > 0 && <span style={{ color: "var(--fc-text-muted)", fontSize: 13, margin: "0 2px" }}>/</span>}
                    {isLast ? (
                      <span
                        style={{
                          color: color || 'var(--fc-text)',
                          fontWeight: 600,
                          whiteSpace: "nowrap"
                        }}
                      >
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href || "#"}
                        className="hover:text-[var(--fc-text)] transition-colors"
                        style={{
                          color: color || 'var(--fc-text-secondary)',
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          cursor: "pointer"
                        }}
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>

          {/* Right side quick actions */}
          <div className="flex items-center gap-5 ml-auto">


          <Link href="/dashboard/inbox" className="text-[var(--fc-text-secondary)] hover:text-[var(--fc-text)] transition-colors" title="Conversaciones">
            <HoloIcon icon={MessageSquarePlus} variant="cyan" isActive={true} className="w-[18px] h-[18px]" />
          </Link>

          <AlertBellButton />

          <button className="text-[var(--fc-text-secondary)] hover:text-[var(--fc-text)] transition-colors" title="Ayuda" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            <HoloIcon icon={HelpCircle} variant="emerald" isActive={true} className="w-[18px] h-[18px]" />
          </button>

          {/* User Menu Trigger */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => { setUserMenuOpen(!userMenuOpen); setActivePanel('main'); }}
              className="flex items-center gap-3 hover:bg-[var(--fc-surface-hover)] px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
              style={{ background: "transparent", border: "none" }}
            >
              <div style={{ position: "relative" }}>
                <div className="w-[32px] h-[32px] rounded-full overflow-hidden border border-[var(--fc-border)]" style={{ background: "linear-gradient(135deg,var(--fc-accent),var(--fc-accent-deep))" }}>
                  {session?.user?.image && !avatarError ? (
                    // eslint-disable-next-line @next/next/no-img-element -- TODO: Deuda técnica
                    <img
                      src={session.user.image}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={() => { setAvatarError(true); }}
                    />
                  ) : null}
                  {(!session?.user?.image || avatarError) && (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[var(--fc-text)]">
                      {session?.user?.name?.charAt(0).toUpperCase() || "C"}
                    </div>
                  )}
                </div>
                <div style={{
                  position: "absolute",
                  bottom: -1,
                  right: -1,
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: currentStatusCfg.color,
                  border: "1.5px solid var(--fc-bg)",
                }} />
              </div>

              <div className="flex flex-col items-start text-left min-w-[70px]">
                <span style={{ fontSize: "9px", color: "var(--fc-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.1 }}>{t.estado}</span>
                <span style={{ fontSize: "11px", color: 'var(--fc-text)', fontWeight: 600, lineHeight: 1.2 }}>
                  {currentStatusCfg.key === "online_chat" ? t.enLinea : currentStatusCfg.key === "online_no_chat" ? t.enLinea : currentStatusCfg.key === "break" ? t.break : currentStatusCfg.key === "almuerzo" ? t.almuerzo : currentStatusCfg.key === "coach" ? t.coach : t.ocupado}
                </span>
              </div>

              <HoloIcon icon={ChevronDown} variant="cyan" isActive={true} className="w-3.5 h-3.5 opacity-50" />
            </button>

            {/* Dropdown Panel */}
            {userMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "105%",
                  right: 0,
                  width: 280,
                  background: "var(--fc-surface-overlay)",
                  
                  border: "1px solid var(--fc-border)",
                  borderRadius: 12,
                  boxShadow: "var(--fc-shadow-overlay)",
                  padding: "16px 0 8px",
                  zIndex: 999,
                  animation: "fadeInScale 0.15s ease-out",
                  color: "var(--fc-text)",
                }}
              >
                {activePanel === 'main' && (
                  <>
                    {/* User Header */}
                    <div className="px-5 pb-4 flex items-center gap-3">
                      <div className="w-[48px] h-[48px] rounded-full overflow-hidden border-2 border-[var(--fc-border)]" style={{ background: "linear-gradient(135deg,var(--fc-accent-deep),var(--fc-module-aria))", flexShrink: 0 }}>
                          {session?.user?.image && !avatarError ? (
                            // eslint-disable-next-line @next/next/no-img-element -- TODO: Deuda técnica
                            <img
                              src={session.user.image}
                              alt=""
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              onError={() => { setAvatarError(true); }}
                            />
                          ) : null}
                          {(!session?.user?.image || avatarError) && (
                            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[var(--fc-text)]">
                              {session?.user?.name?.charAt(0).toUpperCase() || "C"}
                            </div>
                          )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--fc-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {session?.user?.name || "Josseth"}
                        </p>
                        <p style={{ fontSize: 10, color: "var(--fc-text-secondary)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {userRole === "OWNER" || userRole === "ADMIN" ? t.superAdmin : t.miembro}
                        </p>
                        <p style={{ fontSize: 10, color: "var(--fc-text-muted)", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {session?.user?.email || ""}
                        </p>
                      </div>
                    </div>

                    <div style={{ height: "1px", background: "var(--fc-border-subtle)", margin: "0 0 12px" }} />

                    {/* Estado Section */}
                    <div className="px-5">
                      <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--fc-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>{t.estado}</p>
                      
                      {/* Recibe conversaciones */}
                      <p style={{ fontSize: "10px", color: "var(--fc-text-muted)", margin: "0 0 6px" }}>{t.recibe}</p>
                      <div className="space-y-1 mb-3">
                        {STATUS_OPTIONS.filter(o => o.category === "recibe").map(opt => {
                          const Icon = opt.icon;
                          const isSelected = subStatus === opt.key;
                          return (
                            <button
                              key={opt.key}
                              onClick={() => changeStatus(opt.key)}
                              className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-left hover:bg-[var(--fc-surface-hover)] transition-colors"
                              style={{
                                background: isSelected ? ("var(--fc-surface-hover)") : "transparent",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              <div className="w-[24px] h-[24px] rounded-full flex items-center justify-center" style={{ background: "var(--fc-surface)" }}>
                                <Icon className="w-3.5 h-3.5 text-[var(--fc-success)]" />
                              </div>
                              <span style={{ fontSize: 12, color: isSelected ? ("var(--fc-text)") : ("var(--fc-text-secondary)"), fontWeight: isSelected ? 600 : 400 }}>
                                {opt.key === "online_chat" ? t.enLinea : opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* No recibe conversaciones */}
                      <p style={{ fontSize: "10px", color: "var(--fc-text-muted)", margin: "0 0 6px" }}>{t.noRecibe}</p>
                      <div className="space-y-1 mb-2" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {STATUS_OPTIONS.filter(o => o.category === "no_recibe").map(opt => {
                          const Icon = opt.icon;
                          const isSelected = subStatus === opt.key;
                          return (
                            <button
                              key={opt.key}
                              onClick={() => changeStatus(opt.key)}
                              className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-left hover:bg-[var(--fc-surface-hover)] transition-colors"
                              style={{
                                background: isSelected ? ("var(--fc-surface-hover)") : "transparent",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              <div className="w-[24px] h-[24px] rounded-full flex items-center justify-center" style={{ background: "var(--fc-surface)", flexShrink: 0 }}>
                                <Icon className="w-3.5 h-3.5 text-[var(--fc-warning)]" />
                              </div>
                              <span style={{ fontSize: 12, color: isSelected ? ("var(--fc-text)") : ("var(--fc-text-secondary)"), fontWeight: isSelected ? 600 : 400 }}>
                                {opt.key === "online_no_chat" ? t.enLinea : opt.key === "break" ? t.break : opt.key === "almuerzo" ? t.almuerzo : opt.key === "coach" ? t.coach : t.ocupado}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ height: "1px", background: "var(--fc-border-subtle)", margin: "8px 0" }} />

                    {/* Actions Section */}
                    <div className="px-2" style={{ display: "flex", flexDirection: "column" }}>
                      <button
                        onClick={() => setActivePanel('lang')}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left hover:bg-[var(--fc-surface-hover)] transition-colors"
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--fc-text-secondary)" }}
                      >
                        <HoloIcon icon={Languages} variant="cyan" isActive={true} className="w-4 h-4" />
                        <span style={{ fontSize: 12 }}>{t.idioma}</span>
                      </button>
                      <button
                        onClick={() => setActivePanel('theme')}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left hover:bg-[var(--fc-surface-hover)] transition-colors"
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--fc-text-secondary)" }}
                      >
                        <HoloIcon icon={Palette} variant="gold" isActive={true} className="w-4 h-4" />
                        <span style={{ fontSize: 12 }}>{t.apariencia}</span>
                      </button>
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-left hover:bg-[var(--fc-surface-hover)]"
                        style={{ color: "var(--fc-text-secondary)" }}
                      >
                        <HoloIcon icon={Settings} variant="pink" isActive={true} className="w-4 h-4" />
                        <span style={{ fontSize: 12 }}>{t.config}</span>
                      </Link>
                      <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors text-left"
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--fc-danger)" }}
                      >
                        <LogOut className="w-4 h-4" />
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{t.logout}</span>
                      </button>
                    </div>
                  </>
                )}

                {activePanel === 'lang' && (
                  <div className="px-4 py-2">
                    <button
                      onClick={() => setActivePanel('main')}
                      className="flex items-center gap-2 text-xs font-semibold mb-4 hover:opacity-80 transition-opacity"
                      style={{ background: "none", border: "none", color: "var(--fc-text-secondary)", cursor: "pointer" }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Volver / Back
                    </button>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "var(--fc-text)", marginBottom: 12 }}>{t.idiomaTitulo}</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => changeLang('es')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--fc-surface-hover)] text-left text-xs transition-colors"
                        style={{ background: "none", border: "none", color: "var(--fc-text-secondary)", cursor: "pointer" }}
                      >
                        <span>Español (ES)</span>
                        {lang === 'es' && <HoloIcon icon={Check} variant="cyan" isActive={true} className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => changeLang('en')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--fc-surface-hover)] text-left text-xs transition-colors"
                        style={{ background: "none", border: "none", color: "var(--fc-text-secondary)", cursor: "pointer" }}
                      >
                        <span>English (EN)</span>
                        {lang === 'en' && <HoloIcon icon={Check} variant="cyan" isActive={true} className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                )}

                {activePanel === 'theme' && (
                  <div className="px-4 py-2">
                    <button
                      onClick={() => setActivePanel('main')}
                      className="flex items-center gap-2 text-xs font-semibold mb-4 hover:opacity-80 transition-opacity"
                      style={{ background: "none", border: "none", color: "var(--fc-text-secondary)", cursor: "pointer" }}
                    >
                      <HoloIcon icon={ChevronLeft} variant="cyan" isActive={true} className="w-4 h-4" />
                      Volver / Back
                    </button>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "var(--fc-text)", marginBottom: 12 }}>{t.aparienciaTitulo}</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => changeTheme('dark')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--fc-surface-hover)] text-left text-xs transition-colors"
                        style={{ background: "none", border: "none", color: "var(--fc-text-secondary)", cursor: "pointer" }}
                      >
                        <span>{t.modoOscuro}</span>
                        {theme === 'dark' && <HoloIcon icon={Check} variant="cyan" isActive={true} className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => changeTheme('light')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--fc-surface-hover)] text-left text-xs transition-colors"
                        style={{ background: "none", border: "none", color: "var(--fc-text-secondary)", cursor: "pointer" }}
                      >
                        <span>{t.modoClaro}</span>
                        {theme === 'light' && <HoloIcon icon={Check} variant="cyan" isActive={true} className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => changeTheme('azul')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--fc-surface-hover)] text-left text-xs transition-colors"
                        style={{ background: "none", border: "none", color: "var(--fc-text-secondary)", cursor: "pointer" }}
                      >
                        <span>{t.modoAzul}</span>
                        {theme === 'azul' && <HoloIcon icon={Check} variant="cyan" isActive={true} className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          </div>
        </div>


        {/* Page content */}
        <div className="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0" style={{ display: "flex", flexDirection: "column" }}>
          <div className={`page-content page-enter ${pathname.startsWith('/dashboard/inbox') ? '!p-0' : ''}`} key={pathname} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            {children}
          </div>
        </div>
      </main>

      {/* WhatsApp phone prompt — shows to users who haven't registered their number */}
      <WhatsAppPhonePrompt />
    </div>
  );
}
