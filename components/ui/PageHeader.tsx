"use client";

import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, icon, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 page-enter">
      <div className="flex items-center gap-4">
        {icon && (
          <div style={{
            width: "44px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,212,255,0.07)",
            border: "1px solid var(--border)",
            position: "relative",
          }}>
            {icon}
            {/* Corner accents */}
            <span style={{
              position: "absolute", top: "-1px", left: "-1px",
              width: "8px", height: "8px",
              borderTop: "1px solid rgba(0,212,255,0.3)",
              borderLeft: "1px solid rgba(0,212,255,0.3)",
            }} />
            <span style={{
              position: "absolute", bottom: "-1px", right: "-1px",
              width: "8px", height: "8px",
              borderBottom: "1px solid rgba(0,212,255,0.3)",
              borderRight: "1px solid rgba(0,212,255,0.3)",
            }} />
          </div>
        )}
        <div>
          <h1 style={{
            fontFamily: "var(--font-sans)",
            fontSize: "24px",
            fontWeight: 800,
            color: "white",
            letterSpacing: 0,
            lineHeight: 1.2,
          }}>
            {title}
          </h1>
          {description && (
            <p style={{
              fontSize: "12px",
              color: "#94a3b8",
              marginTop: "4px",
              letterSpacing: "0.03em",
            }}>
              {description}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}
