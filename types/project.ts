export interface ChannelConfig {
  platformId: string;
  platformName: string;
  adAccounts: string[];
  budget: string;
  period: string;
  goal: string;
  cpr: string;
}

export interface Project {
  id: string;
  name?: string;
  alias: string;
  client: string;
  vertical: string;
  fanpage: string[];
  instagram: string[];
  whatsapp: string[];
  webchat: string[];
  website: string;
  channels: ChannelConfig[];
  dateStart: string;
  dateEnd: string;
  persona: string;
  geo: string;
  status: "EN VUELO" | "EN ÓRBITA" | "Draft" | "Completado" | "Activo";
  workspaceId?: string;
  createdAt: string;
  updatedAt?: string;
  crmIntegrationId?: string | null;
  crmIntegrationIds?: string[];
  crmType?: string | null;
  botFlowType?: string | null;
}
