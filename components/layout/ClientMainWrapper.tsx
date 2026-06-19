"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { GalaxyBackground } from "@/components/ui/GalaxyBackground";
import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher";
import { SodareLogo } from "@/components/ui/SodareLogo";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
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
} from "lucide-react";
import { showToast } from "@/components/ui/Toast";
import { useLanguage } from "@/components/layout/LanguageContext";

import { HoloIcon } from "@/components/ui/HoloIcon";

const NAV_ITEMS: { name: string; short: string; href: string; icon: any; color: string; holoVariant: "cyan" | "emerald" | "pink" | "gold"; roles?: string[] }[] = [
  { name: "Inicio", short: "HOME", href: "/dashboard/resumen", icon: LayoutDashboard, color: "#00d4ff", holoVariant: "cyan" },
  { name: "Clientes", short: "CLI", href: "/dashboard/proyectos", icon: FolderKanban, color: "#06d6a0", holoVariant: "emerald" },
  { name: "Planner", short: "PLAN", href: "/dashboard/publisher", icon: Zap, color: "#ffbe0b", holoVariant: "gold" },
  { name: "Inbox", short: "INBX", href: "/dashboard/inbox", icon: MessageSquare, color: "#a855f7", holoVariant: "pink" },

  { name: "Ads", short: "ADS", href: "/dashboard/ads-manager", icon: Megaphone, color: "#0081FB", holoVariant: "cyan" },
  { name: "Listening", short: "LIST", href: "/dashboard/listening", icon: Ear, color: "#fb923c", holoVariant: "gold" },
  { name: "Streams", short: "STRM", href: "/dashboard/streams", icon: Columns3, color: "#22d3ee", holoVariant: "cyan" },
  { name: "GridIA", short: "GRID", href: "/dashboard/briefing", icon: Target, color: "#00E500", holoVariant: "emerald" },
  { name: "Ops", short: "OPS", href: "/dashboard/ops", icon: Users, color: "#ff2d55", holoVariant: "pink" },
];



const SIDEBAR_COLLAPSE_KEY = "sodare:sidebar-collapsed";

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

