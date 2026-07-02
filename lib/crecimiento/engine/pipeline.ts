/**
 * Orquestador del pipeline predictivo (los 12 pasos del plan) sobre la DB.
 *
 * Lee AriaDatasetRow → perfila → detecta target → split estratificado → entrena
 * 2 candidatos (regresión logística y scorecard WOE) → evalúa en test → elige el
 * de mayor AUC → reentrena sobre todas las filas → predice → persiste AriaModel
 * (con params reales), AriaModelRun (métricas reales) y AriaPrediction (scores
 * reales con atribución). Reemplaza por completo el train/route simulado.
 *
 * Honestidad: si no hay filas → status 'awaiting_data' sin modelo; si hay filas
 * pero no hay target usable o son pocas → scorecard heurístico determinista
 * (status 'baseline', sin métricas de AUC). NUNCA Math.random.
 */

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { profileColumns, detectTarget, extractTarget } from "./profiling";
import { buildFeatureArtifact, transformAll } from "./features";
import { trainLogReg, predictProbaLogReg } from "./logreg";
import { buildWoe, predictProbaWoe } from "./woe";
import {
  computeAuc,
  computeMetrics,
  bestThreshold,
  computePriorityCuts,
  priorityFor,
} from "./metrics";
import { stratifiedSplit } from "./split";
import { featureImportance, leadTopFactors } from "./explain";
import { buildBaseline, predictBaseline } from "./baseline";
import type { Metrics, ModelArtifact } from "./types";

const MIN_ROWS = 30;
const MIN_PER_CLASS = 6;
const ID_HINTS = ["lead", "email", "correo", "telefono", "teléfono", "phone", "record"];
// "id" como palabra aislada (id, lead_id, id_cliente) — NO como substring, porque
// columnas como "ciudad" o "validado" contienen "id" y se elegirían por error.
const ID_WORD_RE = /(^|[^a-záéíóú])id([^a-záéíóú]|$)/;

export interface PipelineResult {
  status: "ready" | "baseline" | "awaiting_data";
  modelId: string | null;
  algorithm: string | null;
  rowCount: number;
  metrics: Metrics | null;
  note: string;
}

function rowsToRecords(
  dbRows: { rowIndex: number; data: Prisma.JsonValue }[],
): { rowIndex: number; rec: Record<string, string> }[] {
  return dbRows.map((r) => {
    const rec: Record<string, string> = {};
    if (r.data && typeof r.data === "object" && !Array.isArray(r.data)) {
      for (const [k, v] of Object.entries(r.data as Record<string, unknown>)) {
        rec[k] = v === null || v === undefined ? "" : String(v);
      }
    }
    return { rowIndex: r.rowIndex, rec };
  });
}

function pickIdColumn(headers: string[]): string | null {
  for (const h of headers) {
    const l = h.toLowerCase();
    if (ID_WORD_RE.test(l) || ID_HINTS.some((hint) => l === hint || l.includes(hint))) return h;
  }
  return null;
}

const asJson = (v: unknown): Prisma.InputJsonValue => v as unknown as Prisma.InputJsonValue;

