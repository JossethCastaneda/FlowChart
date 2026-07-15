/**
 * Resolve the application base URL.
 * Priority:
 *  1. NEXTAUTH_URL env var (if set, non-empty and not localhost in production)
 *  2. VERCEL_URL (auto-injected by Vercel — note: may be empty in prod)
 *  3. Hardcoded production fallback
 *
 * Guards:
 *  - Strips surrounding quotes (Vercel .env.production sometimes stores `""` literally)
 *  - Returns a plain string, never throws — callers that do `new URL(getBaseUrl())`
 *    should wrap in try/catch if used at module level.
 */
function cleanEnv(val: string | undefined): string {
  if (!val) return "";
  // Remove surrounding double-quotes injected by `vercel env pull`
  return val.replace(/^"|"$/g, "").trim();
}

export function getBaseUrl(): string {
  const nextAuthUrl = cleanEnv(process.env.NEXTAUTH_URL);
  const vercelUrl = cleanEnv(process.env.VERCEL_URL);

  // 1. Explicit NEXTAUTH_URL (set in Vercel dashboard or .env.local)
  if (nextAuthUrl && !nextAuthUrl.includes("localhost")) {
    return nextAuthUrl.replace(/\/$/, "");
  }

  // 2. VERCEL_URL auto-injected per deployment — only use if non-empty
  //    (it can be blank in prod when a custom domain is the primary)
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  // 3. NEXTAUTH_URL even if localhost (for local dev)
  if (nextAuthUrl) {
    return nextAuthUrl.replace(/\/$/, "");
  }

  // 4. Last resort hardcoded production domain
  return "https://zefirus.xyz";
}
