/* eslint-disable @next/next/no-assign-module-variable */
﻿"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ConnectDone() {
  const params = useSearchParams();
  const module = params.get("module") || "";
  const error = params.get("error") || "";

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.opener) {
        // Popup mode — notify parent and close
        window.opener.postMessage(
          { type: "CONNECT_DONE", module, error },
          window.location.origin
        );
        window.close();
      } else {
        // Fallback: direct navigation — redirect to dashboard
        const dest = ["social", "publisher_facebook", "publisher_instagram"].includes(module)
          ? `/dashboard/publisher?connected=${module}`
          : ["ads"].includes(module)
          ? `/dashboard/ads-manager?connected=${module}`
          : `/dashboard/integrations?connected=${module}`;
        window.location.replace(dest);
      }
    }
  }, [module, error]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--background)", color: "var(--foreground)", fontFamily: "var(--font-sans)", flexDirection: "column", gap: 12,
    }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--cyan)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Cerrando…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function ConnectDonePage() {
  return <Suspense><ConnectDone /></Suspense>;
}
