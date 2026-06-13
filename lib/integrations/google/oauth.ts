import prisma from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/encryption";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export interface GoogleCredentials {
  accessToken?: string;
  refreshToken?: string;
  grantedScopes?: string[];
  expiresAt?: number;
  resources?: Record<string, any>;
  lastRequestedModules?: string[];
}

/**
 * Gets a valid Google access token for the workspace.
 * If the current token is expired (or close to expiring), it will use the 
 * refresh token to get a new one, update the database, and return the new access token.
 */
export async function refreshAccessToken(workspaceId: string): Promise<string | null> {
  const integration = await prisma.integration.findUnique({
    where: { workspaceId_provider_userId: { workspaceId, provider: "google", userId: "workspace" } },
  });

  if (!integration || !integration.connected) {
    return null;
  }

  const creds = integration.credentials as unknown as GoogleCredentials;
  if (!creds || !creds.refreshToken) {
    return null;
  }

  const decryptedAccess = decryptToken(creds.accessToken);
  
  // If we have a token and it expires in more than 5 minutes, use it
  if (creds.expiresAt && Date.now() < creds.expiresAt - 5 * 60 * 1000) {
    return decryptedAccess;
  }

  // Otherwise, refresh the token
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[OAUTH GOOGLE] Missing client credentials to refresh token");
    return null;
  }

  const decryptedRefresh = decryptToken(creds.refreshToken);

  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: decryptedRefresh,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[OAUTH GOOGLE] Failed to refresh token:", data);
      return null;
    }

    const newAccessToken = encryptToken(data.access_token);
    // Refresh tokens might be returned in the response, if so update it
    const newRefreshToken = data.refresh_token ? encryptToken(data.refresh_token) : creds.refreshToken;

    const newCreds: GoogleCredentials = {
      ...creds,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    await prisma.integration.update({
      where: { id: integration.id },
      data: { credentials: newCreds as any },
    });

    return data.access_token; // Return unencrypted version for immediate use
  } catch (err) {
    console.error("[OAUTH GOOGLE] Exception while refreshing token:", err);
    return null;
  }
}

/**
 * Revoca el grant de OAuth en Google (política de Google: al desconectar,
 * la app debe revocar los tokens, no solo borrarlos de su DB).
 * Revocar el refresh token invalida todo el grant. Best-effort: si Google
 * falla, el caller debe continuar borrando las credenciales locales.
 */
export async function revokeGoogleToken(creds: GoogleCredentials | null | undefined): Promise<boolean> {
  const token = decryptToken(creds?.refreshToken) || decryptToken(creds?.accessToken);
  if (!token) return false;

  try {
    const res = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    });
    if (!res.ok) {
      console.warn(`[OAUTH GOOGLE] Token revoke returned ${res.status} (continuing with local wipe)`);
    }
    return res.ok;
  } catch (err) {
    console.warn("[OAUTH GOOGLE] Token revoke failed (continuing with local wipe):", err);
    return false;
  }
}
