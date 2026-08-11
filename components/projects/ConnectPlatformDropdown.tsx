"use client";

import React from "react";
import { Link2, ChevronDown } from "lucide-react";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { Button } from "@/components/ui/Button";

export function ConnectPlatformDropdown() {
  const platforms = [
    // eslint-disable-next-line @next/next/no-img-element -- TODO: Deuda técnica
    { name: "Meta Ads", icon: <img src="/icons/meta.svg" alt="Meta" style={{ width: 20, height: 20 }} />, href: "/api/connect/ads", desc: "Facebook & Instagram Ads" },
    // eslint-disable-next-line @next/next/no-img-element -- TODO: Deuda técnica
    { name: "Google Ads", icon: <img src="/icons/google-ads.svg" alt="Google Ads" style={{ width: 20, height: 20 }} />, href: "/dashboard/integrations/google-ads", desc: "Search, Display & YouTube" },
    // eslint-disable-next-line @next/next/no-img-element -- TODO: Deuda técnica
    { name: "TikTok Ads", icon: <img src="/icons/tiktok.svg" alt="TikTok" style={{ width: 20, height: 20 }} />, href: "/dashboard/integrations/tiktok", desc: "TikTok Ads Manager" }
  ];

  return (
    <Menu
      align="right"
      trigger={
        <Button variant="secondary" size="md">
          <Link2 className="w-4 h-4" />
          Conectar Plataforma
          <ChevronDown className="w-4 h-4" style={{ opacity: 0.6, marginLeft: "4px" }} />
        </Button>
      }
    >
      <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--fc-border)", marginBottom: "4px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--fc-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Plataformas Disponibles
        </span>
      </div>
      {platforms.map(p => (
        <a key={p.name} href={p.href} style={{ textDecoration: "none" }}>
          <MenuItem style={{ padding: "8px 10px", gap: "10px", height: "auto" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "6px",
              background: "var(--fc-surface)", border: "1px solid var(--fc-border)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              {p.icon}
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--fc-text)" }}>{p.name}</div>
              <div style={{ fontSize: "11px", color: "var(--fc-text-secondary)" }}>{p.desc}</div>
            </div>
          </MenuItem>
        </a>
      ))}
    </Menu>
  );
}

