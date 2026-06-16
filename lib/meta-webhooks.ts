/**
 * Suscripción de páginas/IG a los webhooks de Meta (subscribed_apps).
 *
 * FUENTE ÚNICA de la lógica de suscripción: usada tanto por el endpoint
 * manual `api/webhooks/subscribe` como por el callback de conexión
 * (`api/connect/callback`) para que conectar un módulo deje las páginas
 * suscritas automáticamente, sin un paso manual posterior.
 *
 * NOTA: la suscripción de `ad_account` NO se hace aquí — Meta no expone
 * `subscribed_apps` para cuentas publicitarias; se configura a nivel App en
 * la consola de Meta Developers (ver INTEGRATIONS_SETUP.md).
 */

import { logger } from "@/lib/logger";

/** Campos de webhook para páginas de Facebook. */
export const PAGE_WEBHOOK_FIELDS = [
  "messages", // Messenger messages
  "messaging_postbacks", // Button clicks in Messenger
  "messaging_optins", // User opt-ins
  "messaging_referrals", // Referrals (m.me links, ads)
  "message_deliveries", // Delivery confirmations
  "message_reads", // Read receipts
  "feed", // Page feed events (posts, comments, reactions)
  "mention", // Page mentions
  "ratings", // Page ratings/reviews
  "leadgen", // Lead generation forms
];

/** Campos de webhook para cuentas de Instagram Business vinculadas a la página. */
export const INSTAGRAM_WEBHOOK_FIELDS = [
  "messages", // IG DMs
  "messaging_postbacks", // IG postbacks
  "comments", // Comments on IG posts
  "mentions", // IG mentions
  "live_comments", // Live comments
  "story_insights", // Story insights
];

export interface SubscribablePage {
  id: string;
  name?: string;
  /** Page Access Token EN TEXTO PLANO (ya descifrado). */
  accessToken: string;
  /** ID de la cuenta de IG Business vinculada, si existe. */
  instagramId?: string | null;
}

export interface SubscriptionResult {
  entity: string;
  id: string;
  type: "page" | "instagram";
  success: boolean;
  error?: string | null;
}

/**
 * Suscribe UNA página (y su IG vinculada, si aplica) a los webhooks.
 *
 * Cuando la página tiene IG, se envían los campos de página + IG en UN solo
 * POST: un segundo POST a `subscribed_apps` sobrescribiría los `subscribed_fields`
 * del primero, así que se unifican para no perder los campos de página.
 */
export async function subscribePageToWebhooks(
  page: SubscribablePage,
  version: string
): Promise<SubscriptionResult> {
  if (!page.accessToken) {
    return {
      entity: `Page: ${page.name ?? page.id}`,
      id: page.id,
      type: "page",
      success: false,
      error: "Sin page access token",
    };
  }

  const fields = page.instagramId
    ? [...new Set([...PAGE_WEBHOOK_FIELDS, ...INSTAGRAM_WEBHOOK_FIELDS])]
    : PAGE_WEBHOOK_FIELDS;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${version}/${page.id}/subscribed_apps`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${page.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscribed_fields: fields.join(",") }),
      }
    );
    const data = await res.json().catch(() => ({}));
    return {
      entity: `Page: ${page.name ?? page.id}`,
      id: page.id,
      type: "page",
      success: data.success === true,
      error: data.error?.message ?? null,
    };
  } catch (err) {
    return {
      entity: `Page: ${page.name ?? page.id}`,
      id: page.id,
      type: "page",
      success: false,
      error: err instanceof Error ? err.message : "Error de red",
    };
  }
}

/**
 * Suscribe un conjunto de páginas en paralelo. Nunca lanza: cada página
 * devuelve su propio resultado (success/error) para que un fallo aislado no
 * tumbe la conexión completa.
 */
export async function subscribePages(
  pages: SubscribablePage[],
  version: string
): Promise<SubscriptionResult[]> {
  if (pages.length === 0) return [];
  const settled = await Promise.allSettled(
    pages.map((p) => subscribePageToWebhooks(p, version))
  );
  return settled.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          entity: `Page: ${pages[i].name ?? pages[i].id}`,
          id: pages[i].id,
          type: "page" as const,
          success: false,
          error: r.reason instanceof Error ? r.reason.message : "Error desconocido",
        }
  );
}

/**
 * Helper de logging: emite un resumen estructurado de los resultados.
 */
export function logSubscriptionResults(
  results: SubscriptionResult[],
  context: Record<string, unknown> = {}
): { subscribed: number; failed: number } {
  const subscribed = results.filter((r) => r.success).length;
  const failed = results.length - subscribed;
  logger.info("Meta webhook subscription", {
    ...context,
    subscribed,
    failed,
    failures: results.filter((r) => !r.success).map((r) => ({ id: r.id, error: r.error })),
  });
  return { subscribed, failed };
}
