import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seguridad - Configuración | FlowChart",
};

export default function SecurityPage() {
  return <SecuritySettings />;
}
