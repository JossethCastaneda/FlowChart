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
import prisma from "@/lib/prisma";
import type { MmmSavedConfig } from "@/lib/mmm/types";

const LEGACY_KEY = "__legacy__";

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
    return apiSuccess({ config: model.config });
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
  if (ctx.member.role !== "OWNER" && ctx.member.role !== "ADMIN") {
    return apiError("No tienes permisos para modificar el modelo de MMM. Requiere rol de OWNER o ADMIN.", "FORBIDDEN", 403);
  }

  let body: { client?: unknown; channels: unknown; rows: unknown; vertical?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("Body JSON invalido", "BAD_REQUEST", 400);
  }

  const client = typeof body.client === "string" ? body.client.trim() : "";
  if (!client) {
    return apiError("'client' es requerido", "BAD_REQUEST", 400);
  }
  if (!Array.isArray(body.channels) || !Array.isArray(body.rows)) {
    return apiError("channels y rows son requeridos", "BAD_REQUEST", 400);
  }

  const savedConfig: MmmSavedConfig = {
    channels: body.channels as MmmSavedConfig["channels"],
    rows: body.rows as MmmSavedConfig["rows"],
    savedAt: new Date().toISOString(),
    workspaceId: ctx.workspaceId,
    client,
    ...(typeof body.vertical === "string" ? { vertical: body.vertical } : {}),
  };

  const existingModel = await prisma.centurionModel.findFirst({
    where: { workspaceId: ctx.workspaceId, clientName: client }
  });

  if (existingModel) {
    await prisma.centurionModel.update({
      where: { id: existingModel.id },
      data: {
        config: savedConfig as any,
        updatedAt: new Date()
      }
    });
  } else {
    await prisma.centurionModel.create({
      data: {
        workspaceId: ctx.workspaceId,
        clientName: client,
        verticalName: typeof body.vertical === "string" ? body.vertical : null,
        engine: "FastMMM",
        config: savedConfig as any
      }
    });
  }

  return apiSuccess({ saved: true, savedAt: savedConfig.savedAt });
});
