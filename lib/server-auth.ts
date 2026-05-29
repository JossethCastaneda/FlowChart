import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

/**
 * Get the Meta access token from the JWT (server-side only).
 * This never exposes the token to the client.
 * Use this instead of session.accessToken in all API routes.
 */
export async function getMetaAccessToken(request: Request | NextRequest): Promise<string | null> {
  try {
    const token = await getToken({ req: request as NextRequest });
    return (token?.accessToken as string) || null;
  } catch {
    return null;
  }
}

/**
 * Fetch from Meta Graph API with Authorization Bearer header.
 * Never puts the token in the URL query string.
 */
export async function metaFetch(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

/**
 * Build a Meta Graph API URL (without access_token in query).
 */
export function metaUrl(path: string, params: Record<string, string> = {}): string {
  const base = `https://graph.facebook.com/v21.0/${path}`;
  const search = new URLSearchParams(params).toString();
  return search ? `${base}?${search}` : base;
}
