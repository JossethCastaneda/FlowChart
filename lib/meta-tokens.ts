/**
 * Meta Token Management (Conforme a Meta Developers Best Practices)
 * 
 * Maneja:
 * - User Access Tokens (corta/larga vida, para Graph API)
 * - Page Access Tokens (almacenados pero NO DEVUELTOS al client)
 * - Business Account Tokens (si aplica)
 * 
 * REGLA CRÍTICA: User token ≠ Page token. No intercambiar.
 */

import { decryptToken } from "@/lib/encryption";
import { logger } from "@/lib/logger";

export interface PageTokenData {
  pageId: string;
  pageName: string;
  /** Page-level token (encriptado en DB, NUNCA enviado al client) */
  pageAccessToken: string;
  picture?: string | null;
  instagramBusinessAccountId?: string | null;
}

export interface UserTokenData {
  /** User-level token (para Graph API de user) */
  accessToken: string;
  expiresAt: string;
  refreshedAt: string;
  pages: PageTokenData[];
  module: string;
}

/**
 * Parse credentials from Integration table
 */
export function parseIntegrationCredentials(credentials: any): UserTokenData | null {
  if (!credentials?.accessToken) return null;

  try {
    const decrypted = decryptToken(credentials.accessToken);
    return {
      accessToken: decrypted,
      expiresAt: credentials.expiresAt || "",
      refreshedAt: credentials.refreshedAt || "",
      pages: Array.isArray(credentials.pages) 
        ? credentials.pages.map((p: any) => ({
            pageId: p.id,
            pageName: p.name,
            pageAccessToken: p.accessToken, // Already encrypted
            picture: p.picture,
            instagramBusinessAccountId: p.instagramId,
          }))
        : [],
      module: credentials.module || "unknown",
    };
  } catch (err) {
    logger.error("[META-TOKENS] Failed to parse credentials:", err);
    return null;
  }
}

/**
 * Get page access token by page ID (decrypts from storage)
 * INTERNAL ONLY — never return to client
 */
export function getPageTokenForFetch(pages: PageTokenData[], pageId: string): string | null {
  const page = pages.find(p => p.pageId === pageId);
  if (!page) return null;
  
  try {
    return decryptToken(page.pageAccessToken);
  } catch {
    return null;
  }
}

