/**
 * GET /api/mmm/config?client=<nombre>  — Cargar config del cliente
 * PUT /api/mmm/config                   — Guardar channels + rows del cliente
 *
 * El MMM se scopea POR CLIENTE (Project.client): cada anunciante optimiza su
 * propio mix. La config vive en `WorkspaceSettings.extConfig.mmm.byClient[client]`
 * (JSON), evitando crear una migration nueva.
 *
 * Compatibilidad: una config legacy plana (extConfig.mmm = { channels, rows })
 * de la versión global del workspace se lee bajo la clave especial LEGACY_KEY y
 * NO se asigna a ningún cliente automáticamente.
 */

import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import prisma from "@/lib/prisma";
import { z } from "zod";
import type { MmmSavedConfig } from "@/lib/mmm/types";

const LEGACY_KEY = "__legacy__";

// Shape de ChannelConfig / WeeklyRow (lib/mmm/types.ts). Campos extra se
// permiten (passthrough) para no romper configs guardadas por versiones nuevas.
const ChannelSchema = z
  .object({
    id: z.string().min(1).max(80),
    name: z.string().min(1).max(120),
    color: z.string().max(30),
    adstockDecay: z.number().min(0).max(1),
    saturationAlpha: z.number().positive().max(20),
    saturationK: z.number().positive(),
    enabled: z.boolean(),
    autoCalibratedAt: z.string().max(40).optional(),
    minSpend: z.number().nonnegative().optional(),
    maxSpend: z.number().nonnegative().optional(),
  })
  .passthrough();

const RowSchema = z
  .object({
    week: z.string().min(1).max(20),
    label: z.string().max(40),
    spend: z.record(z.string().max(80), z.number()),
    outcome: z.number(),
    isOutlier: z.boolean().optional(),
    note: z.string().max(300).optional(),
    source: z.enum(["manual", "api"]).optional(),
  })
  .passthrough();

const MetricsSchema = z.object({
  rSquared: z.number().min(0).max(1).optional(),
  nrmse: z.number().min(0).optional(),
  weekCount: z.number().int().min(0).optional(),
  calibratedAt: z.string().max(40).optional(),
}).optional();

const PutConfigSchema = z.object({
  client: z.string().trim().min(1, "'client' es requerido").max(150),
  vertical: z.string().max(150).optional(),
  channels: z.array(ChannelSchema).max(40, "Máximo 40 canales"),
  rows: z.array(RowSchema).max(530, "Máximo 530 semanas (~10 años)"),
  metrics: MetricsSchema,
});

interface MmmStore {
  byClient: Record<string, MmmSavedConfig>;
}

/** Normaliza el blob `mmm` a la forma { byClient }, migrando legacy si aplica. */
function readStore(raw: Record<string, unknown> | null | undefined): MmmStore {
  const mmm = raw?.mmm as unknown;
  if (mmm && typeof mmm === "object") {
    const obj = mmm as Record<string, unknown>;
    if (obj.byClient && typeof obj.byClient === "object") {
      return { byClient: obj.byClient as Record<string, MmmSavedConfig> };
    }
    // Forma legacy plana { channels, rows, ... } → preservar bajo LEGACY_KEY.
    if (Array.isArray(obj.channels) && Array.isArray(obj.rows)) {
      return { byClient: { [LEGACY_KEY]: mmm as MmmSavedConfig } };
    }
  }
  return { byClient: {} };
}

// GET: devuelve la config del cliente solicitado (o null si aún no tiene).
export const GET = withWorkspace(async (req, ctx) => {
  const client = req.nextUrl.searchParams.get("client")?.trim();
  if (!client) {
    return apiError("Parámetro 'client' requerido", "BAD_REQUEST", 400);
  }

  // 1. Buscar en CenturionModel
  const model = await prisma.centurionModel.findFirst({
    where: { workspaceId: ctx.workspaceId, clientName: client },
    orderBy: { updatedAt: "desc" },
  });

  if (model) {
    return apiSuccess({
      config: model.config,
      metrics: model.metrics,
      lastIngestAt: model.lastIngestAt?.toISOString() ?? null,
    });
  }

  // Fallback a WorkspaceSettings para legacy
  const settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId: ctx.workspaceId },
    select: { extConfig: true },
  });

  const store = readStore(settings?.extConfig as Record<string, unknown> | null);
  return apiSuccess({ config: store.byClient[client] ?? null });
});

// PUT: guarda la config del cliente
export const PUT = withWorkspace(async (req, ctx) => {
  if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
    return apiError("No tienes permisos para modificar el modelo de MMM. Requiere rol de OWNER o ADMIN.", "FORBIDDEN", 403);
  }

  const result = await validateBody(req, PutConfigSchema);
  if (!result.ok) return result.response;
  const { client, vertical, channels, rows, metrics } = result.data;

  const savedConfig: MmmSavedConfig = {
    channels: channels as MmmSavedConfig["channels"],
    rows: rows as MmmSavedConfig["rows"],
    savedAt: new Date().toISOString(),
    workspaceId: ctx.workspaceId,
    client,
    ...(vertical ? { vertical } : {}),
  };

  // Build metrics JSON if provided by the client
  const metricsJson = metrics
    ? {
        rSquared: metrics.rSquared,
        nrmse: metrics.nrmse,
        weekCount: metrics.weekCount,
        calibratedAt: metrics.calibratedAt,
        savedAt: new Date().toISOString(),
      }
    : undefined;

  const existingModel = await prisma.centurionModel.findFirst({
    where: { workspaceId: ctx.workspaceId, clientName: client }
  });

  if (existingModel) {
    await prisma.centurionModel.update({
      where: { id: existingModel.id },
      data: {
        config: savedConfig as any,
        ...(metricsJson ? { metrics: metricsJson as any } : {}),
        updatedAt: new Date()
      }
    });
  } else {
    await prisma.centurionModel.create({
      data: {
        workspaceId: ctx.workspaceId,
        clientName: client,
        verticalName: vertical ?? null,
        engine: "FastMMM",
        config: savedConfig as any,
        ...(metricsJson ? { metrics: metricsJson as any } : {}),
      }
    });
  }

  return apiSuccess({ saved: true, savedAt: savedConfig.savedAt });
});
