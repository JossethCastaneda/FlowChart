/**
 * ZEFIRUS MMM — Engine + Optimizador (v2)
 * - Filtra semanas outlier antes de correr el modelo
 * - Calcula base vs. incremental revenue
 * - Respeta restricciones minSpend/maxSpend en el optimizador
 */

import type { ChannelConfig, WeeklyRow, MmmModel, SimResult, Allocation } from "./types";
import { applyAdstock } from "./adstock";
import { applySaturation, hillSaturation, marginalResponse } from "./saturation";
import { ridgeRegression, rSquared, predict, nrmse } from "./regression";

// ─── Engine ──────────────────────────────────────────────────────────────────

export function runMmm(rows: WeeklyRow[], channels: ChannelConfig[]): MmmModel {
  const enabledChannels = channels.filter(c => c.enabled);
  // Filtrar outliers del modelo (se incluyen en totales pero no en regresion)
  const modelRows = rows.filter(r => !r.isOutlier);
  const y = modelRows.map(r => r.outcome);
  const n = modelRows.length;

  if (n < 3 || enabledChannels.length === 0) {
    return emptyModel(rows.map(r => r.outcome), enabledChannels, rows.length);
  }

  // 1. Adstock por canal (solo sobre filas del modelo)
  const adstockedMatrix: Record<string, number[]> = {};
  for (const ch of enabledChannels) {
    const spend = modelRows.map(r => r.spend[ch.id] ?? 0);
    adstockedMatrix[ch.id] = applyAdstock(spend, ch.adstockDecay);
  }

  // 2. Saturacion (Hill) sobre adstock
  const saturatedMatrix: Record<string, number[]> = {};
  for (const ch of enabledChannels) {
    saturatedMatrix[ch.id] = applySaturation(adstockedMatrix[ch.id], ch.saturationAlpha, ch.saturationK);
  }

  // 3. Matriz X
  const X: number[][] = modelRows.map((_, i) => enabledChannels.map(ch => saturatedMatrix[ch.id][i]));

  // 4. Ridge Regression (L2 penalty)
  const beta = ridgeRegression(X, y, 0.01, 2000, 0.1);
  const yHat = predict(beta, X);
  const r2 = rSquared(y, yHat);
  const nrmseVal = nrmse(y, yHat);

  // 5. Contribuciones
  const contributions: Record<string, number> = {};
  for (let ci = 0; ci < enabledChannels.length; ci++) {
    const ch = enabledChannels[ci];
    const coeff = Math.max(0, beta[ci + 1]);
    contributions[ch.id] = saturatedMatrix[ch.id].reduce((s, v) => s + v * coeff, 0);
  }

  // 6. ROAS por canal y ROAS Marginal
  const coefficients: Record<string, number> = {};
  enabledChannels.forEach((ch, i) => { coefficients[ch.id] = Math.max(0, beta[i + 1]); });

  const channelRoas: Record<string, number> = {};
  const marginalRoas: Record<string, number> = {};
  for (const ch of enabledChannels) {
    const totalSpend = modelRows.reduce((s, r) => s + (r.spend[ch.id] ?? 0), 0);
    channelRoas[ch.id] = totalSpend > 0 ? contributions[ch.id] / totalSpend : 0;
    
    // Marginal ROAS = mResponse(avg_spend) * beta
    const avgSpend = totalSpend / n;
    const mRes = marginalResponse(applyAdstock([avgSpend], ch.adstockDecay)[0], ch.saturationAlpha, ch.saturationK);
    marginalRoas[ch.id] = mRes * coefficients[ch.id];
  }
  // 7. Base vs. Incremental
  const basePerWeek = Math.max(0, beta[0]);
  const baseRevenue = basePerWeek * n;
  const totalActual = y.reduce((s, v) => s + v, 0);
  const incrementalRevenue = Math.max(0, totalActual - baseRevenue);
  const incrementalShare = totalActual > 0 ? incrementalRevenue / totalActual : 0;

  // Adstock / saturacion completos (incluyendo outliers para visualizacion)
  const adstockedFull: Record<string, number[]> = {};
  const saturatedFull: Record<string, number[]> = {};
  for (const ch of enabledChannels) {
    const allSpend = rows.map(r => r.spend[ch.id] ?? 0);
    adstockedFull[ch.id] = applyAdstock(allSpend, ch.adstockDecay);
    saturatedFull[ch.id] = applySaturation(adstockedFull[ch.id], ch.saturationAlpha, ch.saturationK);
  }

  return {
    coefficients,
    intercept: beta[0],
    rSquared: Math.max(0, Math.min(1, r2)),
    nrmse: nrmseVal,
    contributions,
    channelRoas,
    marginalRoas,
    totalModeled: yHat.reduce((s, v) => s + v, 0),
    totalActual,
    baseRevenue,
    incrementalRevenue,
    incrementalShare,
    modeledSeries: yHat,
    adstockedMatrix: adstockedFull,
    saturatedMatrix: saturatedFull,
    weekCount: n,
  };
}

