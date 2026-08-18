import { PreferencesSettings } from "@/components/settings/PreferencesSettings";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preferencias - Configuración | FlowChart",
};

export default function PreferencesPage() {
  return <PreferencesSettings />;
}
