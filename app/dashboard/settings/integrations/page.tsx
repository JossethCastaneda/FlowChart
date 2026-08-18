"use client";

import { Plug, MessageCircle } from "lucide-react";
import { IntegrationsView } from "@/components/integrations/IntegrationsView";
import { WhatsAppConnectCard } from "@/components/settings/WhatsAppConnectCard";
import { SettingsStack, SettingsCard } from "@/components/settings/ui";

export default function IntegrationsPage() {
  return (
    <SettingsStack>
      <SettingsCard
        title="Integraciones"
        description="Conecta las cuentas de anuncios, analítica y contenido que alimentan los módulos de Sodare."
        icon={<Plug className="w-5 h-5 text-[var(--fc-accent)]" />}
      >
        <IntegrationsView />
      </SettingsCard>

      {/* WhatsApp Business vivía sólo dentro del Publisher, donde nadie lo
          buscaba. Su sitio natural es aquí, junto al resto de conexiones. */}
      <SettingsCard
        title="WhatsApp Business"
        description="Conecta la línea del workspace para recibir mensajes en Inbox y enviar avisos de tareas y SLA."
        icon={<MessageCircle className="w-5 h-5 text-[var(--fc-accent)]" />}
      >
        <WhatsAppConnectCard />
      </SettingsCard>
    </SettingsStack>
  );
}
