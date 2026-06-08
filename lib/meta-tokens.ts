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

import { decryptToken, encryptToken } from "@/lib/encryption";

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
    console.error("[META-TOKENS] Failed to parse credentials:", err);
    return null;
  }
}

/**
 * Validate token expiry (with 5-min buffer)
 */
export function isTokenExpired(expiresAtStr: string, bufferMinutes = 5): boolean {
  const expiresAt = new Date(expiresAtStr);
  const now = new Date();
  const buffer = bufferMinutes * 60 * 1000;
  return now.getTime() > expiresAt.getTime() - buffer;
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

/**
 * Determine which token (user vs page) should be used for a Graph API call
 * 
 * RULE:
 * - User token: GET /me/*, permissions checks, etc.
 * - Page token: POST /page/feed (publishing), page-level reads
 */
export function selectTokenForEndpoint(
  endpoint: string,
  method: "GET" | "POST" | "DELETE" = "GET"
): "user" | "page" {
  // Publishing endpoints require page token
  if (method === "POST" && endpoint.includes("/feed")) return "page";
  if (method === "POST" && endpoint.includes("/photos")) return "page";
  if (method === "POST" && endpoint.includes("/videos")) return "page";
  if (method === "DELETE" && endpoint.includes("/")) return "page";

  // Everything else uses user token
  return "user";
}
