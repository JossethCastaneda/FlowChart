import { WorkspaceSettings } from "@/components/settings/WorkspaceSettings";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workspace - Configuración | FlowChart",
};

export default function WorkspacePage() {
  return <WorkspaceSettings />;
}
