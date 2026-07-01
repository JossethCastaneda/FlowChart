/**
 * Construye el contexto REAL de Aria para el Copilot / Insights a partir de la DB.
 *
 * Regla de oro: solo cifras computadas por el motor determinista. El LLM explica
 * estos números; nunca los inventa. Si un modelo es baseline (no entrenado), se
 * declara como tal y sin AUC.
 */

import prisma from "@/lib/prisma";

interface ModelScope {
  targetType: string;
  clientName: string | null;
  verticalName: string | null;
  rowCount: number;
  project: { name: string } | null;
}

function scopeLabel(d: ModelScope): string {
  if (d.targetType === "VERTICAL") return `Vertical: ${d.verticalName ?? "—"}`;
  if (d.targetType === "CLIENT") return `Cliente: ${d.clientName ?? "—"}`;
  return `Proyecto: ${d.project?.name ?? "—"}`;
}

export async function buildAriaContext(workspaceId: string): Promise<string> {
  const [models, totalPred, highPred] = await Promise.all([
    prisma.ariaModel.findMany({
      where: { dataset: { workspaceId } },
      orderBy: { auc: "desc" },
      take: 25,
      select: {
        algorithm: true,
        status: true,
        auc: true,
        accuracy: true,
        baseRate: true,
        dataset: {
          select: {
            targetType: true,
            clientName: true,
            verticalName: true,
            rowCount: true,
            project: { select: { name: true } },
          },
        },
      },
    }),
    prisma.ariaPrediction.count({ where: { model: { dataset: { workspaceId } } } }),
    prisma.ariaPrediction.count({ where: { model: { dataset: { workspaceId } }, priority: "High" } }),
  ]);

  const lines: string[] = [];
  lines.push(
    `Resumen: ${models.length} modelos. ${totalPred} leads analizados, ${highPred} de alta intención.`,
  );
  if (models.length === 0) {
    lines.push("Aún no hay modelos. Sugiere crear un proyecto o subir un CSV en el Data Hub.");
    return lines.join("\n");
  }
  for (const m of models) {
    const d = m.dataset;
    const scope = scopeLabel(d);
    if (m.status === "ready" && m.auc != null) {
      lines.push(
        `- [${scope}] ${m.algorithm}: AUC ${m.auc.toFixed(3)}, accuracy ${(m.accuracy ?? 0).toFixed(2)}, ` +
          `tasa base ${((m.baseRate ?? 0) * 100).toFixed(1)}% sobre ${d.rowCount} filas.`,
      );
    } else if (m.status === "baseline") {
      lines.push(`- [${scope}] baseline heurístico (NO entrenado, sin AUC) sobre ${d.rowCount} filas.`);
    } else {
      lines.push(`- [${scope}] estado ${m.status} (sin métricas todavía).`);
    }
  }
  return lines.join("\n");
}
