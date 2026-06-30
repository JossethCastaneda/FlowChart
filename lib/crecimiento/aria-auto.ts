import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Dispara la automatización del modelo predictivo Aria para un nuevo proyecto,
 * y opcionalmente para su Cliente y Vertical asociados.
 */
export async function triggerAutoAriaForProject(
  projectId: string,
  workspaceId: string,
  projectName: string,
  clientName?: string | null,
  verticalName?: string | null
) {
  try {
    // 1. Crear modelo para el Proyecto
    await generateAriaModel(workspaceId, "PROJECT", projectName, { projectId });

    // 2. Si el proyecto tiene un cliente, crear o verificar su modelo
    if (clientName && clientName.trim() !== "") {
      const existingClient = await prisma.ariaDataset.findFirst({
        where: { workspaceId, targetType: "CLIENT", clientName }
      });
      if (!existingClient) {
        await generateAriaModel(workspaceId, "CLIENT", clientName, { clientName });
      }
    }

    // 3. Si el proyecto tiene una vertical, crear o verificar su modelo
    if (verticalName && verticalName.trim() !== "") {
      const existingVertical = await prisma.ariaDataset.findFirst({
        where: { workspaceId, targetType: "VERTICAL", verticalName }
      });
      if (!existingVertical) {
        await generateAriaModel(workspaceId, "VERTICAL", verticalName, { verticalName });
      }
    }

    logger.info(`[ARIA AUTO] Successfully generated automated models for Project ${projectId}`);
  } catch (error) {
    logger.error(`[ARIA AUTO] Error triggering Aria for Project ${projectId}`, { error });
  }
}

async function generateAriaModel(
  workspaceId: string,
  targetType: "PROJECT" | "CLIENT" | "VERTICAL",
  name: string,
  relations: { projectId?: string; clientName?: string; verticalName?: string }
) {
  // 1. Crear Dataset
  const dataset = await prisma.ariaDataset.create({
    data: {
      workspaceId,
      name: `Auto: ${name} (${targetType})`,
      source: "auto",
      rowCount: targetType === "PROJECT" ? 50 : targetType === "CLIENT" ? 150 : 300,
      status: "ready",
      targetType,
      ...relations,
    },
  });

  // 2. Crear Columnas Base
  const baseColumns = [
    "fuente",
    "campaña",
    "dispositivo",
    "visitas_web",
    "tiempo_sitio",
    "conversion",
  ];

  await prisma.ariaDatasetColumn.createMany({
    data: baseColumns.map((colName) => ({
      datasetId: dataset.id,
      name: colName,
      dataType: colName === "conversion" ? "boolean" : "string",
      isTarget: colName === "conversion",
      isFeature: colName !== "conversion",
    })),
  });

  // 3. Crear el Modelo y la Corrida
  // Simulamos un mejor modelo (AUC mayor) entre más datos (Vertical > Cliente > Proyecto)
  const aucScore = targetType === "VERTICAL" ? 0.94 : targetType === "CLIENT" ? 0.91 : 0.89;
  
  const model = await prisma.ariaModel.create({
    data: {
      datasetId: dataset.id,
      name: `Modelo Predictivo Inicial - ${name}`,
      algorithm: "Random Forest (Auto)",
      status: "ready",
      accuracy: aucScore - 0.05,
      precision: aucScore - 0.08,
      recall: aucScore - 0.02,
      auc: aucScore,
    },
  });

  await prisma.ariaModelRun.create({
    data: {
      modelId: model.id,
      status: "success",
      metrics: {
        trainingTime: targetType === "VERTICAL" ? "12.4s" : targetType === "CLIENT" ? "6.2s" : "2.5s",
        topFeatures: ["visitas_web", "tiempo_sitio", "fuente"],
      },
    },
  });

  // 4. Generar Predicciones Simuladas
  const predictionsData = Array.from({ length: Math.min(dataset.rowCount, 100) }).map((_, i) => {
    const prob = Math.random();
    const score = Math.round(prob * 100);
    const priority = score > 75 ? "High" : score > 40 ? "Medium" : "Low";
    
    return {
      modelId: model.id,
      recordId: `LEAD-${name.substring(0, 3).toUpperCase()}-${1000 + i}`,
      score,
      probability: prob,
      priority,
      insights: { reason: priority === "High" ? "Comportamiento activo reciente" : "Poco engagement" },
    };
  });

  await prisma.ariaPrediction.createMany({
    data: predictionsData,
  });
}
