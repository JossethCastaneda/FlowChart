/**
 * GET /api/mmm/config  — Cargar configuracion guardada del workspace
 * PUT /api/mmm/config  — Guardar channels + rows del workspace
 *
 * La config se guarda en el campo `config` del modelo WorkspaceSettings
 * bajo la clave `mmm` (JSON), evitando crear una migration nueva.
 */

import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import type { MmmSavedConfig } from "@/lib/mmm/types";

// GET: devuelve config guardada o null
export const GET = withWorkspace(async (_req, ctx) => {
  const settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId: ctx.workspaceId },
    select: { extConfig: true },
  });

  if (!settings) {
    return apiSuccess({ config: null });
  }

  const raw = settings.extConfig as Record<string, unknown> | null;
  const mmm = raw?.mmm as MmmSavedConfig | undefined;

  return apiSuccess({ config: mmm ?? null });
});

// PUT: guarda config
export const PUT = withWorkspace(async (req, ctx) => {
  let body: { channels: unknown; rows: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("Body JSON invalido", "BAD_REQUEST", 400);
  }

  if (!Array.isArray(body.channels) || !Array.isArray(body.rows)) {
    return apiError("channels y rows son requeridos", "BAD_REQUEST", 400);
  }

  const savedConfig: MmmSavedConfig = {
    channels: body.channels as MmmSavedConfig["channels"],
    rows: body.rows as MmmSavedConfig["rows"],
    savedAt: new Date().toISOString(),
    workspaceId: ctx.workspaceId,
  };

  // Leer config actual para hacer un merge (no borrar otros campos)
  const existing = await prisma.workspaceSettings.findUnique({
    where: { workspaceId: ctx.workspaceId },
    select: { extConfig: true },
  });

  const existingConfig = (existing?.extConfig ?? {}) as Record<string, unknown>;
  const merged = { ...existingConfig, mmm: savedConfig as unknown };

  await prisma.workspaceSettings.upsert({
    where: { workspaceId: ctx.workspaceId },
    create: { workspaceId: ctx.workspaceId, extConfig: merged as any },
    update: { extConfig: merged as any },
  });

  return apiSuccess({ saved: true, savedAt: savedConfig.savedAt });
});
