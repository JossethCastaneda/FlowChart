/**
 * Auto-reparacion idempotente de suscripciones a webhooks de Meta.
 *
 * CRITICO: subscribed_apps es un PUT implicito — cada llamada reemplaza TODOS
 * los campos suscritos de esa pagina. Si hay dos integraciones (ej. community +
 * social) con las mismas paginas, procesarlas en loop hace que la segunda
 * sobreescriba a la primera, eliminando campos (ej. 'messages' de Messenger).
 * Por eso se calcula la UNION de scopes de todas las integraciones antes de
 * suscribir, y se llama subscribePages UNA SOLA VEZ por pagina.
 *
 * Corre SERVER-SIDE, disparada desde el stream SSE del inbox.
 */

import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";
import { subscribePages, type SubscribablePage } from "@/lib/meta-webhooks";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

const ENSURE_TTL_MS = 6 * 60 * 60 * 1000;
const GUARD_ENDPOINT = "webhook-ensure";

type MetaCreds = {
  pages?: Array<{ id: string; name?: string; accessToken?: string; instagramId?: string | null }>;
  grantedScopes?: string[];
  [k: string]: unknown;
};

export async function ensureWebhookSubscriptions(
  workspaceId: string,
): Promise<{ subscribed: number; failed: number; scopesUsed: string[] } | null> {
  try {
    const now = Date.now();

    const guard = await prisma.metaAnalyticsCache.findUnique({
      where: { workspaceId_endpoint_paramsKey: { workspaceId, endpoint: GUARD_ENDPOINT, paramsKey: "" } },
      select: { updatedAt: true },
    });
    if (guard && now - guard.updatedAt.getTime() < ENSURE_TTL_MS) return null;

    await prisma.metaAnalyticsCache.upsert({
      where: { workspaceId_endpoint_paramsKey: { workspaceId, endpoint: GUARD_ENDPOINT, paramsKey: "" } },
      create: { workspaceId, endpoint: GUARD_ENDPOINT, paramsKey: "", data: {} },
      update: { data: {} },
    }).catch(() => {});

    const integrations = await prisma.integration.findMany({
      where: { workspaceId, provider: { startsWith: "meta" }, connected: true },
      select: { id: true, provider: true, credentials: true },
    });
    if (integrations.length === 0) return null;

    // FIX: Union de scopes + dedup de paginas
    // subscribed_apps es PUT implicito: cada llamada REEMPLAZA todos los
    // subscribed_fields. Procesar cada integracion por separado hacia que la
    // segunda eliminara los campos de la primera (ej. 'messages' de
    // pages_messaging se perdia cuando publisher_facebook conectaba despues
    // de community/messenger).
    const unionScopes = new Set<string>();
    const pageMap = new Map<string, SubscribablePage>();

    // Priorizar community/meta para sus page tokens
    const sorted = [...integrations].sort((a, b) => {
      const priority = (p: string) => (p === "meta_community" || p === "meta" ? 0 : 1);
      return priority(a.provider) - priority(b.provider);
    });

    for (const intg of sorted) {
      const creds = (intg.credentials as MetaCreds) || {};
      for (const s of creds.grantedScopes ?? []) unionScopes.add(s);
      for (const p of creds.pages ?? []) {
        if (!p.accessToken || pageMap.has(p.id)) continue;
        let token: string;
        try {
          token = decryptToken(p.accessToken);
        } catch {
          continue;
        }
        pageMap.set(p.id, {
          id: p.id,
          name: p.name,
          accessToken: token,
          instagramId: p.instagramId ?? null,
        });
      }
    }

    const subscribable = Array.from(pageMap.values());
    if (subscribable.length === 0) return null;

    const combinedScopes = Array.from(unionScopes);

    logger.info("[ENSURE-WEBHOOKS] Suscripcion con scopes unificados", {
      workspaceId,
      integrations: sorted.map((i) => i.provider),
      pages: subscribable.length,
      scopes: combinedScopes,
    });

    const results = await subscribePages(subscribable, env.META_API_VERSION, combinedScopes);
    const subscribed = results.filter((r) => r.success).length;
    const failed = results.length - subscribed;

    logger.info("[ENSURE-WEBHOOKS] Re-suscripcion completada", {
      workspaceId,
      subscribed,
      failed,
      failures: results.filter((r) => !r.success).slice(0, 5).map((r) => ({ id: r.id, error: r.error })),
    });

    return { subscribed, failed, scopesUsed: combinedScopes };
  } catch (err) {
    logger.warn("[ENSURE-WEBHOOKS] fallo", {
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
