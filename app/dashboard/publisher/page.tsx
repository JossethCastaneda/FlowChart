import { PageHeader } from "@/components/ui/PageHeader";
import { Zap } from "lucide-react";
import { PublisherTabs } from "@/components/publisher/PublisherTabs";

export default function PublisherPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Publisher"
        description="Centro de control: redacta, programa, analiza y gestiona todas tus redes sociales."
        icon={<Zap className="w-6 h-6" style={{ color: "#ffbe0b" }} />}
      />

      <PublisherTabs />
    </div>
  );
}
