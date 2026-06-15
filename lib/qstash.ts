import { Client, Receiver } from "@upstash/qstash";
import { env } from "./env";

/**
 * Cliente de QStash. El token puede faltar en entornos donde la cola no está
 * configurada (p. ej. Preview sin secretos); en ese caso `isQstashConfigured()`
 * devuelve false y los helpers de programación fallan de forma explícita en
 * lugar de dejar posts "Scheduled" que nunca se publican.
 */
export const qstashClient = new Client({
  token: env.QSTASH_TOKEN || "",
});

/** True cuando hay token para encolar mensajes en QStash. */
export function isQstashConfigured(): boolean {
  return Boolean(env.QSTASH_TOKEN);
}

/**
 * Receiver para verificar la firma `Upstash-Signature`. Solo se construye si
 * ambas claves de firma están presentes; permite una migración segura desde la
 * autenticación por secreto compartido.
 */
const qstashReceiver =
  env.QSTASH_CURRENT_SIGNING_KEY && env.QSTASH_NEXT_SIGNING_KEY
    ? new Receiver({
        currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
        nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
      })
    : null;

/** True cuando hay claves de firma configuradas (verificación criptográfica activa). */
export function isQstashSignatureConfigured(): boolean {
  return qstashReceiver !== null;
}

const PUBLISH_JOB_PATH = "/api/jobs/publish";
const PUBLISH_FAILURE_PATH = "/api/jobs/publish/failure";

/**
 * URL base, pública y estable, a la que QStash debe entregar el job de
 * publicación. Debe ser la de Production: una URL por-deployment de Vercel puede
 * desaparecer antes de que dispare un post programado con días de antelación.
 * Evita hardcodear el dominio en cada ruta.
 */
export function getWorkerBaseUrl(): string {
  const base =
    env.QSTASH_WORKER_BASE_URL ||
    env.NEXT_PUBLIC_APP_URL ||
    "https://sodare.xyz";
  return base.replace(/\/+$/, "");
}

/**
 * Encola un job de publicación programada en QStash.
 *
 * - `notBefore`: timestamp Unix (segundos) — Meta permite hasta 75 días, dentro
 *   del límite de 90 días de QStash.
 * - `retries`: reintentos ante fallo (por defecto 3).
 * - `failureCallback`: endpoint que marca el post como "Failed" cuando se agotan
 *   los reintentos, evitando posts atascados en "Scheduled" para siempre.
 *
 * Lanza si QStash no está configurado o la API rechaza la petición; el caller
 * decide cómo exponer el fallo (no se silencia).
 */
export async function schedulePublishJob(params: {
  publishJobId: string;
  scheduledAt: Date;
  retries?: number;
}): Promise<string> {
  if (!isQstashConfigured()) {
    throw new Error(
      "QSTASH_TOKEN no está configurado: no se puede programar la publicación."
    );
  }

  const base = getWorkerBaseUrl();
  const { messageId } = await qstashClient.publishJSON({
    url: `${base}${PUBLISH_JOB_PATH}`,
    body: { publishJobId: params.publishJobId },
    headers: {
      // Defensa en profundidad: QStash reenvía este header al worker.
      Authorization: `Bearer ${process.env.PUBLISH_WORKER_SECRET ?? ""}`,
    },
    notBefore: Math.floor(params.scheduledAt.getTime() / 1000),
    retries: params.retries ?? 3,
    failureCallback: `${base}${PUBLISH_FAILURE_PATH}`,
  });

  return messageId;
}

/** Cancela un mensaje programado en QStash. Nunca lanza (best-effort). */
export async function cancelPublishJob(
  messageId: string | null | undefined
): Promise<void> {
  if (!messageId) return;
  try {
    await qstashClient.messages.delete(messageId);
  } catch (e) {
    console.error("[QSTASH_ERROR] Failed to cancel message:", e);
  }
}

/**
 * Autentica una petición entrante de QStash al worker. Acepta si:
 *  1. La firma `Upstash-Signature` es válida (preferido), o
 *  2. El bearer `PUBLISH_WORKER_SECRET` reenviado coincide (compatibilidad /
 *     cuando aún no hay claves de firma configuradas).
 *
 * Ambas pruebas demuestran origen QStash, así que basta con una (semántica OR).
 * Se omite la comprobación de `url` en la firma para no fallar tras el proxy de
 * Vercel; el hash del body + JWT ya garantizan integridad y origen.
 */
export async function verifyQstashRequest(
  req: Request,
  rawBody: string
): Promise<{ ok: boolean; method?: "signature" | "bearer" }> {
  const signature = req.headers.get("upstash-signature");
  if (qstashReceiver && signature) {
    try {
      const valid = await qstashReceiver.verify({ signature, body: rawBody });
      if (valid) return { ok: true, method: "signature" };
    } catch (e) {
      console.error("[QSTASH] Signature verification failed:", e);
    }
  }

  const secret = process.env.PUBLISH_WORKER_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader === `Bearer ${secret}`) return { ok: true, method: "bearer" };
  }

  return { ok: false };
}

/**
 * Verificación estricta solo-firma para callbacks QStash → nosotros
 * (failureCallback / callback), donde NO se reenvía ningún bearer propio.
 * Fail-closed: si no hay claves de firma o la firma no es válida, rechaza.
 */
export async function verifyQstashSignature(
  req: Request,
  rawBody: string
): Promise<boolean> {
  const signature = req.headers.get("upstash-signature");
  if (!qstashReceiver || !signature) return false;
  try {
    return await qstashReceiver.verify({ signature, body: rawBody });
  } catch (e) {
    console.error("[QSTASH] Callback signature verification failed:", e);
    return false;
  }
}
