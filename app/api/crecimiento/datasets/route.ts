/**
 * /api/crecimiento/datasets — ingesta robusta del Aria Data Hub.
 *
 * POST: parsea el CSV con el parser determinista (comillas/CRLF/;/encoding),
 * perfila columnas (tipos/nulos/distintos/target), sube el archivo crudo a Vercel
 * Blob (best-effort) y PERSISTE las filas reales en AriaDatasetRow — el substrato
 * sobre el que entrena el motor. Acepta scope proyecto/cliente/vertical.
 */

import { Prisma } from "@prisma/client";
import { withWorkspaceRole } from "@/lib/api-handler";
import { apiSuccess, apiError, apiServerError } from "@/lib/api-response";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { parseCsv } from "@/lib/crecimiento/engine/csv";
import { profileColumns, detectTarget } from "@/lib/crecimiento/engine/profiling";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 50_000;
const ROW_BATCH = 1000;

const ScopeSchema = z.object({
  datasetId: z.string().optional(),
  projectId: z.string().optional(),
  clientName: z.string().trim().min(1).optional(),
  verticalName: z.string().trim().min(1).optional(),
  targetType: z.enum(["PROJECT", "CLIENT", "VERTICAL"]).optional(),
});

const asJson = (v: unknown): Prisma.InputJsonValue => v as unknown as Prisma.InputJsonValue;

export const POST = withWorkspaceRole(["OWNER", "ADMIN"])(async (req, ctx) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return apiError("No se proporcionó archivo", "VALIDATION_ERROR", 400);
    }
    if (file.size > MAX_BYTES) {
      return apiError("El archivo excede 10MB", "VALIDATION_ERROR", 400);
    }

    const scopeParsed = ScopeSchema.safeParse({
      projectId: formData.get("projectId")?.toString() || undefined,
      clientName: formData.get("clientName")?.toString() || undefined,
      verticalName: formData.get("verticalName")?.toString() || undefined,
      targetType: formData.get("targetType")?.toString() || undefined,
    });
    if (!scopeParsed.success) {
      return apiError("Parámetros de scope inválidos", "VALIDATION_ERROR", 422);
    }
    const scope = scopeParsed.data;

    let projectId: string | null = null;
    if (scope.projectId) {
      const proj = await prisma.project.findFirst({
        where: { id: scope.projectId, workspaceId: ctx.workspaceId },
        select: { id: true },
      });
      if (!proj) return apiError("Proyecto no encontrado en este workspace", "NOT_FOUND", 404);
      projectId = proj.id;
    }

    const parsed = parseCsv(await file.arrayBuffer());
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      return apiError("El CSV está vacío o no tiene encabezados válidos", "VALIDATION_ERROR", 400);
    }
    if (parsed.rows.length > MAX_ROWS) {
      return apiError(`El archivo excede ${MAX_ROWS} filas`, "VALIDATION_ERROR", 400);
    }

    const profiles = profileColumns(parsed.headers, parsed.rows);
    const target = detectTarget(profiles, parsed.rows);

    // Fuente de verdad cruda en Vercel Blob (best-effort, no bloquea la ingesta).
    let rawFileUrl: string | null = null;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import("@vercel/blob");
        const safe = (file.name || "dataset.csv").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
        const blob = await put(`aria/${ctx.workspaceId}/${Date.now()}-${safe}`, file, {
          access: "public",
        });
        rawFileUrl = blob.url;
      } catch (e) {
        logger.warn("[ARIA] Subida a Blob falló (no fatal)", {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const targetType = scope.targetType ?? "PROJECT";

    let dataset;
    if (scope.datasetId) {
      // Modificar dataset existente (generado por auto-aria o previamente subido)
      dataset = await prisma.ariaDataset.findFirst({
        where: { id: scope.datasetId, workspaceId: ctx.workspaceId }
      });
      if (!dataset) {
        return apiError("El dataset especificado no existe o no tienes acceso", "NOT_FOUND", 404);
      }
      // Limpiar columnas y rows viejos
      await prisma.ariaDatasetColumn.deleteMany({ where: { datasetId: dataset.id } });
      await prisma.ariaDatasetRow.deleteMany({ where: { datasetId: dataset.id } });
      
      dataset = await prisma.ariaDataset.update({
        where: { id: dataset.id },
        data: {
          name: file.name || dataset.name,
          source: "csv",
          status: "ready",
          rowCount: parsed.rows.length,
          columnCount: parsed.headers.length,
          delimiter: parsed.delimiter,
          encoding: parsed.encoding,
          rawFileUrl,
        }
      });
    } else {
      // Crear dataset nuevo si no se provee datasetId
      dataset = await prisma.ariaDataset.create({
        data: {
          workspaceId: ctx.workspaceId,
          name: file.name || "Dataset CSV",
          source: "csv",
          status: "ready",
          rowCount: parsed.rows.length,
          columnCount: parsed.headers.length,
          delimiter: parsed.delimiter,
          encoding: parsed.encoding,
          rawFileUrl,
          targetType,
          projectId,
          clientName: scope.clientName ?? null,
          verticalName: scope.verticalName ?? null,
        },
      });
    }

    await prisma.ariaDatasetColumn.createMany({
      data: profiles.map((p) => ({
        datasetId: dataset.id,
        name: p.name,
        dataType: p.dataType,
        nullCount: p.nullCount,
        distinctCount: p.distinctCount,
        minValue: p.minValue,
        maxValue: p.maxValue,
        meanValue: p.meanValue,
        sampleValues: asJson(p.sampleValues),
        isTarget: p.name === target,
        isFeature: p.name !== target,
      })),
    });

    for (let i = 0; i < parsed.rows.length; i += ROW_BATCH) {
      const chunk = parsed.rows.slice(i, i + ROW_BATCH).map((row, j) => ({
        datasetId: dataset.id,
        rowIndex: i + j,
        data: asJson(row),
      }));
      await prisma.ariaDatasetRow.createMany({ data: chunk });
    }

    return apiSuccess(
      {
        id: dataset.id,
        name: dataset.name,
        rowCount: dataset.rowCount,
        columnCount: dataset.columnCount,
        delimiter: parsed.delimiter,
        encoding: parsed.encoding,
        targetColumn: target,
        columns: profiles.map((p) => ({
          name: p.name,
          dataType: p.dataType,
          nullCount: p.nullCount,
          distinctCount: p.distinctCount,
          isTarget: p.name === target,
        })),
      },
      201,
    );
  } catch (error) {
    return apiServerError(error, "/api/crecimiento/datasets POST");
  }
});

export const GET = withWorkspaceRole(["OWNER", "ADMIN", "MEMBER"])(async (_req, ctx) => {
  try {
    const datasets = await prisma.ariaDataset.findMany({
      where: { workspaceId: ctx.workspaceId },
      include: { project: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess(datasets);
  } catch (error) {
    return apiServerError(error, "/api/crecimiento/datasets GET");
  }
});
