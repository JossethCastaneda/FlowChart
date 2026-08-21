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
        title="Publicación"
        description="Planifica, redacta, programa y prepara aprobaciones para tus canales sociales."
        icon={<Zap className="w-6 h-6" style={{ color: "var(--fc-warning)" }} />}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <ConnectedMetaBadge module="publisher_facebook" providers={["meta_publisher_facebook", "meta_social", "meta_community", "meta_inbox"]} />
            <ConnectedMetaBadge module="publisher_instagram" providers={["meta_publisher_instagram", "instagram", "meta_social"]} />
          </div>
        }
      />

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <PublisherTabs />
      </div>
    </div>
    </PermissionGuard>
  );
}
