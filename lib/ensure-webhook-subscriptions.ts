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
 *    Graph en cada apertura del inbox. El guard se persiste en la tabla de
 *    cache dedicada (MetaAnalyticsCache), NO en las credenciales de la
 *    integración — así nunca reescribe el JSON de tokens ni compite con el
 *    cron de refresco de tokens (evita clobber del access token).
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
const GUARD_ENDPOINT = "webhook-ensure"; // fila en MetaAnalyticsCache usada como guard

type MetaCreds = {
  pages?: Array<{ id: string; name?: string; accessToken?: string; instagramId?: string | null }>;
  grantedScopes?: string[];
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
    const now = Date.now();

    // Guard por workspace (una sola fila, no por integración): si se verificó
    // hace < TTL, salir sin tocar Graph. updatedAt se refresca en cada upsert.
    const guard = await prisma.metaAnalyticsCache.findUnique({
      where: { workspaceId_endpoint_paramsKey: { workspaceId, endpoint: GUARD_ENDPOINT, paramsKey: "" } },
      select: { updatedAt: true },
    });
    if (guard && now - guard.updatedAt.getTime() < ENSURE_TTL_MS) return null;

    // Sella ANTES de la red (lock optimista): conexiones SSE concurrentes que
    // abran el mismo inbox no dispararán la suscripción en paralelo.
    await prisma.metaAnalyticsCache.upsert({
      where: { workspaceId_endpoint_paramsKey: { workspaceId, endpoint: GUARD_ENDPOINT, paramsKey: "" } },
      create: { workspaceId, endpoint: GUARD_ENDPOINT, paramsKey: "", data: {} },
      update: { data: {} }, // fuerza refresco de updatedAt (@updatedAt)
    }).catch(() => {});

    // Integraciones Meta con page tokens: community es la del inbox FB/IG.
    const integrations = await prisma.integration.findMany({
      where: { workspaceId, provider: { startsWith: "meta" }, connected: true },
      select: { id: true, provider: true, credentials: true },
    });
    if (integrations.length === 0) return null;

    const summaries: { integration: string; subscribed: number; failed: number }[] = [];

    for (const intg of integrations) {
      const creds = (intg.credentials as MetaCreds) || {};
      const pages = creds.pages ?? [];
      if (pages.length === 0) continue;

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
