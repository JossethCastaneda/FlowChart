/**
 * ZEFIRUS MMM — Auto-calibracion de parametros
 * Grid search sobre lambda x alpha x K para maximizar R^2 del modelo.
 * Corre en el browser (cliente) — sin backend.
 */

import type { ChannelConfig, WeeklyRow, CalibrationResult } from "./types";
import { applyAdstock } from "./adstock";
import { applySaturation } from "./saturation";
import { ridgeRegression, rSquared, predict } from "./regression";

interface GridOptions {
  lambdaSteps?: number;    // default 9
  alphaSteps?: number;     // default 6
  kMultipliers?: number[]; // default [0.5, 1, 2, 3, 5, 8]
}

/**
 * Calibra los parametros de UN canal buscando la combinacion
 * (lambda, alpha, K) que maximize el R^2 del modelo de regresion
 * univariado (un canal a la vez).
 *
 * NOTA: calibracion univariada (un canal) vs. multivariada completa.
 * Es menos precisa pero es instantanea y no requiere backend.
 */
export function calibrateChannel(
  channelId: string,
  rows: WeeklyRow[],
  currentConfig: ChannelConfig,
  options: GridOptions = {},
): CalibrationResult {
  const modelRows = rows.filter(r => !r.isOutlier);
  const y = modelRows.map(r => r.outcome);
  const spend = modelRows.map(r => r.spend[channelId] ?? 0);

  if (modelRows.length < 4 || spend.every(s => s === 0)) {
    return {
      channelId,
      adstockDecay: currentConfig.adstockDecay,
      saturationAlpha: currentConfig.saturationAlpha,
      saturationK: currentConfig.saturationK,
      rSquared: 0,
      improved: false,
    };
  }

  const lambdaValues = Array.from(
    { length: options.lambdaSteps ?? 9 },
    (_, i) => parseFloat((0.1 + i * 0.1).toFixed(1))
  );
  const alphaValues = Array.from(
    { length: options.alphaSteps ?? 6 },
    (_, i) => parseFloat((0.5 + i * 0.3).toFixed(1))
  );
  const avgSpend = spend.reduce((s, v) => s + v, 0) / spend.length || 1000;
  const kMultipliers = options.kMultipliers ?? [0.5, 1, 2, 3, 5, 8];
  const kValues = kMultipliers.map(m => avgSpend * m);

  let bestR2 = -Infinity;
  let bestLambda = currentConfig.adstockDecay;
  let bestAlpha = currentConfig.saturationAlpha;
  let bestK = currentConfig.saturationK;

  for (const lambda of lambdaValues) {
    const adstocked = applyAdstock(spend, lambda);
    for (const alpha of alphaValues) {
      for (const k of kValues) {
        if (k <= 0) continue;
        const saturated = applySaturation(adstocked, alpha, k);
        const X = saturated.map(v => [v]);
        const beta = ridgeRegression(X, y, 0.1, 500, 0.5);
        const yHat = predict(beta, X);
        const r2 = rSquared(y, yHat);
        if (r2 > bestR2) {
          bestR2 = r2;
          bestLambda = lambda;
          bestAlpha = alpha;
          bestK = k;
        }
      }
    }
  }

  // R^2 actual con parametros existentes
  const currentAdstocked = applyAdstock(spend, currentConfig.adstockDecay);
  const currentSat = applySaturation(currentAdstocked, currentConfig.saturationAlpha, currentConfig.saturationK);
  const currentX = currentSat.map(v => [v]);
  const currentBeta = ridgeRegression(currentX, y, 0.1, 500, 0.5);
  const currentYHat = predict(currentBeta, currentX);
  const currentR2 = rSquared(y, currentYHat);

  return {
    channelId,
    adstockDecay: bestLambda,
    saturationAlpha: bestAlpha,
    saturationK: bestK,
    rSquared: bestR2,
    improved: bestR2 > currentR2 + 0.005,
  };
}

/**
 * Calibra todos los canales habilitados en paralelo.
 * Devuelve un mapa channelId → CalibrationResult.
 */
export async function calibrateAllChannels(
  rows: WeeklyRow[],
  channels: ChannelConfig[],
): Promise<Map<string, CalibrationResult>> {
  const results = new Map<string, CalibrationResult>();
  for (const ch of channels.filter(c => c.enabled)) {
    // yield al event loop cada 2 canales para no bloquear la UI
    await new Promise(r => setTimeout(r, 0));
    results.set(ch.id, calibrateChannel(ch.id, rows, ch));
  }
  return results;
}

