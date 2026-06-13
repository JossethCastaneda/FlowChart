import { PageHeader } from "@/components/ui/PageHeader";
import { BarChart3 } from "lucide-react";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { PermissionGuard } from "@/components/layout/PermissionsContext";

export default function AnalyticsPage() {
  return (
    <PermissionGuard permKey="canAccessAnalytics">
      <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Métricas orgánicas de tus redes sociales."
        icon={<BarChart3 className="w-6 h-6" style={{ color: "#f472b6" }} />}
      />

      <AnalyticsDashboard />
      </div>
    </PermissionGuard>
  );
}
