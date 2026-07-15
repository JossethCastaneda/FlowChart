import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/clear-session
 *
 * Clears ALL next-auth session cookies (both the old incorrectly-named ones
 * and the correct ones) and redirects to /login.
 * 
 * Use this if you can't log out normally because of a broken/invalid session.
 * URL: /api/auth/clear-session
 */
export async function GET(_req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", _req.url));

  // Clear all known next-auth cookie variants
  const cookieNames = [
    // Standard (dev/local)
    "next-auth.session-token",
    "next-auth.csrf-token",
    "next-auth.callback-url",
    "next-auth.pkce.code_verifier",
    "next-auth.state",
    // Secure (production: __Secure- prefix)
    "__Secure-next-auth.session-token",
    "__Secure-next-auth.csrf-token",
    "__Secure-next-auth.callback-url",
    "__Secure-next-auth.pkce.code_verifier",
    "__Secure-next-auth.state",
    // Possibly set by our old config (just in case)
    "sodare_active_workspace",
  ];

  for (const name of cookieNames) {
    // Try to clear with various path/domain combinations
    res.cookies.set(name, "", { 
      maxAge: 0, 
      path: "/",
      expires: new Date(0),
    });
    res.cookies.set(name, "", { 
      maxAge: 0, 
      path: "/",
      domain: ".zefirus.xyz",
      expires: new Date(0),
    });
    res.cookies.set(name, "", { 
      maxAge: 0, 
      path: "/",
      domain: "zefirus.xyz",
      expires: new Date(0),
    });
  }

  return res;
}
