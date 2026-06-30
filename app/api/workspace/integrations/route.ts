import { withWorkspace } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiCreated, apiError, apiNotFound, apiForbidden } from "@/lib/api-response";
import { encryptToken } from "@/lib/encryption";
import { logger } from "@/lib/logger";
import { GOOGLE_MODULES, isModuleConnected } from "@/lib/integrations/google/registry";
import prisma, { type Prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET /api/workspace/integrations
 * List all integrations for the active workspace.
 * All workspace members can view; canDisconnect flag is per-user.
 */
export const GET = withWorkspace(async (_req, ctx) => {
  const integrations = await prisma.integration.findMany({
    where: { workspaceId: ctx.workspaceId },
    select: {
      id: true,
      provider: true,
      connected: true,
      connectedAt: true,
      connectedBy: true,
      connectedUser: {
        select: { id: true, name: true, image: true },
      },
      credentials: true,
    },
  });

  const data = integrations.map((intg) => {
    const creds = (intg.credentials as Record<string, unknown>) || {};
    let connectedModules: string[] = (creds.modules as string[]) || [];

    if (intg.provider === "google") {
      connectedModules = GOOGLE_MODULES.filter((m) =>
        isModuleConnected(m.id, creds.grantedScopes as string[] | undefined)
      ).map((m) => m.id);
    }

    return {
      id: intg.id,
      provider: intg.provider,
      connected: intg.connected,
      connectedAt: intg.connectedAt,
      connectedBy: intg.connectedUser
        ? { id: intg.connectedUser.id, name: intg.connectedUser.name, image: intg.connectedUser.image }
        : null,
      // Perfil de la cuenta EXTERNA conectada (Facebook/Google) — nickname +
      // avatar de la identidad que otorgó el acceso, independiente por módulo.
      connectedProfile: (creds.profile as { id?: string; name?: string | null; picture?: string | null } | undefined) ?? null,
      canDisconnect: ctx.role === "OWNER" || intg.connectedBy === ctx.userId,
      connectedModules,
      resources: (creds.resources as Record<string, unknown>) || {},
      pages: (creds.pages as unknown[]) || [],
    };
  });

  return apiSuccess({ data, userRole: ctx.role });
});

/**
 * POST /api/workspace/integrations
 * Connect a token-based integration (e.g. BotMaker, Cari).
 * Only OWNER/ADMIN can save tokens. Token is AES-256 encrypted at rest.
 *
 * Body: { provider, token, baseUrl?, refreshToken? }
 */
const ConnectSchema = z.object({
  provider: z.string().min(1, "provider requerido"),
  token: z.string().min(1, "token requerido"),
  baseUrl: z.string().trim().max(500).optional(),
  refreshToken: z.string().trim().max(4000).optional(),
});

export const POST = withWorkspace(async (req, ctx) => {
  if (!["OWNER", "ADMIN"].includes(ctx.role)) {
    return apiForbidden("Solo OWNER/ADMIN pueden conectar integraciones");
  }

  const result = await validateBody(req, ConnectSchema);
  if (!result.ok) return result.response;
  const { provider, token, baseUrl, refreshToken } = result.data;

  // Validate Botmaker token BEFORE saving to avoid storing invalid credentials.
  // A 401/403 from Botmaker means the token is invalid.
  // Getting 0 channels with a 200 is valid (account with no channels yet) — we still save the token.
  if (provider === "botmaker") {
    try {
      const { normalizeBotmakerBase, botmakerFetch } = await import("@/lib/botmaker");
      const validationBaseUrl = normalizeBotmakerBase(baseUrl);
      const res = await botmakerFetch("/channels", token, {}, 1, validationBaseUrl);
      if (res.status === 401 || res.status === 403) {
        return apiError(
          "El token de Botmaker es inválido o no tiene permisos. Revisa tus credenciales.",
          "INVALID_TOKEN",
          400
        );
      }
      if (!res.ok && res.status !== 404) {
        // 4xx distinto de 401/403 o 5xx — podría ser un error de red o URL incorrecta.
        logger.warn("Botmaker token validation: unexpected status", { workspaceId: ctx.workspaceId, status: res.status });
        return apiError(
          `Error al validar con Botmaker (HTTP ${res.status}). Verifica la URL base si usas una instancia propia.`,
          "BOTMAKER_VALIDATION_ERROR",
          400
        );
      }
    } catch (e) {
      logger.warn("Botmaker token validation failed", { workspaceId: ctx.workspaceId, error: e });
      return apiError(
        "Error de red al validar con Botmaker. Revisa tu token o URL base.",
        "BOTMAKER_NETWORK_ERROR",
        400
      );
    }
  }

  const credentials: Record<string, unknown> = {
    accessToken: encryptToken(token),
    connectedAt: new Date().toISOString(),
  };
  if (baseUrl) credentials.baseUrl = baseUrl;
  if (refreshToken) credentials.refreshToken = encryptToken(refreshToken);

  const integration = await prisma.integration.upsert({
    where: {
      workspaceId_provider_userId: { workspaceId: ctx.workspaceId, provider, userId: "workspace" },
    },
    create: {
      workspaceId: ctx.workspaceId,
      provider,
      credentials: credentials as Prisma.InputJsonValue,
      connected: true,
      connectedAt: new Date(),
      connectedBy: ctx.userId,
    },
    update: {
      credentials: credentials as Prisma.InputJsonValue,
      connected: true,
      connectedAt: new Date(),
      connectedBy: ctx.userId,
    },
  });

  // Cache Botmaker channels after successful connection
  if (provider === "botmaker") {
    try {
      const { normalizeBotmakerBase, listBotmakerChannels, cacheBotmakerChannels } = await import("@/lib/botmaker");
      const conn = { baseUrl: normalizeBotmakerBase(baseUrl), accessToken: token };
      const channels = await listBotmakerChannels(conn);
      if (channels.length > 0) {
        await cacheBotmakerChannels(integration.id, ctx.workspaceId, channels);
        logger.info("Botmaker channels cached", {
          workspaceId: ctx.workspaceId,
          channelCount: channels.length,
          integrationId: integration.id,
        });
      }
    } catch (e) {
      logger.warn("Failed to cache Botmaker channels after connect", {
        workspaceId: ctx.workspaceId,
        integrationId: integration.id,
        error: e,
      });
    }
  }

  logger.info("Integration connected", {
    provider,
    workspaceId: ctx.workspaceId,
    byUserId: ctx.userId,
  });

  return apiSuccess({ connected: true });
});

/**
 * DELETE /api/workspace/integrations?provider=<provider>
 * Disconnect an integration. Only OWNER or the connector can disconnect.
 *
 * El `provider` llega como QUERY param desde la UI (fetch DELETE sin body); se
 * acepta también en el body por compatibilidad.
 */
export const DELETE = withWorkspace(async (req, ctx) => {
  // BUG arreglado: antes el provider se leía SOLO del body (validateBody), pero
  // todos los callers lo mandan como ?provider=... → la validación fallaba y la
  // desconexión (TikTok, Botmaker, Cari…) nunca se ejecutaba.
  let provider = new URL(req.url).searchParams.get("provider") || "";
  if (!provider) {
    const body = (await req.json().catch(() => ({}))) as { provider?: unknown };
    if (typeof body.provider === "string") provider = body.provider;
  }
  provider = provider.trim();
  if (!provider) return apiError("provider requerido", "VALIDATION_ERROR", 400);

  const integration = await prisma.integration.findUnique({
    where: {
      workspaceId_provider_userId: { workspaceId: ctx.workspaceId, provider, userId: "workspace" },
    },
  });
  if (!integration) return apiNotFound("Integración no encontrada");

  const canDisconnect = ctx.role === "OWNER" || integration.connectedBy === ctx.userId;
  if (!canDisconnect) {
    return apiForbidden("Solo el usuario que conectó esta integración o el OWNER puede desconectarla");
  }

  // Google policy: revoke the grant server-side before wiping local credentials
  if (provider === "google" || provider.startsWith("google_")) {
    const { revokeGoogleToken } = await import("@/lib/integrations/google/oauth");
    await revokeGoogleToken(
      integration.credentials as import("@/lib/integrations/google/oauth").GoogleCredentials
    );
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      connected: false,
      credentials: {},
      connectedAt: null,
      connectedBy: null,
    },
  });

  logger.info("Integration disconnected", {
    provider,
    workspaceId: ctx.workspaceId,
    byUserId: ctx.userId,
  });

  return apiSuccess({ disconnected: true });
});
