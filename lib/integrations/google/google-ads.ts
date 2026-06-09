import prisma from "@/lib/prisma";
import { refreshAccessToken, GoogleCredentials } from "./oauth";

export async function getAdsCampaigns(workspaceId: string) {
  const integration = await prisma.integration.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: "google" } },
  });

  if (!integration || !integration.connected) {
    throw new Error("Google not connected");
  }

  const creds = integration.credentials as unknown as GoogleCredentials;
  const customerId = creds.resources?.google_ads?.customerId;

  if (!customerId) {
    throw new Error("Módulo Google Ads no configurado (falta customerId)");
  }

  const accessToken = await refreshAccessToken(workspaceId);
  if (!accessToken) {
    throw new Error("No se pudo obtener token de acceso");
  }

  // STUB: "not implemented" + URL del endpoint
  throw new Error("Módulo Google Ads no implementado. Referencia: https://developers.google.com/google-ads/api/docs/start");
}

/** 
 * TODO: Implement "manage" capabilities for Google Ads
 * Examples: pauseCampaign, updateBudget
 */
export async function pauseCampaign(workspaceId: string, campaignId: string) {
  throw new Error("Not implemented - TODO");
}
