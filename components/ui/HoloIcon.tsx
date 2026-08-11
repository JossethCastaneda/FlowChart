"use client";

import React from "react";
import { LucideProps } from "lucide-react";

type HoloVariant = "cyan" | "emerald" | "pink" | "gold";

interface HoloIconProps extends Omit<LucideProps, "ref"> {
  icon: React.ElementType;
  variant?: HoloVariant;
  isActive?: boolean;
}

/* Acento por variante — tokens del tema (sin glow ni gradientes) */
const ACCENT: Record<HoloVariant, string> = {
  cyan: "var(--fc-accent)",
  emerald: "var(--fc-success)",
  pink: "var(--fc-module-metricas)",
  gold: "var(--fc-module-escucha)",
};

/**
 * HoloIcon — wrapper histórico de iconos Lucide del sidebar/menus.
 * Hoy renderiza el acento sólido del tema: activo → color de la variante;
 * inactivo → gris atenuado. Mantiene la API original (variant, isActive).
 * Para iconos nuevos usa SIcon (components/ui/SIcon.tsx).
 */
export function HoloIcon({ icon: Icon, variant = "cyan", isActive = false, className = "", style, ...props }: HoloIconProps) {
  return (
    <Icon
      strokeWidth={1.75}
      className={`transition-colors duration-200 ${className}`}
      style={{
        color: isActive ? ACCENT[variant] || ACCENT.cyan : "var(--fc-text-disabled)",
        ...style,
      }}
      {...props}
    />
  );
}
