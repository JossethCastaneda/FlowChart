"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Smartphone, Loader2, Calendar } from "lucide-react";
import { cdmxRange } from "@/lib/crm/timezone";

const PortabilidadTab = dynamic(() => import("@/components/botmaker/analytics/PortabilidadTab"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, gap: 12, padding: 60 }}>
      <Loader2 className="animate-spin" style={{ width: 20, height: 20, color: "var(--cyan)" }} />
      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Cargando…</span>
    </div>
  ),
});

type Period = "Hoy" | "7 días" | "30 días";

// Ventana anclada a días CDMX (00:00 CDMX = 06:00 UTC). Ver lib/crm/timezone.
function range(period: Period): { from: string; to: string } {
  const r = cdmxRange(period === "Hoy" ? 1 : period === "7 días" ? 7 : 30);
  return { from: r.fromISO, to: r.toISO };
}

export default function PortabilidadPage() {
  const [period, setPeriod] = useState<Period>("30 días");
  const { from, to } = range(period);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", border: "1px solid var(--hairline)", background: "rgba(4,7,18,0.9)", flexShrink: 0 }}>
        <Link href="/dashboard/botmaker/analytics" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-secondary)", textDecoration: "none" }}>
          <ArrowLeft style={{ width: 12, height: 12 }} /> Bot Analytics
        </Link>
        <span style={{ color: "var(--border-strong)" }}>›</span>
        <Smartphone style={{ width: 14, height: 14, color: "var(--cyan)" }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Portabilidad (BAIT)</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 2, background: "var(--surface-hover)", borderRadius: 20, padding: 3 }}>
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
