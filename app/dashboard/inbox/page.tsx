import { PageHeader } from "@/components/ui/PageHeader";
import { MessageSquare } from "lucide-react";
import { InboxLayout } from "@/components/inbox/InboxLayout";
import { PermissionGuard } from "@/components/layout/PermissionsContext";

export default function InboxPage() {
  return (
    <PermissionGuard permKey="canAccessInbox">
      <div className="glass-panel" style={{ height: "calc(100vh - 84px)", display: "flex", flexDirection: "column", margin: "14px", borderRadius: "16px" }}>
        <InboxLayout />
      </div>
    </PermissionGuard>
  );
}
