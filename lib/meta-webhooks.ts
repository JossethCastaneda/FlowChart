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

/**
 * Scope de usuario que exige Meta para suscribir cada campo. La llamada a
 * `subscribed_apps` es TODO-O-NADA: si UN campo no está permitido, Meta
 * rechaza la suscripción completa (visto en producción: 0/32 páginas
 * suscritas porque el token de community no tiene pages_manage_metadata y
 * pedíamos `feed` — y de paso se perdía `messages`, que sí está permitido).
 * Por eso los campos se filtran por los scopes realmente otorgados.
 */
const PAGE_FIELD_SCOPES: Record<string, string> = {
  messages: "pages_messaging",
  messaging_postbacks: "pages_messaging",
  messaging_optins: "pages_messaging",
  messaging_referrals: "pages_messaging",
  message_deliveries: "pages_messaging",
  message_reads: "pages_messaging",
  feed: "pages_manage_metadata",
  mention: "pages_manage_metadata",
  ratings: "pages_manage_metadata",
  leadgen: "leads_retrieval",
};

const INSTAGRAM_FIELD_SCOPES: Record<string, string> = {
  messages: "instagram_manage_messages",
  messaging_postbacks: "instagram_manage_messages",
  comments: "instagram_manage_comments",
  mentions: "instagram_manage_comments",
  live_comments: "instagram_manage_comments",
  story_insights: "instagram_manage_insights",
};

/** Núcleo mínimo para el inbox en tiempo real: DMs siempre primero. */
const CORE_MESSAGING_FIELDS = ["messages", "messaging_postbacks"];

/**
 * Filtra los campos de webhook según los scopes otorgados. Sin lista de
 * scopes (callers legacy) se devuelven todos los campos — el reintento con
 * el núcleo mínimo cubre ese caso si Meta rechaza.
 */
export function allowedWebhookFields(
  grantedScopes: string[] | undefined,
  withInstagram: boolean,
): string[] {
  const all = withInstagram
    ? [...new Set([...PAGE_WEBHOOK_FIELDS, ...INSTAGRAM_WEBHOOK_FIELDS])]
    : PAGE_WEBHOOK_FIELDS;
  if (!grantedScopes || grantedScopes.length === 0) return all;
  const granted = new Set(grantedScopes);
  return all.filter((f) => {
    const pageScope = PAGE_FIELD_SCOPES[f];
    const igScope = withInstagram ? INSTAGRAM_FIELD_SCOPES[f] : undefined;
    // Basta con que UNO de los scopes que habilitan el campo esté otorgado
    // (ej. "messages" entra con pages_messaging O instagram_manage_messages).
    return (pageScope && granted.has(pageScope)) || (igScope && granted.has(igScope));
  });
}

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
  /** Campos que quedaron efectivamente suscritos (para el AuditLog). */
  fields?: string[];
}

async function postSubscribedApps(
  pageId: string,
  accessToken: string,
  version: string,
  fields: string[],
): Promise<{ success: boolean; error: string | null }> {
  const res = await fetch(
    `https://graph.facebook.com/${version}/${pageId}/subscribed_apps`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subscribed_fields: fields.join(",") }),
    }
  );
  const data = await res.json().catch(() => ({}));
  return { success: data.success === true, error: data.error?.message ?? null };
}

/**
 * Suscribe UNA página (y su IG vinculada, si aplica) a los webhooks.
 *
 * Cuando la página tiene IG, se envían los campos de página + IG en UN solo
 * POST: un segundo POST a `subscribed_apps` sobrescribiría los `subscribed_fields`
 * del primero, así que se unifican para no perder los campos de página.
 *
 * Estrategia anti todo-o-nada:
 *   1. Suscribir SOLO los campos permitidos por los scopes otorgados.
 *   2. Si Meta aún rechaza (#200), reintentar con el núcleo mínimo de
 *      mensajería (`messages,messaging_postbacks`) — el inbox en tiempo
 *      real nunca debe caerse porque un campo secundario no tenga permiso.
 */
export async function subscribePageToWebhooks(
  page: SubscribablePage,
  version: string,
  grantedScopes?: string[]
): Promise<SubscriptionResult> {
  const entity = `Page: ${page.name ?? page.id}`;
  if (!page.accessToken) {
    return { entity, id: page.id, type: "page", success: false, error: "Sin page access token" };
  }

  const fields = allowedWebhookFields(grantedScopes, !!page.instagramId);
  if (fields.length === 0) {
    return {
      entity, id: page.id, type: "page", success: false,
      error: "Ningún campo de webhook permitido por los scopes otorgados",
    };
  }

  try {
    const first = await postSubscribedApps(page.id, page.accessToken, version, fields);
    if (first.success) {
      return { entity, id: page.id, type: "page", success: true, fields };
    }

    // Reintento con el núcleo de mensajería si el set completo fue rechazado
    // por permisos (#200) y aún no era el mínimo.
    const core = CORE_MESSAGING_FIELDS.filter((f) => fields.includes(f));
    const isPermissionError = (first.error ?? "").includes("(#200)");
    if (isPermissionError && core.length > 0 && core.length < fields.length) {
      const retry = await postSubscribedApps(page.id, page.accessToken, version, core);
      if (retry.success) {
        logger.warn("[META-WEBHOOKS] Suscripción parcial (solo mensajería)", {
          pageId: page.id,
          dropped: fields.filter((f) => !core.includes(f)),
          error: first.error,
        });
        return { entity, id: page.id, type: "page", success: true, fields: core, error: first.error };
      }
      return { entity, id: page.id, type: "page", success: false, error: retry.error ?? first.error };
    }

    return { entity, id: page.id, type: "page", success: false, error: first.error };
  } catch (err) {
    return {
      entity, id: page.id, type: "page", success: false,
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
  version: string,
  grantedScopes?: string[]
): Promise<SubscriptionResult[]> {
  if (pages.length === 0) return [];
  const settled = await Promise.allSettled(
    pages.map((p) => subscribePageToWebhooks(p, version, grantedScopes))
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
