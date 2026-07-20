import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { decryptToken } from "@/lib/encryption";
import { logger } from "@/lib/logger";

import { env } from "./env";

/** Centralized Meta Graph API version — use this everywhere, never hardcode */
export const META_API_VERSION = env.META_API_VERSION;
const AUTH_SECRET = env.AUTH_SECRET || env.NEXTAUTH_SECRET;

/**
 * Module-to-provider mapping for config_id-specific tokens.
 */
const MODULE_PROVIDER_MAP: Record<string, string> = {
  // Publisher — dedicated configs with publish permissions
  publisher_facebook: "meta_publisher_facebook",
  publisher_instagram: "meta_publisher_instagram",
  // Other modules
  social: "meta_social",
  ads: "meta_ads",
  analytics: "meta_analytics",
  community: "meta_community",
  // Inbox / Community aliases — use Facebook app token (pages_messaging)
  inbox: "meta_community",
  messenger: "meta_community",
  listening: "meta_community",
  streams: "meta_community",
  // IG-specific inbox channels — use Instagram Publisher token
  // (instagram_manage_messages + instagram_manage_comments added July 2026)
  ig_inbox: "meta_publisher_instagram",
  ig_comments: "meta_publisher_instagram",
  instagram_inbox: "meta_publisher_instagram",
  // FB comments — community token has pages_read_user_content + pages_manage_engagement
  comments: "meta_community",
  // Aliases
  publisher: "meta_publisher_facebook",  // publisher defaults to FB publisher token
  // Suscripción de webhooks: usa el token genérico de workspace (cualquier
  // módulo conectado sirve para listar/suscribir páginas vía pages_show_list).
  webhook: "meta",
};

/**
 * Get the Meta access token for the current workspace.
 *
 * MODELO ESTRICTO POR MÓDULO: cada módulo usa EXCLUSIVAMENTE el token de la
 * cuenta vinculada en su propio botón de conexión (Integration meta_<module>).
 * Si el módulo no está conectado se devuelve null — NUNCA se cae al token de
 * otro módulo ni al genérico "meta", para que la cuenta de cada sección sea
 * independiente y no se crucen activos entre botones.
 *
 * El genérico "meta" solo aplica cuando NO se pasa módulo (plumbing a nivel
 * workspace, p. ej. suscripción de webhooks vía el alias "webhook").
 * El token de login (JWT) jamás se usa para activos.
 *
 * @param module - Nombre del módulo; resuelve su Integration dedicada.
 */
export async function getMetaAccessToken(
  request: Request | NextRequest,
  module?: string
): Promise<string | null> {
  try {
    const jwtToken = await getToken({ req: request as NextRequest, secret: AUTH_SECRET });
    if (!jwtToken?.sub) return null;

    const userId = jwtToken.sub;
    const workspaceId = await getActiveWorkspaceId(userId);

    if (workspaceId) {
      // 1. Try module-specific token first
      if (module) {
        const provider = MODULE_PROVIDER_MAP[module] || `meta_${module}`;
        const moduleIntegration = await prisma.integration.findUnique({
          where: {
            workspaceId_provider_userId: { workspaceId, provider, userId: "workspace" },
          },
        });
        if (moduleIntegration?.connected && moduleIntegration.credentials) {
          const creds = moduleIntegration.credentials as any;
          // A2 FIX: check token expiry before returning
          const expiresAt = creds.expiresAt ? new Date(creds.expiresAt) : null;
          const isExpired = !!expiresAt && expiresAt.getTime() < Date.now();
          if (creds.accessToken && !isExpired) return decryptToken(creds.accessToken);
          if (isExpired) {
            logger.warn(`[SERVER-AUTH] Token expired for ${module}`, { expiresAt: expiresAt?.toISOString() });
          }
        }

        // Modo estricto para TODOS los módulos: si el módulo no tiene su propia
        // Integration conectada, NO caemos al genérico "meta" (sería usar la
        // cuenta vinculada en OTRO botón). El caller debe pedir conectar la
        // sección en Integraciones. Excepción natural: alias que mapean a
        // "meta" explícitamente (p. ej. "webhook") ya se resolvieron arriba.
        return null;
      }

      // 2. Sin módulo: token genérico "meta" (plumbing a nivel workspace)
      const integration = await prisma.integration.findUnique({
        where: {
          workspaceId_provider_userId: { workspaceId, provider: "meta", userId: "workspace" },
        },
      });
      if (integration?.connected && integration.credentials) {
        const creds = integration.credentials as any;
        const expiresAt = creds.expiresAt ? new Date(creds.expiresAt) : null;
        const isExpired = !!expiresAt && expiresAt.getTime() < Date.now();
        if (creds.accessToken && !isExpired) return decryptToken(creds.accessToken);
        if (isExpired) {
          logger.warn(`[SERVER-AUTH] Generic meta token expired`, { expiresAt: expiresAt?.toISOString() });
        }
      }
    }

    // SIN fallback al token de login: el JWT solo identifica al usuario
    // (modelo comercial — login ≠ activos). Si no hay Integration conectada
    // para el módulo, el caller debe pedir conectar la sección en
    // Integraciones (api/connect/[module]).
    return null;
  } catch (err) {
    logger.error("[SERVER-AUTH] getMetaAccessToken error", { err });
    return null;
  }
}

