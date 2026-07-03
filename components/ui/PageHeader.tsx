"use client";

import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  iconColor?: string;
}

export function PageHeader({ title, description, subtitle, icon, action, iconColor }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 page-enter">
      <div className="flex items-center gap-4">
        {icon && (
          <div
            style={{
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: iconColor ? `color-mix(in srgb, ${iconColor} 10%, transparent)` : "var(--surface-hover)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              position: "relative",
              flexShrink: 0,
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-strong)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
            }}
          >
            {icon}
            {/* Corner accents — use CSS variables */}
            <span
              style={{
                position: "absolute", top: -1, left: -1,
                width: 8, height: 8,
                borderTop: "1.5px solid var(--border-strong)",
                borderLeft: "1.5px solid var(--border-strong)",
                borderRadius: "2px 0 0 0",
                pointerEvents: "none",
              }}
            />
            <span
              style={{
                position: "absolute", bottom: -1, right: -1,
                width: 8, height: 8,
                borderBottom: "1.5px solid var(--border-strong)",
                borderRight: "1.5px solid var(--border-strong)",
                borderRadius: "0 0 2px 0",
                pointerEvents: "none",
              }}
            />
          </div>
        )}
        <div>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 22,
              fontWeight: 800,
              color: "var(--foreground)",
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginTop: 3,
              }}
            >
              {subtitle}
            </p>
          )}
          {description && (
            <p
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginTop: subtitle ? 2 : 4,
                letterSpacing: "0.02em",
                lineHeight: 1.5,
              }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex items-center gap-2">{action}</div>
      )}
    </div>
  );
}
