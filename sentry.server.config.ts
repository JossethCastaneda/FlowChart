/**
 * Sentry server-side configuration (Node.js runtime).
 * Captures API route errors, server actions, and cron failures.
 * See: https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Disable Sentry entirely if DSN not configured
  enabled: !!SENTRY_DSN,

  // 10% of server transactions sampled — increase temporarily when debugging
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

  // Log server errors to console in development
  debug: false,

  // Scrub sensitive fields from captured events
  beforeSend(event) {
    // Strip auth tokens from request data
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>;
      for (const key of ["password", "accessToken", "token", "secret", "encryptionKey"]) {
        if (key in data) data[key] = "[Filtered]";
      }
    }
    // Strip auth headers
    if (event.request?.headers) {
      const headers = event.request.headers as Record<string, string>;
      if (headers["authorization"]) headers["authorization"] = "[Filtered]";
      if (headers["x-api-key"]) headers["x-api-key"] = "[Filtered]";
    }
    return event;
  },
});
