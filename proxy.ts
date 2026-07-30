import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Middleware simple sin withAuth wrapper.
// withAuth fuerza un redirect a login ANTES de ejecutar
// la función middleware cuando authorized() retorna false,
// lo que impedía que las rutas públicas funcionaran.

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // ── Rutas públicas: NUNCA bloquear ──
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/api/invite") ||
    pathname.startsWith("/api/auth/register")
  ) {
    return NextResponse.next();
  }

  // Obtener token JWT
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  });

  // Sin sesión → login
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Con sesión pero sin workspace → onboarding
  // EXCEPTO si ya está en /onboarding
  if (!token.hasWorkspace && !pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/connect/:path*",
  ],
};
