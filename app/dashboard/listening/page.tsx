import { PageHeader } from "@/components/ui/PageHeader";
import { Ear } from "lucide-react";
import { ListeningDashboard } from "@/components/listening/ListeningDashboard";

export default function ListeningPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Listening"
        description="Monitorea menciones de tu marca, keywords y sentimiento en redes sociales."
        icon={<Ear className="w-6 h-6" style={{ color: "#d98843" }} />}
      />
      <ListeningDashboard />
    </div>
  );
}
