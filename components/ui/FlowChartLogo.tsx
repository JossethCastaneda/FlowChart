"use client";

import React from "react";
import Image from "next/image";

interface FlowChartLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  showText?: boolean;
  showSubtitle?: boolean;
  layout?: "auto" | "stack" | "inline";
  className?: string;
  style?: React.CSSProperties;
  animated?: boolean;
}

const SIZE_MAP: Record<string, number> = {
  xs: 28,
  sm: 36,
  md: 48,
  lg: 72,
  xl: 110,
};

export function FlowChartLogo({
  size = "md",
  showText = true,
  showSubtitle = true,
  layout = "auto",
  className,
  style,
}: FlowChartLogoProps) {
  const h = typeof size === "number" ? size : (SIZE_MAP[size] ?? 48);
  const resolvedLayout = layout === "auto" ? (showText ? "inline" : "stack") : layout;

  return (
    <div
      className={className}
      style={{
        display: resolvedLayout === "inline" ? "inline-flex" : "flex",
        flexDirection: resolvedLayout === "inline" ? "row" : "column",
        alignItems: resolvedLayout === "inline" ? "center" : "flex-start",
        gap: Math.round(h * 0.25),
        height: resolvedLayout === "inline" ? h : "auto",
        ...style,
      }}
    >
      <Image
        src="/logo/isotipo-claro.svg"
        alt="FlowChart Logo"
        width={h}
        height={h}
        style={{ width: "auto", height: h, flexShrink: 0 }}
        priority
      />

      {showText && (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: Math.max(14, Math.round(h * 0.5)),
            fontWeight: 800,
            color: "var(--foreground)",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}>
            FlowChart
          </span>
          {showSubtitle && (
            <span style={{
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: Math.max(8, Math.round(h * 0.2)),
              fontWeight: 400,
              color: "var(--text-muted)",
              lineHeight: 1,
              whiteSpace: "nowrap",
              marginTop: "4px"
            }}>
              Todos tus canales en un solo flujo de datos
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function FlowChartIcon({ size = 24 }: { size?: number }) {
  return (
    <Image
      src="/logo/isotipo-claro.svg"
      alt="FlowChart Icon"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      priority
    />
  );
}
