import { PageHeader } from "@/components/ui/PageHeader";
import { Columns3 } from "lucide-react";
import { StreamsDashboard } from "@/components/streams/StreamsDashboard";

export default function StreamsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Streams"
        description="Monitorea tus feeds en tiempo real con tableros personalizados."
        icon={<Columns3 className="w-6 h-6" style={{ color: "#22d3ee" }} />}
      />
      <StreamsDashboard />
    </div>
  );
}
