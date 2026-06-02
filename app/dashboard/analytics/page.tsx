import { PageHeader } from "@/components/ui/PageHeader";
import { BarChart3 } from "lucide-react";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Métricas orgánicas de tus redes sociales."
        icon={<BarChart3 className="w-6 h-6" style={{ color: "#f472b6" }} />}
      />

      <AnalyticsDashboard />
    </div>
  );
}
