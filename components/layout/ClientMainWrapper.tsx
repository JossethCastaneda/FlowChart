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
  LogOut,
  FolderKanban,
  Megaphone,
  Plug,
  MessageSquare,
  BarChart3,
  Ear,
  Columns3,
} from "lucide-react";

const NAV_ITEMS: { name: string; short: string; href: string; icon: any; color: string; roles?: string[] }[] = [
  { name: "Inicio", short: "HOME", href: "/dashboard/resumen", icon: LayoutDashboard, color: "#00d4ff" },
  { name: "Clientes", short: "CLI", href: "/dashboard/proyectos", icon: FolderKanban, color: "#06d6a0" },
  { name: "Planner", short: "PLAN", href: "/dashboard/publisher", icon: Zap, color: "#ffbe0b" },
  { name: "Inbox", short: "INBX", href: "/dashboard/inbox", icon: MessageSquare, color: "#a855f7" },
  { name: "Analytics", short: "DATA", href: "/dashboard/analytics", icon: BarChart3, color: "#f472b6" },
  { name: "Ads", short: "ADS", href: "/dashboard/ads-manager", icon: Megaphone, color: "#0081FB" },
  { name: "Listening", short: "LIST", href: "/dashboard/listening", icon: Ear, color: "#fb923c" },
  { name: "Streams", short: "STRM", href: "/dashboard/streams", icon: Columns3, color: "#22d3ee" },
  { name: "GridIA", short: "GRID", href: "/dashboard/briefing", icon: Target, color: "#00E500" },
  { name: "Ops", short: "OPS", href: "/dashboard/ops", icon: Users, color: "#ff2d55" },
  { name: "Integraciones", short: "APIs", href: "/dashboard/integrations", icon: Plug, color: "#00d4ff", roles: ["OWNER", "ADMIN"] },
  { name: "Admin", short: "ADM", href: "/dashboard/settings", icon: Settings, color: "#94a3b8", roles: ["OWNER", "ADMIN"] },
];



const SIDEBAR_COLLAPSE_KEY = "sodare:sidebar-collapsed";

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
    { key: "disponible", label: "Disponible", color: "#00c875" },
    { key: "ocupado", label: "Ocupado", color: "#fdab3d" },
    { key: "ausente", label: "Ausente", color: "#e2445c" },
    { key: "offline", label: "Offline", color: "#64748b" },
  ];
  const [activityStatus, setActivityStatus] = useState("disponible");
  const [userRole, setUserRole] = useState<string>("");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/workspace/members/status")
      .then(r => r.json())
      .then(d => { if (d.activityStatus) setActivityStatus(d.activityStatus); if (d.role) setUserRole(d.role); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const changeStatus = async (s: string) => {
    setActivityStatus(s);
    setStatusMenuOpen(false);
    try { await fetch("/api/workspace/members/status", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: s }) }); } catch {}
  };

  const currentStatusCfg = STATUS_OPTIONS.find(s => s.key === activityStatus) || STATUS_OPTIONS[0];

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
      <GalaxyBackground />
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
            Operacion
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.filter(item => !item.roles || !userRole || item.roles.includes(userRole)).map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
                style={isActive ? { "--nav-color": item.color } as React.CSSProperties : undefined}
              >
                <Icon
                  className="w-[18px] h-[18px]"
                  style={{
                    color: isActive ? item.color : undefined,
                    filter: isActive ? `drop-shadow(0 0 6px ${item.color})` : undefined,
                  }}
                />
                <span className="flex-1 nav-full-name">{item.name}</span>
                <span className="nav-short-name">{item.short}</span>
                {isActive && (
                  <ChevronRight className="w-3 h-3" style={{ color: item.color, opacity: 0.5 }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={toggleCollapsed}
          className="sidebar-collapse-btn hidden lg:flex"
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          <ChevronRight
            className="w-[18px] h-[18px] flex-shrink-0"
            style={{ transform: collapsed ? "none" : "rotate(180deg)", transition: "transform 0.3s ease" }}
          />
          <span className="sidebar-hide-compact">Colapsar</span>
        </button>

        {/* User section */}
        <div className="user-chip" style={{ position: "relative" }}>
          <div style={{ position: "relative" }}>
            <div className="user-avatar" style={{ overflow: "hidden" }}>
              {session?.user?.image ? (
                <img src={session.user.image} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <Users className="w-4 h-4 text-white" />
              )}
            </div>
            <div
              ref={statusRef}
              onClick={() => setStatusMenuOpen(!statusMenuOpen)}
              title={`Estatus: ${currentStatusCfg.label}`}
              style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderRadius: "50%", background: currentStatusCfg.color, border: "2px solid var(--background)", cursor: "pointer", zIndex: 2, transition: "background 0.2s" }}
            >
              {statusMenuOpen && (
                <div style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)", background: "rgba(10,15,30,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 4, minWidth: 140, zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
                  {STATUS_OPTIONS.map(s => (
                    <button key={s.key} onClick={(e) => { e.stopPropagation(); changeStatus(s.key); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 10px", border: "none", cursor: "pointer", borderRadius: 4, background: activityStatus === s.key ? "rgba(255,255,255,0.08)" : "transparent", fontSize: 12, color: "#e2e8f0", fontFamily: "inherit" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0 sidebar-hide-compact">
            <p style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "11px",
              fontWeight: 600,
              color: "white",
              letterSpacing: "0.15em",
              textTransform: "uppercase" as const,
            }}>
              {session?.user?.name || "Comandante"}
            </p>
            <p style={{ fontSize: "10px", color: currentStatusCfg.color, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              {currentStatusCfg.label}
            </p>
          </div>
          <button
            className="p-1.5 hover:bg-white/5 transition-colors sidebar-hide-compact"
            style={{ color: "rgba(148,163,184,0.65)" }}
            title="Cerrar sesión"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
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
        <div className="hidden lg:flex items-center justify-end px-4 py-2" style={{
          borderBottom: "1px solid var(--border)",
          background: "rgba(5,8,18,0.6)",
          backdropFilter: "blur(20px)",
        }}>
          <NotificationBell />
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
