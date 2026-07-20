/**
 * lib/whatsapp.ts
 *
 * Cliente para la WhatsApp Business Cloud API (Meta Graph API v20.0).
 * Patrón consistente con lib/botmaker.ts: token resuelto desde Integration
 * cifrada por workspace (AES-256-GCM vía decryptToken), sin fallback a env global
 * para evitar la fuga cross-tenant documentada en AUDITORIA-BOTMAKER.md H1.
 *
 * Variables de entorno requeridas (por workspace, almacenadas en Integration):
 *   - accessToken       : System User Token permanente de Meta Business Manager
 *   - phoneNumberId     : ID del número de WhatsApp (no el número en sí)
 *   - wabaId            : WhatsApp Business Account ID
 *
 * Variables de entorno globales (configuración de la app Meta):
 *   - WHATSAPP_APP_SECRET         : App Secret para verificar HMAC del webhook
 *   - WHATSAPP_WEBHOOK_VERIFY_TOKEN : Token de verificación del webhook
 */

import crypto from "crypto";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";
import { logger } from "@/lib/logger";

const WA_API_BASE = "https://graph.facebook.com/v20.0";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface WaCredentials {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
}

export type WaMessageType = "text" | "template" | "image" | "document" | "audio" | "video";

export interface WaSendTextOpts {
  to: string; // número con código de país, sin "+" ej. "521234567890"
  text: string;
  previewUrl?: boolean;
}

export interface WaTemplateComponent {
  type: "header" | "body" | "button";
  parameters?: Array<{ type: "text" | "image" | "document"; text?: string; image?: { link: string } }>;
  sub_type?: string;
  index?: number;
}

export interface WaSendTemplateOpts {
  to: string;
  templateName: string;
  languageCode?: string; // default "es_MX"
  components?: WaTemplateComponent[];
}

export interface WaSendResult {
  messageId: string;
  to: string;
}

export interface WaTemplate {
  id: string;
  name: string;
  status: "APPROVED" | "REJECTED" | "PENDING" | "PAUSED" | "DISABLED";
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  components: unknown[];
}

// ─── Resolución de token por workspace ──────────────────────────────────────

/**
 * Resuelve las credenciales de WhatsApp para un workspace específico.
 * Busca en Integration(provider: "whatsapp_business") cifradas con AES-256.
 * No tiene fallback a env global — cada workspace debe conectar su propio número.
 */
export async function getWaCredentials(workspaceId: string): Promise<WaCredentials | null> {
  try {
    const integration = await prisma.integration.findUnique({
      where: {
        workspaceId_provider_userId: {
          workspaceId,
          provider: "whatsapp_business",
          userId: "workspace",
        },
      },
      select: { credentials: true, connected: true },
    });

    if (!integration?.connected || !integration.credentials) return null;

    const creds = integration.credentials as Record<string, string>;
    const accessToken = decryptToken(creds.accessToken);
    const phoneNumberId = creds.phoneNumberId;
    const wabaId = creds.wabaId;

    if (!accessToken || !phoneNumberId || !wabaId) {
      logger.warn("WA credentials incompletas", { workspaceId });
      return null;
    }

    return { accessToken, phoneNumberId, wabaId };
  } catch (err) {
    logger.error("Error resolviendo credenciales WA", { workspaceId, error: err });
    return null;
  }
}

// ─── Envío de mensajes ───────────────────────────────────────────────────────

/**
 * Envía un mensaje de texto libre.
 * Solo válido dentro de la ventana de 24h de servicio (gratuito).
 * Fuera de la ventana debe usarse sendTemplate.
 */
export async function sendWaText(
  creds: WaCredentials,
  opts: WaSendTextOpts,
): Promise<WaSendResult> {
  const res = await waFetch(
    `${WA_API_BASE}/${creds.phoneNumberId}/messages`,
    creds.accessToken,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: opts.to,
      type: "text",
      text: {
        preview_url: opts.previewUrl ?? false,
        body: opts.text,
      },
    },
  );

  const data = await res.json();
  if (!res.ok) {
    logger.error("WA sendText failed", { status: res.status, error: data });
    throw new Error(`WhatsApp API error ${res.status}: ${data?.error?.message ?? JSON.stringify(data)}`);
  }

  return {
    messageId: data.messages?.[0]?.id ?? "",
    to: opts.to,
  };
}

