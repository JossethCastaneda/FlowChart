import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Rutas públicas: dejar pasar siempre
    if (
      pathname.startsWith("/login") ||
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/invite") ||
      pathname.startsWith("/api/auth")
    ) {
      return NextResponse.next();
    }

    // Sin sesión → login
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Con sesión pero sin workspace → onboarding
    // Excepto si ya está en /onboarding
    if (!token.hasWorkspace && !pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
  ],
};
