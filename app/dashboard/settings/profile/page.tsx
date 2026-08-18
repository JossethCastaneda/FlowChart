import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Perfil - Configuración | Sodare",
};

export default function ProfilePage() {
  return <ProfileSettings />;
}
