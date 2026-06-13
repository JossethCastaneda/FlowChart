import { PageHeader } from "@/components/ui/PageHeader";
import { MessageSquare } from "lucide-react";
import { InboxLayout } from "@/components/inbox/InboxLayout";
import { PermissionGuard } from "@/components/layout/PermissionsContext";

export default function InboxPage() {
  return (
    <PermissionGuard permKey="canAccessInbox">
      <div className="space-y-4" style={{ height: "calc(100vh - 120px)" }}>
        <PageHeader
        title="Inbox 2.0"
        description="Gestiona todos tus mensajes y comentarios desde un solo lugar."
        icon={<MessageSquare className="w-6 h-6" style={{ color: "#a855f7" }} />}
      />

      <InboxLayout />
      </div>
    </PermissionGuard>
  );
}
