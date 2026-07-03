"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Orbi } from "@/components/ui/Orbi";

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
      background: "var(--background)", color: "var(--foreground)", fontFamily: "sans-serif", flexDirection: "column", gap: 12,
    }}>
      <Orbi state="working" scale={0.7} />
      <p style={{ color: "var(--cyan)", fontFamily: "var(--font-display)", letterSpacing: "0.1em", fontSize: "14px" }}>CONECTANDO...</p>
    </div>
  );
}

export default function LoginPopupPage() {
  return <Suspense><LoginPopup /></Suspense>;
}
