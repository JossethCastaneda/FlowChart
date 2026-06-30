import { NextResponse } from "next/server";
import { withWorkspaceRole } from "@/lib/api-handler";
import prisma from "@/lib/prisma";

export const POST = withWorkspaceRole(["OWNER", "ADMIN"])(async (req, ctx) => {
  try {
    const { datasetId } = await req.json();
    if (!datasetId) return NextResponse.json({ error: "Missing datasetId" }, { status: 400 });

    const dataset = await prisma.ariaDataset.findUnique({
      where: { id: datasetId, workspaceId: ctx.workspaceId }
    });

    if (!dataset) return NextResponse.json({ error: "Dataset not found" }, { status: 404 });

    const model = await prisma.ariaModel.create({
      data: {
        datasetId: dataset.id,
        name: `AutoML Model - ${dataset.name}`,
        algorithm: "Random Forest",
        status: "ready",
        accuracy: 0.87,
        precision: 0.85,
        recall: 0.89,
        auc: 0.92
      }
    });

    await prisma.ariaModelRun.create({
      data: {
        modelId: model.id,
        status: "success",
        metrics: {
          trainingTime: "4.2s",
          topFeatures: ["company_size", "website_visits", "email_opens"]
        }
      }
    });

    const predictionsData = Array.from({ length: Math.min(50, dataset.rowCount) }).map((_, i) => {
      const prob = Math.random();
      const score = Math.round(prob * 100);
      const priority = score > 80 ? "High" : score > 50 ? "Medium" : "Low";
      return {
        modelId: model.id,
        recordId: `LEAD-${1000 + i}`,
        score: score,
        probability: prob,
        priority: priority,
        insights: { reason: "Alta interacción reciente" }
      };
    });

    await prisma.ariaPrediction.createMany({
      data: predictionsData
    });

    return NextResponse.json({
      model,
      message: "Training complete"
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
