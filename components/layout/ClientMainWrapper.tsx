"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { GalaxyBackground } from "@/components/ui/GalaxyBackground";
import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
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
} from "lucide-react";

const NAV_ITEMS = [
  { name: "Resumen", short: "KPIs", href: "/dashboard/resumen", icon: LayoutDashboard, color: "#00d4ff" },
  { name: "Proyectos", short: "PROJ", href: "/dashboard/proyectos", icon: FolderKanban, color: "#06d6a0" },
  { name: "CRM BotMaker", short: "CRM", href: "/dashboard/crm", icon: MessageSquare, color: "#7b61ff" },
  { name: "Publisher", short: "PUB", href: "/dashboard/publisher", icon: Zap, color: "#ffbe0b" },
  { name: "Briefing", short: "BRIEF", href: "/dashboard/briefing", icon: Target, color: "#ff6b35" },
  { name: "Ads Manager", short: "ADS", href: "/dashboard/ads-manager", icon: Megaphone, color: "#0081FB" },
  { name: "Ops", short: "OPS", href: "/dashboard/ops", icon: Users, color: "#ff2d55" },
  { name: "Integrations", short: "APIs", href: "/dashboard/integrations", icon: Plug, color: "#00d4ff" },
  { name: "Settings", short: "SET", href: "/dashboard/settings", icon: Settings, color: "#94a3b8" },
];

export function ClientMainWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  const { data: session } = useSession();

  useEffect(() => { setMounted(true); }, []);

  if (!pathname?.startsWith("/dashboard")) {
    return <>{children}</>;
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
          ${sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <Link href="/dashboard/resumen" className="flex items-center gap-3">
            <div className="sidebar-logo-icon">
              <Zap className="w-5 h-5" style={{ color: "var(--cyan)" }} />
            </div>
            <span className="sidebar-logo-text sidebar-hide-compact">SODARE</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Switcher */}
        <div style={{ padding: "12px 0 0" }}>
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
            color: "rgba(148,163,184,0.25)",
          }}>
            COMMAND CENTER
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
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

        {/* User section */}
        <div className="user-chip">
          <div className="user-avatar" style={{ overflow: "hidden" }}>
            {session?.user?.image ? (
              <img src={session.user.image} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <Users className="w-4 h-4 text-white" />
            )}
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
            <p style={{ fontSize: "10px", color: "rgba(148,163,184,0.4)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              {session?.user?.email || "vader@imperio.com"}
            </p>
          </div>
          <button
            className="p-1.5 hover:bg-white/5 transition-colors sidebar-hide-compact"
            style={{ color: "rgba(148,163,184,0.3)" }}
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
        <header className="lg:hidden flex items-center justify-between px-5 py-4"
          style={{
            background: "rgba(5,8,18,0.9)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="sidebar-logo-icon" style={{ width: "32px", height: "32px" }}>
              <Zap className="w-4 h-4" style={{ color: "var(--cyan)" }} />
            </div>
            <span className="sidebar-logo-text" style={{ fontSize: "16px" }}>SODARE</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <div className={`page-enter ${mounted ? "" : ""}`} key={pathname} style={{ padding: "0" }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
