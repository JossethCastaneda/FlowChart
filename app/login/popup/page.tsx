"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
import { Loader2 } from "lucide-react";
import { Loader } from "@/components/ui/Loader";

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
      background: "var(--fc-bg)", color: "var(--fc-text)", fontFamily: "var(--font-sans)", flexDirection: "column", gap: 12,
    }}>
      <Loader size={32} />
      <p style={{ color: "var(--fc-accent)", fontFamily: "var(--font-display)", letterSpacing: "0.1em", fontSize: "14px" }}>CONECTANDO...</p>
    </div>
  );
}

export default function LoginPopupPage() {
  return <Suspense><LoginPopup /></Suspense>;
}


