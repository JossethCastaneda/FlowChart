import { PageHeader } from "@/components/ui/PageHeader";
import { Zap } from "lucide-react";
import { PublisherTabs } from "@/components/publisher/PublisherTabs";

export default function PublisherPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", minHeight: 0 }}>
      <PageHeader
        title="Publisher"
        description="Centro de control: redacta, programa, analiza y gestiona todas tus redes sociales."
        icon={<Zap className="w-6 h-6" style={{ color: "#ffbe0b" }} />}
      />

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <PublisherTabs />
      </div>
    </div>
  );
}
