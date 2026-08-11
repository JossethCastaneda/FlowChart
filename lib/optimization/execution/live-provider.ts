import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";
import { env } from "@/lib/env";
import { googleFetch } from "@/lib/google-fetch";
import { GOOGLE_ADS_API_VERSION } from "@/lib/integrations/google/google-ads";
import { refreshAccessToken } from "@/lib/integrations/google/oauth";
import { META_API_VERSION, metaFetch } from "@/lib/server-auth";
import type { JsonValue } from "../contracts";
import {
  normalizeAccountId,
  ProviderExecutionError,
  remoteStateFingerprint,
  type OptimizationExecutionProvider,
  type ProviderAction,
  type RemoteActionState,
} from "./provider";

type StoredMetaCredentials = { accessToken?: string; expiresAt?: string | number };

async function getWorkspaceMetaAdsToken(workspaceId: string) {
  for (const provider of ["meta_ads", "meta"]) {
    const integration = await prisma.integration.findUnique({
      where: { workspaceId_provider_userId: { workspaceId, provider, userId: "workspace" } },
      select: { connected: true, credentials: true },
    });
    if (!integration?.connected || !integration.credentials) continue;
    const credentials = integration.credentials as unknown as StoredMetaCredentials;
    if (!credentials.accessToken) continue;
    const expiresAt = credentials.expiresAt ? new Date(credentials.expiresAt).getTime() : null;
    if (expiresAt && expiresAt <= Date.now()) continue;
    try {
      return decryptToken(credentials.accessToken);
    } catch {
      throw new ProviderExecutionError("Las credenciales de Meta requieren reconexión", "META_CREDENTIALS_INVALID", 409);
    }
  }
  throw new ProviderExecutionError("Meta Ads no está conectado para este workspace", "META_NOT_CONNECTED", 409);
}

function requireNumericId(value: string, name: string) {
  const normalized = normalizeAccountId(value);
  if (!/^\d+$/.test(normalized)) {
    throw new ProviderExecutionError(`${name} no es válido`, "REMOTE_IDENTIFIER_INVALID", 422);
  }
  return normalized;
}

async function readMeta(workspaceId: string, action: ProviderAction): Promise<RemoteActionState> {
  const token = await getWorkspaceMetaAdsToken(workspaceId);
  const campaignId = requireNumericId(action.entity.id, "campaignId");
  const response = await metaFetch(
    `https://graph.facebook.com/${META_API_VERSION}/${campaignId}?fields=id,status,account_id`,
    token,
    { cache: "no-store" }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ProviderExecutionError(payload?.error?.message || "Meta no pudo leer la campaña", "META_READ_FAILED");
  }
  if (normalizeAccountId(String(payload.account_id ?? "")) !== normalizeAccountId(action.accountId)) {
    throw new ProviderExecutionError("La campaña no pertenece a la cuenta autorizada", "REMOTE_ACCOUNT_MISMATCH", 403);
  }
  const value = String(payload.status) as JsonValue;
  return {
    value,
    fingerprint: remoteStateFingerprint(action, value),
    providerRequestId: response.headers.get("x-fb-trace-id") ?? undefined,
  };
}

async function applyMeta(workspaceId: string, action: ProviderAction, value: JsonValue) {
  const token = await getWorkspaceMetaAdsToken(workspaceId);
  const campaignId = requireNumericId(action.entity.id, "campaignId");
  const response = await metaFetch(`https://graph.facebook.com/${META_API_VERSION}/${campaignId}`, token, {
    method: "POST",
    cache: "no-store",
    body: JSON.stringify({ status: value }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ProviderExecutionError(payload?.error?.message || "Meta rechazó el cambio", "META_WRITE_FAILED");
  }
  return readMeta(workspaceId, action);
}

async function googleContext(workspaceId: string, accountId: string) {
  const developerToken = env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    throw new ProviderExecutionError("Google Ads no está configurado en el servidor", "GOOGLE_NOT_CONFIGURED", 409);
  }
  const accessToken = await refreshAccessToken(workspaceId);
  if (!accessToken) {
    throw new ProviderExecutionError("Google Ads requiere reconexión", "GOOGLE_NOT_CONNECTED", 409);
  }
  return { accessToken, developerToken, customerId: requireNumericId(accountId, "accountId") };
}

async function readGoogle(workspaceId: string, action: ProviderAction): Promise<RemoteActionState> {
  const { accessToken, developerToken, customerId } = await googleContext(workspaceId, action.accountId);
  const campaignId = requireNumericId(action.entity.id, "campaignId");
  const response = await googleFetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:search`,
    accessToken,
    {
      method: "POST",
      cache: "no-store",
      headers: { "developer-token": developerToken, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `SELECT campaign.id, campaign.status FROM campaign WHERE campaign.id = ${campaignId} LIMIT 1`,
      }),
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ProviderExecutionError(payload?.error?.message || "Google no pudo leer la campaña", "GOOGLE_READ_FAILED");
  }
  const status = payload?.results?.[0]?.campaign?.status;
  if (!status) throw new ProviderExecutionError("Campaña de Google no encontrada en la cuenta autorizada", "REMOTE_ENTITY_NOT_FOUND", 404);
  const value = (status === "ENABLED" ? "ACTIVE" : status) as JsonValue;
  return {
    value,
    fingerprint: remoteStateFingerprint(action, value),
    providerRequestId: response.headers.get("request-id") ?? undefined,
  };
}

async function applyGoogle(workspaceId: string, action: ProviderAction, value: JsonValue) {
  const { accessToken, developerToken, customerId } = await googleContext(workspaceId, action.accountId);
  const campaignId = requireNumericId(action.entity.id, "campaignId");
  const status = value === "ACTIVE" ? "ENABLED" : value;
  const response = await googleFetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/campaigns:mutate`,
    accessToken,
    {
      method: "POST",
      cache: "no-store",
      headers: { "developer-token": developerToken, "Content-Type": "application/json" },
      body: JSON.stringify({
        operations: [{
          update: { resourceName: `customers/${customerId}/campaigns/${campaignId}`, status },
          updateMask: "status",
        }],
      }),
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ProviderExecutionError(payload?.error?.message || "Google rechazó el cambio", "GOOGLE_WRITE_FAILED");
  }
  return readGoogle(workspaceId, action);
}

export const liveOptimizationProvider: OptimizationExecutionProvider = {
  read(workspaceId, action) {
    return action.provider === "meta" ? readMeta(workspaceId, action) : readGoogle(workspaceId, action);
  },
  apply(workspaceId, action, value) {
    return action.provider === "meta" ? applyMeta(workspaceId, action, value) : applyGoogle(workspaceId, action, value);
  },
};
