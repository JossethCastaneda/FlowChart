"use client";

import React, { useState, useRef, useEffect } from "react";
import { Link2, ChevronDown } from "lucide-react";

export function ConnectPlatformDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const platforms = [
    { name: "Meta Ads", icon: <img src="/icons/meta.svg" alt="Meta" style={{ width: 20, height: 20 }} />, href: "/api/connect/ads", desc: "Facebook & Instagram Ads" },
    { name: "Google Ads", icon: <img src="/icons/google-ads.svg" alt="Google Ads" style={{ width: 20, height: 20 }} />, href: "/dashboard/integrations/google-ads", desc: "Search, Display & YouTube" },
    { name: "TikTok Ads", icon: <img src="/icons/tiktok.svg" alt="TikTok" style={{ width: 20, height: 20 }} />, href: "/dashboard/integrations/tiktok", desc: "TikTok Ads Manager" }
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-secondary"
        style={{ display: "flex", alignItems: "center", gap: "6px" }}
      >
        <Link2 className="w-4 h-4" />
        Conectar Plataforma
        <ChevronDown className="w-4 h-4" style={{ opacity: 0.6, marginLeft: "4px" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          right: 0,
          width: "240px",
          background: "var(--panel-bg)",
          border: "1px solid var(--border-strong)",
          borderRadius: "12px",
          boxShadow: "var(--shadow-hard)",
          zIndex: 100,
          padding: "6px",
          animation: "fadeInScale 0.2s ease-out"
        }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Plataformas Disponibles
            </span>
          </div>
          {platforms.map(p => (
            <a
              key={p.name}
              href={p.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px",
                borderRadius: "8px",
                textDecoration: "none",
                color: "var(--foreground)",
                transition: "background 0.2s",
              }}
              className="hover:bg-[var(--surface-hover)]"
            >
              <div style={{
                width: "28px", height: "28px", borderRadius: "6px",
                background: "var(--surface)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {p.icon}
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{p.desc}</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
