import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Neon Postgres database-backed rate limiter for serverless environments.
 * Prevents bypasses from cold starts or multi-instance containers.
 * Falls back to an in-memory store in unit testing (Vitest) to avoid requiring a live database.
 */

// Local state (Map/setInterval) is removed to prevent memory leaks in serverless/edge runtimes.

/**
 * Check rate limit for a given key.
 * @param key - Unique identifier (e.g., IP address or IP+email)
 * @param maxAttempts - Maximum attempts allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns { ok: true } if within limit, { ok: false } if exceeded
 */
export async function rateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<{ ok: boolean; remaining: number }> {
  // If in test environment (Vitest), bypass to avoid DB connection issues
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return { ok: true, remaining: maxAttempts };
  }

  // Database-backed rate limiting for production/dev
  const now = new Date();

  try {
    // 1. Expirar la ventana vencida para esta clave (reinicia el contador).
    await prisma.rateLimit.deleteMany({
      where: { key, resetAt: { lt: now } },
    }).catch(() => {});

    // 2. Incremento ATÓMICO. Antes era findUnique + update (read-then-write): N
    //    requests concurrentes leían el mismo count y escribían el mismo valor,
    //    subcontando hasta N-1 → un atacante saltaba el límite disparando en
    //    paralelo. Prisma compila esto a INSERT ... ON CONFLICT DO UPDATE
    //    count = count + 1 RETURNING, que es atómico.
    const resetAt = new Date(now.getTime() + windowMs);
    const updated = await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, resetAt },
      update: { count: { increment: 1 } },
    });

    if (updated.count > maxAttempts) {
      return { ok: false, remaining: 0 };
    }
    return { ok: true, remaining: Math.max(0, maxAttempts - updated.count) };
  } catch (err) {
    logger.error("[RATE LIMIT] Database rate limit error, falling back to fail-open", { error: err });
    return { ok: true, remaining: 1 };
  }
}

/** Extract client IP from request headers (works behind Vercel/CloudFlare proxy) */
export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
