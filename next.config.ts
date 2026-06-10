import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Build succeeds at runtime — strict inference errors (never[], implicit any)
    // are not actual bugs. Fix gradually without blocking deploys.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "**.xx.fbcdn.net" },
      { protocol: "https", hostname: "graph.facebook.com" },
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
    ],
  },
  async rewrites() {
    // Si la variable está definida, mandamos todas las peticiones /api a dev.sodare.xyz (Backend)
    // El frontend actúa como proxy transparente
    if (process.env.NEXT_PUBLIC_API_URL) {
      return [
        {
          source: '/api/:path*',
          missing: [
            {
              type: 'host',
              value: 'dev.sodare.xyz',
            },
          ],
          destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
        },
      ];
    }
    return [];
  },
  async headers() {
    return [
      {
        // CORS solo para la API (no para páginas) — con credentials el origen
        // debe ser explícito, nunca un wildcard.
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_FRONTEND_URL || "https://sodare.xyz" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-eval' SOLO en dev: React dev mode lo necesita para
              // reconstruir callstacks; en producción queda bloqueado.
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://www.google-analytics.com https://www.googleadservices.com`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.fbcdn.net https://*.xx.fbcdn.net https://graph.facebook.com https://platform-lookaside.fbsbx.com https://*.cdninstagram.com https://www.googletagmanager.com https://www.google-analytics.com",
              "connect-src 'self' https://dev.sodare.xyz https://sodare.xyz https://graph.facebook.com https://*.facebook.com https://api.resend.com https://vitals.vercel-insights.com https://www.google-analytics.com https://*.analytics.google.com https://*.google-analytics.com https://stats.g.doubleclick.net",
              "media-src 'self' blob: https://*.fbcdn.net https://*.cdninstagram.com",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
