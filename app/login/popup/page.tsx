"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

function LoginPopup() {
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider");

  useEffect(() => {
    if (provider) {
      signIn(provider, {
        callbackUrl: window.location.origin + "/connect/done?module=login",
      });
    }
  }, [provider]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0a0a0f", color: "#e2e8f0", fontFamily: "sans-serif", flexDirection: "column", gap: 12,
    }}>
      <Loader2 size={32} className="animate-spin text-[#00d4ff]" />
      <p style={{ fontSize: 13, color: "#64748b" }}>Conectando...</p>
    </div>
  );
}

export default function LoginPopupPage() {
  return <Suspense><LoginPopup /></Suspense>;
}
