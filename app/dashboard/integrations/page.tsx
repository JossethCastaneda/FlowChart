"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Settings, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useLanguage } from "@/components/layout/LanguageContext";
import { IntegrationsView } from "@/components/integrations/IntegrationsView";

// Map provider IDs to human-readable names
const PROVIDER_LABELS: Record<string, string> = {
  tiktok_ads: "TikTok Ads",
  linkedin_ads: "LinkedIn Ads",
  pinterest_ads: "Pinterest Ads",
  snapchat_ads: "Snapchat Ads",
  x_ads: "X (Twitter) Ads",
  google_ads: "Google Ads",
  google_analytics: "Google Analytics 4",
  google_tag: "Tag Manager",
  meta_ads: "Meta Ads",
  meta_community: "Facebook Pages",
  instagram: "Instagram",
  whatsapp_business: "WhatsApp Business",
};

function OAuthToast() {
  const params = useSearchParams();
  const router = useRouter();
  const connected = params.get("connected");
  const connectError = params.get("connect_error");

  useEffect(() => {
    if (!connected && !connectError) return;
    // Auto-dismiss after 5s
    const t = setTimeout(() => {
      router.replace("/dashboard/integrations");
    }, 5000);
    return () => clearTimeout(t);
  }, [connected, connectError, router]);

  if (!connected && !connectError) return null;

  const isSuccess = !!connected;
  const label = connected ? (PROVIDER_LABELS[connected] ?? connected) : "";
  const errorMap: Record<string, string> = {
    missing_params: "Parámetros faltantes en el callback.",
    invalid_state: "Estado OAuth inválido. Intenta de nuevo.",
    user_mismatch: "El usuario no coincide. Intenta de nuevo.",
    provider_mismatch: "Proveedor incorrecto en el callback.",
    token_exchange_failed: "Error al intercambiar el código. Verifica tus credenciales.",
    server_error: "Error interno del servidor.",
    unknown_provider: "Proveedor no reconocido.",
  };

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", alignItems: "center", gap: 12,
      padding: "14px 20px", borderRadius: 12,
      background: isSuccess ? "rgba(52,183,124,0.12)" : "rgba(229,72,77,0.12)",
      border: `1px solid ${isSuccess ? "rgba(52,183,124,0.3)" : "rgba(229,72,77,0.3)"}`,
      backdropFilter: "blur(20px)",
      boxShadow: `0 8px 32px ${isSuccess ? "rgba(52,183,124,0.2)" : "rgba(229,72,77,0.2)"}`,
      maxWidth: 360,
      animation: "slideUp 0.3s ease",
    }}>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }`}</style>
      {isSuccess
        ? <CheckCircle2 size={20} style={{ color: "var(--emerald)", flexShrink: 0 }} />
        : <XCircle size={20} style={{ color: "var(--red)", flexShrink: 0 }} />
      }
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: "0 0 2px" }}>
          {isSuccess ? `✅ ${label} conectado` : "Error de conexión"}
        </p>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
          {isSuccess
            ? "La integración está activa en tu workspace."
            : (errorMap[connectError ?? ""] ?? `Error: ${connectError}`)}
        </p>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { lang } = useLanguage();
  return (
    <div className="space-y-6">
      <PageHeader
        title={lang === "es" ? "Integraciones" : "Integrations"}
        description={lang === "es"
          ? "Conecta plataformas, revisa permisos y valida que cada módulo pueda operar."
          : "Connect platforms, review permissions and validate that each module is operational."}
        icon={<Settings size={20} style={{ color: "var(--cyan)" }} />}
      />
      <IntegrationsView />
      <Suspense>
        <OAuthToast />
      </Suspense>
    </div>
  );
}