/**
 * Resuelve el workspaceId activo del request (JWT → workspace activo).
 * Úsalo cuando necesites scopear datos por workspace en rutas que autentican vía
 * getMetaAccessToken (que resuelve el workspace internamente pero no lo expone).
 */
export async function getRequestWorkspaceId(
  request: Request | NextRequest
): Promise<string | null> {
  try {
    const jwtToken = await getToken({ req: request as NextRequest, secret: AUTH_SECRET });
    if (!jwtToken?.sub) return null;
    return await getActiveWorkspaceId(jwtToken.sub);
  } catch (err) {
    logger.error("[SERVER-AUTH] getRequestWorkspaceId error", { err });
    return null;
  }
}

/**
 * Fetch from Meta Graph API with Authorization Bearer header.
 * IMPORTANT: Use this instead of putting access_token in the URL query string.
 */
export async function metaFetch(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  // Strip any access_token from URL (safety net)
  const cleanUrl = url.replace(/([?&])access_token=[^&]+(&?)/g, (_, prefix, suffix) => {
    return suffix ? prefix : '';
  }).replace(/[?&]$/, '');

  let retries = 0;
  const maxRetries = 3;
  const isGet = !options.method || options.method === "GET";

  while (true) {
    const res = await fetch(cleanUrl, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
      ...(isGet && !options.cache ? { next: { revalidate: 3600, ...(options as any).next } } : {}),
    });

    if (!res.ok && retries < maxRetries) {
      // Distinguir un rate limit REAL de un 403 por permisos/token. 429 siempre es
      // throttle; un 403 SOLO es throttle si el error trae un código de rate limit
      // de Meta (4/17/32/613) — mismo criterio que auth.config.ts. Reintentar un 403
      // de token/permisos gastaría ~14s de backoff antes de fallar igual.
      let isRateLimit = res.status === 429;
      if (res.status === 403) {
        try {
          const errJson = await res.clone().json();
          const code = errJson?.error?.code;
          const msg = String(errJson?.error?.message || "").toLowerCase();
          isRateLimit = [4, 17, 32, 613].includes(code) || msg.includes("request limit") || msg.includes("rate limit");
        } catch {
          isRateLimit = false; // 403 sin cuerpo JSON → no es throttle, no reintentar
        }
      }

      if (isRateLimit) {
        retries++;
        // Exponential backoff: 2s, 4s, 8s + jitter
        const delay = Math.pow(2, retries) * 1000 + Math.random() * 500;
        logger.warn(`[META FETCH] Rate limit`, { status: res.status, url: cleanUrl.split('?')[0], retry: retries, maxRetries, delayMs: Math.round(delay) });
        await new Promise(r => setTimeout(r, delay));
        continue; // Try again
      }
    }

    // A. Proactive Rate Limit Compliance: Leer X-Business-Use-Case-Usage
    const usageHeader = res.headers.get("x-business-use-case-usage") || res.headers.get("x-app-usage");
    if (usageHeader) {
      try {
        const usageData = JSON.parse(usageHeader);
        let maxUsage = 0;
        let timeToRegain = 0;
        
        // Parse x-business-use-case-usage: {"{id}": [{"type": "...", "call_count": 80, ...}]}
        // Parse x-app-usage: {"call_count":80, "total_cputime":15, "total_time":12}
        Object.values(usageData).forEach((val: any) => {
          if (Array.isArray(val)) {
            val.forEach(item => {
              maxUsage = Math.max(maxUsage, item.call_count || 0, item.total_cputime || 0, item.total_time || 0);
              if (item.estimated_time_to_regain_access) {
                timeToRegain = Math.max(timeToRegain, item.estimated_time_to_regain_access);
              }
            });
          } else if (typeof val === "number") {
             // For x-app-usage flat object
             maxUsage = Math.max(maxUsage, val);
          }
        });

        if (maxUsage >= 90) {
           const sleepTime = timeToRegain > 0 ? timeToRegain * 1000 : 5000;
           logger.warn(`[META FETCH] Preemptive throttle. Usage at ${maxUsage}%. Sleeping for ${sleepTime}ms`);
           await new Promise(r => setTimeout(r, sleepTime));
        } else if (maxUsage >= 70) {
           logger.info(`[META FETCH] Usage at ${maxUsage}%`);
        }
      } catch (e) {
        logger.warn(`[META FETCH] Error parsing usage header`, { usageHeader });
      }
    }

    return res;
  }
}

