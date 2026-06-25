"use client";

import { Settings } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useLanguage } from "@/components/layout/LanguageContext";
import { IntegrationsView } from "@/components/integrations/IntegrationsView";

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
    </div>
  );
}