/**
 * Envía un mensaje de template aprobado.
 * Necesario para contactos fuera de la ventana de 24h
 * o para mensajes proactivos de Marketing/Utilidad/Autenticación.
 */
export async function sendWaTemplate(
  creds: WaCredentials,
  opts: WaSendTemplateOpts,
): Promise<WaSendResult> {
  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: opts.to,
    type: "template",
    template: {
      name: opts.templateName,
      language: { code: opts.languageCode ?? "es_MX" },
      ...(opts.components?.length ? { components: opts.components } : {}),
    },
  };

  const res = await waFetch(
    `${WA_API_BASE}/${creds.phoneNumberId}/messages`,
    creds.accessToken,
    payload,
  );

  const data = await res.json();
  if (!res.ok) {
    logger.error("WA sendTemplate failed", { status: res.status, error: data, template: opts.templateName });
    throw new Error(`WhatsApp API error ${res.status}: ${data?.error?.message ?? JSON.stringify(data)}`);
  }

  return {
    messageId: data.messages?.[0]?.id ?? "",
    to: opts.to,
  };
}

// ─── Templates aprobados ─────────────────────────────────────────────────────

/**
 * Lista los templates aprobados del WABA.
 * Útil para la UI de envío de mensajes proactivos.
 */
export async function listWaTemplates(creds: WaCredentials): Promise<WaTemplate[]> {
  const url = new URL(`${WA_API_BASE}/${creds.wabaId}/message_templates`);
  url.searchParams.set("fields", "id,name,status,category,language,components");
  url.searchParams.set("limit", "100");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${creds.accessToken}` },
    next: { revalidate: 300 }, // cache 5 min — los templates no cambian frecuentemente
  });

  const data = await res.json();
  if (!res.ok) {
    logger.error("WA listTemplates failed", { status: res.status, error: data });
    throw new Error(`WhatsApp API error ${res.status}: ${data?.error?.message ?? JSON.stringify(data)}`);
  }

  return (data.data ?? []) as WaTemplate[];
}

// ─── Verificación de propiedad de una línea ──────────────────────────────────

/**
 * Verifica que un phoneNumberId pertenece realmente a la WABA de estas credenciales.
 * Toda operación por-línea (registrar, deregistrar, enviar, enlazar) DEBE pasar por
 * aquí primero: el phoneNumberId llega del cliente y sin este check un atacante puede
 * operar sobre números de otra WABA usando su propio token.
 */
export async function phoneBelongsToWaba(
  creds: WaCredentials,
  phoneNumberId: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `${WA_API_BASE}/${creds.wabaId}/phone_numbers?fields=id&limit=100`,
      {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return false;
    const data = await res.json();
    return ((data?.data ?? []) as Array<{ id: string }>).some((n) => n.id === phoneNumberId);
  } catch {
    return false;
  }
}

// ─── Resolución de workspace desde phoneNumberId ──────────────────────────────

/**
 * Resuelve el workspaceId a partir del phoneNumberId del webhook.
 * Utiliza WaPhoneSource como cache O(1).
 */
export async function resolveWorkspaceFromPhone(phoneNumberId: string): Promise<{
  workspaceId: string;
  projectId: string | null;
} | null> {
  const source = await prisma.waPhoneSource.findUnique({
    where: { phoneNumberId },
    select: { workspaceId: true, projectId: true },
  });
  return source ?? null;
}

// ─── Verificación HMAC del webhook ────────────────────────────────────────────

/**
 * Verifica la firma HMAC-SHA256 del webhook de Meta.
 * Idéntico al patrón en app/api/webhooks/meta/route.ts.
 * Usar siempre con timingSafeEqual para prevenir timing attacks.
 */
export function verifyWaWebhookSignature(
  rawBody: string,
  signature: string | null,
  appSecret: string,
): boolean {
  if (!signature) return false;
  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

// ─── Utilidad interna ────────────────────────────────────────────────────────

async function waFetch(url: string, token: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
