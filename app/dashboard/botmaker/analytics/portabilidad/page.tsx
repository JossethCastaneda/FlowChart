"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Smartphone, Loader2, Calendar } from "lucide-react";

const PortabilidadTab = dynamic(() => import("@/components/botmaker/analytics/PortabilidadTab"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, gap: 12, padding: 60 }}>
      <Loader2 className="animate-spin" style={{ width: 20, height: 20, color: "var(--cyan)" }} />
      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Cargando…</span>
    </div>
  ),
});

const TZ = "America/Mexico_City";
type Period = "Hoy" | "7 días" | "30 días";

function range(period: Period): { from: string; to: string } {
  const now = new Date();
  const tzNow = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  if (period === "Hoy") return { from: new Date(tzNow + "T00:00:00").toISOString(), to: now.toISOString() };
  const days = period === "7 días" ? 7 : 30;
  return { from: new Date(now.getTime() - days * 86400000).toISOString(), to: now.toISOString() };
}

export default function PortabilidadPage() {
  const [period, setPeriod] = useState<Period>("30 días");
  const { from, to } = range(period);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#030508", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(4,7,18,0.9)", flexShrink: 0 }}>
        <Link href="/dashboard/botmaker/analytics" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(148,163,184,0.5)", textDecoration: "none" }}>
          <ArrowLeft style={{ width: 12, height: 12 }} /> Bot Analytics
        </Link>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>›</span>
        <Smartphone style={{ width: 14, height: 14, color: "var(--cyan)" }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>Portabilidad (BAIT)</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.05)", borderRadius: 20, padding: 3 }}>
          {(["Hoy", "7 días", "30 días"] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 16, border: "none",
              background: period === p ? "rgba(6,182,212,0.2)" : "transparent",
              color: period === p ? "var(--cyan)" : "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}><Calendar style={{ width: 11, height: 11 }} /> {p}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <PortabilidadTab key={`${from}-${to}`} from={from} to={to} />
      </div>
    </div>
  );
}
