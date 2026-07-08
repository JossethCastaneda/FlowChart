/**
 * Sentry client-side configuration.
 * Captures frontend errors, React component errors, and performance traces.
 * See: https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Disable Sentry entirely if DSN not configured (dev without Sentry)
  enabled: !!SENTRY_DSN,

  // Capture 10% of transactions for performance monitoring in production.
  // Increase to 1.0 temporarily when profiling a specific issue.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

  // Capture 5% of sessions for session replays (helps reproduce UI bugs)
  replaysSessionSampleRate: 0.05,
  // Always capture replays for sessions with errors
  replaysOnErrorSampleRate: 1.0,

  // Don't report errors from browser extensions or 3rd-party scripts
  denyUrls: [/extensions\//i, /^chrome:\/\//i, /^safari-extension:/i],

  // Scrub sensitive fields from breadcrumbs and event data
  beforeSend(event) {
    // Strip auth tokens and passwords from request bodies
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>;
      for (const key of ["password", "accessToken", "token", "secret", "key"]) {
        if (key in data) data[key] = "[Filtered]";
      }
    }
    return event;
  },

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media in replays to protect user PII
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
