import { TeamSettings } from "@/components/settings/TeamSettings";
import { AdminGuard } from "@/components/layout/PermissionsContext";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Equipo - Configuración | FlowChart",
};

export default function TeamPage() {
  return (
    <AdminGuard>
      <TeamSettings />
    </AdminGuard>
  );
}
