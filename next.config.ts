import { withWorkflow } from "workflow/next";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  
  // Configured for optimal Docker usage
  output: "standalone",
  
  // strict type checking is now enforced on build.
  images: {
    remotePatterns: [
      // Facebook / Meta
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "**.xx.fbcdn.net" },
      { protocol: "https", hostname: "graph.facebook.com" },
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      // Google — profile pictures from Google OAuth / Google Ads
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      // TikTok profile pictures
      { protocol: "https", hostname: "**.tiktokcdn.com" },
      { protocol: "https", hostname: "p16-sign-va.tiktokcdn.com" },
      { protocol: "https", hostname: "p77-sign-va.tiktokcdn.com" },
    ],
  },
  async rewrites() {
    // Si la variable está definida, mandamos todas las peticiones /api a dev.flowchart.lat (Backend)
    // El frontend actúa como proxy transparente
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/^\uFEFF/, ""); // Remove BOM if present
    if (apiUrl && apiUrl.startsWith("http")) {
      return [
        {
          source: '/api/:path*',
          missing: [
            {
              type: 'host',
              value: 'dev.flowchart.lat',
            },
          ],
          destination: `${apiUrl}/api/:path*`,
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
          { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_FRONTEND_URL || "https://flowchart.lat" },
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
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://www.google-analytics.com https://www.googleadservices.com https://connect.facebook.net https://www.facebook.com`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.fbcdn.net https://*.xx.fbcdn.net https://graph.facebook.com https://platform-lookaside.fbsbx.com https://*.cdninstagram.com https://www.googletagmanager.com https://www.google-analytics.com https://static.xx.fbcdn.net",
              "connect-src 'self' https://dev.flowchart.lat https://flowchart.lat https://graph.facebook.com https://*.facebook.com https://*.facebook.net https://api.resend.com https://vitals.vercel-insights.com https://www.google-analytics.com https://*.analytics.google.com https://*.google-analytics.com https://stats.g.doubleclick.net",
              "media-src 'self' blob: https://*.fbcdn.net https://*.cdninstagram.com",
              // frame-src: permite el popup/iframe del login de Facebook e iframe interno
              "frame-src 'self' https://www.facebook.com https://staticxx.facebook.com https://web.facebook.com",
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

const workflowConfig = withWorkflow(nextConfig);

export default withSentryConfig(workflowConfig, {
  // Sentry organization and project from environment
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for source map uploads (set in Vercel env, not in repo)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps for readable stack traces in Sentry
  // Source maps are deleted after upload — not served publicly
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Tunnel Sentry requests through /monitoring to bypass ad-blockers
  tunnelRoute: "/monitoring",

  // Suppress Sentry build output in CI
  silent: !process.env.CI,

  // Smaller client bundle — disable Sentry logger in production
  disableLogger: true,

  // Don't open Sentry in browser after build
  telemetry: false,
});
