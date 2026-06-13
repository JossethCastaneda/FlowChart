import { PageHeader } from "@/components/ui/PageHeader";
import { Settings } from "lucide-react";
import { TabIntegraciones } from "@/components/analytics/TabIntegraciones";
import { PermissionGuard } from "@/components/layout/PermissionsContext";

export default function AnalisisConfiguracionPage() {
  return (
    <PermissionGuard permKey="canAccessAnalytics">
      <div className="space-y-6">
        <PageHeader
          title="Configuración de Análisis"
          description="Administra las conexiones a Botmaker y Cari AI."
          icon={<Settings className="w-6 h-6" style={{ color: "#00d4ff" }} />}
        />
        <TabIntegraciones />
      </div>
    </PermissionGuard>
  );
}
