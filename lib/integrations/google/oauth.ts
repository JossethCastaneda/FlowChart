import prisma from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/encryption";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

/**
 * decryptToken lanza ante credenciales en texto plano (legacy). En refresh/revoke eso
 * derribaba toda la operación. safeDecrypt degrada a "" para seguir un camino limpio
 * (refrescar o retornar null) en vez de propagar la excepción.
 */
function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return decryptToken(v);
  } catch {
    logger.warn("[OAUTH GOOGLE] Credencial no descifrable (¿legacy en texto plano?) — se requiere reconexión");
    return "";
  }
}

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

  const decryptedAccess = safeDecrypt(creds.accessToken);

  // If we have a valid token and it expires in more than 5 minutes, use it.
  // Si el descifrado falló (legacy plaintext), decryptedAccess = "" → forzamos refresh.
  if (decryptedAccess && creds.expiresAt && Date.now() < creds.expiresAt - 5 * 60 * 1000) {
    return decryptedAccess;
  }

  // Otherwise, refresh the token
  const clientId = env.GOOGLE_APIKEY_CONNECT;
  const clientSecret = env.GOOGLE_SECRET_CONNECT;

  if (!clientId || !clientSecret) {
    logger.error("[OAUTH GOOGLE] Missing client credentials to refresh token");
    return null;
  }

  const decryptedRefresh = safeDecrypt(creds.refreshToken);
  if (!decryptedRefresh) {
    logger.warn("[OAUTH GOOGLE] refresh token no descifrable — se requiere reconexión de Google");
    return null;
  }

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
      logger.error("[OAUTH GOOGLE] Failed to refresh token:", data);
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
    logger.error("[OAUTH GOOGLE] Exception while refreshing token:", err);
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
  const token = safeDecrypt(creds?.refreshToken) || safeDecrypt(creds?.accessToken);
  if (!token) return false;

  try {
    const res = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    });
    if (!res.ok) {
      logger.warn(`[OAUTH GOOGLE] Token revoke returned ${res.status} (continuing with local wipe)`);
    }
    return res.ok;
  } catch (err) {
    logger.warn("[OAUTH GOOGLE] Token revoke failed (continuing with local wipe):", err);
    return false;
  }
}
