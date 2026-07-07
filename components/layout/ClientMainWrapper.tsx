"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { GalaxyBackground } from "@/components/ui/GalaxyBackground";
import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher";
import { SodareLogo } from "@/components/ui/SodareLogo";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { WhatsAppPhonePrompt } from "@/components/ui/WhatsAppPhonePrompt";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useHeaderStore } from "@/lib/header-store";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Users,
  Settings,
  Menu,
  X,
  Target,
  Zap,
  ChevronRight,
  ChevronLeft,
  Check,
  LogOut,
  FolderKanban,
  Megaphone,
  Plug,
  MessageSquare,
  BarChart3,
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

import { NAV_GROUPS } from "@/lib/sodare-kit/nav-items";
import { MODULES } from "@/lib/sodare-kit/modules";
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

/** Width of the invisible hover-trigger zone at the left edge */
const HOVER_TRIGGER_WIDTH = 20;
/** Delay (ms) before the sidebar auto-hides after mouse leaves */
const AUTO_HIDE_DELAY = 600;

export function ClientMainWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // "sidebarPinned" persists across sessions — sidebar stays open without hover
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const pathname = usePathname();
  const currentModule = MODULES.find(m => pathname === m.route || pathname?.startsWith(m.route + "/"));

  // Load pinned preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sodare:sidebar-pinned");
      if (saved === "true") {
        setSidebarPinned(true);
        setSidebarOpen(true);
      }
    } catch {}
  }, []);
  
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_GROUPS.forEach(g => {
      const hasActive = g.items.some(m => pathname === m.route || pathname?.startsWith(m.route + "/"));
      initial[g.key] = !hasActive; // true means collapsed
    });
    return initial;
  });

  const [mounted, setMounted] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ensure the active group is uncollapsed when navigating
  useEffect(() => {
    setCollapsedGroups(prev => {
      const next = { ...prev };
      let changed = false;
      NAV_GROUPS.forEach(g => {
        const hasActive = g.items.some(m => pathname === m.route || pathname?.startsWith(m.route + "/"));
        if (hasActive && next[g.key]) {
          next[g.key] = false;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [pathname]);

  // Detect iframe on mount (client-side only)
  useEffect(() => {
    try { setIsEmbedded(window.self !== window.top); } catch { setIsEmbedded(true); }
  }, []);

  // ── Auto show/hide on hover ──
  const { breadcrumbs } = useHeaderStore();

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
      try { localStorage.setItem("sodare:sidebar-pinned", String(next)); } catch {}
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
    { key: "online_chat", dbStatus: "disponible" as const, label: "En línea (Recibe chat)", category: "recibe" as const, color: "var(--emerald)", icon: UserCheck },
    { key: "online_no_chat", dbStatus: "ausente" as const, label: "En línea", category: "no_recibe" as const, color: "var(--amber)", icon: UserMinus },
    { key: "break", dbStatus: "ausente" as const, label: "Break", category: "no_recibe" as const, color: "var(--amber)", icon: Coffee },
    { key: "almuerzo", dbStatus: "ausente" as const, label: "Almuerzo", category: "no_recibe" as const, color: "var(--amber)", icon: Utensils },
    { key: "coach", dbStatus: "ausente" as const, label: "Coach", category: "no_recibe" as const, color: "var(--amber)", icon: GraduationCap },
    { key: "ocupado", dbStatus: "ocupado" as const, label: "Ocupado", category: "no_recibe" as const, color: "var(--red)", icon: MinusCircle },
  ];
  const [activityStatus, setActivityStatus] = useState<"disponible" | "ocupado" | "ausente" | "offline">("disponible");
  const [subStatus, setSubStatus] = useState<string>("online_chat");
  const [userRole, setUserRole] = useState<string>("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { theme, setTheme } = useTheme();
  const { lang, setLang } = useLanguage();
  const [activePanel, setActivePanel] = useState<'main' | 'lang' | 'theme'>('main');

  const changeTheme = (t: string) => {
    setTheme(t);
    setActivePanel('main');
    showToast("success", lang === 'es' ? `Tema cambiado` : `Theme changed`);
  };

  const changeLang = (l: 'es' | 'en') => {
    setLang(l);
    localStorage.setItem("sodare:lang", l);
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
          const local = localStorage.getItem("sodare:sub-status");
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
    localStorage.setItem("sodare:sub-status", statusKey);
    setUserMenuOpen(false);

    try { 
      await fetch("/api/workspace/members/status", { 
        method: "PUT", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ status: opt.dbStatus }) 
      }); 
    } catch {}
  };

  const currentStatusCfg = STATUS_OPTIONS.find(s => s.key === subStatus) || { key: "online_chat", dbStatus: "disponible" as const, label: "En línea", category: "recibe" as const, color: "var(--emerald)", icon: UserCheck };

  if (!pathname?.startsWith("/dashboard")) {
    return <>{children}</>;
  }

  // When embedded in an iframe, skip the full layout (sidebar, topbar, background)
  if (isEmbedded) {
    return (
      <div className="h-screen overflow-hidden flex flex-col" style={{ background: "var(--background)" }}>
        {children}
      </div>
    );
  }

  // Whether the sidebar is visually shown (either auto-hover or pinned)
  const sidebarVisible = sidebarOpen || sidebarPinned;

  return (
    <div className="h-screen overflow-hidden flex" style={{ background: "var(--background)" }}>

      {/* Hover trigger zone — always active on desktop */}
      <div
        onMouseEnter={handleMouseEnterTrigger}
        onMouseLeave={handleMouseLeaveTrigger}
        className="hidden lg:block"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: sidebarPinned ? 0 : `${HOVER_TRIGGER_WIDTH}px`,
          zIndex: 50,
          background: "transparent",
        }}
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[var(--panel-bg)] backdrop-blur-sm backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Floating Sidebar ─── */}
      <aside
        ref={sidebarRef}
        className="sidebar-floating"
        onMouseEnter={handleMouseEnterSidebar}
        onMouseLeave={handleMouseLeaveSidebar}
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          bottom: 12,
          width: 256,
          zIndex: 55,
          display: "flex",
          flexDirection: "column",
          borderRadius: 20,
          background: "var(--surface)",
          border: "1px solid var(--sidebar-border)",
          boxShadow: "var(--sidebar-shadow)",
          // Slide in/out transition
          transform: sidebarVisible ? "translateX(0)" : "translateX(calc(-100% - 24px))",
          opacity: sidebarVisible ? 1 : 0,
          transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease",
          pointerEvents: sidebarVisible ? "auto" : "none",
          overflow: "hidden",
        }}
      >

        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: "1px solid var(--hairline)" }}>
          <Link href="/dashboard/resumen" className="flex items-center gap-3" aria-label="Inicio">
            <SodareLogo size="sm" showText={true} />
          </Link>
          {/* Pin toggle — inside sidebar, no hamburger needed */}
          <button
            onClick={toggleSidebarPin}
            title={sidebarPinned ? t.colapsar : t.expandir}
            style={{
              background: sidebarPinned ? "rgba(0,212,255,0.12)" : "transparent",
              border: sidebarPinned ? "1px solid rgba(0,212,255,0.3)" : "1px solid transparent",
              borderRadius: 6,
              padding: "4px 6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
              color: sidebarPinned ? "var(--cyan)" : "var(--text-muted)",
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
        <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {NAV_GROUPS.map((group) => {
            const isCollapsed = collapsedGroups[group.key];
            return (
              <div key={group.key} className={group.key === "sistema" ? "mt-4 pt-4 border-t border-[var(--hairline)]" : "mt-2"}>
                <div 
                  className="px-2 pb-2 flex items-center justify-between cursor-pointer group/nav"
                  onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                >
                  <span style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: group.key === "sistema" ? "var(--text-muted)" : "var(--text-muted)",
                    transition: "color 0.2s"
                  }} className="group-hover/nav:text-[var(--foreground)]">
                    {group.title}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} />
                </div>
                
                <div style={{
                  display: "grid",
                  gridTemplateRows: isCollapsed ? "0fr" : "1fr",
                  transition: "grid-template-rows 0.2s ease-out",
                }}>
                  <div style={{ overflow: "hidden" }}>
                    {group.items.map((m) => {
                const isActive = pathname === m.route || pathname?.startsWith(m.route + "/");
                const Icon = ICON_MAP[m.icon] || LayoutDashboard;

                return (
                  <Link
                    key={m.key}
                    href={m.route}
                    title={`✦ ${m.code} — ${m.tagline}`}
                    className={`nav-item ${isActive ? "active" : ""}`}
                    data-mod={m.key}
                    onClick={() => {
                      if (!sidebarPinned) setSidebarOpen(false);
                    }}
                    style={isActive ? { "--nav-color": m.color, borderLeftColor: m.color } as React.CSSProperties : {}}
                  >
                    <HoloIcon
                      icon={Icon}
                      isActive={isActive}
                      className="w-[18px] h-[18px]"
                      style={isActive ? { color: m.color } : undefined}
                    />
                    <span className="flex-1" style={{ color: isActive ? m.color : undefined }}>{m.label}</span>
                    {isActive && (
                      <HoloIcon icon={ChevronRight} isActive={true} className="w-3 h-3" style={{ opacity: 0.5, color: m.color }} />
                    )}
                  </Link>
                );
              })}
                  </div>
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
        <header className="lg:hidden flex items-center justify-between px-5 py-4 z-10"
          style={{
            background: "var(--topbar-bg)",
            borderBottom: "1px solid var(--border)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              style={{ background: "transparent", border: "none" }}
            >
              <Menu className="w-5 h-5" />
            </button>
            <SodareLogo size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav onOpenMenu={() => setSidebarOpen(true)} />

        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center justify-between px-4 py-2 gap-5" style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--topbar-bg)",
          height: "56px",
          position: "relative",
          zIndex: 50,
        }}>

          {/* ── Hamburger / Sidebar toggle ── */}
          <button
            id="sidebar-toggle-btn"
            onClick={toggleSidebarPin}
            title={sidebarPinned ? (lang === 'es' ? "Colapsar menú" : "Collapse menu") : (lang === 'es' ? "Abrir menú" : "Open menu")}
            style={{
              background: sidebarPinned ? "rgba(0,212,255,0.08)" : "transparent",
              border: "1px solid transparent",
              borderRadius: 8,
              padding: "6px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: sidebarPinned ? "var(--cyan)" : "var(--text-secondary)",
              transition: "all 0.2s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = sidebarPinned ? "rgba(0,212,255,0.12)" : "rgba(255,255,255,0.05)";
              e.currentTarget.style.borderColor = sidebarPinned ? "rgba(0,212,255,0.25)" : "rgba(255,255,255,0.08)";
              e.currentTarget.style.color = sidebarPinned ? "var(--cyan)" : "var(--foreground)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = sidebarPinned ? "rgba(0,212,255,0.08)" : "transparent";
              e.currentTarget.style.borderColor = "transparent";
              e.currentTarget.style.color = sidebarPinned ? "var(--cyan)" : "var(--text-secondary)";
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
          {currentModule && (
            <div className="flex-1 ml-4 hidden md:flex items-center gap-2 overflow-hidden" style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: currentModule.color, whiteSpace: "nowrap" }}>
                {currentModule.label === "Inbox" ? "Inbox 2.0" : currentModule.label}
              </span>
              {breadcrumbs.length > 0 && breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <span style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 2px" }}>/</span>
                  <span
                    onClick={crumb.onClick}
                    className={crumb.onClick ? "hover:text-[var(--foreground)] transition-colors" : ""}
                    style={{
                      color: crumb.onClick ? 'var(--text-secondary)' : 'var(--foreground)',
                      cursor: crumb.onClick ? 'pointer' : 'default',
                      fontWeight: idx === breadcrumbs.length - 1 ? 600 : 500
                    }}
                  >
                    {crumb.label}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Right side quick actions */}
          <div className="flex items-center gap-5 ml-auto">


          <Link href="/dashboard/inbox" className="text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors" title="Conversaciones">
            <HoloIcon icon={MessageSquarePlus} variant="cyan" isActive={true} className="w-[18px] h-[18px]" />
          </Link>

          <NotificationBell />

          <button className="text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors" title="Ayuda" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            <HoloIcon icon={HelpCircle} variant="emerald" isActive={true} className="w-[18px] h-[18px]" />
          </button>

          {/* User Menu Trigger */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => { setUserMenuOpen(!userMenuOpen); setActivePanel('main'); }}
              className="flex items-center gap-3 hover:bg-[var(--surface-hover)] px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
              style={{ background: "transparent", border: "none" }}
            >
              <div style={{ position: "relative" }}>
                <div className="w-[32px] h-[32px] rounded-full overflow-hidden border border-[var(--border)]" style={{ background: "linear-gradient(135deg,var(--cyan),#2563eb)" }}>
                  {session?.user?.image ? (
                    <img
                      src={session.user.image}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : null}
                  {(!session?.user?.image) && (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[var(--foreground)]">
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
                  border: "1.5px solid var(--background)",
                }} />
              </div>

              <div className="flex flex-col items-start text-left min-w-[70px]">
                <span style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.1 }}>{t.estado}</span>
                <span style={{ fontSize: "11px", color: 'var(--foreground)', fontWeight: 600, lineHeight: 1.2 }}>
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
                  background: "var(--panel-bg)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  boxShadow: "0 10px 40px var(--overlay-dark)",
                  padding: "16px 0 8px",
                  zIndex: 999,
                  animation: "fadeInScale 0.15s ease-out",
                  color: "var(--foreground)",
                }}
              >
                {activePanel === 'main' && (
                  <>
                    {/* User Header */}
                    <div className="px-5 pb-4 flex items-center gap-3">
                      <div className="w-[48px] h-[48px] rounded-full overflow-hidden border-2 border-[var(--border)]" style={{ background: "linear-gradient(135deg,#2563eb,var(--purple))", flexShrink: 0 }}>
                          {session?.user?.image ? (
                            <img
                              src={session.user.image}
                              alt=""
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : null}
                          {(!session?.user?.image) && (
                            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[var(--foreground)]">
                              {session?.user?.name?.charAt(0).toUpperCase() || "C"}
                            </div>
                          )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {session?.user?.name || "Josseth"}
                        </p>
                        <p style={{ fontSize: 10, color: "var(--text-secondary)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {userRole === "OWNER" || userRole === "ADMIN" ? t.superAdmin : t.miembro}
                        </p>
                        <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {session?.user?.email || ""}
                        </p>
                      </div>
                    </div>

                    <div style={{ height: "1px", background: "var(--hairline)", margin: "0 0 12px" }} />

                    {/* Estado Section */}
                    <div className="px-5">
                      <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>{t.estado}</p>
                      
                      {/* Recibe conversaciones */}
                      <p style={{ fontSize: "10px", color: "var(--text-muted)", margin: "0 0 6px" }}>{t.recibe}</p>
                      <div className="space-y-1 mb-3">
                        {STATUS_OPTIONS.filter(o => o.category === "recibe").map(opt => {
                          const Icon = opt.icon;
                          const isSelected = subStatus === opt.key;
                          return (
                            <button
                              key={opt.key}
                              onClick={() => changeStatus(opt.key)}
                              className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-left hover:bg-[var(--surface-hover)] transition-colors"
                              style={{
                                background: isSelected ? ("var(--surface-hover)") : "transparent",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              <div className="w-[24px] h-[24px] rounded-full flex items-center justify-center" style={{ background: "rgba(0,200,117,0.15)" }}>
                                <Icon className="w-3.5 h-3.5 text-[var(--emerald)]" />
                              </div>
                              <span style={{ fontSize: 12, color: isSelected ? ("var(--foreground)") : ("var(--text-secondary)"), fontWeight: isSelected ? 600 : 400 }}>
                                {opt.key === "online_chat" ? t.enLinea : opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* No recibe conversaciones */}
                      <p style={{ fontSize: "10px", color: "var(--text-muted)", margin: "0 0 6px" }}>{t.noRecibe}</p>
                      <div className="space-y-1 mb-2" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {STATUS_OPTIONS.filter(o => o.category === "no_recibe").map(opt => {
                          const Icon = opt.icon;
                          const isSelected = subStatus === opt.key;
                          return (
                            <button
                              key={opt.key}
                              onClick={() => changeStatus(opt.key)}
                              className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-left hover:bg-[var(--surface-hover)] transition-colors"
                              style={{
                                background: isSelected ? ("var(--surface-hover)") : "transparent",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              <div className="w-[24px] h-[24px] rounded-full flex items-center justify-center" style={{ background: "rgba(253,171,61,0.15)", flexShrink: 0 }}>
                                <Icon className="w-3.5 h-3.5 text-[var(--amber)]" />
                              </div>
                              <span style={{ fontSize: 12, color: isSelected ? ("var(--foreground)") : ("var(--text-secondary)"), fontWeight: isSelected ? 600 : 400 }}>
                                {opt.key === "online_no_chat" ? t.enLinea : opt.key === "break" ? t.break : opt.key === "almuerzo" ? t.almuerzo : opt.key === "coach" ? t.coach : t.ocupado}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ height: "1px", background: "var(--hairline)", margin: "8px 0" }} />

                    {/* Actions Section */}
                    <div className="px-2" style={{ display: "flex", flexDirection: "column" }}>
                      <button
                        onClick={() => setActivePanel('lang')}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left hover:bg-[var(--surface-hover)] transition-colors"
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
                      >
                        <HoloIcon icon={Languages} variant="cyan" isActive={true} className="w-4 h-4" />
                        <span style={{ fontSize: 12 }}>{t.idioma}</span>
                      </button>
                      <button
                        onClick={() => setActivePanel('theme')}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left hover:bg-[var(--surface-hover)] transition-colors"
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
                      >
                        <HoloIcon icon={Palette} variant="gold" isActive={true} className="w-4 h-4" />
                        <span style={{ fontSize: 12 }}>{t.apariencia}</span>
                      </button>
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-left hover:bg-[var(--surface-hover)]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <HoloIcon icon={Settings} variant="pink" isActive={true} className="w-4 h-4" />
                        <span style={{ fontSize: 12 }}>{t.config}</span>
                      </Link>
                      <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors text-left"
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--red)" }}
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
                      style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Volver / Back
                    </button>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 12 }}>{t.idiomaTitulo}</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => changeLang('es')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--surface-hover)] text-left text-xs transition-colors"
                        style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                      >
                        <span>Español (ES)</span>
                        {lang === 'es' && <HoloIcon icon={Check} variant="cyan" isActive={true} className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => changeLang('en')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--surface-hover)] text-left text-xs transition-colors"
                        style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
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
                      style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                    >
                      <HoloIcon icon={ChevronLeft} variant="cyan" isActive={true} className="w-4 h-4" />
                      Volver / Back
                    </button>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 12 }}>{t.aparienciaTitulo}</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => changeTheme('dark')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--surface-hover)] text-left text-xs transition-colors"
                        style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                      >
                        <span>{t.modoOscuro}</span>
                        {theme === 'dark' && <HoloIcon icon={Check} variant="cyan" isActive={true} className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => changeTheme('light')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--surface-hover)] text-left text-xs transition-colors"
                        style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                      >
                        <span>{t.modoClaro}</span>
                        {theme === 'light' && <HoloIcon icon={Check} variant="cyan" isActive={true} className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => changeTheme('azul')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--surface-hover)] text-left text-xs transition-colors"
                        style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
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


