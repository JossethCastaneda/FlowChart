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
        className={className}
        style={{
          color: "rgba(148, 163, 184, 0.65)", // slate-400 with opacity
          ...style,
        }}
        {...props}
      />
    );
  }

  // Active state: apply holographic gradient and glow
  const gradientId = `url(#sodare-holo-${variant})`;
  const filterId = `url(#sodare-glow-filter-${variant})`;

  return (
    <div
      className={`holo-icon-wrapper ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        // Adding a subtle breathing animation to the container
        animation: "sodare-icon-breathe 4s ease-in-out infinite",
        ...style,
      }}
    >
      <style>{`
        @keyframes sodare-icon-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
      <Icon
        stroke={gradientId}
        style={{
          filter: filterId,
          // Overriding color so it doesn't conflict with stroke
          color: "transparent",
        }}
        {...props}
      />
    </div>
  );
}
