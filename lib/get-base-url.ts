/**
 * Resolve the application base URL.
 * Priority:
 *  1. NEXTAUTH_URL env var (if set and not localhost in production)
 *  2. VERCEL_URL (auto-injected by Vercel on every deployment)
 *  3. Hardcoded fallback
 */
export function getBaseUrl(): string {
  // 1. Explicit NEXTAUTH_URL (set by developer)
  if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }

  // 2. VERCEL_URL (auto-injected by Vercel — no protocol prefix)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 3. NEXTAUTH_URL even if localhost (for local dev)
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }

  // 4. Last resort fallback
  return "https://sodare-git-main-josseths-projects-b50cae29.vercel.app";
}
