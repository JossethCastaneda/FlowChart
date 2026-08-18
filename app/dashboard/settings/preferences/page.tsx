import { PreferencesSettings } from "@/components/settings/PreferencesSettings";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preferencias - Configuración | Sodare",
};

export default function PreferencesPage() {
  return <PreferencesSettings />;
}