export async function runTrainingPipeline(datasetId: string): Promise<PipelineResult> {
  const dbRows = await prisma.ariaDatasetRow.findMany({
    where: { datasetId },
    orderBy: { rowIndex: "asc" },
  });
  const recordRows = rowsToRecords(dbRows);
  const rows = recordRows.map((r) => r.rec);

  if (rows.length === 0) {
    await prisma.ariaDataset.update({ where: { id: datasetId }, data: { status: "awaiting_data" } });
    return {
      status: "awaiting_data",
      modelId: null,
      algorithm: null,
      rowCount: 0,
      metrics: null,
      note: "Sin filas: conecta o sube datos para activar el modelo.",
    };
  }

  const headers = Object.keys(rows[0]);
  const profiles = profileColumns(headers, rows);
  const target = detectTarget(profiles, rows);
  const idCol = pickIdColumn(headers);
  const recordId = (i: number): string => {
    const raw = idCol ? rows[i][idCol] : "";
    return raw && raw.trim() !== "" ? raw.trim() : `LEAD-${recordRows[i].rowIndex}`;
  };

  const y = target ? extractTarget(rows, target) : null;
  const pos = y ? y.reduce((a, b) => a + b, 0) : 0;
  const neg = y ? y.length - pos : 0;
  const trainable = !!y && rows.length >= MIN_ROWS && pos >= MIN_PER_CLASS && neg >= MIN_PER_CLASS;

  // Un modelo activo por dataset: limpia el anterior (cascade borra runs/predicciones).
  await prisma.ariaModel.deleteMany({ where: { datasetId } });

  if (trainable && y && target) {
    const split = stratifiedSplit(y, 0.2, datasetId);
    const trainRows = split.train.map((i) => rows[i]);
    const testRows = split.test.map((i) => rows[i]);
    const yTrain = split.train.map((i) => y[i]);
    const yTest = split.test.map((i) => y[i]);

    // Evaluación honesta en held-out test.
    const evalArtifact = buildFeatureArtifact(trainRows, profiles, target);
    const Xtrain = transformAll(evalArtifact, trainRows);
    const Xtest = transformAll(evalArtifact, testRows);
    const lrEval = trainLogReg(Xtrain, yTrain);
    const woeEval = buildWoe(trainRows, profiles, yTrain, target);
    const lrTest = Xtest.map((x) => predictProbaLogReg(lrEval, x));
    const woeTest = testRows.map((r) => predictProbaWoe(woeEval, r));
    const aucLr = computeAuc(yTest, lrTest);
    const aucWoe = computeAuc(yTest, woeTest);
    const useLogReg = aucLr >= aucWoe;
    const bestTest = useLogReg ? lrTest : woeTest;
    const threshold = bestThreshold(yTest, bestTest);
    const metrics = computeMetrics(yTest, bestTest, threshold);

    // Redeploy: reentrena el ganador sobre TODAS las filas y predice.
    const deployArtifact = buildFeatureArtifact(rows, profiles, target);
    const Xall = transformAll(deployArtifact, rows);
    const deployLr = useLogReg ? trainLogReg(Xall, y) : null;
    const deployWoe = useLogReg ? null : buildWoe(rows, profiles, y, target);
    const finalProbs = useLogReg
      ? Xall.map((x) => predictProbaLogReg(deployLr as NonNullable<typeof deployLr>, x))
      : rows.map((r) => predictProbaWoe(deployWoe as NonNullable<typeof deployWoe>, r));
    const cuts = computePriorityCuts(finalProbs);
    const baseRate = pos / y.length;

    const artifact: ModelArtifact = {
      kind: useLogReg ? "logistic_regression" : "scorecard_woe",
      feature: deployArtifact,
      logreg: deployLr,
      woe: deployWoe,
      baseline: null,
      priorityCuts: cuts,
      baseRate,
    };
    const importance = deployLr ? featureImportance(deployLr, deployArtifact.featureNames) : [];

    const model = await prisma.ariaModel.create({
      data: {
        datasetId,
        name: useLogReg ? "Regresión Logística (Aria)" : "Scorecard WOE (Aria)",
        algorithm: artifact.kind,
        status: "ready",
        accuracy: metrics.accuracy,
        precision: metrics.precision,
        recall: metrics.recall,
        auc: metrics.auc,
        baseRate,
        params: asJson(artifact),
      },
    });

    await prisma.ariaModelRun.create({
      data: {
        modelId: model.id,
        status: "success",
        metrics: asJson({
          candidates: { logistic_regression: aucLr, scorecard_woe: aucWoe },
          chosen: artifact.kind,
          threshold,
          liftAtDecile: metrics.liftAtDecile,
          confusion: metrics.confusion,
          topFeatures: importance.slice(0, 5),
          trainRows: trainRows.length,
          testRows: testRows.length,
          baseRate,
        }),
      },
    });

    const predData = rows.map((r, i) => {
      const prob = finalProbs[i];
      const factors = deployLr ? leadTopFactors(deployLr, deployArtifact, Xall[i]) : [];
      return {
        modelId: model.id,
        recordId: recordId(i),
        score: Math.round(prob * 100),
        probability: prob,
        priority: priorityFor(prob, cuts),
        insights: asJson({ topFactors: factors, model: artifact.kind }),
      };
    });
    await prisma.ariaPrediction.createMany({ data: predData });
    await prisma.ariaDataset.update({ where: { id: datasetId }, data: { status: "ready" } });

    return {
      status: "ready",
      modelId: model.id,
      algorithm: artifact.kind,
      rowCount: rows.length,
      metrics,
      note: `Entrenado sobre ${rows.length} filas. Ganador: ${artifact.kind} (AUC ${metrics.auc.toFixed(3)}).`,
    };
  }

  // ---- Baseline heurístico honesto (sin datos etiquetados suficientes) ----
  const deployArtifact = buildFeatureArtifact(rows, profiles, target);
  const Xall = transformAll(deployArtifact, rows);
  const baseline = buildBaseline(deployArtifact);
  const probs = Xall.map((x) => predictBaseline(baseline, x, deployArtifact.featureNames));
  const cuts = computePriorityCuts(probs);

  const artifact: ModelArtifact = {
    kind: "heuristic_baseline",
    feature: deployArtifact,
    logreg: null,
    woe: null,
    baseline,
    priorityCuts: cuts,
    baseRate: 0,
  };

  const model = await prisma.ariaModel.create({
    data: {
      datasetId,
      name: "Baseline heurístico (no entrenado)",
      algorithm: "heuristic_baseline",
      status: "baseline",
      accuracy: null,
      precision: null,
      recall: null,
      auc: null,
      baseRate: null,
      params: asJson(artifact),
    },
  });
  await prisma.ariaModelRun.create({
    data: {
      modelId: model.id,
      status: "success",
      metrics: asJson({
        note: target
          ? "Datos insuficientes para entrenar; scorecard heurístico determinista."
          : "Sin columna objetivo detectada; scorecard heurístico determinista.",
        rows: rows.length,
        positives: pos,
      }),
    },
  });
  const predData = rows.map((r, i) => ({
    modelId: model.id,
    recordId: recordId(i),
    score: Math.round(probs[i] * 100),
    probability: probs[i],
    priority: priorityFor(probs[i], cuts),
    insights: asJson({ model: "heuristic_baseline", note: "Score heurístico (no entrenado)" }),
  }));
  await prisma.ariaPrediction.createMany({ data: predData });
  await prisma.ariaDataset.update({ where: { id: datasetId }, data: { status: "baseline" } });

  return {
    status: "baseline",
    modelId: model.id,
    algorithm: "heuristic_baseline",
    rowCount: rows.length,
    metrics: null,
    note: target
      ? "Datos insuficientes para entrenar: usando baseline heurístico determinista."
      : "Sin columna objetivo: usando baseline heurístico determinista.",
  };
}
