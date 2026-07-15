"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { MODULES } from "@/lib/zefirus-kit/modules";
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

export function MobileBottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();

  // Tomamos los 3 primeros módulos como accesos rápidos
  const navItems = MODULES.slice(0, 3);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-2 pb-safe pt-2 bg-[var(--surface)]  border-t border-[var(--border)] flex justify-around items-center">
      {navItems.map((item) => {
        const isActive = pathname === item.route || pathname?.startsWith(item.route + "/");
        const Icon = ICON_MAP[item.icon] || Activity;
        return (
          <Link
            key={item.key}
            href={item.route}
            className="flex flex-col items-center justify-center w-16 h-14 relative"
          >
            {isActive && (
              <motion.div
                layoutId="bottomNavIndicator"
                className="absolute inset-0 bg-[var(--surface-hover)] rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <Icon
              className="w-5 h-5 mb-1"
              style={{ color: isActive ? item.color : "rgba(148,163,184,0.6)" }}
            />
            <span
              className="text-[10px] font-medium"
              style={{ color: isActive ? "white" : "rgba(148,163,184,0.6)" }}
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
      >
        <Menu className="w-5 h-5 mb-1 text-[var(--text-secondary)]" />
        <span className="text-[10px] font-medium text-[var(--text-secondary)]">Más</span>
      </button>
    </div>
  );
}
