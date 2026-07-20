/**
 * app/api/connect/whatsapp/route.ts
 *
 * POST — Conecta un número de WhatsApp Business al workspace activo.
 *
 * A diferencia de los módulos de Meta (que usan OAuth con config_id),
 * WhatsApp Business se conecta con un System User Token permanente
 * generado desde Meta Business Manager → System Users.
 *
 * Body (JSON):
 *   accessToken   : string  — System User Token de Meta (permanente)
 *   phoneNumberId : string  — Phone Number ID (de Meta, no el número en sí)
 *   wabaId        : string  — WhatsApp Business Account ID
 *   projectId?    : string  — Proyecto al que asociar el número (opcional)
 *
 * El accessToken se cifra con AES-256-GCM antes de persistir
 * (mismo patrón que el resto de integraciones).
 *
 * DELETE — Desconecta WhatsApp del workspace (borra Integration + WaPhoneSource).
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { withWorkspaceRole } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import { encryptToken } from "@/lib/encryption";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// Modo 1: Embedded Signup — el frontend envía el `code` del popup de Meta
// + opcionalmente los IDs capturados del postMessage WA_EMBEDDED_SIGNUP
const embeddedSignupSchema = z.object({
  code:          z.string().min(10),
  wabaId:        z.string().optional(),   // capturado del postMessage
  phoneNumberId: z.string().optional(),   // capturado del postMessage
  projectId:     z.string().optional(),
});


// Modo 2: Conexión directa con System User Token (script manual / API)
const directTokenSchema = z.object({
  accessToken:   z.string().min(10),
  phoneNumberId: z.string().min(5),
  wabaId:        z.string().min(5),
  projectId:     z.string().optional(),
});

const connectSchema = z.union([embeddedSignupSchema, directTokenSchema]);

// Conectar/desconectar activos es OWNER/ADMIN — mismo criterio que el resto de
// integraciones (evita que un MEMBER conecte o secuestre líneas del workspace).
export const POST = withWorkspaceRole(["OWNER", "ADMIN"])(async (req: NextRequest, ctx) => {
  const validation = await validateBody(req, connectSchema);
  if (!validation.ok) return validation.response;

  const { workspaceId, userId } = ctx;
  const body = validation.data as
    | { code: string; wabaId?: string; phoneNumberId?: string; projectId?: string }
    | { accessToken: string; phoneNumberId: string; wabaId: string; projectId?: string };


  let accessToken: string;
  let phoneNumberId: string;
  let wabaId: string;
  const projectId = body.projectId;

  // ── Modo 1: Embedded Signup — intercambiar code por token ──────────────────
  if ("code" in body) {
    const tokenRes = await exchangeCodeForToken(body.code);
    if (!tokenRes) {
      return apiError(
        "No se pudo intercambiar el código por un token. Asegúrate de completar el flujo de Embedded Signup correctamente.",
        "WA_CODE_EXCHANGE_FAILED",
        400,
      );
    }
    accessToken = tokenRes.accessToken;

    // Si el frontend capturó los IDs del postMessage WA_EMBEDDED_SIGNUP, úsalos
    // (SIEMPRE preferir estos — son exactamente lo que el cliente eligió en el flujo)
    if (body.phoneNumberId && body.wabaId) {
      // SEGURIDAD: phoneNumberId/wabaId vienen del cliente. Sin verificar que el token
      // recién intercambiado realmente tiene acceso a ese número, un atacante podría
      // enviar el phoneNumberId de OTRO workspace y (vía el upsert de WaPhoneSource)
      // reasignarse el ruteo de sus mensajes entrantes. Validamos propiedad real.
      const ownsPhone = await validateWaToken(accessToken, body.phoneNumberId);
      if (!ownsPhone) {
        return apiError(
          "El número indicado no pertenece a la cuenta autorizada en Embedded Signup.",
          "WA_PHONE_NOT_OWNED",
          403,
        );
      }
      phoneNumberId = body.phoneNumberId;
      wabaId        = body.wabaId;
    } else {
      // Fallback: auto-descubrir desde la Graph API
      const discovered = await discoverWabaAndPhone(accessToken);
      if (!discovered) {
        return apiError(
          "Token obtenido pero no se encontró ningún número de WhatsApp Business asociado. Verifica que hayas seleccionado un número en el flujo de Embedded Signup.",
          "WA_NO_PHONE_FOUND",
          400,
        );
      }
      phoneNumberId = discovered.phoneNumberId;
      wabaId = discovered.wabaId;
    }

    // ── PASO CRÍTICO: Suscribir la app al WABA del cliente ────────────────────
    // Sin esto los webhooks de mensajes entrantes NO llegarán.
    // Ref: POST /{WABA_ID}/subscribed_apps
    const subscribed = await subscribeAppToWaba(accessToken, wabaId);
    if (!subscribed) {
      // No es fatal: guardar la integración de todas formas y logear
      logger.warn("subscribeAppToWaba falló — webhooks de mensajes entrantes pueden no funcionar", {
        workspaceId, wabaId,
      });
    } else {
      logger.info("App suscrita al WABA correctamente", { workspaceId, wabaId });
    }
  } else {

    // ── Modo 2: Token directo ─────────────────────────────────────────────────
    accessToken   = body.accessToken;
    phoneNumberId = body.phoneNumberId;
    wabaId        = body.wabaId;

    const isValid = await validateWaToken(accessToken, phoneNumberId);
    if (!isValid) {
      return apiError(
        "El token de acceso no tiene permisos para el Phone Number ID indicado, o el token es inválido.",
        "WA_INVALID_TOKEN",
        400,
      );
    }
  }

  // SEGURIDAD: no permitir robar una línea ya enlazada a otro workspace.
  const existingPhone = await prisma.waPhoneSource.findUnique({
    where: { phoneNumberId },
    select: { workspaceId: true },
  });
  if (existingPhone && existingPhone.workspaceId !== workspaceId) {
    return apiError(
      "Este número de WhatsApp ya está conectado a otra cuenta de Zefirus.",
      "WA_PHONE_ALREADY_LINKED",
      409,
    );
  }

  // Validar que el projectId (si viene) pertenece a este workspace.
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true },
    });
    if (!project) {
      return apiError("El proyecto indicado no pertenece a este workspace.", "INVALID_PROJECT", 400);
    }
  }

  // Cifrar el access token con AES-256-GCM
  const encryptedToken = encryptToken(accessToken);

  try {
    await prisma.integration.upsert({
      where: {
        workspaceId_provider_userId: {
          workspaceId,
          provider: "whatsapp_business",
          userId: "workspace",
        },
      },
      update: {
        credentials: { accessToken: encryptedToken, phoneNumberId, wabaId },
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
      create: {
        workspaceId,
        provider: "whatsapp_business",
        userId: "workspace",
        credentials: { accessToken: encryptedToken, phoneNumberId, wabaId },
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
    });

    await prisma.waPhoneSource.upsert({
      where: { phoneNumberId },
      update: { workspaceId, projectId: projectId ?? null },
      create: { phoneNumberId, workspaceId, projectId: projectId ?? null },
    });

    logger.info("WhatsApp Business conectado", { workspaceId, phoneNumberId, wabaId });

    return apiSuccess({
      connected: true,
      phoneNumberId,
      wabaId,
      webhookUrl: `${process.env.NEXTAUTH_URL ?? ""}/api/webhooks/whatsapp`,
    });
  } catch (err) {
    logger.error("Error conectando WhatsApp", { workspaceId, error: err });
    return apiError("Error guardando la integración de WhatsApp", "WA_CONNECT_ERROR", 500);
  }
});


export const DELETE = withWorkspaceRole(["OWNER", "ADMIN"])(async (_req: NextRequest, ctx) => {
  const { workspaceId } = ctx;

  try {
    // Obtener phoneNumberId antes de borrar para limpiar WaPhoneSource
    const integration = await prisma.integration.findUnique({
      where: {
        workspaceId_provider_userId: {
          workspaceId,
          provider: "whatsapp_business",
          userId: "workspace",
        },
      },
      select: { credentials: true },
    });

    const phoneNumberId = (integration?.credentials as Record<string, string> | null)?.phoneNumberId;

    // Borrar Integration
    await prisma.integration.deleteMany({
      where: { workspaceId, provider: "whatsapp_business", userId: "workspace" },
    });

    // Borrar WaPhoneSource si corresponde a este workspace
    if (phoneNumberId) {
      await prisma.waPhoneSource.deleteMany({
        where: { phoneNumberId, workspaceId },
      });
    }

    logger.info("WhatsApp Business desconectado", { workspaceId, phoneNumberId });

    return apiSuccess({ disconnected: true });
  } catch (err) {
    logger.error("Error desconectando WhatsApp", { workspaceId, error: err });
    return apiError("Error desconectando WhatsApp Business", "WA_DISCONNECT_ERROR", 500);
  }
});

// ─── Validación del token contra la Graph API ─────────────────────────────────

/**
 * Verifica que el System User Token tenga acceso al phoneNumberId indicado.
 * Hace un GET liviano a /v20.0/{phoneNumberId} y verifica que responda con datos.
 */