function emptyModel(y: number[], channels: ChannelConfig[], weekCount: number): MmmModel {
  const zero: Record<string, number> = {};
  const zeroArr: Record<string, number[]> = {};
  channels.forEach(ch => { zero[ch.id] = 0; zeroArr[ch.id] = y.map(() => 0); });
  const totalActual = y.reduce((s, v) => s + v, 0);
  return {
    coefficients: zero, intercept: 0, rSquared: 0, nrmse: 1,
    contributions: zero, channelRoas: zero, marginalRoas: zero,
    totalModeled: 0,
    totalActual,
    baseRevenue: totalActual,
    incrementalRevenue: 0,
    incrementalShare: 0,
    modeledSeries: y.map(() => 0),
    adstockedMatrix: {},
    saturatedMatrix: {},
    weekCount: weekCount,
  };
}

// ─── Simulador ───────────────────────────────────────────────────────────────

export function simulateBudget(
  simulatedSpend: Record<string, number>,
  model: MmmModel,
  channels: ChannelConfig[],
  baselineOutcome: number,
): SimResult {
  const enabledChannels = channels.filter(c => c.enabled);
  let projectedOutcome = model.intercept;
  const marginalRoas: Record<string, number> = {};

  for (const ch of enabledChannels) {
    const spend = simulatedSpend[ch.id] ?? 0;
    const saturated = hillSaturation(spend, ch.saturationAlpha, ch.saturationK);
    const coeff = Math.max(0, model.coefficients[ch.id] ?? 0);
    projectedOutcome += coeff * saturated;
    const mr = marginalResponse(spend, ch.saturationAlpha, ch.saturationK) * coeff;
    marginalRoas[ch.id] = spend > 0 ? mr : 0;
  }

  return { deltaOutcome: projectedOutcome - baselineOutcome, projectedOutcome, simulatedSpend, marginalRoas };
}

// ─── Optimizador con restricciones ───────────────────────────────────────────

export function optimizeBudget(
  currentSpend: Record<string, number>,
  totalBudget: number,
  channels: ChannelConfig[],
  model: MmmModel,
  steps = 200,
): Allocation {
  const enabledChannels = channels.filter(c => c.enabled && (currentSpend[c.id] ?? 0) > 0);
  if (enabledChannels.length === 0) return { recommended: currentSpend, projectedOutcome: 0, improvementPct: 0 };

  // Iniciar con reparto proporcional al gasto actual
  const totalCurrent = enabledChannels.reduce((s, ch) => s + (currentSpend[ch.id] ?? 0), 0);
  const allocation: Record<string, number> = {};
  enabledChannels.forEach(ch => {
    const share = totalCurrent > 0 ? (currentSpend[ch.id] ?? 0) / totalCurrent : 1 / enabledChannels.length;
    const base = totalBudget * share;
    // Aplicar restricciones
    allocation[ch.id] = Math.max(ch.minSpend ?? 0, Math.min(ch.maxSpend ?? Infinity, base));
  });

  const step = totalBudget / steps;

  // Greedy: mover step del canal con menor MR al de mayor MR (respetando restricciones)
  for (let iter = 0; iter < steps * 3; iter++) {
    let minMR = Infinity, maxMR = -Infinity;
    let minCh: ChannelConfig | null = null, maxCh: ChannelConfig | null = null;

    for (const ch of enabledChannels) {
      const canDecrease = allocation[ch.id] > (ch.minSpend ?? 0) + step * 0.1;
      const canIncrease = allocation[ch.id] < (ch.maxSpend ?? Infinity) - step * 0.1;
      const mr = marginalResponse(allocation[ch.id], ch.saturationAlpha, ch.saturationK)
        * Math.max(0, model.coefficients[ch.id] ?? 0);
      if (canDecrease && mr < minMR) { minMR = mr; minCh = ch; }
      if (canIncrease && mr > maxMR) { maxMR = mr; maxCh = ch; }
    }

    if (!minCh || !maxCh || minCh.id === maxCh.id) break;
    if (maxMR - minMR < 0.0001) break;

    const transfer = Math.min(step, allocation[minCh.id] * 0.1);
    allocation[minCh.id] = Math.max(minCh.minSpend ?? 0, allocation[minCh.id] - transfer);
    allocation[maxCh.id] = Math.min(maxCh.maxSpend ?? Infinity, allocation[maxCh.id] + transfer);
  }

  const simResult = simulateBudget(allocation, model, channels, 0);
  const currentResult = simulateBudget(currentSpend, model, channels, 0);
  const baseOutcome = currentResult.projectedOutcome;
  const optOutcome = simResult.projectedOutcome;
  const improvementPct = baseOutcome > 0 ? ((optOutcome - baseOutcome) / baseOutcome) * 100 : 0;

  return { recommended: allocation, projectedOutcome: optOutcome, improvementPct };
}

