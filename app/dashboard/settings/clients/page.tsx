"use client";

import { Share2 } from "lucide-react";
import { ClientPortalsManager } from "@/components/settings/ClientPortalsManager";
import { useWorkspace } from "@/hooks/use-settings-data";
import { SettingsStack, SettingsCard, SettingsSkeleton } from "@/components/settings/ui";

export default function ClientsPage() {
  const { workspaceId, isLoading } = useWorkspace();

  if (isLoading || !workspaceId) return <SettingsSkeleton cards={1} />;

  return (
    <SettingsStack>
      <SettingsCard
        title="Portal de clientes"
        description="Enlaces públicos por proyecto para que tus clientes vean avances y aprueben contenido sin crear cuenta."
        icon={<Share2 className="w-5 h-5 text-[var(--cyan)]" />}
      >
        <ClientPortalsManager workspaceId={workspaceId} />
      </SettingsCard>
    </SettingsStack>
  );
}