async function validateWaToken(accessToken: string, phoneNumberId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${phoneNumberId}?fields=id,display_phone_number,verified_name`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return false;
    const data = await res.json();
    return !!data?.id;
  } catch {
    return false;
  }
}

// ─── Embedded Signup: intercambiar code por token ─────────────────────────────

/**
 * Intercambia el `code` del popup de FB Embedded Signup por un System User Token.
 *
 * IMPORTANTE: debe ser POST con JSON body (no GET con query params).
 * El redirect_uri NO es necesario para el flujo de Embedded Signup con FB.login().
 * Ref: https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-access-token
 */
async function exchangeCodeForToken(
  code: string,
): Promise<{ accessToken: string } | null> {
  const appId     = process.env.NEXT_PUBLIC_META_APP_ID;
  const rawSecret = process.env.WHATSAPP_APP_SECRET;
  const appSecret = (rawSecret && rawSecret !== "PENDIENTE_OBTENER_DE_META_APP_SETTINGS")
    ? rawSecret
    : process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    logger.error("exchangeCodeForToken: faltan NEXT_PUBLIC_META_APP_ID o el App Secret (WHATSAPP_APP_SECRET/META_APP_SECRET)");
    return null;
  }

  try {
    // Para el flujo FB.login() + response_type:"code" (Embedded Signup v4),
    // Meta requiere GET con query params — NO POST JSON, NO grant_type.
    // Ref: https://developers.facebook.com/docs/facebook-login/guides/access-tokens
    const url = new URL("https://graph.facebook.com/v25.0/oauth/access_token");
    url.searchParams.set("client_id",     appId);
    url.searchParams.set("client_secret", appSecret);
    url.searchParams.set("redirect_uri",  "");
    url.searchParams.set("code",          code);

    const res = await fetch(url.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();

    if (!res.ok || !data?.access_token) {
      logger.error("exchangeCodeForToken: Meta devolvió error", {
        status: res.status,
        error:  data?.error?.message ?? data,
        errorCode: data?.error?.code,
        errorSubcode: data?.error?.error_subcode,
      });
      return null;
    }

    return { accessToken: data.access_token as string };
  } catch (err) {
    logger.error("exchangeCodeForToken: excepción de red", { err });
    return null;
  }
}


// ─── Suscribir app al WABA del cliente (webhooks) ───────────────────────────

/**
 * PASO CRÍTICO post-Embedded Signup:
 * Suscribe la app Meta al WABA del cliente para recibir webhooks de mensajes.
 *
 * Equivalente a: POST /v25.0/{wabaId}/subscribed_apps
 * Ref: https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/manage-webhooks/
 *
 * ⚠️ Sin este paso, el cliente queda conectado pero los mensajes entrantes
 * NO llegan al webhook. Los mensajes salientes sí funcionan.
 */
async function subscribeAppToWaba(
  accessToken: string,
  wabaId: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v25.0/${wabaId}/subscribed_apps`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      logger.error("subscribeAppToWaba: error de Meta", {
        status: res.status,
        wabaId,
        error: data?.error?.message ?? data,
      });
      return false;
    }
    // { success: true } en respuesta correcta
    return !!data?.success;
  } catch (err) {
    logger.error("subscribeAppToWaba: excepción de red", { err, wabaId });
    return false;
  }
}

