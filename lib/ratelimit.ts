/**
 * In-memory rate limiter for serverless environments.
 * Each cold start resets the store — acceptable for burst protection.
 * For persistent rate limiting across instances, upgrade to Upstash Ratelimit.
 */

const store = new Map<string, { count: number; resetAt: number }>();

// Periodically clean expired entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000).unref?.(); // unref so it doesn't keep the process alive

/**
 * Check rate limit for a given key.
 * @param key - Unique identifier (e.g., IP address or IP+email)
 * @param maxAttempts - Maximum attempts allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns { ok: true } if within limit, { ok: false } if exceeded
 */
export function rateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxAttempts - 1 };
  }

  entry.count++;
  if (entry.count > maxAttempts) {
    return { ok: false, remaining: 0 };
  }
  return { ok: true, remaining: maxAttempts - entry.count };
}

/** Extract client IP from request headers (works behind Vercel/CloudFlare proxy) */
export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
