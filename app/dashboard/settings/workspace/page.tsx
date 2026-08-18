import { WorkspaceSettings } from "@/components/settings/WorkspaceSettings";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workspace - Configuración | Sodare",
};

export default function WorkspacePage() {
  return <WorkspaceSettings />;
}
