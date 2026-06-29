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

  const settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId: ctx.workspaceId },
    select: { extConfig: true },
  });

  const store = readStore(settings?.extConfig as Record<string, unknown> | null);
  return apiSuccess({ config: store.byClient[client] ?? null });
});

// PUT: guarda la config del cliente (merge sobre los demás clientes).
export const PUT = withWorkspace(async (req, ctx) => {
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

  // Leer config actual para hacer merge (no borrar otros campos ni clientes).
  const existing = await prisma.workspaceSettings.findUnique({
    where: { workspaceId: ctx.workspaceId },
    select: { extConfig: true },
  });

  const existingConfig = (existing?.extConfig ?? {}) as Record<string, unknown>;
  const store = readStore(existingConfig);
  store.byClient[client] = savedConfig;
  const merged = { ...existingConfig, mmm: store as unknown };

  await prisma.workspaceSettings.upsert({
    where: { workspaceId: ctx.workspaceId },
    create: { workspaceId: ctx.workspaceId, extConfig: merged as any },
    update: { extConfig: merged as any },
  });

  return apiSuccess({ saved: true, savedAt: savedConfig.savedAt });
});
