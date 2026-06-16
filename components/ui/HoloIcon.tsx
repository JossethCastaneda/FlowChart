"use client";

import React from "react";
import { LucideProps } from "lucide-react";

type HoloVariant = "cyan" | "emerald" | "pink" | "gold";

interface HoloIconProps extends Omit<LucideProps, "ref"> {
  icon: React.ElementType;
  variant?: HoloVariant;
  isActive?: boolean;
}

/**
 * HoloIcon
 * Wraps any Lucide icon and applies the Sodare Holographic branding.
 * If isActive is true, it uses the SVG gradient stroke and a drop shadow filter.
 * If isActive is false, it falls back to a muted slate color.
 */
export function HoloIcon({ icon: Icon, variant = "cyan", isActive = false, className = "", style, ...props }: HoloIconProps) {
  // If not active, just render the standard icon with muted color
  if (!isActive) {
    return (
      <Icon
        className={`transition-colors duration-200 ${className}`}
        style={{
          color: "rgba(148, 163, 184, 0.65)", // slate-400 with opacity
          ...style,
        }}
        {...props}
      />
    );
  }

  // Active state: apply holographic gradient and CSS drop-shadow glow (hardware accelerated)
  const gradientId = `url(#sodare-holo-${variant})`;
  
  // Map variants to actual CSS hex codes for the drop-shadow
  const glowColors = {
    cyan: "#00f0ff",
    emerald: "#10b981",
    pink: "#f472b6",
    gold: "#fb923c"
  };
  const glowColor = glowColors[variant] || glowColors.cyan;

  return (
    <div
      className={`holo-icon-wrapper transition-all duration-300 hover:scale-105 ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        willChange: "transform, filter",
        ...style,
      }}
    >
      <Icon
        stroke={gradientId}
        className="transition-all duration-300"
        style={{
          filter: `drop-shadow(0 0 3px ${glowColor}80)`, // 80 is hex for 50% opacity
          color: "transparent",
        }}
        {...props}
      />
    </div>
  );
}
