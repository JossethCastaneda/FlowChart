import prisma from "@/lib/prisma";

/**
 * Neon Postgres database-backed rate limiter for serverless environments.
 * Prevents bypasses from cold starts or multi-instance containers.
 * Falls back to an in-memory store in unit testing (Vitest) to avoid requiring a live database.
 */

const memoryStore = new Map<string, { count: number; resetAt: number }>();

// Periodically clean expired entries to prevent memory leaks in testing/development
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (now > entry.resetAt) memoryStore.delete(key);
  }
}, 60_000).unref?.();

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
  // If in test environment (Vitest), use in-memory store to avoid DB connection issues
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    const now = Date.now();
    const entry = memoryStore.get(key);

    if (!entry || now > entry.resetAt) {
      memoryStore.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true, remaining: maxAttempts - 1 };
    }

    entry.count++;
    if (entry.count > maxAttempts) {
      return { ok: false, remaining: 0 };
    }
    return { ok: true, remaining: maxAttempts - entry.count };
  }

  // Database-backed rate limiting for production/dev
  const now = new Date();

  try {
    // 1. Delete expired entry for this key specifically (efficient cleanup)
    await prisma.rateLimit.deleteMany({
      where: {
        key,
        resetAt: { lt: now },
      },
    }).catch(() => {});

    // 2. Find the rate limit entry
    const entry = await prisma.rateLimit.findUnique({
      where: { key },
    });

    if (!entry) {
      // Create new rate limit entry
      const resetAt = new Date(now.getTime() + windowMs);
      await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return { ok: true, remaining: maxAttempts - 1 };
    }

    const newCount = entry.count + 1;
    await prisma.rateLimit.update({
      where: { key },
      data: { count: newCount },
    });

    if (newCount > maxAttempts) {
      return { ok: false, remaining: 0 };
    }

    return { ok: true, remaining: Math.max(0, maxAttempts - newCount) };
  } catch (err) {
    console.error("[RATE LIMIT] Database rate limit error, falling back to fail-open:", err);
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
