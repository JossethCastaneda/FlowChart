"use client";

import { CreditCard, Gauge } from "lucide-react";
import { PlanUsageMeter } from "@/components/settings/PlanUsageMeter";
import { BillingManager } from "@/components/settings/BillingManager";
import { useWorkspace } from "@/hooks/use-settings-data";
import {
  SettingsStack,
  SettingsCard,
  SettingsRestricted,
  SettingsSkeleton,
} from "@/components/settings/ui";

export default function PlanPage() {
  const { isAdmin, isLoading } = useWorkspace();

  if (isLoading) return <SettingsSkeleton cards={2} />;

  if (!isAdmin) {
    return (
      <SettingsRestricted message="Sólo los administradores del workspace pueden ver y gestionar la suscripción." />
    );
  }

  return (
    <SettingsStack>
      <SettingsCard
        title="Uso del plan"
        description="Consumo actual frente a los límites de tu suscripción."
        icon={<Gauge className="w-5 h-5 text-[var(--fc-accent)]" />}
      >
        <PlanUsageMeter
          onUpgrade={() =>
            document.getElementById("billing-options")?.scrollIntoView({ behavior: "smooth" })
          }
        />
      </SettingsCard>

      <SettingsCard
        id="billing-options"
        title="Suscripción y facturación"
        description="Cambia de plan o administra tus datos de pago y facturas."
        icon={<CreditCard className="w-5 h-5 text-[var(--fc-accent)]" />}
      >
        <BillingManager />
      </SettingsCard>
    </SettingsStack>
  );
}
