import { PageHeader } from "@/components/ui/PageHeader";
import { Zap } from "lucide-react";
import { PublisherTabs } from "@/components/publisher/PublisherTabs";

export default function PublisherPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Publisher"
        description="Planifica, redacta y programa contenido para todos tus canales: Meta, IG, TikTok, LinkedIn, Email."
        icon={<Zap className="w-6 h-6" style={{ color: "#ffbe0b" }} />}
      />

      <PublisherTabs />
    </div>
  );
}
