/**
 * BotMaker connection resolution and HTTP client.
 * Authentication, URL validation, SSRF prevention, and per-workspace token lookup.
 */

import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";
import type { BotmakerConnection } from "./types";

const BASE = "https://api.botmaker.com/v2.0";

const ALLOWED_BOTMAKER_HOSTS = new Set(["api.botmaker.com", "go.botmaker.com"]);

/** Normalize a user-entered BotMaker base URL (adds scheme, strips trailing slash). */
export function normalizeBotmakerBase(raw?: string | null): string {
  const DEFAULT = "https://api.botmaker.com/v2.0";
  let b = (raw || "").trim();
  if (!b) return DEFAULT;
  if (!/^https?:\/\//i.test(b)) b = "https://" + b;

  // SSRF prevention: check if hostname is allowed
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(b);
  } catch {
    return DEFAULT;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  // Allow localhost ONLY in non-production environments for local testing/development
  const isDevLocal =
    process.env.NODE_ENV !== "production" &&
    (hostname === "localhost" || hostname === "127.0.0.1");

  if (!ALLOWED_BOTMAKER_HOSTS.has(hostname) && !isDevLocal) {
    throw new Error(`[BOTMAKER] Host no permitido: ${hostname}`);
  }

  return b.replace(/\/+$/, "");
}

/**
 * Resolve the per-workspace BotMaker connection (base URL + access token).
 * The user connects their OWN url + access/refresh token in Integraciones; the
 * tokens are stored AES-256 encrypted in the Integration record.
 *
 * Priority:
 *   1. Encrypted Integration (provider "botmaker") for the workspace.
 *   2. env BOTMAKER_ACCESS_TOKEN — **development only** (shared, not for tenants).
 */
export async function getBotmakerConnection(
  workspaceId: string
): Promise<BotmakerConnection | null> {
  try {
    const integ = await prisma.integration.findUnique({
      where: {
        workspaceId_provider_userId: {
          workspaceId,
          provider: "botmaker",
          userId: "workspace",
        },
      },
    });
    const creds = integ?.credentials as Record<string, unknown> | null;
    if (integ?.connected && creds?.accessToken) {
      const accessToken = decryptToken(creds.accessToken as string);
      if (accessToken) {
        return {
          baseUrl: normalizeBotmakerBase(creds.baseUrl as string | undefined),
          accessToken,
        };
      }
    }
  } catch {
    /* ignore — fall through */
  }

  // Dev-only global fallback. In production each workspace connects its own token.
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.BOTMAKER_ACCESS_TOKEN
  ) {
    return {
      baseUrl: normalizeBotmakerBase(process.env.BOTMAKER_BASE_URL),
      accessToken: process.env.BOTMAKER_ACCESS_TOKEN,
    };
  }
  return null;
}

/** Back-compat helper: just the access token. */
export async function getBotmakerToken(
  workspaceId: string
): Promise<string | null> {
  return (await getBotmakerConnection(workspaceId))?.accessToken ?? null;
}

/** Fetch a BotMaker path with the access-token header + basic 429 backoff. */
export async function botmakerFetch(
  path: string,
  token: string,
  init: RequestInit = {},
  retries = 2,
  baseUrl: string = BASE
): Promise<Response> {
  let cleanPath = path;
  if (cleanPath.startsWith("/v2.0/") && baseUrl.endsWith("/v2.0")) {
    cleanPath = cleanPath.substring(5);
  }
  if (!cleanPath.startsWith("/")) {
    cleanPath = "/" + cleanPath;
  }
  const res = await fetch(`${baseUrl}${cleanPath}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "access-token": token,
      ...(init.headers || {}),
    },
  });
  if (res.status === 429 && retries > 0) {
    await new Promise((r) => setTimeout(r, (3 - retries) * 1200));
    return botmakerFetch(path, token, init, retries - 1, baseUrl);
  }
  return res;
}
