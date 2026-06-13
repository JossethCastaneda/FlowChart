import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiError, apiForbidden } from "@/lib/api-response";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { encryptToken, decryptToken } from "@/lib/encryption";

// Validation schema for saving analytics integrations
const AnalyticsIntegrationSchema = z.object({
  id: z.string().optional(), // Si se pasa, actualiza. Si no, crea nueva.
  provider: z.enum(["cari_ai", "botmaker"]),
  name: z.string().min(1, "El nombre es obligatorio"),
  credentials: z.record(z.string(), z.any()),
  config: z.object({
    syncFrequency: z.string(),
    backfillStart: z.string().optional(),
    timezone: z.string(),
    paused: z.boolean().default(false),
    // Modo de operación de la integración: "mock" (default) o "real".
    mode: z.enum(["mock", "real"]).optional(),
  }).optional(),
});

// GET /api/analytics/integrations
// Lista las integraciones configuradas para este workspace
export const GET = withAuth(async (_req, ctx) => {
  const workspaceId = await getActiveWorkspaceId(ctx.userId);
  if (!workspaceId) return apiError("Workspace no encontrado", "NO_WORKSPACE", 400);

  const integrations = await prisma.integration.findMany({
    where: { 
      workspaceId,
      provider: { in: ["cari_ai", "botmaker"] }
    },
    orderBy: { createdAt: "desc" },
  });

  const safeIntegrations = integrations.map((int) => {
    // Desencriptar token, pero solo mandar un hint
    const creds = int.credentials as Record<string, string>;
    const rawToken = creds?.accessToken ? decryptToken(creds.accessToken) : "";
    const maskedToken = rawToken.length > 8 
      ? rawToken.substring(0, 4) + "••••••••" + rawToken.substring(rawToken.length - 4)
      : "••••••••";

    return {
      id: int.id,
      name: int.name || "Integración",
      provider: int.provider,
      config: int.config || {},
      connected: int.connected,
      connectedAt: int.connectedAt,
      // Solo enviamos un token enmascarado
      credentials: { accessToken: maskedToken }
    };
  });

  return apiSuccess(safeIntegrations);
});

// POST /api/analytics/integrations
// Crea o actualiza una integración de Analítica
export const POST = withAuth(async (req, ctx) => {
  const workspaceId = await getActiveWorkspaceId(ctx.userId);
  if (!workspaceId) return apiError("Workspace no encontrado", "NO_WORKSPACE", 400);

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: ctx.userId } },
  });

  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return apiForbidden("Solo administradores pueden configurar integraciones");
  }

  const result = await validateBody(req, AnalyticsIntegrationSchema);
  if (!result.ok) return result.response;

  const { id, provider, name, credentials, config } = result.data;

  // Encriptar accessToken si viene explícito (y no está enmascarado)
  const isMasked = credentials.accessToken && credentials.accessToken.includes("••••");
  
  let credsToSave: Prisma.JsonObject = {};
  if (id) {
    // Si actualiza y viene enmascarado, mantener el anterior
    const existing = await prisma.integration.findUnique({ where: { id } });
    if (!existing || existing.workspaceId !== workspaceId) return apiError("Integración no encontrada", "NOT_FOUND", 404);

    credsToSave = (existing.credentials as Prisma.JsonObject) ?? {};
  }

  if (credentials.accessToken && !isMasked) {
    credsToSave.accessToken = encryptToken(credentials.accessToken);
  }

  let integration;

  if (id) {
    integration = await prisma.integration.update({
      where: { id },
      data: {
        name,
        credentials: credsToSave,
        config: (config ?? {}) as Prisma.InputJsonValue,
      }
    });
  } else {
    integration = await prisma.integration.create({
      data: {
        workspaceId,
        userId: "workspace",
        provider,
        name,
        credentials: credsToSave,
        config: (config ?? {}) as Prisma.InputJsonValue,
        connected: true,
        connectedAt: new Date(),
        connectedBy: ctx.userId,
      }
    });
  }

  return apiSuccess({ id: integration.id, success: true });
});
