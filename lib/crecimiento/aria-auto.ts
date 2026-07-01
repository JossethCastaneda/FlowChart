import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Registra los scopes predictivos de Aria al crear un proyecto: PROYECTO y,
 * opcionalmente, su CLIENTE y VERTICAL. NO fabrica datos ni métricas (se acabó el
 * Math.random): crea un dataset vacío en estado `awaiting_data`, listo para recibir
 * datos reales vía el Data Hub. Cuando se suba un CSV scopeado, el motor determinista
 * (runTrainingPipeline) entrena el modelo real. Es idempotente: reejecutar (o el
 * backfill) no duplica scopes gracias a los @@unique de AriaDataset.
 */
export async function triggerAutoAriaForProject(
  projectId: string,
  workspaceId: string,
  projectName: string,
  clientName?: string | null,
  verticalName?: string | null,
): Promise<void> {
  try {
    await ensureProjectScope(workspaceId, projectId, projectName);
    if (clientName && clientName.trim() !== "") {
      await ensureClientScope(workspaceId, clientName.trim());
    }
    if (verticalName && verticalName.trim() !== "") {
      await ensureVerticalScope(workspaceId, verticalName.trim());
    }
    logger.info("[ARIA AUTO] Scopes registrados", { projectId, workspaceId });
  } catch (error) {
    logger.error("[ARIA AUTO] Error registrando scopes de Aria", {
      projectId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function ensureProjectScope(workspaceId: string, projectId: string, name: string): Promise<void> {
  await prisma.ariaDataset.upsert({
    where: { aria_scope_project: { workspaceId, targetType: "PROJECT", projectId } },
    update: {},
    create: {
      workspaceId,
      projectId,
      targetType: "PROJECT",
      name: `Proyecto: ${name}`,
      source: "auto",
      status: "awaiting_data",
      rowCount: 0,
    },
  });
}

async function ensureClientScope(workspaceId: string, clientName: string): Promise<void> {
  await prisma.ariaDataset.upsert({
    where: { aria_scope_client: { workspaceId, targetType: "CLIENT", clientName } },
    update: {},
    create: {
      workspaceId,
      clientName,
      targetType: "CLIENT",
      name: `Cliente: ${clientName}`,
      source: "auto",
      status: "awaiting_data",
      rowCount: 0,
    },
  });
}

async function ensureVerticalScope(workspaceId: string, verticalName: string): Promise<void> {
  await prisma.ariaDataset.upsert({
    where: { aria_scope_vertical: { workspaceId, targetType: "VERTICAL", verticalName } },
    update: {},
    create: {
      workspaceId,
      verticalName,
      targetType: "VERTICAL",
      name: `Vertical: ${verticalName}`,
      source: "auto",
      status: "awaiting_data",
      rowCount: 0,
    },
  });
}
