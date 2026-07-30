import { logger } from "@/lib/logger";

/**
 * Executes a fetch request to a Google API with automatic retry logic
 * for temporary network errors and Rate Limits (HTTP 429 / 503).
 *
 * @param url The Google API URL to fetch.
 * @param token The OAuth access token for authorization.
 * @param options Standard fetch options (method, body, headers).
 * @param maxRetries Maximum number of retries (default: 3).
 * @returns The Response object (or throws if all retries fail).
 */
export async function googleFetch(
  url: string,
  token: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, { ...options, headers });

      // If successful, return immediately
      if (response.ok) {
        return response;
      }

      // Handle Rate Limits (429) or Service Unavailable (503)
      if (response.status === 429 || response.status === 503) {
        if (attempt >= maxRetries) {
          throw new Error(`Google API Rate limit or 503 exceeded after ${maxRetries} retries`);
        }
        
        // Use Retry-After header if available, otherwise exponential backoff
        const retryAfter = response.headers.get("Retry-After");
        const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 1000 + Math.random() * 500;
        
        logger.warn(`[GOOGLE-FETCH] Rate limit (429/503) en ${url}, reintentando en ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        attempt++;
        continue;
      }

      // For other HTTP errors (400, 401, 403, 500), return the response to let the caller handle it.
      // E.g. a 401 means token expired, which caller might want to handle by refreshing.
      return response;

    } catch (error: any) {
      // Network errors (e.g. connection reset, timeout)
      if (attempt >= maxRetries) {
        logger.error(`[GOOGLE-FETCH] Fallo de red definitivo tras ${maxRetries} reintentos en ${url}`, error);
        throw error;
      }
      logger.warn(`[GOOGLE-FETCH] Fallo de red temporal en ${url}, reintentando...`, { error: error.message });
      const delayMs = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt++;
    }
  }

  throw new Error("Unreachable block in googleFetch");
}
