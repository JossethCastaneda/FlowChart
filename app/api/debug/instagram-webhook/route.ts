import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { env } from "@/lib/env";

/**
 * GET /api/debug/instagram-webhook
 * Diagnóstico temporal para verificar el estado del flujo de webhooks de Instagram.
 * SOLO PARA USO INTERNO — requiere sesión activa.
 * 
 * @todo Eliminar este endpoint después de corregir el problema.
 */
export async function GET(req: NextRequest) {
  const secret = env.NEXTAUTH_SECRET || env.AUTH_SECRET;
  const jwt = await getToken({ req: req as any, secret });
  if (!jwt?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result: Record<string, unknown> = {};

  // 1. Variables de entorno configuradas (sin exponer los valores)
  result.envConfig = {
    INSTAGRAM_APP_ID: env.INSTAGRAM_APP_ID ? `✅ configurado (${env.INSTAGRAM_APP_ID})` : "❌ NO configurado",
    INSTAGRAM_APP_SECRET: env.INSTAGRAM_APP_SECRET ? "✅ configurado" : "❌ NO configurado",
    META_APP_ID: env.META_APP_ID ? `✅ configurado (${env.META_APP_ID})` : "❌ NO configurado",
    META_APP_SECRET: env.META_APP_SECRET ? "✅ configurado" : "❌ NO configurado",
    META_WEBHOOK_VERIFY_TOKEN: env.META_WEBHOOK_VERIFY_TOKEN
      ? `✅ configurado ("${env.META_WEBHOOK_VERIFY_TOKEN}")`
      : "❌ NO configurado — la verificación del webhook FALLARÁ",
    META_API_VERSION: env.META_API_VERSION,
  };

  // 2. Integraciones de Instagram en DB
  try {
    const igIntegrations = await prisma.integration.findMany({
      where: { provider: "instagram" },
      select: {
        id: true,
        workspaceId: true,
        connected: true,
        connectedAt: true,
        credentials: true,
      },
    });

    result.instagramIntegrations = igIntegrations.map((i) => {
      const creds = i.credentials as Record<string, unknown>;
      return {
        id: i.id,
        workspaceId: i.workspaceId,
        connected: i.connected,
        connectedAt: i.connectedAt,
        hasAccessToken: !!creds?.accessToken,
        instagramUserId: creds?.instagramUserId ?? null,
        username: creds?.username ?? null,
        expiresAt: creds?.expiresAt ?? null,
      };
    });
  } catch (err) {
    result.instagramIntegrationsError = String(err);
  }

  // 3. Asset Cache de Instagram (para routing de webhooks)
  try {
    const assetCache = await prisma.integrationAssetCache.findMany({
      where: { assetType: "ig_account" },
      select: {
        externalId: true,
        workspaceId: true,
        syncedAt: true,
        name: true,
      },
      take: 20,
    });
    result.igAccountAssetCache = assetCache;
  } catch (err) {
    result.igAccountAssetCacheError = String(err);
  }

  // 4. Verificar que el webhook endpoint responde correctamente al verify_token
  const verifyToken = env.META_WEBHOOK_VERIFY_TOKEN;
  const webhookUrl = `${env.NEXT_PUBLIC_APP_URL || env.NEXTAUTH_URL || "https://zefirus.xyz"}/api/webhooks/meta`;

  result.webhookDiag = {
    endpointUrl: webhookUrl,
    verifyToken: verifyToken
      ? `"${verifyToken}" — configura ESTE mismo token en Meta Developers > Instagram > Webhooks`
      : "❌ NO CONFIGURADO — agrega META_WEBHOOK_VERIFY_TOKEN en Vercel",
    configInMetaDevelopers: {
      callbackUrl: `${webhookUrl}`,
      verifyToken: verifyToken ?? "UNDEFINED",
      subscribeFields: ["messages", "messaging_postbacks", "comments", "mentions", "story_insights"],
    },
  };

  // 5. Prueba de conectividad: verificar si la suscripción al webhook está activa
  // (Solo si hay una integración de Instagram con token válido)
  try {
    const igInteg = await prisma.integration.findFirst({
      where: { provider: "instagram", connected: true },
      select: { credentials: true },
    });

    if (igInteg?.credentials) {
      const creds = igInteg.credentials as Record<string, unknown>;
      if (creds.accessToken && typeof creds.accessToken === "string") {
        const { decryptToken } = await import("@/lib/encryption");
        const token = decryptToken(creds.accessToken as string);

        if (token && !token.startsWith("enc:")) {
          // Verificar qué campos están suscritos actualmente
          const subRes = await fetch(
            `https://graph.instagram.com/me/subscribed_apps?access_token=${token}`,
            { method: "GET" }
          );
          const subData = await subRes.json();
          result.webhookSubscriptionStatus = {
            ok: subRes.ok,
            data: subData,
          };

          // Verificar el perfil del usuario
          const meRes = await fetch(
            `https://graph.instagram.com/me?fields=id,username,name&access_token=${token}`
          );
          const meData = await meRes.json();
          result.instagramProfile = {
            ok: meRes.ok,
            data: meData,
          };
        } else {
          result.webhookSubscriptionStatus = { error: "Token cifrado no se pudo descifrar" };
        }
      } else {
        result.webhookSubscriptionStatus = { error: "No hay accessToken en las credenciales" };
      }
    } else {
      result.webhookSubscriptionStatus = { error: "No hay integración de Instagram conectada" };
    }
  } catch (err) {
    result.webhookSubscriptionStatusError = String(err);
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
