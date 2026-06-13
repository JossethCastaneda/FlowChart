import { PageHeader } from "@/components/ui/PageHeader";
import { MessageSquareShare, BarChart2 } from "lucide-react";
import { AdvancedAnalyticsDashboard } from "@/components/analytics-v2/AdvancedAnalyticsDashboard";
import { PermissionGuard } from "@/components/layout/PermissionsContext";

export default function AnalisisResultadosPage() {
  return (
    <PermissionGuard permKey="canAccessAnalytics">
      <div className="space-y-6">
        <PageHeader
          title="Análisis de Resultados (Avanzado)"
          description="Métricas consolidadas de Cari AI y Botmaker."
          icon={<BarChart2 className="w-6 h-6" style={{ color: "#00d4ff" }} />}
        />
        <AdvancedAnalyticsDashboard />
      </div>
    </PermissionGuard>
  );
}
