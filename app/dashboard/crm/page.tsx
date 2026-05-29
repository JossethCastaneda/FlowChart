import { PageHeader } from "@/components/ui/PageHeader";
import { MessageSquare } from "lucide-react";
import { CrmModule } from "@/components/crm/CrmModule";

export default function CrmPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM & Lead Management"
        description="Pipeline de leads, scoring, nurturing automático y gestión de conversaciones omnicanal."
        icon={<MessageSquare className="w-6 h-6" style={{ color: "#7b61ff" }} />}
      />

      <CrmModule />
    </div>
  );
}
