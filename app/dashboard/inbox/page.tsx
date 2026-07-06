import { PageHeader } from "@/components/ui/PageHeader";
import { MessageSquare } from "lucide-react";
import { InboxLayout } from "@/components/inbox/InboxLayout";
import { PermissionGuard } from "@/components/layout/PermissionsContext";

export default function InboxPage() {
  return (
    <PermissionGuard permKey="canAccessInbox">
      <div style={{ height: "calc(100vh - 56px)", display: "flex", flexDirection: "column" }}>
      <InboxLayout />
      </div>
    </PermissionGuard>
  );
}
