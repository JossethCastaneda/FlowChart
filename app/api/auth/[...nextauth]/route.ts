import NextAuth from "next-auth";
import { authOptions } from "@/auth.config";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
/**
 * NextAuth v4 route handler.
 * We intercept the request to derive the actual host so that OAuth callbacks
 * always return to the domain the user visited (sodare.xyz), not the VERCEL_URL
 * preview subdomain (dev.sodare.xyz) that Vercel auto-injects.
 *
 * Strategy: if NEXTAUTH_URL is unset at request time, we set it from the
 * incoming Host header. This runs per-request (process.env mutations in
 * serverless functions are isolated to the invocation), so it is safe.
 */
async function handler(
  req: NextRequest,
  ctx: { params: Promise<{ nextauth: string[] }> }
) {
  // Always override NEXTAUTH_URL to match the current request host.
  // This prevents NextAuth from redirecting to VERCEL_URL (e.g. dev.sodare.xyz)
  // when the user is browsing on the main domain (sodare.xyz).
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "sodare.xyz";
  if (!host.includes("localhost")) {
    process.env.NEXTAUTH_URL = `${proto}://${host}`;
  }

  const nextAuth = NextAuth(authOptions);
  // NextAuth v4 handler accepts (req, res) — pass through with resolved params
  return nextAuth(req as any, { params: await ctx.params } as any);
}

export { handler as GET, handler as POST };

