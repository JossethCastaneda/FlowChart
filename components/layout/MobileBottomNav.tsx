"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { MODULES } from "@/lib/flowchart-kit/modules";
import {
  Activity,
  FolderKanban,
  MessagesSquare,
  Target,
  Sparkles,
  Rocket,
  Megaphone,
  Radar,
  Columns3,
  Bot,
  Plug,
  Settings,
  Menu
} from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
const ICON_MAP: Record<string, any> = {
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
};

export function MobileBottomNav({ onOpenMenu, isMenuOpen = false }: { onOpenMenu: () => void; isMenuOpen?: boolean }) {
  const pathname = usePathname();

  // Tomamos los 3 primeros módulos como accesos rápidos
  const navItems = MODULES.slice(0, 3);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-2 pb-safe pt-2 bg-[var(--fc-surface)] border-t border-[var(--fc-border)] flex justify-around items-center">
      {navItems.map((item) => {
        const isActive = pathname === item.route || pathname?.startsWith(item.route + "/");
        const Icon = ICON_MAP[item.icon] || Activity;
        return (
          <Link
            key={item.key}
            href={item.route}
            className="flex flex-col items-center justify-center w-16 h-14 relative"
            aria-current={isActive ? "page" : undefined}
          >
            {isActive && (
              <motion.div
                layoutId="bottomNavIndicator"
                className="absolute inset-0 z-0 pointer-events-none bg-[var(--fc-surface-hover)] rounded-xl"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <Icon
              className="relative z-10 w-5 h-5 mb-1"
              style={{ color: isActive ? item.color : "var(--fc-text-disabled)" }}
            />
            <span
              className="relative z-10 text-[10px] font-medium"
              style={{ color: isActive ? item.color : "var(--fc-text-secondary)" }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
      
      {/* Menu Button */}
      <button
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center w-16 h-14"
        aria-label="Abrir menú"
        aria-haspopup="dialog"
        aria-expanded={isMenuOpen}
      >
        <Menu className="w-5 h-5 mb-1 text-[var(--fc-text-secondary)]" />
        <span className="text-[10px] font-medium text-[var(--fc-text-secondary)]">Más</span>
      </button>
    </div>
  );
}
