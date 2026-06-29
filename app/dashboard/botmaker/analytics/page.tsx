"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Client-only: the dashboard uses localStorage (layout) + ResizeObserver.
const BotAnalyticsDashboard = dynamic(
  () => import("@/components/botmaker/analytics/dashboard/BotAnalyticsDashboard"),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, background: "#030508" }}>
        <Loader2 className="animate-spin" style={{ width: 20, height: 20, color: "var(--purple)" }} />
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Cargando…</span>
      </div>
    ),
  }
);

export default function BotAnalyticsPage() {
  return <BotAnalyticsDashboard />;
}
