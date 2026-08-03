import { NextResponse } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";


/**
 * GET /api/connect/status
 * Returns the connection status for all modules.
 * Response: { modules: { publisher_facebook, publisher_instagram, social, ads, analytics, community, whatsapp_business }, pages: [...], tokenExpiresSoon }
 */
export const GET = withWorkspace(async (request, ctx) => {
  const workspaceId = ctx.workspaceId;
  try {

    // Fetch all meta integrations for this workspace
    const integrations = await prisma.integration.findMany({
      where: {
        workspaceId,
        provider: { startsWith: "meta" },
      },
    });

    const now = new Date();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const modules: Record<string, { connected: boolean; connectedAt: string | null; pages: any[]; userProfile?: any; tokenExpiresSoon?: boolean; daysUntilExpiry?: number }> = {};

    for (const mod of ["publisher_facebook", "publisher_instagram", "social", "ads", "analytics", "community", "instagram"]) {

      // Modo estricto: cada módulo reporta SOLO su propia Integration
      // (meta_<mod>). Sin fallback al genérico "meta" — mostrar "conectado"
      // heredado de otro botón engaña a la UI mientras getMetaAccessToken
      // (también estricto) devuelve null.
      const integration = integrations.find((i) => i.provider === `meta_${mod}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      const creds = integration?.credentials as any;

      // Detect token expiry
      let tokenExpiresSoon = false;
      let daysUntilExpiry: number | undefined;
      if (creds?.expiresAt) {
        const expiresAt = new Date(creds.expiresAt);
        const msLeft = expiresAt.getTime() - now.getTime();
        daysUntilExpiry = Math.floor(msLeft / (1000 * 60 * 60 * 24));
        tokenExpiresSoon = daysUntilExpiry <= 7;
      }

      modules[mod] = {
        connected: integration?.connected ?? false,
        connectedAt: integration?.connectedAt?.toISOString() || null,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any -- TODO: Limpieza de deuda técnica
        pages: (creds?.pages || []).map(({ accessToken, ...p }: any) => p),
        userProfile: creds?.profile || null,
        tokenExpiresSoon,
        daysUntilExpiry,
      };
    }

    // Also get pages from generic "meta" integration as fallback
    const genericMeta = integrations.find((i) => i.provider === "meta");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars -- TODO: Limpieza de deuda técnica
    const genericPages = ((genericMeta?.credentials as any)?.pages || []).map(({ accessToken, ...p }: any) => p);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const genericCreds = genericMeta?.credentials as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const metaWithProfile = integrations.find((i) => (i.credentials as any)?.profile);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const genericProfile = (metaWithProfile?.credentials as any)?.profile || null;

    // Check generic token expiry
    let genericTokenExpiresSoon = false;
    let genericDaysUntilExpiry: number | undefined;
    if (genericCreds?.expiresAt) {
      const expiresAt = new Date(genericCreds.expiresAt);
      const msLeft = expiresAt.getTime() - now.getTime();
      genericDaysUntilExpiry = Math.floor(msLeft / (1000 * 60 * 60 * 24));
      genericTokenExpiresSoon = genericDaysUntilExpiry <= 7;
    }

    // ── WhatsApp Business status ─────────────────────────────────────────────────
    const waIntegration = await prisma.integration.findFirst({
      where: { workspaceId, provider: "whatsapp_business" },
      select: { connected: true, connectedAt: true, credentials: true },
    });
    const waCreds = waIntegration?.credentials as Record<string, string> | null;

    // Get the WaPhoneSource for the display number
    const waPhone = waCreds?.phoneNumberId
      ? await prisma.waPhoneSource.findUnique({
          where: { phoneNumberId: waCreds.phoneNumberId },
          select: { phoneNumberId: true },
        })
      : null;

    // ── Instagram directo status ──────────────────────────────────────────────
    const igDirectIntegration = await prisma.integration.findUnique({
      where: {
        workspaceId_provider_userId: { workspaceId, provider: "instagram", userId: "workspace" },
      },
      select: { connected: true, connectedAt: true, credentials: true },
    });
    const igCreds = igDirectIntegration?.credentials as Record<string, unknown> | null;

    // Expiry check for direct IG token
    let igTokenExpiresSoon = false;
    let igDaysUntilExpiry: number | undefined;
    if (igCreds?.expiresAt && typeof igCreds.expiresAt === "string") {
      const igExpiry = new Date(igCreds.expiresAt);
      const msLeft = igExpiry.getTime() - now.getTime();
      igDaysUntilExpiry = Math.floor(msLeft / (1000 * 60 * 60 * 24));
      igTokenExpiresSoon = igDaysUntilExpiry <= 7;
    }

    return NextResponse.json({
      modules: {
        ...modules,
        whatsapp_business: {
          connected: waIntegration?.connected ?? false,
          connectedAt: waIntegration?.connectedAt?.toISOString() || null,
          phoneNumber: waPhone?.phoneNumberId ?? waCreds?.phoneNumberId ?? null,
          wabaId: waCreds?.wabaId ?? null,
          pages: [],
        },
        instagram: {
          connected: igDirectIntegration?.connected ?? false,
          connectedAt: igDirectIntegration?.connectedAt?.toISOString() || null,
          userProfile: igCreds?.profile ?? null,
          username: igCreds?.username ?? null,
          instagramUserId: igCreds?.instagramUserId ?? null,
          tokenExpiresSoon: igTokenExpiresSoon,
          daysUntilExpiry: igDaysUntilExpiry,
          pages: [],
        },
      },
      pages: genericPages,
      userProfile: genericProfile,
      hasAnyConnection: integrations.some((i) => i.connected) || (waIntegration?.connected ?? false) || (igDirectIntegration?.connected ?? false),
      tokenExpiresSoon: genericTokenExpiresSoon,
      daysUntilExpiry: genericDaysUntilExpiry,
    });
  } catch (err) {
    logger.error("[connect/status] Unhandled error", { error: err });
    const message = process.env.NODE_ENV !== "production" && err instanceof Error
      ? err.message
      : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