export function ClientMainWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const pathname = usePathname();

  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);
    // Restore the user's collapse preference (client-only to avoid hydration mismatch).
    try { setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1"); } catch { /* ignore */ }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };

  // Detect iframe on mount (client-side only)
  useEffect(() => {
    try { setIsEmbedded(window.self !== window.top); } catch { setIsEmbedded(true); }
  }, []);

  // ── Activity status ──
  const STATUS_OPTIONS = [
    { key: "online_chat", dbStatus: "disponible" as const, label: "En línea (Recibe chat)", category: "recibe" as const, color: "#00c875", icon: UserCheck },
    { key: "online_no_chat", dbStatus: "ausente" as const, label: "En línea", category: "no_recibe" as const, color: "#fdab3d", icon: UserMinus },
    { key: "break", dbStatus: "ausente" as const, label: "Break", category: "no_recibe" as const, color: "#fdab3d", icon: Coffee },
    { key: "almuerzo", dbStatus: "ausente" as const, label: "Almuerzo", category: "no_recibe" as const, color: "#fdab3d", icon: Utensils },
    { key: "coach", dbStatus: "ausente" as const, label: "Coach", category: "no_recibe" as const, color: "#fdab3d", icon: GraduationCap },
    { key: "ocupado", dbStatus: "ocupado" as const, label: "Ocupado", category: "no_recibe" as const, color: "#e2445c", icon: MinusCircle },
  ];
  const [activityStatus, setActivityStatus] = useState<"disponible" | "ocupado" | "ausente" | "offline">("disponible");
  const [subStatus, setSubStatus] = useState<string>("online_chat");
  const [userRole, setUserRole] = useState<string>("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState<'original' | 'claro' | 'azul_medianoche'>('original');
  const { lang, setLang } = useLanguage();
  const [activePanel, setActivePanel] = useState<'main' | 'lang' | 'theme'>('main');

  useEffect(() => {
    // Load saved theme
    const savedTheme = localStorage.getItem("sodare:theme") as 'original' | 'claro' | 'azul_medianoche' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  const applyTheme = (t: 'original' | 'claro' | 'azul_medianoche') => {
    const root = document.documentElement;
    root.classList.remove('theme-claro', 'theme-azul-medianoche');
    if (t === 'claro') root.classList.add('theme-claro');
    if (t === 'azul_medianoche') root.classList.add('theme-azul-medianoche');
  };

  const changeTheme = (t: 'original' | 'claro' | 'azul_medianoche') => {
    setTheme(t);
    applyTheme(t);
    localStorage.setItem("sodare:theme", t);
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

  const currentStatusCfg = STATUS_OPTIONS.find(s => s.key === subStatus) || { key: "online_chat", dbStatus: "disponible" as const, label: "En línea", category: "recibe" as const, color: "#00c875", icon: UserCheck };

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

  return (
    <div className="h-screen overflow-hidden flex" style={{ background: "var(--background)" }}>
      {/* Animated galaxy background */}
      {theme !== 'claro' && <GalaxyBackground />}
      <div className="dashboard-grid" />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside
        className={`sidebar sidebar-responsive fixed inset-y-0 left-0 z-50 flex flex-col
          transform transition-all duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${collapsed ? "sidebar-collapsed" : ""}
          ${sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"}`}
      >
        {/* Logo */}
        <div className="sidebar-logo-row flex items-center justify-between px-5 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <Link href="/dashboard/resumen" className="flex items-center gap-3" aria-label="Inicio">
            <SodareLogo size="sm" showText={!collapsed} />
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Switcher */}
        <div className="sidebar-hide-compact" style={{ padding: "12px 0 0" }}>
          <WorkspaceSwitcher />
        </div>

        {/* Nav section label */}
        <div className="px-5 pt-6 pb-2 sidebar-hide-compact">
          <span style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "9px",
            fontWeight: 600,
            letterSpacing: "0.3em",
            textTransform: "uppercase" as const,
            color: "rgba(148,163,184,0.65)",
          }}>
            {t.operacion}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.filter(item => !item.roles || !userRole || item.roles.includes(userRole)).map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = item.icon;
            const translatedName = getTranslatedNavItemName(item.name, lang);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
                style={isActive ? { "--nav-color": item.color } as React.CSSProperties : undefined}
              >
                <HoloIcon
                  icon={Icon}
                  variant={item.holoVariant}
                  isActive={isActive}
                  className="w-[18px] h-[18px]"
                />
                <span className="flex-1 nav-full-name">{translatedName}</span>
                <span className="nav-short-name">{item.short}</span>
                {isActive && (
                  <HoloIcon icon={ChevronRight} variant="cyan" isActive={true} className="w-3 h-3" style={{ opacity: 0.5 }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={toggleCollapsed}
          className="sidebar-collapse-btn hidden lg:flex"
          title={collapsed ? t.expandir : t.colapsar}
          aria-label={collapsed ? t.expandir : t.colapsar}
        >
          <ChevronRight
            className="w-[18px] h-[18px] flex-shrink-0"
            style={{ transform: collapsed ? "none" : "rotate(180deg)", transition: "transform 0.3s ease" }}
          />
          <span className="sidebar-hide-compact">{t.colapsar}</span>
        </button>


      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col min-w-0 relative z-[1]">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-5 py-4 z-10"
          style={{
            background: "rgba(5,8,18,0.9)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-3">
            <SodareLogo size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav onOpenMenu={() => setSidebarOpen(true)} />

        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center justify-end px-6 py-2 gap-5" style={{
          borderBottom: "1px solid var(--border)",
          background: "rgba(5,8,18,0.6)",
          backdropFilter: "blur(20px)",
          height: "56px",
          position: "relative",
          zIndex: 50,
        }}>
          {/* Quick actions */}
          <Link href="/dashboard/inbox" className="text-slate-400 hover:text-white transition-colors" title="Conversaciones">
            <HoloIcon icon={MessageSquarePlus} variant="cyan" isActive={true} className="w-[18px] h-[18px]" />
          </Link>

          <NotificationBell />

          <button className="text-slate-400 hover:text-white transition-colors" title="Ayuda" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            <HoloIcon icon={HelpCircle} variant="emerald" isActive={true} className="w-[18px] h-[18px]" />
          </button>

          {/* User Menu Trigger */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => { setUserMenuOpen(!userMenuOpen); setActivePanel('main'); }}
              className="flex items-center gap-3 hover:bg-white/5 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
              style={{ background: "transparent", border: "none" }}
            >
              <div style={{ position: "relative" }}>
                <div className="w-[32px] h-[32px] rounded-full overflow-hidden border border-white/10" style={{ background: "linear-gradient(135deg,#00B2FF,#0064E0)" }}>
                  {session?.user?.image ? (
                    <img src={session.user.image} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
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
                <span style={{ fontSize: "9px", color: "rgba(148,163,184,0.6)", textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.1 }}>{t.estado}</span>
                <span style={{ fontSize: "11px", color: theme === 'claro' ? '#0f172a' : 'white', fontWeight: 600, lineHeight: 1.2 }}>
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
                  background: theme === 'claro' ? "rgba(255, 255, 255, 0.98)" : "rgba(10, 15, 30, 0.98)",
                  backdropFilter: "blur(20px)",
                  border: theme === 'claro' ? "1px solid rgba(0, 0, 0, 0.08)" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 12,
                  boxShadow: theme === 'claro' ? "0 10px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.02)" : "0 10px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,240,255,0.05)",
                  padding: "16px 0 8px",
                  zIndex: 999,
                  animation: "fadeInScale 0.15s ease-out",
                  color: theme === 'claro' ? "#0f172a" : "white",
                }}
              >
                {activePanel === 'main' && (
                  <>
                    {/* User Header */}
                    <div className="px-5 pb-4 flex items-center gap-3">
                      <div className="w-[48px] h-[48px] rounded-full overflow-hidden border-2 border-white/10" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", flexShrink: 0 }}>
                        {session?.user?.image ? (
                          <img src={session.user.image} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
                            {session?.user?.name?.charAt(0).toUpperCase() || "C"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 13, fontWeight: 700, color: theme === 'claro' ? "#0f172a" : "white", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {session?.user?.name || "Josseth"}
                        </p>
                        <p style={{ fontSize: 10, color: theme === 'claro' ? "#475569" : "rgba(148, 163, 184, 0.7)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {userRole === "OWNER" || userRole === "ADMIN" ? t.superAdmin : t.miembro}
                        </p>
                        <p style={{ fontSize: 10, color: theme === 'claro' ? "#64748b" : "rgba(148, 163, 184, 0.4)", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {session?.user?.email || ""}
                        </p>
                      </div>
                    </div>

                    <div style={{ height: "1px", background: theme === 'claro' ? "rgba(0,0,0,0.06)" : "rgba(255, 255, 255, 0.06)", margin: "0 0 12px" }} />

                    {/* Estado Section */}
                    <div className="px-5">
                      <p style={{ fontSize: "10px", fontWeight: 700, color: theme === 'claro' ? "#475569" : "rgba(148, 163, 184, 0.7)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>{t.estado}</p>
                      
                      {/* Recibe conversaciones */}
                      <p style={{ fontSize: "10px", color: theme === 'claro' ? "#64748b" : "rgba(148, 163, 184, 0.4)", margin: "0 0 6px" }}>{t.recibe}</p>
                      <div className="space-y-1 mb-3">
                        {STATUS_OPTIONS.filter(o => o.category === "recibe").map(opt => {
                          const Icon = opt.icon;
                          const isSelected = subStatus === opt.key;
                          return (
                            <button
                              key={opt.key}
                              onClick={() => changeStatus(opt.key)}
                              className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-left hover:bg-white/5 transition-colors"
                              style={{
                                background: isSelected ? (theme === 'claro' ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)") : "transparent",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              <div className="w-[24px] h-[24px] rounded-full flex items-center justify-center" style={{ background: "rgba(0,200,117,0.15)" }}>
                                <Icon className="w-3.5 h-3.5 text-[#00c875]" />
                              </div>
                              <span style={{ fontSize: 12, color: isSelected ? (theme === 'claro' ? "#0f172a" : "white") : (theme === 'claro' ? "#475569" : "#e2e8f0"), fontWeight: isSelected ? 600 : 400 }}>
                                {opt.key === "online_chat" ? t.enLinea : opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* No recibe conversaciones */}
                      <p style={{ fontSize: "10px", color: theme === 'claro' ? "#64748b" : "rgba(148, 163, 184, 0.4)", margin: "0 0 6px" }}>{t.noRecibe}</p>
                      <div className="space-y-1 mb-2" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {STATUS_OPTIONS.filter(o => o.category === "no_recibe").map(opt => {
                          const Icon = opt.icon;
                          const isSelected = subStatus === opt.key;
                          return (
                            <button
                              key={opt.key}
                              onClick={() => changeStatus(opt.key)}
                              className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-left hover:bg-white/5 transition-colors"
                              style={{
                                background: isSelected ? (theme === 'claro' ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)") : "transparent",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              <div className="w-[24px] h-[24px] rounded-full flex items-center justify-center" style={{ background: "rgba(253,171,61,0.15)", flexShrink: 0 }}>
                                <Icon className="w-3.5 h-3.5 text-[#fdab3d]" />
                              </div>
                              <span style={{ fontSize: 12, color: isSelected ? (theme === 'claro' ? "#0f172a" : "white") : (theme === 'claro' ? "#475569" : "#e2e8f0"), fontWeight: isSelected ? 600 : 400 }}>
                                {opt.key === "online_no_chat" ? t.enLinea : opt.key === "break" ? t.break : opt.key === "almuerzo" ? t.almuerzo : opt.key === "coach" ? t.coach : t.ocupado}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ height: "1px", background: theme === 'claro' ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)", margin: "8px 0" }} />

                    {/* Actions Section */}
                    <div className="px-2" style={{ display: "flex", flexDirection: "column" }}>
                      <button
                        onClick={() => setActivePanel('lang')}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left hover:bg-white/5 transition-colors"
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: theme === 'claro' ? "#475569" : "#e2e8f0" }}
                      >
                        <HoloIcon icon={Languages} variant="cyan" isActive={true} className="w-4 h-4" />
                        <span style={{ fontSize: 12 }}>{t.idioma}</span>
                      </button>
                      <button
                        onClick={() => setActivePanel('theme')}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left hover:bg-white/5 transition-colors"
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: theme === 'claro' ? "#475569" : "#e2e8f0" }}
                      >
                        <HoloIcon icon={Palette} variant="gold" isActive={true} className="w-4 h-4" />
                        <span style={{ fontSize: 12 }}>{t.apariencia}</span>
                      </button>
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-left hover:bg-white/5"
                        style={{ color: theme === 'claro' ? "#475569" : "#e2e8f0" }}
                      >
                        <HoloIcon icon={Settings} variant="pink" isActive={true} className="w-4 h-4" />
                        <span style={{ fontSize: 12 }}>{t.config}</span>
                      </Link>
                      <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors text-left"
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ff2d55" }}
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
                      style={{ background: "none", border: "none", color: theme === 'claro' ? "#475569" : "rgba(148, 163, 184, 0.7)", cursor: "pointer" }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Volver / Back
                    </button>
                    <p style={{ fontSize: 12, fontWeight: 700, color: theme === 'claro' ? "#0f172a" : "white", marginBottom: 12 }}>{t.idiomaTitulo}</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => changeLang('es')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 text-left text-xs transition-colors"
                        style={{ background: "none", border: "none", color: theme === 'claro' ? "#475569" : "#e2e8f0", cursor: "pointer" }}
                      >
                        <span>Español (ES)</span>
                        {lang === 'es' && <HoloIcon icon={Check} variant="cyan" isActive={true} className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => changeLang('en')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 text-left text-xs transition-colors"
                        style={{ background: "none", border: "none", color: theme === 'claro' ? "#475569" : "#e2e8f0", cursor: "pointer" }}
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
                      style={{ background: "none", border: "none", color: theme === 'claro' ? "#475569" : "rgba(148, 163, 184, 0.7)", cursor: "pointer" }}
                    >
                      <HoloIcon icon={ChevronLeft} variant="cyan" isActive={true} className="w-4 h-4" />
                      Volver / Back
                    </button>
                    <p style={{ fontSize: 12, fontWeight: 700, color: theme === 'claro' ? "#0f172a" : "white", marginBottom: 12 }}>{t.aparienciaTitulo}</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => changeTheme('original')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 text-left text-xs transition-colors"
                        style={{ background: "none", border: "none", color: theme === 'claro' ? "#475569" : "#e2e8f0", cursor: "pointer" }}
                      >
                        <span>{t.modoOscuro}</span>
                        {theme === 'original' && <HoloIcon icon={Check} variant="cyan" isActive={true} className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => changeTheme('claro')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 text-left text-xs transition-colors"
                        style={{ background: "none", border: "none", color: theme === 'claro' ? "#475569" : "#e2e8f0", cursor: "pointer" }}
                      >
                        <span>{t.modoClaro}</span>
                        {theme === 'claro' && <HoloIcon icon={Check} variant="cyan" isActive={true} className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => changeTheme('azul_medianoche')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 text-left text-xs transition-colors"
                        style={{ background: "none", border: "none", color: theme === 'claro' ? "#475569" : "#e2e8f0", cursor: "pointer" }}
                      >
                        <span>{t.modoAzul}</span>
                        {theme === 'azul_medianoche' && <Check className="w-4 h-4 text-[#00c875]" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0" style={{ display: "flex", flexDirection: "column" }}>
          <div className="page-content page-enter" key={pathname} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
