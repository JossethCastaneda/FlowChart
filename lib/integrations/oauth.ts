/**
 * OAuth token management for generic (non-Meta) providers.
 *
 * Handles: get credentials → check expiry → refresh if needed → re-encrypt → update DB.
 * All tokens are AES-256-GCM encrypted at rest via lib/encryption.ts.
 */

import prisma from "@/lib/prisma";
import { encryptToken, decryptToken } from "@/lib/encryption";
import { getProvider } from "./registry";

interface StoredCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes?: string[];
}

/**
 * Retrieve and decrypt OAuth credentials for a provider+workspace.
 * Returns null if no Integration exists or it's disconnected.
 */
export async function getProviderCredentials(
  workspaceId: string,
  provider: string
): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: string } | null> {
  const integ = await prisma.integration.findUnique({
    where: { workspaceId_provider: { workspaceId, provider } },
  });

  if (!integ?.connected) return null;

  const creds = integ.credentials as StoredCredentials | null;
  if (!creds?.accessToken) return null;

  return {
    accessToken: decryptToken(creds.accessToken),
    refreshToken: creds.refreshToken ? decryptToken(creds.refreshToken) : undefined,
    expiresAt: creds.expiresAt,
  };
}

/**
 * Refresh an OAuth access token using the stored refresh_token.
 * Re-encrypts and updates the DB. Returns the new access token.
 * Throws if no refresh token exists or the refresh fails.
 */
export async function refreshAccessToken(
  workspaceId: string,
  provider: string
): Promise<string> {
  const config = getProvider(provider);
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const creds = await getProviderCredentials(workspaceId, provider);
  if (!creds?.refreshToken) {
    throw new Error(`No refresh token for ${provider} in workspace ${workspaceId}`);
  }

  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];
  if (!clientId || !clientSecret) {
    throw new Error(`${config.clientIdEnv} or ${config.clientSecretEnv} not configured`);
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: creds.refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.text().catch(() => "unknown");
    throw new Error(`Token refresh failed for ${provider}: ${res.status} — ${error}`);
  }

  const data = await res.json();
  const newAccessToken: string = data.access_token;
  const newRefreshToken: string | undefined = data.refresh_token;
  const expiresIn: number | undefined = data.expires_in;

  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : undefined;

  // Re-encrypt and persist
  const refreshTokenToStore = newRefreshToken
    ? encryptToken(newRefreshToken)
    : creds.refreshToken
      ? encryptToken(creds.refreshToken)
      : null;

  const updatedCreds = {
    accessToken: encryptToken(newAccessToken),
    expiresAt: expiresAt ?? null,
    refreshToken: refreshTokenToStore,
  };

  await prisma.integration.update({
    where: { workspaceId_provider: { workspaceId, provider } },
    data: { credentials: updatedCreds },
  });

  return newAccessToken;
}

/**
 * Get a valid (non-expired) access token for a provider.
 * Automatically refreshes if expired and a refresh_token is available.
 */
export async function getValidAccessToken(
  workspaceId: string,
  provider: string
): Promise<string | null> {
  const creds = await getProviderCredentials(workspaceId, provider);
  if (!creds) return null;

  // Check expiry (with 5 min buffer)
  if (creds.expiresAt) {
    const expiresAt = new Date(creds.expiresAt).getTime();
    const buffer = 5 * 60 * 1000; // 5 minutes
    if (Date.now() > expiresAt - buffer) {
      if (creds.refreshToken) {
        try {
          return await refreshAccessToken(workspaceId, provider);
        } catch (err) {
          console.error(`[OAUTH] Refresh failed for ${provider}:`, err);
          return null;
        }
      }
      // Token expired, no refresh token — return null
      return null;
    }
  }

  return creds.accessToken;
}