// ─── Auto-discovery de WABA y Phone Number desde el token ─────────────────────

/**
 * Tras el code exchange de Embedded Signup, el token resultante tiene acceso
 * directo a las WABAs del usuario. Intenta dos rutas en orden:
 *
 * 1. GET /me/whatsapp_business_accounts  ← más directa tras Embedded Signup
 * 2. GET /me/businesses → whatsapp_business_accounts ← fallback para tokens de admin
 *
 * Devuelve el primer phoneNumberId encontrado con estado no DELETED.
 */
async function discoverWabaAndPhone(
  accessToken: string,
): Promise<{ wabaId: string; phoneNumberId: string } | null> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const timeout = { signal: AbortSignal.timeout(10_000) };

  // Helper: dado un wabaId, devuelve el primer phoneNumberId activo
  async function firstPhoneFromWaba(wabaId: string): Promise<string | null> {
    const res = await fetch(
      `https://graph.facebook.com/v25.0/${wabaId}/phone_numbers?fields=id,display_phone_number,status`,
      { headers, ...timeout },
    );
    if (!res.ok) return null;
    const { data } = await res.json();
    const phone = (data as Array<{ id: string; status?: string }>)
      .find(p => p.status !== "DELETED");
    return phone?.id ?? null;
  }

  try {
    // ── Ruta 1: acceso directo post-Embedded Signup ────────────────────────────
    const directRes = await fetch(
      "https://graph.facebook.com/v25.0/me/whatsapp_business_accounts?fields=id,name",
      { headers, ...timeout },
    );
    if (directRes.ok) {
      const { data } = await directRes.json();
      for (const waba of (data ?? []) as Array<{ id: string }>) {
        const phoneNumberId = await firstPhoneFromWaba(waba.id);
        if (phoneNumberId) return { wabaId: waba.id, phoneNumberId };
      }
    }

    // ── Ruta 2: vía business portfolio (tokens de admin) ──────────────────────
    const bizRes = await fetch(
      "https://graph.facebook.com/v25.0/me/businesses?fields=id,whatsapp_business_accounts{id,name}",
      { headers, ...timeout },
    );
    if (!bizRes.ok) return null;
    const { data: businesses } = await bizRes.json();

    for (const biz of (businesses ?? []) as Array<{ whatsapp_business_accounts?: { data: Array<{ id: string }> } }>) {
      for (const waba of biz.whatsapp_business_accounts?.data ?? []) {
        const phoneNumberId = await firstPhoneFromWaba(waba.id);
        if (phoneNumberId) return { wabaId: waba.id, phoneNumberId };
      }
    }

    return null;
  } catch {
    return null;
  }
}
