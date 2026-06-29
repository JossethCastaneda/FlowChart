import { PageHeader } from "@/components/ui/PageHeader";
import { Zap } from "lucide-react";
import { PublisherTabs } from "@/components/publisher/PublisherTabs";
import { PermissionGuard } from "@/components/layout/PermissionsContext";
import { ConnectedMetaBadge } from "@/components/publisher/ConnectedMetaBadge";

export default function PublisherPage() {
  return (
    <PermissionGuard permKey="canAccessPublisher">
      <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", minHeight: 0 }}>
      <PageHeader
        title="Planner"
        description="Planifica, redacta, programa y prepara aprobaciones para tus canales sociales."
        icon={<Zap className="w-6 h-6" style={{ color: "var(--amber)" }} />}
        action={<ConnectedMetaBadge />}
      />

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <PublisherTabs />
      </div>
    </div>
    </PermissionGuard>
  );
}