/**
 * Build a Meta Graph API URL (without access_token in query).
 */
export function metaUrl(
  path: string,
  params: Record<string, string> = {}
): string {
  const base = `https://graph.facebook.com/${META_API_VERSION}/${path}`;
  const search = new URLSearchParams(params).toString();
  return search ? `${base}?${search}` : base;
}

/**
 * Paginated Meta Graph API GET — fetches all pages using Bearer header.
 * Returns concatenated data from all pages.
 */
export async function metaGetAll(
  initialUrl: string,
  token: string
): Promise<{ data: any[]; error?: string }> {
  const allData: any[] = [];
  let nextUrl: string | null = initialUrl;

  while (nextUrl) {
    const res = await metaFetch(nextUrl, token);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || "Meta API error";
      if (allData.length === 0) return { data: [], error: msg };
      break;
    }
    const json = await res.json();
    if (json.data) allData.push(...json.data);
    // Strip access_token from paging.next before re-using — metaFetch adds Bearer instead
    const rawNext = json.paging?.next || null;
    if (rawNext) {
      try {
        const nextUrlObj = new URL(rawNext);
        nextUrlObj.searchParams.delete("access_token");
        nextUrl = nextUrlObj.toString();
      } catch {
        nextUrl = null;
      }
    } else {
      nextUrl = null;
    }
  }

  return { data: allData };
}

/**
 * Automatically disconnects a Meta integration in the database if the token
 * is invalidated by Facebook (401 or OAuthException code 190/102).
 */
export async function handleMetaError(
  request: Request | NextRequest,
  module: string,
  errorResponse: any
): Promise<void> {
  const err = errorResponse?.error || errorResponse;
  const code = err?.code || 0;
  
  if (code === 190 || code === 102) {
    try {
      const jwtToken = await getToken({ req: request as NextRequest, secret: AUTH_SECRET });
      if (!jwtToken?.sub) return;
      const userId = jwtToken.sub;
      const workspaceId = await getActiveWorkspaceId(userId);
      if (!workspaceId) return;

      const provider = MODULE_PROVIDER_MAP[module] || `meta_${module}`;
      
      logger.warn(`[SERVER-AUTH] Token invalidated by Meta for module "${module}" (provider: "${provider}") in workspace ${workspaceId}. Marking integration as disconnected.`);
      
      await prisma.integration.update({
        where: {
          workspaceId_provider_userId: {
            workspaceId,
            provider,
            userId: "workspace",
          },
        },
        data: { connected: false },
      });
    } catch (e) {
      logger.error("[SERVER-AUTH] Failed to mark integration as disconnected on token error", { e });
    }
  }
}




