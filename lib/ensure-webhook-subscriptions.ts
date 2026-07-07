/**
 * Auto-reparación idempotente de suscripciones a webhooks de Meta.
 *
 * Contexto: la suscripción de páginas solo ocurría al conectar un módulo o al
 * llamar manualmente a /api/webhooks/subscribe. Cuando la suscripción falló en
 * su momento (p. ej. el bug todo-o-nada por scopes — ver lib/meta-webhooks), las
 * conexiones existentes quedaban SIN webhooks y el inbox no recibía mensajes en
 * tiempo real, sin forma de auto-repararse salvo reconectar a mano.
 *
 * Esta función re-ejecuta la suscripción (ya consciente de scopes) usando los
 * page tokens ya almacenados en la Integration. Es:
 *  - Idempotente: subscribed_apps se puede reenviar sin efectos secundarios.
 *  - Guardada: se salta si corrió hace menos de ENSURE_TTL_MS para no golpear
 *    Graph en cada apertura del inbox (sella `webhooksEnsuredAt` en credentials).
 *  - Silenciosa: nunca lanza; los fallos se loguean. Pensada para fire-and-forget.
 *
 * Corre SERVER-SIDE (el ENCRYPTION_KEY de producción descifra los page tokens),
 * disparada desde el stream SSE del inbox: abrir el inbox repara las
 * suscripciones sin acción manual del usuario.
 */

import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";
import { subscribePages, type SubscribablePage } from "@/lib/meta-webhooks";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

const ENSURE_TTL_MS = 6 * 60 * 60 * 1000; // 6h entre re-verificaciones por workspace

type MetaCreds = {
  pages?: Array<{ id: string; name?: string; accessToken?: string; instagramId?: string | null }>;
  grantedScopes?: string[];
  webhooksEnsuredAt?: string;
  [k: string]: unknown;
};

/**
 * Asegura que las páginas del workspace estén suscritas a los webhooks.
 * Devuelve un resumen (o null si no hizo nada). Nunca lanza.
 */
export async function ensureWebhookSubscriptions(
  workspaceId: string,
): Promise<{ integration: string; subscribed: number; failed: number }[] | null> {
  try {
    // Integraciones Meta con page tokens: community es la del inbox FB/IG.
    const integrations = await prisma.integration.findMany({
      where: { workspaceId, provider: { startsWith: "meta" }, connected: true },
      select: { id: true, provider: true, credentials: true },
    });
    if (integrations.length === 0) return null;

    const now = Date.now();
    const summaries: { integration: string; subscribed: number; failed: number }[] = [];

    for (const intg of integrations) {
      const creds = (intg.credentials as MetaCreds) || {};
      const pages = creds.pages ?? [];
      if (pages.length === 0) continue;

      // Guard: saltar si se verificó hace poco.
      const ensuredAt = creds.webhooksEnsuredAt ? Date.parse(creds.webhooksEnsuredAt) : 0;
      if (ensuredAt && now - ensuredAt < ENSURE_TTL_MS) continue;

      // Sella ANTES de la red (lock optimista): conexiones SSE concurrentes que
      // abran el mismo inbox no dispararán la suscripción en paralelo.
      await prisma.integration.update({
        where: { id: intg.id },
        data: { credentials: { ...creds, webhooksEnsuredAt: new Date(now).toISOString() } },
      }).catch(() => {});

      const subscribable: SubscribablePage[] = [];
      for (const p of pages) {
        if (!p.accessToken) continue;
        let token: string;
        try {
          token = decryptToken(p.accessToken);
        } catch {
          continue; // token ilegible con la clave actual — omitir esta página
        }
        subscribable.push({ id: p.id, name: p.name, accessToken: token, instagramId: p.instagramId ?? null });
      }
      if (subscribable.length === 0) continue;

      const results = await subscribePages(subscribable, env.META_API_VERSION, creds.grantedScopes);
      const subscribed = results.filter((r) => r.success).length;
      const failed = results.length - subscribed;
      summaries.push({ integration: intg.provider, subscribed, failed });

      logger.info("[ENSURE-WEBHOOKS] Re-suscripción automática", {
        workspaceId,
        provider: intg.provider,
        subscribed,
        failed,
        failures: results.filter((r) => !r.success).slice(0, 5).map((r) => ({ id: r.id, error: r.error })),
      });
    }

    return summaries.length > 0 ? summaries : null;
  } catch (err) {
    logger.warn("[ENSURE-WEBHOOKS] falló", {
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
