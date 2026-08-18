"use client";

import { AreasManager } from "@/components/settings/AreasManager";
import { useWorkspace, useWorkspaceMembers } from "@/hooks/use-settings-data";

export default function AreasPage() {
  const { workspaceId, isAdmin } = useWorkspace();
  const { data: members = [] } = useWorkspaceMembers(workspaceId);

  return (
    <AreasManager
      canEdit={isAdmin}
      members={members.map((m: any) => ({
        id: m.userId,
        name: m.user?.name || m.user?.email || "Sin nombre",
        activityStatus: m.activityStatus,
      }))}
    />
  );
}
