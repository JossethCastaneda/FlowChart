"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, MessageSquare, Zap, BarChart3, Menu } from "lucide-react";

export function MobileBottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/dashboard/resumen", icon: LayoutDashboard, color: "#00d4ff" },
    { name: "Inbox", href: "/dashboard/inbox", icon: MessageSquare, color: "#a855f7" },
    { name: "Planner", href: "/dashboard/publisher", icon: Zap, color: "#ffbe0b" },
    { name: "Data", href: "/dashboard/analytics", icon: BarChart3, color: "#f472b6" },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-2 pb-safe pt-2 bg-[rgba(5,8,18,0.85)] backdrop-blur-xl border-t border-white/10 flex justify-around items-center">
      {navItems.map((item) => {
        const isActive = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.name}
            href={item.href}
            className="flex flex-col items-center justify-center w-16 h-14 relative"
          >
            {isActive && (
              <motion.div
                layoutId="bottomNavIndicator"
                className="absolute inset-0 bg-white/5 rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <item.icon
              className="w-5 h-5 mb-1"
              style={{ color: isActive ? item.color : "rgba(148,163,184,0.6)" }}
            />
            <span
              className="text-[10px] font-medium"
              style={{ color: isActive ? "white" : "rgba(148,163,184,0.6)" }}
            >
              {item.name}
            </span>
          </Link>
        );
      })}
      
      {/* Menu Button */}
      <button
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center w-16 h-14"
      >
        <Menu className="w-5 h-5 mb-1 text-slate-400" />
        <span className="text-[10px] font-medium text-slate-400">Más</span>
      </button>
    </div>
  );
}
