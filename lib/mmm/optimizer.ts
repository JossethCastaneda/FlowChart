/**
 * SODARE · MMM — Engine principal + Optimizador de presupuesto
 *
 * Orquesta: datos → adstock → saturación → OLS → contribuciones → ROAS
 * Budget optimizer: marginal ROI para encontrar la asignación óptima.
 */

import type { ChannelConfig, WeeklyRow, MmmModel, SimResult, Allocation } from "./types";
import { applyAdstock } from "./adstock";
import { applySaturation, hillSaturation, marginalResponse } from "./saturation";
import { olsRegression, rSquared, predict } from "./regression";

// ─── Engine MMM ──────────────────────────────────────────────────────────────

/**
 * Ejecuta el pipeline completo MMM sobre los datos proporcionados.
 * Pasos: adstock → saturación → OLS → R² → contribuciones → ROAS
 */
export function runMmm(rows: WeeklyRow[], channels: ChannelConfig[]): MmmModel {
  const enabledChannels = channels.filter(c => c.enabled);
  const y = rows.map(r => r.outcome);
  const n = rows.length;

  if (n < 3 || enabledChannels.length === 0) {
    return emptyModel(y, enabledChannels);
  }

  // 1. Adstock por canal
  const adstockedMatrix: Record<string, number[]> = {};
  for (const ch of enabledChannels) {
    const spend = rows.map(r => r.spend[ch.id] ?? 0);
    adstockedMatrix[ch.id] = applyAdstock(spend, ch.adstockDecay);
  }

  // 2. Saturación (Hill) sobre adstock
  const saturatedMatrix: Record<string, number[]> = {};
  for (const ch of enabledChannels) {
    saturatedMatrix[ch.id] = applySaturation(
      adstockedMatrix[ch.id],
      ch.saturationAlpha,
      ch.saturationK,
    );
  }

  // 3. Construir matriz X [n_weeks × n_channels]
  const X: number[][] = rows.map((_, i) =>
    enabledChannels.map(ch => saturatedMatrix[ch.id][i]),
  );

  // 4. OLS
  const beta = olsRegression(X, y);
  const yHat = predict(beta, X);
  const r2 = rSquared(y, yHat);

  // 5. Contribuciones por canal
  const contributions: Record<string, number> = {};
  for (let ci = 0; ci < enabledChannels.length; ci++) {
    const ch = enabledChannels[ci];
    const coeff = Math.max(0, beta[ci + 1]);
    const total = saturatedMatrix[ch.id].reduce((s, v) => s + v * coeff, 0);
    contributions[ch.id] = total;
  }

  // 6. ROAS por canal
  const channelRoas: Record<string, number> = {};
  for (const ch of enabledChannels) {
    const totalSpend = rows.reduce((s, r) => s + (r.spend[ch.id] ?? 0), 0);
    channelRoas[ch.id] = totalSpend > 0 ? contributions[ch.id] / totalSpend : 0;
  }

  const coefficients: Record<string, number> = {};
  enabledChannels.forEach((ch, i) => { coefficients[ch.id] = beta[i + 1]; });

  return {
    coefficients,
    intercept: beta[0],
    rSquared: Math.max(0, Math.min(1, r2)),
    contributions,
    channelRoas,
    totalModeled: yHat.reduce((s, v) => s + v, 0),
    totalActual: y.reduce((s, v) => s + v, 0),
    modeledSeries: yHat,
    adstockedMatrix,
    saturatedMatrix,
  };
}

function emptyModel(y: number[], channels: ChannelConfig[]): MmmModel {
  const zero: Record<string, number> = {};
  const zeroArr: Record<string, number[]> = {};
  channels.forEach(ch => {
    zero[ch.id] = 0;
    zeroArr[ch.id] = y.map(() => 0);
  });
  return {
    coefficients: zero,
    intercept: 0,
    rSquared: 0,
    contributions: zero,
    channelRoas: zero,
    totalModeled: 0,
    totalActual: y.reduce((s, v) => s + v, 0),
    modeledSeries: y.map(() => 0),
    adstockedMatrix: zeroArr,
    saturatedMatrix: zeroArr,
  };
}

// ─── Simulador de presupuesto ─────────────────────────────────────────────────

/**
 * Simula el outcome si el presupuesto de cada canal cambia.
 * Usa las curvas de saturación y los coeficientes del modelo ajustado.
 *
 * @param simulatedSpend  Gasto simulado por canal { channelId → USD }
 * @param model           Modelo MMM ya ajustado
 * @param channels        Configuración de canales
 * @param baselineOutcome Outcome promedio de referencia (base)
 */
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

  return {
    deltaOutcome: projectedOutcome - baselineOutcome,
    projectedOutcome,
    simulatedSpend,
    marginalRoas,
  };
}

// ─── Optimizador de presupuesto ───────────────────────────────────────────────

/**
 * Encuentra la asignación óptima de presupuesto usando el método greedy
 * de "igual ROI marginal": redistribuye presupuesto del canal con menor
 * ROI marginal al canal con mayor ROI marginal.
 *
 * @param currentSpend  Gasto actual por canal
 * @param totalBudget   Presupuesto total a distribuir
 * @param channels      Configuración de canales
 * @param model         Modelo MMM ajustado
 * @param steps         Pasos de optimización (más = más preciso, más lento)
 */
export function optimizeBudget(
  currentSpend: Record<string, number>,
  totalBudget: number,
  channels: ChannelConfig[],
  model: MmmModel,
  steps = 200,
): Allocation {
  const enabledChannels = channels.filter(c => c.enabled && (currentSpend[c.id] ?? 0) > 0);
  if (enabledChannels.length === 0) {
    return { recommended: currentSpend, projectedOutcome: 0, improvementPct: 0 };
  }

  // Iniciar con reparto igual
  const allocation: Record<string, number> = {};
  enabledChannels.forEach(ch => {
    allocation[ch.id] = totalBudget / enabledChannels.length;
  });

  const step = totalBudget / steps;

  // Iteración greedy: mover $step del canal con menor ROI marginal al mayor
  for (let iter = 0; iter < steps * 2; iter++) {
    let minMR = Infinity, maxMR = -Infinity;
    let minCh: ChannelConfig | null = null, maxCh: ChannelConfig | null = null;

    for (const ch of enabledChannels) {
      const mr = marginalResponse(allocation[ch.id], ch.saturationAlpha, ch.saturationK)
        * Math.max(0, model.coefficients[ch.id] ?? 0);
      if (mr < minMR) { minMR = mr; minCh = ch; }
      if (mr > maxMR) { maxMR = mr; maxCh = ch; }
    }

    if (!minCh || !maxCh || minCh.id === maxCh.id) break;
    if (maxMR - minMR < 0.0001) break;

    const transfer = Math.min(step, allocation[minCh.id] * 0.1);
    allocation[minCh.id] -= transfer;
    allocation[maxCh.id] += transfer;
  }

  // Calcular mejora vs status quo
  const simResult = simulateBudget(allocation, model, channels, 0);
  const currentResult = simulateBudget(currentSpend, model, channels, 0);
  const baseOutcome = currentResult.projectedOutcome;
  const optOutcome = simResult.projectedOutcome;
  const improvementPct = baseOutcome > 0
    ? ((optOutcome - baseOutcome) / baseOutcome) * 100
    : 0;

  return {
    recommended: allocation,
    projectedOutcome: optOutcome,
    improvementPct,
  };
}
