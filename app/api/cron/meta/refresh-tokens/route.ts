import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { verifyCronAuth } from "@/lib/cron-auth";
import { parseIntegrationCredentials } from "@/lib/meta-tokens";
import { encryptToken } from "@/lib/encryption";
import { META_API_VERSION, metaFetch } from "@/lib/server-auth";

/**
 * CRON: Auto-Refresh de Meta Tokens de Larga Vida.
 * Recomendado ejecutar diariamente.
 * 
 * Busca todos los tokens que expirarán en los próximos 7 días,
 * obtiene un nuevo token usando fb_exchange_token, y re-encripta
 * las páginas con el nuevo token.
 */
export async function GET(req: NextRequest) {
  // Fail-closed: Bearer CRON_SECRET obligatorio (el bypass x-qstash-token era
  // legacy de QStash — ya migrado a Vercel Cron — y aceptaba cualquier valor).
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = env.META_APP_ID;
  const clientSecret = env.META_APP_SECRET;

  if (!clientId || !clientSecret) {
    logger.error("[CRON META REFRESH] Missing META_APP_ID or SECRET");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  try {
    // 1. Fetch all connected meta integrations
    const integrations = await prisma.integration.findMany({
      where: {
        provider: { startsWith: "meta" },
        connected: true,
      },
    });

    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    let refreshed = 0;
    let failed = 0;

    for (const integration of integrations) {
      if (!integration.credentials) continue;

      const parsed = parseIntegrationCredentials(integration.credentials);
      if (!parsed) continue;

      const expiresAt = new Date(parsed.expiresAt).getTime();
      const isExpiringSoon = expiresAt - now < SEVEN_DAYS_MS;
      
      // Meta recomienda no refrescar tokens válidos más de una vez por día.
      // Así que solo refrescamos si le quedan menos de 7 días.
      if (!isExpiringSoon) continue;

      try {
        // 2. Exchange for new Long-Lived User Token
        const tokenUrl = `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${parsed.accessToken}`;
        
        const res = await fetch(tokenUrl);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || "Failed to exchange token");
        }
        
        const data = await res.json();
        const newUserToken = data.access_token;
        // The endpoint usually returns expires_in for the new token (usually ~60 days)
        const expiresInSecs = data.expires_in || 60 * 24 * 60 * 60; 
        const newExpiresAt = new Date(now + expiresInSecs * 1000).toISOString();

        // 3. Fetch Page Tokens using the new User Token
        const pagesUrl = `https://graph.facebook.com/${META_API_VERSION}/me/accounts?fields=id,name,access_token,picture,instagram_business_account&limit=100`;
        const pagesRes = await metaFetch(pagesUrl, newUserToken);
        
        let newPages: any[] = [];
        if (pagesRes.ok) {
          const pagesData = await pagesRes.json();
          newPages = (pagesData.data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            accessToken: encryptToken(p.access_token),
            picture: p.picture?.data?.url || null,
            instagramId: p.instagram_business_account?.id || null,
          }));
        } else {
          logger.warn(`[CRON META REFRESH] Could not fetch pages for integration ${integration.id}, keeping old pages array`);
          // Si falla, mantenemos el array de páginas anterior, aunque los page tokens podrían expirar
          newPages = (integration.credentials as any).pages || [];
        }

        // 4. Update Database
        const newCredentials = {
          ...(integration.credentials as any),
          accessToken: encryptToken(newUserToken),
          expiresAt: newExpiresAt,
          refreshedAt: new Date().toISOString(),
          pages: newPages,
        };

        await prisma.integration.update({
          where: { id: integration.id },
          data: { credentials: newCredentials },
        });

        refreshed++;
        logger.info(`[CRON META REFRESH] Successfully refreshed token for integration ${integration.id}`);
      } catch (err: any) {
        failed++;
        logger.error(`[CRON META REFRESH] Failed to refresh token for integration ${integration.id}:`, err);
        // Opcional: si el error indica que el token es permanentemente inválido (ej. usuario revocó acceso),
        // podríamos poner connected: false. Por ahora, solo logueamos.
      }
    }

    return NextResponse.json({
      success: true,
      refreshed,
      failed,
      message: `Refreshed ${refreshed} tokens, ${failed} failed.`,
    });
  } catch (err: any) {
    logger.error("[CRON META REFRESH] Fatal error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
