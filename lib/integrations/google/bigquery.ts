import prisma from "@/lib/prisma";
import { refreshAccessToken, GoogleCredentials } from "./oauth";

export async function runBigQueryReport(workspaceId: string, query: string) {
  const integration = await prisma.integration.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: "google" } },
  });

  if (!integration || !integration.connected) {
    throw new Error("Google not connected");
  }

  const creds = integration.credentials as unknown as GoogleCredentials;
  const projectId = creds.resources?.bigquery?.projectId;

  if (!projectId) {
    throw new Error("Módulo BigQuery no configurado (falta projectId)");
  }

  const accessToken = await refreshAccessToken(workspaceId);
  if (!accessToken) {
    throw new Error("No se pudo obtener token de acceso");
  }

  // STUB: "not implemented" + URL del endpoint
  throw new Error("Módulo BigQuery no implementado. Referencia: https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query");
}
